import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Button, Input, Select, DatePicker, Form, Table, Typography, Space, message,
    Card, Tabs, Popconfirm, Modal, Divider,
} from 'antd';
import {
    PrinterOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined,
    FileTextOutlined, SearchOutlined, EyeOutlined,
} from '@ant-design/icons';
import { beritaAcaraApi } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const DOC_TYPES = [
    { label: 'Pemberitahuan Barang Kurang', value: 'Pemberitahuan Barang Kurang' },
    { label: 'Penolakan Barang', value: 'Penolakan Barang' },
    { label: 'Pemberitahuan Barang Lebih', value: 'Pemberitahuan Barang Lebih' },
    { label: 'Pengembalian Barang', value: 'Pengembalian Barang' },
];

interface SkuItem {
    sku: string;
    serial_number: string;
    qty: number;       // used for non-barang-kurang types
    qty_po: number;    // used for Pemberitahuan Barang Kurang
    qty_actual: number;
    note: string;
}

// Generate doc number: MMYY-XXXX/WH-JC/YYYY
function generateDocNumber(existingDocs: any[]): string {
    const now = dayjs();
    const prefix = now.format('MMYY');
    const year = now.format('YYYY');

    // Find the highest sequence number for this month's prefix
    let maxSeq = 0;
    existingDocs.forEach(d => {
        const dn = d.doc_number || '';
        if (dn.startsWith(prefix + '-')) {
            const seqStr = dn.split('-')[1]?.split('/')[0];
            const seq = parseInt(seqStr) || 0;
            if (seq > maxSeq) maxSeq = seq;
        }
    });
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
    return `${prefix}-${nextSeq}/WH-JC/${year}`;
}

