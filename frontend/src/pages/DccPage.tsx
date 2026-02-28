import { useState, useMemo } from 'react';
import { Form, Input, InputNumber, Tag, Select, Modal, Button, Upload, message, Progress, Space } from 'antd';
import { SyncOutlined, DownloadOutlined } from '@ant-design/icons';
import DataPage from '../components/DataPage';
import { dccApi } from '../api/client';

const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, sorter: (a: any, b: any) => a.date?.localeCompare(b.date) },
    { title: 'Phy. Inventory#', dataIndex: 'phy_inv', key: 'phy_inv', width: 130 },
    { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 80 },
    { title: 'Location', dataIndex: 'location', key: 'location', width: 110 },
    { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 100 },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 160, ellipsis: true },
    { title: 'Sys. Qty', dataIndex: 'sys_qty', key: 'sys_qty', width: 90, sorter: (a: any, b: any) => a.sys_qty - b.sys_qty },
    { title: 'Phy. Qty', dataIndex: 'phy_qty', key: 'phy_qty', width: 90, sorter: (a: any, b: any) => a.phy_qty - b.phy_qty },
    {
        title: 'Variance', dataIndex: 'variance', key: 'variance', width: 90,
        render: (v: number) => <Tag color={v === 0 ? 'green' : v < 0 ? 'red' : 'orange'}>{v}</Tag>,
        sorter: (a: any, b: any) => a.variance - b.variance,
    },
    {
        title: '%Variance', key: 'pct_variance', width: 100,
        render: (_: any, r: any) => {
            const sysQty = parseInt(r.sys_qty) || 0;
            if (sysQty === 0) return '-';
            const pct = (Math.abs(parseInt(r.variance) || 0) / sysQty * 100).toFixed(1);
            return <span style={{ color: parseFloat(pct) > 0 ? '#f87171' : '#4ade80' }}>{pct}%</span>;
        },
    },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
    {
        title: 'Remarks', key: 'remarks', width: 110,
        render: (_: any, r: any) => {
            const v = parseInt(r.variance) || 0;
            if (v < 0) return <Tag color="red">Shortage</Tag>;
            if (v > 0) return <Tag color="orange">Gain</Tag>;
            return <Tag color="green">Match</Tag>;
        },
    },
    // ── Reconcile columns ──
    {
        title: 'Rec. Sys.Qty', dataIndex: 'reconcile_sys_qty', key: 'reconcile_sys_qty', width: 110,
        render: (v: number | null) => v != null ? <span style={{ color: '#a78bfa' }}>{v}</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>,
    },
    {
        title: 'Rec. Phy.Qty', dataIndex: 'reconcile_phy_qty', key: 'reconcile_phy_qty', width: 110,
        render: (v: number | null) => v != null ? <span style={{ color: '#a78bfa' }}>{v}</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>,
    },
    {
        title: 'Rec. Variance', dataIndex: 'reconcile_variance', key: 'reconcile_variance', width: 115,
        render: (v: number | null, r: any) => {
            if (v == null) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>;
            const color = v === 0 ? '#4ade80' : v < 0 ? '#f87171' : '#fb923c';
            const diffFromR1 = r.variance !== v;
            return (
                <span style={{ color, fontWeight: diffFromR1 ? 700 : 400 }}>
                    {diffFromR1 ? '↻ ' : ''}{v}
                </span>
            );
        },
    },
];

const formFields = (
    <>
        <Form.Item name="date" label="Date" rules={[{ required: true }]}><Input placeholder="M/D/YYYY" /></Form.Item>
        <Form.Item name="phy_inv" label="Phy. Inventory#" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="zone" label="Zone"><Input /></Form.Item>
        <Form.Item name="location" label="Location" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="owner" label="Owner"><Input /></Form.Item>
        <Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="brand" label="Brand"><Input /></Form.Item>
        <Form.Item name="description" label="Description"><Input /></Form.Item>
        <Form.Item name="sys_qty" label="Sys. Qty" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="phy_qty" label="Phy. Qty" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="variance" label="Variance" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="operator" label="Operator"><Input /></Form.Item>
    </>
);

const csvHeaders = ['date', 'phy_inv', 'zone', 'location', 'owner', 'sku', 'brand', 'description', 'sys_qty', 'phy_qty', 'operator'];

const columnMap: Record<string, string> = {
    'Phy. Inventory#': 'phy_inv',
    'phy_inventory': 'phy_inv',
    'phy inventory': 'phy_inv',
    'physical inventory': 'phy_inv',
    'Sys. Qty': 'sys_qty',
    'sys qty': 'sys_qty',
    'system qty': 'sys_qty',
    'Phy. Qty': 'phy_qty',
    'phy qty': 'phy_qty',
    'physical qty': 'phy_qty',
    '%Variance': 'pct_variance',
    'variance': 'variance',
    'Variance': 'variance',
    'remarks': 'remarks',
    'Remarks': 'remarks',
};

const numberFields = ['sys_qty', 'phy_qty', 'variance'];

