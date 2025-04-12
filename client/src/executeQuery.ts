/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Uri, ViewColumn, env, window } from 'vscode';
import {
	ExecuteCommandRequest,
	LanguageClient,
} from 'vscode-languageclient/node';
import { BQLS_COMMANDS, BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT } from './constants';

const COMMAND_SAVE_TO_CSV = 'saveToCsv';
const COMMAND_SAVE_TO_SPREADSHEET = 'saveToSpreadsheet';

export function buildExecuteQueryFunction(client: LanguageClient) {
	return async () => {
		const virtualTextDocument = await client.sendRequest<{
			textDocument: { uri: string };
		}>(ExecuteCommandRequest.method, {
			command: BQLS_COMMANDS.EXECUTE_QUERY,
			arguments: [window.activeTextEditor.document.uri.toString()],
		});

		const result = await client.sendRequest<{
			result: { columns: string[]; data: unknown[][] };
		}>(BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT, {
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
				vscode.postMessage({ command: '${COMMAND_SAVE_TO_CSV}' });
				});
			document.getElementById('saveToSpreadsheet').addEventListener('click', () => {
				vscode.postMessage({ command: '${COMMAND_SAVE_TO_SPREADSHEET}' });
			});
		</script>
	</body>
</html>
`;

		panel.webview.onDidReceiveMessage(async (message) => {
			if (message.command === COMMAND_SAVE_TO_CSV) {
				const uri = await window.showSaveDialog({
					saveLabel: 'Save',
					filters: { 'CSV Files': ['csv'] },
				});
				if (uri) {
					await client.sendRequest(ExecuteCommandRequest.method, {
						command: BQLS_COMMANDS.SAVE_RESULT,
						arguments: [virtualTextDocument.textDocument.uri, uri.toString()],
					});
					window.showInformationMessage('Query result saved successfully!');
				}
			} else if (message.command === COMMAND_SAVE_TO_SPREADSHEET) {
				const result = await client.sendRequest<{ url: string }>(
					ExecuteCommandRequest.method,
					{
						command: BQLS_COMMANDS.SAVE_RESULT,
						arguments: [virtualTextDocument.textDocument.uri, 'sheet://new'],
					},
				);
				await env.openExternal(Uri.parse(result.url));
			}
		});
	};
}
