/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Uri, ViewColumn, env, window } from 'vscode';

import { LanguageClient } from 'vscode-languageclient/node';

export function buildExecuteQueryFunction(client: LanguageClient) {
	return async () => {
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
	};
}
