
window.addEventListener("DOMContentLoaded", () => {
    const $h1 = document.querySelector('h1');
    $h1.innerHTML = 'Hello Webview and Javascript!';

    const vscode = acquireVsCodeApi();
    const fetchButton = document.getElementById('fetch-terminal-info');
    const terminalInfoDiv = document.getElementById('terminal-info');
    const commandInput = document.getElementById('command-input');
    const sendButton = document.getElementById('send-command');

    fetchButton.addEventListener('click', () => {
        vscode.postMessage({ command: "fetchGitLog" });
    });

    sendButton.addEventListener('click', () => {
        const command = commandInput.value;
        if (command) {
            vscode.postMessage({ command: "executeInTerminal", text: command });
        }
    });

    window.addEventListener("message", (event) => {
        const message = event.data;
        console.log("Message received from Extension:", message);

        if (message.command === "gitLog") {
            terminalInfoDiv.innerText = message.text; // 顯示終端機資訊
        } else if (message.command === "updateContent") {
            document.querySelector('h1').innerText = message.text;
        }
    });
});

// window.addEventListener("message", (event) => {
//     // 處理 Extension 傳來的訊息
//     const message = event.data; // event.data 會包含 Extension 發送的內容
//     console.log("Message received from Extension:", message);

//     if (message.command === "updateContent") {
//         document.querySelector('h1').innerText = message.text;
//     }
// });