const parseCSVRow = (row: string[], headers?: string[]): Record<string, unknown> | null => {
    if (!headers) return null;
    const get = (key: string) => {
        const idx = headers.findIndex(h => {
            const n = h.toLowerCase().replace(/[^a-z0-9]/g, '_');
            return n === key || h === key;
        });
        return idx >= 0 ? (row[idx] ?? '').toString().trim() : '';
    };
    const sku = get('sku');
    const date = get('date');
    if (!sku && !date) return null;
    const sysQty = parseInt(get('sys_qty')) || 0;
    const phyQty = parseInt(get('phy_qty')) || 0;
    return {
        date: get('date'),
        phy_inv: get('phy_inv') || get('phy__inventory_') || get('phy_inventory'),
        zone: get('zone'),
        location: get('location'),
        owner: get('owner'),
        sku,
        brand: get('brand'),
        description: get('description'),
        sys_qty: sysQty,
        phy_qty: phyQty,
        variance: phyQty - sysQty,
        operator: get('operator'),
    };
};

const getRemarks = (item: any) => {
    const v = parseInt(item.variance) || 0;
    if (v < 0) return 'Shortage';
    if (v > 0) return 'Gain';
    return 'Match';
};

const remarksOptions = ['Match', 'Shortage', 'Gain'].map(v => ({ label: v, value: v }));

// Normalize for comparison: lowercase + trim
const normKey = (v: any) => (v || '').toString().toLowerCase().trim();

// Build composite match key: phy_inv|zone|location|owner|sku|brand
const makeMatchKey = (r: any) =>
    [r.phy_inv, r.zone, r.location, r.owner, r.sku, r.brand].map(normKey).join('|');

// Fallback match key using Description instead of SKU
const makeDescMatchKey = (r: any) =>
    [r.phy_inv, r.zone, r.location, r.owner, r.description, r.brand].map(normKey).join('|');

