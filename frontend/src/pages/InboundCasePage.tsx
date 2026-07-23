import { useState, useRef, useCallback, useEffect } from 'react';
import { LOGO_BASE64 } from '../assets/logoBase64';
import DataPage from '../components/DataPage';
import { inboundCasesApi, beritaAcaraApi } from '../api/client';
import {
    Form, Input, InputNumber, Select, Button, Modal, Table, Divider, Space,
    message, DatePicker,
} from 'antd';
import {
    FileTextOutlined, PlusOutlined, DeleteOutlined, SearchOutlined,
    PrinterOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';


const CASE_OPTIONS = [
    { label: 'Salah SKU Receive', value: 'Salah SKU Receive' },
    { label: 'Salah Qty Receive', value: 'Salah Qty Receive' },
    { label: 'Salah PO Receive', value: 'Salah PO Receive' },
    { label: 'Rusak Saat Proses Unloading/Receive/Putaway', value: 'Rusak Saat Proses Unloading/Receive/Putaway' },
    { label: 'Lainnya', value: 'Lainnya' },
];

const BA_CASE_OPTIONS = [
    { label: 'Salah Process', value: 'Salah Process' },
    { label: 'Lebih Process', value: 'Lebih Process' },
    { label: 'Kurang Process', value: 'Kurang Process' },
    { label: 'Salah SKU', value: 'Salah SKU' },
    { label: 'Salah Qty Receive', value: 'Salah Qty Receive' },
    { label: 'Salah PO Receive', value: 'Salah PO Receive' },
    { label: 'Rusak Saat Proses', value: 'Rusak Saat Proses' },
    { label: 'Lainnya', value: 'Lainnya' },
];

const columns = [
    { title: 'Tanggal', dataIndex: 'date', key: 'date', width: 110, sorter: (a: any, b: any) => a.date?.localeCompare(b.date) },
    { title: 'Receipt No', dataIndex: 'receipt_no', key: 'receipt_no', width: 140 },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 140 },
    { title: 'Case', dataIndex: 'case', key: 'case', width: 130 },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 70 },
    { title: 'Keterangan', dataIndex: 'keterangan', key: 'keterangan', width: 200, ellipsis: true },
];

const csvHeaders = ['date', 'receipt_no', 'brand', 'sku', 'case', 'operator', 'qty', 'keterangan'];

const formFields = (
    <>
        <Form.Item name="date" label="Tanggal Inbound" rules={[{ required: true }]}>
            <Input placeholder="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="receipt_no" label="Receipt No">
            <Input />
        </Form.Item>
        <Form.Item name="brand" label="Brand">
            <Input />
        </Form.Item>
        <Form.Item name="sku" label="SKU">
            <Input />
        </Form.Item>
        <Form.Item name="case" label="Case">
            <Select options={CASE_OPTIONS} placeholder="Pilih jenis case" allowClear />
        </Form.Item>
        <Form.Item name="operator" label="Operator">
            <Input />
        </Form.Item>
        <Form.Item name="qty" label="Qty">
            <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="keterangan" label="Keterangan">
            <Input.TextArea rows={2} />
        </Form.Item>
    </>
);

// ---- Berita Acara item interface ----
interface BaItem {
    do_number?: string;
    sku: string;
    deskripsi: string;
    qty_actual: number;
    qty_process: number;
    case_type: string;
    operator: string;
    _existing_case_id?: number;
}

// Generate doc number for BA Case Inbound: MMYY-XXXX/WH-JC/YYYY
function generateDocNumber(existingDocs: any[]): string {
    const now = dayjs();
    const prefix = now.format('MMYY');
    const year = now.format('YYYY');
    const docType = 'Berita Acara Case Inbound';
    const warehouse = 'WH-JC';

    let maxSeq = 0;
    existingDocs
        .filter(d => d.doc_type === docType && (d.doc_number || '').includes(`/${warehouse}/`))
        .forEach(d => {
            const dn = d.doc_number || '';
            if (dn.startsWith(prefix + '-')) {
                const seqStr = dn.split('-')[1]?.split('/')[0];
                const seq = parseInt(seqStr) || 0;
                if (seq > maxSeq) maxSeq = seq;
            }
        });
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
    return `${prefix}-${nextSeq}/${warehouse}/${year}`;
}

