/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { marked } from 'marked';
import { env, ProgressLocation, Uri, ViewColumn, window } from 'vscode';
import {
	ExecuteCommandRequest,
	LanguageClient,
} from 'vscode-languageclient/node';
import { parse as yamlParse } from 'yaml';
import {
	BQLS_COMMANDS,
	BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT,
	BQLS_SCHEME,
} from './constants';

interface TableResult {
	contents: { language: string; value: string }[];
	result: { columns: string[]; data: unknown[][] };
}
export function buildTableWebviewCommand(client: LanguageClient) {
	return async (project: string, dataset: string, label: string) => {
		const uri = `${BQLS_SCHEME}://project/${project}/dataset/${dataset}/table/${label}`;

		const response = await window.withProgress(
			{
				location: ProgressLocation.Notification,
				title: 'Loading table...',
				cancellable: false,
			},
			async () => {
				return client.sendRequest<TableResult>(
					BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT,
					{
						textDocument: { uri: uri.toString() },
					},
				);
			},
		);

		createTableWebView(response);
	};
}

function createTableWebView({ contents, result }: TableResult) {
	const panel = window.createWebviewPanel(
		'bqls.tableDetail',
		'Table Detail',
		ViewColumn.One,
	);

	const markdownContent = contents
		.filter((content) => content.language === 'markdown')
		.map((content) => content.value)
		.join('\n');

	const yamlContent =
		contents.find((content) => content.language === 'yaml')?.value || '';
	const schema = yamlParse(yamlContent);
	const schemaRows = schema
		.map(
			(row) => `
				<tr>
					<td>${row.name}</td>
					<td>${row.type}</td>
					<td>${row.mode ?? 'NULLABLE'}</td>
					<td>${row.description ?? '-'}</td>
				</tr>
		`,
		)
		.join('');

	panel.webview.html = `
<html lang="en">
<body>
${marked(markdownContent)}
<h3>Schema</h3>
<table border="1">
	<thead>
		<tr>
			<th>Name</th>
			<th>Type</th>
			<th>Mode</th>
			<th>Description</th>
		</tr>
	</thead>
	<tbody>
		${schemaRows}
	</tbody>
</table>
<h3>Preview</h3>
${renderDataTableHtml(result.columns, result.data)}
</body>
</html>
`;
}

export interface QueryResult {
	contents: { language: string; value: string }[];
	result: { columns: string[]; data: unknown[][] };
}

const COMMAND_SAVE_TO_CSV = 'saveToCsv';
const COMMAND_SAVE_TO_SPREADSHEET = 'saveToSpreadsheet';

export function createQueryResultWebview(
	client: LanguageClient,
	jobUri: string,
	{ contents, result }: QueryResult,
) {
	const panel = window.createWebviewPanel(
		'bqls.queryResult',
		'Query Result',
		ViewColumn.Beside,
		{
			enableScripts: true,
		},
	);

	const markdownContent = contents
		.filter((content) => content.language === 'markdown')
		.map((content) => content.value)
		.join('\n');

	panel.webview.html = `
<html lang="en">
<body>
${marked(markdownContent)}
<h3>Result</h3>
<button id="saveToCsv">Save to CSV</button>
<button id="saveToSpreadsheet">Save to Spreadsheet</button>
${renderDataTableHtml(result.columns, result.data)}
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
					arguments: [jobUri, uri.toString()],
				});
				window.showInformationMessage('Query result saved successfully!');
			}
		} else if (message.command === COMMAND_SAVE_TO_SPREADSHEET) {
			const spreadsheetUrl = await window.showInputBox({
				prompt: 'Enter Google Spreadsheet URL (leave empty to create new)',
				placeHolder: 'https://docs.google.com/spreadsheets/d/...',
			});
			
			const targetUrl = spreadsheetUrl || 'sheet://new';
			const result = await client.sendRequest<{ url: string }>(
				ExecuteCommandRequest.method,
				{
					command: BQLS_COMMANDS.SAVE_RESULT,
					arguments: [jobUri, targetUrl],
				},
			);
			await env.openExternal(Uri.parse(result.url));
		}
	});
}

function renderDataTableHtml(columns: string[], data: unknown[][]) {
	const headers = columns.map((col) => `<th>${col}</th>`).join('');

	const rows = data
		.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
		.join('');

	return `
<table border="1">
	<thead>
		<tr>${headers}</tr>
	</thead>
	<tbody>
		${rows}
	</tbody>
</table>
`;
}
