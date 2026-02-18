// ========================================
// Warehouse Report & Monitoring - Script
// ========================================

// ========================================
// TOAST NOTIFICATION
// ========================================
function showToast(message, type = 'info') {
    const existing = document.getElementById('toastNotif');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toastNotif';

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const bgColors = {
        success: 'linear-gradient(135deg, #065f46, #047857)',
        error: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
        info: 'linear-gradient(135deg, #1e3a5f, #1e40af)',
        warning: 'linear-gradient(135deg, #78350f, #92400e)'
    };

    toast.style.cssText = `
        position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-120%);
        z-index: 99999; padding: 14px 24px; border-radius: 12px; font-size: 14px;
        font-family: 'Inter', sans-serif; font-weight: 600;
        color: #fff; display: flex; align-items: center; gap: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        background: ${bgColors[type] || bgColors.info};
        transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
        max-width: 480px; cursor: pointer; text-align: center;
    `;
    toast.innerHTML = `<span style="font-size:18px">${icons[type] || icons.info}</span> ${message}`;
    toast.onclick = () => { toast.style.transform = 'translateX(-50%) translateY(-120%)'; setTimeout(() => toast.remove(), 300); };
    document.body.appendChild(toast);

    requestAnimationFrame(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; });

    setTimeout(() => {
        if (toast.parentNode) { toast.style.transform = 'translateX(-50%) translateY(-120%)'; setTimeout(() => toast.remove(), 400); }
    }, 4000);
}