// ---- Print styles ----
const printTh: React.CSSProperties = {
    border: '1px solid #333', padding: '6px 10px', textAlign: 'left',
    background: '#eee', fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
};

const printTd: React.CSSProperties = {
    border: '1px solid #333', padding: '6px 10px', textAlign: 'left',
};

export default function InboundCasePage() {
    const { user } = useAuth();
    const isSupervisor = user?.role === 'supervisor';

    // ---- Berita Acara state ----
    const [baModalOpen, setBaModalOpen] = useState(false);
    const [baForm] = Form.useForm();
    const [baItems, setBaItems] = useState<BaItem[]>([]);
    const [skuInput, setSkuInput] = useState('');
    const skuRef = useRef<any>(null);
    const [allBaDocs, setAllBaDocs] = useState<any[]>([]);
    const [previewDoc, setPreviewDoc] = useState<any>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch all berita acara docs for doc number generation
    const fetchBaDocs = useCallback(async () => {
        try {
            const res = await beritaAcaraApi.list();
            setAllBaDocs(res.data || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { fetchBaDocs(); }, [fetchBaDocs]);

    // Open BA modal
    const handleOpenBaModal = (selectedRows?: any[]) => {
        baForm.resetFields();
        baForm.setFieldsValue({ date: dayjs() });
        setSkuInput('');

        if (selectedRows && selectedRows.length > 0) {
            const firstRow = selectedRows[0];
            baForm.setFieldsValue({ 
                receipt_no: firstRow.receipt_no || '', 
                brand: firstRow.brand || '' 
            });

            const newItems = selectedRows.map(row => ({
                do_number: '',
                sku: row.sku,
                deskripsi: row.keterangan || '',
                qty_actual: row.qty || 0,
                qty_process: 0,
                case_type: row.case || '',
                operator: row.operator || '',
                _existing_case_id: row.id,
            }));
            setBaItems(newItems);
        } else {
            setBaItems([]);
        }

        setBaModalOpen(true);
        fetchBaDocs();
    };

    // Add SKU item
    const handleAddSku = () => {
        const sku = skuInput.trim();
        if (!sku) return;
        const existing = baItems.find(i => i.sku.toLowerCase() === sku.toLowerCase());
        if (existing) {
            setBaItems(baItems.map(i =>
                i.sku.toLowerCase() === sku.toLowerCase()
                    ? { ...i, qty_actual: i.qty_actual + 1 }
                    : i
            ));
        } else {
            setBaItems([...baItems, {
                do_number: '',
                sku,
                deskripsi: '',
                qty_actual: 0,
                qty_process: 0,
                case_type: '',
                operator: '',
            }]);
        }
        setSkuInput('');
        setTimeout(() => skuRef.current?.focus(), 50);
    };

    // Remove SKU item
    const handleRemoveSku = (index: number) => {
        setBaItems(baItems.filter((_, i) => i !== index));
    };

    // Update item field
    const handleItemChange = (index: number, field: string, value: any) => {
        setBaItems(baItems.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    // Save & Print
    const handleSaveAndPrint = async () => {
        let vals: any;
        try {
            vals = await baForm.validateFields();
        } catch {
            message.error('Lengkapi semua field yang wajib!');
            return;
        }
        if (baItems.length === 0) {
            message.warning('Tambahkan minimal 1 SKU!');
            return;
        }

        // Validate items
        for (let i = 0; i < baItems.length; i++) {
            const item = baItems[i];
            if (!item.case_type) {
                message.warning(`Pilih case untuk SKU "${item.sku}" (baris ${i + 1})`);
                return;
            }
            if (!item.operator) {
                message.warning(`Isi operator untuk SKU "${item.sku}" (baris ${i + 1})`);
                return;
            }
        }

        const docNumber = generateDocNumber(allBaDocs);
        const dateStr = dayjs(vals.date).format('YYYY-MM-DD');

        const payload = {
            doc_type: 'Berita Acara Case Inbound',
            doc_number: docNumber,
            date: dateStr,
            checker: vals.pembuat || '',
            kepada: '-',
            dari: 'PT. Global Jet Ecommerce',
            items: JSON.stringify(baItems),
            notes: vals.notes || '',
            warehouse: 'WH-JC',
            pic_name: '',
        };

        try {
            // 1. Save Berita Acara
            await beritaAcaraApi.create(payload);

            // 2. Auto-insert or update each item to Case Inbound
            for (const item of baItems) {
                const discrepancy = (item.qty_actual || 0) - (item.qty_process || 0);
                const updatedKeterangan = `[BA ${docNumber}] ${item.deskripsi || ''} | Qty Actual: ${item.qty_actual}, Qty Process: ${item.qty_process}, Discrepancy: ${discrepancy}`;
                
                const caseData = {
                    date: dateStr,
                    receipt_no: vals.receipt_no || '',
                    brand: vals.brand || '',
                    sku: item.sku,
                    case: item.case_type,
                    operator: item.operator,
                    qty: Math.abs(discrepancy),
                    keterangan: updatedKeterangan,
                };

                if (item._existing_case_id) {
                    await inboundCasesApi.update(item._existing_case_id, caseData);
                } else {
                    await inboundCasesApi.create(caseData);
                }
            }

            message.success('Berita Acara tersimpan & data masuk ke Case Inbound!');

            // Show print preview
            setPreviewDoc({ ...payload, items: baItems, pembuat: vals.pembuat || '', receipt_no: vals.receipt_no || '-', brand: vals.brand || '-' });
            setPreviewOpen(true);

            // Reset form
            setBaModalOpen(false);
            setBaItems([]);
            baForm.resetFields();
            fetchBaDocs();

            // Refresh case inbound data
            setRefreshKey(prev => prev + 1);
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || 'Gagal menyimpan';
            message.error(msg);
        }
    };

    // Print the preview
    const handlePrint = async () => {
        const printContent = document.getElementById('ba-case-print');
        if (!printContent) return;

        const html = printContent.innerHTML;

        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Berita Acara Case Inbound</title>
<style>
    @page { size: A4 landscape; margin: 10mm 12mm; }
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

    // ---- BA items table columns ----
    const baItemColumns = [
        { title: 'No', key: 'no', width: 50, render: (_: any, __: any, i: number) => i + 1 },
        {
            title: 'No DO', dataIndex: 'do_number', key: 'do_number', width: 120,
            render: (v: string, _: any, i: number) => (
                <Input value={v} size="small" placeholder="No DO"
                    onChange={e => handleItemChange(i, 'do_number', e.target.value)} />
            ),
        },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 160 },
        {
            title: 'Deskripsi', dataIndex: 'deskripsi', key: 'deskripsi', width: 200,
            render: (v: string, _: any, i: number) => (
                <Input value={v} size="small" placeholder="Deskripsi item"
                    onChange={e => handleItemChange(i, 'deskripsi', e.target.value)} />
            ),
        },
        {
            title: 'Qty Actual', dataIndex: 'qty_actual', key: 'qty_actual', width: 110,
            render: (v: number, _: any, i: number) => (
                <InputNumber value={v} size="small" min={0} style={{ width: 90 }}
                    onChange={val => handleItemChange(i, 'qty_actual', val || 0)} />
            ),
        },
        {
            title: 'Qty Process', dataIndex: 'qty_process', key: 'qty_process', width: 110,
            render: (v: number, _: any, i: number) => (
                <InputNumber value={v} size="small" min={0} style={{ width: 90 }}
                    onChange={val => handleItemChange(i, 'qty_process', val || 0)} />
            ),
        },
        {
            title: 'Discrepancy', key: 'discrepancy', width: 110,
            render: (_: any, record: BaItem) => {
                const diff = (record.qty_actual || 0) - (record.qty_process || 0);
                return <span style={{
                    color: diff === 0 ? '#888' : diff < 0 ? '#dc2626' : '#16a34a',
                    fontWeight: 600,
                }}>{diff}</span>;
            },
        },
        {
            title: 'Case', dataIndex: 'case_type', key: 'case_type', width: 180,
            render: (v: string, _: any, i: number) => (
                <Select
                    value={v || undefined}
                    size="small"
                    placeholder="Pilih case"
                    allowClear
                    style={{ width: '100%', minWidth: 150 }}
                    onChange={(val: string) => handleItemChange(i, 'case_type', val || '')}
                    options={BA_CASE_OPTIONS}
                />
            ),
        },
        {
            title: 'Operator', dataIndex: 'operator', key: 'operator', width: 150,
            render: (v: string, _: any, i: number) => (
                <Input value={v} size="small" placeholder="Nama operator"
                    onChange={e => handleItemChange(i, 'operator', e.target.value)} />
            ),
        },
        {
            title: '', key: 'del', width: 40,
            render: (_: any, __: any, i: number) => (
                <Button type="text" size="small" icon={<DeleteOutlined />} danger onClick={() => handleRemoveSku(i)} />
            ),
        },
    ];

    // ---- Extra button for DataPage toolbar ----
    const extraButtons = (selectedKeys: React.Key[], selectedRows: any[]) => (
        <Button
            icon={<FileTextOutlined />}
            onClick={() => handleOpenBaModal(selectedRows)}
            style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
            }}
        >
            📄 Buat Berita Acara {selectedRows.length > 0 ? `(${selectedRows.length})` : ''}
        </Button>
    );

    return (
        <>
            <DataPage
                key={refreshKey}
                title="Case Inbound"
                api={inboundCasesApi}
                columns={columns}
                formFields={formFields}
                csvHeaders={csvHeaders}
                dateField="date"
                hideEdit={!isSupervisor}
                extraButtons={extraButtons}
                columnMap={{
                    date: 'date',
                    receipt_no: 'receipt_no',
                    brand: 'brand',
                    sku: 'sku',
                    case: 'case',
                    operator: 'operator',
                    qty: 'qty',
                    keterangan: 'keterangan',
                }}
                numberFields={['qty']}
            />

            {/* ---- Berita Acara Modal ---- */}
            <Modal
                open={baModalOpen}
                onCancel={() => setBaModalOpen(false)}
                width={1100}
                footer={null}
                title={
                    <span style={{ fontSize: 16, fontWeight: 700 }}>
                        📄 Buat Berita Acara — Case Inbound
                    </span>
                }
                destroyOnClose
            >
                <Form form={baForm} layout="vertical" initialValues={{ date: dayjs() }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                        <Form.Item name="date" label="Tanggal" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item name="receipt_no" label="Receipt No">
                            <Input placeholder="Nomor receipt" />
                        </Form.Item>
                        <Form.Item name="brand" label="Brand">
                            <Input placeholder="Nama brand" />
                        </Form.Item>
                        <Form.Item name="pembuat" label="Pembuat (Nama)" rules={[{ required: true, message: 'Isi nama pembuat' }]}>
                            <Input placeholder="Nama pembuat berita acara" />
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

                    {baItems.length > 0 && (
                        <Table
                            dataSource={baItems.map((item, i) => ({ ...item, key: i }))}
                            pagination={false}
                            size="small"
                            style={{ marginBottom: 16 }}
                            columns={baItemColumns}
                            scroll={{ x: 'max-content' }}
                        />
                    )}

                    <Form.Item name="notes" label="Catatan Umum">
                        <Input.TextArea rows={2} placeholder="Catatan tambahan (opsional)" />
                    </Form.Item>

                    <Button
                        type="primary"
                        icon={<PrinterOutlined />}
                        size="large"
                        onClick={handleSaveAndPrint}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            border: 'none',
                            fontWeight: 700,
                        }}
                    >
                        💾 Simpan & Print
                    </Button>
                </Form>
            </Modal>

            {/* ---- Print Preview Modal ---- */}
            <Modal
                open={previewOpen}
                onCancel={() => setPreviewOpen(false)}
                width={1000}
                footer={
                    <Space>
                        <Button onClick={() => setPreviewOpen(false)}>Tutup</Button>
                        <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                    </Space>
                }
                title="Preview Berita Acara — Case Inbound"
            >
                {previewDoc && (
                    <div id="ba-case-print" className="print-wrapper" style={{
                        background: '#fff', color: '#1a1a1a', padding: 24, borderRadius: 8,
                        minHeight: '100%', display: 'flex', flexDirection: 'column',
                    }}>
                        <div className="print-content" style={{ flex: 1 }}>
                            {/* Header with logo */}
                            <div className="doc-header" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e0e0e0',
                            }}>
                                <img src={LOGO_BASE64} alt="Logo" style={{ height: 52 }} />
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontSize: 15, fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: 1, color: '#1a1a1a', marginBottom: 4,
                                    }}>
                                        Berita Acara Case Inbound
                                    </div>
                                    <div style={{ fontSize: 12, color: '#555' }}>No: {previewDoc.doc_number}</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 100 }}>Tanggal</strong>: {previewDoc.date}</div>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 100 }}>Receipt No</strong>: {previewDoc.receipt_no || '-'}</div>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 100 }}>Brand</strong>: {previewDoc.brand || '-'}</div>
                                <div style={{ marginBottom: 4 }}><strong style={{ display: 'inline-block', width: 100 }}>Pembuat</strong>: {previewDoc.pembuat || previewDoc.checker}</div>
                            </div>

                            {/* Items table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}>
                                <thead>
                                    <tr>
                                        <th style={printTh}>No</th>
                                        <th style={printTh}>No DO</th>
                                        <th style={printTh}>SKU</th>
                                        <th style={printTh}>Deskripsi</th>
                                        <th style={printTh}>Qty Actual</th>
                                        <th style={printTh}>Qty Process</th>
                                        <th style={printTh}>Discrepancy</th>
                                        <th style={printTh}>Case</th>
                                        <th style={printTh}>Operator</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(previewDoc.items || []).map((item: BaItem, i: number) => {
                                        const diff = (item.qty_actual || 0) - (item.qty_process || 0);
                                        return (
                                            <tr key={i}>
                                                <td style={printTd}>{i + 1}</td>
                                                <td style={printTd}>{item.do_number || '-'}</td>
                                                <td style={printTd}>{item.sku}</td>
                                                <td style={printTd}>{item.deskripsi || '-'}</td>
                                                <td style={printTd}>{item.qty_actual}</td>
                                                <td style={printTd}>{item.qty_process}</td>
                                                <td style={{
                                                    ...printTd,
                                                    color: diff === 0 ? '#888' : diff < 0 ? '#dc2626' : '#16a34a',
                                                    fontWeight: 600,
                                                }}>{diff}</td>
                                                <td style={printTd}>{item.case_type || '-'}</td>
                                                <td style={printTd}>{item.operator || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {previewDoc.notes && (
                                <div style={{ margin: '12px 0', padding: 8, border: '1px solid #ccc' }}>
                                    <strong>Catatan:</strong> {previewDoc.notes}
                                </div>
                            )}

                            {/* Signatures */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48 }}>
                                <div style={{ width: '40%', textAlign: 'center' }}>
                                    <div style={{
                                        fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase',
                                    }}>Pembuat</div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>
                                        {previewDoc.pembuat || previewDoc.checker}
                                    </div>
                                </div>
                                <div style={{ width: '40%', textAlign: 'center' }}>
                                    <div style={{
                                        fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase',
                                    }}>Warehouse Supervisor</div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>
                                        Evan Budi Setiawan Pasaribu
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="print-footer" style={{
                            marginTop: 'auto', paddingTop: 12, borderTop: '1.5px solid #d0d0d0',
                            textAlign: 'left', fontSize: 9, color: '#888', lineHeight: 1.6, letterSpacing: 0.3,
                        }}>
                            <div style={{
                                fontWeight: 700, fontSize: 10, color: '#555', marginBottom: 2,
                                textTransform: 'uppercase', letterSpacing: 1.5,
                            }}>
                                PT. Global Jet Ecommerce
                            </div>
                            <div>Landmark Pluit Tower B2, 7th Floor, Pluit, Penjaringan – Jakarta Utara</div>
                            <div>DKI Jakarta, 14450</div>
                            <div style={{ marginTop: 6, fontSize: 8, color: '#aaa' }}>
                                Printed: {dayjs().format('DD/MM/YYYY HH:mm')}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
