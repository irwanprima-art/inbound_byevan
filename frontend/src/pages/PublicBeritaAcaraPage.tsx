import { useState, useEffect, useCallback, useRef } from 'react';
import { LOGO_BASE64 } from '../assets/logoBase64';
import {
    Button, Input, Select, DatePicker, Form, Table, Typography, Space, message,
    Card, Tabs, Modal, Divider, Popover, Badge, ConfigProvider, theme,
} from 'antd';
import {
    PrinterOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined,
    FileTextOutlined, SearchOutlined, EyeOutlined,
} from '@ant-design/icons';
import { publicApi } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const DOC_TYPES = [
    { label: 'Pemberitahuan Barang Kurang', value: 'Pemberitahuan Barang Kurang' },
    { label: 'Penolakan Barang', value: 'Penolakan Barang' },
    { label: 'Pemberitahuan Barang Lebih', value: 'Pemberitahuan Barang Lebih' },
    { label: 'Pengembalian Barang', value: 'Pengembalian Barang' },
    { label: 'Pemberitahuan Barang Tidak Sesuai', value: 'Pemberitahuan Barang Tidak Sesuai' },
];
const INBOUND_TYPE_SET = new Set(DOC_TYPES.map(d => d.value));
const WAREHOUSE_OPTIONS = [
    { label: 'WH-JC', value: 'WH-JC' },
    { label: 'WH-JC-02', value: 'WH-JC-02' },
    { label: 'HUB-BKI', value: 'HUB-BKI' },
];

interface SkuItem { sku: string; description?: string; serial_number: string; qty: number; qty_po: number; qty_actual: number; note: string; }

function generateDocNumber(existingDocs: any[], docType: string, warehouse: string): string {
    const now = dayjs(); const prefix = now.format('MMYY'); const year = now.format('YYYY');
    let maxSeq = 0;
    existingDocs.filter(d => d.doc_type === docType && (d.doc_number || '').includes(`/${warehouse}/`)).forEach(d => {
        const dn = d.doc_number || '';
        if (dn.startsWith(prefix + '-')) { const seq = parseInt(dn.split('-')[1]?.split('/')[0]) || 0; if (seq > maxSeq) maxSeq = seq; }
    });
    return `${prefix}-${(maxSeq + 1).toString().padStart(4, '0')}/${warehouse}/${year}`;
}

function getWarehouseFromDoc(doc: any): string {
    if (doc.warehouse) return doc.warehouse;
    if ((doc.doc_number || '').includes('/WH-JC-02/')) return 'WH-JC-02';
    if ((doc.doc_number || '').includes('/HUB-BKI/')) return 'HUB-BKI';
    return 'WH-JC';
}