// Special centered popup for Clock In success
function showClockInPopup(empName, note) {
    const existing = document.getElementById('clockInPopup');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'clockInPopup';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.3s ease;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
        background: linear-gradient(145deg, #0f172a, #1e293b);
        border: 1px solid rgba(59,130,246,0.3); border-radius: 20px;
        padding: 40px 48px; max-width: 500px; width: 90%; text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(59,130,246,0.15);
        animation: scaleIn 0.4s cubic-bezier(0.22,1,0.36,1);
        font-family: 'Inter', sans-serif;
    `;

    const displayNote = note
        ? note.replace(/\[Nama\]/gi, empName)
        : `Selamat bekerja, ${empName}! 💪`;

    card.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
        <div style="font-size: 22px; font-weight: 700; color: #34d399; margin-bottom: 12px;">Clock In Berhasil!</div>
        <div style="font-size: 16px; color: #e2e8f0; line-height: 1.6; white-space: pre-wrap;">${displayNote}</div>
        <button onclick="document.getElementById('clockInPopup')?.remove()" style="
            margin-top: 24px; padding: 10px 32px; border: none; border-radius: 10px;
            background: linear-gradient(135deg, #2563eb, #3b82f6); color: #fff;
            font-size: 14px; font-weight: 600; cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        " onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 4px 16px rgba(59,130,246,0.4)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">OK</button>
    `;

    overlay.appendChild(card);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);

    // Add animations
    if (!document.getElementById('clockInPopupStyles')) {
        const style = document.createElement('style');
        style.id = 'clockInPopupStyles';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        `;
        document.head.appendChild(style);
    }

    // Auto close after 8 seconds
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 8000);
}

// Special centered popup for Clock Out success
function showClockOutPopup(empName) {
    const existing = document.getElementById('clockOutPopup');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'clockOutPopup';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.3s ease;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
        background: linear-gradient(145deg, #0f172a, #1e293b);
        border: 1px solid rgba(234,179,8,0.3); border-radius: 20px;
        padding: 40px 48px; max-width: 500px; width: 90%; text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(234,179,8,0.15);
        animation: scaleIn 0.4s cubic-bezier(0.22,1,0.36,1);
        font-family: 'Inter', sans-serif;
    `;

    card.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">🙏</div>
        <div style="font-size: 22px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Clock Out Berhasil!</div>
        <div style="font-size: 16px; color: #e2e8f0; line-height: 1.6;">Terima kasih atas kinerjanya, ${empName}!<br>Selamat istirahat 😊</div>
        <button onclick="document.getElementById('clockOutPopup')?.remove()" style="
            margin-top: 24px; padding: 10px 32px; border: none; border-radius: 10px;
            background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff;
            font-size: 14px; font-weight: 600; cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        " onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 4px 16px rgba(234,179,8,0.4)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">OK</button>
    `;

    overlay.appendChild(card);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);

    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 8000);
}

// ========================================
// AUTH MODULE — Login, Logout, Role Access
// ========================================

const AUTH_KEYS = {
    users: 'auth_users',
    session: 'auth_session'
};

// Role definitions: which pages and dashboard tabs each role can access
const ROLE_ACCESS = {
    supervisor: { pages: 'all', dashTabs: 'all' },
    leader: { pages: 'all', dashTabs: 'all' },
    admin_inbound: {
        pages: ['dashboard', 'inbound-arrival', 'inbound-transaction', 'vas', 'attendance', 'productivity'],
        dashTabs: ['inbound'],
        navGroups: ['inbound', 'manpower']
    },
    admin_inventory: {
        pages: ['dashboard', 'daily-cycle-count', 'project-damage', 'stock-on-hand', 'qc-return', 'master-location', 'attendance', 'productivity'],
        dashTabs: ['inventory'],
        navGroups: ['inventory', 'manpower']
    }
};

// Role display names
const ROLE_LABELS = {
    supervisor: 'Supervisor',
    leader: 'Leader',
    admin_inbound: 'Admin Inbound',
    admin_inventory: 'Admin Inventory'
};

// Only supervisor and leader can delete data
function canDelete() {
    const session = getSession();
    if (!session) return false;
    return ['supervisor', 'leader'].includes(session.role);
}

// Simple hash for password (not crypto-secure, just basic obfuscation)
async function hashPassword(pw) {
    const data = new TextEncoder().encode(pw);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Seed default accounts if none exist
async function seedDefaultAccounts() {
    const existing = JSON.parse(localStorage.getItem(AUTH_KEYS.users) || '[]');
    if (existing.length > 0) return;

    const defaults = [
        { username: 'supervisor', password: 'super123', role: 'supervisor' },
        { username: 'leader', password: 'leader123', role: 'leader' },
        { username: 'admin.inbound', password: 'inbound123', role: 'admin_inbound' },
        { username: 'admin.inventory', password: 'inventory123', role: 'admin_inventory' }
    ];

    const users = [];
    for (const d of defaults) {
        users.push({ username: d.username, passwordHash: await hashPassword(d.password), role: d.role });
    }
    localStorage.setItem(AUTH_KEYS.users, JSON.stringify(users));
}

function getSession() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEYS.session)); } catch { return null; }
}

function setSession(user) {
    localStorage.setItem(AUTH_KEYS.session, JSON.stringify({ username: user.username, role: user.role }));
}

function clearSession() {
    localStorage.removeItem(AUTH_KEYS.session);
}

// Apply role-based visibility
function applyRoleAccess(role) {
    const access = ROLE_ACCESS[role];
    if (!access) return;

    // Sidebar nav groups
    document.querySelectorAll('.nav-group[data-access]').forEach(group => {
        const groupAccess = group.getAttribute('data-access');
        if (access.pages === 'all' || (access.navGroups && access.navGroups.includes(groupAccess))) {
            group.style.display = '';
        } else {
            group.style.display = 'none';
        }
    });

    // Dashboard tabs
    const tabInbound = document.getElementById('tabInbound');
    const tabInventory = document.getElementById('tabInventory');

    if (access.dashTabs === 'all') {
        if (tabInbound) tabInbound.style.display = '';
        if (tabInventory) tabInventory.style.display = '';
    } else {
        if (tabInbound) tabInbound.style.display = access.dashTabs.includes('inbound') ? '' : 'none';
        if (tabInventory) tabInventory.style.display = access.dashTabs.includes('inventory') ? '' : 'none';

        // Auto-activate the visible tab
        const visibleTab = access.dashTabs[0];
        if (visibleTab) {
            document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));

            const tab = visibleTab === 'inbound' ? tabInbound : tabInventory;
            const panel = document.getElementById(visibleTab === 'inbound' ? 'dashboardInbound' : 'dashboardInventory');
            if (tab) { tab.classList.add('active'); tab.click(); }
            if (panel) panel.classList.add('active');
        }
    }

    // Show user info in sidebar
    const session = getSession();
    const userEl = document.getElementById('sidebarUser');
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    if (userEl && session) {
        userEl.style.display = '';
        if (nameEl) nameEl.textContent = session.username;
        if (roleEl) roleEl.textContent = ROLE_LABELS[session.role] || session.role;
    }

    // Hide delete buttons for non-supervisor/leader roles
    const deleteAllowed = ['supervisor', 'leader'].includes(role);
    const deleteDisplay = deleteAllowed ? '' : 'none';

    // Clear All buttons
    ['btnClearDcc', 'btnClearDmg', 'btnClearSoh', 'btnClearQcr', 'btnClearLoc'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = deleteDisplay;
    });

    // Attendance: only supervisor can delete
    const attDeleteAllowed = role === 'supervisor';
    const btnClearAtt = document.getElementById('btnClearAtt');
    if (btnClearAtt) btnClearAtt.style.display = attDeleteAllowed ? '' : 'none';

    // Attendance: only supervisor/leader can edit (add/import)
    const attEditAllowed = ['supervisor', 'leader'].includes(role);
    ['btnAddAtt', 'btnImportAtt'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = attEditAllowed ? '' : 'none';
    });

    // Add body class for CSS-based hiding of edit/delete in attendance rows
    document.body.classList.toggle('role-no-edit-att', !attEditAllowed);
    document.body.classList.toggle('role-no-delete-att', !attDeleteAllowed);

    // Bulk Delete buttons (hidden by default, but ensure they stay hidden)
    if (!deleteAllowed) {
        ['btnBulkDeleteArrival', 'btnBulkDeleteTransaction', 'btnBulkDeleteVas',
            'btnBulkDeleteDcc', 'btnBulkDeleteDmg', 'btnBulkDeleteQcr', 'btnBulkDeleteLoc', 'btnBulkDeleteAtt'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
    }

    // Toggle body class for CSS-based hiding of inline delete buttons
    document.body.classList.toggle('role-no-delete', !deleteAllowed);
}

// Show login screen
function showLogin() {
    const loginScreen = document.getElementById('loginScreen');
    const appWrapper = document.getElementById('appWrapper');
    if (loginScreen) loginScreen.style.display = '';
    if (appWrapper) appWrapper.style.display = 'none';
}

// Show app (hide login)
function showApp() {
    const loginScreen = document.getElementById('loginScreen');
    const appWrapper = document.getElementById('appWrapper');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appWrapper) appWrapper.style.display = '';
}

// Handle login form submit
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername')?.value?.trim().toLowerCase();
        const password = document.getElementById('loginPassword')?.value;
        const errorEl = document.getElementById('loginError');
        const errorMsg = document.getElementById('loginErrorMsg');

        if (!username || !password) {
            if (errorEl) errorEl.style.display = '';
            if (errorMsg) errorMsg.textContent = 'Username dan password wajib diisi';
            return;
        }

        const users = JSON.parse(localStorage.getItem(AUTH_KEYS.users) || '[]');
        const pwHash = await hashPassword(password);
        const user = users.find(u => u.username === username && u.passwordHash === pwHash);

        if (!user) {
            if (errorEl) errorEl.style.display = '';
            if (errorMsg) errorMsg.textContent = 'Username atau password salah';
            return;
        }

        // Success
        if (errorEl) errorEl.style.display = 'none';
        setSession(user);
        showApp();
        applyRoleAccess(user.role);
        // Re-trigger dashboard stats
        if (typeof updateDashboardStats === 'function') updateDashboardStats();
    });

    // Absen button (no login needed)
    document.getElementById('btnLoginAbsen')?.addEventListener('click', () => {
        window._standaloneClockMode = true;
        showApp();
        // Hide sidebar and header in standalone mode
        document.getElementById('sidebar')?.style.setProperty('display', 'none');
        document.getElementById('tabBar')?.style.setProperty('display', 'none');
        document.querySelector('.header')?.style.setProperty('display', 'none');
        document.querySelector('.main-content')?.style.setProperty('padding-left', '0');
        navigateTo('clock-inout');
        initClockPage();
    });
}

// Handle logout
function initLogout() {
    document.getElementById('btnLogout')?.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            clearSession();
            showLogin();
            // Clear form
            const loginUsername = document.getElementById('loginUsername');
            const loginPassword = document.getElementById('loginPassword');
            if (loginUsername) loginUsername.value = '';
            if (loginPassword) loginPassword.value = '';
        }
    });
}

// Check auth: if session exists show app, else show login
async function initAuth() {
    await seedDefaultAccounts();
    initLoginForm();
    initLogout();

    const session = getSession();
    if (session && ROLE_ACCESS[session.role]) {
        showApp();
        applyRoleAccess(session.role);
    } else {
        showLogin();
    }
}

// --- Data Store (localStorage + IndexedDB for large data) ---
const STORAGE_KEYS = {
    arrivals: 'inbound_arrivals',
    transactions: 'inbound_transactions',
    vas: 'inbound_vas',
    dcc: 'inbound_dcc',
    damage: 'inbound_damage',
    soh: 'inbound_soh',
    qcReturn: 'inbound_qc_return',
    locations: 'master_locations',
    attendance: 'manpower_attendance',
    employees: 'manpower_employees',
    projectProd: 'manpower_project_productivity'
};

// Keys that use IndexedDB (large datasets)
const IDB_KEYS = new Set([STORAGE_KEYS.soh, STORAGE_KEYS.locations]);
const _idbCache = {}; // in-memory cache for IndexedDB data

// --- IndexedDB helpers ---
function openIDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('InboundWarehouseDB', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('data')) {
                db.createObjectStore('data');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getDataIDB(key) {
    try {
        const db = await openIDB();
        return new Promise((resolve) => {
            const tx = db.transaction('data', 'readonly');
            const store = tx.objectStore('data');
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    } catch { return []; }
}

async function setDataIDB(key, data) {
    try {
        const db = await openIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('data', 'readwrite');
            const store = tx.objectStore('data');
            store.put(data, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) { console.error('IDB write error:', e); }
}

// Preload large data from IndexedDB into memory cache
async function preloadLargeData() {
    for (const key of IDB_KEYS) {
        _idbCache[key] = await getDataIDB(key);
        // Migrate from localStorage if exists (one-time)
        if (_idbCache[key].length === 0) {
            try {
                const lsData = JSON.parse(localStorage.getItem(key));
                if (lsData && lsData.length > 0) {
                    _idbCache[key] = lsData;
                    await setDataIDB(key, lsData);
                    localStorage.removeItem(key);
                }
            } catch { }
        } else {
            // Clean up localStorage copy if IDB has data
            localStorage.removeItem(key);
        }
    }
}

// --- Unified sync getData / setData ---
function getData(key) {
    if (IDB_KEYS.has(key)) {
        return _idbCache[key] || [];
    }
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch { return []; }
}

function setData(key, data) {
    if (IDB_KEYS.has(key)) {
        _idbCache[key] = data;
        setDataIDB(key, data); // async background write
        return;
    }
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    // Auth: seed accounts, check session, show login or app
    await initAuth();

    // Preload large datasets from IndexedDB into memory cache
    await preloadLargeData();

    // Check API availability first
    if (typeof initApiLayer === 'function') {
        await initApiLayer();
    }
    // If API is available, sync data from API to localStorage
    if (typeof isApiAvailable === 'function' && isApiAvailable()) {
        await syncFromApi();
    }
    repairTransactionData();
    initNavigation();
    initSidebar();
    initClock();
    initMenuCards();
    initArrivalPage();
    initTransactionPage();
    initVasPage();
    initDccPage();
    initDmgPage();
    initSohPage();
    initQcrPage();
    initLocPage();
    initAttendancePage();
    initProductivityPage();
    initEmployeesPage();
    initClockPage();
    initDashboardTabs();
    initInvFilter();
    initInboundFilter();
    updateDashboardStats();

    // Re-apply role access after all pages init (in case session exists)
    const session = getSession();
    if (session) applyRoleAccess(session.role);
});

// Sync all data from API to localStorage
async function syncFromApi() {
    try {
        for (const key of Object.values(STORAGE_KEYS)) {
            const endpoint = API_ENDPOINTS[key];
            if (!endpoint) continue; // Skip keys without API endpoints (e.g. DCC)
            const apiData = await apiGet(key);
            if (apiData && apiData.length > 0) {
                localStorage.setItem(key, JSON.stringify(apiData));
            }
        }
        console.log('[Sync] Data synced from API to localStorage');
    } catch (err) {
        console.warn('[Sync] Failed:', err.message);
    }
}

// --- Data Repair (fix imported data with invalid operateType) ---
function repairTransactionData() {
    let transactions = getData(STORAGE_KEYS.transactions);
    let changed = false;
    const validTypes = ['receive', 'putaway'];

    transactions.forEach(t => {
        if (!t.operateType || !validTypes.includes(t.operateType.toLowerCase())) {
            t.operateType = 'receive';
            changed = true;
        }
    });

    if (changed) {
        setData(STORAGE_KEYS.transactions, transactions);
    }
}

// --- Page Navigation ---
function initNavigation() {
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.getAttribute('data-page'));
        });
    });

    document.querySelectorAll('.back-btn[data-navigate]').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.getAttribute('data-navigate'));
        });
    });

    // Nav group toggle (expand/collapse)
    document.querySelectorAll('.nav-group__header').forEach(header => {
        header.addEventListener('click', () => {
            header.closest('.nav-group').classList.toggle('open');
        });
    });
}

const PAGE_NAMES = {
    'dashboard': 'Dashboard',
    'inbound-arrival': 'Inbound Arrival',
    'inbound-transaction': 'Inbound Transaction',
    'vas': 'VAS',
    'daily-cycle-count': 'Daily Cycle Count',
    'project-damage': 'Project Damage',
    'stock-on-hand': 'Stock On Hand',
    'qc-return': 'QC Return',
    'master-location': 'Master Location',
    'attendance': 'Attendance',
    'productivity': 'Productivity',
    'employees': 'Employees',
    'clock-inout': 'Clock In/Out'
};

const PAGE_ICONS = {
    'dashboard': 'fas fa-home',
    'inbound-arrival': 'fas fa-truck-loading',
    'inbound-transaction': 'fas fa-exchange-alt',
    'vas': 'fas fa-cogs',
    'daily-cycle-count': 'fas fa-clipboard-check',
    'project-damage': 'fas fa-exclamation-triangle',
    'stock-on-hand': 'fas fa-warehouse',
    'qc-return': 'fas fa-undo-alt',
    'master-location': 'fas fa-map-marker-alt',
    'attendance': 'fas fa-user-clock',
    'productivity': 'fas fa-chart-line',
    'employees': 'fas fa-id-card',
    'clock-inout': 'fas fa-stopwatch'
};

let openTabs = ['dashboard']; // track open tab IDs
let activeTab = 'dashboard';

function navigateTo(pageId) {
    // Role-based navigation guard
    const session = getSession();
    if (session) {
        const access = ROLE_ACCESS[session.role];
        if (access && access.pages !== 'all' && !access.pages.includes(pageId)) {
            showToast('Anda tidak memiliki akses ke halaman ini', 'error');
            return;
        }
    }

    // Add tab if not already open
    if (!openTabs.includes(pageId)) {
        openTabs.push(pageId);
    }
    activeTab = pageId;
    renderTabBar();

    // Show the active page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');

    // Highlight sidebar
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const nav = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (nav) nav.classList.add('active');

    document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('active-group'));
    if (nav) {
        const parentGroup = nav.closest('.nav-group');
        if (parentGroup) {
            parentGroup.classList.add('active-group');
            parentGroup.classList.add('open');
        }
    }

    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumbPage');
    if (breadcrumb) breadcrumb.textContent = PAGE_NAMES[pageId] || pageId;

    // Render page data
    const PAGE_RENDER_MAP = {
        'inbound-arrival': renderArrivalTable,
        'inbound-transaction': renderTransactionTable,
        'vas': renderVasTable,
        'daily-cycle-count': () => { renderDccTable(); },
        'project-damage': renderDmgTable,
        'stock-on-hand': renderSohTable,
        'qc-return': renderQcrTable,
        'dashboard': updateDashboardStats,
        'master-location': renderLocationTable,
        'attendance': renderAttendanceTable,
        'productivity': renderProductivityTable,
        'employees': renderEmployeesTable,
        'clock-inout': renderClockPage
    };

    // Render page data via map
    // DCC special filter handling
    if (pageId === 'daily-cycle-count') {
        if (typeof dccVarianceFilter !== 'undefined' && !window._dccDrillDownActive) {
            dccVarianceFilter = '';
            const searchDcc = document.getElementById('searchDcc');
            if (searchDcc) searchDcc.value = '';
        }
        window._dccDrillDownActive = false;
    }

    const renderFn = PAGE_RENDER_MAP[pageId];
    if (renderFn) renderFn();

    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarOverlay')?.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Global event delegation for all [data-refresh] buttons
document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-refresh]');
    if (!btn) return;
    const pageId = btn.getAttribute('data-refresh');
    const REFRESH_MAP = {
        'inbound-arrival': () => renderArrivalTable(),
        'inbound-transaction': () => renderTransactionTable(),
        'vas': () => renderVasTable(),
        'daily-cycle-count': () => renderDccTable(),
        'project-damage': () => renderDmgTable(),
        'stock-on-hand': () => renderSohTable(),
        'qc-return': () => renderQcrTable(),
        'dashboard': () => updateDashboardStats(),
        'master-location': () => renderLocationTable(),
        'attendance': () => renderAttendanceTable(),
        'productivity': () => renderProductivityTable(),
        'employees': () => renderEmployeesTable(),
        'clock-inout': () => renderClockPage()
    };
    const icon = btn.querySelector('i');
    if (icon) { icon.style.animation = 'spin 0.6s linear'; setTimeout(() => icon.style.animation = '', 600); }
    const fn = REFRESH_MAP[pageId];
    if (fn) fn();
    showToast('Data berhasil di-refresh', 'success');
});

function renderTabBar() {
    const container = document.getElementById('tabBarTabs');
    if (!container) return;
    container.innerHTML = openTabs.map(id => {
        const name = PAGE_NAMES[id] || id;
        const icon = PAGE_ICONS[id] || 'fas fa-file';
        const isActive = id === activeTab;
        const closable = id !== 'dashboard';
        return `<div class="tab-item ${isActive ? 'active' : ''}" data-tab="${id}">
            <i class="${icon}"></i>
            <span>${name}</span>
            ${closable ? `<span class="tab-close" data-tab-close="${id}">&times;</span>` : ''}
        </div>`;
    }).join('');

    // Tab click handlers
    container.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (e.target.closest('.tab-close')) return;
            navigateTo(tab.getAttribute('data-tab'));
        });
    });

    // Close button handlers
    container.querySelectorAll('.tab-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(btn.getAttribute('data-tab-close'));
        });
    });
}

function closeTab(tabId) {
    if (tabId === 'dashboard') return; // Can't close dashboard
    const idx = openTabs.indexOf(tabId);
    if (idx === -1) return;
    openTabs.splice(idx, 1);
    // If closing the active tab, switch to previous tab or dashboard
    if (activeTab === tabId) {
        const newActive = openTabs[Math.max(0, idx - 1)] || 'dashboard';
        navigateTo(newActive);
    } else {
        renderTabBar();
    }
}

// --- Sidebar Toggle ---
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const menuBtn = document.getElementById('menuBtn');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    if (menuBtn) menuBtn.addEventListener('click', () => {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('show');
    });
    if (overlay) overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('show');
    });
}

// --- Clock & Date ---
function initClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
        timeEl.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
            .map(v => String(v).padStart(2, '0')).join(':');
    }
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.querySelector('span').textContent = now.toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
}

// --- Menu Cards ---
function initMenuCards() {
    document.querySelectorAll('.menu-card[data-navigate]').forEach(card => {
        card.addEventListener('click', () => navigateTo(card.getAttribute('data-navigate')));
    });
}

// --- Inbound Dashboard Filter ---
function initInboundFilter() {
    const typeEl = document.getElementById('inbFilterType');
    const dailyGroup = document.getElementById('inbFilterDailyGroup');
    const monthlyGroup = document.getElementById('inbFilterMonthlyGroup');
    const dateEl = document.getElementById('inbFilterDate');
    const monthEl = document.getElementById('inbFilterMonth');

    if (!typeEl) return;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    if (dateEl) dateEl.value = `${yyyy}-${mm}-${dd}`;
    if (monthEl) monthEl.value = `${yyyy}-${mm}`;

    typeEl.addEventListener('change', () => {
        const val = typeEl.value;
        if (dailyGroup) dailyGroup.style.display = val === 'daily' ? '' : 'none';
        if (monthlyGroup) monthlyGroup.style.display = val === 'monthly' ? '' : 'none';
        updateDashboardStats();
    });

    dateEl?.addEventListener('change', () => updateDashboardStats());
    monthEl?.addEventListener('change', () => updateDashboardStats());
}

function normalizeDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function filterByInboundDate(items) {
    const filterType = document.getElementById('inbFilterType')?.value || 'all';
    if (filterType === 'all') return items;

    if (filterType === 'daily') {
        const filterDate = document.getElementById('inbFilterDate')?.value || '';
        if (!filterDate) return items;
        return items.filter(d => normalizeDate(d.date) === filterDate);
    }
    if (filterType === 'monthly') {
        const filterMonth = document.getElementById('inbFilterMonth')?.value || '';
        if (!filterMonth) return items;
        return items.filter(d => {
            const norm = normalizeDate(d.date);
            return norm && norm.startsWith(filterMonth);
        });
    }
    return items;
}

// --- Dashboard Stats (Report) ---
function updateDashboardStats() {
    // Filter arrivals by date, but transactions are NOT date-filtered (H+1 scenario)
    const arrivals = filterByInboundDate(getData(STORAGE_KEYS.arrivals));

    let poReceived = 0;
    let poPending = 0;
    let totalQtyPending = 0;
    let totalPOQty = 0;
    let totalReceiveQty = 0;
    let totalPutawayQty = 0;
    const brandsReceived = new Set();

    arrivals.forEach(a => {
        try {
            const poQty = parseInt(a.poQty) || 0;
            const { receiveQty, putawayQty } = getCalculatedQty(a.receiptNo || '');
            const pendingQty = poQty - receiveQty;

            totalPOQty += poQty;
            totalReceiveQty += receiveQty;
            totalPutawayQty += putawayQty;

            if (a.brand) brandsReceived.add(a.brand.toLowerCase());

            poReceived++;

            if (pendingQty > 0) {
                poPending++;
                totalQtyPending += pendingQty;
            }
        } catch (e) { console.error('Stats error:', e); }
    });

    // Stat cards
    animateCounter('statPOReceived', poReceived);
    animateCounter('statBrandReceived', brandsReceived.size);
    animateCounter('statPOPending', poPending);
    animateCounter('statQtyPending', totalQtyPending);

    // Donut chart
    const completedQty = totalReceiveQty;
    const completedPct = totalPOQty > 0 ? Math.round((completedQty / totalPOQty) * 100) : 0;
    const pendingPct = 100 - completedPct;

    const donut = document.getElementById('donutChart');
    if (donut) {
        donut.style.background = `conic-gradient(
            #34d399 0% ${completedPct}%,
            #f87171 ${completedPct}% 100%
        )`;
        donut.style.boxShadow = completedPct > 50
            ? '0 0 30px rgba(52, 211, 153, 0.15)'
            : '0 0 30px rgba(248, 113, 113, 0.15)';
    }

    const donutPctEl = document.getElementById('donutPercent');
    if (donutPctEl) donutPctEl.textContent = completedPct + '%';

    const setText = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    setText('legendCompleted', completedQty.toLocaleString());
    setText('legendPending', totalQtyPending.toLocaleString());
    setText('legendTotal', totalPOQty.toLocaleString());

    // Bar chart
    const maxQty = Math.max(totalReceiveQty, totalPutawayQty, totalQtyPending, 1);

    const setBar = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.style.width = Math.min((val / maxQty) * 100, 100) + '%';
    };

    setBar('barReceive', totalReceiveQty);
    setBar('barPutaway', totalPutawayQty);
    setBar('barPending', totalQtyPending);

    setText('barReceiveVal', totalReceiveQty.toLocaleString());
    setText('barPutawayVal', totalPutawayQty.toLocaleString());
    setText('barPendingVal', totalQtyPending.toLocaleString());

    // Rate percentages
    const recRate = totalPOQty > 0 ? ((totalReceiveQty / totalPOQty) * 100).toFixed(1) : '0.0';
    const putRate = totalReceiveQty > 0 ? ((totalPutawayQty / totalReceiveQty) * 100).toFixed(1) : '0.0';
    const penRate = totalPOQty > 0 ? ((totalQtyPending / totalPOQty) * 100).toFixed(1) : '0.0';

    setText('receiveRate', recRate + '%');
    setText('putawayRate', putRate + '%');
    setText('pendingRate', penRate + '%');

    calcAvgReceiveToPutaway();
    calcAvgLeadTime();
    renderPendingTable();
    renderVasSummary();
    updateInventoryDashboard();
}

// --- Dashboard Tab Toggle ---
function initDashboardTabs() {
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Toggle active tab
            document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Toggle active panel
            const target = tab.getAttribute('data-tab');
            document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));

            // Toggle menu cards
            const menuInbound = document.querySelector('.dashboard-menu-inbound');
            const menuInventory = document.querySelector('.dashboard-menu-inventory');

            if (target === 'inbound') {
                document.getElementById('dashboardInbound')?.classList.add('active');
                if (menuInbound) menuInbound.style.display = '';
                if (menuInventory) menuInventory.style.display = 'none';
            } else if (target === 'inventory') {
                document.getElementById('dashboardInventory')?.classList.add('active');
                if (menuInbound) menuInbound.style.display = 'none';
                if (menuInventory) menuInventory.style.display = '';
                updateInventoryDashboard();
            }
        });
    });
}

// --- Inventory Dashboard Filter & Stats ---
function initInvFilter() {
    const typeEl = document.getElementById('invFilterType');
    const dailyGroup = document.getElementById('invFilterDailyGroup');
    const monthlyGroup = document.getElementById('invFilterMonthlyGroup');
    const dateEl = document.getElementById('invFilterDate');
    const monthEl = document.getElementById('invFilterMonth');

    if (!typeEl) return;

    // Set default date to today, month to current month
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    if (dateEl) dateEl.value = `${yyyy}-${mm}-${dd}`;
    if (monthEl) monthEl.value = `${yyyy}-${mm}`;

    typeEl.addEventListener('change', () => {
        const val = typeEl.value;
        if (dailyGroup) dailyGroup.style.display = val === 'daily' ? '' : 'none';
        if (monthlyGroup) monthlyGroup.style.display = val === 'monthly' ? '' : 'none';
        updateInventoryDashboard();
    });

    dateEl?.addEventListener('change', () => updateInventoryDashboard());
    monthEl?.addEventListener('change', () => updateInventoryDashboard());
}

function updateInventoryDashboard() {
    let items = getData(STORAGE_KEYS.dcc);

    // Apply filter
    const filterType = document.getElementById('invFilterType')?.value || 'all';
    if (filterType === 'daily') {
        const filterDate = document.getElementById('invFilterDate')?.value || '';
        if (filterDate) items = items.filter(d => normalizeDate(d.date) === filterDate);
    } else if (filterType === 'monthly') {
        const filterMonth = document.getElementById('invFilterMonth')?.value || '';
        if (filterMonth) items = items.filter(d => {
            const norm = normalizeDate(d.date);
            return norm && norm.startsWith(filterMonth);
        });
    }

    const setText = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

    // ===== 1. QTY ACCURACY =====
    let totalSysQty = 0, totalPhyQty = 0, shortageQty = 0, gainQty = 0;

    items.forEach(d => {
        const sys = parseInt(d.sysQty) || 0;
        const phy = parseInt(d.phyQty) || 0;
        totalSysQty += sys;
        totalPhyQty += phy;
        const diff = phy - sys;
        if (diff < 0) shortageQty += Math.abs(diff);
        else if (diff > 0) gainQty += diff;
    });

    const qtyAccuracy = totalSysQty > 0 ? ((totalPhyQty / totalSysQty) * 100).toFixed(2) : '0.00';

    setText('accQtySys', totalSysQty.toLocaleString());
    setText('accQtyPhy', totalPhyQty.toLocaleString());
    setText('accQtyShortage', shortageQty.toLocaleString());
    setText('accQtyGain', gainQty.toLocaleString());
    setText('accQtyPct', qtyAccuracy + '%');

    // ===== 2. SKU ACCURACY =====
    // Group by unique SKU + Owner, sum sysQty and phyQty per group
    const skuMap = {};
    items.forEach(d => {
        const sku = (d.sku || '').trim();
        const owner = (d.owner || '').trim();
        if (!sku) return;
        const key = sku + '|' + owner;
        if (!skuMap[key]) skuMap[key] = { sys: 0, phy: 0 };
        skuMap[key].sys += parseInt(d.sysQty) || 0;
        skuMap[key].phy += parseInt(d.phyQty) || 0;
    });

    const skuKeys = Object.keys(skuMap);
    const totalSkuCount = skuKeys.length;
    let skuMatch = 0, skuUnmatch = 0;

    skuKeys.forEach(sku => {
        if (skuMap[sku].sys === skuMap[sku].phy) skuMatch++;
        else skuUnmatch++;
    });

    const skuAccuracy = totalSkuCount > 0 ? ((skuMatch / totalSkuCount) * 100).toFixed(2) : '0.00';

    setText('accSkuTotal', totalSkuCount.toLocaleString());
    setText('accSkuMatch', skuMatch.toLocaleString());
    setText('accSkuUnmatch', skuUnmatch.toLocaleString());
    setText('accSkuPct', skuAccuracy + '%');

    // ===== 3. LOCATION ACCURACY =====
    // Group by unique Location, sum sysQty and phyQty per Location
    const locMap = {};
    items.forEach(d => {
        const loc = (d.location || '').trim().toLowerCase();
        if (!loc) return;
        if (!locMap[loc]) locMap[loc] = { sys: 0, phy: 0 };
        locMap[loc].sys += parseInt(d.sysQty) || 0;
        locMap[loc].phy += parseInt(d.phyQty) || 0;
    });

    const locKeys = Object.keys(locMap);
    const totalLocCount = locKeys.length;
    let locMatch = 0, locUnmatch = 0;

    locKeys.forEach(loc => {
        if (locMap[loc].sys === locMap[loc].phy) locMatch++;
        else locUnmatch++;
    });

    const locAccuracy = totalLocCount > 0 ? ((locMatch / totalLocCount) * 100).toFixed(2) : '0.00';

    setText('accLocTotal', totalLocCount.toLocaleString());
    setText('accLocMatch', locMatch.toLocaleString());
    setText('accLocUnmatch', locUnmatch.toLocaleString());
    setText('accLocPct', locAccuracy + '%');

    // ===== 4. PROJECT DAMAGE SUMMARY =====
    renderDmgDashboard();

    // ===== 5. QC RETURN REPORT =====
    renderQcrDashboard();

    // ===== 6. % COUNTING TABLE =====
    renderCountingTable(items);

    // ===== 7. ED NOTE TABLE =====
    renderEdNoteTable();
}

// --- % Counting Table on Dashboard ---
function renderCountingTable(dccItems) {
    const tbody = document.getElementById('countingTableBody');
    if (!tbody) return;

    const locations = getData(STORAGE_KEYS.locations);
    if (!dccItems) dccItems = getData(STORAGE_KEYS.dcc);

    // Only include Storage Area and Picking Area
    const allowedTypes = ['storage area', 'picking area'];

    // Group locations by (locationType, zone)
    const locGroups = {};
    locations.forEach(l => {
        const type = (l.locType || '').trim();
        const typeKey = type.toLowerCase();
        if (!allowedTypes.includes(typeKey)) return;
        const zone = (l.zone || '').trim() || '-';
        const key = type + '||' + zone;
        if (!locGroups[key]) locGroups[key] = { type, zone, locations: new Set() };
        const locName = (l.location || '').trim().toLowerCase();
        if (locName) locGroups[key].locations.add(locName);
    });

    // Build DCC map: group by location (lowercase) to check counted + accuracy
    const dccLocMap = {};
    dccItems.forEach(d => {
        const loc = (d.location || '').trim().toLowerCase();
        if (!loc) return;
        if (!dccLocMap[loc]) dccLocMap[loc] = { sys: 0, phy: 0 };
        dccLocMap[loc].sys += parseInt(d.sysQty) || 0;
        dccLocMap[loc].phy += parseInt(d.phyQty) || 0;
    });
    const dccLocSet = new Set(Object.keys(dccLocMap));

    // Build sorted rows
    const rows = Object.values(locGroups).sort((a, b) => {
        const typeOrder = a.type.toLowerCase() < b.type.toLowerCase() ? -1 : 1;
        if (a.type.toLowerCase() !== b.type.toLowerCase()) return typeOrder;
        return a.zone.localeCompare(b.zone);
    });

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Belum ada data Master Location</td></tr>';
        return;
    }

    let html = '';
    let currentType = '';
    let subTotalLoc = 0, subDone = 0, subMatch = 0;
    let grandTotalLoc = 0, grandDone = 0, grandMatch = 0;

    rows.forEach((row, idx) => {
        // Subtotal row when type changes
        if (currentType && currentType !== row.type) {
            const subPct = subTotalLoc > 0 ? ((subDone / subTotalLoc) * 100).toFixed(2) : '0.00';
            const subAcc = subDone > 0 ? ((subMatch / subDone) * 100).toFixed(2) : '0.00';
            html += `<tr style="background:rgba(99,102,241,0.08);font-weight:600;">
                <td colspan="2">Subtotal ${escapeHtml(currentType)}</td>
                <td>${subTotalLoc.toLocaleString()}</td>
                <td>${subDone.toLocaleString()}</td>
                <td>${subMatch.toLocaleString()}</td>
                <td>${subPct}%</td>
                <td>${subAcc}%</td>
            </tr>`;
            subTotalLoc = 0; subDone = 0; subMatch = 0;
        }
        currentType = row.type;

        const totalLoc = row.locations.size;
        let doneCounting = 0;
        let accurateCount = 0;

        row.locations.forEach(loc => {
            if (dccLocSet.has(loc)) {
                doneCounting++;
                const d = dccLocMap[loc];
                if (d && d.sys === d.phy) accurateCount++;
            }
        });

        const pctCounting = totalLoc > 0 ? ((doneCounting / totalLoc) * 100).toFixed(2) : '0.00';
        const accCounting = doneCounting > 0 ? ((accurateCount / doneCounting) * 100).toFixed(2) : '0.00';

        subTotalLoc += totalLoc;
        subDone += doneCounting;
        subMatch += accurateCount;
        grandTotalLoc += totalLoc;
        grandDone += doneCounting;
        grandMatch += accurateCount;

        const pctColor = parseFloat(pctCounting) >= 80 ? 'badge--receive' : parseFloat(pctCounting) >= 50 ? 'badge--break' : 'badge--discrepancy';
        const accColor = parseFloat(accCounting) >= 90 ? 'badge--receive' : parseFloat(accCounting) >= 70 ? 'badge--break' : 'badge--discrepancy';

        html += `<tr>
            <td>${escapeHtml(row.type)}</td>
            <td>${escapeHtml(row.zone)}</td>
            <td>${totalLoc.toLocaleString()}</td>
            <td>${doneCounting.toLocaleString()}</td>
            <td>${accurateCount.toLocaleString()}</td>
            <td><span class="badge ${pctColor}">${pctCounting}%</span></td>
            <td><span class="badge ${accColor}">${accCounting}%</span></td>
        </tr>`;
    });

    // Final subtotal
    if (currentType) {
        const subPct = subTotalLoc > 0 ? ((subDone / subTotalLoc) * 100).toFixed(2) : '0.00';
        const subAcc = subDone > 0 ? ((subMatch / subDone) * 100).toFixed(2) : '0.00';
        html += `<tr style="background:rgba(99,102,241,0.08);font-weight:600;">
            <td colspan="2">Subtotal ${escapeHtml(currentType)}</td>
            <td>${subTotalLoc.toLocaleString()}</td>
            <td>${subDone.toLocaleString()}</td>
            <td>${subMatch.toLocaleString()}</td>
            <td>${subPct}%</td>
            <td>${subAcc}%</td>
        </tr>`;
    }

    // Grand total
    const grandPct = grandTotalLoc > 0 ? ((grandDone / grandTotalLoc) * 100).toFixed(2) : '0.00';
    const grandAcc = grandDone > 0 ? ((grandMatch / grandDone) * 100).toFixed(2) : '0.00';
    html += `<tr style="background:rgba(52,211,153,0.1);font-weight:700;">
        <td colspan="2">Grand Total</td>
        <td>${grandTotalLoc.toLocaleString()}</td>
        <td>${grandDone.toLocaleString()}</td>
        <td>${grandMatch.toLocaleString()}</td>
        <td>${grandPct}%</td>
        <td>${grandAcc}%</td>
    </tr>`;

    tbody.innerHTML = html;
}

// --- ED Note Table (Sellable only, latest update date) ---
function renderEdNoteTable() {
    const tbody = document.getElementById('edNoteTableBody');
    if (!tbody) return;

    const sohData = getData(STORAGE_KEYS.soh);
    const locData = getData(STORAGE_KEYS.locations);

    if (sohData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">Belum ada data Stock On Hand</td></tr>';
        return;
    }

    // Build location → category lookup
    const locCatMap = {};
    locData.forEach(l => {
        if (l.location) locCatMap[l.location.toLowerCase()] = (l.category || '').toLowerCase();
    });

    // Find the latest updateDate (compare by date portion YYYY-MM-DD)
    let latestDate = '';
    sohData.forEach(d => {
        if (d.updateDate) {
            const dateOnly = d.updateDate.substring(0, 10);
            if (dateOnly > latestDate) latestDate = dateOnly;
        }
    });

    // Filter: only latest updateDate (by date) + sellable locations
    const filtered = sohData.filter(d => {
        const dateOnly = (d.updateDate || '').substring(0, 10);
        if (dateOnly !== latestDate) return false;
        const loc = (d.location || '').toLowerCase();
        const cat = locCatMap[loc] || '';
        return cat === 'sellable';
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">Tidak ada data sellable untuk tanggal terbaru</td></tr>';
        return;
    }

    // ED categories mapping
    const ED_CATS = ['Expired', '< 1 Month', '< 2 Month', '< 3 Month', '3 - 6 Month', '6 - 12 Month', '1yr++', '-'];

    // Group by brand
    const brandMap = {};
    filtered.forEach(d => {
        const brand = (d.skuBrand || '').trim().toUpperCase() || 'UNKNOWN';
        if (!brandMap[brand]) {
            brandMap[brand] = { 'Expired': 0, '< 1 Month': 0, '< 2 Month': 0, '< 3 Month': 0, '3 - 6 Month': 0, '6 - 12 Month': 0, '1yr++': 0, '-': 0 };
        }
        const edNote = calcEdNote(d.expDate, d.updateDate);
        const qty = parseInt(d.qty) || 0;
        if (brandMap[brand].hasOwnProperty(edNote)) {
            brandMap[brand][edNote] += qty;
        } else {
            brandMap[brand]['-'] += qty;
        }
    });

    // Sort brands alphabetically
    const brands = Object.keys(brandMap).sort();

    // Totals
    const totals = { 'Expired': 0, '< 1 Month': 0, '< 2 Month': 0, '< 3 Month': 0, '3 - 6 Month': 0, '6 - 12 Month': 0, '1yr++': 0, '-': 0 };

    let html = '';
    brands.forEach(brand => {
        const row = brandMap[brand];
        ED_CATS.forEach(cat => totals[cat] += row[cat]);
        html += `<tr>
            <td>${escapeHtml(brand)}</td>
            <td>${row['Expired'].toLocaleString()}</td>
            <td>${row['< 1 Month'].toLocaleString()}</td>
            <td>${row['< 2 Month'].toLocaleString()}</td>
            <td>${row['< 3 Month'].toLocaleString()}</td>
            <td>${row['3 - 6 Month'].toLocaleString()}</td>
            <td>${row['6 - 12 Month'].toLocaleString()}</td>
            <td>${row['1yr++'].toLocaleString()}</td>
            <td>${row['-'].toLocaleString()}</td>
        </tr>`;
    });

    // Total row
    html += `<tr class="ed-total-row">
        <td>Total</td>
        <td>${totals['Expired'].toLocaleString()}</td>
        <td>${totals['< 1 Month'].toLocaleString()}</td>
        <td>${totals['< 2 Month'].toLocaleString()}</td>
        <td>${totals['< 3 Month'].toLocaleString()}</td>
        <td>${totals['3 - 6 Month'].toLocaleString()}</td>
        <td>${totals['6 - 12 Month'].toLocaleString()}</td>
        <td>${totals['1yr++'].toLocaleString()}</td>
        <td>${totals['-'].toLocaleString()}</td>
    </tr>`;

    tbody.innerHTML = html;
}
// --- Project Damage Dashboard Report ---
function renderDmgDashboard() {
    const items = getData(STORAGE_KEYS.damage);

    // --- 1. Damage Note Table ---
    const noteMap = {};
    items.forEach(d => {
        const note = d.note || 'Unknown';
        if (!noteMap[note]) noteMap[note] = { skus: new Set(), qty: 0 };
        if (d.sku) noteMap[note].skus.add(d.sku);
        noteMap[note].qty += parseInt(d.qty) || 0;
    });

    const noteBody = document.getElementById('rptDmgNoteBody');
    if (noteBody) {
        const sortedNotes = Object.entries(noteMap).sort((a, b) => b[1].qty - a[1].qty);
        noteBody.innerHTML = sortedNotes.map(([note, data]) => `
            <tr>
                <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(note)}">${escapeHtml(note)}</td>
                <td style="text-align:center;">${data.skus.size}</td>
                <td style="text-align:center;">${data.qty.toLocaleString()}</td>
            </tr>`
        ).join('') || '<tr><td colspan="3" style="text-align:center; color: var(--text-secondary);">Belum ada data</td></tr>';
    }

    // --- 2. Brand Table ---
    const brandMap = {};
    items.forEach(d => {
        const brand = d.brand || 'Unknown';
        if (!brandMap[brand]) brandMap[brand] = { skus: new Set(), qty: 0 };
        if (d.sku) brandMap[brand].skus.add(d.sku);
        brandMap[brand].qty += parseInt(d.qty) || 0;
    });

    const brandBody = document.getElementById('rptDmgBrandBody');
    if (brandBody) {
        const sortedBrands = Object.entries(brandMap).sort((a, b) => b[1].qty - a[1].qty);
        brandBody.innerHTML = sortedBrands.map(([brand, data]) => `
            <tr>
                <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(brand)}">${escapeHtml(brand)}</td>
                <td style="text-align:center;">${data.skus.size}</td>
                <td style="text-align:center;">${data.qty.toLocaleString()}</td>
            </tr>`
        ).join('') || '<tr><td colspan="3" style="text-align:center; color: var(--text-secondary);">Belum ada data</td></tr>';
    }

    // --- 3. Donut Chart (% per damage note) ---
    const pieColors = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4'];
    const pieEl = document.getElementById('dmgPieChart');
    const legendEl = document.getElementById('dmgPieLegend');

    if (pieEl && legendEl) {
        const totalQty = items.reduce((s, d) => s + (parseInt(d.qty) || 0), 0);
        const sortedNotes = Object.entries(noteMap).sort((a, b) => b[1].qty - a[1].qty);

        if (sortedNotes.length === 0 || totalQty === 0) {
            pieEl.style.background = 'var(--border)';
            pieEl.style.boxShadow = 'none';
            legendEl.innerHTML = '<div class="donut-legend-row"><span class="donut-legend-label" style="color:var(--text-secondary); text-align:center; width:100%;">Belum ada data</span></div>';
        } else {
            // Build conic-gradient based on qty
            let gradientParts = [];
            let cumPct = 0;
            sortedNotes.forEach(([note, data], i) => {
                const pct = (data.qty / totalQty) * 100;
                const color = pieColors[i % pieColors.length];
                gradientParts.push(`${color} ${cumPct}% ${cumPct + pct}%`);
                cumPct += pct;
            });
            pieEl.style.background = `conic-gradient(${gradientParts.join(', ')})`;
            pieEl.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.2)';

            // Build legend with %
            legendEl.innerHTML = sortedNotes.map(([note, data], i) => {
                const color = pieColors[i % pieColors.length];
                const pct = ((data.qty / totalQty) * 100).toFixed(1);
                return `<div class="donut-legend-row">
                    <span class="donut-legend-dot" style="background:${color};"></span>
                    <span class="donut-legend-label">${escapeHtml(note)}</span>
                    <span class="donut-legend-value">${pct}%</span>
                </div>`;
            }).join('');
        }
    }
}

// --- QC Return Dashboard Report ---
function renderQcrDashboard() {
    const items = getData(STORAGE_KEYS.qcReturn);

    // Build SKU→Brand lookup from latest SOH
    const latestSoh = getLatestSohData();
    const skuBrandMap = {};
    latestSoh.forEach(s => {
        if (s.sku && s.skuBrand) skuBrandMap[s.sku.toLowerCase()] = s.skuBrand;
    });

    // --- 1. Brand Table (Good / Damage) ---
    const brandMap = {};
    items.forEach(d => {
        const brand = d.brand || skuBrandMap[(d.sku || '').toLowerCase()] || 'Unknown';
        if (!brandMap[brand]) brandMap[brand] = { good: 0, damage: 0 };
        const status = (d.status || 'Good').toLowerCase();
        const qty = parseInt(d.qty) || 0;
        if (status === 'damage') {
            brandMap[brand].damage += qty;
        } else {
            brandMap[brand].good += qty;
        }
    });

    const brandBody = document.getElementById('rptQcrBrandBody');
    if (brandBody) {
        const sortedBrands = Object.entries(brandMap).sort((a, b) => (b[1].good + b[1].damage) - (a[1].good + a[1].damage));
        brandBody.innerHTML = sortedBrands.map(([brand, data]) => `
            <tr>
                <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(brand)}">${escapeHtml(brand)}</td>
                <td style="text-align:center;color: var(--accent-green); font-weight: 600;">${data.good.toLocaleString()}</td>
                <td style="text-align:center;color: var(--accent-red); font-weight: 600;">${data.damage.toLocaleString()}</td>
            </tr>`
        ).join('') || '<tr><td colspan="3" style="text-align:center; color: var(--text-secondary);">Belum ada data</td></tr>';
    }

    // --- 2. QC By Productivity Bar Chart ---
    const opMap = {};
    items.forEach(d => {
        const op = d.operator || 'Unknown';
        if (!opMap[op]) opMap[op] = 0;
        opMap[op] += parseInt(d.qty) || 0;
    });

    const chartEl = document.getElementById('qcrProductivityChart');
    if (chartEl) {
        const sortedOps = Object.entries(opMap).sort((a, b) => b[1] - a[1]);
        const maxVal = sortedOps.length > 0 ? sortedOps[0][1] : 1;

        if (sortedOps.length === 0) {
            chartEl.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:24px;">Belum ada data</div>';
        } else {
            chartEl.innerHTML = sortedOps.map(([op, qty]) => {
                const pct = (qty / maxVal) * 100;
                return `<div class="hbar-row">
                    <span class="hbar-label" title="${escapeHtml(op)}">${escapeHtml(op)}</span>
                    <div class="hbar-track">
                        <div class="hbar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <span class="hbar-value">${qty.toLocaleString()}</span>
                </div>`;
            }).join('');
        }
    }
}

function renderPendingTable() {
    const tbody = document.getElementById('pendingTableBody');
    const emptyEl = document.getElementById('pendingEmpty');
    const table = document.getElementById('pendingTable');
    if (!tbody) return;

    const arrivals = filterByInboundDate(getData(STORAGE_KEYS.arrivals));
    const pendingList = [];

    arrivals.forEach(a => {
        const { receiveQty } = getCalculatedQty(a.receiptNo || '');
        const poQty = parseInt(a.poQty) || 0;
        const pendingQty = poQty - receiveQty;
        if (pendingQty > 0) {
            pendingList.push({ ...a, pendingQty });
        }
    });

    if (pendingList.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    tbody.innerHTML = pendingList.map((p, i) => {
        const dateFormatted = p.date ? formatDate(p.date) : '-';
        return `
        <tr>
            <td>${i + 1}</td>
            <td>${dateFormatted}</td>
            <td>${escapeHtml(p.brand)}</td>
            <td><strong>${escapeHtml(p.receiptNo)}</strong></td>
            <td>${escapeHtml(p.poNo)}</td>
            <td class="qty-negative">${p.pendingQty.toLocaleString()}</td>
            <td>${escapeHtml(p.note || '-')}</td>
        </tr>`;
    }).join('');
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderVasSummary() {
    const listEl = document.getElementById('vasTypeList');
    const emptyEl = document.getElementById('vasSummaryEmpty');
    if (!listEl) return;

    const vasList = filterByInboundDate(getData(STORAGE_KEYS.vas));

    // Parse duration string "HH:MM:SS" to seconds
    function parseDurationToSec(dur) {
        if (!dur) return 0;
        const parts = dur.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    }

    // Format seconds to readable string
    function fmtAvgTime(sec) {
        if (sec <= 0) return '-';
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        let r = '';
        if (d > 0) r += `${d}d `;
        if (h > 0 || d > 0) r += `${h}h `;
        r += `${m}m`;
        return r.trim();
    }

    // 2. Avg Qty VAS per Operator per Hari
    const totalQty = vasList.reduce((sum, v) => sum + (parseInt(v.qty) || 0), 0);
    const operatorSet = new Set(vasList.map(v => (v.operator || '').toLowerCase()).filter(Boolean));
    const daySet = new Set(vasList.map(v => v.date).filter(Boolean));
    const numOps = operatorSet.size || 1;
    const numDays = daySet.size || 1;
    const avgQtyPerOpDay = Math.round(totalQty / numOps / numDays).toLocaleString();
    setText('statVasAvgPerOp', totalQty > 0 ? avgQtyPerOpDay : '-');

    // 3. Avg Qty VAS per Hari
    const avgQtyPerDay = Math.round(totalQty / numDays).toLocaleString();
    setText('statVasAvgQtyDay', totalQty > 0 ? avgQtyPerDay : '-');

    // Group by vasType
    const grouped = {};
    vasList.forEach(v => {
        const type = v.vasType || 'Unknown';
        if (!grouped[type]) grouped[type] = { qty: 0, skus: new Set(), brands: new Set() };
        grouped[type].qty += (parseInt(v.qty) || 0);
        if (v.sku) grouped[type].skus.add(v.sku.toLowerCase());
        if (v.brand) grouped[type].brands.add(v.brand.toLowerCase());
    });

    const entries = Object.entries(grouped).sort((a, b) => b[1].qty - a[1].qty);
    const dotColors = ['#34d399', '#818cf8', '#fb923c', '#f87171', '#38bdf8', '#facc15', '#a78bfa', '#fb7185'];

    if (entries.length === 0) {
        listEl.innerHTML = '';
        emptyEl.classList.add('show');
        return;
    }

    emptyEl.classList.remove('show');

    listEl.innerHTML = entries.map(([type, data], i) => `
        <div class="legend-item">
            <span class="legend-dot" style="background: ${dotColors[i % dotColors.length]}"></span>
            <span class="legend-text">${escapeHtml(type)} <small style="color:var(--text-secondary)">(${data.skus.size} SKU, ${data.brands.size} Brand)</small></span>
            <strong class="legend-value">${data.qty.toLocaleString()}</strong>
        </div>
    `).join('');
}
function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;

    const current = parseInt(el.textContent.replace(/\D/g, '')) || 0;
    if (current === target) { el.textContent = target.toLocaleString(); return; }

    const duration = 600;
    const steps = 30;
    const stepTime = duration / steps;
    const increment = (target - current) / steps;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        if (step >= steps) {
            el.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            el.textContent = Math.round(current + increment * step).toLocaleString();
        }
    }, stepTime);
}

// ========================================
// EXPORT / IMPORT UTILITIES
// ========================================

function exportToCSV(storageKey, filename, headers, rowMapper) {
    const data = getData(storageKey);
    if (data.length === 0) {
        alert('Tidak ada data untuk di-export.');
        return;
    }

    const csvRows = [headers.join(',')];
    data.forEach(item => {
        const row = rowMapper(item).map(val => {
            const str = String(val ?? '');
            // Escape quotes and wrap in quotes if contains comma/quote/newline
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        });
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function importFromCSV(storageKey, expectedHeaders, rowParser, onComplete) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target.result.replace(/^\uFEFF/, ''); // Remove BOM
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                if (lines.length < 2) {
                    alert('File CSV kosong atau hanya berisi header.');
                    return;
                }

                // Parse CSV line (handles quoted fields)
                const parseCSVLine = (line) => {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            if (inQuotes && line[i + 1] === '"') {
                                current += '"';
                                i++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (char === ',' && !inQuotes) {
                            result.push(current);
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current);
                    return result;
                };

                // Auto-detect column mapping from CSV header
                const csvHeaders = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
                const expectedLower = expectedHeaders.map(h => h.toLowerCase());

                // Build index map: for each expected header, find its position in the CSV
                const colMap = [];
                expectedLower.forEach((eh, idx) => {
                    const normalizedEh = eh.replace(/[_\-#]/g, ' ').trim();
                    const csvIdx = csvHeaders.findIndex(ch => {
                        const normalizedCh = ch.replace(/[_\-#]/g, ' ').trim();
                        return ch === eh || normalizedCh === normalizedEh;
                    });
                    colMap.push(csvIdx);
                });

                // Parse data rows using mapped column positions
                const existingData = getData(storageKey);
                let importCount = 0;

                for (let i = 1; i < lines.length; i++) {
                    const rawValues = parseCSVLine(lines[i]);
                    // Rearrange values according to column map
                    const mappedValues = colMap.map(idx => idx >= 0 ? rawValues[idx] : '');
                    const parsed = rowParser(mappedValues);
                    if (parsed) {
                        parsed.id = generateId();
                        parsed.createdAt = new Date().toISOString();
                        existingData.push(parsed);
                        importCount++;
                    }
                }

                setData(storageKey, existingData);
                alert(`Berhasil import ${importCount} data.`);
                if (onComplete) onComplete();
            } catch (err) {
                alert('Gagal membaca file CSV: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ========================================
// INBOUND TRANSACTION
// ========================================
function initTransactionPage() {
    const modal = document.getElementById('modalTransaction');
    const form = document.getElementById('formTransaction');
    const btnAdd = document.getElementById('btnAddTransaction');
    const btnClose = document.getElementById('closeModalTransaction');
    const btnCancel = document.getElementById('cancelTransaction');
    const searchInput = document.getElementById('searchTransaction');

    btnAdd?.addEventListener('click', () => openTransactionModal());
    btnClose?.addEventListener('click', () => closeModal(modal));
    btnCancel?.addEventListener('click', () => closeModal(modal));
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTransaction();
    });

    searchInput?.addEventListener('input', () => { pageState.Transaction.current = 1; renderTransactionTable(searchInput.value); });

    // Export/Import
    document.getElementById('btnExportTransaction')?.addEventListener('click', () => {
        exportToCSV(
            STORAGE_KEYS.transactions,
            'inbound_transaction.csv',
            ['Tanggal Transaksi', 'Time Transaction', 'Receipt No', 'SKU', 'Operate Type', 'Qty', 'Operator'],
            (t) => [t.date || '', t.timeTransaction || '', t.receiptNo, t.sku, t.operateType, t.qty, t.operator]
        );
    });

    document.getElementById('btnImportTransaction')?.addEventListener('click', () => {
        importFromCSV(
            STORAGE_KEYS.transactions,
            ['Tanggal Transaksi', 'Time Transaction', 'Receipt No', 'SKU', 'Operate Type', 'Qty', 'Operator'],
            (vals) => {
                if (vals.length < 5) return null;
                return {
                    date: vals[0]?.trim() || '',
                    timeTransaction: vals[1]?.trim() || '',
                    receiptNo: vals[2]?.trim() || '',
                    sku: vals[3]?.trim() || '',
                    operateType: (vals[4]?.trim() || '').toLowerCase(),
                    qty: parseInt(vals[5]) || 0,
                    operator: vals[6]?.trim() || ''
                };
            },
            () => { renderTransactionTable(); renderArrivalTable(); updateDashboardStats(); }
        );
    });

    renderTransactionTable();

    initBulkActions('Transaction', STORAGE_KEYS.transactions,
        ['Tanggal Transaksi', 'Time Transaction', 'Receipt No', 'SKU', 'Operate Type', 'Qty', 'Operator'],
        (t) => [t.date || '', t.timeTransaction || '', t.receiptNo, t.sku, t.operateType, t.qty, t.operator],
        renderTransactionTable
    );
}

function openTransactionModal(editId = null) {
    const modal = document.getElementById('modalTransaction');
    const title = document.getElementById('modalTransactionTitle');
    const editIdField = document.getElementById('transactionEditId');
    const form = document.getElementById('formTransaction');

    form.reset();
    editIdField.value = '';

    if (editId) {
        const transactions = getData(STORAGE_KEYS.transactions);
        const item = transactions.find(t => t.id === editId);
        if (item) {
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Inbound Transaction';
            editIdField.value = editId;
            document.getElementById('transDate').value = item.date || '';
            document.getElementById('transTime').value = item.timeTransaction ? isoToLocalInput(item.timeTransaction) : '';
            document.getElementById('transReceiptNo').value = item.receiptNo;
            document.getElementById('transSKU').value = item.sku;
            document.getElementById('transOperateType').value = item.operateType;
            document.getElementById('transQty').value = item.qty;
            document.getElementById('transOperator').value = item.operator;
        }
    } else {
        title.innerHTML = '<i class="fas fa-exchange-alt"></i> Tambah Inbound Transaction';
        // Auto-fill current datetime
        const now = new Date();
        const yyyy = now.getFullYear();
        const mo = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        document.getElementById('transTime').value = `${yyyy}-${mo}-${dd}T${hh}:${mm}:${ss}`;
    }

    modal.classList.add('show');
}

async function saveTransaction() {
    const editId = document.getElementById('transactionEditId').value;
    const data = {
        date: document.getElementById('transDate').value,
        timeTransaction: localInputToCustomFormat(document.getElementById('transTime').value),
        receiptNo: document.getElementById('transReceiptNo').value.trim(),
        sku: document.getElementById('transSKU').value.trim(),
        operateType: document.getElementById('transOperateType').value,
        qty: parseInt(document.getElementById('transQty').value) || 0,
        operator: document.getElementById('transOperator').value.trim()
    };

    // Try API first
    if (typeof isApiAvailable === 'function' && isApiAvailable()) {
        if (editId) {
            await apiPut(STORAGE_KEYS.transactions, editId, data);
        } else {
            await apiPost(STORAGE_KEYS.transactions, data);
        }
        await syncFromApi();
    } else {
        // Fallback to localStorage
        let transactions = getData(STORAGE_KEYS.transactions);
        if (editId) {
            const idx = transactions.findIndex(t => t.id === editId);
            if (idx !== -1) transactions[idx] = { ...transactions[idx], ...data };
        } else {
            data.id = generateId();
            data.createdAt = new Date().toISOString();
            transactions.push(data);
        }
        setData(STORAGE_KEYS.transactions, transactions);
    }

    closeModal(document.getElementById('modalTransaction'));
    renderTransactionTable();
    renderArrivalTable();
    updateDashboardStats();
}

async function deleteTransaction(id) {
    if (!canDelete()) { showToast('Hanya Supervisor/Leader yang bisa menghapus data', 'error'); return; }
    if (!confirm('Hapus transaksi ini?')) return;

    if (typeof isApiAvailable === 'function' && isApiAvailable()) {
        await apiDelete(STORAGE_KEYS.transactions, id);
        await syncFromApi();
    } else {
        let transactions = getData(STORAGE_KEYS.transactions);
        transactions = transactions.filter(t => t.id !== id);
        setData(STORAGE_KEYS.transactions, transactions);
    }

    renderTransactionTable();
    renderArrivalTable();
    updateDashboardStats();
}

function renderTransactionTable(search = '') {
    const tbody = document.getElementById('transactionTableBody');
    const emptyEl = document.getElementById('transactionEmpty');
    const table = document.getElementById('transactionTable');
    if (!tbody) return;

    let transactions = getData(STORAGE_KEYS.transactions);

    if (search) {
        const q = search.toLowerCase();
        transactions = transactions.filter(t =>
            t.receiptNo.toLowerCase().includes(q) ||
            t.sku.toLowerCase().includes(q) ||
            t.operateType.toLowerCase().includes(q) ||
            t.operator.toLowerCase().includes(q)
        );
    }

    if (transactions.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        renderPagination('Transaction', 0, renderTransactionTable);
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    const { start, end } = renderPagination('Transaction', transactions.length, renderTransactionTable);
    const pageData = transactions.slice(start, end);

    tbody.innerHTML = pageData.map((t, i) => `
        <tr>
            <td class="td-checkbox"><input type="checkbox" class="row-check" data-id="${t.id}" onchange="updateBulkButtons('Transaction')"></td>
            <td>${start + i + 1}</td>
            <td>${t.date ? formatDate(t.date) : '-'}</td>
            <td>${escapeHtml(t.timeTransaction || '-')}</td>
            <td><strong>${escapeHtml(t.receiptNo)}</strong></td>
            <td>${escapeHtml(t.sku)}</td>
            <td><span class="badge badge--${t.operateType}">${t.operateType}</span></td>
            <td class="qty-positive">${t.qty.toLocaleString()}</td>
            <td>${escapeHtml(t.operator)}</td>
            <td>
                <div class="action-cell">
                    <button class="btn btn--edit" onclick="openTransactionModal('${t.id}')" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn--danger" onclick="deleteTransaction('${t.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ========================================
// INBOUND ARRIVAL
// ========================================
function initArrivalPage() {
    const modal = document.getElementById('modalArrival');
    const form = document.getElementById('formArrival');
    const btnAdd = document.getElementById('btnAddArrival');
    const btnClose = document.getElementById('closeModalArrival');
    const btnCancel = document.getElementById('cancelArrival');
    const searchInput = document.getElementById('searchArrival');

    btnAdd?.addEventListener('click', () => openArrivalModal());
    btnClose?.addEventListener('click', () => closeModal(modal));
    btnCancel?.addEventListener('click', () => closeModal(modal));
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveArrival();
    });

    searchInput?.addEventListener('input', () => { pageState.Arrival.current = 1; renderArrivalTable(searchInput.value); });

    // Export/Import
    document.getElementById('btnExportArrival')?.addEventListener('click', () => {
        const transactions = getData(STORAGE_KEYS.transactions);
        const data = getData(STORAGE_KEYS.arrivals);
        if (data.length === 0) { alert('Tidak ada data untuk di-export.'); return; }

        const headers = ['Tanggal Kedatangan', 'Waktu Kedatangan', 'Brand', 'Receipt No', 'PO No', 'PO Qty', 'Receive Qty', 'Putaway Qty', 'Pending Qty', 'Operator', 'Note'];
        const csvRows = [headers.join(',')];
        data.forEach(a => {
            const { receiveQty, putawayQty } = getCalculatedQty(a.receiptNo);
            const pendingQty = a.poQty - receiveQty;
            const timeFormatted = a.arrivalTime ? fmtArrivalTime(a.arrivalTime) : '';
            csvRows.push([a.date, timeFormatted, a.brand, a.receiptNo, a.poNo, a.poQty, receiveQty, putawayQty, pendingQty, a.operator || '', a.note || ''].map(v => {
                const s = String(v ?? '');
                return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
            }).join(','));
        });

        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'inbound_arrival.csv'; a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('btnImportArrival')?.addEventListener('click', () => {
        importFromCSV(
            STORAGE_KEYS.arrivals,
            ['Tanggal Kedatangan', 'Waktu Kedatangan', 'Brand', 'Receipt No', 'PO No', 'PO Qty', 'Operator', 'Note'],
            (vals) => {
                if (vals.length < 5) return null;
                return {
                    date: vals[0]?.trim() || '',
                    arrivalTime: vals[1]?.trim() || '',
                    brand: vals[2]?.trim() || '',
                    receiptNo: vals[3]?.trim() || '',
                    poNo: vals[4]?.trim() || '',
                    poQty: parseInt(vals[5]) || 0,
                    operator: vals[6]?.trim() || '',
                    note: vals[7]?.trim() || ''
                };
            },
            () => { renderArrivalTable(); updateDashboardStats(); }
        );
    });

    renderArrivalTable();

    initBulkActions('Arrival', STORAGE_KEYS.arrivals,
        ['Tanggal', 'Brand', 'Receipt No', 'PO No', 'PO Qty', 'Operator', 'Note'],
        (a) => [a.date || '', a.brand, a.receiptNo, a.poNo, a.poQty, a.operator || '', a.note || ''],
        renderArrivalTable
    );
}

function openArrivalModal(editId = null) {
    const modal = document.getElementById('modalArrival');
    const title = document.getElementById('modalArrivalTitle');
    const editIdField = document.getElementById('arrivalEditId');
    const form = document.getElementById('formArrival');

    form.reset();
    editIdField.value = '';

    if (editId) {
        const arrivals = getData(STORAGE_KEYS.arrivals);
        const item = arrivals.find(a => a.id === editId);
        if (item) {
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Inbound Arrival';
            editIdField.value = editId;
            document.getElementById('arrivalDate').value = item.date;
            document.getElementById('arrivalTime').value = item.arrivalTime ? isoToLocalInput(item.arrivalTime) : '';
            document.getElementById('arrivalBrand').value = item.brand;
            document.getElementById('arrivalReceiptNo').value = item.receiptNo;
            document.getElementById('arrivalPONo').value = item.poNo;
            document.getElementById('arrivalPOQty').value = item.poQty;
            document.getElementById('arrivalOperator').value = item.operator || '';
            document.getElementById('arrivalNote').value = item.note || '';
        }
    } else {
        title.innerHTML = '<i class="fas fa-truck-loading"></i> Tambah Inbound Arrival';
        // Auto-fill current datetime
        const now = new Date();
        const yyyy = now.getFullYear();
        const mo = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        document.getElementById('arrivalTime').value = `${yyyy}-${mo}-${dd}T${hh}:${mm}:${ss}`;
    }

    modal.classList.add('show');
}

async function saveArrival() {
    const editId = document.getElementById('arrivalEditId').value;
    const data = {
        date: document.getElementById('arrivalDate').value,
        arrivalTime: localInputToCustomFormat(document.getElementById('arrivalTime').value),
        brand: document.getElementById('arrivalBrand').value.trim(),
        receiptNo: document.getElementById('arrivalReceiptNo').value.trim(),
        poNo: document.getElementById('arrivalPONo').value.trim(),
        poQty: parseInt(document.getElementById('arrivalPOQty').value) || 0,
        operator: document.getElementById('arrivalOperator').value.trim(),
        note: document.getElementById('arrivalNote').value.trim()
    };

    if (typeof isApiAvailable === 'function' && isApiAvailable()) {
        if (editId) {
            await apiPut(STORAGE_KEYS.arrivals, editId, data);
        } else {
            await apiPost(STORAGE_KEYS.arrivals, data);
        }
        await syncFromApi();
    } else {
        let arrivals = getData(STORAGE_KEYS.arrivals);
        if (editId) {
            const idx = arrivals.findIndex(a => a.id === editId);
            if (idx !== -1) arrivals[idx] = { ...arrivals[idx], ...data };
        } else {
            data.id = generateId();
            data.createdAt = new Date().toISOString();
            arrivals.push(data);
        }
        setData(STORAGE_KEYS.arrivals, arrivals);
    }

    closeModal(document.getElementById('modalArrival'));
    renderArrivalTable();
    updateDashboardStats();
}

async function deleteArrival(id) {
    if (!canDelete()) { showToast('Hanya Supervisor/Leader yang bisa menghapus data', 'error'); return; }
    if (!confirm('Hapus data arrival ini?')) return;

    if (typeof isApiAvailable === 'function' && isApiAvailable()) {
        await apiDelete(STORAGE_KEYS.arrivals, id);
        await syncFromApi();
    } else {
        let arrivals = getData(STORAGE_KEYS.arrivals);
        arrivals = arrivals.filter(a => a.id !== id);
        setData(STORAGE_KEYS.arrivals, arrivals);
    }

    renderArrivalTable();
    updateDashboardStats();
}

function getCalculatedQty(receiptNo) {
    const transactions = getData(STORAGE_KEYS.transactions);
    let receiveQty = 0;
    let putawayQty = 0;

    transactions.forEach(t => {
        if (t.receiptNo && receiptNo && t.receiptNo.toLowerCase() === receiptNo.toLowerCase()) {
            if (t.operateType === 'receive') receiveQty += (parseInt(t.qty) || 0);
            else if (t.operateType === 'putaway') putawayQty += (parseInt(t.qty) || 0);
        }
    });

    return { receiveQty, putawayQty };
}

function renderArrivalTable(search = '') {
    const tbody = document.getElementById('arrivalTableBody');
    const emptyEl = document.getElementById('arrivalEmpty');
    const table = document.getElementById('arrivalTable');
    if (!tbody) return;

    let arrivals = getData(STORAGE_KEYS.arrivals);

    if (search) {
        const q = search.toLowerCase();
        arrivals = arrivals.filter(a =>
            a.receiptNo.toLowerCase().includes(q) ||
            a.brand.toLowerCase().includes(q) ||
            a.poNo.toLowerCase().includes(q) ||
            a.date.includes(q)
        );
    }

    if (arrivals.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        renderPagination('Arrival', 0, renderArrivalTable);
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    const { start, end } = renderPagination('Arrival', arrivals.length, renderArrivalTable);
    const pageData = arrivals.slice(start, end);

    tbody.innerHTML = pageData.map((a, i) => {
        const { receiveQty, putawayQty } = getCalculatedQty(a.receiptNo);
        const pendingQty = a.poQty - receiveQty;
        const dateFormatted = a.date ? formatDate(a.date) : '-';
        const timeFormatted = a.arrivalTime || '-';
        let pendingClass = 'qty-zero';
        if (pendingQty > 0) pendingClass = 'qty-negative';
        else if (pendingQty === 0) pendingClass = 'qty-positive';

        return `
        <tr>
            <td class="td-checkbox"><input type="checkbox" class="row-check" data-id="${a.id}" onchange="updateBulkButtons('Arrival')"></td>
            <td>${start + i + 1}</td>
            <td>${dateFormatted}</td>
            <td>${escapeHtml(timeFormatted)}</td>
            <td>${escapeHtml(a.brand)}</td>
            <td><strong>${escapeHtml(a.receiptNo)}</strong></td>
            <td>${escapeHtml(a.poNo)}</td>
            <td>${a.poQty.toLocaleString()}</td>
            <td class="qty-positive">${receiveQty.toLocaleString()}</td>
            <td><span class="badge badge--putaway">${putawayQty.toLocaleString()}</span></td>
            <td class="${pendingClass}">${pendingQty.toLocaleString()}</td>
            <td>${escapeHtml(a.operator || '-')}</td>
            <td>${escapeHtml(a.note || '-')}</td>
            <td>
                <div class="action-cell">
                    <button class="btn btn--edit" onclick="openArrivalModal('${a.id}')" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn--danger" onclick="deleteArrival('${a.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ========================================
// VAS
// ========================================
function initVasPage() {
    const modal = document.getElementById('modalVas');
    const form = document.getElementById('formVas');
    const btnAdd = document.getElementById('btnAddVas');
    const btnClose = document.getElementById('closeModalVas');
    const btnCancel = document.getElementById('cancelVas');
    const searchInput = document.getElementById('searchVas');

    btnAdd?.addEventListener('click', () => openVasModal());
    btnClose?.addEventListener('click', () => closeModal(modal));
    btnCancel?.addEventListener('click', () => closeModal(modal));
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveVas();
    });

    searchInput?.addEventListener('input', () => { pageState.Vas.current = 1; renderVasTable(searchInput.value); });

    // Export/Import
    document.getElementById('btnExportVas')?.addEventListener('click', () => {
        exportToCSV(
            STORAGE_KEYS.vas,
            'vas_data.csv',
            ['Start Time', 'End Time', 'Duration', 'Brand', 'SKU', 'Tipe VAS', 'Qty', 'Operator'],
            (v) => [v.startTime || v.date || '', v.endTime || '', v.duration || '', v.brand || '', v.sku, v.vasType, v.qty, v.operator]
        );
    });

    document.getElementById('btnImportVas')?.addEventListener('click', () => {
        importFromCSV(
            STORAGE_KEYS.vas,
            ['Tanggal', 'Brand', 'SKU', 'Tipe VAS', 'Qty', 'Operator'],
            (vals) => {
                if (vals.length < 5) return null;
                return {
                    date: vals[0]?.trim() || '',
                    brand: vals[1]?.trim() || '',
                    sku: vals[2]?.trim() || '',
                    vasType: vals[3]?.trim() || '',
                    qty: parseInt(vals[4]) || 0,
                    operator: vals[5]?.trim() || ''
                };
            },
            () => { renderVasTable(); updateDashboardStats(); }
        );
    });

    renderVasTable();

    initBulkActions('Vas', STORAGE_KEYS.vas,
        ['Start Time', 'End Time', 'Duration', 'Brand', 'SKU', 'Tipe VAS', 'Qty', 'Operator'],
        (v) => [v.startTime || v.date || '', v.endTime || '', v.duration || '', v.brand || '', v.sku, v.vasType, v.qty, v.operator],
        renderVasTable
    );

    // --- VAS Task Workflow ---
    initVasTaskWorkflow();
}

function openVasModal(editId = null) {
    const modal = document.getElementById('modalVas');
    const title = document.getElementById('modalVasTitle');
    const editIdField = document.getElementById('vasEditId');
    const form = document.getElementById('formVas');

    form.reset();
    editIdField.value = '';

    if (editId) {
        const vasList = getData(STORAGE_KEYS.vas);
        const item = vasList.find(v => v.id === editId);
        if (item) {
            title.innerHTML = '<i class="fas fa-edit"></i> Edit VAS';
            editIdField.value = editId;
            document.getElementById('vasDate').value = item.date;
            document.getElementById('vasBrand').value = item.brand || '';
            document.getElementById('vasSKU').value = item.sku;
            document.getElementById('vasType').value = item.vasType;
            document.getElementById('vasQty').value = item.qty;
            document.getElementById('vasOperator').value = item.operator;
        }
    } else {
        title.innerHTML = '<i class="fas fa-tags"></i> Tambah VAS';
    }

    modal.classList.add('show');
}

async function saveVas() {
    const editId = document.getElementById('vasEditId').value;
    const data = {
        date: document.getElementById('vasDate').value,
        brand: document.getElementById('vasBrand').value.trim(),
        sku: document.getElementById('vasSKU').value.trim(),
        vasType: document.getElementById('vasType').value.trim(),
        qty: parseInt(document.getElementById('vasQty').value) || 0,
        operator: document.getElementById('vasOperator').value.trim()
    };

    if (typeof isApiAvailable === 'function' && isApiAvailable()) {
        if (editId) {
            await apiPut(STORAGE_KEYS.vas, editId, data);
        } else {
            await apiPost(STORAGE_KEYS.vas, data);
        }
        await syncFromApi();
    } else {
        let vasList = getData(STORAGE_KEYS.vas);
        if (editId) {
            const idx = vasList.findIndex(v => v.id === editId);
            if (idx !== -1) vasList[idx] = { ...vasList[idx], ...data };
        } else {
            data.id = generateId();
            data.createdAt = new Date().toISOString();
            vasList.push(data);
        }
        setData(STORAGE_KEYS.vas, vasList);
    }

    closeModal(document.getElementById('modalVas'));
    renderVasTable();
    updateDashboardStats();
}

async function deleteVas(id) {
    if (!canDelete()) { showToast('Hanya Supervisor/Leader yang bisa menghapus data', 'error'); return; }
    if (!confirm('Hapus data VAS ini?')) return;

    if (typeof isApiAvailable === 'function' && isApiAvailable()) {
        await apiDelete(STORAGE_KEYS.vas, id);
        await syncFromApi();
    } else {
        let vasList = getData(STORAGE_KEYS.vas);
        vasList = vasList.filter(v => v.id !== id);
        setData(STORAGE_KEYS.vas, vasList);
    }

    renderVasTable();
    updateDashboardStats();
}

function renderVasTable(search = '') {
    const tbody = document.getElementById('vasTableBody');
    const emptyEl = document.getElementById('vasEmpty');
    const table = document.getElementById('vasTable');
    if (!tbody) return;

    let vasList = getData(STORAGE_KEYS.vas);

    if (search) {
        const q = search.toLowerCase();
        vasList = vasList.filter(v =>
            v.sku.toLowerCase().includes(q) ||
            (v.brand || '').toLowerCase().includes(q) ||
            v.vasType.toLowerCase().includes(q) ||
            v.operator.toLowerCase().includes(q) ||
            v.date.includes(q)
        );
    }

    if (vasList.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        renderPagination('Vas', 0, renderVasTable);
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    const { start, end } = renderPagination('Vas', vasList.length, renderVasTable);
    const pageData = vasList.slice(start, end);

    tbody.innerHTML = pageData.map((v, i) => {
        const startFormatted = v.startTime ? formatDateTime(v.startTime) : (v.date ? formatDate(v.date) : '-');
        const endFormatted = v.endTime ? formatDateTime(v.endTime) : '-';
        const durationStr = v.duration || '-';
        return `
        <tr>
            <td class="td-checkbox"><input type="checkbox" class="row-check" data-id="${v.id}" onchange="updateBulkButtons('Vas')"></td>
            <td>${start + i + 1}</td>
            <td>${startFormatted}</td>
            <td>${endFormatted}</td>
            <td>${durationStr}</td>
            <td>${escapeHtml(v.brand || '-')}</td>
            <td><strong>${escapeHtml(v.sku)}</strong></td>
            <td><span class="badge badge--vas">${escapeHtml(v.vasType)}</span></td>
            <td class="qty-positive">${v.qty.toLocaleString()}</td>
            <td>${escapeHtml(v.operator)}</td>
            <td>
                <div class="action-cell">
                    <button class="btn btn--edit" onclick="openVasModal('${v.id}')" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn--danger" onclick="deleteVas('${v.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// --- VAS Multi-Task Workflow ---
let vasActiveTasks = []; // Array of { id, operator, vasType, lines: [{brand, sku}], startTime, endTime, duration, timerInterval, state: 'active'|'finished' }
let vasTaskIdCounter = 0;

function initVasTaskWorkflow() {
    document.getElementById('btnStartVas')?.addEventListener('click', addNewVasTask);
}

function addNewVasTask() {
    const taskId = 'vt_' + (++vasTaskIdCounter) + '_' + Date.now();
    const now = new Date();
    const task = {
        id: taskId,
        operator: '',
        vasType: '',
        lines: [{ brand: '', sku: '' }],
        startTime: now,
        endTime: null,
        duration: null,
        timerInterval: null,
        state: 'active'
    };
    vasActiveTasks.push(task);

    // Start timer
    task.timerInterval = setInterval(() => {
        const el = document.getElementById(`timer_${taskId}`);
        if (el) {
            const elapsed = Math.floor((Date.now() - task.startTime.getTime()) / 1000);
            el.textContent = formatDuration(elapsed);
        }
    }, 1000);

    renderAllVasTaskCards();
}

function renderAllVasTaskCards() {
    const container = document.getElementById('vasTasksContainer');
    if (!container) return;
    container.innerHTML = vasActiveTasks.map(t => renderVasTaskCard(t)).join('');
}

function renderVasTaskCard(task) {
    if (task.state === 'active') {
        return renderActiveTaskCard(task);
    } else if (task.state === 'finished') {
        return renderFinishedTaskCard(task);
    }
    return '';
}

function renderActiveTaskCard(task) {
    const startStr = formatDateTime(task.startTime.toISOString());
    const linesHtml = task.lines.map((line, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><input type="text" class="vas-line-input" data-task="${task.id}" data-line="${idx}" data-field="brand" value="${escapeHtml(line.brand)}" placeholder="Brand" onchange="updateVasLine(this)"></td>
            <td><input type="text" class="vas-line-input" data-task="${task.id}" data-line="${idx}" data-field="sku" value="${escapeHtml(line.sku)}" placeholder="SKU" onchange="updateVasLine(this)"></td>
            <td>
                ${task.lines.length > 1 ? `<button class="btn btn--danger btn--sm" onclick="removeVasLine('${task.id}', ${idx})" title="Hapus line"><i class="fas fa-minus"></i></button>` : ''}
            </td>
        </tr>
    `).join('');

    return `
    <div class="vas-task-card vas-task-card--compact" id="card_${task.id}">
        <div class="vas-compact-top">
            <span class="vas-task-badge vas-task-badge--running"><i class="fas fa-circle-notch fa-spin"></i> Running</span>
            <div class="vas-compact-meta-inputs">
                <input type="text" class="vas-compact-input" data-task="${task.id}" data-field="operator" value="${escapeHtml(task.operator)}" placeholder="Operator" onchange="updateVasTaskMeta(this)">
                <input type="text" class="vas-compact-input" data-task="${task.id}" data-field="vasType" value="${escapeHtml(task.vasType)}" placeholder="Tipe VAS" onchange="updateVasTaskMeta(this)">
            </div>
            <div class="vas-compact-timer">
                <i class="fas fa-stopwatch"></i>
                <span id="timer_${task.id}">00:00:00</span>
            </div>
        </div>
        <div class="vas-compact-body">
            <div class="vas-compact-lines">
                <span class="vas-compact-lines-label"><i class="fas fa-list"></i> Lines:</span>
                ${task.lines.map((line, idx) => `
                    <span class="vas-compact-line-chip">
                        <input type="text" class="vas-chip-input" data-task="${task.id}" data-line="${idx}" data-field="brand" value="${escapeHtml(line.brand)}" placeholder="Brand" onchange="updateVasLine(this)">
                        <input type="text" class="vas-chip-input" data-task="${task.id}" data-line="${idx}" data-field="sku" value="${escapeHtml(line.sku)}" placeholder="SKU" onchange="updateVasLine(this)">
                        ${task.lines.length > 1 ? `<button class="vas-chip-remove" onclick="removeVasLine('${task.id}', ${idx})" title="Hapus"><i class="fas fa-times"></i></button>` : ''}
                    </span>
                `).join('')}
                <button class="vas-chip-add" onclick="addVasLine('${task.id}')" title="Add Line"><i class="fas fa-plus"></i></button>
            </div>
            <div class="vas-compact-footer">
                <span class="vas-compact-start"><i class="fas fa-play" style="color:#34d399"></i> ${startStr}</span>
                <div class="vas-compact-actions">
                    <button class="btn btn--danger btn--sm" onclick="cancelVasTask('${task.id}')"><i class="fas fa-times"></i> Batal</button>
                    <button class="btn btn--finish-vas btn--sm" onclick="finishVasTask('${task.id}')"><i class="fas fa-flag-checkered"></i> Finish</button>
                </div>
            </div>
        </div>
    </div>`;
}

function renderFinishedTaskCard(task) {
    const startStr = formatDateTime(task.startTime.toISOString());
    const endStr = formatDateTime(task.endTime.toISOString());

    const linesHtml = task.lines.map((line, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(line.brand)}</td>
            <td>${escapeHtml(line.sku)}</td>
            <td><input type="number" class="vas-qty-input" id="qty_${task.id}_${idx}" placeholder="0" min="1"></td>
        </tr>
    `).join('');

    return `
    <div class="vas-task-card vas-task-card--done">
        <div class="vas-task-header">
            <div class="vas-task-status">
                <span class="vas-task-badge vas-task-badge--done"><i class="fas fa-check-circle"></i> Selesai</span>
            </div>
            <div class="vas-task-timer vas-task-timer--done">
                <i class="fas fa-stopwatch"></i>
                <span>${task.duration}</span>
            </div>
        </div>
        <div class="vas-task-summary">
            <div class="vas-timestamp"><i class="fas fa-play" style="color: #34d399"></i> <span>Start: </span><strong>${startStr}</strong></div>
            <div class="vas-timestamp"><i class="fas fa-flag-checkered" style="color: #f87171"></i> <span>Finish: </span><strong>${endStr}</strong></div>
            <div class="vas-finish-info">
                <span><strong>Operator:</strong> ${escapeHtml(task.operator)}</span>
                <span><strong>VAS:</strong> ${escapeHtml(task.vasType)}</span>
            </div>
        </div>
        <div class="vas-lines-section">
            <h4><i class="fas fa-list"></i> Masukkan Qty per Line</h4>
            <table class="vas-lines-table">
                <thead><tr><th>#</th><th>Brand</th><th>SKU</th><th>Qty</th></tr></thead>
                <tbody>${linesHtml}</tbody>
            </table>
        </div>
        <div class="vas-task-actions">
            <button class="btn btn--danger" onclick="discardVasTask('${task.id}')"><i class="fas fa-times"></i> Buang</button>
            <button class="btn btn--primary" onclick="saveVasTask('${task.id}')"><i class="fas fa-save"></i> Simpan Task</button>
        </div>
    </div>`;
}

// --- Task Actions ---
function updateVasLine(el) {
    const taskId = el.dataset.task;
    const lineIdx = parseInt(el.dataset.line);
    const field = el.dataset.field;
    const task = vasActiveTasks.find(t => t.id === taskId);
    if (task && task.lines[lineIdx]) {
        task.lines[lineIdx][field] = el.value.trim();
    }
}

function updateVasTaskMeta(el) {
    const taskId = el.dataset.task;
    const field = el.dataset.field;
    const task = vasActiveTasks.find(t => t.id === taskId);
    if (task) task[field] = el.value.trim();
}

function addVasLine(taskId) {
    const task = vasActiveTasks.find(t => t.id === taskId);
    if (!task) return;
    task.lines.push({ brand: '', sku: '' });
    renderAllVasTaskCards();
}

function removeVasLine(taskId, lineIdx) {
    const task = vasActiveTasks.find(t => t.id === taskId);
    if (!task || task.lines.length <= 1) return;
    task.lines.splice(lineIdx, 1);
    renderAllVasTaskCards();
}

function finishVasTask(taskId) {
    const task = vasActiveTasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.operator.trim()) { alert('Mohon isi nama Operator.'); return; }
    if (!task.vasType.trim()) { alert('Mohon isi Tipe VAS.'); return; }

    const emptyLines = task.lines.filter(l => !l.brand.trim() || !l.sku.trim());
    if (emptyLines.length > 0) { alert('Mohon isi Brand dan SKU untuk semua line.'); return; }

    if (task.timerInterval) clearInterval(task.timerInterval);
    task.endTime = new Date();
    const elapsed = Math.floor((task.endTime.getTime() - task.startTime.getTime()) / 1000);
    task.duration = formatDuration(elapsed);
    task.state = 'finished';
    renderAllVasTaskCards();
}

async function saveVasTask(taskId) {
    const task = vasActiveTasks.find(t => t.id === taskId);
    if (!task) return;

    let hasError = false;
    task.lines.forEach((line, idx) => {
        const qtyEl = document.getElementById(`qty_${taskId}_${idx}`);
        const qty = parseInt(qtyEl?.value) || 0;
        if (qty <= 0) hasError = true;
    });

    if (hasError) { alert('Masukkan qty yang valid (minimal 1) untuk semua line.'); return; }

    const useApi = typeof isApiAvailable === 'function' && isApiAvailable();
    let vasList = useApi ? [] : getData(STORAGE_KEYS.vas);

    for (let idx = 0; idx < task.lines.length; idx++) {
        const line = task.lines[idx];
        const qtyEl = document.getElementById(`qty_${taskId}_${idx}`);
        const qty = parseInt(qtyEl?.value) || 0;
        const vasItem = {
            date: task.startTime.toISOString().split('T')[0],
            startTime: task.startTime.toISOString(),
            endTime: task.endTime.toISOString(),
            duration: task.duration,
            brand: line.brand,
            sku: line.sku,
            vasType: task.vasType,
            qty: qty,
            operator: task.operator
        };

        if (useApi) {
            await apiPost(STORAGE_KEYS.vas, vasItem);
        } else {
            vasItem.id = generateId();
            vasItem.createdAt = new Date().toISOString();
            vasList.push(vasItem);
        }
    }

    if (useApi) {
        await syncFromApi();
    } else {
        setData(STORAGE_KEYS.vas, vasList);
    }

    vasActiveTasks = vasActiveTasks.filter(t => t.id !== taskId);
    renderAllVasTaskCards();
    renderVasTable();
    updateDashboardStats();
}

function cancelVasTask(taskId) {
    const task = vasActiveTasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.timerInterval) clearInterval(task.timerInterval);
    vasActiveTasks = vasActiveTasks.filter(t => t.id !== taskId);
    renderAllVasTaskCards();
}

function discardVasTask(taskId) {
    vasActiveTasks = vasActiveTasks.filter(t => t.id !== taskId);
    renderAllVasTaskCards();
}

function formatDuration(totalSeconds) {
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function formatDateTime(isoStr) {
    const d = new Date(isoStr);
    const date = [
        String(d.getDate()).padStart(2, '0'),
        String(d.getMonth() + 1).padStart(2, '0'),
        d.getFullYear()
    ].join('/');
    const time = [
        String(d.getHours()).padStart(2, '0'),
        String(d.getMinutes()).padStart(2, '0'),
        String(d.getSeconds()).padStart(2, '0')
    ].join(':');
    return `${date} ${time}`;
}

// Convert datetime-local input value to m/d/yyyy hh:mm:ss
function localInputToCustomFormat(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d)) return val;
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${month}/${day}/${year} ${hh}:${mm}:${ss}`;
}

// Alias for display formatting
const fmtArrivalTime = localInputToCustomFormat;

// Convert stored m/d/yyyy hh:mm:ss back to datetime-local format (yyyy-MM-ddTHH:mm:ss)
function isoToLocalInput(val) {
    if (!val) return '';
    const d = parseCustomDateTime(val);
    if (!d || isNaN(d)) return '';
    const yyyy = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mo}-${dd}T${hh}:${mm}:${ss}`;
}

// Parse m/d/yyyy hh:mm:ss string to Date
function parseCustomDateTime(str) {
    if (!str) return null;
    // Try m/d/yyyy hh:mm:ss
    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
    if (match) {
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]),
            parseInt(match[4]), parseInt(match[5]), parseInt(match[6]));
    }
    // Fallback: try native Date parse
    const d = new Date(str);
    return isNaN(d) ? null : d;
}

// Calculate average time from receive to putaway per Receipt No
function calcAvgReceiveToPutaway() {
    const el = document.getElementById('statAvgRecPut');
    if (!el) return;

    const transactions = getData(STORAGE_KEYS.transactions);
    // Group by receiptNo
    const groups = {};
    transactions.forEach(t => {
        if (!t.timeTransaction || !t.receiptNo) return;
        const key = t.receiptNo.trim().toLowerCase();
        if (!groups[key]) groups[key] = { receives: [], putaways: [] };
        const dt = parseCustomDateTime(t.timeTransaction);
        if (!dt) return;
        if (t.operateType === 'receive') groups[key].receives.push(dt);
        if (t.operateType === 'putaway') groups[key].putaways.push(dt);
    });

    // For each receipt with both receive and putaway, calc duration
    const durations = [];
    Object.values(groups).forEach(g => {
        if (g.receives.length === 0 || g.putaways.length === 0) return;
        const earliestReceive = new Date(Math.min(...g.receives.map(d => d.getTime())));
        const latestPutaway = new Date(Math.max(...g.putaways.map(d => d.getTime())));
        const diffMs = latestPutaway - earliestReceive;
        if (diffMs > 0) durations.push(diffMs);
    });

    if (durations.length === 0) {
        el.textContent = '-';
        return;
    }

    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
    const avgSec = Math.floor(avgMs / 1000);
    const days = Math.floor(avgSec / 86400);
    const hours = Math.floor((avgSec % 86400) / 3600);
    const mins = Math.floor((avgSec % 3600) / 60);

    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0 || days > 0) result += `${hours}h `;
    result += `${mins}m`;
    el.textContent = result.trim();
}

