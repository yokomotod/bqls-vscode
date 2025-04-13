/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { ProgressLocation, window } from 'vscode';
import {
	ExecuteCommandSignature,
	LanguageClient,
} from 'vscode-languageclient/node';
import { BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT } from './constants';
import { createQueryResultWebview, QueryResult } from './webView';

export async function executeQueryMiddleware(
	client: LanguageClient,
	command: string,
	args: unknown[],
	next: ExecuteCommandSignature,
) {
	if (args.length === 0) {
		// from command palette
		args = [window.activeTextEditor.document.uri.toString()];
	}

	const virtualTextDocument = await window.withProgress(
		{
			location: ProgressLocation.Notification,
			title: 'Executing query...',
			cancellable: false,
		},
		async () => {
			return await next(command, args);
		},
	);

	const responose = await window.withProgress(
		{
			location: ProgressLocation.Notification,
			title: 'Loading query result...',
			cancellable: false,
		},
		async () => {
			return client.sendRequest<QueryResult>(
				BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT,
				{
					textDocument: virtualTextDocument.textDocument,
				},
			);
		},
	);

	createQueryResultWebview(
		client,
		virtualTextDocument.textDocument.uri,
		responose,
	);
}
