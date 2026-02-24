import { useState, useEffect, useCallback, useRef } from 'react';
import { LOGO_BASE64 } from '../assets/logoBase64';
import {
    Button, Input, Select, DatePicker, Form, Table, Typography, Space, message,
    Card, Tabs, Popconfirm, Modal, Divider, Statistic, Row, Col,
} from 'antd';
import {
    PrinterOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined,
    FileTextOutlined, SearchOutlined, EyeOutlined,
} from '@ant-design/icons';
import { beritaAcaraApi, stockOpnamesApi } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const INVENTORY_DOC_TYPES = [
    { label: 'Stock Opname', value: 'Stock Opname' },
    { label: 'Disposal', value: 'Disposal' },
    { label: 'Adjustment', value: 'Adjustment' },
];

const INVENTORY_TYPE_SET = new Set(INVENTORY_DOC_TYPES.map(d => d.value));

interface SkuItem {
    sku: string;
    description: string;
    location: string;
    sys_qty: number;
    phy_qty: number;
    variance: number;
    note: string;
}

interface SOSummary {
    totalSku: number;
    totalSysQty: number;
    totalPhyQty: number;
    totalVariance: number;
    accuracy: number;
    matched: number;
    unmatched: number;
}

function generateDocNumber(existingDocs: any[], docType: string): string {
    const now = dayjs();
    const prefix = `INV-${now.format('MMYY')}`;
    const year = now.format('YYYY');
    let maxSeq = 0;
    existingDocs
        .filter(d => d.doc_type === docType)
        .forEach(d => {
            const dn = d.doc_number || '';
            const match = dn.match(/INV-\d{4}-(\d{4})/);
            if (match) {
                const seq = parseInt(match[1]) || 0;
                if (seq > maxSeq) maxSeq = seq;
            }
        });
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
    return `${prefix}-${nextSeq}/WH-JC/${year}`;
}

function calcSummary(items: SkuItem[]): SOSummary {
    let totalSysQty = 0, totalPhyQty = 0, totalVariance = 0, matched = 0, unmatched = 0;
    items.forEach(item => {
        totalSysQty += item.sys_qty || 0;
        totalPhyQty += item.phy_qty || 0;
        totalVariance += item.variance || 0;
        if ((item.variance || 0) === 0) matched++; else unmatched++;
    });
    const accuracy = totalSysQty > 0 ? ((totalSysQty - Math.abs(totalVariance)) / totalSysQty) * 100 : 100;
    return { totalSku: items.length, totalSysQty, totalPhyQty, totalVariance, accuracy, matched, unmatched };
}