function calcAvgLeadTime() {
    const el = document.getElementById('statAvgLeadTime');
    if (!el) return;

    const arrivals = filterByInboundDate(getData(STORAGE_KEYS.arrivals));
    const transactions = getData(STORAGE_KEYS.transactions);

    // Build lookup: receiptNo -> latest putaway time
    const putawayByReceipt = {};
    transactions.forEach(t => {
        if (t.operateType !== 'putaway' || !t.timeTransaction || !t.receiptNo) return;
        const key = t.receiptNo.trim().toLowerCase();
        const dt = parseCustomDateTime(t.timeTransaction);
        if (!dt) return;
        if (!putawayByReceipt[key] || dt.getTime() > putawayByReceipt[key].getTime()) {
            putawayByReceipt[key] = dt;
        }
    });

    // Group arrivals by PO No, find lead times
    // For each PO: lead time = latest putaway time across its receipts - arrival time
    const poMap = {};
    arrivals.forEach(a => {
        if (!a.arrivalTime || !a.poNo) return;
        const arrivalDt = parseCustomDateTime(a.arrivalTime);
        if (!arrivalDt) return;
        const poKey = a.poNo.trim().toLowerCase();
        if (!poMap[poKey]) poMap[poKey] = { arrivalDt, latestPutaway: null };

        // Use earliest arrival time for the PO
        if (arrivalDt.getTime() < poMap[poKey].arrivalDt.getTime()) {
            poMap[poKey].arrivalDt = arrivalDt;
        }

        // Find latest putaway for this receipt
        const rKey = (a.receiptNo || '').trim().toLowerCase();
        const putDt = putawayByReceipt[rKey];
        if (putDt && (!poMap[poKey].latestPutaway || putDt.getTime() > poMap[poKey].latestPutaway.getTime())) {
            poMap[poKey].latestPutaway = putDt;
        }
    });

    const durations = [];
    Object.values(poMap).forEach(po => {
        if (!po.latestPutaway) return;
        const diffMs = po.latestPutaway - po.arrivalDt;
        if (diffMs > 0) durations.push(diffMs);
    });

    if (durations.length === 0) {
        el.textContent = '-';
        return;
    }

    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
    const avgSec = Math.floor(avgMs / 1000);
    const days = Math.floor(avgSec / 86400);
    const hours = Math.floor((avgSec % 86400) / 3600);
    const mins = Math.floor((avgSec % 3600) / 60);

    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0 || days > 0) result += `${hours}h `;
    result += `${mins}m`;
    el.textContent = result.trim();
}
// ========================================
// UTILITIES
// ========================================
function closeModal(modal) {
    if (typeof modal === 'string') modal = document.getElementById(modal);
    if (modal) modal.classList.remove('show');
}

