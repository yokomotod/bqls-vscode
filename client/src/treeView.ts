/* --------------------------------------------------------------------------------------------
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	TreeDataProvider,
	TreeItemCollapsibleState,
	TreeItem as VSCodeTreeItem,
	window,
	workspace,
} from 'vscode';
import {
	ExecuteCommandRequest,
	LanguageClient,
} from 'vscode-languageclient/node';
import { BQLS_COMMANDS, CONFIG_PROJECTS, LOCAL_COMMANDS } from './constants';

function getConfiguredProjects(): string[] {
	const config = workspace.getConfiguration();
	return config.get<string[]>(CONFIG_PROJECTS, []);
}

export class BigQueryTreeDataProvider implements TreeDataProvider<TreeItem> {
	constructor(private client: LanguageClient) {}

	getTreeItem(element: TreeItem): VSCodeTreeItem {
		return element;
	}

	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		if (!element) {
			// Top-level: Fetch projects
			return this.fetchProjects();
		}

		if (element.contextValue === 'project') {
			return this.fetchDatasetsForProject(element.label);
		}

		if (element.contextValue === 'dataset') {
			return this.fetchTablesForDataset(element.project!, element.label);
		}

		return [];
	}

	private async fetchProjects(): Promise<TreeItem[]> {
		const projects = getConfiguredProjects();
		return projects.map(
			(project) =>
				new TreeItem(project, TreeItemCollapsibleState.Collapsed, 'project'),
		);
	}

	private async fetchDatasetsForProject(project: string): Promise<TreeItem[]> {
		try {
			const result = await this.client.sendRequest<{ datasets: string[] }>(
				ExecuteCommandRequest.method,
				{
					command: BQLS_COMMANDS.LIST_DATASETS,
					arguments: [project],
				},
			);

			return result.datasets.map(
				(dataset) =>
					new TreeItem(
						dataset,
						TreeItemCollapsibleState.Collapsed,
						'dataset',
						project,
					),
			);
		} catch (error) {
			window.showErrorMessage(
				`Failed to fetch datasets for project ${project}: ${error.message}`,
			);
			return [];
		}
	}

	private async fetchTablesForDataset(
		project: string,
		dataset: string,
	): Promise<TreeItem[]> {
		try {
			const result = await this.client.sendRequest<{
				project: string;
				dataset: string;
				tables: string[];
			}>(ExecuteCommandRequest.method, {
				command: BQLS_COMMANDS.LIST_TABLES,
				arguments: [project, dataset],
			});

			return result.tables.map(
				(table) =>
					new TreeItem(
						table,
						TreeItemCollapsibleState.None,
						'table',
						project,
						dataset,
					),
			);
		} catch (error) {
			window.showErrorMessage(
				`Failed to fetch tables for dataset ${dataset}: ${error.message}`,
			);
			return [];
		}
	}
}

export class TreeItem extends VSCodeTreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: TreeItemCollapsibleState,
		public readonly contextValue: string,
		public readonly project?: string,
		public readonly dataset?: string,
	) {
		super(label, collapsibleState);

		if (contextValue === 'table') {
			this.command = {
				command: LOCAL_COMMANDS.CREATE_TABLE_WEBVIEW,
				title: 'Open Table',
				arguments: [this.project, this.dataset, this.label],
			};
		}
	}
}
