import * as vscode from "vscode";
import { Flow } from "./git-llm"
import { exec } from 'child_process';
import { WebviewPanel } from './webviewPanel';
import * as path from 'path';

class WorkspaceManager {
    private currentWorkspace: string | undefined;
    private statusBarItem: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext) {
        // 初始化 Status Bar Item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = "gitgpt.selectWorkspace";
        this.currentWorkspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        this.updateStatusBarItem();

        const selectWorkspaceCommand = vscode.commands.registerCommand("gitgpt.selectWorkspace", async () => {
            const folderPath = await this.selectWorkspaceFolder();
            if (folderPath) {
                vscode.window.showInformationMessage(`Selected workspace folder: ${folderPath}`);
                this.currentWorkspace = folderPath;
                this.updateStatusBarItem();
            }
        });

        context.subscriptions.push(selectWorkspaceCommand, this.statusBarItem);
    }

    // 選擇 Workspace 資料夾
    private async selectWorkspaceFolder(): Promise<string | undefined> {
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "選擇資料夾",
        });

        return folderUri?.[0]?.fsPath;
    }

    // 更新 Status Bar Item 顯示
    private updateStatusBarItem() {
        if (this.currentWorkspace) {
            const folderName = path.basename(this.currentWorkspace);
            this.statusBarItem.text = `$(folder) ${folderName}`;
            this.statusBarItem.tooltip = this.currentWorkspace;
        } else {
            this.statusBarItem.text = `$(folder) No Workspace`;
            this.statusBarItem.tooltip = "No workspace folder selected";
        }
        this.statusBarItem.show();
    }

    // 獲取當前 Workspace
    public getCurrentWorkspace(): string {
        if (!this.currentWorkspace) {
            throw new Error("No workspace folder is open.");
        }
        return this.currentWorkspace;
    }
}


export function activate(context: vscode.ExtensionContext) {
    const workspaceManager = new WorkspaceManager(context);

    const queryLLM = vscode.commands.registerCommand(
        'gitgpt.queryLLM',
        async () => {
            const cwd = workspaceManager.getCurrentWorkspace();

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
                const cwd = workspaceManager.getCurrentWorkspace();

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
                const cwd = workspaceManager.getCurrentWorkspace();

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


    context.subscriptions.push(queryLLM, openAIAssistant, openGitLogViewer);
}

export function deactivate() { }