// --- Pagination State ---
const pageState = {
    Arrival: { current: 1, perPage: 50 },
    Transaction: { current: 1, perPage: 50 },
    Vas: { current: 1, perPage: 50 },
    Dcc: { current: 1, perPage: 50 },
    Dmg: { current: 1, perPage: 50 },
    Soh: { current: 1, perPage: 50 },
    Qcr: { current: 1, perPage: 50 },
    Loc: { current: 1, perPage: 50 },
    Att: { current: 1, perPage: 50 },
    Prod: { current: 1, perPage: 50 },
    Emp: { current: 1, perPage: 50 }
};

function renderPagination(pageName, totalItems, renderFn) {
    const state = pageState[pageName];
    const totalPages = Math.max(1, Math.ceil(totalItems / state.perPage));
    if (state.current > totalPages) state.current = totalPages;

    const start = (state.current - 1) * state.perPage;
    const end = Math.min(start + state.perPage, totalItems);

    // Info text
    const infoEl = document.getElementById(`pagination${pageName}Info`);
    if (infoEl) {
        infoEl.textContent = totalItems > 0
            ? `Menampilkan ${start + 1}–${end} dari ${totalItems} data`
            : 'Tidak ada data';
    }

    // Page buttons
    const pagesEl = document.getElementById(`pagination${pageName}Pages`);
    if (!pagesEl) return { start, end };

    let html = '';

    // Prev
    html += `<button ${state.current === 1 ? 'disabled' : ''} onclick="goToPage('${pageName}', ${state.current - 1}, ${renderFn.name})"><i class="fas fa-chevron-left"></i></button>`;

    // Page numbers with ellipsis
    const maxVisible = 5;
    let pages = [];

    if (totalPages <= maxVisible + 2) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        let rangeStart = Math.max(2, state.current - 1);
        let rangeEnd = Math.min(totalPages - 1, state.current + 1);

        if (state.current <= 3) { rangeStart = 2; rangeEnd = Math.min(maxVisible, totalPages - 1); }
        if (state.current >= totalPages - 2) { rangeEnd = totalPages - 1; rangeStart = Math.max(2, totalPages - maxVisible + 1); }

        if (rangeStart > 2) pages.push('...');
        for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
        if (rangeEnd < totalPages - 1) pages.push('...');
        pages.push(totalPages);
    }

    pages.forEach(p => {
        if (p === '...') {
            html += '<span class="page-ellipsis">…</span>';
        } else {
            html += `<button class="${p === state.current ? 'active' : ''}" onclick="goToPage('${pageName}', ${p}, ${renderFn.name})">${p}</button>`;
        }
    });

    // Next
    html += `<button ${state.current === totalPages ? 'disabled' : ''} onclick="goToPage('${pageName}', ${state.current + 1}, ${renderFn.name})"><i class="fas fa-chevron-right"></i></button>`;

    pagesEl.innerHTML = html;

    // Per-page selector
    const perPageEl = document.getElementById(`perPage${pageName}`);
    if (perPageEl && !perPageEl._bound) {
        perPageEl._bound = true;
        perPageEl.addEventListener('change', () => {
            state.perPage = parseInt(perPageEl.value);
            state.current = 1;
            renderFn();
        });
    }

    return { start, end };
}

