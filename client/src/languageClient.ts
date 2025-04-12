/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { ProgressLocation, ProviderResult, window, workspace } from 'vscode';

import {
	ExecuteCommandSignature,
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	WorkDoneProgress,
} from 'vscode-languageclient/node';
import { BQLS_COMMANDS } from './constants';

export function initializeLanguageClient(
	executeQueryMiddleware: (
		client: LanguageClient,
		command: string,
		args: unknown[],
		next: ExecuteCommandSignature,
	) => ProviderResult<void>,
): LanguageClient {
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
		middleware: {
			executeCommand: (command, args, next) => {
				switch (command) {
					case BQLS_COMMANDS.EXECUTE_QUERY:
						return executeQueryMiddleware(client, command, args, next);
					default:
						return next(command, args);
				}
			},
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
