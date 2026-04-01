// Initialize Icons
lucide.createIcons();

// ============================================================
// FIREBASE AUTH — Login / Logout / User UI
// ============================================================
let currentUser = null;

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        showLoginError(err.message);
    });
}

function loginWithEmail(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password).catch(err => {
        showLoginError(err.message);
    });
}

function signUpWithEmail() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showLoginError('Please enter email and password first.'); return; }
    if (password.length < 6) { showLoginError('Password must be at least 6 characters.'); return; }
    auth.createUserWithEmailAndPassword(email, password).catch(err => {
        showLoginError(err.message);
    });
}

function logoutUser() {
    if (confirm('Sign out of RYZON?')) {
        auth.signOut();
    }
}

function showLoginError(msg) {
    const el = document.getElementById('login-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function updateUserUI(user) {
    const loginScreen = document.getElementById('login-screen');
    const sidebarUser = document.getElementById('sidebar-user');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (user) {
        // Logged in — hide login screen, show user profile
        loginScreen?.classList.add('hidden');
        if (sidebarUser) {
            sidebarUser.style.display = 'flex';
            document.getElementById('sidebar-user-avatar').src = user.photoURL || 'ryzon_logo.png';
            document.getElementById('sidebar-user-name').textContent = user.displayName || 'Trader';
            document.getElementById('sidebar-user-email').textContent = user.email || '';
        }
        if (logoutBtn) logoutBtn.style.display = '';
        const deskSync = document.getElementById('desktop-sync-btn');
        if (deskSync) deskSync.style.display = 'flex';
        const mobSync = document.getElementById('mobile-sync-btn');
        if (mobSync) mobSync.style.display = '';
    } else {
        // Logged out — show login screen, hide user profile
        loginScreen?.classList.remove('hidden');
        if (sidebarUser) sidebarUser.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        const deskSync = document.getElementById('desktop-sync-btn');
        if (deskSync) deskSync.style.display = 'none';
        const mobSync = document.getElementById('mobile-sync-btn');
        if (mobSync) mobSync.style.display = 'none';
    }
}

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
    const isMobile = window.innerWidth <= 768;
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
        name: 'Daily Framework',
        active: true,
        lastReviewed: '',
        session: 'ny',
        biasDirection: 'neutral',
        biasScenario: 'continuation',
        htfRangeHigh: '',
        htfRangeLow: '',
        targetZone: '',
        invalidationLevel: '',
        riskControls: { maxTrades: 2, riskPct: 1, maxLoss: 1000, maxProfit: 5000 },
        criteria: [
            { id: 'c1', text: 'Liquidity sweep confirmation', checked: false },
            { id: 'c2', text: 'Structural shift (order flow change)', checked: false }
        ],
        chartingSteps: [
            'Map higher timeframe range and key valuation zones (premium/discount)',
            'Identify liquidity pools (PDH/PDL, equal highs/lows)',
            'Define current narrative: continuation, retracement, or reversal',
            'Select a single objective target (opposing structure)',
            'Establish invalidation: "Framework is invalid if price accepts beyond ___"'
        ],
        managementRules: 'Risk is predefined before execution (fixed exposure, no mid-trade adjustment)\nExecute with intent, avoid interference\nInvalidation hit \u2192 immediate exit, no recovery trades',
        exitCriteria: 'Define clear conditions required to close the position.',
        tradingNotes: 'Bias is a structured thesis, not a prediction.\nIf clarity is missing, execution should not happen.\nInvalidation resets the process \u2014 no emotional carryover.\nTrust is built through data, not belief.\nConsistency is the outcome of discipline.'
    },
    {
        id: 'plan-2',
        name: 'Weekly Structure',
        active: false,
        lastReviewed: '',
        session: 'all',
        biasDirection: 'neutral',
        biasScenario: 'continuation',
        htfRangeHigh: '',
        htfRangeLow: '',
        targetZone: '',
        invalidationLevel: '',
        riskControls: { maxTrades: 3, riskPct: 0.5, maxLoss: 500, maxProfit: 2000 },
        criteria: [
            { id: 'w1', text: 'Mark Weekly High/Low', checked: false },
            { id: 'w2', text: 'Identify EQ (Midpoint)', checked: false }
        ],
        chartingSteps: [
            'Map weekly range high and low on H4 timeframe.',
            'Identify weekly equilibrium (midpoint).',
            'Define key weekly points of interest.',
            'Establish directional bias from prior weekly close.',
            'Frame entry zones within discount or premium structure.'
        ],
        managementRules: 'Scale at equilibrium.\nAdjust stop to breakeven after 1R.\nNo position averaging against trend.',
        exitCriteria: 'Target reached at opposing weekly structure.',
        tradingNotes: 'Objective is to capture the weekly range expansion.\nSimplicity over complexity \u2014 execute with precision.'
    }
];

let state = {
    trades: [],
    plans: null,
    activePlanId: 'plan-1'
};

let activePlanId = 'plan-1';

function loadState() {
    // Load from localStorage first (instant, for offline)
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

async function loadStateFromFirestore() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('data').doc('state').get();
        if (doc.exists) {
            const data = doc.data();
            // Always use Firestore as source of truth when available
            state.trades = data.trades || [];
            state.plans = data.plans || JSON.parse(JSON.stringify(DEFAULT_PLANS));
            state.activePlanId = data.activePlanId || 'plan-1';
            activePlanId = state.activePlanId;
            // Update localStorage cache
            localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
            console.log('Loaded state from Firestore (' + state.trades.length + ' trades, ' + state.plans.length + ' plans)');
        } else {
            // First login — migrate localStorage data to Firestore
            console.log('No Firestore data — migrating localStorage');
            await saveStateToFirestore();
        }
    } catch(e) {
        console.warn('Firestore load failed, using localStorage:', e.message);
    }
}

