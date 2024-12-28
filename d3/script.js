// 模擬的 Git log 資料
// const gitLog = `
// c10ff55 (wei) (23 minutes ago) (Merge branch 'branch-a')  (HEAD -> main, new_branch) [55a2428 b83fe92]
// b83fe92 (wei) (25 minutes ago) (Merge branch 'branch-a-1' into branch-a)  (branch-a) [97e5ab2 9091626]
// 97e5ab2 (wei) (26 minutes ago) (feat: add txta)  [de5383e]
// 9091626 (wei) (27 minutes ago) (feat: add txta-1)  (branch-a-1) [de5383e]
// 55a2428 (wei) (43 minutes ago) (Merge branch 'branch-b')  [25998ce 397f1ce]
// 25998ce (wei) (45 minutes ago) (update: txt2:)  [e8499cf]
// e8499cf (wei) (2 hours ago) (feat: delete txt)  [e43037a]
// 397f1ce (wei) (2 hours ago) (feat: completed a new feature)  (branch-b) [517ae00]
// e43037a (wei) (2 hours ago) (feat: add txt3)  [2c29e88]
// 517ae00 (wei) (2 hours ago) (feat: do some change)  [2c29e88]
// de5383e (wei) (2 hours ago) (feat: add some texts)  [2c29e88]
// 2c29e88 (wei) (2 hours ago) (feat: add txt2)  [9cf44f3]
// 9cf44f3 (wei) (2 hours ago) (feat: complete feature a)  (branch-1) [0f1d08b]
// 0f1d08b (wei) (2 hours ago) (init commit)  []
// `;

const gitLog = `
1489311 (jimmyhealer) (7 seconds ago) (Add feature file)  (feature) [6e5656a]
6e5656a (jimmyhealer) (7 seconds ago) (Initial commit)  (HEAD -> main) []
`
const newGitLog = `
1489311 (jimmyhealer) (18 seconds ago) (Add feature file)  (HEAD -> main, feature) [6e5656a]
6e5656a (jimmyhealer) (18 seconds ago) (Initial commit)  []
`

/**
 * 解析 Git 日誌並轉換為 D3 樹結構
 * @param {string} gitLog - Git 日誌的字串輸入
 * @returns {object} - 樹狀結構的根節點
 */
function parseGitLogToD3Tree(gitLog) {
    const lines = gitLog.trim().split("\n");  // 將 Git 日誌按行分割
    const commits = {}; // 儲存所有節點
    const links = []; // 儲存所有連線
    const nodes = []; // 儲存節點清單
    let root = null; // 根節點

    const regex = /^([a-f0-9]{7}) \(([^)]+)\) \(([^)]+)\) \(([^)]+)\) (?: \(([^)]+)\))? \[([^\]]*)\]$/;

    // 初始化每個節點
    lines.forEach(line => {
        const match = line.match(regex);
        if (!match) {
            console.error(`Unmatched line: ${line}`); // 打印未匹配的行
            return;
        }

        const hash = match[1];
        const author = match[2];
        const time = match[3];
        const message = match[4];
        const branchesRaw = match[5] ? match[5].split(",").map(b => b.trim()) : [];

        const parents = match[6] ? match[6].split(" ").map(p => p.trim()).filter(Boolean) : [];

        const branches = [];
        branchesRaw.forEach(branch => {
            if (branch.includes("->")) {
                // 將 "HEAD -> main" 拆分為 ["HEAD", "main"]
                const splitBranches = branch.split("->").map(b => b.trim());
                branches.push(...splitBranches);
            } else {
                branches.push(branch); // 保留單一分支
            }
        });

        // 初始化節點
        commits[hash] = {
            id: hash,
            message: message,
            author: author,
            time: time,
            branches: branches,
            parents: parents,
            children: [] // 初始化子節點為空
        };

        nodes.push(commits[hash]);
    });

    // 構建父子關係
    Object.entries(commits).forEach(([hash, commit]) => {
        commit.parents.forEach(parentHash => {
            if (commits[parentHash]) {
                // 將當前節點添加到父節點的 children 列表中
                commits[parentHash].children.push(commit);

                // 添加連線到 links
                links.push({
                    source: parentHash,
                    target: hash
                });
            }
        });
    });

    // 找到根節點，即沒有父節點的提交
    Object.values(commits).forEach(commit => {
        if (commit.parents.length === 0) {
            root = commit; // 沒有父節點的是根節點
        }
    });

    return root
}

/**
 * 分配樹狀結構中每個節點的座標
 * @param {object} root - 樹的根節點
 * @param {number} xSpacing - 水平間距
 * @param {number} ySpacing - 垂直間距
 * @returns {object} - 更新後的樹結構根節點
 */
