// Initialize Icons
lucide.createIcons();

// ============================================================
// MOBILE SIDEBAR (Drawer Navigation)
// ============================================================
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        closeMobileSidebar();
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function initMobileUI() {
    const topbar = document.getElementById('mobile-topbar');
    const isMobile = window.innerWidth <= 768;
    if (topbar) topbar.style.display = isMobile ? 'flex' : 'none';
    if (!isMobile) closeMobileSidebar();
}

// Init on load + resize
initMobileUI();
window.addEventListener('resize', initMobileUI);

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed', err));
    });
}

// Auto-close sidebar when a nav item is clicked on mobile
document.querySelectorAll('.nav-btn[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeMobileSidebar();
    });
});


// NOTE: All onclick-called functions (openNewPlanModal, createNewPlan, closeNewPlanModal,
// openRiskModal, closeRiskModal, deletePlan, duplicatePlan, togglePlanActive, markReviewed,
// addCriteria, deleteCriteria, saveCriteriaCheck, saveCriteriaText, saveField,
// addChartingStep, saveChartingStep, deleteChartingStep, savePlanTitle, previewImage)
// are declared as regular functions and are automatically on the global scope.


// --- STATE MANAGEMENT ---
const APP_STATE_KEY = 'iris_state_v2';

const DEFAULT_PLANS = [
    {
        id: 'plan-1',
        name: 'Daily Bias',
        active: true,
        lastReviewed: '',
        riskControls: { maxTrades: 2, riskPct: 1, maxLoss: 1000, maxProfit: 5000 },
        criteria: [
            { id: 'c1', text: 'LQ Sweep', checked: false },
            { id: 'c2', text: 'Market Shift', checked: false }
        ],
        chartingSteps: [
            'Mark HTF range + premium/discount.',
            'Mark liquidity (PDH/PDL + equal highs/lows)',
            'Decide continuation vs pullback vs reversal',
            'Pick ONE target (opposing zone/structure).',
            'Define invalidation: "My bias is wrong if price breaks + holds beyond X,"'
        ],
        managementRules: 'Predefine risk before entry (fixed R, no resizing mid-trade)\nSet and Forget\nIf invalidation hits, you\'re done: exit and reassess, no "make it back"',
        exitCriteria: 'Conditions that must be met before exiting a trade.',
        tradingNotes: 'Bias is a plan + invalidation, not a prediction.\nIf you can\'t say your bias in one sentence, you don\'t have one.\nIf invalidation hits, reset. No coping, no revenge.\n"You don\'t build trust in your system with affirmations, you build it with data."\nConviction → confidence → competence → consistency.'
    },
    {
        id: 'plan-2',
        name: 'Weekly Range',
        active: false,
        lastReviewed: '',
        riskControls: { maxTrades: 3, riskPct: 0.5, maxLoss: 500, maxProfit: 2000 },
        criteria: [
            { id: 'w1', text: 'Mark Weekly High/Low', checked: false },
            { id: 'w2', text: 'Identify EQ (Midpoint)', checked: false }
        ],
        chartingSteps: [
            'Mark weekly high and low on H4.',
            'Find the weekly EQ midpoint.',
            'Identify key weekly POIs.',
            'Set bias based on previous week close.',
            'Plan entry near discount or premium zone.'
        ],
        managementRules: 'Take partials at EQ.\nMove SL to BE after 1R.\nNo adding to losers.',
        exitCriteria: 'Hit weekly target at opposing structure.',
        tradingNotes: 'Aiming to capture the range of the weekly candle.\nSimple is better — avoid overcomplicating.'
    }
];

let state = {
    trades: [],
    plans: null,
    activePlanId: 'plan-1'
};

let activePlanId = 'plan-1';

function loadState() {
    const saved = localStorage.getItem(APP_STATE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.trades = parsed.trades || [];
            state.plans = parsed.plans || JSON.parse(JSON.stringify(DEFAULT_PLANS));
            state.activePlanId = parsed.activePlanId || 'plan-1';
        } catch(e) {
            state.trades = [];
            state.plans = JSON.parse(JSON.stringify(DEFAULT_PLANS));
            state.activePlanId = 'plan-1';
        }
    } else {
        state.plans = JSON.parse(JSON.stringify(DEFAULT_PLANS));
    }
    activePlanId = state.activePlanId;
}

function saveState() {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}

function getActivePlan() {
    return state.plans.find(p => p.id === activePlanId) || state.plans[0];
}

// --- DOM ELEMENTS ---
const navBtns = document.querySelectorAll('.nav-btn[data-target]');
const views = document.querySelectorAll('.view-section');
const dashPnl = document.getElementById('dash-pnl');
const dashWinRate = document.getElementById('dash-winrate');
const dashPf = document.getElementById('dash-pf');
const dashDiscipline = document.getElementById('dash-discipline');
const dashBreaksCount = document.getElementById('dash-breaks-count');
const rulesEmpty = document.getElementById('rules-empty');
const rulesList = document.getElementById('dash-rules-list');
const journalTbody = document.getElementById('journal-tbody');
const journalEmpty = document.getElementById('journal-empty');
const tradeModal = document.getElementById('trade-modal');
const addTradeBtn = document.getElementById('add-trade-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const tradeForm = document.getElementById('trade-form');
const emotionSelector = document.getElementById('emotion-selector');
const resetDataBtn = document.getElementById('reset-data-btn');
let equityChartInstance = null;

// --- NAVIGATION ---
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        views.forEach(v => {
            if (v.id === targetId) v.classList.remove('hidden');
            else v.classList.add('hidden');
        });
        if (targetId === 'view-dashboard') renderChart();
        if (targetId === 'view-edge') renderEdge();
    });
});

// ============================================================
// EDGE PLAYBOOK — FULLY DYNAMIC
// ============================================================

function renderEdge() {
    renderPlanSidebar();
    renderPlanEditor();
    lucide.createIcons();
}

function renderPlanSidebar() {
    const list = document.getElementById('plan-list');
    if (!list) return;
    list.innerHTML = '';
    state.plans.forEach(plan => {
        const isSelected = plan.id === activePlanId;
        const btn = document.createElement('button');
        btn.className = 'plan-sidebar-btn' + (isSelected ? ' selected' : '');
        btn.dataset.planId = plan.id;
        btn.innerHTML = `
            <div class="flex-align" style="gap:0.5rem; flex:1; min-width:0;">
                <span class="status-dot" style="background:${plan.active ? 'var(--success)' : 'var(--text-muted)'}; width:7px; height:7px; border-radius:50%; flex-shrink:0;"></span>
                <span class="plan-name-text" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.875rem; font-weight:${isSelected ? '600' : '400'};">${plan.name}</span>
            </div>
            ${plan.active ? '<span class="plan-active-badge">Active</span>' : ''}
        `;
        btn.addEventListener('click', () => {
            activePlanId = plan.id;
            state.activePlanId = plan.id;
            saveState();
            renderEdge();
        });
        list.appendChild(btn);
    });
}