function goToPage(pageName, page, renderFn) {
    pageState[pageName].current = page;
    renderFn();
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return [
        String(d.getDate()).padStart(2, '0'),
        String(d.getMonth() + 1).padStart(2, '0'),
        d.getFullYear()
    ].join('/');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========================================
// CHECKBOX & BULK ACTIONS
// ========================================
function initBulkActions(pageName, storageKey, exportHeaders, exportMapper, renderFn) {
    const selectAll = document.getElementById(`selectAll${pageName}`);
    if (selectAll) {
        selectAll.addEventListener('change', () => {
            const checks = document.querySelectorAll(`#${pageName.toLowerCase()}TableBody .row-check`);
            checks.forEach(cb => {
                cb.checked = selectAll.checked;
                cb.closest('tr').classList.toggle('row-selected', selectAll.checked);
            });
            updateBulkButtons(pageName);
        });
    }

    document.getElementById(`btnBulkDelete${pageName}`)?.addEventListener('click', async () => {
        const ids = getSelectedIds(pageName);
        if (ids.length === 0) return;
        if (!confirm(`Hapus ${ids.length} data terpilih?`)) return;

        if (typeof isApiAvailable === 'function' && isApiAvailable()) {
            await apiBulkDelete(storageKey, ids);
            await syncFromApi();
        } else {
            let data = getData(storageKey);
            data = data.filter(d => !ids.includes(d.id));
            setData(storageKey, data);
        }

        renderFn();
        updateDashboardStats();
    });

    document.getElementById(`btnBulkExport${pageName}`)?.addEventListener('click', () => {
        const ids = getSelectedIds(pageName);
        if (ids.length === 0) return;

        const data = getData(storageKey).filter(d => ids.includes(d.id));
        const csvRows = [exportHeaders.join(',')];
        data.forEach(d => {
            const row = exportMapper(d).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`);
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${pageName.toLowerCase()}_selected.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

function getSelectedIds(pageName) {
    const tbodyId = pageName.toLowerCase() + 'TableBody';
    const checks = document.querySelectorAll(`#${tbodyId} .row-check:checked`);
    return Array.from(checks).map(cb => cb.dataset.id);
}

function updateBulkButtons(pageName) {
    const ids = getSelectedIds(pageName);
    const count = ids.length;
    const btnDelete = document.getElementById(`btnBulkDelete${pageName}`);
    const btnExport = document.getElementById(`btnBulkExport${pageName}`);
    if (btnDelete) {
        btnDelete.style.display = count > 0 ? '' : 'none';
        btnDelete.querySelector('span').textContent = `Hapus (${count})`;
    }
    if (btnExport) {
        btnExport.style.display = count > 0 ? '' : 'none';
        btnExport.querySelector('span').textContent = `Export (${count})`;
    }
    // Update row highlighting
    const tbodyId = pageName.toLowerCase() + 'TableBody';
    document.querySelectorAll(`#${tbodyId} .row-check`).forEach(cb => {
        cb.closest('tr').classList.toggle('row-selected', cb.checked);
    });
    // Update select-all state
    const selectAll = document.getElementById(`selectAll${pageName}`);
    const allChecks = document.querySelectorAll(`#${tbodyId} .row-check`);
    if (selectAll && allChecks.length > 0) {
        selectAll.checked = Array.from(allChecks).every(cb => cb.checked);
    }
}

// ========================================
// DAILY CYCLE COUNT
// ========================================
function initDccPage() {
    const modal = document.getElementById('modalDcc');
    const form = document.getElementById('formDcc');
    const btnAdd = document.getElementById('btnAddDcc');
    const btnClose = document.getElementById('closeModalDcc');
    const btnCancel = document.getElementById('cancelDcc');
    const searchInput = document.getElementById('searchDcc');

    btnAdd?.addEventListener('click', () => openDccModal());
    btnClose?.addEventListener('click', () => closeModal(modal));
    btnCancel?.addEventListener('click', () => closeModal(modal));
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveDcc();
    });

    searchInput?.addEventListener('input', () => { dccVarianceFilter = ''; pageState.Dcc.current = 1; renderDccTable(searchInput.value); });

    // Export
    document.getElementById('btnExportDcc')?.addEventListener('click', () => {
        exportToCSV(
            STORAGE_KEYS.dcc,
            'daily_cycle_count.csv',
            ['Date', 'Phy. Inventory#', 'Zone', 'Location', 'Owner', 'SKU', 'Brand', 'Description', 'Sys. Qty', 'Phy. Qty', 'Variance', 'Variance %', 'Operator', 'Remarks'],
            (d) => {
                const sysQty = parseInt(d.sysQty) || 0;
                const phyQty = parseInt(d.phyQty) || 0;
                const variance = phyQty - sysQty;
                const variancePct = sysQty !== 0 ? ((variance / sysQty) * 100).toFixed(2) + '%' : (variance === 0 ? '0%' : 'N/A');
                const remarks = variance === 0 ? 'Match' : variance < 0 ? 'Shortage' : 'Gain';
                return [d.date || '', d.phyInv || '', d.zone || '', d.location || '', d.owner || '', d.sku || '', d.brand || '', d.description || '', sysQty, phyQty, variance, variancePct, d.operator || '', remarks];
            }
        );
    });

    // Import
    document.getElementById('btnImportDcc')?.addEventListener('click', () => {
        importFromCSV(
            STORAGE_KEYS.dcc,
            ['Date', 'Phy. Inventory#', 'Zone', 'Location', 'Owner', 'SKU', 'Brand', 'Description', 'Sys. Qty', 'Phy. Qty', 'Variance', 'Variance %', 'Operator', 'Remarks'],
            (vals) => {
                if (vals.length < 10) return null;
                return {
                    date: vals[0]?.trim() || '',
                    phyInv: vals[1]?.trim() || '',
                    zone: vals[2]?.trim() || '',
                    location: vals[3]?.trim() || '',
                    owner: vals[4]?.trim() || '',
                    sku: vals[5]?.trim() || '',
                    brand: vals[6]?.trim() || '',
                    description: vals[7]?.trim() || '',
                    sysQty: parseInt(vals[8]) || 0,
                    phyQty: parseInt(vals[9]) || 0,
                    operator: vals[12]?.trim() || '',
                };
            },
            () => renderDccTable()
        );
    });

    renderDccTable();

    initBulkActions('Dcc', STORAGE_KEYS.dcc,
        ['Date', 'Phy. Inventory#', 'Zone', 'Location', 'Owner', 'SKU', 'Brand', 'Description', 'Sys. Qty', 'Phy. Qty', 'Operator'],
        (d) => [d.date || '', d.phyInv || '', d.zone || '', d.location || '', d.owner || '', d.sku || '', d.brand || '', d.description || '', d.sysQty, d.phyQty, d.operator || ''],
        renderDccTable
    );

    // Clear All DCC data
    document.getElementById('btnClearDcc')?.addEventListener('click', () => {
        const items = getData(STORAGE_KEYS.dcc);
        if (items.length === 0) {
            showToast('Tidak ada data untuk dihapus', 'info');
            return;
        }
        if (confirm(`Hapus semua ${items.length} data Daily Cycle Count?`)) {
            setData(STORAGE_KEYS.dcc, []);
            renderDccTable();
            updateInventoryDashboard();
            showToast(`${items.length} data berhasil dihapus`, 'success');
        }
    });
}

function openDccModal(editId = null) {
    const modal = document.getElementById('modalDcc');
    const title = document.getElementById('modalDccTitle');
    const editIdField = document.getElementById('dccEditId');
    const form = document.getElementById('formDcc');

    form.reset();
    editIdField.value = '';

    if (editId) {
        const items = getData(STORAGE_KEYS.dcc);
        const item = items.find(d => d.id === editId);
        if (item) {
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Cycle Count';
            editIdField.value = editId;
            document.getElementById('dccDate').value = item.date || '';
            document.getElementById('dccPhyInv').value = item.phyInv || '';
            document.getElementById('dccZone').value = item.zone || '';
            document.getElementById('dccLocation').value = item.location || '';
            document.getElementById('dccOwner').value = item.owner || '';
            document.getElementById('dccSku').value = item.sku || '';
            document.getElementById('dccBrand').value = item.brand || '';
            document.getElementById('dccDescription').value = item.description || '';
            document.getElementById('dccSysQty').value = item.sysQty || 0;
            document.getElementById('dccPhyQty').value = item.phyQty || 0;
            document.getElementById('dccOperator').value = item.operator || '';
        }
    } else {
        title.innerHTML = '<i class="fas fa-clipboard-check"></i> Tambah Cycle Count';
        // Auto-fill today's date
        const now = new Date();
        const yyyy = now.getFullYear();
        const mo = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        document.getElementById('dccDate').value = `${yyyy}-${mo}-${dd}`;
    }

    modal.classList.add('show');
}

async function saveDcc() {
    const editId = document.getElementById('dccEditId').value;
    const data = {
        date: document.getElementById('dccDate').value,
        phyInv: document.getElementById('dccPhyInv').value.trim(),
        zone: document.getElementById('dccZone').value.trim(),
        location: document.getElementById('dccLocation').value.trim(),
        owner: document.getElementById('dccOwner').value.trim(),
        sku: document.getElementById('dccSku').value.trim(),
        brand: document.getElementById('dccBrand').value.trim(),
        description: document.getElementById('dccDescription').value.trim(),
        sysQty: parseInt(document.getElementById('dccSysQty').value) || 0,
        phyQty: parseInt(document.getElementById('dccPhyQty').value) || 0,
        operator: document.getElementById('dccOperator').value.trim()
    };

    let items = getData(STORAGE_KEYS.dcc);
    if (editId) {
        const idx = items.findIndex(d => d.id === editId);
        if (idx !== -1) items[idx] = { ...items[idx], ...data };
    } else {
        data.id = generateId();
        data.createdAt = new Date().toISOString();
        items.push(data);
    }
    setData(STORAGE_KEYS.dcc, items);

    // API sync
    try {
        if (editId) { await apiPut(STORAGE_KEYS.dcc, editId, data); }
        else { await apiPost(STORAGE_KEYS.dcc, data); }
    } catch (e) { console.warn('DCC API sync failed', e); }

    closeModal(document.getElementById('modalDcc'));
    renderDccTable();
}

function deleteDcc(id) {
    if (!canDelete()) { showToast('Hanya Supervisor/Leader yang bisa menghapus data', 'error'); return; }
    if (!confirm('Hapus data cycle count ini?')) return;
    let items = getData(STORAGE_KEYS.dcc);
    items = items.filter(d => d.id !== id);
    setData(STORAGE_KEYS.dcc, items);
    apiDelete(STORAGE_KEYS.dcc, id).catch(() => { });
    renderDccTable();
}

// --- Drill down from Accuracy Dashboard to DCC Table ---
let dccVarianceFilter = ''; // global: '', 'shortage', 'gain', 'match', 'unmatch'

function drillDownToDcc(filterType) {
    // Store the filter type
    dccVarianceFilter = filterType || '';

    // Read current dashboard filter (date/month) and apply to DCC search
    const filterTypeEl = document.getElementById('invFilterType');
    const filterDateEl = document.getElementById('invFilterDate');
    const filterMonthEl = document.getElementById('invFilterMonth');
    const dashFilterType = filterTypeEl?.value || 'all';
    let searchText = '';

    if (dashFilterType === 'daily' && filterDateEl?.value) {
        searchText = filterDateEl.value; // YYYY-MM-DD format for DCC search
    } else if (dashFilterType === 'monthly' && filterMonthEl?.value) {
        searchText = filterMonthEl.value; // YYYY-MM format
    }

    // Navigate to DCC page (flag so navigateTo doesn't clear our filter)
    window._dccDrillDownActive = true;
    navigateTo('daily-cycle-count');

    // Set the search box value on DCC page
    const searchInput = document.getElementById('searchDcc');
    if (searchInput) {
        searchInput.value = searchText;
    }

    // Reset pagination and render with filters
    pageState.Dcc.current = 1;
    renderDccTable(searchText);
}

function renderDccTable(search = '') {
    const tbody = document.getElementById('dccTableBody');
    const emptyEl = document.getElementById('dccEmpty');
    const table = document.getElementById('dccTable');
    if (!tbody) return;

    let items = getData(STORAGE_KEYS.dcc);

    if (search) {
        const q = search.toLowerCase();
        items = items.filter(d =>
            (d.sku || '').toLowerCase().includes(q) ||
            (d.zone || '').toLowerCase().includes(q) ||
            (d.location || '').toLowerCase().includes(q) ||
            (d.owner || '').toLowerCase().includes(q) ||
            (d.brand || '').toLowerCase().includes(q) ||
            (d.operator || '').toLowerCase().includes(q) ||
            (d.phyInv || '').toLowerCase().includes(q) ||
            (d.description || '').toLowerCase().includes(q)
        );
    }

    // Apply variance filter from dashboard drill-down
    if (dccVarianceFilter && dccVarianceFilter !== 'all') {
        items = items.filter(d => {
            const sysQty = parseInt(d.sysQty) || 0;
            const phyQty = parseInt(d.phyQty) || 0;
            const variance = phyQty - sysQty;
            if (dccVarianceFilter === 'shortage') return variance < 0;
            if (dccVarianceFilter === 'gain') return variance > 0;
            if (dccVarianceFilter === 'match') return variance === 0;
            if (dccVarianceFilter === 'unmatch') return variance !== 0;
            return true;
        });
    }

    // Update stat cards
    updateDccStats(items);

    if (items.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        renderPagination('Dcc', 0, renderDccTable);
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    const { start, end } = renderPagination('Dcc', items.length, renderDccTable);
    const pageData = items.slice(start, end);

    tbody.innerHTML = pageData.map((d, i) => {
        const sysQty = parseInt(d.sysQty) || 0;
        const phyQty = parseInt(d.phyQty) || 0;
        const variance = phyQty - sysQty;
        const variancePct = sysQty !== 0 ? ((variance / sysQty) * 100).toFixed(2) : (variance === 0 ? '0.00' : 'N/A');
        let remarks, remarkClass;
        if (variance === 0) {
            remarks = 'Match';
            remarkClass = 'badge badge--receive';
        } else if (variance < 0) {
            remarks = 'Shortage';
            remarkClass = 'badge badge--shortage';
        } else {
            remarks = 'Gain';
            remarkClass = 'badge badge--gain';
        }
        const varianceClass = variance < 0 ? 'qty-negative' : variance > 0 ? 'qty-positive' : '';

        return `
        <tr>
            <td class="td-checkbox"><input type="checkbox" class="row-check" data-id="${d.id}" onchange="updateBulkButtons('Dcc')"></td>
            <td>${start + i + 1}</td>
            <td>${d.date ? formatDate(d.date) : '-'}</td>
            <td>${escapeHtml(d.phyInv || '-')}</td>
            <td>${escapeHtml(d.zone || '-')}</td>
            <td>${escapeHtml(d.location || '-')}</td>
            <td>${escapeHtml(d.owner || '-')}</td>
            <td><strong>${escapeHtml(d.sku || '-')}</strong></td>
            <td>${escapeHtml(d.brand || '-')}</td>
            <td>${escapeHtml(d.description || '-')}</td>
            <td>${sysQty.toLocaleString()}</td>
            <td>${phyQty.toLocaleString()}</td>
            <td class="${varianceClass}">${variance > 0 ? '+' : ''}${variance.toLocaleString()}</td>
            <td class="${varianceClass}">${variancePct}%</td>
            <td>${escapeHtml(d.operator || '-')}</td>
            <td><span class="${remarkClass}">${remarks}</span></td>
            <td>
                <div class="action-cell">
                    <button class="btn btn--edit" onclick="openDccModal('${d.id}')" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn--danger" onclick="deleteDcc('${d.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updateDccStats(items) {
    let total = items.length;
    let match = 0, shortage = 0, gain = 0;

    items.forEach(d => {
        const variance = (parseInt(d.phyQty) || 0) - (parseInt(d.sysQty) || 0);
        if (variance === 0) match++;
        else if (variance < 0) shortage++;
        else gain++;
    });

    animateCounter('statDccTotal', total);
    animateCounter('statDccMatch', match);
    animateCounter('statDccShortage', shortage);
    animateCounter('statDccGain', gain);
}

// ========================================
// PROJECT DAMAGE
// ========================================

function initDmgPage() {
    // Add button
    document.getElementById('btnAddDmg')?.addEventListener('click', () => openDmgModal());

    // Save button
    document.getElementById('btnSaveDmg')?.addEventListener('click', async () => {
        const editId = document.getElementById('dmgEditId')?.value;
        const date = document.getElementById('dmgDate')?.value;
        const brand = document.getElementById('dmgBrand')?.value?.trim();
        const sku = document.getElementById('dmgSku')?.value?.trim();
        const qty = parseInt(document.getElementById('dmgQty')?.value) || 0;
        const note = document.getElementById('dmgNote')?.value;
        const reason = document.getElementById('dmgReason')?.value?.trim();
        const operator = document.getElementById('dmgOperator')?.value?.trim();
        const qcBy = document.getElementById('dmgQcBy')?.value?.trim();

        if (!date || !brand || !sku || qty <= 0 || !note) {
            showToast('Harap isi semua field wajib (*)', 'error');
            return;
        }

        const data = getData(STORAGE_KEYS.damage);
        const record = { date, brand, sku, qty, note, reason, operator, qcBy };

        if (editId) {
            const idx = data.findIndex(d => d.id === editId);
            if (idx >= 0) {
                record.id = editId;
                record.createdAt = data[idx].createdAt;
                data[idx] = record;
            }
        } else {
            record.id = generateId();
            record.createdAt = new Date().toISOString();
            data.push(record);
        }

        setData(STORAGE_KEYS.damage, data);
        // API sync
        try {
            if (editId) { await apiPut(STORAGE_KEYS.damage, editId, record); }
            else { await apiPost(STORAGE_KEYS.damage, record); }
        } catch (e) { console.warn('Damage API sync failed', e); }
        closeModal('modalDmg');
        renderDmgTable();
        showToast(editId ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan', 'success');
    });

    // Export
    document.getElementById('btnExportDmg')?.addEventListener('click', () => {
        exportToCSV(
            STORAGE_KEYS.damage,
            ['Tanggal', 'Brand', 'SKU', 'Qty', 'Damage Note', 'Damage Reason', 'Operator', 'QC By'],
            (d) => [d.date || '', d.brand || '', d.sku || '', d.qty, d.note || '', d.reason || '', d.operator || '', d.qcBy || ''],
            'project_damage'
        );
    });

    // Import
    document.getElementById('btnImportDmg')?.addEventListener('click', () => {
        importFromCSV(
            STORAGE_KEYS.damage,
            ['Tanggal', 'Brand', 'SKU', 'Qty', 'Damage Note', 'Damage Reason', 'Operator', 'QC By'],
            (vals) => {
                if (vals.length < 4) return null;
                return {
                    date: vals[0]?.trim() || '',
                    brand: vals[1]?.trim() || '',
                    sku: vals[2]?.trim() || '',
                    qty: parseInt(vals[3]) || 0,
                    note: vals[4]?.trim() || '',
                    reason: vals[5]?.trim() || '',
                    operator: vals[6]?.trim() || '',
                    qcBy: vals[7]?.trim() || ''
                };
            },
            () => renderDmgTable()
        );
    });

    // Search
    const searchInput = document.getElementById('searchDmg');
    searchInput?.addEventListener('input', () => { pageState.Dmg.current = 1; renderDmgTable(searchInput.value); });

    renderDmgTable();

    // Bulk actions
    initBulkActions('Dmg', STORAGE_KEYS.damage,
        ['Tanggal', 'Brand', 'SKU', 'Qty', 'Damage Note', 'Damage Reason', 'Operator', 'QC By'],
        (d) => [d.date || '', d.brand || '', d.sku || '', d.qty, d.note || '', d.reason || '', d.operator || '', d.qcBy || ''],
        renderDmgTable
    );

    // Clear All
    document.getElementById('btnClearDmg')?.addEventListener('click', () => {
        const items = getData(STORAGE_KEYS.damage);
        if (items.length === 0) {
            showToast('Tidak ada data untuk dihapus', 'info');
            return;
        }
        if (confirm(`Hapus semua ${items.length} data Project Damage?`)) {
            setData(STORAGE_KEYS.damage, []);
            renderDmgTable();
            showToast('Semua data Project Damage berhasil dihapus', 'success');
        }
    });
}

function openDmgModal(editId = null) {
    const modal = document.getElementById('modalDmg');
    const title = document.getElementById('modalDmgTitle');
    const idEl = document.getElementById('dmgEditId');

    document.getElementById('dmgDate').value = '';
    document.getElementById('dmgBrand').value = '';
    document.getElementById('dmgSku').value = '';
    document.getElementById('dmgQty').value = '';
    document.getElementById('dmgNote').value = '';
    document.getElementById('dmgReason').value = '';
    document.getElementById('dmgOperator').value = '';
    document.getElementById('dmgQcBy').value = '';
    idEl.value = '';

    if (editId) {
        const data = getData(STORAGE_KEYS.damage);
        const item = data.find(d => d.id === editId);
        if (item) {
            title.textContent = 'Edit Data Damage';
            idEl.value = editId;
            document.getElementById('dmgDate').value = item.date || '';
            document.getElementById('dmgBrand').value = item.brand || '';
            document.getElementById('dmgSku').value = item.sku || '';
            document.getElementById('dmgQty').value = item.qty || '';
            document.getElementById('dmgNote').value = item.note || '';
            document.getElementById('dmgReason').value = item.reason || '';
            document.getElementById('dmgOperator').value = item.operator || '';
            document.getElementById('dmgQcBy').value = item.qcBy || '';
        }
    } else {
        title.textContent = 'Tambah Data Damage';
        // Default date to today
        const now = new Date();
        document.getElementById('dmgDate').value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    }

    modal.classList.add('show');
}

function deleteDmg(id) {
    if (!canDelete()) { showToast('Hanya Supervisor/Leader yang bisa menghapus data', 'error'); return; }
    if (!confirm('Hapus data ini?')) return;
    let data = getData(STORAGE_KEYS.damage);
    data = data.filter(d => d.id !== id);
    setData(STORAGE_KEYS.damage, data);
    apiDelete(STORAGE_KEYS.damage, id).catch(() => { });
    renderDmgTable();
    showToast('Data berhasil dihapus', 'success');
}

function renderDmgTable(search = '') {
    const tbody = document.getElementById('dmgTableBody');
    const emptyEl = document.getElementById('dmgEmpty');
    const table = document.getElementById('dmgTable');
    if (!tbody) return;

    let items = getData(STORAGE_KEYS.damage);
    const q = (search || document.getElementById('searchDmg')?.value || '').toLowerCase();
    if (q) {
        items = items.filter(d =>
            (d.sku || '').toLowerCase().includes(q) ||
            (d.brand || '').toLowerCase().includes(q) ||
            (d.operator || '').toLowerCase().includes(q) ||
            (d.qcBy || '').toLowerCase().includes(q) ||
            (d.note || '').toLowerCase().includes(q) ||
            (d.reason || '').toLowerCase().includes(q)
        );
    }

    // Update stats
    updateDmgStats(items);

    if (items.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        renderPagination('Dmg', 0, renderDmgTable);
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    const { start, end } = renderPagination('Dmg', items.length, renderDmgTable);
    const pageData = items.slice(start, end);

    const noteColors = {
        'External Damage': 'badge--shortage',
        'Internal Damage': 'badge--late',
        'Expired': 'badge--pending',
        'PEST': 'badge--gain'
    };

    tbody.innerHTML = pageData.map((d, i) => {
        const badgeClass = noteColors[d.note] || 'badge--default';
        return `
        <tr>
            <td class="td-checkbox"><input type="checkbox" class="row-check" data-id="${d.id}" onchange="updateBulkButtons('Dmg')"></td>
            <td>${start + i + 1}</td>
            <td>${d.date ? formatDate(d.date) : '-'}</td>
            <td>${escapeHtml(d.brand || '-')}</td>
            <td><strong>${escapeHtml(d.sku || '-')}</strong></td>
            <td>${(parseInt(d.qty) || 0).toLocaleString()}</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(d.note || '-')}</span></td>
            <td>${escapeHtml(d.reason || '-')}</td>
            <td>${escapeHtml(d.operator || '-')}</td>
            <td>${escapeHtml(d.qcBy || '-')}</td>
            <td>
                <div class="action-cell">
                    <button class="btn btn--edit" onclick="openDmgModal('${d.id}')" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn--danger" onclick="deleteDmg('${d.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updateDmgStats(items) {
    const totalQty = items.reduce((s, d) => s + (parseInt(d.qty) || 0), 0);
    const skus = new Set(items.map(d => d.sku).filter(Boolean));
    const brands = new Set(items.map(d => (d.brand || '').toLowerCase()).filter(Boolean));

    animateCounter('statDmgTotal', items.length);
    animateCounter('statDmgQty', totalQty);
    animateCounter('statDmgSku', skus.size);
    animateCounter('statDmgBrand', brands.size);
}

// ========================================
// STOCK ON HAND
// ========================================

function initSohPage() {
    // Import CSV (append)
    document.getElementById('btnImportSoh')?.addEventListener('click', () => {
        importFromCSV(
            STORAGE_KEYS.soh,
            ['Location', 'SKU', 'SKU Category', 'SKU Brand', 'Zone', 'Location Type', 'Owner', 'Status', 'Qty', 'Warehouse Arrival Date', 'Receipt#', 'Mfg. Date', 'Exp. Date', 'Batch#'],
            (vals) => {
                if (vals.length < 2) return null;
                return {
                    location: vals[0]?.trim() || '',
                    sku: vals[1]?.trim() || '',
                    skuCategory: vals[2]?.trim() || '',
                    skuBrand: vals[3]?.trim() || '',
                    zone: vals[4]?.trim() || '',
                    locationType: vals[5]?.trim() || '',
                    owner: vals[6]?.trim() || '',
                    status: vals[7]?.trim() || '',
                    qty: parseInt(vals[8]) || 0,
                    whArrivalDate: vals[9]?.trim() || '',
                    receiptNo: vals[10]?.trim() || '',
                    mfgDate: vals[11]?.trim() || '',
                    expDate: vals[12]?.trim() || '',
                    batchNo: vals[13]?.trim() || '',
                    updateDate: new Date().toISOString()
                };
            },
            () => renderSohTable()
        );
    });

    // Export
    document.getElementById('btnExportSoh')?.addEventListener('click', () => {
        exportToCSV(
            STORAGE_KEYS.soh,
            ['Location', 'Location Category', 'SKU', 'SKU Category', 'SKU Brand', 'Zone', 'Location Type', 'Owner', 'Status', 'Qty', 'Warehouse Arrival Date', 'Receipt#', 'Mfg. Date', 'Exp. Date', 'Batch#', 'Update Date', 'Week', 'ED Note', 'Aging Note'],
            (d) => {
                const locData = getData(STORAGE_KEYS.locations);
                const locMatch = locData.find(l => (l.location || '').toLowerCase() === (d.location || '').toLowerCase());
                return [d.location || '', locMatch ? (locMatch.category || '') : '', d.sku || '', d.skuCategory || '', d.skuBrand || '', d.zone || '', d.locationType || '', d.owner || '', d.status || '', d.qty, d.whArrivalDate || '', d.receiptNo || '', d.mfgDate || '', d.expDate || '', d.batchNo || '', d.updateDate || '', calcWeek(d.updateDate), calcEdNote(d.expDate, d.updateDate), calcAgingNote(d.whArrivalDate)];
            },
            'stock_on_hand'
        );
    });

    // Search
    const searchInput = document.getElementById('searchSoh');
    searchInput?.addEventListener('input', () => { pageState.Soh.current = 1; renderSohTable(searchInput.value); });

    // Clear All
    document.getElementById('btnClearSoh')?.addEventListener('click', () => {
        const items = getData(STORAGE_KEYS.soh);
        if (items.length === 0) {
            showToast('Tidak ada data untuk dihapus', 'info');
            return;
        }
        if (confirm(`Hapus semua ${items.length} data Stock On Hand?`)) {
            setData(STORAGE_KEYS.soh, []);
            renderSohTable();
            showToast('Semua data Stock On Hand berhasil dihapus', 'success');
        }
    });

    renderSohTable();
}

// Week: categorize Update Date into week of month
function calcWeek(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    const day = d.getDate();
    const weekNum = Math.ceil(day / 7);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `Week ${weekNum} ${months[d.getMonth()]}`;
}

// ED Note: categorize days between Exp Date and Update Date
function calcEdNote(expDate, updateDate) {
    if (!expDate || !updateDate) return '-';
    const exp = new Date(expDate);
    const upd = new Date(updateDate);
    if (isNaN(exp) || isNaN(upd)) return '-';
    const diffDays = Math.floor((exp - upd) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Expired';
    if (diffDays <= 30) return '< 1 Month';
    if (diffDays <= 60) return '< 2 Month';
    if (diffDays <= 90) return '< 3 Month';
    if (diffDays <= 180) return '3 - 6 Month';
    if (diffDays <= 365) return '6 - 12 Month';
    return '1yr++';
}

// Aging Note: categorize WH Arrival Date into quarterly buckets
function calcAgingNote(whArrivalDate) {
    if (!whArrivalDate) return '-';
    const d = new Date(whArrivalDate);
    if (isNaN(d)) return '-';
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12
    if (year < 2025) return 'Under 2025';
    const quarter = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4';
    return `${quarter} ${year}`;
}

function renderSohTable(search = '') {
    const tbody = document.getElementById('sohTableBody');
    const emptyEl = document.getElementById('sohEmpty');
    const table = document.getElementById('sohTable');
    if (!tbody) return;

    let items = getData(STORAGE_KEYS.soh);

    // Build Location→Category lookup from Master Location
    const locData = getData(STORAGE_KEYS.locations);
    const locCatMap = {};
    locData.forEach(l => {
        if (l.location) locCatMap[l.location.toLowerCase()] = l.category || '';
    });

    const q = (search || document.getElementById('searchSoh')?.value || '').toLowerCase();
    if (q) {
        items = items.filter(d =>
            (d.sku || '').toLowerCase().includes(q) ||
            (d.location || '').toLowerCase().includes(q) ||
            (d.owner || '').toLowerCase().includes(q) ||
            (d.skuBrand || '').toLowerCase().includes(q) ||
            (d.zone || '').toLowerCase().includes(q) ||
            (d.receiptNo || '').toLowerCase().includes(q) ||
            (d.batchNo || '').toLowerCase().includes(q) ||
            (d.status || '').toLowerCase().includes(q) ||
            (locCatMap[(d.location || '').toLowerCase()] || '').toLowerCase().includes(q)
        );
    }

    updateSohStats(items);

    if (items.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        renderPagination('Soh', 0, renderSohTable);
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    const { start, end } = renderPagination('Soh', items.length, renderSohTable);
    const pageData = items.slice(start, end);

    tbody.innerHTML = pageData.map((d, i) => {
        const locCat = locCatMap[(d.location || '').toLowerCase()] || '-';
        const edNote = calcEdNote(d.expDate, d.updateDate);
        const agingNote = calcAgingNote(d.whArrivalDate);
        const week = calcWeek(d.updateDate);
        return `
        <tr>
            <td>${start + i + 1}</td>
            <td>${escapeHtml(d.location || '-')}</td>
            <td>${escapeHtml(locCat)}</td>
            <td><strong>${escapeHtml(d.sku || '-')}</strong></td>
            <td>${escapeHtml(d.skuCategory || '-')}</td>
            <td>${escapeHtml(d.skuBrand || '-')}</td>
            <td>${escapeHtml(d.zone || '-')}</td>
            <td>${escapeHtml(d.locationType || '-')}</td>
            <td>${escapeHtml(d.owner || '-')}</td>
            <td><span class="badge badge--receive">${escapeHtml(d.status || '-')}</span></td>
            <td>${(parseInt(d.qty) || 0).toLocaleString()}</td>
            <td>${d.whArrivalDate ? formatDate(d.whArrivalDate) : '-'}</td>
            <td>${escapeHtml(d.receiptNo || '-')}</td>
            <td>${d.mfgDate ? formatDate(d.mfgDate) : '-'}</td>
            <td>${d.expDate ? formatDate(d.expDate) : '-'}</td>
            <td>${escapeHtml(d.batchNo || '-')}</td>
            <td>${d.updateDate ? formatDate(d.updateDate) : '-'}</td>
            <td>${week}</td>
            <td><span class="badge ${edNote === 'Expired' ? 'badge--discrepancy' : edNote.includes('1') && edNote.includes('month') ? 'badge--break' : 'badge--putaway'}">${edNote}</span></td>
            <td>${agingNote}</td>
        </tr>`;
    }).join('');
}

function updateSohStats(items) {
    const totalQty = items.reduce((s, d) => s + (parseInt(d.qty) || 0), 0);
    const skus = new Set(items.map(d => d.sku).filter(Boolean));
    const locs = new Set(items.map(d => d.location).filter(Boolean));

    animateCounter('statSohTotal', items.length);
    animateCounter('statSohQty', totalQty);
    animateCounter('statSohSku', skus.size);
    animateCounter('statSohLoc', locs.size);
}

// ========================================
// QC RETURN
// ========================================

function initQcrPage() {
    // Add button
    document.getElementById('btnAddQcr')?.addEventListener('click', () => openQcrModal());

    // SKU blur → auto-lookup Brand from SOH
    document.getElementById('qcrSku')?.addEventListener('blur', () => {
        const sku = document.getElementById('qcrSku')?.value?.trim();
        const brandEl = document.getElementById('qcrBrand');
        if (!brandEl) return;
        if (!sku) { brandEl.value = ''; return; }
        const sohData = getData(STORAGE_KEYS.soh);
        const match = sohData.find(s => (s.sku || '').toLowerCase() === sku.toLowerCase());
        brandEl.value = match ? (match.skuBrand || '') : '';
    });

    // Save button
    document.getElementById('btnSaveQcr')?.addEventListener('click', async () => {
        const editId = document.getElementById('qcrEditId')?.value;
        const date = document.getElementById('qcrDate')?.value;
        const receipt = document.getElementById('qcrReceipt')?.value?.trim();
        const returnDate = document.getElementById('qcrReturnDate')?.value;
        const owner = document.getElementById('qcrOwner')?.value?.trim();
        const sku = document.getElementById('qcrSku')?.value?.trim();
        const brand = document.getElementById('qcrBrand')?.value?.trim();
        const qty = parseInt(document.getElementById('qcrQty')?.value) || 0;
        const fromLoc = document.getElementById('qcrFromLoc')?.value?.trim();
        const toLoc = document.getElementById('qcrToLoc')?.value?.trim();
        const operator = document.getElementById('qcrOperator')?.value?.trim();
        const status = document.getElementById('qcrStatus')?.value || 'Good';

        if (!date || !returnDate || !owner || !sku || qty <= 0 || !fromLoc || !toLoc) {
            showToast('Harap isi semua field wajib (*)', 'error');
            return;
        }

        const data = getData(STORAGE_KEYS.qcReturn);
        const record = { date, receipt, returnDate, brand, owner, sku, qty, fromLoc, toLoc, operator, status };

        if (editId) {
            const idx = data.findIndex(d => d.id === editId);
            if (idx >= 0) {
                record.id = editId;
                record.createdAt = data[idx].createdAt;
                data[idx] = record;
            }
        } else {
            record.id = generateId();
            record.createdAt = new Date().toISOString();
            data.push(record);
        }

        setData(STORAGE_KEYS.qcReturn, data);
        // API sync
        try {
            if (editId) { await apiPut(STORAGE_KEYS.qcReturn, editId, record); }
            else { await apiPost(STORAGE_KEYS.qcReturn, record); }
        } catch (e) { console.warn('QCR API sync failed', e); }
        closeModal('modalQcr');
        renderQcrTable();
        showToast(editId ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan', 'success');
    });

    // Export
    document.getElementById('btnExportQcr')?.addEventListener('click', () => {
        exportToCSV(
            STORAGE_KEYS.qcReturn,
            ['QC Date', 'Receipt#', 'Return Date', 'Brand', 'Owner', 'SKU', 'Qty', 'From Loc', 'To Loc', 'Operator', 'QC Lead Time', 'Status'],
            (d) => [d.date || '', d.receipt || '', d.returnDate || '', d.brand || '', d.owner || '', d.sku || '', d.qty, d.fromLoc || '', d.toLoc || '', d.operator || '', calcLeadTime(d.date, d.returnDate), d.status || 'Good'],
            'qc_return'
        );
    });

    // Import
    document.getElementById('btnImportQcr')?.addEventListener('click', () => {
        importFromCSV(
            STORAGE_KEYS.qcReturn,
            ['QC Date', 'Receipt#', 'Return Date', 'Brand', 'Owner', 'SKU', 'Qty', 'From Loc', 'To Loc', 'Operator', 'Status'],
            (vals) => {
                if (vals.length < 6) return null;
                const sku = vals[5]?.trim() || '';
                let brand = vals[3]?.trim() || '';
                // Auto-lookup brand from SOH if not provided
                if (!brand && sku) {
                    const sohData = getData(STORAGE_KEYS.soh);
                    const match = sohData.find(s => (s.sku || '').toLowerCase() === sku.toLowerCase());
                    if (match) brand = match.skuBrand || '';
                }
                return {
                    date: vals[0]?.trim() || '',
                    receipt: vals[1]?.trim() || '',
                    returnDate: vals[2]?.trim() || '',
                    brand: brand,
                    owner: vals[4]?.trim() || '',
                    sku: sku,
                    qty: parseInt(vals[6]) || 0,
                    fromLoc: vals[7]?.trim() || '',
                    toLoc: vals[8]?.trim() || '',
                    operator: vals[9]?.trim() || '',
                    status: vals[10]?.trim() || 'Good'
                };
            },
            () => renderQcrTable()
        );
    });

    // Search
    const searchInput = document.getElementById('searchQcr');
    searchInput?.addEventListener('input', () => { pageState.Qcr.current = 1; renderQcrTable(searchInput.value); });

    renderQcrTable();

    // Bulk actions
    initBulkActions('Qcr', STORAGE_KEYS.qcReturn,
        ['QC Date', 'Receipt#', 'Return Date', 'Brand', 'Owner', 'SKU', 'Qty', 'From Loc', 'To Loc', 'Operator', 'QC Lead Time', 'Status'],
        (d) => [d.date || '', d.receipt || '', d.returnDate || '', d.brand || '', d.owner || '', d.sku || '', d.qty, d.fromLoc || '', d.toLoc || '', d.operator || '', calcLeadTime(d.date, d.returnDate), d.status || 'Good'],
        renderQcrTable
    );

    // Clear All
    document.getElementById('btnClearQcr')?.addEventListener('click', () => {
        const items = getData(STORAGE_KEYS.qcReturn);
        if (items.length === 0) {
            showToast('Tidak ada data untuk dihapus', 'info');
            return;
        }
        if (confirm(`Hapus semua ${items.length} data QC Return?`)) {
            setData(STORAGE_KEYS.qcReturn, []);
            renderQcrTable();
            showToast('Semua data QC Return berhasil dihapus', 'success');
        }
    });
}

// Calculate QC Lead Time (Return Date - QC Date) in days
function calcLeadTime(qcDate, returnDate) {
    if (!qcDate || !returnDate) return '-';
    const d1 = new Date(qcDate);
    const d2 = new Date(returnDate);
    if (isNaN(d1) || isNaN(d2)) return '-';
    const diffMs = d1 - d2;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays + ' hari';
}

function openQcrModal(editId = null) {
    const modal = document.getElementById('modalQcr');
    const title = document.getElementById('modalQcrTitle');
    const idEl = document.getElementById('qcrEditId');

    document.getElementById('qcrDate').value = '';
    document.getElementById('qcrReceipt').value = '';
    document.getElementById('qcrReturnDate').value = '';
    document.getElementById('qcrOwner').value = '';
    document.getElementById('qcrSku').value = '';
    document.getElementById('qcrBrand').value = '';
    document.getElementById('qcrQty').value = '';
    document.getElementById('qcrFromLoc').value = '';
    document.getElementById('qcrToLoc').value = '';
    document.getElementById('qcrOperator').value = '';
    document.getElementById('qcrStatus').value = 'Good';
    idEl.value = '';

    if (editId) {
        const data = getData(STORAGE_KEYS.qcReturn);
        const item = data.find(d => d.id === editId);
        if (item) {
            title.textContent = 'Edit Data QC Return';
            idEl.value = editId;
            document.getElementById('qcrDate').value = item.date || '';
            document.getElementById('qcrReceipt').value = item.receipt || '';
            document.getElementById('qcrReturnDate').value = item.returnDate || '';
            document.getElementById('qcrOwner').value = item.owner || '';
            document.getElementById('qcrSku').value = item.sku || '';
            document.getElementById('qcrBrand').value = item.brand || '';
            document.getElementById('qcrQty').value = item.qty || '';
            document.getElementById('qcrFromLoc').value = item.fromLoc || '';
            document.getElementById('qcrToLoc').value = item.toLoc || '';
            document.getElementById('qcrOperator').value = item.operator || '';
            document.getElementById('qcrStatus').value = item.status || 'Good';
        }
    } else {
        title.textContent = 'Tambah Data QC Return';
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        document.getElementById('qcrDate').value = today;
        document.getElementById('qcrReturnDate').value = today;
    }

    modal.classList.add('show');
}

function deleteQcr(id) {
    if (!canDelete()) { showToast('Hanya Supervisor/Leader yang bisa menghapus data', 'error'); return; }
    if (!confirm('Hapus data ini?')) return;
    let data = getData(STORAGE_KEYS.qcReturn);
    data = data.filter(d => d.id !== id);
    setData(STORAGE_KEYS.qcReturn, data);
    apiDelete(STORAGE_KEYS.qcReturn, id).catch(() => { });
    renderQcrTable();
    showToast('Data berhasil dihapus', 'success');
}

function renderQcrTable(search = '') {
    const tbody = document.getElementById('qcrTableBody');
    const emptyEl = document.getElementById('qcrEmpty');
    const table = document.getElementById('qcrTable');
    if (!tbody) return;

    let items = getData(STORAGE_KEYS.qcReturn);

    // Build SKU→Brand lookup from latest SOH
    const latestSoh = getLatestSohData();
    const skuBrandMap = {};
    latestSoh.forEach(s => {
        if (s.sku && s.skuBrand) skuBrandMap[s.sku.toLowerCase()] = s.skuBrand;
    });

    const q = (search || document.getElementById('searchQcr')?.value || '').toLowerCase();
    if (q) {
        items = items.filter(d => {
            const brand = d.brand || skuBrandMap[(d.sku || '').toLowerCase()] || '';
            return (d.sku || '').toLowerCase().includes(q) ||
                (d.owner || '').toLowerCase().includes(q) ||
                (d.operator || '').toLowerCase().includes(q) ||
                (d.fromLoc || '').toLowerCase().includes(q) ||
                (d.toLoc || '').toLowerCase().includes(q) ||
                (d.status || '').toLowerCase().includes(q) ||
                (d.receipt || '').toLowerCase().includes(q) ||
                brand.toLowerCase().includes(q);
        });
    }

    updateQcrStats(items);

    if (items.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        renderPagination('Qcr', 0, renderQcrTable);
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    const { start, end } = renderPagination('Qcr', items.length, renderQcrTable);
    const pageData = items.slice(start, end);

    tbody.innerHTML = pageData.map((d, i) => {
        const brand = d.brand || skuBrandMap[(d.sku || '').toLowerCase()] || '-';
        return `
        <tr>
            <td class="td-checkbox"><input type="checkbox" class="row-check" data-id="${d.id}" onchange="updateBulkButtons('Qcr')"></td>
            <td>${start + i + 1}</td>
            <td>${d.date ? formatDate(d.date) : '-'}</td>
            <td>${escapeHtml(d.receipt || '-')}</td>
            <td>${d.returnDate ? formatDate(d.returnDate) : '-'}</td>
            <td>${escapeHtml(brand)}</td>
            <td>${escapeHtml(d.owner || '-')}</td>
            <td><strong>${escapeHtml(d.sku || '-')}</strong></td>
            <td>${(parseInt(d.qty) || 0).toLocaleString()}</td>
            <td>${escapeHtml(d.fromLoc || '-')}</td>
            <td>${escapeHtml(d.toLoc || '-')}</td>
            <td>${escapeHtml(d.operator || '-')}</td>
            <td>${calcLeadTime(d.date, d.returnDate)}</td>
            <td><span class="badge ${(d.status || 'Good') === 'Good' ? 'badge--putaway' : 'badge--discrepancy'}">${escapeHtml(d.status || 'Good')}</span></td>
            <td>
                <div class="action-cell">
                    <button class="btn btn--edit" onclick="openQcrModal('${d.id}')" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn--danger" onclick="deleteQcr('${d.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updateQcrStats(items) {
    const totalQty = items.reduce((s, d) => s + (parseInt(d.qty) || 0), 0);
    const skus = new Set(items.map(d => d.sku).filter(Boolean));
    const owners = new Set(items.map(d => (d.owner || '').toLowerCase()).filter(Boolean));

    animateCounter('statQcrTotal', items.length);
    animateCounter('statQcrQty', totalQty);
    animateCounter('statQcrSku', skus.size);
    animateCounter('statQcrOwner', owners.size);
}

// ========================================
// Master Location Page
// ========================================

// Get SOH data filtered by the LATEST updateDate only
function getLatestSohData() {
    const allSoh = getData(STORAGE_KEYS.soh);
    if (allSoh.length === 0) return [];
    // Find the latest updateDate
    let maxDate = '';
    allSoh.forEach(s => {
        if (s.updateDate && s.updateDate > maxDate) maxDate = s.updateDate;
    });
    if (!maxDate) return allSoh; // fallback if no updateDate
    // Only keep records from that same date (compare date portion only)
    const maxDay = maxDate.substring(0, 10); // YYYY-MM-DD
    return allSoh.filter(s => (s.updateDate || '').substring(0, 10) === maxDay);
}

function initLocPage() {
    // Add button
    document.getElementById('btnAddLoc')?.addEventListener('click', () => openLocModal());

    // Save button
    document.getElementById('btnSaveLoc')?.addEventListener('click', async () => {
        const editId = document.getElementById('locEditId')?.value;
        const location = document.getElementById('locLocation')?.value?.trim();
        const category = document.getElementById('locCategory')?.value?.trim();
        const zone = document.getElementById('locZone')?.value?.trim();
        const locType = document.getElementById('locType')?.value?.trim();

        if (!location) {
            showToast('Location wajib diisi', 'error');
            return;
        }

        const data = getData(STORAGE_KEYS.locations);
        const record = { location, category, zone, locType };

        if (editId) {
            const idx = data.findIndex(d => d.id === editId);
            if (idx >= 0) {
                record.id = editId;
                record.createdAt = data[idx].createdAt;
                data[idx] = record;
            }
        } else {
            record.id = generateId();
            record.createdAt = new Date().toISOString();
            data.push(record);
        }

        setData(STORAGE_KEYS.locations, data);
        // API sync
        try {
            if (editId) { await apiPut(STORAGE_KEYS.locations, editId, record); }
            else { await apiPost(STORAGE_KEYS.locations, record); }
        } catch (e) { console.warn('Location API sync failed', e); }
        closeModal('modalLoc');
        renderLocTable();
        showToast(editId ? 'Location berhasil diupdate' : 'Location berhasil ditambahkan', 'success');
    });

    // Export (includes auto-calc columns)
    document.getElementById('btnExportLoc')?.addEventListener('click', () => {
        const locs = getData(STORAGE_KEYS.locations);
        const latestSoh = getLatestSohData();
        const sohByLoc = buildSohByLoc(latestSoh);

        const headers = ['Location', 'Location Category', 'Zone', 'Location Type', 'Occupancy', 'Stock Level', 'Brand On Location'];
        const rows = locs.map(d => {
            const info = sohByLoc[d.location] || { qty: 0, brand: '-' };
            return [d.location || '', d.category || '', d.zone || '', d.locType || '',
            info.qty > 0 ? 'Occupied' : 'Empty', info.qty, info.brand];
        });

        let csv = headers.join(',') + '\n';
        rows.forEach(r => { csv += r.map(v => `"${v}"`).join(',') + '\n'; });
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'master_location.csv';
        a.click();
        showToast('Export berhasil!', 'success');
    });

    // Import (only location base data)
    document.getElementById('btnImportLoc')?.addEventListener('click', () => {
        importFromCSV(
            STORAGE_KEYS.locations,
            ['Location', 'Location Category', 'Zone', 'Location Type'],
            (vals) => {
                if (vals.length < 1 || !vals[0]?.trim()) return null;
                return {
                    location: vals[0]?.trim() || '',
                    category: vals[1]?.trim() || '',
                    zone: vals[2]?.trim() || '',
                    locType: vals[3]?.trim() || ''
                };
            },
            () => renderLocTable()
        );
    });

    // Refresh SOH button
    document.getElementById('btnRefreshLoc')?.addEventListener('click', () => {
        renderLocTable();
        showToast('Data SOH terbaru berhasil di-refresh', 'success');
    });

    // Search
    const searchInput = document.getElementById('searchLoc');
    searchInput?.addEventListener('input', () => { pageState.Loc.current = 1; renderLocTable(searchInput.value); });

    renderLocTable();

    // Bulk actions
    initBulkActions('Loc', STORAGE_KEYS.locations,
        ['Location', 'Location Category', 'Zone', 'Location Type'],
        (d) => [d.location || '', d.category || '', d.zone || '', d.locType || ''],
        renderLocTable
    );

    // Clear All
    document.getElementById('btnClearLoc')?.addEventListener('click', () => {
        const items = getData(STORAGE_KEYS.locations);
        if (items.length === 0) {
            showToast('Tidak ada data untuk dihapus', 'info');
            return;
        }
        if (confirm(`Hapus semua ${items.length} data location?`)) {
            setData(STORAGE_KEYS.locations, []);
            renderLocTable();
            showToast('Semua data location berhasil dihapus', 'success');
        }
    });
}

// Build SOH lookup by location from latest SOH data
function buildSohByLoc(latestSoh) {
    const byLoc = {};
    latestSoh.forEach(s => {
        const loc = s.location || '';
        if (!loc) return;
        if (!byLoc[loc]) byLoc[loc] = { qty: 0, brands: {} };
        byLoc[loc].qty += parseInt(s.qty) || 0;
        const brand = s.skuBrand || 'Unknown';
        byLoc[loc].brands[brand] = (byLoc[loc].brands[brand] || 0) + (parseInt(s.qty) || 0);
    });
    // Determine dominant brand per location
    Object.keys(byLoc).forEach(loc => {
        const brands = byLoc[loc].brands;
        let topBrand = '-', topQty = 0;
        Object.entries(brands).forEach(([b, q]) => {
            if (q > topQty) { topBrand = b; topQty = q; }
        });
        byLoc[loc].brand = topBrand;
    });
    return byLoc;
}

function openLocModal(editId = null) {
    const modal = document.getElementById('modalLoc');
    const title = document.getElementById('modalLocTitle');
    const idEl = document.getElementById('locEditId');

    document.getElementById('locLocation').value = '';
    document.getElementById('locCategory').value = '';
    document.getElementById('locZone').value = '';
    document.getElementById('locType').value = '';
    idEl.value = '';

    if (editId) {
        const data = getData(STORAGE_KEYS.locations);
        const item = data.find(d => d.id === editId);
        if (item) {
            title.textContent = 'Edit Location';
            idEl.value = editId;
            document.getElementById('locLocation').value = item.location || '';
            document.getElementById('locCategory').value = item.category || '';
            document.getElementById('locZone').value = item.zone || '';
            document.getElementById('locType').value = item.locType || '';
        }
    } else {
        title.textContent = 'Tambah Location';
    }

    modal.classList.add('show');
}

function deleteLoc(id) {
    if (!canDelete()) { showToast('Hanya Supervisor/Leader yang bisa menghapus data', 'error'); return; }
    if (!confirm('Hapus location ini?')) return;
    const data = getData(STORAGE_KEYS.locations).filter(d => d.id !== id);
    setData(STORAGE_KEYS.locations, data);
    apiDelete(STORAGE_KEYS.locations, id).catch(() => { });
    renderLocTable();
    showToast('Location berhasil dihapus', 'success');
}

function renderLocTable(search = '') {
    const tbody = document.getElementById('locTableBody');
    const emptyEl = document.getElementById('locEmpty');
    const table = document.getElementById('locTable');
    if (!tbody) return;

    let items = getData(STORAGE_KEYS.locations);
    const latestSoh = getLatestSohData();
    const sohByLoc = buildSohByLoc(latestSoh);

    const q = (search || document.getElementById('searchLoc')?.value || '').toLowerCase();
    if (q) {
        items = items.filter(d => {
            const info = sohByLoc[d.location] || { qty: 0, brand: '-' };
            return (d.location || '').toLowerCase().includes(q) ||
                (d.category || '').toLowerCase().includes(q) ||
                (d.zone || '').toLowerCase().includes(q) ||
                (d.locType || '').toLowerCase().includes(q) ||
                (info.brand || '').toLowerCase().includes(q);
        });
    }

    updateLocStats(items, sohByLoc);

    if (items.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        renderPagination('Loc', 0, renderLocTable);
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    const { start, end } = renderPagination('Loc', items.length, renderLocTable);
    const pageData = items.slice(start, end);

    tbody.innerHTML = pageData.map((d, i) => {
        const info = sohByLoc[d.location] || { qty: 0, brand: '-' };
        const occupied = info.qty > 0;
        return `
        <tr>
            <td class="td-checkbox"><input type="checkbox" class="row-check" data-id="${d.id}" onchange="updateBulkButtons('Loc')"></td>
            <td>${start + i + 1}</td>
            <td><strong>${escapeHtml(d.location || '-')}</strong></td>
            <td>${escapeHtml(d.category || '-')}</td>
            <td>${escapeHtml(d.zone || '-')}</td>
            <td>${escapeHtml(d.locType || '-')}</td>
            <td><span class="badge ${occupied ? 'badge--receive' : 'badge--discrepancy'}">${occupied ? 'Occupied' : 'Empty'}</span></td>
            <td>${info.qty.toLocaleString()}</td>
            <td>${escapeHtml(info.brand)}</td>
            <td>
                <div class="action-cell">
                    <button class="btn btn--edit" onclick="openLocModal('${d.id}')" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn--danger" onclick="deleteLoc('${d.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updateLocStats(items, sohByLoc) {
    let occupied = 0, empty = 0;
    const zones = new Set();
    items.forEach(d => {
        const info = sohByLoc[d.location] || { qty: 0 };
        if (info.qty > 0) occupied++; else empty++;
        if (d.zone) zones.add(d.zone.toLowerCase());
    });

    animateCounter('statLocTotal', items.length);
    animateCounter('statLocOccupied', occupied);
    animateCounter('statLocEmpty', empty);
    animateCounter('statLocZone', zones.size);
}

// ========================================
// Backup & Restore (all data)
// ========================================

document.getElementById('btnBackupAll')?.addEventListener('click', async () => {
    try {
        const backup = { _meta: { version: 1, date: new Date().toISOString() } };
        // Collect all data from all storage keys
        for (const [name, key] of Object.entries(STORAGE_KEYS)) {
            backup[key] = getData(key);
        }
        const json = JSON.stringify(backup);
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        const d = new Date();
        const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
        a.href = URL.createObjectURL(blob);
        a.download = `inbound_backup_${ts}.json`;
        a.click();
        showToast('Backup berhasil didownload!', 'success');
    } catch (e) {
        alert('Gagal membuat backup: ' + e.message);
    }
});

document.getElementById('btnRestoreAll')?.addEventListener('click', () => {
    document.getElementById('restoreFileInput')?.click();
});

document.getElementById('restoreFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Restore akan MENGGANTI semua data yang ada. Lanjutkan?')) {
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const backup = JSON.parse(ev.target.result);
            for (const [name, key] of Object.entries(STORAGE_KEYS)) {
                if (backup[key] !== undefined) {
                    if (IDB_KEYS.has(key)) {
                        // Write to IndexedDB + update cache
                        _idbCache[key] = backup[key];
                        await setDataIDB(key, backup[key]);
                    } else {
                        localStorage.setItem(key, JSON.stringify(backup[key]));
                    }
                }
            }
            showToast('Restore berhasil! Halaman akan di-reload.', 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (err) {
            alert('Gagal restore: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

// ======================= ATTENDANCE PAGE =======================

// Manpower role helpers
function canEditAttendance() {
    const session = getSession();
    if (!session) return false;
    return ['supervisor', 'leader'].includes(session.role);
}
function canDeleteAttendance() {
    const session = getSession();
    if (!session) return false;
    return session.role === 'supervisor';
}

// Time calculation helpers
function calcShift(clockIn) {
    if (!clockIn) return '-';
    const [h] = clockIn.split(':').map(Number);
    return h < 12 ? 'Shift 1' : 'Shift 2';
}

function calcTotalJam(clockIn, clockOut) {
    if (!clockIn || !clockOut) return '00:00';
    const [ih, im] = clockIn.split(':').map(Number);
    const [oh, om] = clockOut.split(':').map(Number);
    let diffMin = (oh * 60 + om) - (ih * 60 + im);
    if (diffMin < 0) diffMin += 24 * 60; // overnight
    const hh = Math.floor(diffMin / 60);
    const mm = diffMin % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function calcOvertime(totalJam) {
    if (!totalJam || totalJam === '00:00') return '00:00';
    const [hh, mm] = totalJam.split(':').map(Number);
    const totalMin = hh * 60 + mm;
    const threshold = 9 * 60 + 30; // 09:30
    const normalMin = 9 * 60; // 09:00
    if (totalMin >= threshold) {
        const otMin = totalMin - normalMin;
        return `${String(Math.floor(otMin / 60)).padStart(2, '0')}:${String(otMin % 60).padStart(2, '0')}`;
    }
    return '00:00';
}

function initAttendancePage() {
    // Add button
    document.getElementById('btnAddAtt')?.addEventListener('click', () => {
        if (!canEditAttendance()) { showToast('Anda tidak memiliki akses untuk menambah data', 'error'); return; }
        openAttModal();
    });

    // Close modal
    document.getElementById('closeModalAtt')?.addEventListener('click', () => closeModal('modalAtt'));
    document.getElementById('cancelAtt')?.addEventListener('click', () => closeModal('modalAtt'));

    // Save
    document.getElementById('formAtt')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!canEditAttendance()) { showToast('Anda tidak memiliki akses untuk menyimpan data', 'error'); return; }

        const editId = document.getElementById('attEditId')?.value;
        const nik = document.getElementById('attNik')?.value?.trim();
        const name = document.getElementById('attName')?.value?.trim();
        const status = document.getElementById('attStatus')?.value;
        const jobdesc = document.getElementById('attJobdesc')?.value?.trim();
        const divisi = document.getElementById('attDivisi')?.value;
        const date = document.getElementById('attDate')?.value;
        const clockIn = document.getElementById('attClockIn')?.value;
        const clockOut = document.getElementById('attClockOut')?.value;

        if (!nik || !name || !date || !clockIn || !clockOut) {
            showToast('Harap isi semua field wajib (*)', 'error');
            return;
        }

        const data = getData(STORAGE_KEYS.attendance);
        const record = { nik, name, status, jobdesc, divisi, date, clockIn, clockOut };

        if (editId) {
            const idx = data.findIndex(d => d.id === editId);
            if (idx >= 0) {
                record.id = editId;
                record.createdAt = data[idx].createdAt;
                data[idx] = record;
            }
        } else {
            record.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
            record.createdAt = new Date().toISOString();
            data.push(record);
        }

        setData(STORAGE_KEYS.attendance, data);
        // API sync
        try {
            if (editId) { await apiPut(STORAGE_KEYS.attendance, editId, record); }
            else { await apiPost(STORAGE_KEYS.attendance, record); }
        } catch (e2) { console.warn('Attendance API sync failed', e2); }
        closeModal('modalAtt');
        renderAttendanceTable();
        showToast(editId ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan', 'success');
    });

    // Export
    document.getElementById('btnExportAtt')?.addEventListener('click', () => {
        const headers = ['NIK', 'Nama Karyawan', 'Status', 'Jobdesc', 'Divisi', 'Tanggal', 'Clock In', 'Clock Out', 'Shift', 'Total Jam Kerja', 'Overtime'];
        const mapper = (d) => {
            const totalJam = calcTotalJam(d.clockIn, d.clockOut);
            return [d.nik || '', d.name || '', d.status || '', d.jobdesc || '', d.divisi || '', d.date || '', d.clockIn || '', d.clockOut || '', calcShift(d.clockIn), totalJam, calcOvertime(totalJam)];
        };
        exportToCSV(STORAGE_KEYS.attendance, `attendance_${new Date().toISOString().slice(0, 10)}.csv`, headers, mapper);
    });

    // Import
    document.getElementById('btnImportAtt')?.addEventListener('click', () => {
        if (!canEditAttendance()) { showToast('Anda tidak memiliki akses untuk import data', 'error'); return; }
        importFromCSV(
            STORAGE_KEYS.attendance,
            ['NIK', 'Nama Karyawan', 'Status', 'Jobdesc', 'Divisi', 'Tanggal', 'Clock In', 'Clock Out'],
            (vals) => {
                if (vals.length < 6) return null;
                return {
                    nik: vals[0]?.trim() || '',
                    name: vals[1]?.trim() || '',
                    status: vals[2]?.trim() || 'Reguler',
                    jobdesc: vals[3]?.trim() || '',
                    divisi: vals[4]?.trim() || '',
                    date: vals[5]?.trim() || '',
                    clockIn: vals[6]?.trim() || '',
                    clockOut: vals[7]?.trim() || ''
                };
            },
            () => renderAttendanceTable()
        );
    });

    // Clear All
    document.getElementById('btnClearAtt')?.addEventListener('click', () => {
        if (!canDeleteAttendance()) { showToast('Hanya Supervisor yang bisa menghapus data attendance', 'error'); return; }
        const items = getData(STORAGE_KEYS.attendance);
        if (items.length === 0) { showToast('Tidak ada data untuk dihapus', 'info'); return; }
        if (!confirm(`Hapus semua ${items.length} data attendance?`)) return;
        setData(STORAGE_KEYS.attendance, []);
        renderAttendanceTable();
        showToast('Semua data attendance berhasil dihapus', 'success');
    });

    // Search
    const searchInput = document.getElementById('searchAtt');
    searchInput?.addEventListener('input', () => { pageState.Att.current = 1; renderAttendanceTable(searchInput.value); });

    // Hide toolbar buttons for read-only users
    if (!canEditAttendance()) {
        ['btnAddAtt', 'btnExportAtt', 'btnImportAtt', 'btnClearAtt'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    // Date/month filter
    document.getElementById('filterAttDate')?.addEventListener('change', () => { pageState.Att.current = 1; renderAttendanceTable(); });
    document.getElementById('filterAttMonth')?.addEventListener('change', () => { pageState.Att.current = 1; renderAttendanceTable(); });
    document.getElementById('btnClearAttFilter')?.addEventListener('click', () => {
        const df = document.getElementById('filterAttDate'); if (df) df.value = '';
        const mf = document.getElementById('filterAttMonth'); if (mf) mf.value = '';
        pageState.Att.current = 1; renderAttendanceTable();
    });

    // Jobdesc → Divisi auto-fill
    document.getElementById('attJobdesc')?.addEventListener('change', (e) => {
        const divisi = JOBDESC_DIVISI_MAP[e.target.value] || '';
        const divisiEl = document.getElementById('attDivisi');
        if (divisiEl) divisiEl.value = divisi;
    });

    // Bulk delete + select
    const attExpHeaders = ['NIK', 'Nama Karyawan', 'Status', 'Jobdesc', 'Divisi', 'Tanggal', 'Clock In', 'Clock Out'];
    const attExpMapper = (d) => [d.nik || '', d.name || '', d.status || '', d.jobdesc || '', d.divisi || '', d.date || '', d.clockIn || '', d.clockOut || ''];
    initBulkActions('Att', STORAGE_KEYS.attendance, attExpHeaders, attExpMapper, renderAttendanceTable);
}

function openAttModal(editId = null) {
    const modal = document.getElementById('modalAtt');
    const title = document.getElementById('modalAttTitle');
    const divisiEl = document.getElementById('attDivisi');

    document.getElementById('attEditId').value = '';
    document.getElementById('attNik').value = '';
    document.getElementById('attName').value = '';
    document.getElementById('attStatus').value = 'Reguler';
    document.getElementById('attJobdesc').value = '';
    if (divisiEl) { divisiEl.value = ''; divisiEl.disabled = true; }
    document.getElementById('attDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('attClockIn').value = '';
    document.getElementById('attClockOut').value = '';

    if (editId) {
        const data = getData(STORAGE_KEYS.attendance);
        const item = data.find(d => d.id === editId);
        if (item) {
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Attendance';
            document.getElementById('attEditId').value = editId;
            document.getElementById('attNik').value = item.nik || '';
            document.getElementById('attName').value = item.name || '';
            document.getElementById('attStatus').value = item.status || 'Reguler';
            document.getElementById('attJobdesc').value = item.jobdesc || '';
            if (divisiEl) { divisiEl.value = item.divisi || 'Inbound'; }
            document.getElementById('attDate').value = item.date || '';
            document.getElementById('attClockIn').value = item.clockIn || '';
            document.getElementById('attClockOut').value = item.clockOut || '';
        }
    } else {
        title.innerHTML = '<i class="fas fa-user-clock"></i> Tambah Attendance';
    }

    modal.classList.add('show');
}

function deleteAttendance(id) {
    if (!canDeleteAttendance()) { showToast('Hanya Supervisor yang bisa menghapus data attendance', 'error'); return; }
    if (!confirm('Hapus data attendance ini?')) return;
    let data = getData(STORAGE_KEYS.attendance);
    data = data.filter(d => d.id !== id);
    setData(STORAGE_KEYS.attendance, data);
    apiDelete(STORAGE_KEYS.attendance, id).catch(() => { });
    renderAttendanceTable();
    showToast('Data attendance berhasil dihapus', 'success');
}

function renderAttendanceTable(search = '') {
    const tbody = document.getElementById('attTableBody');
    const emptyEl = document.getElementById('attEmpty');
    const table = document.getElementById('attTable');
    if (!tbody) return;

    let items = getData(STORAGE_KEYS.attendance);

    // Date/month filter
    const filterDate = document.getElementById('filterAttDate')?.value || '';
    const filterMonth = document.getElementById('filterAttMonth')?.value || '';
    if (filterDate) {
        items = items.filter(d => (d.date || '') === filterDate);
    } else if (filterMonth) {
        items = items.filter(d => (d.date || '').startsWith(filterMonth));
    }

    const q = (search || document.getElementById('searchAtt')?.value || '').toLowerCase();
    if (q) {
        items = items.filter(d =>
            (d.nik || '').toLowerCase().includes(q) ||
            (d.name || '').toLowerCase().includes(q) ||
            (d.jobdesc || '').toLowerCase().includes(q) ||
            (d.divisi || '').toLowerCase().includes(q) ||
            (d.status || '').toLowerCase().includes(q) ||
            (d.date || '').includes(q)
        );
    }

    // Sort by date desc, then name
    items.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.name || '').localeCompare(b.name || ''));

    // Stats
    updateAttStats(items);

    if (items.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        renderPagination('Att', 0, renderAttendanceTable);
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    const { start, end } = renderPagination('Att', items.length, renderAttendanceTable);
    const pageData = items.slice(start, end);

    const showEdit = canEditAttendance();
    const showDelete = canDeleteAttendance();

    tbody.innerHTML = pageData.map((d, i) => {
        const totalJam = calcTotalJam(d.clockIn, d.clockOut);
        const overtime = calcOvertime(totalJam);
        const shift = calcShift(d.clockIn);
        const statusBadge = d.status === 'Tambahan'
            ? '<span class="badge badge--warning">Tambahan</span>'
            : '<span class="badge badge--info">Reguler</span>';
        const shiftBadge = shift === 'Shift 1'
            ? '<span class="badge badge--success">Shift 1</span>'
            : '<span class="badge badge--purple">Shift 2</span>';
        const otClass = overtime !== '00:00' ? 'color: var(--accent-green); font-weight: 600;' : 'color: var(--text-muted);';

        let actions = '';
        if (showEdit) {
            actions += `<button class="btn btn--outline btn--sm" onclick="openAttModal('${d.id}')" title="Edit"><i class="fas fa-edit"></i></button>`;
        }
        if (showDelete) {
            actions += ` <button class="btn btn--danger btn--sm" onclick="deleteAttendance('${d.id}')" title="Hapus"><i class="fas fa-trash"></i></button>`;
        }

        return `<tr>
            <td class="td-checkbox"><input type="checkbox" class="row-check" data-id="${d.id}"></td>
            <td>${start + i + 1}</td>
            <td>${escapeHtml(d.nik || '-')}</td>
            <td>${escapeHtml(d.name || '-')}</td>
            <td>${statusBadge}</td>
            <td>${escapeHtml(d.jobdesc || '-')}</td>
            <td>${escapeHtml(d.divisi || '-')}</td>
            <td>${d.date || '-'}</td>
            <td>${d.clockIn || '-'}</td>
            <td>${d.clockOut || '-'}</td>
            <td>${shiftBadge}</td>
            <td style="font-weight:600;">${totalJam}</td>
            <td style="${otClass}">${overtime}</td>
            <td>${actions || '-'}</td>
        </tr>`;
    }).join('');
}

function updateAttStats(items) {
    const shift1 = items.filter(d => calcShift(d.clockIn) === 'Shift 1').length;
    const shift2 = items.filter(d => calcShift(d.clockIn) === 'Shift 2').length;
    const otCount = items.filter(d => {
        const totalJam = calcTotalJam(d.clockIn, d.clockOut);
        return calcOvertime(totalJam) !== '00:00';
    }).length;

    animateCounter('statAttTotal', items.length);
    animateCounter('statAttShift1', shift1);
    animateCounter('statAttShift2', shift2);
    animateCounter('statAttOvertime', otCount);
}

// ======================= PRODUCTIVITY PAGE =======================

function initProductivityPage() {
    // Search
    const searchInput = document.getElementById('searchProd');
    searchInput?.addEventListener('input', () => renderProductivityTable(searchInput.value));

    // Date/month filter
    document.getElementById('filterProdDate')?.addEventListener('change', () => renderProductivityTable());
    document.getElementById('filterProdMonth')?.addEventListener('change', () => renderProductivityTable());
    document.getElementById('btnClearProdFilter')?.addEventListener('click', () => {
        const df = document.getElementById('filterProdDate'); if (df) df.value = '';
        const mf = document.getElementById('filterProdMonth'); if (mf) mf.value = '';
        renderProductivityTable();
    });

    // Export
    document.getElementById('btnExportProd')?.addEventListener('click', () => {
        const { inspection, receive, vas, dcc, qc, project } = buildProductivityData();
        const q = document.getElementById('searchProd')?.value || '';
        const fInspection = applyProdSearch(inspection, q);
        const fReceive = applyProdSearch(receive, q);
        const fVas = applyProdSearch(vas, q);
        const fDcc = applyProdSearch(dcc, q);
        const fQc = applyProdSearch(qc, q);
        const fProject = applyProdSearch(project, q);

        const headers = ['Kategori', 'Rank', 'Nama Karyawan', 'Divisi', 'Job Desc', 'Nilai'];
        const rows = [];
        fInspection.forEach((d, i) => rows.push(['Inspection', i + 1, d.name, d.divisi, d.jobdesc, d.value]));
        fReceive.forEach((d, i) => rows.push(['Receive & Putaway', i + 1, d.name, d.divisi, d.jobdesc, d.value]));
        fVas.forEach((d, i) => rows.push(['Value Added Service', i + 1, d.name, d.divisi, d.jobdesc, d.value]));
        fDcc.forEach((d, i) => rows.push(['Daily Cycle Count', i + 1, d.name, d.divisi, d.jobdesc, d.valueLabel || d.value]));
        fQc.forEach((d, i) => rows.push(['Damage & QC Return', i + 1, d.name, d.divisi, d.jobdesc, d.value]));
        fProject.forEach((d, i) => rows.push(['Project', i + 1, d.name, d.divisi, d.jobdesc, d.value]));

        let csv = '\uFEFF' + headers.join(',') + '\n';
        rows.forEach(r => { csv += r.map(v => `"${v}"`).join(',') + '\n'; });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `productivity_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Export CSV berhasil', 'success');
    });

    // Project CRUD
    document.getElementById('btnAddProject')?.addEventListener('click', () => openProjectModal());
    document.getElementById('closeModalProject')?.addEventListener('click', () => closeModal('modalProject'));
    document.getElementById('cancelProject')?.addEventListener('click', () => closeModal('modalProject'));

    document.getElementById('formProject')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('projEditId')?.value;
        const name = document.getElementById('projName')?.value?.trim();
        const task = document.getElementById('projTask')?.value?.trim();
        const qty = parseInt(document.getElementById('projQty')?.value) || 0;
        const date = document.getElementById('projDate')?.value;

        if (!name || !task || qty <= 0 || !date) {
            showToast('Harap isi semua field', 'error');
            return;
        }

        const data = getData(STORAGE_KEYS.projectProd);
        const record = { name, task, qty, date };

        if (editId) {
            const idx = data.findIndex(d => d.id === editId);
            if (idx >= 0) { record.id = editId; data[idx] = record; }
        } else {
            record.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
            data.push(record);
        }

        setData(STORAGE_KEYS.projectProd, data);
        // API sync
        try {
            if (editId) { await apiPut(STORAGE_KEYS.projectProd, editId, record); }
            else { await apiPost(STORAGE_KEYS.projectProd, record); }
        } catch (e2) { console.warn('ProjectProd API sync failed', e2); }
        closeModal('modalProject');
        renderProductivityTable();
        showToast(editId ? 'Data project diupdate' : 'Data project ditambahkan', 'success');
    });
}

function buildProductivityData() {
    let attendance = getData(STORAGE_KEYS.attendance);
    let arrivals = getData(STORAGE_KEYS.arrivals);
    let transactions = getData(STORAGE_KEYS.transactions);
    let vasData = getData(STORAGE_KEYS.vas);
    let dccData = getData(STORAGE_KEYS.dcc);
    let damageData = getData(STORAGE_KEYS.damage);
    let qcrData = getData(STORAGE_KEYS.qcReturn);

    // Apply date/month filter from productivity toolbar
    const filterDate = document.getElementById('filterProdDate')?.value || '';
    const filterMonth = document.getElementById('filterProdMonth')?.value || '';

    function matchDate(dateStr) {
        if (!dateStr) return false;
        if (filterDate) return dateStr === filterDate;
        if (filterMonth) return dateStr.startsWith(filterMonth);
        return true; // no filter = all
    }

    if (filterDate || filterMonth) {
        attendance = attendance.filter(a => matchDate(a.date || ''));
        arrivals = arrivals.filter(d => matchDate(d.date || d.arrivalDate || ''));
        transactions = transactions.filter(d => matchDate(d.date || d.transDate || ''));
        vasData = vasData.filter(d => matchDate(d.date || d.transDate || ''));
        dccData = dccData.filter(d => matchDate(d.date || ''));
        damageData = damageData.filter(d => matchDate(d.date || ''));
        qcrData = qcrData.filter(d => matchDate(d.date || ''));
    }

    // Build empMap from ALL sources (not just attendance)
    const empMap = {};

    function addEmp(name, divisi, jobdesc) {
        const key = (name || '').trim().toLowerCase();
        if (!key) return;
        if (!empMap[key]) {
            empMap[key] = { name: name || '', divisi: divisi || '', jobdesc: jobdesc || '' };
        }
    }

    // From attendance
    attendance.forEach(a => addEmp(a.name, a.divisi, a.jobdesc));

    // From arrivals, transactions, VAS (Inbound)
    arrivals.forEach(d => addEmp(d.operator, 'Inbound', ''));
    transactions.forEach(d => addEmp(d.operator, 'Inbound', d.operation || ''));
    vasData.forEach(d => addEmp(d.operator, 'Inbound', 'VAS'));

    // From DCC
    dccData.forEach(d => addEmp(d.operator, 'Inventory', 'Cycle Count'));

    // From Damage, QC Return
    damageData.forEach(d => addEmp(d.qcBy, 'Inventory', 'Project Damage'));
    qcrData.forEach(d => addEmp(d.operator, 'Inventory', 'QC Return'));

    const inspectionList = [];
    const receiveList = [];
    const vasList = [];
    const dccList = [];
    const qcList = [];
    const projectList = [];

    for (const [key, emp] of Object.entries(empMap)) {
        // Inspection (Inbound Arrival)
        let arrivalQty = 0;
        arrivals.forEach(d => {
            if ((d.operator || '').trim().toLowerCase() === key) arrivalQty += (parseInt(d.poQty) || 0);
        });
        if (arrivalQty > 0) {
            inspectionList.push({ ...emp, value: arrivalQty, detail: `${arrivalQty.toLocaleString()} pcs inspected` });
        }

        // Receive & Putaway (Inbound Transaction)
        let transQty = 0;
        transactions.forEach(d => {
            if ((d.operator || '').trim().toLowerCase() === key) transQty += (parseInt(d.qty) || 0);
        });
        if (transQty > 0) {
            receiveList.push({ ...emp, value: transQty, detail: `${transQty.toLocaleString()} pcs received/putaway` });
        }

        // VAS (Value Added Service)
        let vasQty = 0;
        vasData.forEach(d => {
            if ((d.operator || '').trim().toLowerCase() === key) vasQty += (parseInt(d.qty) || 0);
        });
        if (vasQty > 0) {
            vasList.push({ ...emp, value: vasQty, detail: `${vasQty.toLocaleString()} pcs VAS` });
        }

        // DCC: qty + locations
        let dccQty = 0;
        const dccLocSet = new Set();
        dccData.forEach(d => {
            if ((d.operator || '').trim().toLowerCase() === key) {
                dccQty += (parseInt(d.sysQty) || 0) + (parseInt(d.phyQty) || 0);
                if (d.location) dccLocSet.add(d.location);
            }
        });
        if (dccQty > 0 || dccLocSet.size > 0) {
            dccList.push({ ...emp, value: dccQty, locCount: dccLocSet.size, valueLabel: `${dccQty.toLocaleString()} pcs / ${dccLocSet.size} loc`, detail: `${dccLocSet.size} lokasi dicek` });
        }

        // QC: Damage + QC Return
        let dmgQty = 0;
        damageData.forEach(d => {
            if ((d.qcBy || '').trim().toLowerCase() === key) dmgQty += (parseInt(d.qty) || 0);
        });
        let qcrQty = 0;
        qcrData.forEach(d => {
            if ((d.operator || '').trim().toLowerCase() === key) qcrQty += (parseInt(d.qty) || 0);
        });
        const qcTotal = dmgQty + qcrQty;
        if (qcTotal > 0) {
            qcList.push({ ...emp, value: qcTotal, detail: `Damage: ${dmgQty.toLocaleString()} | QC Return: ${qcrQty.toLocaleString()}` });
        }
    }

    // Project (manual input)
    let projData = getData(STORAGE_KEYS.projectProd);
    if (filterDate || filterMonth) {
        projData = projData.filter(d => matchDate(d.date || ''));
    }
    const projMap = {};
    projData.forEach(d => {
        const key = (d.name || '').trim().toLowerCase();
        if (!key) return;
        if (!projMap[key]) projMap[key] = { name: d.name, tasks: new Set(), qty: 0 };
        projMap[key].qty += (parseInt(d.qty) || 0);
        if (d.task) projMap[key].tasks.add(d.task);
    });
    for (const [, p] of Object.entries(projMap)) {
        const taskList = [...p.tasks].join(', ');
        projectList.push({ name: p.name, divisi: 'Project', jobdesc: taskList, value: p.qty, detail: taskList });
    }

    inspectionList.sort((a, b) => b.value - a.value);
    receiveList.sort((a, b) => b.value - a.value);
    vasList.sort((a, b) => b.value - a.value);
    dccList.sort((a, b) => b.value - a.value);
    qcList.sort((a, b) => b.value - a.value);
    projectList.sort((a, b) => b.value - a.value);

    return { inspection: inspectionList, receive: receiveList, vas: vasList, dcc: dccList, qc: qcList, project: projectList };
}

function applyProdSearch(data, search) {
    const q = (search || '').toLowerCase();
    if (!q) return data;
    return data.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.divisi.toLowerCase().includes(q) ||
        d.jobdesc.toLowerCase().includes(q)
    );
}

function renderPodium(containerId, items) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (items.length === 0) {
        el.innerHTML = '<div class="podium-empty"><i class="fas fa-inbox"></i><p>Belum ada data</p></div>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const top3 = items.slice(0, 3);

    el.innerHTML = top3.map((d, i) => {
        const rank = i + 1;
        const valDisplay = d.valueLabel || d.value.toLocaleString();
        return `<div class="podium-item podium-item--${rank}">
            <div class="podium-item__medal">${medals[i]}</div>
            <div class="podium-item__name" title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</div>
            <div class="podium-item__value">${valDisplay}</div>
            <div class="podium-item__bar"></div>
        </div>`;
    }).join('');
}

function renderRankList(containerId, items) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const rest = items.slice(3);
    if (rest.length === 0) {
        el.innerHTML = '';
        return;
    }

    el.innerHTML = rest.map((d, i) => {
        const rank = i + 4;
        const valDisplay = d.valueLabel || d.value.toLocaleString();
        return `<div class="rank-row">
            <div class="rank-row__position">${rank}</div>
            <div class="rank-row__info">
                <div class="rank-row__name" title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</div>
                <div class="rank-row__detail">${escapeHtml(d.divisi)} · ${escapeHtml(d.jobdesc)}</div>
            </div>
            <div class="rank-row__value">${valDisplay}</div>
        </div>`;
    }).join('');
}

function renderProductivityTable(search = '') {
    const emptyEl = document.getElementById('prodEmpty');
    const gridEl = document.querySelector('.leaderboard-grid');

    const { inspection, receive, vas, dcc, qc, project } = buildProductivityData();
    const q = search || document.getElementById('searchProd')?.value || '';

    const fInspection = applyProdSearch(inspection, q);
    const fReceive = applyProdSearch(receive, q);
    const fVas = applyProdSearch(vas, q);
    const fDcc = applyProdSearch(dcc, q);
    const fQc = applyProdSearch(qc, q);
    const fProject = applyProdSearch(project, q);

    const hasData = fInspection.length > 0 || fReceive.length > 0 || fVas.length > 0 || fDcc.length > 0 || fQc.length > 0 || fProject.length > 0;

    if (!hasData) {
        if (gridEl) gridEl.style.display = 'none';
        if (emptyEl) emptyEl.classList.add('show');
        return;
    }

    if (gridEl) gridEl.style.display = '';
    if (emptyEl) emptyEl.classList.remove('show');

    renderPodium('podiumInspection', fInspection);
    renderRankList('listInspection', fInspection);

    renderPodium('podiumReceive', fReceive);
    renderRankList('listReceive', fReceive);

    renderPodium('podiumVas', fVas);
    renderRankList('listVas', fVas);

    renderPodium('podiumDcc', fDcc);
    renderRankList('listDcc', fDcc);

    renderPodium('podiumQc', fQc);
    renderRankList('listQc', fQc);

    renderPodium('podiumProject', fProject);
    renderRankList('listProject', fProject);
}

function openProjectModal(editData) {
    document.getElementById('projEditId').value = editData?.id || '';
    document.getElementById('projName').value = editData?.name || '';
    document.getElementById('projTask').value = editData?.task || '';
    document.getElementById('projQty').value = editData?.qty || '';
    document.getElementById('projDate').value = editData?.date || new Date().toISOString().slice(0, 10);
    document.getElementById('modalProjectTitle').innerHTML = editData
        ? '<i class="fas fa-edit"></i> Edit Data Project'
        : '<i class="fas fa-project-diagram"></i> Tambah Data Project';
    document.getElementById('modalProject')?.classList.add('show');
}

function deleteProjectEntry(id) {
    if (!confirm('Hapus data project ini?')) return;
    let data = getData(STORAGE_KEYS.projectProd);
    data = data.filter(d => d.id !== id);
    setData(STORAGE_KEYS.projectProd, data);
    apiDelete(STORAGE_KEYS.projectProd, id).catch(() => { });
    renderProductivityTable();
    showToast('Data project dihapus', 'success');
}

// ======================= JOBDESC → DIVISI MAP =======================
const JOBDESC_DIVISI_MAP = {
    'Receive': 'Inbound',
    'Putaway': 'Inbound',
    'Inspect': 'Inbound',
    'Bongkaran': 'Inbound',
    'VAS': 'Inbound',
    'Troubleshoot': 'Inventory',
    'Replenish': 'Inventory',
    'Project Inventory': 'Inventory',
    'Project Damage': 'Inventory',
    'Rejection': 'Inventory',
    'Cycle Count': 'Inventory',
    'STO': 'Inventory',
    'Return': 'Return',
    'Admin': 'Admin'
};

// ======================= EMPLOYEES PAGE =======================
function initEmployeesPage() {
    document.getElementById('btnAddEmp')?.addEventListener('click', () => openEmpModal());

    document.getElementById('closeModalEmp')?.addEventListener('click', () => closeModal('modalEmp'));
    document.getElementById('cancelEmp')?.addEventListener('click', () => closeModal('modalEmp'));

    // Save
    document.getElementById('formEmp')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('empEditId')?.value;
        const nik = document.getElementById('empNik')?.value?.trim();
        const name = document.getElementById('empName')?.value?.trim();
        const status = document.getElementById('empStatus')?.value;

        const clockInNote = document.getElementById('empClockInNote')?.value?.trim() || '';

        if (!nik || !name) {
            showToast('Harap isi NIK dan Nama Karyawan', 'error');
            return;
        }

        const data = getData(STORAGE_KEYS.employees);

        // Check unique NIK
        const dupIdx = data.findIndex(d => d.nik === nik && d.id !== editId);
        if (dupIdx >= 0) {
            showToast('NIK sudah terdaftar!', 'error');
            return;
        }

        const record = { nik, name, status, clockInNote };

        if (editId) {
            const idx = data.findIndex(d => d.id === editId);
            if (idx >= 0) {
                record.id = editId;
                record.createdAt = data[idx].createdAt;
                data[idx] = record;
            }
        } else {
            record.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
            record.createdAt = new Date().toISOString();
            data.push(record);
        }

        setData(STORAGE_KEYS.employees, data);
        // API sync
        try {
            if (editId) { await apiPut(STORAGE_KEYS.employees, editId, record); }
            else { await apiPost(STORAGE_KEYS.employees, record); }
        } catch (e2) { console.warn('Employee API sync failed', e2); }
        closeModal('modalEmp');
        renderEmployeesTable();
        showToast(editId ? 'Data berhasil diupdate' : 'Karyawan berhasil ditambahkan', 'success');
    });

    // Export
    document.getElementById('btnExportEmp')?.addEventListener('click', () => {
        const headers = ['NIK', 'Nama Karyawan', 'Status', 'Note Clock In'];
        const mapper = (d) => [d.nik || '', d.name || '', d.status || '', d.clockInNote || ''];
        exportToCSV(STORAGE_KEYS.employees, `employees_${new Date().toISOString().slice(0, 10)}.csv`, headers, mapper);
    });

    // Import
    document.getElementById('btnImportEmp')?.addEventListener('click', () => {
        importFromCSV(
            STORAGE_KEYS.employees,
            ['NIK', 'Nama Karyawan', 'Status', 'Note Clock In'],
            (vals) => {
                if (vals.length < 2) return null;
                return {
                    nik: vals[0]?.trim() || '',
                    name: vals[1]?.trim() || '',
                    status: vals[2]?.trim() || 'Reguler',
                    clockInNote: vals[3]?.trim() || ''
                };
            },
            () => renderEmployeesTable()
        );
    });

    // Clear All
    document.getElementById('btnClearEmp')?.addEventListener('click', () => {
        const items = getData(STORAGE_KEYS.employees);
        if (items.length === 0) { showToast('Tidak ada data untuk dihapus', 'info'); return; }
        if (!confirm(`Hapus semua ${items.length} data karyawan?`)) return;
        setData(STORAGE_KEYS.employees, []);
        renderEmployeesTable();
        showToast('Semua data karyawan berhasil dihapus', 'success');
    });

    // Search
    const searchInput = document.getElementById('searchEmp');
    searchInput?.addEventListener('input', () => { pageState.Emp.current = 1; renderEmployeesTable(searchInput.value); });

    // Bulk actions
    const empHeaders = ['NIK', 'Nama Karyawan', 'Status', 'Note Clock In'];
    const empMapper = (d) => [d.nik || '', d.name || '', d.status || '', d.clockInNote || ''];
    initBulkActions('Emp', STORAGE_KEYS.employees, empHeaders, empMapper, renderEmployeesTable);
}

function openEmpModal(editId = null) {
    const modal = document.getElementById('modalEmp');
    const title = document.getElementById('modalEmpTitle');

    document.getElementById('empEditId').value = '';
    document.getElementById('empNik').value = '';
    document.getElementById('empName').value = '';
    document.getElementById('empStatus').value = 'Reguler';
    document.getElementById('empClockInNote').value = '';

    if (editId) {
        const data = getData(STORAGE_KEYS.employees);
        const item = data.find(d => d.id === editId);
        if (item) {
            title.innerHTML = '<i class="fas fa-edit"></i> Edit Karyawan';
            document.getElementById('empEditId').value = editId;
            document.getElementById('empNik').value = item.nik || '';
            document.getElementById('empName').value = item.name || '';
            document.getElementById('empStatus').value = item.status || 'Reguler';
            document.getElementById('empClockInNote').value = item.clockInNote || '';
        }
    } else {
        title.innerHTML = '<i class="fas fa-id-card"></i> Tambah Karyawan';
    }

    modal.classList.add('show');
}

function deleteEmployee(id) {
    if (!confirm('Hapus data karyawan ini?')) return;
    let data = getData(STORAGE_KEYS.employees);
    data = data.filter(d => d.id !== id);
    setData(STORAGE_KEYS.employees, data);
    apiDelete(STORAGE_KEYS.employees, id).catch(() => { });
    renderEmployeesTable();
    showToast('Data karyawan berhasil dihapus', 'success');
}

function renderEmployeesTable(search = '') {
    const tbody = document.getElementById('empTableBody');
    const emptyEl = document.getElementById('empEmpty');
    const table = document.getElementById('empTable');
    if (!tbody) return;

    let items = getData(STORAGE_KEYS.employees);

    const q = (search || document.getElementById('searchEmp')?.value || '').toLowerCase();
    if (q) {
        items = items.filter(d =>
            (d.nik || '').toLowerCase().includes(q) ||
            (d.name || '').toLowerCase().includes(q) ||
            (d.status || '').toLowerCase().includes(q)
        );
    }

    // Stats
    const allEmps = getData(STORAGE_KEYS.employees);
    animateCounter('statEmpTotal', allEmps.length);
    animateCounter('statEmpReguler', allEmps.filter(d => d.status === 'Reguler').length);
    animateCounter('statEmpTambahan', allEmps.filter(d => d.status === 'Tambahan').length);

    if (items.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        emptyEl.classList.add('show');
        renderPagination('Emp', 0, renderEmployeesTable);
        return;
    }

    table.style.display = '';
    emptyEl.classList.remove('show');

    const { start, end } = renderPagination('Emp', items.length, renderEmployeesTable);
    const pageData = items.slice(start, end);

    tbody.innerHTML = pageData.map((d, i) => {
        const statusBadge = d.status === 'Tambahan'
            ? '<span class="badge badge--warning">Tambahan</span>'
            : '<span class="badge badge--info">Reguler</span>';
        return `<tr>
            <td class="td-checkbox"><input type="checkbox" class="row-check" data-id="${d.id}"></td>
            <td>${start + i + 1}</td>
            <td>${escapeHtml(d.nik || '-')}</td>
            <td>${escapeHtml(d.name || '-')}</td>
            <td>${statusBadge}</td>
            <td style="max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;color:#94a3b8" title="${escapeHtml(d.clockInNote || '')}">${escapeHtml(d.clockInNote || '-')}</td>
            <td>
                <button class="btn btn--outline btn--sm" onclick="openEmpModal('${d.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn btn--danger btn--sm" onclick="deleteEmployee('${d.id}')" title="Hapus"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

// ======================= CLOCK IN/OUT PAGE =======================
let _clockInterval = null;

function initClockPage() {
    // Live clock
    if (_clockInterval) clearInterval(_clockInterval);
    function updateClock() {
        const now = new Date();
        const timeEl = document.getElementById('clockCurrentTime');
        const dateEl = document.getElementById('clockCurrentDate');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (dateEl) dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    updateClock();
    _clockInterval = setInterval(updateClock, 1000);

    // Start live log refresh
    startClockLogRefresh();

    // NIK auto-lookup
    const nikInput = document.getElementById('clockNik');
    nikInput?.addEventListener('input', () => {
        const nik = nikInput.value.trim();
        const nameDisplay = document.getElementById('clockNameDisplay');
        if (!nik) {
            if (nameDisplay) { nameDisplay.textContent = '-'; nameDisplay.className = 'clock-info-display'; }
            return;
        }
        const employees = getData(STORAGE_KEYS.employees);
        const emp = employees.find(e => (e.nik || '').toLowerCase() === nik.toLowerCase());
        if (emp) {
            if (nameDisplay) {
                nameDisplay.textContent = emp.name;
                nameDisplay.className = 'clock-info-display found';
            }
        } else {
            if (nameDisplay) {
                nameDisplay.textContent = 'Karyawan Tidak Terdaftar';
                nameDisplay.className = 'clock-info-display not-found';
            }
        }
    });

    // Jobdesc → Divisi
    const jobdescSelect = document.getElementById('clockJobdesc');
    jobdescSelect?.addEventListener('change', () => {
        const divisiDisplay = document.getElementById('clockDivisiDisplay');
        const divisi = JOBDESC_DIVISI_MAP[jobdescSelect.value] || '-';
        if (divisiDisplay) {
            divisiDisplay.textContent = divisi;
            divisiDisplay.className = divisi !== '-' ? 'clock-info-display found' : 'clock-info-display';
        }
    });

    // Clock In
    document.getElementById('btnClockIn')?.addEventListener('click', function () {
        const btn = this; if (btn.disabled) return; btn.disabled = true; setTimeout(() => btn.disabled = false, 2000);
        const nik = document.getElementById('clockNik')?.value?.trim();
        const jobdesc = document.getElementById('clockJobdesc')?.value;
        if (!nik || !jobdesc) {
            showClockStatus('Harap isi NIK dan Jobdesc', 'error');
            return;
        }

        const employees = getData(STORAGE_KEYS.employees);
        const emp = employees.find(e => (e.nik || '').toLowerCase() === nik.toLowerCase());
        if (!emp) {
            showClockStatus('Karyawan Tidak Terdaftar!', 'error');
            return;
        }

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const clockIn = now.toTimeString().slice(0, 5);
        const divisi = JOBDESC_DIVISI_MAP[jobdesc] || '';

        const data = getData(STORAGE_KEYS.attendance);

        // Check if already clocked in today
        const existing = data.find(d => d.nik === emp.nik && d.date === today && !d.clockOut);
        if (existing) {
            showClockStatus(`${emp.name} sudah Clock In hari ini (${existing.clockIn}). Silakan Clock Out dulu.`, 'error');
            return;
        }

        const record = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            nik: emp.nik,
            name: emp.name,
            status: emp.status,
            jobdesc,
            divisi,
            date: today,
            clockIn,
            clockOut: '',
            createdAt: now.toISOString()
        };

        data.push(record);
        setData(STORAGE_KEYS.attendance, data);

        showClockStatus(`✅ Clock In berhasil! ${emp.name} — ${clockIn}`, 'success');
        showClockInPopup(emp.name, emp.clockInNote || '');

        // Reset form
        document.getElementById('clockNik').value = '';
        document.getElementById('clockJobdesc').value = '';
        document.getElementById('clockNameDisplay').textContent = '-';
        document.getElementById('clockNameDisplay').className = 'clock-info-display';
        document.getElementById('clockDivisiDisplay').textContent = '-';
        document.getElementById('clockDivisiDisplay').className = 'clock-info-display';

        renderClockPage();
    });

    // Clock Out
    document.getElementById('btnClockOut')?.addEventListener('click', function () {
        const btn = this; if (btn.disabled) return; btn.disabled = true; setTimeout(() => btn.disabled = false, 2000);
        const nik = document.getElementById('clockNik')?.value?.trim();
        if (!nik) {
            showClockStatus('Harap isi NIK untuk Clock Out', 'error');
            return;
        }

        const employees = getData(STORAGE_KEYS.employees);
        const emp = employees.find(e => (e.nik || '').toLowerCase() === nik.toLowerCase());
        if (!emp) {
            showClockStatus('Karyawan Tidak Terdaftar!', 'error');
            return;
        }

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const clockOut = now.toTimeString().slice(0, 5);

        const data = getData(STORAGE_KEYS.attendance);
        const idx = data.findIndex(d => d.nik === emp.nik && d.date === today && !d.clockOut);
        if (idx < 0) {
            showClockStatus(`${emp.name} belum Clock In hari ini!`, 'error');
            return;
        }

        data[idx].clockOut = clockOut;
        setData(STORAGE_KEYS.attendance, data);

        showClockStatus(`✅ Clock Out berhasil! ${emp.name} — ${clockOut}`, 'success');
        showClockOutPopup(emp.name);

        // Reset form
        document.getElementById('clockNik').value = '';
        document.getElementById('clockJobdesc').value = '';
        document.getElementById('clockNameDisplay').textContent = '-';
        document.getElementById('clockNameDisplay').className = 'clock-info-display';
        document.getElementById('clockDivisiDisplay').textContent = '-';
        document.getElementById('clockDivisiDisplay').className = 'clock-info-display';

        renderClockPage();
    });

    // Back button in standalone mode → return to login
    if (window._standaloneClockMode) {
        const backBtn = document.getElementById('btn-back-clock-inout');
        if (backBtn) {
            backBtn.onclick = (e) => {
                e.preventDefault();
                window._standaloneClockMode = false;
                document.getElementById('sidebar')?.style.removeProperty('display');
                document.getElementById('tabBar')?.style.removeProperty('display');
                document.querySelector('.header')?.style.removeProperty('display');
                document.querySelector('.main-content')?.style.removeProperty('padding-left');
                showLogin();
            };
        }
    }
}

function showClockStatus(msg, type) {
    const el = document.getElementById('clockStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = `clock-status show ${type}`;
    setTimeout(() => { el.className = 'clock-status'; }, 5000);
}

function renderClockPage() {
    const tbody = document.getElementById('clockLogBody');
    const emptyEl = document.getElementById('clockLogEmpty');
    const table = document.getElementById('clockLogTable');
    if (!tbody) return;

    const _now = new Date();
    const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    const allData = getData(STORAGE_KEYS.attendance);

    // Carry-over alert: previous days without clock out
    const carryover = allData.filter(d => d.date && d.date < today && !d.clockOut);
    const alertEl = document.getElementById('clockCarryoverAlert');
    if (alertEl) {
        if (carryover.length > 0) {
            const names = carryover.map(d => `<li><strong>${escapeHtml(d.name)}</strong> (${d.date}, Clock In: ${d.clockIn})</li>`).join('');
            alertEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>${carryover.length} karyawan belum Clock Out dari hari sebelumnya:</strong><ul>${names}</ul>`;
            alertEl.style.display = '';
        } else {
            alertEl.style.display = 'none';
        }
    }
    // Show ALL today's records (both clocked-in and clocked-out)
    const todayData = allData.filter(d => d.date === today);

    if (todayData.length === 0) {
        tbody.innerHTML = '';
        if (table) table.style.display = 'none';
        if (emptyEl) emptyEl.classList.add('show');
        return;
    }

    if (table) table.style.display = '';
    if (emptyEl) emptyEl.classList.remove('show');

    const now = new Date();

    tbody.innerHTML = todayData.map((d, i) => {
        let durationText = '-';
        let durationClass = '';
        let statusBadge = '';

        if (d.clockIn) {
            const [h, m] = d.clockIn.split(':').map(Number);
            const clockInTime = new Date(now);
            clockInTime.setHours(h, m, 0, 0);

            let endTime;
            if (d.clockOut) {
                const [oh, om] = d.clockOut.split(':').map(Number);
                endTime = new Date(now);
                endTime.setHours(oh, om, 0, 0);
                statusBadge = '<span class="badge badge--success">Selesai</span>';
            } else {
                endTime = now;
                statusBadge = '<span class="badge badge--warning">Belum Clock Out</span>';
            }

            const diffMs = endTime - clockInTime;
            if (diffMs > 0) {
                const totalSec = Math.floor(diffMs / 1000);
                const hrs = Math.floor(totalSec / 3600);
                const mins = Math.floor((totalSec % 3600) / 60);
                const secs = totalSec % 60;
                durationText = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

                if (hrs >= 10) {
                    durationClass = 'duration-danger';
                } else if (hrs >= 9) {
                    durationClass = 'duration-warning';
                }
            }
        }

        return `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(d.nik || '-')}</td>
            <td>${escapeHtml(d.name || '-')}</td>
            <td>${escapeHtml(d.jobdesc || '-')}</td>
            <td>${escapeHtml(d.divisi || '-')}</td>
            <td>${d.clockIn || '-'}</td>
            <td>${d.clockOut || '-'}</td>
            <td class="${durationClass}" style="font-weight:700; font-family: 'JetBrains Mono', monospace;">${durationText}</td>
            <td>${statusBadge}</td>
        </tr>`;
    }).join('');
}

// Live refresh for clock log durations
let _clockLogInterval = null;
function startClockLogRefresh() {
    if (_clockLogInterval) clearInterval(_clockLogInterval);
    _clockLogInterval = setInterval(() => {
        const page = document.getElementById('page-clock-inout');
        if (page && page.classList.contains('active')) {
            renderClockPage();
        } else {
            clearInterval(_clockLogInterval);
            _clockLogInterval = null;
        }
    }, 1000);
}
