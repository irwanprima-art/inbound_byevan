import { useState, useEffect, useCallback } from 'react';
import { LOGO_BASE64 } from '../assets/logoBase64';
import {
    Button, Table, Typography, Space, message, Modal, Popover, Badge, Input,
    ConfigProvider, theme,
} from 'antd';
import {
    PrinterOutlined, ReloadOutlined, SearchOutlined, EyeOutlined,
} from '@ant-design/icons';
import { publicApi } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const DOC_TYPES_INBOUND = new Set([
    'Pemberitahuan Barang Kurang', 'Penolakan Barang',
    'Pemberitahuan Barang Lebih', 'Pengembalian Barang',
]);

interface SkuItem {
    sku: string; serial_number: string; qty: number;
    qty_po: number; qty_actual: number; note: string;
}

function getWarehouseFromDoc(doc: any): string {
    if (doc.warehouse) return doc.warehouse;
    const dn = doc.doc_number || '';
    if (dn.includes('/WH-JC-02/')) return 'WH-JC-02';
    return 'WH-JC';
}

export default function PublicBeritaAcaraPage() {
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [previewDoc, setPreviewDoc] = useState<any>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await publicApi.beritaAcaraList();
            const data = (res.data || []).filter((d: any) => DOC_TYPES_INBOUND.has(d.doc_type));
            data.sort((a: any, b: any) => b.id - a.id);
            setDocs(data);
        } catch { message.error('Gagal memuat data'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleView = (record: any) => {
        let parsedItems: SkuItem[] = [];
        try { parsedItems = JSON.parse(record.items || '[]'); } catch { parsedItems = []; }
        setPreviewDoc({ ...record, items: parsedItems });
        setPreviewOpen(true);
    };

    const handlePrint = async () => {
        const printContent = document.getElementById('public-ba-print');
        if (!printContent) return;
        const html = printContent.innerHTML;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Berita Acara</title>
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

    const searchTerms = search.split('\n').map(t => t.trim().toLowerCase()).filter(Boolean);
    const filteredDocs = docs.filter(d => {
        if (searchTerms.length === 0) return true;
        return searchTerms.some(q =>
            (d.doc_number || '').toLowerCase().includes(q)
            || (d.doc_type || '').toLowerCase().includes(q)
            || (d.checker || '').toLowerCase().includes(q)
            || (d.kepada || '').toLowerCase().includes(q)
        );
    });

    const columns = [
        {
            title: 'No. Dokumen', dataIndex: 'doc_number', key: 'doc_number', width: 220,
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
        {
            title: 'Aksi', key: 'actions', width: 80, fixed: 'right' as const,
            render: (_: any, r: any) => (
                <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleView(r)} />
            ),
        },
    ];

    const docForPreview = previewDoc;

    const printTh: React.CSSProperties = {
        border: '1px solid #333', padding: '6px 10px', textAlign: 'left',
        background: '#eee', fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
    };
    const printTd: React.CSSProperties = {
        border: '1px solid #333', padding: '6px 10px', textAlign: 'left',
    };

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#6366f1', borderRadius: 8, fontFamily: "'Inter', sans-serif", colorBgContainer: '#1a1f3a', colorBgElevated: '#1e2340', colorBorder: 'rgba(255,255,255,0.08)', colorText: 'rgba(255,255,255,0.85)' }, components: { Table: { headerBg: '#0d1117', headerColor: 'rgba(255,255,255,0.7)', rowHoverBg: 'rgba(99,102,241,0.08)', borderColor: 'rgba(255,255,255,0.06)' }, Modal: { contentBg: '#1e2340', headerBg: '#1e2340' } } }}>
            <div style={{ background: '#0d1117', minHeight: '100vh', padding: 24 }}>
                <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Title level={4} style={{ margin: 0, color: '#fff' }}>📄 Berita Acara — Inbound</Title>
                        <Space>
                            <Popover trigger="click" placement="bottomRight" content={<div style={{ width: 280 }}><div style={{ marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Masukkan keyword (satu per baris)</div><Input.TextArea value={search} onChange={e => setSearch(e.target.value)} placeholder={"Keyword 1\nKeyword 2"} autoSize={{ minRows: 3, maxRows: 8 }} style={{ marginBottom: 8 }} /><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{searchTerms.length > 0 ? `${searchTerms.length} keyword aktif` : 'Tidak ada filter'}</span>{search && <Button size="small" danger onClick={() => setSearch('')}>Clear</Button>}</div></div>}><Badge count={searchTerms.length} size="small" offset={[-4, 4]}><Button icon={<SearchOutlined />}>{searchTerms.length > 0 ? `Search (${searchTerms.length})` : 'Search'}</Button></Badge></Popover>
                            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
                        </Space>
                    </div>
                    <Table
                        dataSource={filteredDocs}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        size="small"
                        scroll={{ x: 1000 }}
                        pagination={{ pageSize: 20, showTotal: (t) => `${t} dokumen` }}
                    />
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Warehouse Report & Monitoring System</Text>
                    </div>
                </div>

                {/* Preview Modal */}
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
                    {docForPreview && (() => {
                        const wh = getWarehouseFromDoc(docForPreview);
                        const isJC02 = wh === 'WH-JC-02';
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
                                <thead>
                                    <tr>
                                        <th style={printTh}>No</th>
                                        <th style={printTh}>SKU</th>
                                        {docForPreview.doc_type === 'Pemberitahuan Barang Kurang' ? (
                                            <><th style={printTh}>Qty PO</th><th style={printTh}>Qty Actual</th></>
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
                                                <><td style={printTd}>{item.qty_po ?? '-'}</td><td style={printTd}>{item.qty_actual ?? '-'}</td></>
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
                                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>{isJC02 ? 'PIC' : 'Supervisor'}</div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>{isJC02 ? (docForPreview.pic_name || '') : 'Evan Budi Setiawan Pasaribu'}</div>
                                </div>
                                <div style={{ width: '30%', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 60, textTransform: 'uppercase' }}>Driver</div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontWeight: 600 }}>&nbsp;</div>
                                </div>
                            </div>
                        </div>

                        <div className="print-footer" style={{
                            marginTop: 'auto', paddingTop: 12, borderTop: '1.5px solid #d0d0d0',
                            textAlign: 'left', fontSize: 9, color: '#888', lineHeight: 1.6, letterSpacing: 0.3,
                        }}>
                            <div style={{ fontWeight: 700, fontSize: 10, color: '#555', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                PT. Global Jet Ecommerce
                            </div>
                            <div>Landmark Pluit Tower B2, 7th Floor, Pluit, Penjaringan – Jakarta Utara</div>
                            <div>DKI Jakarta, 14450</div>
                            <div style={{ marginTop: 6, fontSize: 8, color: '#aaa' }}>Printed: {dayjs().format('DD/MM/YYYY HH:mm')}</div>
                        </div>
                    </div>
                        );
                    })()}
                </Modal>
            </div>
        </ConfigProvider>
    );
}