function renderPlanEditor() {
    const editor = document.getElementById('edge-editor');
    if (!editor) return;
    const plan = getActivePlan();
    if (!plan) {
        editor.innerHTML = '<p class="text-muted text-sm" style="padding:2rem;">No plan selected. Click "+ New Plan" to create one.</p>';
        return;
    }

    const complianceRate = calcCompliance(plan);
    const planTrades = state.trades.length;
    const wins = state.trades.filter(t => t.pnl > 0).length;
    const winRate = planTrades > 0 ? ((wins / planTrades) * 100).toFixed(1) : '0.00';
    const totalPnl = state.trades.reduce((s, t) => s + t.pnl, 0);

    editor.innerHTML = `
        <!-- Header -->
        <div class="edge-header flex-between mb-4">
            <div class="flex-align" style="gap:0.75rem;">
                <span style="width:8px;height:8px;border-radius:50%;background:${plan.active ? 'var(--success)' : 'var(--text-muted)'};display:inline-block;"></span>
                <h2 class="text-xl" id="plan-title" contenteditable="true" spellcheck="false"
                    style="outline:none; border-bottom:2px solid transparent; padding:2px 4px; border-radius:4px; cursor:text; min-width:60px;"
                    onblur="savePlanTitle(this.innerText.trim())"
                    onfocus="this.style.borderBottom='2px solid var(--brand-blue)'"
                    onblur2="this.style.borderBottom='2px solid transparent'">${plan.name}</h2>
            </div>
            <div class="flex-align" style="gap:0.5rem;">
                <button class="btn-icon border" title="Delete Plan" onclick="deletePlan('${plan.id}')">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                </button>
                <button class="btn-icon border" title="Duplicate Plan" onclick="duplicatePlan('${plan.id}')">
                    <i data-lucide="copy" style="width:14px;height:14px;"></i>
                </button>
            </div>
        </div>

        <!-- Active Toggle -->
        <div style="background:#ECFCCB; border-radius:0.5rem; padding:0.875rem 1rem; margin-bottom:1.5rem; display:flex; align-items:center; gap:0.75rem;">
            <label class="toggle-switch">
                <input type="checkbox" id="edge-active-toggle" ${plan.active ? 'checked' : ''} onchange="togglePlanActive(this.checked)">
                <span class="slider round"></span>
            </label>
            <span style="font-weight:500; font-size:0.875rem;">${plan.active ? 'Active' : 'Inactive'}</span>
            <i data-lucide="info" style="width:14px;height:14px;color:var(--text-muted);"></i>
        </div>

        <!-- Two Column Grid -->
        <div class="edge-grid">
            <!-- LEFT COLUMN -->
            <div class="edge-left pr-8">

                <!-- Charting Process -->
                <div class="edge-section mb-6">
                    <div class="flex-between mb-3">
                        <label class="section-label"><i data-lucide="bar-chart-2" style="width:14px;height:14px;margin-right:6px;"></i> Charting Process</label>
                        <button class="add-row-btn" onclick="addChartingStep()"><i data-lucide="plus" style="width:12px;height:12px;"></i> Add Step</button>
                    </div>
                    <ol class="numbered-list text-sm text-primary" style="list-style:none; padding:0; display:flex; flex-direction:column; gap:0.5rem;" id="charting-steps">
                        ${plan.chartingSteps.map((step, i) => `
                            <li style="display:flex; align-items:flex-start; gap:0.5rem;">
                                <span class="num-bubble" style="flex-shrink:0;">${i+1}</span>
                                <span contenteditable="true" spellcheck="false" class="editable-text" style="flex:1; outline:none; cursor:text; padding:2px 4px; border-radius:4px;" onblur="saveChartingStep(${i}, this.innerText.trim())">${step}</span>
                                <button class="delete-row-btn" onclick="deleteChartingStep(${i})" title="Delete step"><i data-lucide="x" style="width:12px;height:12px;"></i></button>
                            </li>`).join('')}
                    </ol>
                </div>

                <!-- Entry Criteria -->
                <div class="edge-section mb-6">
                    <div class="flex-between mb-3">
                        <label class="section-label"><i data-lucide="check-circle-2" style="width:14px;height:14px;margin-right:6px;"></i> Entry Criteria</label>
                        <button class="add-row-btn" onclick="addCriteria()"><i data-lucide="plus" style="width:12px;height:12px;"></i> Add</button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.5rem;" id="criteria-list">
                        ${plan.criteria.map(c => `
                            <div style="display:flex; align-items:center; gap:0.5rem;" data-criteria-id="${c.id}">
                                <input type="checkbox" ${c.checked ? 'checked' : ''} onchange="saveCriteriaCheck('${c.id}', this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:var(--brand-blue);">
                                <span contenteditable="true" spellcheck="false" class="editable-text criteria-name" style="flex:1; font-weight:500; font-size:0.875rem; cursor:text; outline:none; padding:2px 4px; border-radius:4px; ${c.checked ? 'text-decoration:line-through;color:var(--text-muted);' : ''}"
                                    onblur="saveCriteriaText('${c.id}', this.innerText.trim())">${c.text}</span>
                                <button class="delete-row-btn" onclick="deleteCriteria('${c.id}')" title="Remove"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
                            </div>`).join('')}
                    </div>
                </div>

                <!-- Entry Models -->
                <div class="edge-section mb-6">
                    <label class="section-label mb-3" style="display:block;"><i data-lucide="image" style="width:14px;height:14px;margin-right:6px;"></i> Entry Models</label>
                    <div style="display:flex; gap:1rem;">
                        <div style="flex:1;">
                            <p style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">Setup screenshot</p>
                            <label style="display:flex; align-items:center; justify-content:center; height:7rem; background:#F9FAFB; border:1.5px dashed var(--border-color); border-radius:0.5rem; cursor:pointer; color:var(--text-muted);" title="Click to upload">
                                <input type="file" accept="image/*" style="display:none;" onchange="previewImage(this, 'img-setup')">
                                <img id="img-setup" src="" alt="" style="display:none; width:100%; height:100%; object-fit:cover; border-radius:0.5rem;">
                                <i data-lucide="image" id="img-setup-icon" style="width:24px;height:24px;opacity:0.4;"></i>
                            </label>
                        </div>
                        <div style="flex:1;">
                            <p style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">Entry examples</p>
                            <label style="display:flex; align-items:center; justify-content:center; height:7rem; background:#F9FAFB; border:1.5px dashed var(--border-color); border-radius:0.5rem; cursor:pointer; color:var(--text-muted);" title="Click to upload">
                                <input type="file" accept="image/*" style="display:none;" onchange="previewImage(this, 'img-entry')">
                                <img id="img-entry" src="" alt="" style="display:none; width:100%; height:100%; object-fit:cover; border-radius:0.5rem;">
                                <i data-lucide="image" id="img-entry-icon" style="width:24px;height:24px;opacity:0.4;"></i>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Trade Management Rules -->
                <div class="edge-section mb-6">
                    <label class="section-label mb-3" style="display:block;"><i data-lucide="list" style="width:14px;height:14px;margin-right:6px;"></i> Trade Management Rules</label>
                    <div contenteditable="true" spellcheck="false" class="editable-area"
                        style="font-size:0.875rem; color:var(--text-primary); line-height:1.75; outline:none; padding:0.75rem; border:1.5px solid transparent; border-radius:0.5rem; min-height:60px; white-space:pre-wrap; cursor:text;"
                        onfocus="this.style.borderColor='var(--brand-blue)'; this.style.background='#F8FAFF';"
                        onblur="this.style.borderColor='transparent'; this.style.background=''; saveField('managementRules', this.innerText.trim())"
                    >${plan.managementRules}</div>
                </div>

                <!-- Exit Criteria -->
                <div class="edge-section mb-6">
                    <label class="section-label mb-3" style="display:block;"><i data-lucide="external-link" style="width:14px;height:14px;margin-right:6px;"></i> Exit Criteria</label>
                    <div contenteditable="true" spellcheck="false" class="editable-area"
                        style="font-size:0.875rem; color:var(--text-secondary); line-height:1.75; outline:none; padding:0.75rem 0.75rem 0.75rem 1rem; border-left:3px solid var(--border-color); border-right:1.5px solid transparent; border-top:1.5px solid transparent; border-bottom:1.5px solid transparent; border-radius:0.5rem; min-height:50px; white-space:pre-wrap; cursor:text;"
                        onfocus="this.style.borderColor='var(--brand-blue)'; this.style.background='#F8FAFF';"
                        onblur="this.style.borderColor='transparent'; this.style.borderLeftColor='var(--border-color)'; this.style.background=''; saveField('exitCriteria', this.innerText.trim())"
                    >${plan.exitCriteria}</div>
                </div>

                <!-- Trading Notes -->
                <div class="edge-section mb-6">
                    <label class="section-label mb-3" style="display:block;"><i data-lucide="edit-3" style="width:14px;height:14px;margin-right:6px;"></i> Trading Notes</label>
                    <div contenteditable="true" spellcheck="false" class="editable-area"
                        style="font-size:0.875rem; color:var(--text-primary); line-height:1.75; outline:none; padding:0.75rem; border:1.5px solid transparent; border-radius:0.5rem; min-height:80px; white-space:pre-wrap; cursor:text;"
                        onfocus="this.style.borderColor='var(--brand-blue)'; this.style.background='#F8FAFF';"
                        onblur="this.style.borderColor='transparent'; this.style.background=''; saveField('tradingNotes', this.innerText.trim())"
                    >${plan.tradingNotes}</div>
                </div>

                <!-- Mark as Reviewed -->
                <div style="display:flex; align-items:center; gap:1rem; margin-top:2rem; padding-top:1rem; border-top:1px solid var(--border-color);">
                    <button class="btn btn-purple" onclick="markReviewed()">
                        <i data-lucide="check" style="width:14px;height:14px;"></i> Mark as reviewed
                    </button>
                    <span id="reviewed-timestamp" style="font-size:0.75rem; color:var(--text-muted);">${plan.lastReviewed || ''}</span>
                </div>
            </div>

            <!-- RIGHT COLUMN -->
            <div class="edge-right">
                <!-- Plan Stats -->
                <div style="background:#F9FAFB; border:1px solid var(--border-color); border-radius:0.75rem; padding:1.25rem; margin-bottom:1rem;">
                    <h4 style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); font-weight:600; margin-bottom:1rem;">Plan Stats</h4>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                        <div><p style="font-size:1.125rem; font-weight:700;">${planTrades}</p><p style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Trades Taken</p></div>
                        <div><p style="font-size:1.125rem; font-weight:700;">${winRate}%</p><p style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Win Rate</p></div>
                        <div><p style="font-size:1.125rem; font-weight:700;">${totalPnl >= 0 ? '+' : ''}$${Math.abs(totalPnl).toFixed(2)}</p><p style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Net PnL</p></div>
                        <div><p style="font-size:1.125rem; font-weight:700;">${complianceRate}%</p><p style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Compliance</p></div>
                    </div>
                </div>

                <!-- Risk Controls -->
                <div style="background:#FFF5F5; border:1px solid #FECACA; border-radius:0.75rem; padding:1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h4 style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); font-weight:600;">Risk Controls</h4>
                        <button onclick="openRiskModal()" style="background:none; border:none; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; justify-content:center; padding:4px; border-radius:4px;" title="Edit Risk Controls">
                            <i data-lucide="edit-2" style="width:14px;height:14px;"></i>
                        </button>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;" id="risk-values">
                        <div><p style="font-size:1.125rem; font-weight:700;">${plan.riskControls.maxTrades}</p><p style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Max trades/day</p></div>
                        <div><p style="font-size:1.125rem; font-weight:700;">$${plan.riskControls.maxLoss.toLocaleString()}</p><p style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Max daily loss</p></div>
                        <div><p style="font-size:1.125rem; font-weight:700;">$${plan.riskControls.maxProfit.toLocaleString()}</p><p style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Max daily profit</p></div>
                        <div><p style="font-size:1.125rem; font-weight:700;">${plan.riskControls.riskPct}%</p><p style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Risk per trade</p></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

// --- PLAN TITLE ---
function savePlanTitle(newName) {
    if (!newName) return;
    const plan = getActivePlan();
    plan.name = newName;
    saveState();
    renderPlanSidebar();
}

// --- ACTIVE TOGGLE ---
function togglePlanActive(checked) {
    const plan = getActivePlan();
    plan.active = checked;
    saveState();
    renderEdge();
}

// --- MARK REVIEWED ---
function markReviewed() {
    const plan = getActivePlan();
    const now = new Date();
    plan.lastReviewed = `Reviewed today at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    saveState();
    const ts = document.getElementById('reviewed-timestamp');
    if (ts) ts.textContent = plan.lastReviewed;
}

