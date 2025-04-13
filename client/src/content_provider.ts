/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { commands, TextDocumentContentProvider, Uri } from 'vscode';
import { LOCAL_COMMANDS } from './constants';

export class BqlsTextDocumentContentProvider
	implements TextDocumentContentProvider
{
	public async provideTextDocumentContent(uri: Uri): Promise<string> {
		const uriString = uri.toString();
		const match = uriString.match(
			/^bqls:\/\/(?:project\/)?([^/]+)\/dataset\/([^/]+)\/table\/([^/]+)/,
		);

		if (!match) {
			throw new Error(`Invalid bqls URI: ${uriString}`);
		}

		const project = match[1];
		const dataset = match[2];
		const table = match[3];

		await commands.executeCommand(
			LOCAL_COMMANDS.CREATE_TABLE_WEBVIEW,
			project,
			dataset,
			table,
		);

		return '';
	}
}
