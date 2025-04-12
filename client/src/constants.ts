/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

/*
 * package.json constants
 */
export const CONFIG_PROJECTS = 'bqls.projects';
export const EXECUTE_QUERY_COMMAND = 'bqls.executeQuery';
export const EXPLORER_VIEW_ID = 'bqls.explorer';

/*
 * bqls Language server commands
 */
export const BQLS_COMMANDS = {
	// workspace/executeCommand
	EXECUTE_QUERY: 'executeQuery',
	LIST_DATASETS: 'listDatasets',
	LIST_TABLES: 'listTables',
	SAVE_RESULT: 'saveResult',
};
export const BQLS_METHOD_VIRTUAL_TEXT_DOCUMENT = 'bqls/virtualTextDocument';

/*
 * local commands
 */
export const LOCAL_COMMANDS = {
	OPEN_TABLE: 'bqls.explorer.openTable',
};
