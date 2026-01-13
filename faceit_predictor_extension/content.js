let lastMatchId = null;

function findTeamNames() {
    const selectors = [
        '[class*="FactionName"]',
        '.FactionsDetails__FactionName-sc-b7b973f7-5',
        'h6[class*="FactionName"]'
    ];

    for (let selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length >= 2) {
            return {
                t1: elements[0].innerText.trim(),
                t2: elements[1].innerText.trim()
            };
        }
    }
    return null;
}

function pollTeamNames(attempts = 0) {
    const names = findTeamNames();
    if (names) {
        const t1Display = document.querySelector('#faceit-predict-panel .team-t1-name');
        const t2Display = document.querySelector('#faceit-predict-panel .team-t2-name');
        if (t1Display) t1Display.innerText = names.t1;
        if (t2Display) t2Display.innerText = names.t2;
        console.log(`[Predictor] Team names found on attempt ${attempts}`);
    } else if (attempts < 20) {
        setTimeout(() => pollTeamNames(attempts + 1), 500);
    }
}

function init() {
    const match = window.location.pathname.match(/room\/([a-z0-9-]+)/i);
    if (match && match[1]) {
        const currentId = match[1];
        if (currentId !== lastMatchId) {
            lastMatchId = currentId;
            fetchPredictions(currentId);
        }
    }
}

async function fetchPredictions(matchId) {
    const oldPanel = document.getElementById('faceit-predict-panel');
    if (oldPanel) oldPanel.remove();

    try {
        const response = await fetch(`https://fc.blalex.ru/predict/${matchId}`);
        const data = await response.json();
        renderPanel(data);
        pollTeamNames();
    } catch (error) {
        console.error("Predictor Error:", error);
    }
}

function renderPanel(data) {
    const panel = document.createElement('div');
    panel.id = 'faceit-predict-panel';

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

    panel.innerHTML = `
        <div class="panel-header">
            <div class="header-top">WIN PROBABILITY</div>
            <div class="header-teams">
                <span class="team-n team-t1-name">LOADING...</span>
                <span class="team-n team-t2-name">LOADING...</span>
            </div>
        </div>
        <div class="panel-body">${rowsHtml}</div>
        <div class="panel-footer">
            <div class="status">● API ACTIVE</div>
            <div>${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
    `;

    document.body.appendChild(panel);
}

const observer = new MutationObserver(() => init());
const body = document.querySelector('body');
if (body) observer.observe(body, { childList: true, subtree: true });
init();