export default function BeritaAcaraInventoryPage() {
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('create');
    const [search, setSearch] = useState('');

    const [form] = Form.useForm();
    const [items, setItems] = useState<SkuItem[]>([]);
    const [skuInput, setSkuInput] = useState('');
    const skuRef = useRef<any>(null);
    const docType = Form.useWatch('doc_type', form);
    const formDate = Form.useWatch('date', form);

    const [soLoading, setSoLoading] = useState(false);
    const [soItems, setSoItems] = useState<SkuItem[]>([]);

    const [previewDoc, setPreviewDoc] = useState<any>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const isStockOpname = docType === 'Stock Opname';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await beritaAcaraApi.list();
            const data = (res.data || []).filter((d: any) => INVENTORY_TYPE_SET.has(d.doc_type));
            data.sort((a: any, b: any) => b.id - a.id);
            setDocs(data);
        } catch { message.error('Gagal memuat data'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-fetch stock opname data when Stock Opname type + date selected
    useEffect(() => {
        if (!isStockOpname || !formDate) {
            setSoItems([]);
            return;
        }
        const dateStr = dayjs(formDate).format('YYYY-MM-DD');
        let cancelled = false;

        (async () => {
            setSoLoading(true);
            try {
                const res = await stockOpnamesApi.list();
                const all = res.data || [];
                const filtered = all.filter((r: any) => r.date === dateStr);
                if (!cancelled) {
                    setSoItems(filtered.map((r: any) => ({
                        sku: r.sku || '',
                        description: r.description || '',
                        location: r.location || '',
                        sys_qty: r.sys_qty || 0,
                        phy_qty: r.phy_qty || 0,
                        variance: r.variance || 0,
                        note: '',
                    })));
                }
            } catch {
                if (!cancelled) message.error('Gagal memuat data Stock Opname');
            }
            if (!cancelled) setSoLoading(false);
        })();
        return () => { cancelled = true; };
    }, [isStockOpname, formDate]);

    // For non-stock-opname types: manual SKU entry
    const handleAddSku = () => {
        const sku = skuInput.trim();
        if (!sku) return;
        if (items.find(i => i.sku.toLowerCase() === sku.toLowerCase())) {
            message.warning('SKU sudah ada di daftar');
        } else {
            setItems([...items, { sku, description: '', location: '', sys_qty: 0, phy_qty: 0, variance: 0, note: '' }]);
        }
        setSkuInput('');
        setTimeout(() => skuRef.current?.focus(), 50);
    };

    const handleRemoveSku = (index: number) => setItems(items.filter((_, i) => i !== index));

    const handleItemChange = (index: number, field: string, value: any) => {
        setItems(items.map((item, i) => {
            if (i !== index) return item;
            const updated = { ...item, [field]: value };
            if (field === 'sys_qty' || field === 'phy_qty') {
                updated.variance = (updated.phy_qty || 0) - (updated.sys_qty || 0);
            }
            return updated;
        }));
    };

    const handleSaveAndPrint = async () => {
        let vals: any;
        try { vals = await form.validateFields(); } catch { message.error('Lengkapi semua field!'); return; }

        const finalItems = isStockOpname ? soItems : items;
        if (finalItems.length === 0) { message.warning(isStockOpname ? 'Tidak ada data stock opname di tanggal ini!' : 'Tambahkan minimal 1 SKU!'); return; }

        const docNumber = generateDocNumber(docs, vals.doc_type);
        const summary = isStockOpname ? calcSummary(finalItems) : null;
        const payload = {
            doc_type: vals.doc_type,
            doc_number: docNumber,
            date: dayjs(vals.date).format('YYYY-MM-DD'),
            checker: vals.checker,
            kepada: vals.kepada || '',
            dari: 'PT. Global Jet Ecommerce',
            items: JSON.stringify(finalItems),
            notes: isStockOpname ? JSON.stringify(summary) : (vals.notes || ''),
        };

        try {
            await beritaAcaraApi.create(payload);
            message.success('Berita Acara tersimpan!');
            setPreviewDoc({ ...payload, items: finalItems, summary });
            setPreviewOpen(true);
            form.resetFields();
            form.setFieldsValue({ dari: 'PT. Global Jet Ecommerce', date: dayjs() });
            setItems([]);
            setSoItems([]);
            fetchData();
        } catch (err: any) {
            message.error(err?.response?.data?.error || 'Gagal menyimpan');
        }
    };

    const handlePrint = async () => {
        const el = document.getElementById('ba-inventory-print');
        if (!el) return;
        const html = el.innerHTML;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Berita Acara Inventory</title>
<style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 12px; }
    .print-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
    .print-content { flex: 1 0 auto; }
    .print-footer { flex-shrink: 0; margin-top: auto; padding-top: 12px; border-top: 1.5px solid #d0d0d0; text-align: left; font-size: 9px; color: #888; line-height: 1.6; }
    .doc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e0e0e0; }
    .doc-header img { height: 52px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #333; padding: 5px 8px; text-align: left; font-size: 11px; }
    th { background: #eee; font-weight: 700; text-transform: uppercase; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .summary-box { border: 1px solid #ccc; border-radius: 6px; padding: 10px; text-align: center; }
    .summary-box .label { font-size: 10px; color: #777; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-box .value { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-top: 2px; }
    .page-break { page-break-before: always; }
</style></head><body><div class="print-wrapper">${html}</div></body></html>`);
        win.document.close();
        const imgs = win.document.querySelectorAll('img');
        await Promise.all(Array.from(imgs).map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })));
        setTimeout(() => win.print(), 200);
    };

    const handleView = (record: any) => {
        let parsedItems: SkuItem[] = [];
        try { parsedItems = JSON.parse(record.items || '[]'); } catch { parsedItems = []; }
        let summary: SOSummary | null = null;
        if (record.doc_type === 'Stock Opname') {
            try { summary = JSON.parse(record.notes || '{}'); } catch { summary = calcSummary(parsedItems); }
            if (!summary || !summary.totalSku) summary = calcSummary(parsedItems);
        }
        setPreviewDoc({ ...record, items: parsedItems, summary });
        setPreviewOpen(true);
    };

    const handleDelete = async (id: number) => {
        try { await beritaAcaraApi.remove(id); message.success('Dihapus'); fetchData(); } catch { message.error('Gagal menghapus'); }
    };

    const columns = [
        { title: 'No. Dokumen', dataIndex: 'doc_number', key: 'doc_number', width: 220, render: (v: string) => <Text style={{ color: '#60a5fa', fontWeight: 600 }}>{v}</Text> },
        { title: 'Jenis', dataIndex: 'doc_type', key: 'doc_type', width: 150, render: (v: string) => { const c = v === 'Stock Opname' ? '#10b981' : v === 'Disposal' ? '#f87171' : '#fbbf24'; return <span style={{ color: c, fontWeight: 600 }}>{v}</span>; } },
        { title: 'Tanggal', dataIndex: 'date', key: 'date', width: 110 },
        { title: 'PIC', dataIndex: 'checker', key: 'checker', width: 150 },
        { title: 'Items', dataIndex: 'items', key: 'items', width: 80, render: (v: string) => { try { return JSON.parse(v || '[]').length; } catch { return 0; } } },
        { title: 'Aksi', key: 'actions', width: 100, fixed: 'right' as const, render: (_: any, r: any) => (<Space> <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleView(r)} /> <Popconfirm title="Hapus?" onConfirm={() => handleDelete(r.id)}><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Popconfirm> </Space>) },
    ];

    const filteredDocs = docs.filter(d => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (d.doc_number || '').toLowerCase().includes(s) || (d.doc_type || '').toLowerCase().includes(s) || (d.checker || '').toLowerCase().includes(s);
    });

    const soSummary = soItems.length > 0 ? calcSummary(soItems) : null;

    return (
        <div style={{ padding: '0 4px' }}>
            <Title level={4} style={{ margin: '0 0 16px', color: '#fff' }}>📋 Berita Acara Inventory</Title>

            <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                {
                    key: 'create', label: <span><FileTextOutlined /> Buat Baru</span>,
                    children: (
                        <Card style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Form form={form} layout="vertical" initialValues={{ dari: 'PT. Global Jet Ecommerce', date: dayjs() }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                                    <Form.Item name="doc_type" label="Jenis Berita Acara" rules={[{ required: true, message: 'Pilih jenis' }]}>
                                        <Select options={INVENTORY_DOC_TYPES} placeholder="Pilih jenis" />
                                    </Form.Item>
                                    <Form.Item name="date" label="Tanggal" rules={[{ required: true }]}>
                                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                    </Form.Item>
                                    <Form.Item name="checker" label="PIC" rules={[{ required: true, message: 'Isi nama PIC' }]}>
                                        <Input placeholder="Nama PIC" />
                                    </Form.Item>
                                    <Form.Item name="kepada" label="Kepada" rules={isStockOpname ? [{ required: true, message: 'Isi tujuan' }] : []}>
                                        <Input placeholder="Tujuan" />
                                    </Form.Item>
                                    <Form.Item name="dari" label="Dari">
                                        <Input disabled />
                                    </Form.Item>
                                </div>

                                {/* Stock Opname: auto-loaded data + summary */}
                                {isStockOpname && (
                                    <>
                                        <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                                            📊 Summary Stock Opname — {formDate ? dayjs(formDate).format('DD/MM/YYYY') : '(pilih tanggal)'}
                                        </Divider>

                                        {soLoading ? (
                                            <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.4)' }}>Memuat data stock opname...</div>
                                        ) : soItems.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.3)' }}>
                                                {formDate ? 'Tidak ada data stock opname di tanggal ini' : 'Pilih tanggal untuk memuat data'}
                                            </div>
                                        ) : soSummary && (
                                            <>
                                                <Row gutter={16} style={{ marginBottom: 16 }}>
                                                    <Col span={4}><Card size="small" style={{ background: 'rgba(99,102,241,0.1)', border: 'none', textAlign: 'center' }}><Statistic title={<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Total SKU</span>} value={soSummary.totalSku} valueStyle={{ color: '#60a5fa', fontSize: 20 }} /></Card></Col>
                                                    <Col span={4}><Card size="small" style={{ background: 'rgba(99,102,241,0.1)', border: 'none', textAlign: 'center' }}><Statistic title={<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Total Sys Qty</span>} value={soSummary.totalSysQty} valueStyle={{ color: '#fff', fontSize: 20 }} /></Card></Col>
                                                    <Col span={4}><Card size="small" style={{ background: 'rgba(99,102,241,0.1)', border: 'none', textAlign: 'center' }}><Statistic title={<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Total Phy Qty</span>} value={soSummary.totalPhyQty} valueStyle={{ color: '#fff', fontSize: 20 }} /></Card></Col>
                                                    <Col span={4}><Card size="small" style={{ background: soSummary.accuracy >= 100 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: 'none', textAlign: 'center' }}><Statistic title={<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Accuracy</span>} value={soSummary.accuracy.toFixed(2)} suffix="%" valueStyle={{ color: soSummary.accuracy >= 100 ? '#10b981' : '#f87171', fontSize: 20 }} /></Card></Col>
                                                    <Col span={4}><Card size="small" style={{ background: 'rgba(16,185,129,0.1)', border: 'none', textAlign: 'center' }}><Statistic title={<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Matched</span>} value={soSummary.matched} valueStyle={{ color: '#10b981', fontSize: 20 }} /></Card></Col>
                                                    <Col span={4}><Card size="small" style={{ background: 'rgba(239,68,68,0.1)', border: 'none', textAlign: 'center' }}><Statistic title={<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Unmatched</span>} value={soSummary.unmatched} valueStyle={{ color: '#f87171', fontSize: 20 }} /></Card></Col>
                                                </Row>

                                                <Table
                                                    dataSource={soItems.map((item, i) => ({ ...item, key: i }))}
                                                    pagination={{ pageSize: 20, showTotal: t => `${t} SKU` }}
                                                    size="small"
                                                    scroll={{ x: 800 }}
                                                    columns={[
                                                        { title: 'No', key: 'no', width: 50, render: (_: any, __: any, i: number) => i + 1 },
                                                        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 140 },
                                                        { title: 'Description', dataIndex: 'description', key: 'desc' },
                                                        { title: 'Location', dataIndex: 'location', key: 'loc', width: 120 },
                                                        { title: 'Sys Qty', dataIndex: 'sys_qty', key: 'sys', width: 80, align: 'center' as const },
                                                        { title: 'Phy Qty', dataIndex: 'phy_qty', key: 'phy', width: 80, align: 'center' as const },
                                                        { title: 'Variance', dataIndex: 'variance', key: 'var', width: 80, align: 'center' as const, render: (v: number) => <span style={{ color: v === 0 ? '#10b981' : '#f87171', fontWeight: 600 }}>{v}</span> },
                                                    ]}
                                                />
                                            </>
                                        )}
                                    </>
                                )}

                                {/* Disposal / Adjustment: manual SKU entry */}
                                {!isStockOpname && (
                                    <>
                                        <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>📦 Item SKU</Divider>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                            <Input ref={skuRef} placeholder="Scan / Ketik SKU lalu Enter" value={skuInput} onChange={e => setSkuInput(e.target.value)} onPressEnter={handleAddSku} style={{ maxWidth: 400 }} prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.3)' }} />} />
                                            <Button icon={<PlusOutlined />} onClick={handleAddSku}>Tambah</Button>
                                        </div>
                                        {items.length > 0 && (
                                            <Table
                                                dataSource={items.map((item, i) => ({ ...item, key: i }))}
                                                pagination={false}
                                                size="small"
                                                style={{ marginBottom: 16 }}
                                                columns={[
                                                    { title: 'No', key: 'no', width: 50, render: (_: any, __: any, i: number) => i + 1 },
                                                    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 140 },
                                                    { title: 'Deskripsi', dataIndex: 'description', key: 'desc', render: (v: string, _: any, i: number) => <Input value={v} size="small" placeholder="Nama barang" onChange={e => handleItemChange(i, 'description', e.target.value)} /> },
                                                    { title: 'Qty', dataIndex: 'phy_qty', key: 'qty', width: 90, render: (v: number, _: any, i: number) => <Input type="number" min={0} value={v} size="small" style={{ width: 75 }} onChange={e => handleItemChange(i, 'phy_qty', parseInt(e.target.value) || 0)} /> },
                                                    { title: 'Catatan', dataIndex: 'note', key: 'note', render: (v: string, _: any, i: number) => <Input value={v} size="small" placeholder="Opsional" onChange={e => handleItemChange(i, 'note', e.target.value)} /> },
                                                    { title: '', key: 'del', width: 40, render: (_: any, __: any, i: number) => <Button type="text" size="small" icon={<DeleteOutlined />} danger onClick={() => handleRemoveSku(i)} /> },
                                                ]}
                                            />
                                        )}
                                        <Form.Item name="notes" label="Catatan Umum">
                                            <TextArea rows={2} placeholder="Catatan tambahan (opsional)" />
                                        </Form.Item>
                                    </>
                                )}

                                <Button type="primary" icon={<PrinterOutlined />} size="large" onClick={handleSaveAndPrint}
                                    loading={soLoading}
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', fontWeight: 700 }}>
                                    💾 Simpan & Print
                                </Button>
                            </Form>
                        </Card>
                    ),
                },
                {
                    key: 'history', label: <span><ReloadOutlined /> Riwayat</span>,
                    children: (
                        <div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                <Input placeholder="Cari no. dokumen, jenis, PIC..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
                                <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
                            </div>
                            <Table dataSource={filteredDocs} columns={columns} rowKey="id" loading={loading} size="small" scroll={{ x: 1000 }} pagination={{ pageSize: 20, showTotal: t => `${t} dokumen` }} />
                        </div>
                    ),
                },
            ]} />

            {/* Print Preview Modal */}
            <Modal
                open={previewOpen} onCancel={() => setPreviewOpen(false)} width={850}
                footer={<Space><Button onClick={() => setPreviewOpen(false)}>Tutup</Button><Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button></Space>}
                title="Preview Berita Acara Inventory"
            >
                {previewDoc && (
                    <div id="ba-inventory-print" className="print-wrapper" style={{ background: '#fff', color: '#1a1a1a', padding: 24, borderRadius: 8 }}>
                        <div className="print-content" style={{ flex: 1 }}>
                            {/* Header */}
                            <div className="doc-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e0e0e0' }}>
                                <img src={LOGO_BASE64} alt="Logo" style={{ height: 52 }} />
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1a1a1a', marginBottom: 4 }}>
                                        Berita Acara — {previewDoc.doc_type}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#555' }}>No: {previewDoc.doc_number}</div>
                                </div>
                            </div>

                            {/* Meta */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Tanggal</strong>: {previewDoc.date}</div>
                                {previewDoc.kepada && <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Kepada</strong>: {previewDoc.kepada}</div>}
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Dari</strong>: {previewDoc.dari}</div>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>PIC</strong>: {previewDoc.checker}</div>
                            </div>

                            {/* Stock Opname: Summary page */}
                            {previewDoc.doc_type === 'Stock Opname' && previewDoc.summary && (() => {
                                const s = previewDoc.summary as SOSummary;
                                return (
                                    <>
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, borderBottom: '1px solid #ddd', paddingBottom: 6 }}>
                                                Summary Accuracy Stock Opname
                                            </div>
                                            <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                                <div className="summary-box" style={{ border: '1px solid #ccc', borderRadius: 6, padding: 10, textAlign: 'center' }}>
                                                    <div className="label" style={{ fontSize: 10, color: '#777', textTransform: 'uppercase' }}>Total SKU</div>
                                                    <div className="value" style={{ fontSize: 20, fontWeight: 700 }}>{s.totalSku}</div>
                                                </div>
                                                <div className="summary-box" style={{ border: '1px solid #ccc', borderRadius: 6, padding: 10, textAlign: 'center' }}>
                                                    <div className="label" style={{ fontSize: 10, color: '#777', textTransform: 'uppercase' }}>Total System Qty</div>
                                                    <div className="value" style={{ fontSize: 20, fontWeight: 700 }}>{s.totalSysQty.toLocaleString()}</div>
                                                </div>
                                                <div className="summary-box" style={{ border: '1px solid #ccc', borderRadius: 6, padding: 10, textAlign: 'center' }}>
                                                    <div className="label" style={{ fontSize: 10, color: '#777', textTransform: 'uppercase' }}>Total Physical Qty</div>
                                                    <div className="value" style={{ fontSize: 20, fontWeight: 700 }}>{s.totalPhyQty.toLocaleString()}</div>
                                                </div>
                                                <div className="summary-box" style={{ border: '1px solid #ccc', borderRadius: 6, padding: 10, textAlign: 'center' }}>
                                                    <div className="label" style={{ fontSize: 10, color: '#777', textTransform: 'uppercase' }}>Accuracy</div>
                                                    <div className="value" style={{ fontSize: 20, fontWeight: 700, color: s.accuracy >= 100 ? '#16a34a' : '#dc2626' }}>{s.accuracy.toFixed(2)}%</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                                                <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 10, textAlign: 'center' }}>
                                                    <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase' }}>Matched (Variance = 0)</div>
                                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{s.matched}</div>
                                                </div>
                                                <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 10, textAlign: 'center' }}>
                                                    <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase' }}>Unmatched (Variance ≠ 0)</div>
                                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{s.unmatched}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Signatures on summary page */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48 }}>
                                            <SigBlock label="PIC" name={previewDoc.checker} />
                                            <SigBlock label="Supervisor" name="Evan Budi Setiawan Pasaribu" />
                                            <SigBlock label="Mengetahui" name="" />
                                        </div>

                                        {/* Page 2: Lampiran */}
                                        <div className="page-break" style={{ pageBreakBefore: 'always', paddingTop: 16 }}>
                                            <div className="doc-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e0e0e0' }}>
                                                <img src={LOGO_BASE64} alt="Logo" style={{ height: 52 }} />
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Lampiran — Stock Opname Detail</div>
                                                    <div style={{ fontSize: 11, color: '#555' }}>No: {previewDoc.doc_number} | {previewDoc.date}</div>
                                                </div>
                                            </div>

                                            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0' }}>
                                                <thead>
                                                    <tr>
                                                        <th style={printTh}>No</th>
                                                        <th style={printTh}>SKU</th>
                                                        <th style={printTh}>Description</th>
                                                        <th style={printTh}>Sys. Qty</th>
                                                        <th style={printTh}>Phy. Qty</th>
                                                        <th style={printTh}>Variance</th>
                                                        <th style={printTh}>Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(previewDoc.items || []).map((item: SkuItem, i: number) => (
                                                        <tr key={i}>
                                                            <td style={printTd}>{i + 1}</td>
                                                            <td style={printTd}>{item.sku}</td>
                                                            <td style={printTd}>{item.description || '-'}</td>
                                                            <td style={{ ...printTd, textAlign: 'center' }}>{item.sys_qty}</td>
                                                            <td style={{ ...printTd, textAlign: 'center' }}>{item.phy_qty}</td>
                                                            <td style={{ ...printTd, textAlign: 'center', color: item.variance !== 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{item.variance}</td>
                                                            <td style={printTd}>{item.note || (item.variance !== 0 ? 'Qty tidak sesuai' : 'OK')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                );
                            })()}

                            {/* Disposal / Adjustment print */}
                            {previewDoc.doc_type !== 'Stock Opname' && (
                                <>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}>
                                        <thead>
                                            <tr>
                                                <th style={printTh}>No</th>
                                                <th style={printTh}>SKU</th>
                                                <th style={printTh}>Deskripsi</th>
                                                <th style={printTh}>Qty</th>
                                                <th style={printTh}>Catatan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(previewDoc.items || []).map((item: SkuItem, i: number) => (
                                                <tr key={i}>
                                                    <td style={printTd}>{i + 1}</td>
                                                    <td style={printTd}>{item.sku}</td>
                                                    <td style={printTd}>{item.description || '-'}</td>
                                                    <td style={printTd}>{item.phy_qty ?? 0}</td>
                                                    <td style={printTd}>{item.note || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {typeof previewDoc.notes === 'string' && previewDoc.notes && (
                                        <div style={{ margin: '12px 0', padding: 8, border: '1px solid #ccc' }}>
                                            <strong>Catatan:</strong> {previewDoc.notes}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48 }}>
                                        <SigBlock label="PIC" name={previewDoc.checker} />
                                        <SigBlock label="Supervisor" name="Evan Budi Setiawan Pasaribu" />
                                        <SigBlock label="Mengetahui" name="" />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="print-footer" style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1.5px solid #d0d0d0', textAlign: 'left', fontSize: 9, color: '#888', lineHeight: 1.6 }}>
                            <div style={{ fontWeight: 700, fontSize: 10, color: '#555', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1.5 }}>PT. Global Jet Ecommerce</div>
                            <div>Landmark Pluit Tower B2, 7th Floor, Pluit, Penjaringan – Jakarta Utara</div>
                            <div>DKI Jakarta, 14450</div>
                            <div style={{ marginTop: 6, fontSize: 8, color: '#aaa' }}>Printed: {dayjs().format('DD/MM/YYYY HH:mm')}</div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function SigBlock({ label, name }: { label: string; name: string }) {
    return (
        <div style={{ width: '30%', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>{name || '\u00a0'}</div>
        </div>
    );
}

const printTh: React.CSSProperties = {
    border: '1px solid #333', padding: '5px 8px', textAlign: 'left',
    background: '#eee', fontWeight: 700, fontSize: 10, textTransform: 'uppercase',
};

const printTd: React.CSSProperties = {
    border: '1px solid #333', padding: '5px 8px', textAlign: 'left', fontSize: 11,
};
