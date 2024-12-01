import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec } from 'child_process';
import * as iconv from 'iconv-lite';
import axios from 'axios';
import { WebviewPanel } from './webviewPanel';

const terminalName = "WebView Terminal";

export function activate(context: vscode.ExtensionContext) {
    let queryLLM = vscode.commands.registerCommand(
        'llm-interaction.queryLLM',
        async () => {
            const apiUrl = 'https://httpbin.org/post';

            axios.post(apiUrl, { key: 'value' }).then(response => {
                console.log(response.data); // 返回包含發送的數據和請求細節
            }).catch(error => {
                console.error('Error:', error);
            });
        }
    )

    let openWebView = vscode.commands.registerCommand(
        "webview-api.openWebView",
        () => {
            try {
                // 創建 Webview Panel
                const webviewPanel = WebviewPanel.getInstance(context);

                // 獲取工作目錄
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? (() => { throw new Error('No workspace folder is open.'); })();

                // 檢查 Git 是否可用
                exec('git --version', { encoding: 'buffer' }, (error, stdout, stderr) => {
                    if (error) {
                        throw new Error('Git is not installed or not in PATH.');
                    }
                    const output = stdout.toString('utf8');
                    vscode.window.showInformationMessage(`Git version:\n${output}`);

                    // 檢查是否有 .git 資料夾
                    const gitFolderPath = path.join(workspaceFolder, '.git');
                    if (!fs.existsSync(gitFolderPath)) {
                        throw new Error('.git directory not found. Ensure this is a Git repository.');
                    }
                });

                // 創建或獲取終端
                const terminal = vscode.window.terminals.find(t => t.name === terminalName) ??
                    vscode.window.createTerminal({ name: terminalName, cwd: workspaceFolder });
                terminal.show();

                // 設置 WebviewPanel 的消息監聽
                webviewPanel.onDidReceiveMessage(async (message) => {
                    if (message.command === "executeInTerminal") {
                        terminal.show();

                        // 可能要改成 exec 才能獲取執行的結果
                        terminal!.sendText(message.text);
                    } else if (message.command === "fetchGitLog") {

                        // 動態選擇 Shell
                        const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';

                        // 執行命令並捕獲輸出回傳給 Webview
                        exec("git log --graph --all --format=format:'%h %s %d (%ar) - %an'", { shell: shell, cwd: workspaceFolder, encoding: 'buffer' }, (error, stdout, stderr) => {
                            if (error) {
                                vscode.window.showErrorMessage(`Error: ${error.message}`);
                                return;
                            }
                            const output = iconv.decode(stdout, 'utf8');

                            webviewPanel.sendMessage({
                                command: "gitLog",
                                text: output
                            });
                        });

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

    context.subscriptions.push(queryLLM, openWebView);
}

export function deactivate() { }
