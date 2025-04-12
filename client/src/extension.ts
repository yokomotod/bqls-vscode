/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { commands, ExtensionContext, window, workspace } from 'vscode';

import { LanguageClient } from 'vscode-languageclient/node';
import { buildExecuteQueryFunction } from './executeQuery';
import { initializeLanguageClient } from './languageClient';
import { BigQueryTreeDataProvider, openTable } from './treeView';
import { BQLS_SCHEME, buildBqlsProvider } from './virtualDocument';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	client = initializeLanguageClient();

	workspace.registerTextDocumentContentProvider(
		BQLS_SCHEME,
		buildBqlsProvider(client),
	);

	window.registerTreeDataProvider(
		'bqls.explorer',
		new BigQueryTreeDataProvider(client),
	);
	context.subscriptions.push(
		commands.registerCommand('bqls.explorer.openTable', openTable),
	);

	context.subscriptions.push(
		commands.registerCommand(
			'bqls.executeQuery',
			buildExecuteQueryFunction(client),
		),
	);

	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
