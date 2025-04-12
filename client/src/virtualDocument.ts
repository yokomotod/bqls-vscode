/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { TextDocumentContentProvider } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT } from './constants';

export const BQLS_SCHEME = 'bqls';

export function buildBqlsProvider(
	client: LanguageClient,
): TextDocumentContentProvider {
	return {
		provideTextDocumentContent: async (uri) => {
			const result: {
				contents: { language: string; value: string }[];
				result: { columns: string[]; data: unknown[][] };
			} = await client.sendRequest(BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT, {
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
	};
}
