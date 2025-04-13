/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { commands, ExtensionContext, window } from 'vscode';

import { LanguageClient } from 'vscode-languageclient/node';
import { EXPLORER_VIEW_ID, LOCAL_COMMANDS } from './constants';
import { executeQueryMiddleware } from './executeQuery';
import { initializeLanguageClient } from './languageClient';
import { BigQueryTreeDataProvider } from './treeView';
import { buildTableWebviewCommand } from './webView';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	client = initializeLanguageClient(executeQueryMiddleware);

	context.subscriptions.push(
		commands.registerCommand(
			LOCAL_COMMANDS.CREATE_TABLE_WEBVIEW,
			buildTableWebviewCommand(client),
		),
	);

	window.registerTreeDataProvider(
		EXPLORER_VIEW_ID,
		new BigQueryTreeDataProvider(client),
	);

	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
