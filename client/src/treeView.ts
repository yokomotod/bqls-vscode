/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Copyright (c) yokomotod. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	Event,
	EventEmitter,
	ProgressLocation,
	TreeDataProvider,
	TreeItem as VSCodeTreeItem,
	TreeItemCollapsibleState,
	Uri,
	commands,
	window,
	workspace,
} from 'vscode';

import { LanguageClient } from 'vscode-languageclient/node';

// 設定キー
const CONFIG_PROJECTS = 'bqls.projects';

/**
 * 設定から構成されたプロジェクトのリストを取得する
 */
export function getConfiguredProjects(): string[] {
	const config = workspace.getConfiguration();
	return config.get<string[]>(CONFIG_PROJECTS, []);
}

/**
 * BigQueryのTreeViewを提供するクラス
 */
export class BigQueryTreeDataProvider implements TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | void> =
		new EventEmitter<TreeItem | undefined | void>();
	readonly onDidChangeTreeData: Event<TreeItem | undefined | void> =
		this._onDidChangeTreeData.event;

	constructor(private client: LanguageClient) {}

	getTreeItem(element: TreeItem): VSCodeTreeItem {
		return element;
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
				'workspace/executeCommand',
				{
					command: 'listDatasets',
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
			}>('workspace/executeCommand', {
				command: 'listTables',
				arguments: [project, dataset],
			});

			return result.tables.map(
				(table) =>
					new TreeItem(
						table,
						TreeItemCollapsibleState.None,
						'table',
						result.project,
						result.dataset,
					),
			);
		} catch (error) {
			window.showErrorMessage(
				`Failed to fetch tables for dataset ${dataset}: ${error.message}`,
			);
			return [];
		}
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

	/**
	 * 仮想テキストドキュメントを開く
	 */
	public async openVirtualTextDocument(uri: string): Promise<void> {
		try {
			await window.withProgress(
				{
					location: ProgressLocation.Notification,
					title: 'Loading table...',
					cancellable: false,
				},
				async () => {
					const document = await workspace.openTextDocument(Uri.parse(uri));
					await window.showTextDocument(document);
				},
			);
		} catch (error) {
			window.showErrorMessage(`Failed to open table: ${error.message}`);
		}
	}

	/**
	 * ツリービューを更新する
	 */
	public refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}

/**
 * ツリービューのアイテムクラス
 */
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
				command: 'bigQueryExplorer.openTable',
				title: 'Open Table',
				arguments: [this],
			};
		}
	}
}

/**
 * BigQueryエクスプローラーのツリービューを登録する
 */
export function registerBigQueryTreeView(
	client: LanguageClient,
): BigQueryTreeDataProvider {
	const treeDataProvider = new BigQueryTreeDataProvider(client);

	// TreeDataProviderを登録
	window.registerTreeDataProvider('bigQueryExplorer', treeDataProvider);

	// テーブルをクリックしたときのコマンドを登録
	commands.registerCommand('bigQueryExplorer.openTable', (table: TreeItem) => {
		if (table.contextValue === 'table') {
			const uri = `bqls://project/${table.project}/dataset/${table.dataset}/table/${table.label}`;
			treeDataProvider.openVirtualTextDocument(uri);
		}
	});

	// 更新コマンドを登録
	commands.registerCommand('bigQueryExplorer.refresh', () =>
		treeDataProvider.refresh(),
	);

	return treeDataProvider;
}
