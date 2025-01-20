import * as vscode from "vscode";
import { Flow } from "./git-llm"
import { exec } from 'child_process';
import { WebviewPanel } from './webviewPanel';
import * as path from 'path';

let currentWorkspace: string | undefined;

async function selectWorkspaceFolder(): Promise<string | undefined> {
    const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true, // 只允許選擇資料夾
        canSelectMany: false, // 只允許選擇一個
        openLabel: '選擇資料夾'
    });

    if (folderUri && folderUri[0]) {
        return folderUri[0].fsPath; // 返回選中的資料夾路徑
    } else {
        return undefined;
    }
}

function updateStatusBarItem(statusBarItem: vscode.StatusBarItem) {
    if (currentWorkspace) {
        // 僅顯示資料夾名稱，而非完整路徑
        const folderName = path.basename(currentWorkspace);
        statusBarItem.text = `$(folder) ${folderName}`;
        statusBarItem.tooltip = `${currentWorkspace}`; // 保留完整路徑作為工具提示
    } else {
        statusBarItem.text = `$(folder) No Workspace`;
        statusBarItem.tooltip = 'No workspace folder selected';
    }
    statusBarItem.show();
}


export function activate(context: vscode.ExtensionContext) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'gitgpt.selectWorkspace';

    currentWorkspace =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ??
        undefined;
    updateStatusBarItem(statusBarItem); // 初始化 Status Bar 顯示

    const selectWorkspaceCommand = vscode.commands.registerCommand('gitgpt.selectWorkspace', async () => {
        const folderPath = await selectWorkspaceFolder();
        if (folderPath) {
            vscode.window.showInformationMessage(`Selected workspace folder: ${folderPath}`);
            currentWorkspace = folderPath; // 更新當前 Workspace
            updateStatusBarItem(statusBarItem); // 更新 Status Bar
        }
    });

    const queryLLM = vscode.commands.registerCommand(
        'gitgpt.queryLLM',
        async () => {
            const cwd = currentWorkspace ?? (() => { throw new Error('No workspace folder is open.'); })();

            exec('git status', { encoding: 'buffer', cwd: cwd }, (error, stdout, stderr) => {
                if (error) {
                    throw new Error('Git is not installed or not in PATH.');
                }
                const output = stdout.toString('utf8');
                vscode.window.showInformationMessage(`Git version:\n${output}`);
            })
        }
    );

    const openAIAssistant = vscode.commands.registerCommand(
        "gitgpt.openAIAssistant",
        () => {
            try {
                const webviewPanel = WebviewPanel.getInstance(context);
                const cwd = currentWorkspace ?? (() => { throw new Error('No workspace folder is open.'); })();

                webviewPanel.onDidReceiveMessage((message) => {
                    if (message.type === "task") {
                        const flow = new Flow(cwd, message.task, webviewPanel);
                        flow.run();
                    }
                });
            } catch (error) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                } else {
                    vscode.window.showErrorMessage(`Unknown error occurred.`);
                }
                console.log(error);
            }
        }
    );

    const openGitLogViewer = vscode.commands.registerCommand(
        "gitgpt.openGitLogViewer",
        () => {
            try {
                /**
                 * webviewpanel應設置為可以打開兩個不同的webview
                 */
                const webviewPanel = WebviewPanel.getInstance(context);
                const cwd = currentWorkspace ?? (() => { throw new Error('No workspace folder is open.'); })();

                webviewPanel.onDidReceiveMessage((message) => {
                    /**
                     * 當git相關指令被執行時，調用git log取得log並在log tree page中顯示
                     */
                });
            } catch (error) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                } else {
                    vscode.window.showErrorMessage(`Unknown error occurred.`);
                }
                console.log(error);
            }
        }
    );


    context.subscriptions.push(queryLLM, openAIAssistant, openGitLogViewer, selectWorkspaceCommand, statusBarItem);
}

export function deactivate() { }