export default function BeritaAcaraPage() {
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('create');
    const [search, setSearch] = useState('');

    // Form state
    const [form] = Form.useForm();
    const [items, setItems] = useState<SkuItem[]>([]);
    const [skuInput, setSkuInput] = useState('');
    const skuRef = useRef<any>(null);
    const docType = Form.useWatch('doc_type', form);
    const isBarangKurang = docType === 'Pemberitahuan Barang Kurang';
    const isPenolakanBarang = docType === 'Penolakan Barang';

    // Preview
    const [previewDoc, setPreviewDoc] = useState<any>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await beritaAcaraApi.list();
            const data = res.data || [];
            data.sort((a: any, b: any) => b.id - a.id);
            setDocs(data);
        } catch { message.error('Gagal memuat data'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Add SKU item
    const handleAddSku = () => {
        const sku = skuInput.trim();
        if (!sku) return;
        // Check if SKU already exists, increment qty
        const existing = items.find(i => i.sku.toLowerCase() === sku.toLowerCase());
        if (existing) {
            setItems(items.map(i => i.sku.toLowerCase() === sku.toLowerCase() ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setItems([...items, { sku, serial_number: '', qty: 1, qty_po: 0, qty_actual: 0, note: '' }]);
        }
        setSkuInput('');
        setTimeout(() => skuRef.current?.focus(), 50);
    };

    // Remove SKU item
    const handleRemoveSku = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Update item field
    const handleItemChange = (index: number, field: string, value: any) => {
        setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    // Save & Print
    const handleSaveAndPrint = async () => {
        let vals: any;
        try {
            vals = await form.validateFields();
        } catch {
            message.error('Lengkapi semua field yang wajib!');
            return;
        }
        if (items.length === 0) { message.warning('Tambahkan minimal 1 SKU!'); return; }

        const docNumber = generateDocNumber(docs);
        const payload = {
            doc_type: vals.doc_type,
            doc_number: docNumber,
            date: dayjs(vals.date).format('YYYY-MM-DD'),
            checker: vals.checker,
            kepada: vals.kepada,
            dari: 'PT. Global Jet Ecommerce',
            items: JSON.stringify(items),
            notes: vals.notes || '',
        };

        try {
            await beritaAcaraApi.create(payload);
            message.success('Berita Acara tersimpan!');

            // Show print preview
            setPreviewDoc({ ...payload, items });
            setPreviewOpen(true);

            // Reset form
            form.resetFields();
            form.setFieldsValue({ dari: 'PT. Global Jet Ecommerce', date: dayjs() });
            setItems([]);
            fetchData();
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || 'Gagal menyimpan Berita Acara ke server';
            message.error(msg);
        }
    };

    // Print the preview
    const handlePrint = () => {
        const printContent = document.getElementById('berita-acara-print');
        if (!printContent) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Berita Acara</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 32px; color: #1a1a1a; font-size: 12px; }
    .doc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e0e0e0; }
    .doc-header .logo { height: 52px; }
    .doc-header .doc-info { text-align: right; }
    .doc-header h2 { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1a1a1a; margin-bottom: 4px; }
    .doc-header .doc-no { font-size: 12px; color: #555; }
    .meta { margin-bottom: 16px; }
    .meta div { margin-bottom: 4px; }
    .meta strong { display: inline-block; width: 80px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
    th { background: #eee; font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .notes { margin: 12px 0; padding: 8px; border: 1px solid #ccc; min-height: 40px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
    .sig-box { width: 30%; text-align: center; }
    .sig-box .role { font-weight: 700; font-size: 11px; margin-bottom: 60px; }
    .sig-box .name { border-top: 1px solid #333; padding-top: 4px; font-weight: 600; }
    @media print { body { padding: 16px; } }
</style></head><body>`);
        win.document.write(printContent.innerHTML);
        win.document.write('</body></html>');
        win.document.close();
        setTimeout(() => { win.print(); }, 300);
    };

    // View existing document
    const handleView = (record: any) => {
        let parsedItems: SkuItem[] = [];
        try { parsedItems = JSON.parse(record.items || '[]'); } catch { parsedItems = []; }
        setPreviewDoc({ ...record, items: parsedItems });
        setPreviewOpen(true);
    };

    // Delete
    const handleDelete = async (id: number) => {
        try {
            await beritaAcaraApi.remove(id);
            message.success('Dihapus');
            fetchData();
        } catch { message.error('Gagal menghapus'); }
    };

    // Table columns for history
    const columns = [
        {
            title: 'No. Dokumen', dataIndex: 'doc_number', key: 'doc_number', width: 200,
            render: (v: string) => <Text style={{ color: '#60a5fa', fontWeight: 600 }}>{v}</Text>
        },
        { title: 'Jenis', dataIndex: 'doc_type', key: 'doc_type', width: 220 },
        { title: 'Tanggal', dataIndex: 'date', key: 'date', width: 110 },
        { title: 'Checker', dataIndex: 'checker', key: 'checker', width: 150 },
        { title: 'Kepada', dataIndex: 'kepada', key: 'kepada', width: 180 },
        {
            title: 'Items', dataIndex: 'items', key: 'items', width: 80,
            render: (v: string) => { try { return JSON.parse(v || '[]').length; } catch { return 0; } },
        },
        { title: 'Catatan', dataIndex: 'notes', key: 'notes', ellipsis: true },
        {
            title: 'Aksi', key: 'actions', width: 100, fixed: 'right' as const,
            render: (_: any, r: any) => (
                <Space>
                    <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleView(r)} />
                    <Popconfirm title="Hapus dokumen ini?" onConfirm={() => handleDelete(r.id)}>
                        <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const filteredDocs = docs.filter(d => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (d.doc_number || '').toLowerCase().includes(s)
            || (d.doc_type || '').toLowerCase().includes(s)
            || (d.checker || '').toLowerCase().includes(s)
            || (d.kepada || '').toLowerCase().includes(s);
    });

    const docForPreview = previewDoc;

    return (
        <div style={{ padding: '0 4px' }}>
            <Title level={4} style={{ margin: '0 0 16px', color: '#fff' }}>📄 Berita Acara</Title>

            <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                {
                    key: 'create', label: <span><FileTextOutlined /> Buat Baru</span>,
                    children: (
                        <Card style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Form form={form} layout="vertical" initialValues={{
                                dari: 'PT. Global Jet Ecommerce',
                                date: dayjs(),
                            }}>
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
                                    <Form.Item name="dari" label="Dari">
                                        <Input disabled />
                                    </Form.Item>
                                </div>

                                {/* SKU Scanner */}
                                <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                                    📦 Item SKU
                                </Divider>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    <Input
                                        ref={skuRef}
                                        placeholder="Scan / Ketik SKU lalu Enter"
                                        value={skuInput}
                                        onChange={e => setSkuInput(e.target.value)}
                                        onPressEnter={handleAddSku}
                                        style={{ maxWidth: 400 }}
                                        prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.3)' }} />}
                                    />
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
                                            { title: 'SKU', dataIndex: 'sku', key: 'sku' },
                                            ...(isBarangKurang ? [
                                                {
                                                    title: 'Qty PO', dataIndex: 'qty_po', key: 'qty_po', width: 90,
                                                    render: (v: number, _: any, i: number) => (
                                                        <Input type="number" min={0} value={v} size="small" style={{ width: 75 }}
                                                            onChange={e => handleItemChange(i, 'qty_po', parseInt(e.target.value) || 0)} />
                                                    ),
                                                },
                                                {
                                                    title: 'Qty Actual', dataIndex: 'qty_actual', key: 'qty_actual', width: 100,
                                                    render: (v: number, _: any, i: number) => (
                                                        <Input type="number" min={0} value={v} size="small" style={{ width: 75 }}
                                                            onChange={e => handleItemChange(i, 'qty_actual', parseInt(e.target.value) || 0)} />
                                                    ),
                                                },
                                            ] : [
                                                {
                                                    title: 'Qty', dataIndex: 'qty', key: 'qty', width: 80,
                                                    render: (v: number, _: any, i: number) => (
                                                        <Input type="number" min={1} value={v} size="small" style={{ width: 70 }}
                                                            onChange={e => handleItemChange(i, 'qty', parseInt(e.target.value) || 1)} />
                                                    ),
                                                },
                                            ]),
                                            {
                                                title: 'Serial Number', dataIndex: 'serial_number', key: 'serial_number',
                                                render: (v: string, _: any, i: number) => (
                                                    <Input value={v} size="small" placeholder="Opsional"
                                                        onChange={e => handleItemChange(i, 'serial_number', e.target.value)} />
                                                ),
                                            },
                                            {
                                                title: 'Catatan', dataIndex: 'note', key: 'note',
                                                render: (v: string, _: any, i: number) => isPenolakanBarang ? (
                                                    <Select
                                                        value={v || undefined}
                                                        size="small"
                                                        placeholder="Pilih alasan"
                                                        allowClear
                                                        style={{ width: '100%', minWidth: 180 }}
                                                        onChange={(val: string) => handleItemChange(i, 'note', val || '')}
                                                        options={[
                                                            { value: 'Wrapping Sobek', label: 'Wrapping Sobek' },
                                                            { value: 'Barang Basah', label: 'Barang Basah' },
                                                            { value: 'Barang Sobek', label: 'Barang Sobek' },
                                                            { value: 'Produk Expired/NED', label: 'Produk Expired/NED' },
                                                            { value: 'Tidak ada di PO', label: 'Tidak ada di PO' },
                                                            { value: 'Lebih dari PO', label: 'Lebih dari PO' },
                                                            { value: 'Fisik Tidak Sesuai', label: 'Fisik Tidak Sesuai' },
                                                            { value: 'Barang Penyok', label: 'Barang Penyok' },
                                                        ]}
                                                    />
                                                ) : (
                                                    <Input value={v} size="small" placeholder="Opsional"
                                                        onChange={e => handleItemChange(i, 'note', e.target.value)} />
                                                ),
                                            },
                                            {
                                                title: '', key: 'del', width: 40,
                                                render: (_: any, __: any, i: number) => (
                                                    <Button type="text" size="small" icon={<DeleteOutlined />} danger onClick={() => handleRemoveSku(i)} />
                                                ),
                                            },
                                        ]}
                                    />
                                )}

                                <Form.Item name="notes" label="Catatan Umum">
                                    <TextArea rows={2} placeholder="Catatan tambahan (opsional)" />
                                </Form.Item>

                                <Button type="primary" icon={<PrinterOutlined />} size="large"
                                    onClick={handleSaveAndPrint}
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', fontWeight: 700 }}
                                >
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
                                <Input
                                    placeholder="Cari no. dokumen, jenis, checker..."
                                    prefix={<SearchOutlined />}
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    style={{ maxWidth: 400 }}
                                />
                                <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
                            </div>
                            <Table
                                dataSource={filteredDocs}
                                columns={columns}
                                rowKey="id"
                                loading={loading}
                                size="small"
                                scroll={{ x: 1200 }}
                                pagination={{ pageSize: 20, showTotal: (t) => `${t} dokumen` }}
                            />
                        </div>
                    ),
                },
            ]} />

            {/* Print Preview Modal */}
            <Modal
                open={previewOpen}
                onCancel={() => setPreviewOpen(false)}
                width={800}
                footer={
                    <Space>
                        <Button onClick={() => setPreviewOpen(false)}>Tutup</Button>
                        <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                    </Space>
                }
                title="Preview Berita Acara"
            >
                {docForPreview && (
                    <div id="berita-acara-print" style={{ background: '#fff', color: '#1a1a1a', padding: 24, borderRadius: 8 }}>
                        {/* Header with logo */}
                        <div className="doc-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e0e0e0' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" style={{ height: 52 }}>
                                <defs>
                                    <linearGradient id="og" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#e8490f', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#f0a500', stopOpacity: 1 }} />
                                    </linearGradient>
                                </defs>
                                <path d="M 60,20 A 42,42 0 1,1 24,68" fill="none" stroke="url(#og)" strokeWidth="9" strokeLinecap="round" />
                                <text x="120" y="72" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="300" fontSize="42" fill="#2c2c2c" letterSpacing="1">Jet Commerce</text>
                            </svg>
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
                            <thead>
                                <tr>
                                    <th style={printTh}>No</th>
                                    <th style={printTh}>SKU</th>
                                    {docForPreview.doc_type === 'Pemberitahuan Barang Kurang' ? (
                                        <>
                                            <th style={printTh}>Qty PO</th>
                                            <th style={printTh}>Qty Actual</th>
                                        </>
                                    ) : (
                                        <th style={printTh}>Qty</th>
                                    )}
                                    <th style={printTh}>Serial Number</th>
                                    <th style={printTh}>Catatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(docForPreview.items || []).map((item: SkuItem, i: number) => (
                                    <tr key={i}>
                                        <td style={printTd}>{i + 1}</td>
                                        <td style={printTd}>{item.sku}</td>
                                        {docForPreview.doc_type === 'Pemberitahuan Barang Kurang' ? (
                                            <>
                                                <td style={printTd}>{item.qty_po ?? '-'}</td>
                                                <td style={printTd}>{item.qty_actual ?? '-'}</td>
                                            </>
                                        ) : (
                                            <td style={printTd}>{item.qty}</td>
                                        )}
                                        <td style={printTd}>{item.serial_number || '-'}</td>
                                        <td style={printTd}>{item.note || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {docForPreview.notes && (
                            <div style={{ margin: '12px 0', padding: 8, border: '1px solid #ccc' }}>
                                <strong>Catatan:</strong> {docForPreview.notes}
                            </div>
                        )}

                        {/* Signatures */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48 }}>
                            <div style={{ width: '30%', textAlign: 'center' }}>
                                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>Checker</div>
                                <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>{docForPreview.checker}</div>
                            </div>
                            <div style={{ width: '30%', textAlign: 'center' }}>
                                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>Supervisor</div>
                                <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>Evan Budi Setiawan Pasaribu</div>
                            </div>
                            <div style={{ width: '30%', textAlign: 'center' }}>
                                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>Driver</div>
                                <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>&nbsp;</div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

const printTh: React.CSSProperties = {
    border: '1px solid #333', padding: '6px 10px', textAlign: 'left',
    background: '#eee', fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
};

const printTd: React.CSSProperties = {
    border: '1px solid #333', padding: '6px 10px', textAlign: 'left',
};
