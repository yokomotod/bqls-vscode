### prerequisite

build [bqls](https://github.com/kitagry/bqls) and locate into PATH.

```console
git clone https://github.com/kitagry/bqls.git -b v0.3.3
cd bqls
CC=clang CXX=clang++ go install .

bqls -version
```

### install

```console
git clone https://github.com/yokomotod/bqls-vscode.git
cd bqls-vscode

npm install
npx vsce package

code --install-extension bqls-vscode-0.1.0.vsix
```

### features

- Auto Complete
- Format
- Command: `Execute Query`

#### `bqls` support status

- ✅ `textDocument/formatting`
  - format SQL by `zetasql.FormatSQL`
- ✅ `textDocument/hover`
  - show table/column metadata
  - show function document
- ✅ `textDocument/completion`
- ✅ `textDocument/definition`
  - show table information
- 🔺 `textDocument/codeAction`
  - ✅ `executeQuery`
  - ❌ `listJobHistories`
- [workspace/executeCommand](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#workspaceexecutecommand)
    - ✅ [executeQuery](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#executequery)
    - ❌ [listDatasets](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#listdatasets)
    - ❌ [listTables](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#listtables)
    - ❌ [listJobHistories](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#listjobhistories)
    - ❌ [saveResult](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#saveResult)
- ❌ `workspace/didChangeConfiguration`

based on https://github.com/kitagry/bqls/tree/main#supported-protocol

<!--
# LSP Example

Heavily documented sample code for https://code.visualstudio.com/api/language-extensions/language-server-extension-guide

## Functionality

This Language Server works for plain text file. It has the following language features:
- Completions
- Diagnostics regenerated on each file change or configuration change

It also includes an End-to-End test.

## Structure

```
.
├── client // Language Client
│   ├── src
│   │   ├── test // End to End tests for Language Client / Server
│   │   └── extension.ts // Language Client entry point
├── package.json // The extension manifest.
└── server // Language Server
    └── src
        └── server.ts // Language Server entry point
```

## Running the Sample

- Run `npm install` in this folder. This installs all necessary npm modules in both the client and server folder
- Open VS Code on this folder.
- Press Ctrl+Shift+B to start compiling the client and server in [watch mode](https://code.visualstudio.com/docs/editor/tasks#:~:text=The%20first%20entry%20executes,the%20HelloWorld.js%20file.).
- Switch to the Run and Debug View in the Sidebar (Ctrl+Shift+D).
- Select `Launch Client` from the drop down (if it is not already).
- Press ▷ to run the launch config (F5).
- In the [Extension Development Host](https://code.visualstudio.com/api/get-started/your-first-extension#:~:text=Then%2C%20inside%20the%20editor%2C%20press%20F5.%20This%20will%20compile%20and%20run%20the%20extension%20in%20a%20new%20Extension%20Development%20Host%20window.) instance of VSCode, open a document in 'plain text' language mode.
  - Type `j` or `t` to see `Javascript` and `TypeScript` completion.
  - Enter text content such as `AAA aaa BBB`. The extension will emit diagnostics for all words in all-uppercase.
-->
