/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	Event,
	EventEmitter,
	ExtensionContext,
	ProgressLocation,
	TreeDataProvider,
	TreeItem as VSCodeTreeItem,
	TreeItemCollapsibleState,
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

class BigQueryTreeDataProvider implements TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | void> =
		new EventEmitter<TreeItem | undefined | void>();
	readonly onDidChangeTreeData: Event<TreeItem | undefined | void> =
		this._onDidChangeTreeData.event;

	private datasets: TreeItem[] = [];

	constructor(private client: LanguageClient) {
		// Register a command to handle table clicks
		commands.registerCommand(
			'bigQueryExplorer.openTable',
			(table: TreeItem) => {
				if (table.contextValue === 'table') {
					const uri = `bqls://project/${table.project}/dataset/${table.dataset}/table/${table.label}`;
					this.openVirtualTextDocument(uri);
				}
			},
		);
	}

	getTreeItem(element: TreeItem): VSCodeTreeItem {
		return element;
	}

	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		if (!element) {
			// Top-level: Fetch datasets
			if (this.datasets.length === 0) {
				await this.fetchDatasets();
			}
			return this.datasets;
		}

		// Fetch tables for a specific dataset
		if (element.contextValue === 'dataset') {
			return this.fetchTables(element.label);
		}

		return [];
	}

	private async fetchDatasets(): Promise<void> {
		try {
			const result = await this.client.sendRequest<{
				datasets: string[];
			}>('workspace/executeCommand', {
				command: 'listDatasets',
				arguments: [],
			});

			this.datasets = result.datasets.map(
				(dataset) =>
					new TreeItem(dataset, TreeItemCollapsibleState.Collapsed, 'dataset'),
			);
			this._onDidChangeTreeData.fire();
		} catch (error) {
			window.showErrorMessage(`Failed to fetch datasets: ${error.message}`);
		}
	}

	private async fetchTables(dataset: string): Promise<TreeItem[]> {
		try {
			const result = await this.client.sendRequest<{
				project: string;
				dataset: string;
				tables: string[];
			}>('workspace/executeCommand', {
				command: 'listTables',
				arguments: [dataset],
			});

			return result.tables.map(
				(table) =>
					new TreeItem(
						table,
						TreeItemCollapsibleState.None,
						'table',
						result.project,
						result.dataset,
					),
			);
		} catch (error) {
			window.showErrorMessage(
				`Failed to fetch tables for dataset ${dataset}: ${error.message}`,
			);
			return [];
		}
	}

	private async openVirtualTextDocument(uri: string): Promise<void> {
		try {
			await window.withProgress(
				{
					location: ProgressLocation.Notification,
					title: 'Loading table...',
					cancellable: false,
				},
				async () => {
					const document = await workspace.openTextDocument(Uri.parse(uri));
					await window.showTextDocument(document);
				},
			);
		} catch (error) {
			window.showErrorMessage(`Failed to open table: ${error.message}`);
		}
	}

	public refresh(): void {
		this.datasets = [];
		this._onDidChangeTreeData.fire();
	}
}

class TreeItem extends VSCodeTreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: TreeItemCollapsibleState,
		public readonly contextValue: string,
		public readonly project?: string,
		public readonly dataset?: string,
	) {
		super(label, collapsibleState);

		if (contextValue === 'table') {
			this.command = {
				command: 'bigQueryExplorer.openTable',
				title: 'Open Table',
				arguments: [this],
			};
		}
	}
}

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

	// Register the TreeDataProvider
	const treeDataProvider = new BigQueryTreeDataProvider(client);
	window.registerTreeDataProvider('bigQueryExplorer', treeDataProvider);

	context.subscriptions.push(
		commands.registerCommand('bigQueryExplorer.refresh', () =>
			treeDataProvider.refresh(),
		),
	);

	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
