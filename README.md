# vscode-version-control-chat-ai

## 安裝與開發

### 1. Clone 專案
首先將專案 clone 到本地環境：
```bash
git clone https://github.com/currybanfan/vscode-version-control-chat-ai.git
```

### 2. 進入專案目錄
切換到專案目錄：
```bash
cd vscode-version-control-chat-ai
```

### 3. 啟動開發容器
使用 Docker 啟動開發環境容器：
```bash
docker run -it --name vscode_extension -v $(pwd):/usr/src/app -w /usr/src/app node /bin/bash
```

### 4. 安裝相依套件
在容器內安裝專案依賴：
```bash
npm install
```

### 啟動開發模式
執行以下命令以啟動開發模式：
```bash
npm run watch
```