async function forceSync() {
    if (!currentUser) return;
    
    // Check if offline
    if (!navigator.onLine) {
        if (typeof showSessionToast === 'function') showSessionToast('⚠️ You are offline. Cannot sync.');
        return;
    }

    const deskSync = document.getElementById('desktop-sync-btn');
    const mobSync = document.getElementById('mobile-sync-btn');
    
    // Add spinning animation
    if (deskSync) deskSync.querySelector('i').classList.add('lucide-spin');
    if (mobSync) mobSync.querySelector('i').classList.add('lucide-spin');

    try {
        await loadStateFromFirestore();
        await loadExtrasFromFirestore();
        updateUI();
        renderChart();
        renderEdge();
        if (typeof showSessionToast === 'function') showSessionToast('☁️ Cloud Sync Complete');
    } catch(e) {
        console.error('Sync failed', e);
        if (typeof showSessionToast === 'function') showSessionToast('❌ Sync failed: ' + e.message);
    } finally {
        setTimeout(() => {
            if (deskSync) deskSync.querySelector('i').classList.remove('lucide-spin');
            if (mobSync) mobSync.querySelector('i').classList.remove('lucide-spin');
        }, 500);
    }
}

function saveState() {
    // Always save to localStorage (instant, offline-safe)
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
    // Also save to Firestore if logged in
    saveStateToFirestore();
}

async function saveStateToFirestore() {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('data').doc('state').set({
            trades: state.trades,
            plans: state.plans,
            activePlanId: state.activePlanId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(e) {
        console.warn('Firestore save failed:', e.message);
        if (typeof showSessionToast === 'function') showSessionToast('⚠️ Cloud save failed: ' + e.message);
    }
}

// Save extras (symbols, chart plans, notes, checklist) to Firestore
async function saveExtrasToFirestore() {
    if (!currentUser) return;
    try {
        const extras = {
            symbols: JSON.parse(localStorage.getItem('ryzon_symbol_list') || '[]'),
            notes: JSON.parse(localStorage.getItem('ryzon_notes') || '[]'),
            checklist: JSON.parse(localStorage.getItem(PREMARKET_KEY) || localStorage.getItem('iris_premarket_v1') || '[]'),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        // Collect chart plans
        const chartPlans = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('ryzon_chartplan_')) {
                chartPlans[key] = localStorage.getItem(key);
            }
        }
        extras.chartPlans = chartPlans;
        await db.collection('users').doc(currentUser.uid).collection('data').doc('extras').set(extras);
    } catch(e) {
        console.warn('Firestore extras save failed:', e.message);
    }
}

async function loadExtrasFromFirestore() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('data').doc('extras').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.symbols) localStorage.setItem('ryzon_symbol_list', JSON.stringify(data.symbols));
            if (data.notes) localStorage.setItem('ryzon_notes', JSON.stringify(data.notes));
            if (data.checklist) localStorage.setItem(PREMARKET_KEY, JSON.stringify(data.checklist));
            if (data.chartPlans) {
                Object.keys(data.chartPlans).forEach(key => {
                    localStorage.setItem(key, data.chartPlans[key]);
                });
            }
            console.log('Loaded extras from Firestore');
        } else {
            // First login — push localStorage extras to cloud
            await saveExtrasToFirestore();
        }
    } catch(e) {
        console.warn('Firestore extras load failed:', e.message);
    }
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
        if (targetId === 'view-charts') {
            renderSymbolPills();
            loadTradingViewChart(currentChartSymbol);
            loadChartPlan(currentChartSymbol);
        }
    });
});

// ============================================================
// ECONOMIC CALENDAR FILTERS
// ============================================================
let calState = { calType: 'week', dateFrom: '', dateTo: '', importance: '', countries: ['5','4','22','72','25','32','17','36'] };

function buildCalUrl() {
    let url = 'https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&lang=1&timeZone=55';
    url += '&countries=' + calState.countries.join(',');
    url += '&calType=' + calState.calType;
    if (calState.importance) url += '&importance=' + calState.importance;
    if (calState.dateFrom) url += '&dateFrom=' + calState.dateFrom;
    if (calState.dateTo) url += '&dateTo=' + calState.dateTo;
    return url;
}

function refreshCalendar() {
    const iframe = document.getElementById('calendar-iframe');
    if (iframe) iframe.src = buildCalUrl();
}

function setCalDate(btn) {
    document.querySelectorAll('#cal-date-pills .cal-pill').forEach(p => p.classList.remove('cal-pill-active'));
    btn.classList.add('cal-pill-active');
    const range = btn.getAttribute('data-cal-range');
    const today = new Date();
    calState.dateFrom = '';
    calState.dateTo = '';
    if (range === 'today') {
        calState.calType = 'day';
    } else if (range === 'tomorrow') {
        calState.calType = 'day';
        const tmr = new Date(today); tmr.setDate(tmr.getDate() + 1);
        const ds = tmr.toISOString().slice(0,10);
        calState.dateFrom = ds;
        calState.dateTo = ds;
        calState.calType = 'custom';
    } else if (range === 'week') {
        calState.calType = 'week';
    } else if (range === 'nextweek') {
        const mon = new Date(today);
        mon.setDate(mon.getDate() + (7 - mon.getDay() + 1));
        const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
        calState.dateFrom = mon.toISOString().slice(0,10);
        calState.dateTo = sun.toISOString().slice(0,10);
        calState.calType = 'custom';
    }
    refreshCalendar();
}

function setCalImp(btn) {
    document.querySelectorAll('#cal-imp-pills .cal-pill').forEach(p => p.classList.remove('cal-pill-active'));
    btn.classList.add('cal-pill-active');
    calState.importance = btn.getAttribute('data-imp');
    refreshCalendar();
}

function toggleCalCountry(btn) {
    const cc = btn.getAttribute('data-cc');
    btn.classList.toggle('cal-pill-active');
    if (btn.classList.contains('cal-pill-active')) {
        if (!calState.countries.includes(cc)) calState.countries.push(cc);
    } else {
        calState.countries = calState.countries.filter(c => c !== cc);
    }
    if (calState.countries.length > 0) refreshCalendar();
}

// ============================================================
// CHARTS + TRADE PLAN (TradingView Split View)
// ============================================================
let currentChartSymbol = 'OANDA:NAS100USD';
let currentChartLabel = 'NQ';
let tvWidgetLoaded = false;

// Initial symbols (used only on first load if nothing in localStorage)
const INITIAL_SYMBOLS = [
    { sym: 'OANDA:NAS100USD', label: 'NQ' },
    { sym: 'OANDA:XAUUSD', label: 'XAU/USD' },
    { sym: 'FX:EURUSD', label: 'EUR/USD' }
];