// --- CHARTING STEPS ---
function addChartingStep() {
    const text = prompt('Enter new charting step:');
    if (!text || !text.trim()) return;
    const plan = getActivePlan();
    plan.chartingSteps.push(text.trim());
    saveState();
    renderEdge();
}
function saveChartingStep(index, text) {
    const plan = getActivePlan();
    if (plan.chartingSteps[index] !== undefined) {
        plan.chartingSteps[index] = text;
        saveState();
    }
}
function deleteChartingStep(index) {
    const plan = getActivePlan();
    plan.chartingSteps.splice(index, 1);
    saveState();
    renderEdge();
}

// --- CRITERIA ---
function addCriteria() {
    const text = prompt('Enter new entry criteria:');
    if (!text || !text.trim()) return;
    const plan = getActivePlan();
    plan.criteria.push({ id: 'c' + Date.now(), text: text.trim(), checked: false });
    saveState();
    renderEdge();
}
function saveCriteriaText(id, text) {
    const plan = getActivePlan();
    const item = plan.criteria.find(c => c.id === id);
    if (item) { item.text = text; saveState(); }
}
function saveCriteriaCheck(id, checked) {
    const plan = getActivePlan();
    const item = plan.criteria.find(c => c.id === id);
    if (item) { item.checked = checked; saveState(); }
}
function deleteCriteria(id) {
    const plan = getActivePlan();
    plan.criteria = plan.criteria.filter(c => c.id !== id);
    saveState();
    renderEdge();
}