function assignCoordinates(root, xSpacing, ySpacing) {
    const levels = {}; // 存儲每層的節點，用於水平排列
    const queue = [{ node: root, depth: 0 }]; // 廣度優先搜尋的隊列

    // 廣度優先搜尋 (BFS)，計算每個節點的層級
    while (queue.length > 0) {
        const { node, depth } = queue.shift();

        // 初始化該層級
        if (!levels[depth]) {
            levels[depth] = [];
        }
        levels[depth].push(node);

        // 處理子節點
        node.children.forEach(child => {
            queue.push({ node: child, depth: depth + 1 });
        });
    }

    // 計算節點的座標
    Object.keys(levels).forEach(level => {
        const nodesInLevel = levels[level];
        const y = level * ySpacing; // 每層的垂直間距

        nodesInLevel.forEach((node, index) => {
            node.x = index * xSpacing; // 水平間距
            node.y = y; // 垂直位置
        });
    });

    return root; // 返回更新後的樹結構
}


// 設定 SVG 畫布大小
const svg = d3.select("svg")

// 定義 Zoom 行為
const zoom = d3.zoom()
    .scaleExtent([0.5, 2]) // 設定縮放範圍
    .on("zoom", (event) => g.attr("transform", event.transform)); // 更新視圖

// 啟用 Zoom 行為
svg.call(zoom);

// 在 SVG 中添加一個 <g> 元素，用於包含所有繪製的圖形元素
const g = svg.append("g");

// 獲取 SVG 的寬度和高度屬性值
const svgElement = document.querySelector("svg");
const { width, height } = svgElement.getBoundingClientRect();
const scale = 1.5;  // 設定初始縮放比例

// 設定初始偏移
const initialTransform = d3.zoomIdentity
    .translate(width / 2, height / 4)   // 移動視圖中心到 SVG 的中心
    .scale(scale)                       // 應用縮放
// .translate(-width / 2, -height / 2); // 將內容移回原點

svg.call(zoom.transform, initialTransform); // 應用初始變換

// 設定節點的座標範圍
const xSpacing = 200; // 增加水平間距
const ySpacing = 150; // 增加垂直間距

// 解析 Git 日誌並轉換為樹結構
const root1 = parseGitLogToD3Tree(gitLog);
const root2 = parseGitLogToD3Tree(newGitLog);

// 分配座標給每個節點
assignCoordinates(root1, xSpacing, ySpacing);
assignCoordinates(root2, xSpacing, ySpacing);

// 定義箭頭
svg.append("defs")
    .append("marker")
    .attr("id", "arrow") // 標記 ID，用於在連線中引用
    .attr("viewBox", "0 -5 10 10") // 定義視窗大小
    .attr("refX", 6) // 定義箭頭起點的 X 座標偏移
    .attr("refY", 0) // 定義箭頭起點的 Y 座標偏移
    .attr("markerWidth", 6) // 箭頭寬度
    .attr("markerHeight", 6) // 箭頭高度
    .attr("orient", "auto") // 自動調整箭頭方向
    .append("path")
    .attr("d", "M0,-5L10,0L0,5") // 定義箭頭的形狀
    .attr("fill", "#f00"); // 設定箭頭的顏色為紅色

// 定義節點圓的半徑
NODE_RADIUS = 40

/**
 * 繪製連線（父子關係）
 * @param {Array} linksData - 連線數據
 */
function drawLinks(linksData) {
    function calculateLinkPath(source, target) {
        // 控制點1和控制點2，用於創建貝茲曲線
        const controlPoint1X = source.x;
        const controlPoint1Y = (source.y + target.y) / 2;
        const controlPoint2X = target.x;
        const controlPoint2Y = (source.y + target.y) / 2;

        // 返回貝茲曲線的路徑
        return `M${source.x},${source.y} C${controlPoint1X},${controlPoint1Y} ${controlPoint2X},${controlPoint2Y} ${target.x},${target.y}`;
    }

    // 綁定連線數據到 SVG 元素
    const link = g.selectAll(".link")
        .data(linksData, d => `${d.source.id}-${d.target.id}`);

    // 新增的連線
    link.enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => calculateLinkPath(d.sourceOld, d.targetOld)) // 初始路徑（舊位置）
        .transition()
        .duration(1000) // 設定過渡時間為 1 秒
        .attr("d", d => calculateLinkPath(d.source, d.target)); // 過渡到新路徑

    // 更新現有連線
    link.transition()
        .duration(1000)
        .attr("d", d => calculateLinkPath(d.source, d.target));

    // 刪除不存在的連線
    link.exit().remove();
}

/**
 * 繪製節點
 * @param {Array} nodesData - 節點數據
 */