const printTh: React.CSSProperties = { border: '1px solid #333', padding: '6px 10px', textAlign: 'left', background: '#eee', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' };
const printTd: React.CSSProperties = { border: '1px solid #333', padding: '6px 10px', textAlign: 'left' };

const REJECTION_REASONS = [
    'Wrapping Sobek', 'Barang Basah', 'Barang Sobek', 'Produk Expired/NED',
    'Tidak ada di PO', 'Lebih dari PO', 'Fisik Tidak Sesuai', 'Barang Penyok',
].map(v => ({ value: v, label: v }));

export default function PublicBeritaAcaraPage() {
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('create');
    const [search, setSearch] = useState('');
    const [form] = Form.useForm();
    const [items, setItems] = useState<SkuItem[]>([]);
    const [skuInput, setSkuInput] = useState('');
    const skuRef = useRef<any>(null);
    const docType = Form.useWatch('doc_type', form);
    const warehouse = Form.useWatch('warehouse', form) || 'WH-JC';
    const isBarangKurang = docType === 'Pemberitahuan Barang Kurang';
    const isBarangLebih = docType === 'Pemberitahuan Barang Lebih';
    const isBarangTidakSesuai = docType === 'Pemberitahuan Barang Tidak Sesuai';
    const isBarangKurangLebih = isBarangKurang || isBarangLebih || isBarangTidakSesuai;
    const isPenolakanBarang = docType === 'Penolakan Barang';
    const isRequiresPic = warehouse === 'WH-JC-02' || warehouse === 'HUB-BKI';
    const [previewDoc, setPreviewDoc] = useState<any>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await publicApi.beritaAcaraList();
            const data = (res.data || []).filter((d: any) => INBOUND_TYPE_SET.has(d.doc_type));
            data.sort((a: any, b: any) => b.id - a.id);
            setDocs(data);
        } catch { message.error('Gagal memuat data'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAddSku = () => {
        const sku = skuInput.trim(); if (!sku) return;
        const existing = items.find(i => i.sku.toLowerCase() === sku.toLowerCase());
        if (existing) { setItems(items.map(i => i.sku.toLowerCase() === sku.toLowerCase() ? { ...i, qty: i.qty + 1 } : i)); }
        else { setItems([...items, { sku, description: '', serial_number: '', qty: 1, qty_po: 0, qty_actual: 0, note: '' }]); }
        setSkuInput(''); setTimeout(() => skuRef.current?.focus(), 50);
    };
    const handleRemoveSku = (index: number) => setItems(items.filter((_, i) => i !== index));
    const handleItemChange = (index: number, field: string, value: any) => setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));

    const handleSaveAndPrint = async () => {
        let vals: any;
        try { vals = await form.validateFields(); } catch { message.error('Lengkapi semua field yang wajib!'); return; }
        if (items.length === 0) { message.warning('Tambahkan minimal 1 SKU!'); return; }
        const wh = vals.warehouse || 'WH-JC';
        const docNumber = generateDocNumber(docs, vals.doc_type, wh);
        const payload = {
            doc_type: vals.doc_type, doc_number: docNumber, date: dayjs(vals.date).format('YYYY-MM-DD'),
            checker: vals.checker, kepada: vals.kepada, dari: 'PT. Global Jet Ecommerce',
            items: JSON.stringify(items), notes: vals.notes || '',
            warehouse: wh, pic_name: (wh === 'WH-JC-02' || wh === 'HUB-BKI') ? (vals.pic_name || '') : '',
        };
        try {
            await publicApi.beritaAcaraCreate(payload);
            message.success('Berita Acara tersimpan!');
            setPreviewDoc({ ...payload, items }); setPreviewOpen(true);
            form.resetFields(); form.setFieldsValue({ dari: 'PT. Global Jet Ecommerce', date: dayjs(), warehouse: 'WH-JC' });
            setItems([]); fetchData();
        } catch (err: any) { message.error(err?.response?.data?.error || 'Gagal menyimpan'); }
    };

    const handlePrint = async () => {
        const el = document.getElementById('public-ba-print'); if (!el) return;
        const win = window.open('', '_blank'); if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Berita Acara</title><style>
@page{size:A4 portrait;margin:12mm 14mm}*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%;margin:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:12px}.print-wrapper{min-height:100vh;display:flex;flex-direction:column}
.print-content{flex:1 0 auto}.print-footer{flex-shrink:0;margin-top:auto;padding-top:12px;border-top:1.5px solid #d0d0d0;text-align:left;font-size:9px;color:#888;line-height:1.6}
.doc-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #e0e0e0}
.doc-header img{height:52px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #333;padding:6px 10px;text-align:left}
th{background:#eee;font-weight:700;font-size:11px;text-transform:uppercase}</style></head><body><div class="print-wrapper">${el.innerHTML}</div></body></html>`);
        win.document.close();
        const imgs = win.document.querySelectorAll('img');
        await Promise.all(Array.from(imgs).map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })));
        setTimeout(() => win.print(), 200);
    };

    const handleView = (record: any) => {
        let parsed: SkuItem[] = []; try { parsed = JSON.parse(record.items || '[]'); } catch { /* */ }
        setPreviewDoc({ ...record, items: parsed }); setPreviewOpen(true);
    };

    const searchTerms = search.split('\n').map(t => t.trim().toLowerCase()).filter(Boolean);
    const filteredDocs = docs.filter(d => {
        if (searchTerms.length === 0) return true;
        return searchTerms.some(q => (d.doc_number || '').toLowerCase().includes(q) || (d.doc_type || '').toLowerCase().includes(q) || (d.checker || '').toLowerCase().includes(q) || (d.kepada || '').toLowerCase().includes(q));
    });

    const columns = [
        { title: 'No. Dokumen', dataIndex: 'doc_number', key: 'doc_number', width: 220, render: (v: string) => <Text style={{ color: '#60a5fa', fontWeight: 600 }}>{v}</Text> },
        { title: 'Jenis', dataIndex: 'doc_type', key: 'doc_type', width: 220 },
        { title: 'Tanggal', dataIndex: 'date', key: 'date', width: 110 },
        { title: 'Checker', dataIndex: 'checker', key: 'checker', width: 150 },
        { title: 'Kepada', dataIndex: 'kepada', key: 'kepada', width: 180 },
        { title: 'Items', dataIndex: 'items', key: 'items', width: 80, render: (v: string) => { try { return JSON.parse(v || '[]').length; } catch { return 0; } } },
        { title: 'Aksi', key: 'actions', width: 80, fixed: 'right' as const, render: (_: any, r: any) => <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleView(r)} /> },
    ];

    const docForPreview = previewDoc;

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#6366f1', borderRadius: 8, fontFamily: "'Inter', sans-serif", colorBgContainer: '#1a1f3a', colorBgElevated: '#1e2340', colorBorder: 'rgba(255,255,255,0.08)', colorText: 'rgba(255,255,255,0.85)' }, components: { Table: { headerBg: '#0d1117', headerColor: 'rgba(255,255,255,0.7)', rowHoverBg: 'rgba(99,102,241,0.08)', borderColor: 'rgba(255,255,255,0.06)' }, Modal: { contentBg: '#1e2340', headerBg: '#1e2340' }, Card: { colorBgContainer: '#1a1f3a', colorBorderSecondary: 'rgba(255,255,255,0.06)' } } }}>
            <div style={{ background: '#0d1117', minHeight: '100vh', padding: 24 }}>
                <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                    <Title level={4} style={{ margin: '0 0 16px', color: '#fff' }}>📄 Berita Acara — Inbound</Title>

                    <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                        { key: 'create', label: <span><FileTextOutlined /> Buat Baru</span>, children: (
                            <Card style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Form form={form} layout="vertical" initialValues={{ dari: 'PT. Global Jet Ecommerce', date: dayjs(), warehouse: 'WH-JC' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                                        <Form.Item name="doc_type" label="Jenis Berita Acara" rules={[{ required: true, message: 'Pilih jenis' }]}>
                                            <Select options={DOC_TYPES} placeholder="Pilih jenis berita acara" />
                                        </Form.Item>
                                        <Form.Item name="date" label="Tanggal" rules={[{ required: true }]}>
                                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                        </Form.Item>
                                        <Form.Item name="checker" label="Checker" rules={[{ required: true, message: 'Isi nama checker' }]}>
                                            <Input placeholder="Nama checker" />
                                        </Form.Item>
                                        <Form.Item name="kepada" label="Kepada" rules={[{ required: true, message: 'Isi tujuan' }]}>
                                            <Input placeholder="Nama perusahaan/ekspedisi" />
                                        </Form.Item>
                                        <Form.Item name="dari" label="Dari"><Input disabled /></Form.Item>
                                        <Form.Item name="warehouse" label="Warehouse" rules={[{ required: true }]}>
                                            <Select options={WAREHOUSE_OPTIONS} />
                                        </Form.Item>
                                        {isRequiresPic && (
                                            <Form.Item name="pic_name" label="Nama PIC" rules={[{ required: true, message: 'Isi nama PIC' }]}>
                                                <Input placeholder="Masukkan nama PIC" />
                                            </Form.Item>
                                        )}
                                    </div>
                                    <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>📦 Item SKU</Divider>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                        <Input ref={skuRef} placeholder="Scan / Ketik SKU lalu Enter" value={skuInput} onChange={e => setSkuInput(e.target.value)} onPressEnter={handleAddSku} style={{ maxWidth: 400 }} prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.3)' }} />} />
                                        <Button icon={<PlusOutlined />} onClick={handleAddSku}>Tambah</Button>
                                    </div>
                                    {items.length > 0 && (
                                        <Table dataSource={items.map((item, i) => ({ ...item, key: i }))} pagination={false} size="small" style={{ marginBottom: 16 }} columns={[
                                            { title: 'No', key: 'no', width: 50, render: (_: any, __: any, i: number) => i + 1 },
                                            { title: 'SKU', dataIndex: 'sku', key: 'sku' },
                                            ...(isBarangTidakSesuai ? [{ title: 'Description', dataIndex: 'description', key: 'description', render: (v: string, _: any, i: number) => <Input value={v} size="small" placeholder="Deskripsi" onChange={e => handleItemChange(i, 'description', e.target.value)} /> }] : []),
                                            ...(isBarangKurangLebih ? [
                                                { title: isBarangTidakSesuai ? 'Qty DO' : 'Qty PO', dataIndex: 'qty_po', key: 'qty_po', width: 90, render: (v: number, _: any, i: number) => <Input type="number" min={0} value={v} size="small" style={{ width: 75 }} onChange={e => handleItemChange(i, 'qty_po', parseInt(e.target.value) || 0)} /> },
                                                { title: isBarangTidakSesuai ? 'Qty Fisik' : 'Qty Actual', dataIndex: 'qty_actual', key: 'qty_actual', width: 100, render: (v: number, _: any, i: number) => <Input type="number" min={0} value={v} size="small" style={{ width: 75 }} onChange={e => handleItemChange(i, 'qty_actual', parseInt(e.target.value) || 0)} /> },
                                                { title: isBarangTidakSesuai ? 'Selisih' : 'Qty Diff', key: 'qty_diff', width: 90, render: (_: any, record: any) => { const diff = (record.qty_actual || 0) - (record.qty_po || 0); return <span style={{ color: diff === 0 ? '#888' : diff < 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{diff}</span>; } },
                                            ] : [
                                                { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 80, render: (v: number, _: any, i: number) => <Input type="number" min={1} value={v} size="small" style={{ width: 70 }} onChange={e => handleItemChange(i, 'qty', parseInt(e.target.value) || 1)} /> },
                                            ]),
                                            { title: 'Serial Number', dataIndex: 'serial_number', key: 'serial_number', render: (v: string, _: any, i: number) => <Input value={v} size="small" placeholder="Opsional" onChange={e => handleItemChange(i, 'serial_number', e.target.value)} /> },
                                            { title: 'Catatan', dataIndex: 'note', key: 'note', render: (v: string, _: any, i: number) => isPenolakanBarang ? <Select value={v || undefined} size="small" placeholder="Pilih alasan" allowClear style={{ width: '100%', minWidth: 180 }} onChange={(val: string) => handleItemChange(i, 'note', val || '')} options={REJECTION_REASONS} /> : <Input value={v} size="small" placeholder="Opsional" onChange={e => handleItemChange(i, 'note', e.target.value)} /> },
                                            { title: '', key: 'del', width: 40, render: (_: any, __: any, i: number) => <Button type="text" size="small" icon={<DeleteOutlined />} danger onClick={() => handleRemoveSku(i)} /> },
                                        ]} />
                                    )}
                                    <Form.Item name="notes" label="Catatan Umum"><TextArea rows={2} placeholder="Catatan tambahan (opsional)" /></Form.Item>
                                    <Button type="primary" icon={<PrinterOutlined />} size="large" onClick={handleSaveAndPrint} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', fontWeight: 700 }}>💾 Simpan & Print</Button>
                                </Form>
                            </Card>
                        )},
                        { key: 'history', label: <span><ReloadOutlined /> Riwayat</span>, children: (
                            <div>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    <Popover trigger="click" placement="bottomRight" content={<div style={{ width: 280 }}><div style={{ marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Masukkan keyword (satu per baris)</div><Input.TextArea value={search} onChange={e => setSearch(e.target.value)} placeholder={"Keyword 1\nKeyword 2"} autoSize={{ minRows: 4, maxRows: 10 }} style={{ marginBottom: 8 }} /><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{searchTerms.length > 0 ? `${searchTerms.length} keyword aktif` : 'Tidak ada filter'}</span>{search && <Button size="small" danger onClick={() => setSearch('')}>Clear</Button>}</div></div>}><Badge count={searchTerms.length} size="small" offset={[-4, 4]}><Button icon={<SearchOutlined />}>{searchTerms.length > 0 ? `Search (${searchTerms.length})` : 'Search'}</Button></Badge></Popover>
                                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
                                </div>
                                <Table dataSource={filteredDocs} columns={columns} rowKey="id" loading={loading} size="small" scroll={{ x: 1000 }} pagination={{ pageSize: 20, showTotal: (t) => `${t} dokumen` }} />
                            </div>
                        )},
                    ]} />

                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Warehouse Report & Monitoring System</Text>
                    </div>
                </div>

                <Modal open={previewOpen} onCancel={() => setPreviewOpen(false)} width={800}
                    footer={<Space><Button onClick={() => setPreviewOpen(false)}>Tutup</Button><Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button></Space>}
                    title="Preview Berita Acara">
                    {previewDoc && (() => {
                        const wh = getWarehouseFromDoc(previewDoc);
                        const isRequiresPicPrint = wh === 'WH-JC-02' || wh === 'HUB-BKI';
                        return (
                    <div id="public-ba-print" className="print-wrapper" style={{ background: '#fff', color: '#1a1a1a', padding: 24, borderRadius: 8, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="print-content" style={{ flex: 1 }}>
                            <div className="doc-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e0e0e0' }}>
                                <img src={LOGO_BASE64} alt="Logo" style={{ height: 52 }} />
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1a1a1a', marginBottom: 4 }}>{docForPreview.doc_type}</div>
                                    <div style={{ fontSize: 12, color: '#555' }}>No: {docForPreview.doc_number}</div>
                                </div>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Tanggal</strong>: {docForPreview.date}</div>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Kepada</strong>: {docForPreview.kepada}</div>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Dari</strong>: {docForPreview.dari}</div>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Checker</strong>: {docForPreview.checker}</div>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}>
                                <thead><tr>
                                    <th style={printTh}>No</th><th style={printTh}>SKU</th>
                                    {docForPreview.doc_type === 'Pemberitahuan Barang Tidak Sesuai' && <th style={printTh}>Description</th>}
                                    {(docForPreview.doc_type === 'Pemberitahuan Barang Kurang' || docForPreview.doc_type === 'Pemberitahuan Barang Lebih' || docForPreview.doc_type === 'Pemberitahuan Barang Tidak Sesuai') ? <><th style={printTh}>{docForPreview.doc_type === 'Pemberitahuan Barang Tidak Sesuai' ? 'Qty DO' : 'Qty PO'}</th><th style={printTh}>{docForPreview.doc_type === 'Pemberitahuan Barang Tidak Sesuai' ? 'Qty Fisik' : 'Qty Actual'}</th><th style={printTh}>{docForPreview.doc_type === 'Pemberitahuan Barang Tidak Sesuai' ? 'Selisih' : 'Qty Diff'}</th></> : <th style={printTh}>Qty</th>}
                                    <th style={printTh}>Serial Number</th><th style={printTh}>Catatan</th>
                                </tr></thead>
                                <tbody>{(docForPreview.items || []).map((item: SkuItem, i: number) => {
                                    const diff = (item.qty_actual || 0) - (item.qty_po || 0);
                                    return (
                                    <tr key={i}>
                                        <td style={printTd}>{i + 1}</td><td style={printTd}>{item.sku}</td>
                                        {docForPreview.doc_type === 'Pemberitahuan Barang Tidak Sesuai' && <td style={printTd}>{item.description || '-'}</td>}
                                        {(docForPreview.doc_type === 'Pemberitahuan Barang Kurang' || docForPreview.doc_type === 'Pemberitahuan Barang Lebih' || docForPreview.doc_type === 'Pemberitahuan Barang Tidak Sesuai') ? <><td style={printTd}>{item.qty_po ?? '-'}</td><td style={printTd}>{item.qty_actual ?? '-'}</td><td style={{ ...printTd, color: diff === 0 ? '#888' : diff < 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{diff}</td></> : <td style={printTd}>{item.qty}</td>}
                                        <td style={printTd}>{item.serial_number || '-'}</td><td style={printTd}>{item.note || '-'}</td>
                                    </tr>);
                                })}</tbody>
                            </table>
                            {docForPreview.notes && <div style={{ margin: '12px 0', padding: 8, border: '1px solid #ccc' }}><strong>Catatan:</strong> {docForPreview.notes}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48 }}>
                                <div style={{ width: '30%', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>Checker</div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>{docForPreview.checker}</div>
                                </div>
                                <div style={{ width: '30%', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>{isRequiresPicPrint ? 'PIC' : 'Supervisor'}</div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>{isRequiresPicPrint ? (docForPreview.pic_name || '') : 'Evan Budi Setiawan Pasaribu'}</div>
                                </div>
                                <div style={{ width: '30%', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>Driver</div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>&nbsp;</div>
                                </div>
                            </div>
                        </div>
                        <div className="print-footer" style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1.5px solid #d0d0d0', textAlign: 'left', fontSize: 9, color: '#888', lineHeight: 1.6, letterSpacing: 0.3 }}>
                            <div style={{ fontWeight: 700, fontSize: 10, color: '#555', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1.5 }}>PT. Global Jet Ecommerce</div>
                            <div>Landmark Pluit Tower B2, 7th Floor, Pluit, Penjaringan – Jakarta Utara</div>
                            <div>DKI Jakarta, 14450</div>
                            <div style={{ marginTop: 6, fontSize: 8, color: '#aaa' }}>Printed: {dayjs().format('DD/MM/YYYY HH:mm')}</div>
                        </div>
                    </div>);
                    })()}
                </Modal>
            </div>
        </ConfigProvider>
    );
}