function getSymbolList() {
    const raw = localStorage.getItem('ryzon_symbol_list');
    if (!raw) {
        // First time — initialize with defaults
        localStorage.setItem('ryzon_symbol_list', JSON.stringify(INITIAL_SYMBOLS));
        return [...INITIAL_SYMBOLS];
    }
    return JSON.parse(raw);
}

function saveSymbolList(list) {
    localStorage.setItem('ryzon_symbol_list', JSON.stringify(list));
    saveExtrasToFirestore();
}

function renderSymbolPills() {
    const container = document.getElementById('chart-symbol-pills');
    if (!container) return;
    container.innerHTML = '';

    const symbols = getSymbolList();
    symbols.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'chart-sym-pill chart-sym-pinned' + (s.sym === currentChartSymbol ? ' chart-sym-active' : '');
        btn.setAttribute('data-sym', s.sym);

        const labelSpan = document.createElement('span');
        labelSpan.textContent = s.label;
        btn.appendChild(labelSpan);

        const removeX = document.createElement('span');
        removeX.className = 'pin-remove';
        removeX.textContent = '×';
        removeX.onclick = (e) => { e.stopPropagation(); removeSymbol(s.sym); };
        btn.appendChild(removeX);

        btn.onclick = () => switchChartSymbol(s.sym, s.label);
        container.appendChild(btn);
    });
}

function getChartPlanKey(sym) { return 'ryzon_chartplan_' + sym; }

function loadTradingViewChart(symbol) {
    const container = document.getElementById('tradingview-chart-container');
    if (!container) return;
    container.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.id = 'tradingview_chart';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.onload = function() {
        if (window.TradingView) {
            new TradingView.widget({
                "autosize": true,
                "symbol": symbol,
                "interval": "60",
                "timezone": "Etc/UTC",
                "theme": "light",
                "style": "1",
                "locale": "en",
                "toolbar_bg": "#f1f3f6",
                "enable_publishing": false,
                "allow_symbol_change": true,
                "details": true,
                "hotlist": false,
                "calendar": false,
                "studies": ["STD;EMA"],
                "container_id": "tradingview_chart",
                "hide_side_toolbar": false,
                "withdateranges": true
            });
            tvWidgetLoaded = true;
        }
    };
    document.head.appendChild(script);
}

function switchChartSymbol(sym, label) {
    currentChartSymbol = sym;
    currentChartLabel = label;
    document.getElementById('chart-plan-symbol').textContent = label + ' — Trade Plan';
    renderSymbolPills();
    loadTradingViewChart(sym);
    loadChartPlan(sym);
}

function loadCustomSymbol() {
    const pairInput = document.getElementById('chart-custom-input');
    const brokerSelect = document.getElementById('chart-broker-select');
    let pair = pairInput.value.trim().toUpperCase().replace(/\s+/g, '').replace('/', '');
    if (!pair) return;

    const broker = brokerSelect.value;
    const fullSym = broker + ':' + pair;
    const label = pairInput.value.trim().toUpperCase();

    // Check if already in list
    const list = getSymbolList();
    if (!list.find(s => s.sym === fullSym)) {
        list.push({ sym: fullSym, label: label });
        saveSymbolList(list);
    }

    switchChartSymbol(fullSym, label);
    pairInput.value = '';
}

function removeSymbol(sym) {
    let list = getSymbolList();
    list = list.filter(s => s.sym !== sym);
    saveSymbolList(list);
    if (currentChartSymbol === sym) {
        const remaining = list.length > 0 ? list[0] : INITIAL_SYMBOLS[0];
        switchChartSymbol(remaining.sym, remaining.label);
    } else {
        renderSymbolPills();
    }
}

function saveChartPlan() {
    const plan = {
        bias: document.querySelector('#chart-bias-pills .bias-active')?.getAttribute('data-bias') || 'neutral',
        levels: document.getElementById('chart-plan-levels').value,
        notes: document.getElementById('chart-plan-notes').value,
        updated: new Date().toISOString()
    };
    localStorage.setItem(getChartPlanKey(currentChartSymbol), JSON.stringify(plan));
    saveExtrasToFirestore();
    const indicator = document.getElementById('chart-plan-saved');
    indicator.textContent = 'Saved ' + new Date().toLocaleTimeString();
}

function loadChartPlan(sym) {
    const raw = localStorage.getItem(getChartPlanKey(sym));
    const plan = raw ? JSON.parse(raw) : { bias: 'neutral', levels: '', notes: '' };

    // Set bias
    document.querySelectorAll('#chart-bias-pills .bias-pill').forEach(p => p.classList.remove('bias-active'));
    const biasBtn = document.querySelector('#chart-bias-pills .bias-pill[data-bias="' + plan.bias + '"]');
    if (biasBtn) biasBtn.classList.add('bias-active');

    // Set fields
    document.getElementById('chart-plan-levels').value = plan.levels || '';
    document.getElementById('chart-plan-notes').value = plan.notes || '';
    document.getElementById('chart-plan-saved').textContent = plan.updated ? 'Last saved ' + new Date(plan.updated).toLocaleTimeString() : '';
}

function setChartBias(btn) {
    document.querySelectorAll('#chart-bias-pills .bias-pill').forEach(p => p.classList.remove('bias-active'));
    btn.classList.add('bias-active');
    saveChartPlan();
}