function drawNodes(nodesData) {
    // 綁定節點數據到 SVG 元素
    const nodeSelection = g.selectAll(".node")
        .data(nodesData, d => d.id);

    // 新增的節點
    const nodeEnter = nodeSelection.enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.oldX},${d.oldY})`); // 初始位置（舊位置）

    // 在節點組中添加圓形
    nodeEnter.append("circle")
        .attr("r", NODE_RADIUS)

    nodeEnter.append("text")
        .attr("dy", 5)
        .text(d => d.id)

    nodeEnter.append("text")
        .attr("class", "author")
        .attr("dy", -10) // 放置於節點圓上方
        .text(d => d.author) // 顯示作者

    nodeEnter.append("text")
        .attr("class", "time")
        .attr("dy", 15) // 放置於節點圓下方
        .text(d => d.time) // 顯示提交時間

    // 合併新舊節點並進行過渡
    nodeEnter.merge(nodeSelection)
        .transition()
        .duration(1000)
        .attr("transform", d => `translate(${d.x},${d.y})`);

    // 刪除不存在的節點
    nodeSelection.exit().remove();
}

function collectBranchHeads(root) {
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

function drawBranchHeads(branchHeadsOld, branchHeadsNew) {
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

    const selection = g.selectAll(".branch-head")
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

    enter.each(function(d) {
        const nodeGroup = d3.select(this);
        const spacing = 25;
        const arrow_height = 15;
        const arrow_width = 30;

        const arrowInitY = parseInt((d.total - 1) / 2) * spacing;
        const arrowOffsetY = arrowInitY - d.index * spacing;

        nodeGroup.append("line")
            .attr("class", "branch-arrow")
            .attr("x1", NODE_RADIUS + arrow_width + 10)
            .attr("y1", arrowOffsetY - arrow_height)
            .attr("x2", NODE_RADIUS + 10)
            .attr("y2", arrowOffsetY);

        nodeGroup.append("text")
            .attr("class", "branch-label")
            .attr("x", NODE_RADIUS + arrow_width + 15)
            .attr("y", arrowOffsetY - arrow_height - 5)
            .text(d.branchName);
    });

    enter.merge(selection)
        .transition()
        .duration(d => d.moved ? 1000 : 0)
        .attr("transform", d => {
            return `translate(${d.x}, ${d.y}) scale(1)`;
        });
}

/**
 * 繪製樹狀結構，包括節點和連線
 * @param {object} rootOld - 舊的樹結構根節點
 * @param {object} rootNew - 新的樹結構根節點
 */
function drawTree(rootOld, rootNew) {
    // 收集連線
    const linksOld = [];
    const linksNew = [];

    /**
     * 收集所有連線（父子關係）
     * @param {object} node - 當前節點
     * @param {Array} links - 連線數據列表
     */
    function collectLinks(node, links) {
        node.children.forEach(child => {
            links.push({ source: node, target: child }); // 添加父子連線
            collectLinks(child, links); // 遞迴處理子節點
        });
    }

    // 收集舊的和新的連線
    collectLinks(rootOld, linksOld);
    collectLinks(rootNew, linksNew);

    const nodesOld = []; // 儲存舊的節點
    const nodesNew = []; // 儲存新的節點

    /**
         * 展平樹結構，將所有節點收集到一個列表中
         * @param {object} node - 當前節點
         * @param {Array} nodes - 節點列表
         */
    function flatten(node, nodes) {
        nodes.push(node);
        node.children.forEach(child => flatten(child, nodes));
    }

    // 展平舊的和新的樹結構
    flatten(rootOld, nodesOld);
    flatten(rootNew, nodesNew);

    // 構建節點映射
    const oldNodesMap = {};
    nodesOld.forEach(node => {
        oldNodesMap[node.id] = node;
    });

    const newNodesMap = {};
    nodesNew.forEach(node => {
        newNodesMap[node.id] = node;
    });

    // 更新連線數據，包含新舊位置
    const linksData = linksNew.map(link => ({
        source: newNodesMap[link.source.id],
        target: newNodesMap[link.target.id],
        sourceOld: oldNodesMap[link.source.id] || link.source,
        targetOld: oldNodesMap[link.target.id] || link.source
    }));

    // 繪製連線
    drawLinks(linksData)

    // 更新節點數據
    const nodesData = nodesNew.map(node => {
        if (oldNodesMap[node.id]) {
            // 存在於舊節點，保持原位置
            return {
                ...node,
                oldX: oldNodesMap[node.id].x,
                oldY: oldNodesMap[node.id].y
            };
        } else if (node.parents.length > 0 && newNodesMap[node.parents[0]]) {
            // 新增節點，從第一個父節點的位置開始
            return {
                ...node,
                oldX: newNodesMap[node.parents[0]].x,
                oldY: newNodesMap[node.parents[0]].y
            };
        } else {
            // 無父節點，從根節點的位置開始
            return {
                ...node,
                oldX: rootOld.x,
                oldY: rootOld.y
            };
        }
    });

    // 繪製節點
    drawNodes(nodesData)

    const branchHeadsOld = collectBranchHeads(rootOld);
    const branchHeadsNew = collectBranchHeads(rootNew);

    // -- 4. 繪製 branch heads (箭頭 & label) --
    drawBranchHeads(branchHeadsOld, branchHeadsNew);
}


drawTree(root1, root2);
