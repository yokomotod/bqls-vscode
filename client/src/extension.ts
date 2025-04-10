/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	ExtensionContext,
	ProgressLocation,
	Uri,
	ViewColumn,
	commands,
	env,
	window,
	workspace,
} from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	WorkDoneProgress,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		// run: { module: serverModule, transport: TransportKind.ipc },
		// debug: {
		// 	module: serverModule,
		// 	transport: TransportKind.ipc,
		// }
		run: { command: 'bqls' },
		debug: { command: 'bqls' },
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for sql documents
		documentSelector: [{ language: 'sql' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
		},
	};

	client = new LanguageClient('bqls', 'bqls', serverOptions, clientOptions);

	let progressTask = null;
	let progressPromise = null;
	client.onProgress(WorkDoneProgress.type, 'execute_query', (params) => {
		switch (params.kind) {
			case 'begin':
				window.withProgress(
					{
						location: ProgressLocation.Notification,
						title: 'Execute Query',
					},
					(progress) => {
						progressTask = progress;

						progress.report({ message: params.message });

						return new Promise((resolve) => {
							progressPromise = resolve;
						});
					},
				);
				break;
			case 'report':
				if (progressTask) {
					progressTask.report({ message: params.message });
				}
				break;
			case 'end':
				if (progressTask) {
					progressTask.report({ message: params.message });
					progressTask = null;
				}
				if (progressPromise) {
					progressPromise();
					progressPromise = null;
				}
				break;
		}
	});

	// Add a handler for bqls:// URIs to fetch and display their content
	const bqlsScheme = 'bqls';
	workspace.registerTextDocumentContentProvider(bqlsScheme, {
		provideTextDocumentContent: async (uri) => {
			const result: {
				contents: { language: string; value: string }[];
				result: { columns: string[]; data: unknown[][] };
			} = await client.sendRequest('bqls/virtualTextDocument', {
				textDocument: { uri: uri.toString() },
			});
			return (
				result.contents.map((content) => content.value).join('\n') +
				'\n' +
				result.result.columns.join(',') +
				'\n' +
				result.result.data.map((row) => row.join(',')).join('\n')
			);
		},
	});

	const disposable = commands.registerCommand('bqls.executeQuery', async () => {
		const virtualTextDocument: { textDocument: { uri: string } } =
			await client.sendRequest('workspace/executeCommand', {
				command: 'executeQuery',
				arguments: [window.activeTextEditor.document.uri.toString()],
			});

		const result: { result: { columns: string[]; data: unknown[][] } } =
			await client.sendRequest('bqls/virtualTextDocument', {
				textDocument: virtualTextDocument.textDocument,
			});

		const headers = result.result.columns
			.map((col) => `<th>${col}</th>`)
			.join('');
		const rows = result.result.data
			.map(
				(row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`,
			)
			.join('');
		const panel = window.createWebviewPanel(
			'queryResult',
			'Query Result',
			ViewColumn.One,
			{
				enableScripts: true,
			},
		);

		panel.webview.html = `
			<html lang="en">
			<body>
				<button id="saveToCsv">Save to CSV</button>
				<button id="saveToSpreadsheet">Save to Spreadsheet</button>
				<table border="1">
					<thead>
						<tr>${headers}</tr>
					</thead>
					<tbody>
						${rows}
					</tbody>
				</table>
				<script>
					const vscode = acquireVsCodeApi();
					document.getElementById('saveToCsv').addEventListener('click', () => {
						vscode.postMessage({ command: 'saveToCsv' });
						});
					document.getElementById('saveToSpreadsheet').addEventListener('click', () => {
						vscode.postMessage({ command: 'saveToSpreadsheet' });
					});
				</script>
			</body>
		</html>
		`;

		panel.webview.onDidReceiveMessage(async (message) => {
			if (message.command === 'saveToCsv') {
				const uri = await window.showSaveDialog({
					saveLabel: 'Save',
					filters: { 'CSV Files': ['csv'] },
				});
				if (uri) {
					await client.sendRequest('workspace/executeCommand', {
						command: 'saveResult',
						arguments: [virtualTextDocument.textDocument.uri, uri.toString()],
					});
					window.showInformationMessage('Query result saved successfully!');
				}
			} else if (message.command === 'saveToSpreadsheet') {
				const result: { url: string } = await client.sendRequest(
					'workspace/executeCommand',
					{
						command: 'saveResult',
						arguments: [virtualTextDocument.textDocument.uri, 'sheet://new'],
					},
				);
				await env.openExternal(Uri.parse(result.url));
			}
		});
	});
	context.subscriptions.push(disposable);

	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