// --- FREE TEXT FIELDS ---
function saveField(field, value) {
    const plan = getActivePlan();
    plan[field] = value;
    saveState();
}

// --- IMAGE PREVIEW ---
function previewImage(input, imgId) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
        const img = document.getElementById(imgId);
        const icon = document.getElementById(imgId + '-icon');
        if (img) { img.src = e.target.result; img.style.display = 'block'; }
        if (icon) icon.style.display = 'none';
    };
    reader.readAsDataURL(input.files[0]);
}

// --- PLAN ACTIONS ---
function deletePlan(id) {
    if (state.plans.length <= 1) { alert('You must have at least one plan.'); return; }
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    state.plans = state.plans.filter(p => p.id !== id);
    activePlanId = state.plans[0].id;
    state.activePlanId = activePlanId;
    saveState();
    renderEdge();
}
function duplicatePlan(id) {
    const original = state.plans.find(p => p.id === id);
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = 'plan-' + Date.now();
    copy.name = original.name + ' (Copy)';
    copy.active = false;
    state.plans.push(copy);
    activePlanId = copy.id;
    state.activePlanId = copy.id;
    saveState();
    renderEdge();
}

// --- NEW PLAN MODAL ---
function openNewPlanModal() {
    const modal = document.getElementById('new-plan-modal');
    document.getElementById('new-plan-name').value = '';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('new-plan-name').focus(), 50);
}
function closeNewPlanModal() {
    const modal = document.getElementById('new-plan-modal');
    modal.classList.add('hidden');
    modal.style.display = '';
}
function createNewPlan() {
    const name = document.getElementById('new-plan-name').value.trim();
    const type = document.getElementById('new-plan-type').value;
    if (!name) { document.getElementById('new-plan-name').focus(); return; }
    const newPlan = {
        id: 'plan-' + Date.now(),
        name,
        active: false,
        lastReviewed: '',
        riskControls: { maxTrades: 2, riskPct: 1, maxLoss: 1000, maxProfit: 5000 },
        criteria: [],
        chartingSteps: ['Add your first charting step...'],
        managementRules: 'Define your trade management rules...',
        exitCriteria: 'Define your exit conditions...',
        tradingNotes: 'Add your notes and mindset reminders...'
    };
    state.plans.push(newPlan);
    activePlanId = newPlan.id;
    state.activePlanId = newPlan.id;
    saveState();
    closeNewPlanModal();
    renderEdge();
}
// Close modal on backdrop click
document.getElementById('new-plan-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('new-plan-modal')) closeNewPlanModal();
});
// Enter key to submit
document.getElementById('new-plan-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createNewPlan();
});


// --- RISK MODAL ---
function openRiskModal() {
    const plan = getActivePlan();
    const modal = document.getElementById('risk-modal');
    document.getElementById('rc-max-trades').value = plan.riskControls.maxTrades;
    document.getElementById('rc-risk-pct').value = plan.riskControls.riskPct;
    document.getElementById('rc-max-loss').value = plan.riskControls.maxLoss;
    document.getElementById('rc-max-profit').value = plan.riskControls.maxProfit;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}
function closeRiskModal() {
    const modal = document.getElementById('risk-modal');
    modal.classList.add('hidden');
    modal.style.display = '';
}
document.getElementById('close-risk-modal')?.addEventListener('click', closeRiskModal);
document.getElementById('cancel-risk-modal')?.addEventListener('click', closeRiskModal);
document.getElementById('save-risk-controls')?.addEventListener('click', () => {
    const plan = getActivePlan();
    plan.riskControls.maxTrades = parseInt(document.getElementById('rc-max-trades').value) || 2;
    plan.riskControls.riskPct = parseFloat(document.getElementById('rc-risk-pct').value) || 1;
    plan.riskControls.maxLoss = parseFloat(document.getElementById('rc-max-loss').value) || 1000;
    plan.riskControls.maxProfit = parseFloat(document.getElementById('rc-max-profit').value) || 5000;
    saveState();
    closeRiskModal();
    renderEdge();
});
document.getElementById('risk-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('risk-modal')) closeRiskModal();
});

// --- COMPLIANCE ---
function calcCompliance(plan) {
    const total = state.trades.length;
    if (total === 0) return '0.00';
    const followed = state.trades.filter(t => t.discipline === 'Yes').length;
    return ((followed / total) * 100).toFixed(1);
}

