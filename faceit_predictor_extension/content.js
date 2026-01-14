let currentMatchId = null;
let isWindowVisible = false;

function createInterface() {
    if (document.getElementById('faceit-predictor-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'faceit-predictor-fab';
    fab.innerHTML = `<span style="font-size: 24px;">📈</span>`;
    fab.onclick = toggleWindow;
    document.body.appendChild(fab);

    const windowEl = document.createElement('div');
    windowEl.id = 'faceit-predict-window';
    windowEl.innerHTML = `
        <div class="window-header" id="fp-header">
            <span class="window-title">PREDICTOR</span>
            <span class="minimize-btn" id="fp-minimize">−</span>
        </div>
        <div class="window-content" id="fp-content">
        </div>
    `;
    document.body.appendChild(windowEl);

    document.getElementById('fp-minimize').onclick = toggleWindow;

    makeDraggable(document.getElementById('faceit-predict-window'), document.getElementById('fp-header'));

    checkCurrentPage();
}

function toggleWindow() {
    const win = document.getElementById('faceit-predict-window');
    isWindowVisible = !isWindowVisible;
    win.style.display = isWindowVisible ? 'block' : 'none';

    if (isWindowVisible) {
        checkCurrentPage();
    }
}

function makeDraggable(elmnt, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();

        const rect = elmnt.getBoundingClientRect();

        elmnt.style.left = rect.left + "px";
        elmnt.style.top = rect.top + "px";

        elmnt.style.transform = "none";

        pos3 = e.clientX;
        pos4 = e.clientY;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function checkCurrentPage() {
    const match = window.location.pathname.match(/room\/([a-z0-9-]+)/i);
    const contentBox = document.getElementById('fp-content');

    if (!contentBox) return;

    if (match && match[1]) {
        const newMatchId = match[1];

        if (newMatchId !== currentMatchId || contentBox.innerHTML.includes('Please go to')) {
            currentMatchId = newMatchId;
            renderLoading();
            fetchPredictions(newMatchId);
        }
    } else {
        currentMatchId = null;
        renderMessage("Please go to the match page<br>to see predictions.");
    }
}

function renderMessage(msg) {
    const contentBox = document.getElementById('fp-content');
    contentBox.innerHTML = `<div class="message-box">${msg}</div>`;
}

function renderLoading() {
    renderMessage("Fetching data...<br>Waiting for response");
}

async function fetchPredictions(matchId) {
    try {
        const response = await fetch(`https://fc.blalex.ru/predict/${matchId}`);
        const data = await response.json();
        renderPanel(data);
        pollTeamNames();
    } catch (error) {
        console.error("Predictor Error:", error);
        renderMessage("Error loading data.<br>API might be down.");
    }
}

function renderPanel(data) {
    const contentBox = document.getElementById('fp-content');

    let rowsHtml = '';
    for (const [map, prob] of Object.entries(data.predictions)) {
        if (typeof prob === 'string' && prob.startsWith('Error')) continue;

        const probT2 = parseFloat(prob).toFixed(1);
        const probT1 = (100 - parseFloat(prob)).toFixed(1);
        const isActual = map.toLowerCase() === data.actual_map?.toLowerCase();

        rowsHtml += `
            <div class="map-row ${isActual ? 'is-actual' : ''}">
                <div class="row-main">
                    <span class="pct t1 ${probT1 >= 50 ? 'win' : 'loss'}">${probT1}%</span>
                    <span class="map-name">${map.toUpperCase()}</span>
                    <span class="pct t2 ${probT2 >= 50 ? 'win' : 'loss'}">${probT2}%</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${probT1}%;"></div>
                </div>
            </div>
        `;
    }

    contentBox.innerHTML = `
        <div class="header-teams">
            <span class="team-n team-t1-name">LOADING...</span>
            <span class="team-n team-t2-name">LOADING...</span>
        </div>
        <div class="panel-body">${rowsHtml}</div>
        <div class="panel-footer">
            <div class="status">● API ACTIVE</div>
            <div>${new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
        </div>
    `;
}

function findTeamNames() {
    const selectors = [
        '[class*="FactionName"]',
        '.FactionsDetails__FactionName-sc-b7b973f7-5',
        'h6[class*="FactionName"]'
    ];
    for (let selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length >= 2) {
            return {t1: elements[0].innerText.trim(), t2: elements[1].innerText.trim()};
        }
    }
    return null;
}

function pollTeamNames(attempts = 0) {
    const names = findTeamNames();
    if (names) {
        const t1Display = document.querySelector('#faceit-predict-window .team-t1-name');
        const t2Display = document.querySelector('#faceit-predict-window .team-t2-name');
        if (t1Display) t1Display.innerText = names.t1;
        if (t2Display) t2Display.innerText = names.t2;
    } else if (attempts < 20) {
        setTimeout(() => pollTeamNames(attempts + 1), 500);
    }
}

let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        checkCurrentPage();
    }
    if (isWindowVisible && currentMatchId) {
        const t1 = document.querySelector('#faceit-predict-window .team-t1-name');
        if (t1 && t1.innerText === 'LOADING...') pollTeamNames();
    }
}).observe(document, {subtree: true, childList: true});

createInterface();