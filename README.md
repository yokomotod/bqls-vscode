# `bqls` for Visual Studio Code

VSCode extension for [bqls: BigQuery Language Server](https://github.com/kitagry/bqls)

## Features

### Execute query

Command Palette (`Ctrl+Shift+P`) -> `bqls: Execute Query`

or

Code Action (`Ctrl+.`) -> `Execute Query`

![image](https://github.com/user-attachments/assets/18cdbdd3-9638-4921-9cd1-bf0ca38e950b)

#### Save result

local CSV or Google Spreadsheet

### Table Explorer

![image](https://github.com/user-attachments/assets/578973a9-c4a3-4420-a8e9-91f507fc1f89)

### Hover infomation

Column

![image](https://github.com/user-attachments/assets/c4e8c356-d7b1-450d-b241-1a92f2f32fdb)

Function

![image](https://github.com/user-attachments/assets/3c5f5c93-b0fd-4bbf-ae6d-67b8402777d6)

### etc.

- Format
- Definition jump
- Auto Complete


## Install

### prerequisite: install bqls

download from https://github.com/kitagry/bqls/releases/tag/v0.3.3 and place it into PATH

or else, build from source

```console
CC=clang CXX=clang++ go install github.com/kitagry/bqls@v0.3.3
```

check

```console
bqls -version
```

### prerequisite: install gcloud SDK

https://cloud.google.com/sdk/docs/install

```console
gcloud auth application-default login
```

### install extension

```console
git clone https://github.com/yokomotod/bqls-vscode.git
cd bqls-vscode

npm install
npx vsce package

code --install-extension bqls-vscode-0.1.0.vsix
```

## `bqls` support status

- ✅ `textDocument/formatting`
  - format SQL by `zetasql.FormatSQL`
- ✅ `textDocument/hover`
  - show table/column metadata
  - show function document
- ✅ `textDocument/definition`
  - show table information
- 🔺 `textDocument/codeAction`
  - ✅ `executeQuery`
  - ❌ `listJobHistories`
- [workspace/executeCommand](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#workspaceexecutecommand)
  - ✅ [executeQuery](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#executequery)
  - ✅ [listDatasets](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#listdatasets)
  - ✅ [listTables](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#listtables)
  - ❌ [listJobHistories](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#listjobhistories)
  - ✅ [saveResult](https://github.com/kitagry/bqls/blob/main/docs/api_reference.md#saveResult)
    - save query result to csv
    - save query result to google spreadsheet
- ❌ `workspace/didChangeConfiguration`

based on https://github.com/kitagry/bqls/tree/main#supported-protocol