function clearChartPlan() {
    if (!confirm('Clear the trade plan for ' + currentChartLabel + '?')) return;
    localStorage.removeItem(getChartPlanKey(currentChartSymbol));
    loadChartPlan(currentChartSymbol);
    document.getElementById('chart-plan-saved').textContent = 'Cleared';
}

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

    // Ensure new fields exist for older plans
    plan.session = plan.session || 'ny';
    plan.biasDirection = plan.biasDirection || 'neutral';
    plan.biasScenario = plan.biasScenario || 'continuation';
    plan.pricePosition = plan.pricePosition || 'equilibrium';
    plan.targetZone = plan.targetZone || '';
    plan.invalidationLevel = plan.invalidationLevel || '';

    const complianceRate = calcCompliance(plan);
    const planTrades = state.trades.length;
    const wins = state.trades.filter(t => t.pnl > 0).length;
    const winRate = planTrades > 0 ? ((wins / planTrades) * 100).toFixed(1) : '0.0';
    const totalPnl = state.trades.reduce((s, t) => s + t.pnl, 0);

    const sessionLabels = { ny: 'NY Session', london: 'London Session', asia: 'Asia Session', all: 'All Sessions' };
    const biasLabels = { bullish: 'Bullish Bias', bearish: 'Bearish Bias', neutral: 'Neutral' };
    const scenarioLabels = { continuation: 'Continuation', pullback: 'Pullback', reversal: 'Reversal' };
    const statusText = `${sessionLabels[plan.session]} · ${biasLabels[plan.biasDirection]}`;

    editor.innerHTML = `
        <!-- Plan Header -->
        <div class="ef-header">
            <div class="ef-header-left">
                <span class="ef-dot" style="background:${plan.active ? 'var(--success)' : 'var(--text-muted)'}"></span>
                <h2 class="ef-title" contenteditable="true" spellcheck="false"
                    onblur="savePlanTitle(this.innerText.trim())"
                    onfocus="this.style.borderBottomColor='var(--brand-blue)'">${plan.name}</h2>
                <div class="ef-header-actions">
                    <button class="btn-icon border" title="Duplicate" onclick="duplicatePlan('${plan.id}')"><i data-lucide="copy" style="width:13px;height:13px;"></i></button>
                    <button class="btn-icon border" title="Delete" onclick="deletePlan('${plan.id}')"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
                </div>
            </div>
            <div class="ef-header-right">
                <label class="toggle-switch">
                    <input type="checkbox" ${plan.active ? 'checked' : ''} onchange="togglePlanActive(this.checked)">
                    <span class="slider round"></span>
                </label>
                <span class="ef-active-label">${plan.active ? 'Active' : 'Inactive'}</span>
            </div>
        </div>
        <div class="ef-subtitle">${statusText}</div>

        <!-- Session Selector -->
        <div class="ef-session-bar">
            ${['ny','london','asia','all'].map(s => `
                <button class="ef-pill ${plan.session === s ? 'ef-pill-active' : ''}" onclick="saveQuickField('session','${s}')">${s === 'ny' ? 'NY' : s === 'london' ? 'London' : s === 'asia' ? 'Asia' : 'All'}</button>
            `).join('')}
        </div>

        <!-- Archived Sessions -->
        ${(plan.sessionHistory && plan.sessionHistory.length > 0) ? `
        <div class="ef-archive-section">
            <div class="ef-archive-header" onclick="document.getElementById('archive-list').classList.toggle('hidden')">
                <span class="ef-archive-title"><i data-lucide="archive" style="width:13px;height:13px;"></i> Past Sessions (${plan.sessionHistory.length})</span>
                <i data-lucide="chevron-down" style="width:13px;height:13px;color:var(--text-muted);"></i>
            </div>
            <div id="archive-list" class="ef-archive-list hidden">
                ${[...plan.sessionHistory].reverse().map((s, idx) => {
                    const realIdx = plan.sessionHistory.length - 1 - idx;
                    const biasColor = s.biasDirection === 'bullish' ? '#16A34A' : s.biasDirection === 'bearish' ? '#DC2626' : 'var(--text-muted)';
                    const biasLabel = s.biasDirection ? s.biasDirection.charAt(0).toUpperCase() + s.biasDirection.slice(1) : 'Neutral';
                    const sessionLabel = s.session === 'ny' ? 'NY' : s.session === 'london' ? 'London' : s.session === 'asia' ? 'Asia' : 'All';
                    const scenarioLabel = s.biasScenario ? s.biasScenario.charAt(0).toUpperCase() + s.biasScenario.slice(1) : '-';
                    const priceLabel = s.pricePosition ? s.pricePosition.charAt(0).toUpperCase() + s.pricePosition.slice(1) : '-';
                    const triggersOn = (s.triggers || []).filter(t => t.checked).length;
                    const triggersTotal = (s.triggers || []).length;
                    return `
                    <div class="ef-archive-card" onclick="toggleArchiveExpand(${realIdx}, event)">
                        <div class="ef-archive-summary">
                            <div class="ef-archive-left">
                                <span class="ef-archive-dot" style="background:${biasColor};"></span>
                                <span class="ef-archive-date">${s.date} · ${s.time}</span>
                                <span class="ef-archive-tag">${sessionLabel}</span>
                                <span class="ef-archive-tag">${biasLabel}</span>
                                <span class="ef-archive-tag">${scenarioLabel}</span>
                            </div>
                            <div class="ef-archive-right-actions">
                                <span class="ef-archive-triggers">${triggersOn}/${triggersTotal} triggers</span>
                                <button class="delete-row-btn" onclick="deleteSession(${realIdx}, event)" title="Delete"><i data-lucide="x" style="width:11px;height:11px;"></i></button>
                            </div>
                        </div>
                        <div class="ef-archive-expand hidden" id="archive-detail-${realIdx}">
                            <div class="ef-archive-detail-grid">
                                <div><span class="journal-detail-label">Price Position</span><span class="journal-detail-value">${priceLabel}</span></div>
                                <div><span class="journal-detail-label">Bias</span><span class="journal-detail-value" style="color:${biasColor};">${biasLabel}</span></div>
                                <div><span class="journal-detail-label">Scenario</span><span class="journal-detail-value">${scenarioLabel}</span></div>
                                <div><span class="journal-detail-label">Target</span><span class="journal-detail-value">${s.targetZone || '—'}</span></div>
                                <div><span class="journal-detail-label">Invalidation</span><span class="journal-detail-value">${s.invalidationLevel || '—'}</span></div>
                                <div><span class="journal-detail-label">Triggers</span><span class="journal-detail-value">${triggersOn} of ${triggersTotal}</span></div>
                            </div>
                            ${(s.triggers && s.triggers.length > 0) ? `
                            <div class="ef-archive-triggers-list">
                                ${s.triggers.map(t => `
                                    <div class="ef-archive-trigger-item">
                                        <span class="ef-trigger-dot" style="background:${t.checked ? '#16A34A' : '#D1D5DB'};"></span>
                                        <span style="font-size:0.78rem; ${t.checked ? 'color:var(--text-primary);' : 'color:var(--text-muted); text-decoration:line-through;'}">${t.text}</span>
                                    </div>
                                `).join('')}
                            </div>` : ''}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Two Column Grid -->
        <div class="edge-grid">
            <!-- LEFT: EXECUTION FLOW -->
            <div class="edge-left">
                <h4 class="ef-col-title">Execution Flow</h4>

                <!-- Market Context -->
                <div class="ef-card">
                    <div class="ef-card-head">
                        <span class="ef-card-title"><i data-lucide="activity" style="width:14px;height:14px;"></i> Market Context</span>
                    </div>
                    <div class="ef-row" style="gap:0.5rem; margin-bottom:0.75rem;">
                        <span class="ef-label">Where is price?</span>
                        <div class="ef-pill-group">
                            <button class="ef-pill ${plan.pricePosition === 'premium' ? 'ef-pill-active-red' : ''}" onclick="saveQuickField('pricePosition','premium')">Premium</button>
                            <button class="ef-pill ${plan.pricePosition === 'equilibrium' ? 'ef-pill-active' : ''}" onclick="saveQuickField('pricePosition','equilibrium')">Equilibrium</button>
                            <button class="ef-pill ${plan.pricePosition === 'discount' ? 'ef-pill-active-green' : ''}" onclick="saveQuickField('pricePosition','discount')">Discount</button>
                        </div>
                    </div>
                    <div class="ef-row">
                        <span class="ef-label">Bias Direction</span>
                        <div class="ef-pill-group">
                            <button class="ef-pill ef-pill-bullish ${plan.biasDirection === 'bullish' ? 'ef-pill-active-green' : ''}" onclick="saveQuickField('biasDirection','bullish')">Bullish</button>
                            <button class="ef-pill ef-pill-bearish ${plan.biasDirection === 'bearish' ? 'ef-pill-active-red' : ''}" onclick="saveQuickField('biasDirection','bearish')">Bearish</button>
                            <button class="ef-pill ${plan.biasDirection === 'neutral' ? 'ef-pill-active' : ''}" onclick="saveQuickField('biasDirection','neutral')">Neutral</button>
                        </div>
                    </div>
                </div>

                <!-- Bias Scenario -->
                <div class="ef-card">
                    <div class="ef-card-head">
                        <span class="ef-card-title"><i data-lucide="compass" style="width:14px;height:14px;"></i> Bias Scenario</span>
                    </div>
                    <div class="ef-pill-group" style="gap:0.5rem;">
                        <button class="ef-scenario-pill ${plan.biasScenario === 'continuation' ? 'ef-scenario-active' : ''}" onclick="saveQuickField('biasScenario','continuation')">
                            <i data-lucide="trending-up" style="width:14px;height:14px;"></i> Continuation
                        </button>
                        <button class="ef-scenario-pill ${plan.biasScenario === 'pullback' ? 'ef-scenario-active' : ''}" onclick="saveQuickField('biasScenario','pullback')">
                            <i data-lucide="corner-down-left" style="width:14px;height:14px;"></i> Pullback
                        </button>
                        <button class="ef-scenario-pill ${plan.biasScenario === 'reversal' ? 'ef-scenario-active' : ''}" onclick="saveQuickField('biasScenario','reversal')">
                            <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> Reversal
                        </button>
                    </div>
                </div>

                <!-- Target & Invalidation -->
                <div class="ef-card">
                    <div class="ef-card-head">
                        <span class="ef-card-title"><i data-lucide="target" style="width:14px;height:14px;"></i> Target & Invalidation</span>
                    </div>
                    <div class="ef-target-row">
                        <div class="ef-target-item ef-target-green">
                            <span class="ef-target-dot" style="background:#16A34A;"></span>
                            <span class="ef-target-label">Target Zone</span>
                            <input type="text" class="ef-input-sm" placeholder="Price" value="${plan.targetZone}" onblur="saveQuickField('targetZone', this.value)">
                        </div>
                        <div class="ef-target-item ef-target-red">
                            <span class="ef-target-dot" style="background:#DC2626;"></span>
                            <span class="ef-target-label">Invalidation</span>
                            <input type="text" class="ef-input-sm" placeholder="Price" value="${plan.invalidationLevel}" onblur="saveQuickField('invalidationLevel', this.value)">
                        </div>
                    </div>
                </div>

                <!-- Entry Triggers -->
                <div class="ef-card">
                    <div class="ef-card-head">
                        <span class="ef-card-title"><i data-lucide="zap" style="width:14px;height:14px;"></i> Entry Triggers</span>
                        <button class="add-row-btn" onclick="addCriteria()"><i data-lucide="plus" style="width:12px;height:12px;"></i> Add Trigger</button>
                    </div>
                    <div class="ef-triggers-list">
                        ${plan.criteria.map(c => `
                            <div class="ef-trigger-row" data-criteria-id="${c.id}">
                                <label class="ef-toggle-label">
                                    <span class="ef-trigger-dot" style="background:${c.checked ? '#16A34A' : 'var(--text-muted)'};"></span>
                                    <span class="ef-trigger-text ${c.checked ? 'ef-trigger-done' : ''}"
                                        contenteditable="true" spellcheck="false"
                                        onblur="saveCriteriaText('${c.id}', this.innerText.trim())">${c.text}</span>
                                </label>
                                <div class="ef-trigger-actions">
                                    <label class="toggle-switch toggle-sm">
                                        <input type="checkbox" ${c.checked ? 'checked' : ''} onchange="saveCriteriaCheck('${c.id}', this.checked)">
                                        <span class="slider round"></span>
                                    </label>
                                    <button class="delete-row-btn" onclick="deleteCriteria('${c.id}')" title="Remove"><i data-lucide="x" style="width:11px;height:11px;"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Execution Model -->
                <div class="ef-card">
                    <div class="ef-card-head">
                        <span class="ef-card-title"><i data-lucide="image" style="width:14px;height:14px;"></i> Execution Model</span>
                    </div>
                    <div style="display:flex; gap:0.75rem;">
                        <div style="flex:1;">
                            <p class="ef-label" style="margin-bottom:0.4rem;">Primary setup reference</p>
                            <label class="ef-upload-zone">
                                <input type="file" accept="image/*" style="display:none;" onchange="previewImage(this, 'img-setup')">
                                <img id="img-setup" src="" alt="" style="display:none; width:100%; height:100%; object-fit:cover; border-radius:0.5rem;">
                                <span id="img-setup-icon" class="ef-upload-placeholder"><i data-lucide="upload" style="width:18px;height:18px;opacity:0.3;"></i><span>Drop to upload</span></span>
                            </label>
                        </div>
                        <div style="flex:1;">
                            <p class="ef-label" style="margin-bottom:0.4rem;">Validated entry examples</p>
                            <label class="ef-upload-zone">
                                <input type="file" accept="image/*" style="display:none;" onchange="previewImage(this, 'img-entry')">
                                <img id="img-entry" src="" alt="" style="display:none; width:100%; height:100%; object-fit:cover; border-radius:0.5rem;">
                                <span id="img-entry-icon" class="ef-upload-placeholder"><i data-lucide="upload" style="width:18px;height:18px;opacity:0.3;"></i><span>Drop to upload</span></span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Collapsible Rulebook -->
                <details class="ef-card ef-collapsible">
                    <summary class="ef-card-head ef-summary">
                        <span class="ef-card-title"><i data-lucide="book" style="width:14px;height:14px;"></i> Rulebook</span>
                        <i data-lucide="chevron-down" style="width:14px;height:14px; color:var(--text-muted);"></i>
                    </summary>
                    <div style="padding-top:0.75rem;">
                        <p class="ef-label" style="margin-bottom:0.4rem;">Risk & Trade Discipline</p>
                        <div contenteditable="true" spellcheck="false" class="ef-editable"
                            onblur="saveField('managementRules', this.innerText.trim())">${plan.managementRules}</div>
                        <p class="ef-label" style="margin:0.75rem 0 0.4rem;">Exit Protocol</p>
                        <div contenteditable="true" spellcheck="false" class="ef-editable"
                            onblur="saveField('exitCriteria', this.innerText.trim())">${plan.exitCriteria}</div>
                    </div>
                </details>
            </div>

            <!-- RIGHT: DECISION PANEL -->
            <div class="edge-right">
                <h4 class="ef-col-title">Decision Panel</h4>

                <!-- Performance Metrics -->
                <div class="ef-card-right">
                    <h4 class="ef-right-title">Performance</h4>
                    <div class="ef-stats-grid">
                        <div class="ef-stat"><span class="ef-stat-val">${planTrades}</span><span class="ef-stat-label">Trades Executed</span></div>
                        <div class="ef-stat"><span class="ef-stat-val">${winRate}%</span><span class="ef-stat-label">Win Rate</span></div>
                        <div class="ef-stat"><span class="ef-stat-val ${totalPnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${totalPnl >= 0 ? '+' : ''}$${Math.abs(totalPnl).toFixed(2)}</span><span class="ef-stat-label">Net Return</span></div>
                        <div class="ef-stat"><span class="ef-stat-val">${complianceRate}%</span><span class="ef-stat-label">Rule Adherence</span></div>
                    </div>
                </div>

                <!-- Risk Parameters -->
                <div class="ef-card-right ef-risk-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                        <h4 class="ef-right-title" style="margin:0;">Risk</h4>
                        <button onclick="openRiskModal()" class="btn-icon" style="color:var(--text-muted);" title="Edit"><i data-lucide="edit-2" style="width:13px;height:13px;"></i></button>
                    </div>
                    <div class="ef-risk-grid">
                        <div class="ef-risk-row"><span>Max Trades / Day</span><strong>${plan.riskControls.maxTrades}</strong></div>
                        <div class="ef-risk-row"><span>Max Daily Drawdown</span><strong>$${plan.riskControls.maxLoss.toLocaleString()}</strong></div>
                        <div class="ef-risk-row"><span>Max Daily Target</span><strong>$${plan.riskControls.maxProfit.toLocaleString()}</strong></div>
                        <div class="ef-risk-row"><span>Risk per Position</span><strong>${plan.riskControls.riskPct}%</strong></div>
                    </div>
                </div>




                <!-- Key Notes -->
                <div class="ef-card-right ef-notes-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                        <h4 class="ef-right-title" style="margin:0;">Key Notes</h4>
                    </div>
                    <div contenteditable="true" spellcheck="false" class="ef-editable ef-notes-area"
                        onblur="saveField('tradingNotes', this.innerText.trim())">${plan.tradingNotes}</div>
                </div>

                <!-- Mark Session Complete -->
                <div class="ef-session-count">${plan.lastReviewed || ''}</div>
                <div class="ef-session-count">${(plan.sessionHistory || []).length} session${(plan.sessionHistory || []).length !== 1 ? 's' : ''} archived</div>
                <button class="ef-complete-btn" onclick="markReviewed()">
                    <i data-lucide="check" style="width:14px;height:14px;"></i> Mark Session Complete
                </button>
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

// --- QUICK FIELD SAVE (session, bias, scenario, target, etc.) ---
function saveQuickField(field, value) {
    const plan = getActivePlan();
    plan[field] = value;
    saveState();
    renderEdge();
}

// --- MARK REVIEWED ---
function markReviewed() {
    const plan = getActivePlan();
    if (!plan) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString();

    // Archive current session snapshot
    if (!plan.sessionHistory) plan.sessionHistory = [];
    plan.sessionHistory.push({
        date: dateStr,
        time: timeStr,
        session: plan.session || 'ny',
        biasDirection: plan.biasDirection || 'neutral',
        biasScenario: plan.biasScenario || 'continuation',
        pricePosition: plan.pricePosition || 'equilibrium',
        targetZone: plan.targetZone || '',
        invalidationLevel: plan.invalidationLevel || '',
        triggers: (plan.criteria || []).map(c => ({ text: c.text, checked: c.checked })),
        completedAt: now.toISOString()
    });

    // Reset execution flow for a new session
    plan.biasDirection = 'neutral';
    plan.biasScenario = 'continuation';
    plan.pricePosition = 'equilibrium';
    plan.targetZone = '';
    plan.invalidationLevel = '';
    plan.criteria.forEach(c => c.checked = false);
    plan.lastReviewed = `Last session completed: ${dateStr} at ${timeStr}`;

    saveState();

    // Show success toast
    showSessionToast(`Session archived — ${dateStr} at ${timeStr}`);

    // Re-render with clean slate
    renderEdge();

    // Auto-open the archive list and scroll to top
    setTimeout(() => {
        const archiveList = document.getElementById('archive-list');
        if (archiveList) archiveList.classList.remove('hidden');
        const editorPanel = document.querySelector('.edge-editor-panel');
        if (editorPanel) editorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
}

function showSessionToast(message) {
    // Remove existing toast if any
    const existing = document.getElementById('session-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'session-toast';
    toast.className = 'session-toast';
    toast.innerHTML = `<i data-lucide="check-circle" style="width:16px;height:16px;"></i> ${message}`;
    document.body.appendChild(toast);
    lucide.createIcons();

    // Auto-remove after 3.5s
    setTimeout(() => {
        toast.classList.add('session-toast-out');
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// --- ARCHIVE EXPAND/DELETE ---
function toggleArchiveExpand(idx, event) {
    // Don't toggle if clicking delete button
    if (event && event.target.closest('.delete-row-btn')) return;
    const detail = document.getElementById('archive-detail-' + idx);
    if (!detail) return;
    const isOpen = !detail.classList.contains('hidden');
    // Close all others
    document.querySelectorAll('.ef-archive-expand').forEach(d => d.classList.add('hidden'));
    if (!isOpen) detail.classList.remove('hidden');
}

function deleteSession(idx, event) {
    event.stopPropagation();
    if (!confirm('Delete this archived session?')) return;
    const plan = getActivePlan();
    if (!plan || !plan.sessionHistory) return;
    plan.sessionHistory.splice(idx, 1);
    saveState();
    renderEdge();
}

// --- CHARTING STEPS ---
function addChartingStep() {
    const text = prompt('Enter new structuring step:');
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
    const text = prompt('Enter new trigger:');
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
    if (item) { item.checked = checked; saveState(); renderEdge(); }
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
    renderPnlCalendar();
    lucide.createIcons();
}

// ============================================================
// P/L CALENDAR HEATMAP
// ============================================================
let pnlCalYear = new Date().getFullYear();
let pnlCalMonth = new Date().getMonth(); // 0-indexed

function changePnlMonth(delta) {
    pnlCalMonth += delta;
    if (pnlCalMonth > 11) { pnlCalMonth = 0; pnlCalYear++; }
    if (pnlCalMonth < 0) { pnlCalMonth = 11; pnlCalYear--; }
    renderPnlCalendar();
}

function renderPnlCalendar() {
    const grid = document.getElementById('pnl-calendar-grid');
    const monthLabel = document.getElementById('pnl-cal-month');
    const totalLabel = document.getElementById('pnl-cal-total');
    if (!grid) return;

    const year = pnlCalYear;
    const month = pnlCalMonth;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (monthLabel) monthLabel.textContent = monthNames[month] + ' ' + year;

    // Aggregate trades by date string (YYYY-MM-DD)
    const dailyPnl = {};
    state.trades.forEach(t => {
        const d = new Date(t.date);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (!dailyPnl[key]) dailyPnl[key] = { pnl: 0, count: 0 };
        dailyPnl[key].pnl += t.pnl;
        dailyPnl[key].count++;
    });

    // Build calendar
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    grid.innerHTML = '';

    // Headers
    const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', ''];
    dayHeaders.forEach((h, i) => {
        const hdr = document.createElement('div');
        hdr.className = 'pnl-cal-header';
        hdr.textContent = i < 7 ? h : 'Week';
        grid.appendChild(hdr);
    });

    // Track weekly data
    let weekPnl = 0, weekTrades = 0, weekNum = 1;
    let monthTotalPnl = 0;

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
        const dayNum = prevMonthDays - firstDay + 1 + i;
        const cell = document.createElement('div');
        cell.className = 'pnl-cal-day pnl-other-month';
        cell.innerHTML = `<span class="pnl-cal-day-num">${dayNum}</span>`;
        grid.appendChild(cell);
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        const dayData = dailyPnl[dateKey];
        const dayOfWeek = (firstDay + d - 1) % 7;

        const cell = document.createElement('div');
        let cls = 'pnl-cal-day';
        if (dateKey === todayKey) cls += ' pnl-today';

        let inner = `<span class="pnl-cal-day-num">${d}</span>`;

        if (dayData) {
            const sign = dayData.pnl >= 0 ? '' : '-';
            const pnlClass = dayData.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
            cls += dayData.pnl >= 0 ? ' pnl-profit' : ' pnl-loss';
            inner += `<span class="pnl-cal-pnl ${pnlClass}">${sign}$${Math.abs(dayData.pnl).toFixed(2)}</span>`;
            inner += `<span class="pnl-cal-trades">${dayData.count} trade${dayData.count > 1 ? 's' : ''}</span>`;
            weekPnl += dayData.pnl;
            weekTrades += dayData.count;
            monthTotalPnl += dayData.pnl;
        }

        cell.className = cls;
        cell.innerHTML = inner;
        grid.appendChild(cell);

        // End of week (Saturday) or last day — add weekly summary
        if (dayOfWeek === 6 || d === daysInMonth) {
            // If last day and not Saturday, pad remaining cells
            if (d === daysInMonth && dayOfWeek < 6) {
                for (let pad = dayOfWeek + 1; pad <= 6; pad++) {
                    const emptyCell = document.createElement('div');
                    emptyCell.className = 'pnl-cal-day pnl-other-month';
                    emptyCell.innerHTML = `<span class="pnl-cal-day-num">${pad - dayOfWeek}</span>`;
                    grid.appendChild(emptyCell);
                }
            }

            const weekCell = document.createElement('div');
            weekCell.className = 'pnl-cal-week';
            const wPnlClass = weekPnl >= 0 ? 'pnl-positive' : 'pnl-negative';
            const wSign = weekPnl >= 0 ? '' : '-';
            weekCell.innerHTML = `
                <span class="pnl-cal-week-label">Week ${weekNum}</span>
                <span class="pnl-cal-week-pnl ${wPnlClass}">${wSign}$${Math.abs(weekPnl).toFixed(2)}</span>
                <span class="pnl-cal-week-trades">${weekTrades} trades</span>
            `;
            grid.appendChild(weekCell);
            weekNum++;
            weekPnl = 0;
            weekTrades = 0;
        }
    }

    // Monthly total
    if (totalLabel) {
        const sign = monthTotalPnl >= 0 ? '' : '-';
        const cls = monthTotalPnl >= 0 ? 'pnl-positive' : 'pnl-negative';
        totalLabel.className = cls;
        totalLabel.textContent = `Monthly P/L: ${sign}$${Math.abs(monthTotalPnl).toFixed(2)}`;
    }
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
        const notePreview = t.notes ? (t.notes.length > 30 ? t.notes.substring(0, 30) + '...' : t.notes) : '-';

        // Main row
        journalTbody.insertAdjacentHTML('beforeend', `
            <tr class="journal-row" data-trade-id="${t.id}" onclick="toggleTradeExpand('${t.id}')" style="cursor:pointer;">
                <td class="text-xs text-muted">${dateStr}</td>
                <td class="fw-medium">${t.asset}</td>
                <td class="${dirClass}">${t.direction}</td>
                <td class="${pnlClass}">${pnlSign}$${t.pnl.toFixed(2)}</td>
                <td>${emotionTags || '-'}</td>
                <td class="text-sm text-secondary" style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${notePreview}</td>
                <td>
                    <button class="btn-icon delete-btn text-danger" title="Delete" onclick="deleteTrade('${t.id}', event)"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>
            <tr class="journal-expand-row hidden" id="expand-${t.id}">
                <td colspan="7" style="padding:0;">
                    <div class="journal-expand-content">
                        <div class="journal-expand-grid">
                            <div class="journal-expand-detail">
                                <span class="journal-detail-label">Date & Time</span>
                                <span class="journal-detail-value">${dateStr}</span>
                            </div>
                            <div class="journal-expand-detail">
                                <span class="journal-detail-label">Asset</span>
                                <span class="journal-detail-value fw-medium">${t.asset}</span>
                            </div>
                            <div class="journal-expand-detail">
                                <span class="journal-detail-label">Direction</span>
                                <span class="journal-detail-value ${dirClass}">${t.direction}</span>
                            </div>
                            <div class="journal-expand-detail">
                                <span class="journal-detail-label">Result</span>
                                <span class="journal-detail-value ${pnlClass}" style="font-weight:700;">${pnlSign}$${t.pnl.toFixed(2)}</span>
                            </div>
                            <div class="journal-expand-detail">
                                <span class="journal-detail-label">Followed Plan</span>
                                <span class="journal-detail-value">${t.discipline === 'Yes' ? '✅ Yes' : '❌ No'}</span>
                            </div>
                            <div class="journal-expand-detail">
                                <span class="journal-detail-label">Emotions</span>
                                <span class="journal-detail-value">${emotionTags || '-'}</span>
                            </div>
                        </div>
                        <div class="journal-expand-notes">
                            <span class="journal-detail-label">Notes & Lessons</span>
                            <div class="journal-notes-full">${t.notes || 'No notes recorded.'}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `);
    });
}

function deleteTrade(id, event) {
    if (event) event.stopPropagation();
    if (confirm('Delete this trade?')) {
        state.trades = state.trades.filter(t => t.id !== id);
        saveState();
        updateUI();
    }
}

function toggleTradeExpand(id) {
    const row = document.getElementById('expand-' + id);
    if (!row) return;
    const isOpen = !row.classList.contains('hidden');
    // Close all others first
    document.querySelectorAll('.journal-expand-row').forEach(r => r.classList.add('hidden'));
    document.querySelectorAll('.journal-row').forEach(r => r.classList.remove('journal-row-active'));
    if (!isOpen) {
        row.classList.remove('hidden');
        row.previousElementSibling?.classList.add('journal-row-active');
    }
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
function saveNotes(notes) { localStorage.setItem(NOTE_KEY, JSON.stringify(notes)); saveExtrasToFirestore(); }

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
function saveChecklist(list) { localStorage.setItem(PREMARKET_KEY, JSON.stringify(list)); saveExtrasToFirestore(); }

function togglePreMarket() {
    const w = document.getElementById('premarket-widget');
    if (!w) return;
    const isVisible = w.style.display !== 'none';
    w.style.display = isVisible ? 'none' : 'block';
    w.classList.remove('premarket-popup-mode');
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

// --- Auto-popup once per day ---
const PREMARKET_SHOWN_KEY = 'iris_premarket_last_shown';

function showPreMarketPopup() {
    const w = document.getElementById('premarket-widget');
    if (!w) return;
    w.style.display = 'block';
    w.classList.add('premarket-popup-mode');
    renderPreMarket();
    lucide.createIcons();
}

function checkDailyPreMarket() {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(PREMARKET_SHOWN_KEY);
    if (lastShown === today) return;
    // New day — reset checklist and show popup
    localStorage.setItem(PREMARKET_SHOWN_KEY, today);
    const list = getChecklist().map(i => ({ ...i, done: false }));
    saveChecklist(list);
    // Short delay so the app finishes rendering first
    setTimeout(() => showPreMarketPopup(), 600);
}

// Run after page load
window.addEventListener('load', () => setTimeout(checkDailyPreMarket, 1000));

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
    // Load from localStorage first (instant display)
    loadState();
    updateUI();
    renderChart();
    renderEdge();

    // Set initial active view
    const initialActiveBtn = document.querySelector('.nav-btn.active');
    if (initialActiveBtn) {
        const targetId = initialActiveBtn.getAttribute('data-target');
        views.forEach(v => {
            if (v.id === targetId) v.classList.remove('hidden');
            else v.classList.add('hidden');
        });
    }

    // Firebase Auth State Listener
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        updateUserUI(user);

        if (user) {
            console.log('User signed in:', user.email || user.displayName);
            // Load from Firestore (may be newer than localStorage)
            await loadStateFromFirestore();
            await loadExtrasFromFirestore();
            // Refresh UI with cloud data
            updateUI();
            renderChart();
            renderEdge();
        } else {
            console.log('User signed out');
        }
    });
}

// Start everything
initializeApp();

// End of app.js
