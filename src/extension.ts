import * as vscode from "vscode";
import { Flow } from "./git-llm"
import { exec } from 'child_process';
import { WebviewPanel } from './webviewPanel';

const terminalName = "WebView Terminal";

export function activate(context: vscode.ExtensionContext) {
    let queryLLM = vscode.commands.registerCommand(
        'gitgpt.queryLLM',
        async () => {
            const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? (() => { throw new Error('No workspace folder is open.'); })();

            vscode.window.showInformationMessage(`workspace: ${cwd}`);

            exec('git status', { encoding: 'buffer', cwd: cwd }, (error, stdout, stderr) => {
                if (error) {
                    throw new Error('Git is not installed or not in PATH.');
                }
                const output = stdout.toString('utf8');
                vscode.window.showInformationMessage(`Git version:\n${output}`);
            })
        }
    );

    let openAIAssistant = vscode.commands.registerCommand(
        "gitgpt.openAIAssistant",
        () => {
            try {
                const webviewPanel = WebviewPanel.getInstance(context);
                const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? (() => { throw new Error('No workspace folder is open.'); })();

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

    let openGitLogViewer = vscode.commands.registerCommand(
        "gitgpt.openGitLogViewer",
        () => {
            try {
                /**
                 * webviewpanel應設置為可以打開兩個不同的webview
                 */
                const webviewPanel = WebviewPanel.getInstance(context);
                const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? (() => { throw new Error('No workspace folder is open.'); })();

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
