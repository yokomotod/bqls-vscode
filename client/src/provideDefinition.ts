import { TextDocument, CancellationToken, commands, Position } from 'vscode';
import { ProvideDefinitionSignature } from 'vscode-languageclient';
import { BQLS_SCHEME, LOCAL_COMMANDS } from './constants';

// Note:
// This method is called when the user hovers over a table name.
// It's good to open the webview on click but I don't know how to do it.
// We can register the TextDocumentContentProvider to handle custom URI schemes,
// but VSCode is going to open the URI on hover.
export async function provideDefinition(
	document: TextDocument,
	position: Position,
	token: CancellationToken,
	next: ProvideDefinitionSignature,
) {
	const result = next(document, position, token);

	return Promise.resolve(result).then((result) => {
		if (!result) {
			return result;
		}
		const location = Array.isArray(result) ? result[0] : result;
		if (!('uri' in location)) {
			return result;
		}
		if (location.uri.scheme !== BQLS_SCHEME) {
			return result;
		}

		const uri = location.uri.toString();
		const info = parseBqlsUri(uri);
		if (!info) {
			return result;
		}

		// webviewを表示
		commands.executeCommand(
			LOCAL_COMMANDS.CREATE_TABLE_WEBVIEW,
			info.project,
			info.dataset,
			info.table,
		);
		return null;
	});
}

function parseBqlsUri(
	uri: string,
): { project: string; dataset: string; table: string } | null {
	const match = uri.match(
		/bqls:\/\/project\/([^/]+)\/dataset\/([^/]+)\/table\/([^/]+)/,
	);
	if (match) {
		return {
			project: match[1],
			dataset: match[2],
			table: match[3],
		};
	}
	return null;
}
