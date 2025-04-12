/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { ProgressLocation, window, workspace } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	WorkDoneProgress,
} from 'vscode-languageclient/node';

export function initializeLanguageClient(): LanguageClient {
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
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

	const client = new LanguageClient(
		'bqls',
		'bqls',
		serverOptions,
		clientOptions,
	);

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

	return client;
}