// --- JOURNAL MODAL ---
const openModal = () => {
    tradeForm.reset();
    document.querySelectorAll('.tag.selectable').forEach(t => t.classList.remove('selected'));
    tradeModal.classList.remove('hidden');
    tradeModal.style.display = 'flex';
};
const closeModal = () => {
    tradeModal.classList.add('hidden');
    setTimeout(() => { tradeModal.style.display = ''; }, 200);
};
addTradeBtn?.addEventListener('click', openModal);
closeModalBtn?.addEventListener('click', closeModal);
cancelModalBtn?.addEventListener('click', closeModal);
document.querySelectorAll('.tag.selectable').forEach(tag => {
    tag.addEventListener('click', () => tag.classList.toggle('selected'));
});
tradeForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedEmotions = Array.from(document.querySelectorAll('.tag.selectable.selected')).map(t => t.getAttribute('data-emotion'));
    const trade = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        asset: document.getElementById('trade-asset').value.toUpperCase(),
        direction: document.getElementById('trade-direction').value,
        pnl: parseFloat(document.getElementById('trade-pnl').value),
        discipline: document.getElementById('trade-discipline').value,
        emotions: selectedEmotions,
        notes: document.getElementById('trade-notes').value
    };
    state.trades.push(trade);
    saveState();
    updateUI();
    closeModal();
});
journalTbody?.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-btn');
    if (btn) {
        if (confirm('Delete this trade?')) {
            state.trades = state.trades.filter(t => t.id !== btn.getAttribute('data-id'));
            saveState();
            updateUI();
        }
    }
});
resetDataBtn?.addEventListener('click', () => {
    if (confirm('Delete ALL data and reset? This cannot be undone.')) {
        state.trades = [];
        state.plans = JSON.parse(JSON.stringify(DEFAULT_PLANS));
        state.activePlanId = 'plan-1';
        activePlanId = 'plan-1';
        saveState();
        updateUI();
        renderEdge();
    }
});

// --- UI UPDATES ---
function updateUI() {
    renderJournal();
    calculateAndRenderMetrics();
    renderRuleBreaks();
    lucide.createIcons();
}

