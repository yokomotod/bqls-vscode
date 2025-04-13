/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { marked } from 'marked';
import { ProgressLocation, ViewColumn, window } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { parse as yamlParse } from 'yaml';
import { BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT, BQLS_SCHEME } from './constants';

export function buildTableWebviewCommand(client: LanguageClient) {
	return async (project: string, dataset: string, label: string) => {
		const uri = `${BQLS_SCHEME}://project/${project}/dataset/${dataset}/table/${label}`;

		const { result, contents } = await window.withProgress(
			{
				location: ProgressLocation.Notification,
				title: 'Loading table...',
				cancellable: false,
			},
			async () => {
				return client.sendRequest<{
					contents: { language: string; value: string }[];
					result: { columns: string[]; data: unknown[][] };
				}>(BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT, {
					textDocument: { uri: uri.toString() },
				});
			},
		);

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

		const headers = result.columns.map((col) => `<th>${col}</th>`).join('');

		const rows = result.data
			.map(
				(row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`,
			)
			.join('');

		panel.webview.html = `
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Table Detail</title>
</head>
<body>
<div>
	${marked(markdownContent)}
</div>
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
<table border="1">
	<thead>
		<tr>${headers}</tr>
	</thead>
	<tbody>
		${rows}
	</tbody>
</table>
</body>
</html>
`;
	};
}
