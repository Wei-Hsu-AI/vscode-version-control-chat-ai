window.addEventListener("DOMContentLoaded", () => {
  // 獲取 VS Code API
  const vscode = acquireVsCodeApi();

  // 綁定 DOM 元素
  const sendButton = document.getElementById("send-btn");
  const themeButton = document.getElementById("theme-btn");
  const deleteButton = document.getElementById("delete-btn");
  const chatInput = document.getElementById("chat-input");
  const chatContainer = document.querySelector(".chat-container");

  // 點擊 "Send" 按鈕處理
  sendButton.addEventListener("click", () => {
      const userInput = chatInput.value.trim();
      if (userInput) {
          addMessageToChat('user', userInput); // 顯示使用者訊息
          vscode.postMessage({ type: 'user_message', message: userInput }); // 發送訊息到 VS Code
          chatInput.value = ""; // 清空輸入框
      } else {
          alert('請輸入訊息！');
      }
  });

  // 點擊 "Delete" 按鈕處理
  deleteButton.addEventListener("click", () => {
      chatContainer.innerHTML = ""; // 清空聊天視窗
  });

  // 切換主題功能
  themeButton.addEventListener("click", () => {
    // 讀取儲存的主題
    const themeColor = localStorage.getItem("themeColor");
    
    // 如果目前的主題是 light_mode，則切換到 dark_mode，反之亦然
    if (themeColor === "light_mode") {
        document.body.classList.add("light-mode");
        localStorage.setItem("themeColor", "light_mode"); // 儲存選擇的主題
    } else {
        document.body.classList.remove("light-mode");
        localStorage.setItem("themeColor", "dark_mode"); // 儲存選擇的主題
    }
    
    // 發送切換主題的命令到 VS Code
    const theme = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";
    vscode.postMessage({ command: "toggleTheme", theme });
  });

  // 接收 VS Code 傳來的訊息
  window.addEventListener("message", (event) => {
      const message = event.data;
      if (message.type === "message") {
          addMessageToChat("ai", message.message); // 顯示 AI 訊息
      } else if (message.type === "ask_user") {
          chatInput.disabled = false; // 啟用輸入框
          addMessageToChat("ai", message.message); // 顯示提示訊息
      }
  });

  // 添加訊息到聊天視窗
  function addMessageToChat(type, text) {
      const messageDiv = document.createElement("div");
      messageDiv.className = `message ${type}`;
      messageDiv.textContent = text;
      chatContainer.appendChild(messageDiv);

      // 滾動到底部
      chatContainer.scrollTop = chatContainer.scrollHeight;
  }
});
