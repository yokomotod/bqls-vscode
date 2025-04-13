/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

/*
 * package.json constants
 */
export const CONFIG_PROJECTS = 'bqls.projects';
export const EXPLORER_VIEW_ID = 'bqls.explorer';

/*
 * bqls Language server commands
 */
export const BQLS_COMMANDS = {
	// workspace/executeCommand
	EXECUTE_QUERY: 'bqls.executeQuery',
	LIST_DATASETS: 'bqls.listDatasets',
	LIST_TABLES: 'bqls.listTables',
	SAVE_RESULT: 'bqls.saveResult',
};
export const BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT = 'bqls/virtualTextDocument';

export const BQLS_SCHEME = 'bqls';

/*
 * local commands
 */
export const LOCAL_COMMANDS = {
	CREATE_TABLE_WEBVIEW: 'bqls.createTableWebview',
};
