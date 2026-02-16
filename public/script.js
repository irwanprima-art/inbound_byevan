// ========================================
// Inbound Management System - Script
// ========================================

// --- Data Store (localStorage) ---
const STORAGE_KEYS = {
    arrivals: 'inbound_arrivals',
    transactions: 'inbound_transactions',
    vas: 'inbound_vas',
    dcc: 'inbound_dcc',
    damage: 'inbound_damage',
    soh: 'inbound_soh'
};

function getData(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch { return []; }
}

function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
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
    initDashboardTabs();
    initInvFilter();
    initInboundFilter();
    updateDashboardStats();
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

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const nav = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (nav) nav.classList.add('active');

    // Highlight active parent group & auto-expand it
    document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('active-group'));
    if (nav) {
        const parentGroup = nav.closest('.nav-group');
        if (parentGroup) {
            parentGroup.classList.add('active-group');
            parentGroup.classList.add('open');
        }
    }

    const breadcrumb = document.getElementById('breadcrumbPage');
    if (breadcrumb) {
        const names = {
            'dashboard': 'Dashboard',
            'inbound-arrival': 'Inbound Arrival',
            'inbound-transaction': 'Inbound Transaction',
            'vas': 'VAS',
            'daily-cycle-count': 'Daily Cycle Count',
            'project-damage': 'Project Damage',
            'stock-on-hand': 'Stock On Hand',
            'qc-return': 'QC Return'
        };
        breadcrumb.textContent = names[pageId] || pageId;
    }

    if (pageId === 'inbound-arrival') renderArrivalTable();
    if (pageId === 'inbound-transaction') renderTransactionTable();
    if (pageId === 'vas') renderVasTable();
    if (pageId === 'daily-cycle-count') renderDccTable();
    if (pageId === 'project-damage') renderDmgTable();
    if (pageId === 'stock-on-hand') renderSohTable();
    if (pageId === 'dashboard') updateDashboardStats();

    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarOverlay')?.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                    const csvIdx = csvHeaders.findIndex(ch =>
                        ch === eh ||
                        ch.replace(/[_\-]/g, ' ') === eh.replace(/[_\-]/g, ' ') ||
                        ch.includes(eh) || eh.includes(ch)
                    );
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
    if (modal) modal.classList.remove('show');
}

// --- Pagination State ---
const pageState = {
    Arrival: { current: 1, perPage: 50 },
    Transaction: { current: 1, perPage: 50 },
    Vas: { current: 1, perPage: 50 },
    Dcc: { current: 1, perPage: 50 },
    Dmg: { current: 1, perPage: 50 },
    Soh: { current: 1, perPage: 50 }
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

    searchInput?.addEventListener('input', () => { pageState.Dcc.current = 1; renderDccTable(searchInput.value); });

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

function saveDcc() {
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

    closeModal(document.getElementById('modalDcc'));
    renderDccTable();
}

function deleteDcc(id) {
    if (!confirm('Hapus data cycle count ini?')) return;
    let items = getData(STORAGE_KEYS.dcc);
    items = items.filter(d => d.id !== id);
    setData(STORAGE_KEYS.dcc, items);
    renderDccTable();
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
    document.getElementById('btnSaveDmg')?.addEventListener('click', () => {
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
    if (!confirm('Hapus data ini?')) return;
    let data = getData(STORAGE_KEYS.damage);
    data = data.filter(d => d.id !== id);
    setData(STORAGE_KEYS.damage, data);
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
    // Import (Replace) — clears existing data first
    document.getElementById('btnImportSoh')?.addEventListener('click', () => {
        const existingCount = getData(STORAGE_KEYS.soh).length;
        const msg = existingCount > 0
            ? `Ada ${existingCount} data Stock On Hand saat ini.\nImport akan MENGGANTI semua data lama.\nLanjutkan?`
            : 'Import data Stock On Hand dari CSV?';

        if (existingCount > 0 && !confirm(msg)) return;

        // Clear existing data first, then import
        setData(STORAGE_KEYS.soh, []);

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
                    batchNo: vals[13]?.trim() || ''
                };
            },
            () => renderSohTable()
        );
    });

    // Export
    document.getElementById('btnExportSoh')?.addEventListener('click', () => {
        exportToCSV(
            STORAGE_KEYS.soh,
            ['Location', 'SKU', 'SKU Category', 'SKU Brand', 'Zone', 'Location Type', 'Owner', 'Status', 'Qty', 'Warehouse Arrival Date', 'Receipt#', 'Mfg. Date', 'Exp. Date', 'Batch#'],
            (d) => [d.location || '', d.sku || '', d.skuCategory || '', d.skuBrand || '', d.zone || '', d.locationType || '', d.owner || '', d.status || '', d.qty, d.whArrivalDate || '', d.receiptNo || '', d.mfgDate || '', d.expDate || '', d.batchNo || ''],
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

function renderSohTable(search = '') {
    const tbody = document.getElementById('sohTableBody');
    const emptyEl = document.getElementById('sohEmpty');
    const table = document.getElementById('sohTable');
    if (!tbody) return;

    let items = getData(STORAGE_KEYS.soh);
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
            (d.status || '').toLowerCase().includes(q)
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

    tbody.innerHTML = pageData.map((d, i) => `
        <tr>
            <td>${start + i + 1}</td>
            <td>${escapeHtml(d.location || '-')}</td>
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
        </tr>`
    ).join('');
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
