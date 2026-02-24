import { useState, useEffect, useCallback, useRef } from 'react';
import { LOGO_BASE64 } from '../assets/logoBase64';
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

// Generate doc number: BA-INV-MMYY-XXXX/WH-JC/YYYY (per doc_type)
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

export default function BeritaAcaraInventoryPage() {
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

    // Preview
    const [previewDoc, setPreviewDoc] = useState<any>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

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

    // Add SKU item
    const handleAddSku = () => {
        const sku = skuInput.trim();
        if (!sku) return;
        const existing = items.find(i => i.sku.toLowerCase() === sku.toLowerCase());
        if (existing) {
            message.warning('SKU sudah ada di daftar');
        } else {
            setItems([...items, { sku, description: '', location: '', sys_qty: 0, phy_qty: 0, variance: 0, note: '' }]);
        }
        setSkuInput('');
        setTimeout(() => skuRef.current?.focus(), 50);
    };

    const handleRemoveSku = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

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

        const docNumber = generateDocNumber(docs, vals.doc_type);
        const payload = {
            doc_type: vals.doc_type,
            doc_number: docNumber,
            date: dayjs(vals.date).format('YYYY-MM-DD'),
            checker: vals.checker,
            kepada: vals.kepada || '',
            dari: 'PT. Global Jet Ecommerce',
            items: JSON.stringify(items),
            notes: vals.notes || '',
        };

        try {
            await beritaAcaraApi.create(payload);
            message.success('Berita Acara tersimpan!');

            setPreviewDoc({ ...payload, items });
            setPreviewOpen(true);

            form.resetFields();
            form.setFieldsValue({ dari: 'PT. Global Jet Ecommerce', date: dayjs() });
            setItems([]);
            fetchData();
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || 'Gagal menyimpan';
            message.error(msg);
        }
    };

    // Print
    const handlePrint = async () => {
        const printContent = document.getElementById('ba-inventory-print');
        if (!printContent) return;

        const html = printContent.innerHTML;
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
    .print-footer { flex-shrink: 0; margin-top: auto; padding-top: 12px; border-top: 1.5px solid #d0d0d0;
        text-align: left; font-size: 9px; color: #888; line-height: 1.6; letter-spacing: 0.3px; }
    .print-footer .company-name { font-weight: 700; font-size: 10px; color: #555; margin-bottom: 2px;
        text-transform: uppercase; letter-spacing: 1.5px; }
    .doc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
        padding-bottom: 12px; border-bottom: 2px solid #e0e0e0; }
    .doc-header img { height: 52px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
    th { background: #eee; font-weight: 700; font-size: 11px; text-transform: uppercase; }
</style></head><body>
<div class="print-wrapper">
    ${html}
</div>
</body></html>`);
        win.document.close();
        const imgs = win.document.querySelectorAll('img');
        const loadPromises = Array.from(imgs).map(img =>
            img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
        );
        await Promise.all(loadPromises);
        setTimeout(() => { win.print(); }, 200);
    };

    const handleView = (record: any) => {
        let parsedItems: SkuItem[] = [];
        try { parsedItems = JSON.parse(record.items || '[]'); } catch { parsedItems = []; }
        setPreviewDoc({ ...record, items: parsedItems });
        setPreviewOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await beritaAcaraApi.remove(id);
            message.success('Dihapus');
            fetchData();
        } catch { message.error('Gagal menghapus'); }
    };

    const columns = [
        {
            title: 'No. Dokumen', dataIndex: 'doc_number', key: 'doc_number', width: 220,
            render: (v: string) => <Text style={{ color: '#60a5fa', fontWeight: 600 }}>{v}</Text>
        },
        {
            title: 'Jenis', dataIndex: 'doc_type', key: 'doc_type', width: 150,
            render: (v: string) => {
                const color = v === 'Stock Opname' ? '#10b981' : v === 'Disposal' ? '#f87171' : '#fbbf24';
                return <span style={{ color, fontWeight: 600 }}>{v}</span>;
            },
        },
        { title: 'Tanggal', dataIndex: 'date', key: 'date', width: 110 },
        { title: 'Checker', dataIndex: 'checker', key: 'checker', width: 150 },
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
            || (d.checker || '').toLowerCase().includes(s);
    });

    // Dynamic item columns based on doc type
    const isStockOpname = docType === 'Stock Opname';

    const getItemTableColumns = (forDisplay = false): any[] => {
        const dt = forDisplay ? previewDoc?.doc_type : docType;
        const isSO = dt === 'Stock Opname';

        const baseCols: any[] = [
            { title: 'No', key: 'no', width: 50, render: (_: any, __: any, i: number) => i + 1 },
            { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 140 },
        ];

        if (!forDisplay) {
            // Editable columns
            baseCols.push({
                title: 'Deskripsi', dataIndex: 'description', key: 'description',
                render: (v: string, _: any, i: number) => (
                    <Input value={v} size="small" placeholder="Nama barang"
                        onChange={e => handleItemChange(i, 'description', e.target.value)} />
                ),
            });

            if (isSO) {
                baseCols.push(
                    {
                        title: 'Lokasi', dataIndex: 'location', key: 'location', width: 120,
                        render: (v: string, _: any, i: number) => (
                            <Input value={v} size="small" placeholder="Lokasi"
                                onChange={e => handleItemChange(i, 'location', e.target.value)} />
                        ),
                    },
                    {
                        title: 'Sys Qty', dataIndex: 'sys_qty', key: 'sys_qty', width: 90,
                        render: (v: number, _: any, i: number) => (
                            <Input type="number" min={0} value={v} size="small" style={{ width: 75 }}
                                onChange={e => handleItemChange(i, 'sys_qty', parseInt(e.target.value) || 0)} />
                        ),
                    },
                    {
                        title: 'Phy Qty', dataIndex: 'phy_qty', key: 'phy_qty', width: 90,
                        render: (v: number, _: any, i: number) => (
                            <Input type="number" min={0} value={v} size="small" style={{ width: 75 }}
                                onChange={e => handleItemChange(i, 'phy_qty', parseInt(e.target.value) || 0)} />
                        ),
                    },
                    {
                        title: 'Variance', dataIndex: 'variance', key: 'variance', width: 80,
                        render: (v: number) => {
                            const color = v > 0 ? '#10b981' : v < 0 ? '#f87171' : 'rgba(255,255,255,0.5)';
                            return <span style={{ fontWeight: 600, color }}>{v}</span>;
                        },
                    },
                );
            } else {
                // Disposal / Adjustment — just qty
                baseCols.push({
                    title: 'Qty', dataIndex: 'phy_qty', key: 'phy_qty', width: 90,
                    render: (v: number, _: any, i: number) => (
                        <Input type="number" min={0} value={v} size="small" style={{ width: 75 }}
                            onChange={e => handleItemChange(i, 'phy_qty', parseInt(e.target.value) || 0)} />
                    ),
                });
            }

            baseCols.push(
                {
                    title: 'Catatan', dataIndex: 'note', key: 'note',
                    render: (v: string, _: any, i: number) => (
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
            );
        } else {
            // Display (preview) columns
            baseCols.push({ title: 'Deskripsi', dataIndex: 'description', key: 'description' });

            if (isSO) {
                baseCols.push(
                    { title: 'Lokasi', dataIndex: 'location', key: 'location', width: 120 },
                    { title: 'Sys Qty', dataIndex: 'sys_qty', key: 'sys_qty', width: 80 },
                    { title: 'Phy Qty', dataIndex: 'phy_qty', key: 'phy_qty', width: 80 },
                    {
                        title: 'Variance', dataIndex: 'variance', key: 'variance', width: 80,
                        render: (v: number) => {
                            const color = v > 0 ? '#10b981' : v < 0 ? '#f87171' : '#888';
                            return <span style={{ fontWeight: 600, color }}>{v}</span>;
                        },
                    },
                );
            } else {
                baseCols.push({ title: 'Qty', dataIndex: 'phy_qty', key: 'phy_qty', width: 80 });
            }
            baseCols.push({ title: 'Catatan', dataIndex: 'note', key: 'note' });
        }

        return baseCols;
    };

    return (
        <div style={{ padding: '0 4px' }}>
            <Title level={4} style={{ margin: '0 0 16px', color: '#fff' }}>📋 Berita Acara Inventory</Title>

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
                                        <Select options={INVENTORY_DOC_TYPES} placeholder="Pilih jenis berita acara" />
                                    </Form.Item>
                                    <Form.Item name="date" label="Tanggal" rules={[{ required: true }]}>
                                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                    </Form.Item>
                                    <Form.Item name="checker" label="Checker / PIC" rules={[{ required: true, message: 'Isi nama checker' }]}>
                                        <Input placeholder="Nama checker / PIC" />
                                    </Form.Item>
                                    <Form.Item name="kepada" label="Kepada (Opsional)">
                                        <Input placeholder="Tujuan (opsional)" />
                                    </Form.Item>
                                    <Form.Item name="dari" label="Dari">
                                        <Input disabled />
                                    </Form.Item>
                                </div>

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
                                        columns={getItemTableColumns(false)}
                                        scroll={{ x: isStockOpname ? 900 : 600 }}
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
                width={850}
                footer={
                    <Space>
                        <Button onClick={() => setPreviewOpen(false)}>Tutup</Button>
                        <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                    </Space>
                }
                title="Preview Berita Acara Inventory"
            >
                {previewDoc && (
                    <div id="ba-inventory-print" className="print-wrapper" style={{ background: '#fff', color: '#1a1a1a', padding: 24, borderRadius: 8, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
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

                            <div style={{ marginBottom: 16 }}>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Tanggal</strong>: {previewDoc.date}</div>
                                {previewDoc.kepada && (
                                    <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Kepada</strong>: {previewDoc.kepada}</div>
                                )}
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Dari</strong>: {previewDoc.dari}</div>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 80 }}>Checker</strong>: {previewDoc.checker}</div>
                            </div>

                            {/* Items table for print */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}>
                                <thead>
                                    <tr>
                                        <th style={printTh}>No</th>
                                        <th style={printTh}>SKU</th>
                                        <th style={printTh}>Deskripsi</th>
                                        {previewDoc.doc_type === 'Stock Opname' ? (
                                            <>
                                                <th style={printTh}>Lokasi</th>
                                                <th style={printTh}>Sys Qty</th>
                                                <th style={printTh}>Phy Qty</th>
                                                <th style={printTh}>Variance</th>
                                            </>
                                        ) : (
                                            <th style={printTh}>Qty</th>
                                        )}
                                        <th style={printTh}>Catatan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(previewDoc.items || []).map((item: SkuItem, i: number) => (
                                        <tr key={i}>
                                            <td style={printTd}>{i + 1}</td>
                                            <td style={printTd}>{item.sku}</td>
                                            <td style={printTd}>{item.description || '-'}</td>
                                            {previewDoc.doc_type === 'Stock Opname' ? (
                                                <>
                                                    <td style={printTd}>{item.location || '-'}</td>
                                                    <td style={printTd}>{item.sys_qty ?? 0}</td>
                                                    <td style={printTd}>{item.phy_qty ?? 0}</td>
                                                    <td style={printTd}>{item.variance ?? 0}</td>
                                                </>
                                            ) : (
                                                <td style={printTd}>{item.phy_qty ?? 0}</td>
                                            )}
                                            <td style={printTd}>{item.note || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {previewDoc.notes && (
                                <div style={{ margin: '12px 0', padding: 8, border: '1px solid #ccc' }}>
                                    <strong>Catatan:</strong> {previewDoc.notes}
                                </div>
                            )}

                            {/* Signatures */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48 }}>
                                <div style={{ width: '30%', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>Checker / PIC</div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>{previewDoc.checker}</div>
                                </div>
                                <div style={{ width: '30%', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>Supervisor</div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>Evan Budi Setiawan Pasaribu</div>
                                </div>
                                <div style={{ width: '30%', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>Mengetahui</div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>&nbsp;</div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="print-footer" style={{
                            marginTop: 'auto',
                            paddingTop: 12,
                            borderTop: '1.5px solid #d0d0d0',
                            textAlign: 'left',
                            fontSize: 9,
                            color: '#888',
                            lineHeight: 1.6,
                            letterSpacing: 0.3,
                        }}>
                            <div style={{ fontWeight: 700, fontSize: 10, color: '#555', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                PT. Global Jet Ecommerce
                            </div>
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

const printTh: React.CSSProperties = {
    border: '1px solid #333', padding: '6px 10px', textAlign: 'left',
    background: '#eee', fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
};

const printTd: React.CSSProperties = {
    border: '1px solid #333', padding: '6px 10px', textAlign: 'left',
};
