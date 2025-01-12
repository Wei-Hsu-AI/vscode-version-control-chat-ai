window.addEventListener("DOMContentLoaded", () => {
    // 獲取 VS Code API
    const vscode = acquireVsCodeApi();

    // 綁定 DOM 元素
    const sendButton = document.getElementById("send-btn");
    const chatInput = document.getElementById("chat-input");

    // chatInput.value = "我想把 feature 分支 merge 到 main";

    const themeButton = document.getElementById("theme-btn");
    const deleteButton = document.getElementById("delete-btn");
    const chatContainer = document.querySelector(".chat-container");

    let messageId = null;

    const userSendMessageHandler = (event) => {
        const userInput = chatInput.value.trim();
        if (userInput) {
            addMessageToChat('user', userInput); // 顯示使用者訊息
            if (messageId == null) {
                vscode.postMessage({ type: 'task', task: userInput }); // 發送訊息到 VS Code
            } else {
                vscode.postMessage({ type: 'ask_user_response', answer: userInput, id: messageId });
            }
            chatInput.disabled = true; // 禁用輸入框
            chatInput.value = ""; // 清空輸入框
        } else {
            alert('請輸入訊息！');
        }
    }

    let isComposing = false;

    chatInput.addEventListener("compositionstart", () => {
        isComposing = true; // 開始選字
    });

    chatInput.addEventListener("compositionend", () => {
        isComposing = false; // 結束選字
    });

    chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !isComposing) {
            event.preventDefault();
            userSendMessageHandler();
        }
    });

    // 點擊 "Send" 按鈕處理
    sendButton.addEventListener("click", () => {
        userSendMessageHandler();
    });

    // 點擊 "Delete" 按鈕處理
    deleteButton.addEventListener("click", () => {
        chatContainer.innerHTML = ""; // 清空聊天視窗
        chatInput.value = ""; // 清空輸入框
        chatInput.disabled = false; // 啟用輸入框
        messageId = null;
        gitGraph.clear();
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

    const gitGraph = GitGraph.getInstance();
    gitGraph.registerSvg("svg");

    // 接收 VS Code 傳來的訊息
    window.addEventListener("message", (event) => {
        const message = event.data;
        if (message.type === "message") {
            addMessageToChat("ai", message.message); // 顯示 AI 訊息
        } else if (message.type === "ask_user") {
            chatInput.disabled = false; // 啟用輸入框
            messageId = message.messageId;
            addMessageToChat("ai", message.message, message.options); // 顯示提示訊息
        } else if (message.type === 'git_log') {
            const commit = message.gitLog;
            if (gitGraph.addCommit(commit)) {
                gitGraph.render();
            }
        }
    });

    // 添加訊息到聊天視窗
    function addMessageToChat(type, text, options) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${type}`;
        // 將 \n 替換為 <br> 並插入為 HTML
        messageDiv.innerHTML = `${type}: ${text.replace(/\n/g, "<br>")}`;
        if (options) {
            const optionsDiv = document.createElement("div");
            optionsDiv.className = "options";
            options.forEach((option) => {
                const button = document.createElement("button");
                button.className = "option";
                button.textContent = option;
                button.addEventListener("click", () => {
                    addMessageToChat('user', option);
                    vscode.postMessage({ type: 'ask_user_response', answer: option, id: messageId });
                    chatInput.disabled = true;
                    optionsDiv.remove();
                });
                optionsDiv.appendChild(button);
            });
            messageDiv.appendChild(optionsDiv);
        }

        chatContainer.appendChild(messageDiv);

        // 滾動到底部
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});

class GitGraph {
    static instance = null;

    svg = null;
    g = null;
    commits = [];

    NODE_RADIUS = 40;

    constructor() { }

    static getInstance() {
        if (!GitGraph.instance) {
            GitGraph.instance = new GitGraph();
        }
        return GitGraph.instance;
    }

    registerSvg(svgSelector = "svg") {
        this.svg = d3.select(svgSelector);

        if (this.svg) {
            this.g = this.svg.append("g");

            const zoom = d3.zoom()
                .scaleExtent([0.3, 3])
                .on("zoom", (event) => {
                    if (this.g) this.g.attr("transform", event.transform);
                });

            this.svg.call(zoom);

            const svgElement = document.querySelector("svg");
            if (svgElement) {
                const { width, height } = svgElement.getBoundingClientRect();
                const scale = 0.8;
                const initialTransform = d3.zoomIdentity
                    .translate(width / 2, height / 4)
                    .scale(scale);

                this.svg.call(zoom.transform, initialTransform);
            }

            this.svg.append("defs")
                .append("marker")
                .attr("id", "arrow")
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 6)
                .attr("refY", 0)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("fill", "#f00");
        }
    }

    addCommit(commit) {
        if (this.commits.length > 0 && this.checkGitLogIsSameIgnoreTime(this.commits[this.commits.length - 1], commit)) return 0;

        console.log("Adding commit", commit);
        this.commits.push(commit);
        return 1;
    }

    checkGitLogIsSameIgnoreTime(gitLog1, gitLog2) {
        const lines1 = gitLog1.trim().split("\n");
        const lines2 = gitLog2.trim().split("\n");

        if (lines1.length !== lines2.length) {
            return false;
        }

        const regex = /^([a-f0-9]{7}) \(([^)]+)\) \(([^)]+)\) \(([^)]+)\) (?: \(([^)]+)\))? \[([^\]]*)\]$/;

        for (let i = 0; i < lines1.length; i++) {
            const match1 = lines1[i].match(regex);
            const match2 = lines2[i].match(regex);

            if (!match1 || !match2) {
                return false;
            }

            const [_, hash1, author1, , branchInfo1, tags1, parents1] = match1;
            const [__, hash2, author2, , branchInfo2, tags2, parents2] = match2;

            if (
                hash1 !== hash2 ||
                author1 !== author2 ||
                branchInfo1 !== branchInfo2 ||
                tags1 !== tags2 ||
                parents1 !== parents2
            ) {
                return false;
            }
        }

        return true;
    }

    parseGitLogToD3Tree(gitLog) {
        const lines = gitLog.trim().split("\n");
        const commits = {};
        const nodes = [];

        const regex = /^([a-f0-9]{7}) \(([^)]+)\) \(([^)]+)\) \(([^)]+)\) (?: \(([^)]+)\))? \[([^\]]*)\]$/;

        lines.forEach((line) => {
            const match = line.match(regex);
            if (!match) {
                console.error(`Unmatched line: ${line}`);
                return;
            }

            const hash = match[1];
            const author = match[2];
            const time = match[3];
            const message = match[4];
            const branchesRaw = match[5]
                ? match[5].split(",").map((b) => b.trim())
                : [];
            const parents = match[6]
                ? match[6].split(" ").map((p) => p.trim()).filter(Boolean)
                : [];

            const branches = [];
            branchesRaw.forEach((branch) => {
                if (branch.includes("->")) {
                    const splitBranches = branch.split("->").map((b) => b.trim());
                    branches.push(...splitBranches);
                } else {
                    branches.push(branch);
                }
            });

            commits[hash] = {
                id: hash,
                message,
                author,
                time,
                branches,
                parents,
                children: [],
                x: 0,
                y: 0,
            };
            nodes.push(commits[hash]);
        });

        Object.entries(commits).forEach(([hash, commitObj]) => {
            commitObj.parents.forEach((parentHash) => {
                if (commits[parentHash]) {
                    commits[parentHash].children.push(commitObj);
                }
            });
        });

        let root = Object.values(commits).find((c) => c.parents.length === 0);
        return root;
    }

    assignCoordinates(root, xSpacing, ySpacing) {
        const levels = {};
        const queue = [{ node: root, depth: 0 }];

        while (queue.length > 0) {
            const { node, depth } = queue.shift();
            if (!levels[depth]) levels[depth] = [];
            levels[depth].push(node);

            node.children.forEach((child) => {
                queue.push({ node: child, depth: depth + 1 });
            });
        }

        Object.keys(levels).forEach((levelStr) => {
            const level = parseInt(levelStr, 10);
            const nodesInLevel = levels[level];
            const y = level * ySpacing;

            nodesInLevel.forEach((node, index) => {
                node.x = index * xSpacing;
                node.y = y;
            });
        });

        return root;
    }

    clear() {
        if (this.g) {
            this.g.selectAll("*").remove();
        }
    }

    drawTree(rootOld, rootNew) {
        const linksOld = [];
        const linksNew = [];

        const collectLinks = (node, links) => {
            node.children.forEach((child) => {
                links.push({ source: node, target: child });
                collectLinks(child, links);
            });
        };

        collectLinks(rootOld, linksOld);
        collectLinks(rootNew, linksNew);

        const nodesOld = [];
        const nodesNew = [];

        const flatten = (node, arr) => {
            arr.push(node);
            node.children.forEach((child) => flatten(child, arr));
        };

        flatten(rootOld, nodesOld);
        flatten(rootNew, nodesNew);

        const oldMap = {};
        const newMap = {};

        nodesOld.forEach((node) => (oldMap[node.id] = node));
        nodesNew.forEach((node) => (newMap[node.id] = node));

        const linksData = linksNew.map((link) => ({
            source: newMap[link.source.id],
            target: newMap[link.target.id],
            sourceOld: oldMap[link.source.id] || link.source,
            targetOld: oldMap[link.target.id] || link.target,
        }));

        this.drawLinks(linksData);

        const nodesData = nodesNew.map((node) => {
            if (oldMap[node.id]) {
                return {
                    ...node,
                    oldX: oldMap[node.id].x,
                    oldY: oldMap[node.id].y,
                };
            } else if (node.parents.length > 0 && newMap[node.parents[0]]) {
                return {
                    ...node,
                    oldX: newMap[node.parents[0]].x,
                    oldY: newMap[node.parents[0]].y,
                };
            } else {
                return {
                    ...node,
                    oldX: rootOld.x,
                    oldY: rootOld.y,
                };
            }
        });

        this.drawNodes(nodesData);

        const collectBranchHeads = (root) => {
            const branchHeads = [];

            function traverse(node) {
                if (node.branches && node.branches.length > 0) {
                    node.branches.forEach((branchName, i) => {
                        branchHeads.push({
                            branchName,
                            commitId: node.id,
                            x: node.x,
                            y: node.y,
                            index: i,
                            total: node.branches.length
                        });
                    });
                }
                node.children.forEach(child => traverse(child));
            }

            traverse(root);
            return branchHeads;
        }

        const branchHeadsOld = collectBranchHeads(rootOld);
        const branchHeadsNew = collectBranchHeads(rootNew);

        this.drawBranchHeads(branchHeadsOld, branchHeadsNew);
    }

    drawLinks(linksData) {
        if (!this.g) return;

        const linkSelection = this.g.selectAll(".link")
            .data(linksData, (d) => `${d.source.id}-${d.target.id}`);

        const calcPath = (source, target) => {
            const controlPoint1X = source.x;
            const controlPoint1Y = (source.y + target.y) / 2;
            const controlPoint2X = target.x;
            const controlPoint2Y = (source.y + target.y) / 2;

            return `M${source.x},${source.y} C${controlPoint1X},${controlPoint1Y} ${controlPoint2X},${controlPoint2Y} ${target.x},${target.y}`;
        };

        linkSelection
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", (d) => calcPath(d.sourceOld, d.targetOld))
            .transition()
            .duration(1000)
            .attr("d", (d) => calcPath(d.source, d.target))
            .attr("marker-end", "url(#arrow)");

        linkSelection
            .transition()
            .duration(1000)
            .attr("d", (d) => calcPath(d.source, d.target));

        linkSelection.exit().remove();
    }

    drawNodes(nodesData) {
        if (!this.g) return;

        const nodeSelection = this.g.selectAll(".node")
            .data(nodesData, (d) => d.id);

        const nodeEnter = nodeSelection.enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", (d) => `translate(${d.oldX}, ${d.oldY})`);

        nodeEnter.append("circle")
            .attr("r", this.NODE_RADIUS);

        nodeEnter.append("text")
            .attr("dy", 5)
            .text((d) => d.id);

        nodeEnter.append("text")
            .attr("class", "author")
            .attr("dy", -10)
            .text((d) => d.author);

        nodeEnter.append("text")
            .attr("class", "time")
            .attr("dy", 15)
            .text((d) => d.time);

        nodeEnter.merge(nodeSelection)
            .transition()
            .duration(1000)
            .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

        nodeSelection.exit().remove();
    }

    drawBranchHeads(branchHeadsOld, branchHeadsNew) {
        const oldMap = {};
        branchHeadsOld.forEach(d => {
            oldMap[d.branchName] = d;
        });

        const newData = branchHeadsNew.map(d => {
            const oldItem = oldMap[d.branchName];
            if (oldItem) {
                const moved = (oldItem.x !== d.x || oldItem.y !== d.y);
                return {
                    ...d,
                    oldX: oldItem.x,
                    oldY: oldItem.y,
                    moved
                };
            } else {
                return {
                    ...d,
                    oldX: d.x,
                    oldY: d.y,
                    moved: false
                };
            }
        });

        const selection = this.g.selectAll(".branch-head")
            .data(newData, d => d.branchName);

        selection.exit()
            .transition()
            .duration(1000)
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .remove();

        const enter = selection.enter()
            .append("g")
            .attr("class", "branch-head")
            .attr("transform", d => {
                if (d.moved) {
                    return `translate(${d.oldX}, ${d.oldY})`;
                } else {
                    return `translate(${d.x}, ${d.y})`;
                }
            });

        enter.each((d, i, groups) => {
            const nodeGroup = d3.select(groups[i]);
            const spacing = 25;
            const arrow_height = 15;
            const arrow_width = 30;

            const arrowInitY = parseInt((d.total - 1) / 2) * spacing;
            const arrowOffsetY = arrowInitY - d.index * spacing;

            nodeGroup.append("line")
                .attr("class", "branch-arrow")
                .attr("x1", this.NODE_RADIUS + arrow_width + 10)
                .attr("y1", arrowOffsetY - arrow_height)
                .attr("x2", this.NODE_RADIUS + 10)
                .attr("y2", arrowOffsetY);

            nodeGroup.append("text")
                .attr("class", "branch-label")
                .attr("x", this.NODE_RADIUS + arrow_width + 15)
                .attr("y", arrowOffsetY - arrow_height - 5)
                .text(d.branchName);

            console.log(d.branchName, arrowOffsetY - arrow_height - 5)
        });

        enter.merge(selection)
            .transition()
            .duration(d => d.moved ? 1000 : 0)
            .attr("transform", d => {
                return `translate(${d.x}, ${d.y})`;
            });
    }

    render() {
        if (!this.svg || !this.g) return;

        let root1, root2;
        if (this.commits.length === 1) {
            root1 = root2 = this.parseGitLogToD3Tree(this.commits[0]);
        } else {
            root1 = this.parseGitLogToD3Tree(this.commits[this.commits.length - 2]);
            root2 = this.parseGitLogToD3Tree(this.commits[this.commits.length - 1]);
        }

        const xSpacing = 200;
        const ySpacing = 150;

        root1 = this.assignCoordinates(root1, xSpacing, ySpacing);
        root2 = this.assignCoordinates(root2, xSpacing, ySpacing);

        console.log(root1, root2);

        this.clear();
        this.drawTree(root1, root2);
    }
}