function renderJournal() {
    if (!journalTbody) return;
    journalTbody.innerHTML = '';
    const tableWrap = document.querySelector('.table-responsive');
    if (state.trades.length === 0) {
        journalEmpty?.classList.remove('hidden');
        tableWrap?.classList.add('hidden');
        return;
    }
    journalEmpty?.classList.add('hidden');
    tableWrap?.classList.remove('hidden');
    const sorted = [...state.trades].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(t => {
        const d = new Date(t.date);
        const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const emotionTags = t.emotions.map(e => `<span class="tag">${e}</span>`).join('');
        const pnlClass = t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg';
        const pnlSign = t.pnl >= 0 ? '+' : '';
        const dirClass = t.direction === 'Long' ? 'direction-long' : 'direction-short';
        journalTbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td class="text-xs text-muted">${dateStr}</td>
                <td class="fw-medium">${t.asset}</td>
                <td class="${dirClass}">${t.direction}</td>
                <td class="${pnlClass}">${pnlSign}$${t.pnl.toFixed(2)}</td>
                <td>${emotionTags || '-'}</td>
                <td class="text-sm text-secondary" style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${t.notes}">${t.notes || '-'}</td>
                <td><button class="btn-icon delete-btn text-danger" data-id="${t.id}" title="Delete"><i data-lucide="trash-2"></i></button></td>
            </tr>`);
    });
}

function calculateAndRenderMetrics() {
    const trades = state.trades;
    let totalPnl = 0, wins = 0, grossProfit = 0, grossLoss = 0, ruleFollowedCount = 0;
    trades.forEach(t => {
        totalPnl += t.pnl;
        if (t.pnl > 0) { wins++; grossProfit += t.pnl; } else { grossLoss += Math.abs(t.pnl); }
        if (t.discipline === 'Yes') ruleFollowedCount++;
    });
    const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : 0;
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? 'MAX' : '0.00');
    const disciplineScore = trades.length > 0 ? Math.round((ruleFollowedCount / trades.length) * 100) : 100;
    const pnlSign = totalPnl >= 0 ? '' : '-';
    if (dashPnl) { dashPnl.textContent = `${pnlSign}$${Math.abs(totalPnl).toFixed(2)}`; dashPnl.className = `value ${totalPnl >= 0 ? (totalPnl > 0 ? 'pnl-pos' : '') : 'pnl-neg'}`; }
    if (dashWinRate) dashWinRate.textContent = `${winRate}%`;
    if (dashPf) dashPf.textContent = profitFactor;
    if (dashDiscipline) dashDiscipline.textContent = `${disciplineScore}/100`;
}

function renderRuleBreaks() {
    const breaks = state.trades.filter(t => t.discipline === 'No');
    if (dashBreaksCount) dashBreaksCount.textContent = `${breaks.length} Breaks`;
    if (!rulesList) return;
    rulesList.innerHTML = '';
    if (breaks.length === 0) {
        rulesEmpty?.classList.remove('hidden');
    } else {
        rulesEmpty?.classList.add('hidden');
        breaks.forEach(b => {
            const d = new Date(b.date).toLocaleDateString();
            const li = document.createElement('li');
            li.style.cssText = 'padding:0.75rem;border-bottom:1px solid var(--border-color);font-size:0.875rem;';
            li.innerHTML = `<div class="flex-between mb-1"><span class="fw-medium">${b.asset} (${b.direction})</span><span class="text-xs text-muted">${d}</span></div><div class="text-sm text-secondary">${b.notes ? `"${b.notes}"` : 'No notes. Failed to follow plan.'}</div>`;
            rulesList.appendChild(li);
        });
    }
}

function renderChart() {
    const canvas = document.getElementById('equityChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sorted = [...state.trades].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = ['Start'];
    const data = [0];
    let runningEq = 0;
    sorted.forEach(t => {
        runningEq += t.pnl;
        labels.push(new Date(t.date).toLocaleDateString());
        data.push(runningEq);
    });
    if (equityChartInstance) equityChartInstance.destroy();
    equityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Cumulative PnL',
                data,
                borderColor: '#2563EB',
                backgroundColor: 'rgba(37,99,235,0.08)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#2563EB',
                pointRadius: data.length > 20 ? 0 : 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    grid: { color: '#F3F4F6' },
                    ticks: { callback: v => '$' + v, font: { family: 'Inter', size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 8, font: { family: 'Inter', size: 11 } }
                }
            }
        }
    });
}

// --- BOOTSTRAP (Moved to end of file) ---

// ============================================================
// NOTEBOOK FEATURE
// ============================================================

let activeNoteId = null;
const NOTE_KEY = 'iris_notes_v1';

function getNotes() {
    try { return JSON.parse(localStorage.getItem(NOTE_KEY)) || []; } catch { return []; }
}
function saveNotes(notes) { localStorage.setItem(NOTE_KEY, JSON.stringify(notes)); }

const NOTE_TEMPLATES = {
    'trade-review': `## Trade Review\n\n**Asset:** \n**Date:** ${new Date().toLocaleDateString()}\n**Direction:** Long / Short\n**Result:** +/- $\n\n### What I Did Well\n- \n\n### What I Could Improve\n- \n\n### Rule Compliance\n- Followed plan: Yes / No\n- Emotions: \n\n### Key Lesson\n`,
    'weekly-plan': `## Weekly Plan — W${Math.ceil(new Date().getDate()/7)} ${new Date().toLocaleString('default',{month:'long'})}\n\n### Key Events This Week\n- \n\n### Bias For The Week\n- \n\n### Plans to Trade\n- \n\n### Risk Budget\n- Max daily loss: $\n- Max trades: \n\n### Weekly Goals\n1. \n2. \n3. `,
    'lesson': `## Lesson Learned\n\n**Date:** ${new Date().toLocaleDateString()}\n\n### What Happened\n\n### The Mistake\n\n### Root Cause\n\n### How to Prevent It\n\n### Rule to Add / Reinforce\n`
};

function addNote() {
    const notes = getNotes();
    const note = {
        id: 'note-' + Date.now(),
        title: 'Untitled Note',
        body: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    notes.unshift(note);
    saveNotes(notes);
    activeNoteId = note.id;
    renderNoteList();
    openNote(note.id);
    setTimeout(() => {
        const t = document.getElementById('note-title-input');
        if (t) { t.focus(); t.select(); }
    }, 50);
}

function renderNoteList() {
    const container = document.getElementById('note-list');
    if (!container) return;
    const query = (document.getElementById('note-search')?.value || '').toLowerCase();
    const notes = getNotes().filter(n =>
        n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query)
    );
    container.innerHTML = '';
    if (notes.length === 0) {
        container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);padding:1rem 0.5rem;">No notes yet. Click "+ New Note" to start.</p>';
        return;
    }
    notes.forEach(n => {
        const isActive = n.id === activeNoteId;
        const d = new Date(n.updatedAt);
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const preview = n.body.replace(/[#*`\n]/g, ' ').trim().slice(0, 60) || 'No content...';
        const btn = document.createElement('button');
        btn.style.cssText = `width:100%;text-align:left;padding:0.625rem 0.75rem;border-radius:0.5rem;border:1px solid ${isActive ? 'var(--border-color)' : 'transparent'};background:${isActive ? '#F5F7FF' : 'transparent'};cursor:pointer;transition:all 0.15s;`;
        btn.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
                <span style="font-size:0.875rem;font-weight:${isActive ? '600' : '500'};color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;">${n.title}</span>
                <span style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap;flex-shrink:0;">${dateStr}</span>
            </div>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${preview}</p>
        `;
        btn.addEventListener('click', () => openNote(n.id));
        btn.addEventListener('mouseenter', () => { if (!isActive) btn.style.background = '#F9FAFB'; });
        btn.addEventListener('mouseleave', () => { if (!isActive) btn.style.background = 'transparent'; });
        container.appendChild(btn);
    });
}

function openNote(id) {
    activeNoteId = id;
    const notes = getNotes();
    const note = notes.find(n => n.id === id);
    if (!note) return;
    document.getElementById('note-editor-empty').style.display = 'none';
    const ed = document.getElementById('note-editor');
    ed.style.display = 'flex';
    document.getElementById('note-title-input').value = note.title;
    document.getElementById('note-body-input').value = note.body;
    document.getElementById('note-saved-indicator').textContent = 'Last saved: ' + new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    renderNoteList();
    lucide.createIcons();
}

function saveActiveNote() {
    if (!activeNoteId) return;
    const notes = getNotes();
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;
    note.title = document.getElementById('note-title-input').value || 'Untitled Note';
    note.body = document.getElementById('note-body-input').value;
    note.updatedAt = new Date().toISOString();
    saveNotes(notes);
    document.getElementById('note-saved-indicator').textContent = 'Saved at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    renderNoteList();
}

function deleteActiveNote() {
    if (!activeNoteId) return;
    if (!confirm('Delete this note? This cannot be undone.')) return;
    let notes = getNotes().filter(n => n.id !== activeNoteId);
    saveNotes(notes);
    activeNoteId = null;
    document.getElementById('note-editor-empty').style.display = 'flex';
    document.getElementById('note-editor').style.display = 'none';
    renderNoteList();
}

function applyTemplate(type) {
    const body = document.getElementById('note-body-input');
    if (body && NOTE_TEMPLATES[type]) {
        if (body.value && !confirm('Replace note content with template?')) return;
        body.value = NOTE_TEMPLATES[type];
        saveActiveNote();
    }
}

// ============================================================
// ECONOMIC CALENDAR
// ============================================================
// [Powered by TradingView Professional Terminal in index.html]
// Legacy fetch/render logic removed to prevent CORS-restricted fallback.


// ============================================================
// LOT SIZE CALCULATOR
// ============================================================

const PIP_VALUES = {
    'forex-major': { pipSize: 0.0001, contractSize: 100000 },
    'forex-jpy':   { pipSize: 0.01,   contractSize: 100000 },
    'gold':        { pipSize: 0.1,    contractSize: 100  },
    'indices':     { pipSize: 1,      contractSize: 1    },
};

function calcLotSize() {
    const balance   = parseFloat(document.getElementById('calc-balance')?.value) || 10000;
    const riskPct   = parseFloat(document.getElementById('calc-risk')?.value) || 1;
    const slPips    = parseFloat(document.getElementById('calc-sl-pips')?.value) || 20;
    const instrument = document.getElementById('calc-instrument')?.value || 'forex-major';
    const { pipSize, contractSize } = PIP_VALUES[instrument];

    const riskAmount = balance * (riskPct / 100);
    const pipValuePerStdLot = pipSize * contractSize;
    const lotsNeeded = riskAmount / (slPips * pipValuePerStdLot);
    const roundedLots = Math.round(lotsNeeded * 100) / 100;
    const pipVal = roundedLots * pipValuePerStdLot;

    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('calc-result-lots', roundedLots.toFixed(2));
    el('calc-result-risk-usd', '$' + riskAmount.toFixed(2));
    el('calc-result-pip-val', '$' + pipVal.toFixed(2));
    el('calc-result-mini', (roundedLots * 10).toFixed(2));
    el('calc-result-micro', (roundedLots * 100).toFixed(1));
    el('calc-risk-summary',
        `You are risking $${riskAmount.toFixed(2)} on this trade (${riskPct}% of account). `
        + `Your SL is ${slPips} pips wide. Each pip is worth $${pipVal.toFixed(2)} at this lot size.`
    );
}

// ============================================================
// PRE-MARKET ROUTINE (Floating Widget)
// ============================================================

const PREMARKET_KEY = 'iris_premarket_v1';
const DEFAULT_CHECKLIST = [
    { id: 'pm1', text: 'Review economic calendar for high-impact events', done: false },
    { id: 'pm2', text: 'Mark HTF levels (weekly/daily range)', done: false },
    { id: 'pm3', text: 'Identify today\'s bias (bullish / bearish / neutral)', done: false },
    { id: 'pm4', text: 'Set max loss & max trades for the day', done: false },
    { id: 'pm5', text: 'Check overnight price action & gaps', done: false },
    { id: 'pm6', text: 'Confirm entry model is present', done: false },
    { id: 'pm7', text: 'Set alerts on key levels', done: false },
];

function getChecklist() {
    try { return JSON.parse(localStorage.getItem(PREMARKET_KEY)) || JSON.parse(JSON.stringify(DEFAULT_CHECKLIST)); }
    catch { return JSON.parse(JSON.stringify(DEFAULT_CHECKLIST)); }
}
function saveChecklist(list) { localStorage.setItem(PREMARKET_KEY, JSON.stringify(list)); }

function togglePreMarket() {
    const w = document.getElementById('premarket-widget');
    if (!w) return;
    const isVisible = w.style.display !== 'none';
    w.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) { renderPreMarket(); lucide.createIcons(); }
}

function renderPreMarket() {
    const list = document.getElementById('premarket-list');
    const progress = document.getElementById('premarket-progress');
    if (!list) return;
    const items = getChecklist();
    const done = items.filter(i => i.done).length;
    progress.textContent = `${done} / ${items.length} complete`;
    list.innerHTML = '';
    items.forEach(item => {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex; align-items:flex-start; gap:0.625rem; padding:0.5rem 0.25rem; cursor:pointer; border-radius:0.375rem; transition:background 0.1s;';
        row.addEventListener('mouseenter', () => row.style.background = '#F9FAFB');
        row.addEventListener('mouseleave', () => row.style.background = '');
        row.innerHTML = `
            <input type="checkbox" ${item.done ? 'checked' : ''} style="width:16px; height:16px; margin-top:1px; cursor:pointer; accent-color:var(--brand-blue); flex-shrink:0;">
            <span style="font-size:0.82rem; color:${item.done ? 'var(--text-muted)' : 'var(--text-primary)'}; ${item.done ? 'text-decoration:line-through;' : ''} line-height:1.5;">${item.text}</span>
        `;
        row.querySelector('input').addEventListener('change', e => {
            const checklist = getChecklist();
            const found = checklist.find(c => c.id === item.id);
            if (found) { found.done = e.target.checked; saveChecklist(checklist); }
            renderPreMarket();
        });
        list.appendChild(row);
    });
}

function resetPreMarket() {
    const list = getChecklist().map(i => ({ ...i, done: false }));
    saveChecklist(list);
    renderPreMarket();
}

// ============================================================
// ============================================================
// WIRE UP NEW VIEWS IN NAVIGATION
// ============================================================
const origNavHandler = navBtns;
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-target');
        if (t === 'view-notebook') { renderNoteList(); lucide.createIcons(); }
        if (t === 'view-calendar') { renderCalendar(); lucide.createIcons(); }
        if (t === 'view-calculator') { switchCalcTab('forex'); calcLotSize(); lucide.createIcons(); }
    });
});

// ============================================================
// TAB SWITCHING — POSITION CALCULATOR
// ============================================================
function switchCalcTab(tab) {
    const isForex = tab === 'forex';
    document.getElementById('panel-forex').style.display = isForex ? 'grid' : 'none';
    document.getElementById('panel-futures').style.display = isForex ? 'none' : 'block';

    const tForex   = document.getElementById('tab-forex');
    const tFutures = document.getElementById('tab-futures');
    if (!tForex || !tFutures) return;

    tForex.style.background   = isForex ? 'white' : 'transparent';
    tForex.style.color        = isForex ? 'var(--text-primary)' : 'var(--text-muted)';
    tForex.style.boxShadow    = isForex ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';

    tFutures.style.background = !isForex ? 'white' : 'transparent';
    tFutures.style.color      = !isForex ? 'var(--text-primary)' : 'var(--text-muted)';
    tFutures.style.boxShadow  = !isForex ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';

    if (!isForex) { calcFutures(); }
}

// ============================================================
// FUTURES CALCULATOR
// ============================================================

// Tick size, tick value, contract size (units), exchange
const FUTURES_SPECS = {
    ES:     { name: 'S&P 500 Futures',    tickSize: 0.25,       tickValue: 12.50,  contractSize: 50,     exchange: 'CME',   margin: 12000  },
    MES:    { name: 'Micro S&P 500',      tickSize: 0.25,       tickValue: 1.25,   contractSize: 5,      exchange: 'CME',   margin: 1200   },
    NQ:     { name: 'Nasdaq 100',         tickSize: 0.25,       tickValue: 5.00,   contractSize: 20,     exchange: 'CME',   margin: 20000  },
    MNQ:    { name: 'Micro Nasdaq 100',   tickSize: 0.25,       tickValue: 0.50,   contractSize: 2,      exchange: 'CME',   margin: 2000   },
    YM:     { name: 'Dow Jones',          tickSize: 1,          tickValue: 5.00,   contractSize: 5,      exchange: 'CBOT',  margin: 8000   },
    MYM:    { name: 'Micro Dow Jones',    tickSize: 1,          tickValue: 0.50,   contractSize: 0.5,    exchange: 'CBOT',  margin: 800    },
    RTY:    { name: 'Russell 2000',       tickSize: 0.10,       tickValue: 5.00,   contractSize: 50,     exchange: 'CME',   margin: 6000   },
    M2K:    { name: 'Micro Russell 2000', tickSize: 0.10,       tickValue: 0.50,   contractSize: 5,      exchange: 'CME',   margin: 600    },
    CL:     { name: 'Crude Oil (WTI)',    tickSize: 0.01,       tickValue: 10.00,  contractSize: 1000,   exchange: 'NYMEX', margin: 6000   },
    MCL:    { name: 'Micro Crude Oil',    tickSize: 0.01,       tickValue: 1.00,   contractSize: 100,    exchange: 'NYMEX', margin: 600    },
    NG:     { name: 'Natural Gas',        tickSize: 0.001,      tickValue: 10.00,  contractSize: 10000,  exchange: 'NYMEX', margin: 4000   },
    GC:     { name: 'Gold Futures',       tickSize: 0.10,       tickValue: 10.00,  contractSize: 100,    exchange: 'COMEX', margin: 11000  },
    MGC:    { name: 'Micro Gold',         tickSize: 0.10,       tickValue: 1.00,   contractSize: 10,     exchange: 'COMEX', margin: 1100   },
    SI:     { name: 'Silver Futures',     tickSize: 0.005,      tickValue: 25.00,  contractSize: 5000,   exchange: 'COMEX', margin: 9000   },
    SIL:    { name: 'Micro Silver',       tickSize: 0.005,      tickValue: 2.50,   contractSize: 500,    exchange: 'COMEX', margin: 900    },
    ZB:     { name: '30-Year T-Bond',     tickSize: 0.03125,    tickValue: 31.25,  contractSize: 100000, exchange: 'CBOT',  margin: 5000   },
    ZN:     { name: '10-Year T-Note',     tickSize: 0.015625,   tickValue: 15.625, contractSize: 100000, exchange: 'CBOT',  margin: 2500   },
    ZF:     { name: '5-Year T-Note',      tickSize: 0.0078125,  tickValue: 7.8125, contractSize: 100000, exchange: 'CBOT',  margin: 1200   },
    '6E':   { name: 'Euro FX',            tickSize: 0.00005,    tickValue: 6.25,   contractSize: 125000, exchange: 'CME',   margin: 2800   },
    '6J':   { name: 'Japanese Yen',       tickSize: 0.0000005,  tickValue: 6.25,   contractSize: 12500000, exchange: 'CME', margin: 2800  },
    '6B':   { name: 'British Pound',      tickSize: 0.0001,     tickValue: 6.25,   contractSize: 62500,  exchange: 'CME',   margin: 2800   },
    '6A':   { name: 'Australian Dollar',  tickSize: 0.0001,     tickValue: 10.00,  contractSize: 100000, exchange: 'CME',   margin: 2000   },
};

function onFuturesInstrumentChange() {
    const sym = document.getElementById('fut-instrument')?.value;
    const customFields = document.getElementById('fut-custom-fields');
    const infoBox = document.getElementById('fut-instrument-info');
    const infoText = document.getElementById('fut-info-text');

    if (sym === 'CUSTOM') {
        customFields.style.display = 'block';
        infoBox.style.display = 'none';
    } else {
        customFields.style.display = 'none';
        const spec = FUTURES_SPECS[sym];
        if (spec && infoText) {
            infoBox.style.display = 'block';
            infoText.innerHTML =
                `<strong>${sym}</strong> — ${spec.name} &nbsp;|&nbsp; ` +
                `Tick: ${spec.tickSize} pts &nbsp;|&nbsp; ` +
                `Tick Value: $${spec.tickValue.toFixed(2)} &nbsp;|&nbsp; ` +
                `Est. Margin: $${spec.margin.toLocaleString()} &nbsp;|&nbsp; ` +
                `Exchange: ${spec.exchange}`;
        }
    }
    calcFutures();
}

function calcFutures() {
    const balance  = parseFloat(document.getElementById('fut-balance')?.value)   || 25000;
    const riskPct  = parseFloat(document.getElementById('fut-risk')?.value)      || 1;
    const slTicks  = parseFloat(document.getElementById('fut-sl-ticks')?.value)  || 8;
    const sym      = document.getElementById('fut-instrument')?.value             || 'ES';

    let tickValue, tickSize, name;
    if (sym === 'CUSTOM') {
        tickValue = parseFloat(document.getElementById('fut-custom-tick-val')?.value)  || 12.50;
        tickSize  = parseFloat(document.getElementById('fut-custom-tick-size')?.value) || 0.25;
        name      = 'Custom';
    } else {
        const spec = FUTURES_SPECS[sym];
        if (!spec) return;
        tickValue = spec.tickValue;
        tickSize  = spec.tickSize;
        name      = spec.name;
    }

    const riskAmount          = balance * (riskPct / 100);
    const riskPerContract     = slTicks * tickValue;
    const contractsRaw        = riskAmount / riskPerContract;
    const contracts           = Math.max(1, Math.floor(contractsRaw));
    const actualRisk          = contracts * riskPerContract;

    // Notional: approximate using contract size from specs (use tickValue / tickSize as price proxy won't work for all)
    // Better: show dollar figures which are unambiguous
    const notional = sym !== 'CUSTOM' && FUTURES_SPECS[sym]
        ? contracts * FUTURES_SPECS[sym].contractSize * (sym === 'ES' ? 5250 : sym === 'NQ' ? 18500 : sym === 'CL' ? 70 : sym === 'GC' ? 2050 : 0)
        : null;

    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

    el('fut-result-contracts', contracts.toString());
    el('fut-result-subtitle', `${sym === 'CUSTOM' ? 'Custom' : sym} Contract${contracts !== 1 ? 's' : ''}`);
    el('fut-result-risk-usd', '$' + actualRisk.toLocaleString('en-US', { maximumFractionDigits: 2 }));
    el('fut-result-tick-val', '$' + tickValue.toFixed(2));
    el('fut-result-risk-per-contract', '$' + riskPerContract.toLocaleString('en-US', { maximumFractionDigits: 2 }));
    el('fut-result-notional', notional && notional > 0
        ? '$' + notional.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : '—');

    // R:R targets based on actual risk (not per-contract)
    el('fut-rr-1', '$' + actualRisk.toFixed(2));
    el('fut-rr-2', '$' + (actualRisk * 2).toFixed(2));
    el('fut-rr-3', '$' + (actualRisk * 3).toFixed(2));

    el('fut-risk-summary',
        `Trading ${contracts} ${sym} contract${contracts !== 1 ? 's' : ''} with a ${slTicks}-tick stop = ` +
        `$${riskPerContract.toFixed(2)} risk per contract = $${actualRisk.toFixed(2)} total risk ` +
        `(${(actualRisk / balance * 100).toFixed(2)}% of $${balance.toLocaleString()} account). ` +
        `Tick value: $${tickValue.toFixed(2)} per tick.`
    );
}

// Expose futures functions globally
window.switchCalcTab = switchCalcTab;
window.calcFutures = calcFutures;
window.onFuturesInstrumentChange = onFuturesInstrumentChange;

// --- INITIALIZE APPLICATION ---
function initializeApp() {
    loadState();
    updateUI();
    renderChart();
    renderEdge();

    // Set initial active view based on active nav button
    const initialActiveBtn = document.querySelector('.nav-btn.active');
    if (initialActiveBtn) {
        const targetId = initialActiveBtn.getAttribute('data-target');
        views.forEach(v => {
            if (v.id === targetId) v.classList.remove('hidden');
            else v.classList.add('hidden');
        });
    }
}

// Start everything
initializeApp();

// End of app.js
