/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	ExtensionContext,
	ProgressLocation,
	ViewColumn,
	commands,
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
		// Register the server for plain text documents
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
			'resultView',
			'Query Result',
			ViewColumn.One,
			{},
		);
		panel.webview.html = `
		<html lang="en">
		<body>
			<table border="1">
				<thead>
					<tr>${headers}</tr>
				</thead>
				<tbody>
					${rows}
				</tbody>
			</table>
		</body>
	`;
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