export default function DccPage() {
    const [filterBrand, setFilterBrand] = useState<string[]>([]);
    const [filterZone, setFilterZone] = useState<string[]>([]);
    const [filterRemarks, setFilterRemarks] = useState<string[]>([]);
    const [allData, setAllData] = useState<any[]>([]);

    // Reconcile state
    const [reconcileLoading, setReconcileLoading] = useState(false);
    const [reconcileResult, setReconcileResult] = useState<{ matched: number; unmatched: number; updated: number } | null>(null);

    // Derive unique options from loaded data
    const brandOptions = [...new Set(allData.map((r: any) => r.brand).filter(Boolean))].sort().map(v => ({ label: v, value: v }));
    const zoneOptions = [...new Set(allData.map((r: any) => r.zone).filter(Boolean))].sort().map(v => ({ label: v, value: v }));

    // Wrap dccApi to intercept list() and capture data for filter options + reconcile lookup
    const wrappedApi = useMemo(() => ({
        ...dccApi,
        list: async () => {
            const res = await dccApi.list();
            setAllData(res.data || []);
            return res;
        },
    }), []);

    // ── Reconcile Import ──────────────────────────────────────────────────────
    const handleReconcileFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { message.warning('File kosong'); return; }

            // Parse headers — apply columnMap aliases
            const rawHeaders = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
            const normalHeaders = rawHeaders.map(h => {
                const mapped = columnMap[h];
                return mapped || h.toLowerCase().replace(/[^a-z0-9]/g, '_');
            });

            // Parse rows using the same parseCSVRow logic
            const importedRows: Record<string, unknown>[] = [];
            for (const line of lines.slice(1)) {
                const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
                const row = parseCSVRow(cols, normalHeaders);
                if (row) importedRows.push(row);
            }

            if (importedRows.length === 0) { message.warning('Tidak ada data valid di file reconcile'); return; }

            // Ensure we have latest data — re-fetch if empty
            let currentData = allData;
            if (currentData.length === 0) {
                try {
                    const res = await dccApi.list();
                    currentData = res.data || [];
                    setAllData(currentData);
                } catch { message.error('Gagal memuat data DCC'); return; }
            }

            // Build TWO lookup maps:
            // 1. Primary: by phy_inv+zone+location+owner+sku+brand (may fail if SKU mangled by Excel)
            // 2. Fallback: by phy_inv+zone+location+owner+description+brand
            const lookup = new Map<string, any>();
            const lookupByDesc = new Map<string, any>();
            currentData.forEach((r: any) => {
                lookup.set(makeMatchKey(r), r);
                if (r.description) lookupByDesc.set(makeDescMatchKey(r), r);
            });

            // Match and update — only write to reconcile_ fields, NOT touching Round 1 qty
            setReconcileLoading(true);
            let matched = 0;
            let unmatched = 0;
            let updated = 0;

            for (const row of importedRows) {
                const key = makeMatchKey(row);
                // Try SKU-based key first, then fall back to Description-based key
                const existing = lookup.get(key) || lookupByDesc.get(makeDescMatchKey(row));
                if (existing) {
                    matched++;
                    const newSys = row.sys_qty as number;
                    const newPhy = row.phy_qty as number;
                    const newVariance = newPhy - newSys;
                    try {
                        await dccApi.update(existing.id, {
                            ...existing,
                            reconcile_sys_qty: newSys,
                            reconcile_phy_qty: newPhy,
                            reconcile_variance: newVariance,
                        });
                        updated++;
                    } catch { /* skip failed updates */ }
                } else {
                    unmatched++;
                }
            }

            setReconcileLoading(false);
            setReconcileResult({ matched, unmatched, updated });

            // Refresh table data
            try {
                const res = await dccApi.list();
                setAllData(res.data || []);
            } catch { /* ignore */ }
        };
        reader.readAsText(file);
        return false; // prevent antd default upload
    };

    // Extra buttons: Reconcile Template + Reconcile Import
    const reconcileCsvHeaders = ['Phy. Inventory#', 'Zone', 'Location', 'Owner', 'SKU', 'Brand', 'Description', 'Sys. Qty', 'Phy. Qty'];

    const handleReconcileTemplate = () => {
        const bom = '\uFEFF';
        const csv = bom + reconcileCsvHeaders.join(',') + '\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dcc_reconcile_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const extraButtons = (
        <Space>
            <Button
                icon={<DownloadOutlined />}
                style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                onClick={handleReconcileTemplate}
                title="Download template CSV untuk Reconcile"
            >
                Template Reconcile
            </Button>
            <Upload
                accept=".csv"
                showUploadList={false}
                beforeUpload={handleReconcileFile as any}
                disabled={reconcileLoading}
            >
                <Button
                    icon={<SyncOutlined spin={reconcileLoading} />}
                    loading={reconcileLoading}
                    style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                    title="Import CSV Reconcile — update Sys.Qty &amp; Phy.Qty berdasarkan kecocokan Phy.Inv#, Zone, Location, Owner, SKU, Brand"
                >
                    Reconcile
                </Button>
            </Upload>
        </Space>
    );

    const extraFilterUi = (
        <>
            <Select
                mode="multiple" allowClear placeholder="Filter Brand"
                options={brandOptions} value={filterBrand} onChange={setFilterBrand}
                style={{ minWidth: 130 }} maxTagCount="responsive"
            />
            <Select
                mode="multiple" allowClear placeholder="Filter Zone"
                options={zoneOptions} value={filterZone} onChange={setFilterZone}
                style={{ minWidth: 130 }} maxTagCount="responsive"
            />
            <Select
                mode="multiple" allowClear placeholder="Filter Remarks"
                options={remarksOptions} value={filterRemarks} onChange={setFilterRemarks}
                style={{ minWidth: 140 }} maxTagCount="responsive"
            />
        </>
    );

    const extraFilterFn = (item: any) => {
        if (filterBrand.length > 0 && !filterBrand.includes(item.brand)) return false;
        if (filterZone.length > 0 && !filterZone.includes(item.zone)) return false;
        if (filterRemarks.length > 0 && !filterRemarks.includes(getRemarks(item))) return false;
        return true;
    };

    return (
        <>
            <DataPage
                title="Daily Cycle Count"
                api={wrappedApi}
                columns={columns}
                formFields={formFields}
                csvHeaders={csvHeaders}
                columnMap={columnMap}
                numberFields={numberFields}
                parseCSVRow={parseCSVRow as any}
                dateField="date"
                computeSearchText={getRemarks}
                extraFilterUi={extraFilterUi}
                extraFilterFn={extraFilterFn}
                extraButtons={extraButtons}
            />

            {/* Reconcile Result Modal */}
            <Modal
                title={<span><SyncOutlined style={{ color: '#f59e0b', marginRight: 8 }} />Hasil Reconcile</span>}
                open={!!reconcileResult}
                onOk={() => setReconcileResult(null)}
                onCancel={() => setReconcileResult(null)}
                footer={<Button type="primary" onClick={() => setReconcileResult(null)}>Tutup</Button>}
                width={420}
            >
                {reconcileResult && (
                    <div style={{ padding: '8px 0' }}>
                        <div style={{ marginBottom: 16, color: 'rgba(255,255,255,0.6)' }}>
                            File reconcile telah diproses. Berikut hasilnya:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(74,222,128,0.1)', borderRadius: 8, border: '1px solid rgba(74,222,128,0.25)' }}>
                                <span>✅ Record cocok &amp; diupdate</span>
                                <span style={{ fontWeight: 700, color: '#4ade80', fontSize: 20 }}>{reconcileResult.updated}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(248,113,113,0.1)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.25)' }}>
                                <span>❌ Tidak cocok (dilewati)</span>
                                <span style={{ fontWeight: 700, color: '#f87171', fontSize: 20 }}>{reconcileResult.unmatched}</span>
                            </div>
                            <Progress
                                percent={
                                    reconcileResult.matched + reconcileResult.unmatched > 0
                                        ? Math.round(reconcileResult.updated / (reconcileResult.matched + reconcileResult.unmatched) * 100)
                                        : 0
                                }
                                strokeColor="#4ade80"
                                format={p => `${p}% matched`}
                                style={{ marginTop: 4 }}
                            />
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                                Matching key: Phy.Inventory# + Zone + Location + Owner + SKU + Brand
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
