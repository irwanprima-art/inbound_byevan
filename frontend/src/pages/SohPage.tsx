import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form, Input, InputNumber, Table, Button, Modal, Space, Popconfirm, Upload, Tag, message, DatePicker, Select } from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, UploadOutlined, DownloadOutlined, SearchOutlined, ClearOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { sohApi, locationsApi } from '../api/client';
import { downloadCsvTemplate, normalizeDate } from '../utils/csvTemplate';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

// Helper: parse date string — backend returns consistent YYYY-MM-DD via FlexDate
const parseDate = (dateStr: string): dayjs.Dayjs | null => {
    if (!dateStr) return null;
    const d = dayjs(dateStr);
    return d.isValid() ? d : null;
};

// Auto-calculate: Week (e.g., "Week 1 Feb", "Week 2 Mar")
const calcWeek = (dateStr: string): string => {
    const d = parseDate(dateStr);
    if (!d) return '-';
    const day = d.date();
    const weekNum = Math.ceil(day / 7);
    const monthName = d.format('MMM');
    return `Week ${weekNum} ${monthName}`;
};

// Auto-calculate: ED Note based on (Exp Date - Update Date) remaining days
const calcEdNote = (expDateStr: string, updateDateStr: string): string => {
    if (!expDateStr || !expDateStr.trim()) return 'No Expiry Date';
    const expDate = parseDate(expDateStr);
    if (!expDate) return 'No Expiry Date';
    const refDate = parseDate(updateDateStr) || dayjs();
    const diffDays = expDate.diff(refDate, 'day');
    if (diffDays < 0) return 'Expired';
    if (diffDays <= 30) return 'NED 1 Month';
    if (diffDays <= 60) return 'NED 2 Month';
    if (diffDays <= 90) return 'NED 3 Month';
    if (diffDays <= 180) return '3 - 6 Month';
    if (diffDays <= 365) return '6 - 12 Month';
    return '1yr++';
};

// Auto-calculate: Aging Note based on WH Arrival Date quarter
const calcAgingNote = (whArrivalStr: string): string => {
    const d = parseDate(whArrivalStr);
    if (!d) return '-';
    const year = d.year();
    const month = d.month() + 1;
    if (year < 2025) return 'Under 2025';
    const quarter = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4';
    return `${quarter} ${year}`;
};

// ED Note color mapping
const edNoteColor = (note: string): string => {
    if (note === 'Expired') return 'red';
    if (note === 'NED 1 Month') return 'volcano';
    if (note === 'NED 2 Month') return 'orange';
    if (note === 'NED 3 Month') return 'gold';
    if (note === '3 - 6 Month') return 'lime';
    if (note === '6 - 12 Month') return 'green';
    if (note === '1yr++') return 'cyan';
    if (note === 'No Expiry Date') return 'purple';
    return 'default';
};

interface SohRecord {
    id: number;
    location: string;
    location_category: string;
    sku: string;
    sku_category: string;
    brand: string;
    zone: string;
    location_type: string;
    owner: string;
    status: string;
    qty: number;
    wh_arrival_date: string;
    receipt_no: string;
    mfg_date: string;
    exp_date: string;
    batch_no: string;
    update_date: string;
}

export default function SohPage() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<SohRecord[]>([]);
    const [locCategoryMap, setLocCategoryMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState<SohRecord | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [filterEdNote, setFilterEdNote] = useState<string[]>(() => {
        const v = searchParams.get('edNote');
        return v ? v.split(',') : [];
    });
    const [filterLocCategory, setFilterLocCategory] = useState<string[]>(() => {
        const v = searchParams.get('locCategory');
        return v ? v.split(',') : [];
    });
    const [filterBrand, setFilterBrand] = useState<string[]>(() => {
        const v = searchParams.get('brand');
        return v ? v.split(',') : [];
    });
    const [filterAgingNote, setFilterAgingNote] = useState<string[]>(() => {
        const v = searchParams.get('agingNote');
        return v ? v.split(',') : [];
    });
    const [form] = Form.useForm();

    const isKeyAccount = user?.role === 'key_account';
    const canDelete = !isKeyAccount && (user?.role === 'admin' || user?.role === 'supervisor');
    const canEdit = !isKeyAccount && user?.role !== 'admin_inventory';
    const isSupervisor = user?.role === 'supervisor';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [sohRes, locRes] = await Promise.all([sohApi.list(), locationsApi.list()]);
            const sohData = (sohRes.data || []) as SohRecord[];
            setData(sohData);
            // Build location -> location_category map from Master Location
            const map: Record<string, string> = {};
            ((locRes.data || []) as any[]).forEach((loc: any) => {
                if (loc.location && loc.location_category) {
                    map[loc.location] = loc.location_category;
                }
            });
            setLocCategoryMap(map);
            // Normalize brand filter from URL (dashboard sends UPPERCASED brands)
            if (filterBrand.length > 0) {
                const allBrands = [...new Set(sohData.map(r => r.brand).filter(Boolean))];
                const normalized = filterBrand.map(fb => {
                    const match = allBrands.find(b => b.toUpperCase() === fb.toUpperCase());
                    return match || fb;
                });
                if (JSON.stringify(normalized) !== JSON.stringify(filterBrand)) {
                    setFilterBrand(normalized);
                }
            }
        } catch { message.error('Gagal memuat data'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAdd = () => { setEditRecord(null); form.resetFields(); setModalOpen(true); };
    const handleEdit = (r: SohRecord) => { setEditRecord(r); form.setFieldsValue(r); setModalOpen(true); };
    const handleSave = async () => {
        const vals = await form.validateFields();
        try {
            if (editRecord) { await sohApi.update(editRecord.id, vals); message.success('Data diupdate'); }
            else { await sohApi.create(vals); message.success('Data ditambah'); }
            setModalOpen(false); fetchData();
        } catch { message.error('Gagal menyimpan'); }
    };
    const handleDelete = async (id: number) => {
        try { await sohApi.remove(id); message.success('Dihapus'); fetchData(); }
        catch { message.error('Gagal menghapus'); }
    };
    const handleBulkDelete = async () => {
        try { await sohApi.bulkDelete(selectedKeys); message.success(`${selectedKeys.length} data dihapus`); setSelectedKeys([]); fetchData(); }
        catch { message.error('Gagal menghapus'); }
    };

    const handleClearAll = () => {
        Modal.confirm({
            title: '⚠️ Clear All Data',
            content: `Apakah Anda yakin ingin menghapus SEMUA ${data.length} data Stock on Hand? Tindakan ini tidak bisa dibatalkan!`,
            okText: 'Ya, Hapus Semua',
            okType: 'danger',
            cancelText: 'Batal',
            onOk: async () => {
                try {
                    await sohApi.sync([]);
                    message.success('Semua data Stock on Hand berhasil dihapus');
                    setSelectedKeys([]);
                    fetchData();
                } catch { message.error('Gagal menghapus semua data'); }
            },
        });
    };

    // CSV helpers
    const parseCsvLine = (line: string): string[] => {
        const cells: string[] = []; let current = ''; let inQuotes = false;
        for (const ch of line) {
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; continue; }
            current += ch;
        }
        cells.push(current.trim()); return cells;
    };
    const normalizeHeader = (h: string): string => h.toLowerCase().replace(/[#.%]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const colMap: Record<string, string> = {
        'Location Category': 'location_category', 'location_category': 'location_category',
        'SKU Category': 'sku_category', 'sku_category': 'sku_category',
        'Location Type': 'location_type', 'location_type': 'location_type',
        'WH Arrival Date': 'wh_arrival_date', 'wh_arrival_date': 'wh_arrival_date', 'wh arrival date': 'wh_arrival_date',
        'Receipt#': 'receipt_no', 'receipt_no': 'receipt_no', 'receipt': 'receipt_no',
        'Mfg. Date': 'mfg_date', 'mfg_date': 'mfg_date', 'mfg date': 'mfg_date',
        'Exp. Date': 'exp_date', 'exp_date': 'exp_date', 'exp date': 'exp_date',
        'Batch#': 'batch_no', 'batch_no': 'batch_no', 'batch': 'batch_no',
        'Update Date': 'update_date', 'update_date': 'update_date',
    };
    const numFields = new Set(['qty']);

    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { message.warning('CSV kosong'); return; }
            const headers = parseCsvLine(lines[0]);
            const fieldMap: { index: number; field: string }[] = [];
            headers.forEach((h, i) => {
                const n = normalizeHeader(h);
                const mapped = colMap[h] || colMap[n] || n;
                if (mapped && mapped !== 'id') fieldMap.push({ index: i, field: mapped });
            });
            const rows = lines.slice(1).map(l => parseCsvLine(l));
            const parsed = rows.map(cells => {
                const obj: Record<string, unknown> = {};
                fieldMap.forEach(({ index, field }) => {
                    const val = cells[index] ?? '';
                    if (numFields.has(field)) {
                        obj[field] = parseInt(val) || 0;
                    } else if (field.includes('date')) {
                        obj[field] = normalizeDate(val);
                    } else {
                        obj[field] = val;
                    }
                });
                return obj;
            }).filter(obj => Object.values(obj).some(v => v !== '' && v !== 0));
            if (!parsed.length) { message.warning('Tidak ada data'); return; }
            const CHUNK = 1000; let imported = 0;
            const hide = message.loading(`Importing... 0/${parsed.length}`, 0);
            try {
                for (let i = 0; i < parsed.length; i += CHUNK) {
                    const chunk = parsed.slice(i, i + CHUNK);
                    await sohApi.batchImport(chunk);
                    imported += chunk.length; hide();
                    if (i + CHUNK < parsed.length) message.loading(`Importing... ${imported}/${parsed.length}`, 0);
                }
                message.success(`✅ ${imported} data diimport`); fetchData();
            } catch { hide(); message.error(`Gagal import (${imported}/${parsed.length})`); if (imported > 0) fetchData(); }
        };
        reader.readAsText(file); return false;
    };

    const handleExport = () => {
        const hdr = ['location', 'location_category', 'sku', 'sku_category', 'brand', 'zone', 'location_type', 'owner', 'status', 'qty', 'wh_arrival_date', 'receipt_no', 'mfg_date', 'exp_date', 'batch_no', 'update_date', 'week', 'ed_note', 'aging_note'];
        const rows = filteredData.map(r => [
            r.location, locCategoryMap[r.location] || r.location_category || '', r.sku, r.sku_category, r.brand, r.zone,
            r.location_type, r.owner, r.status, r.qty, r.wh_arrival_date, r.receipt_no, r.mfg_date, r.exp_date, r.batch_no, r.update_date,
            calcWeek(r.update_date || r.wh_arrival_date), calcEdNote(r.exp_date, r.update_date), calcAgingNote(r.wh_arrival_date),
        ].map(v => `"${v}"`).join(','));
        const blob = new Blob([hdr.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'stock_on_hand.csv'; a.click();
    };

    const filteredData = data.filter(r => {
        if (dateRange) {
            const d = dayjs(r.update_date);
            if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false;
        }
        if (filterEdNote.length > 0) {
            const note = calcEdNote(r.exp_date, r.update_date);
            if (!filterEdNote.includes(note)) return false;
        }
        if (filterLocCategory.length > 0) {
            const cat = locCategoryMap[r.location] || r.location_category || '';
            if (!filterLocCategory.includes(cat)) return false;
        }
        if (filterBrand.length > 0) {
            const brandUpper = (r.brand || '').toUpperCase();
            if (!filterBrand.some(fb => fb.toUpperCase() === brandUpper)) return false;
        }
        if (filterAgingNote.length > 0) {
            const note = calcAgingNote(r.wh_arrival_date);
            if (!filterAgingNote.includes(note)) return false;
        }
        if (!search) return true;
        return Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
    });

    // Compute unique filter options from ALL data (not filtered)
    const edNoteOptions = [...new Set(data.map(r => calcEdNote(r.exp_date, r.update_date)))].sort().map(v => ({ label: v, value: v }));
    const locCategoryOptions = [...new Set(data.map(r => locCategoryMap[r.location] || r.location_category || '').filter(Boolean))].sort().map(v => ({ label: v, value: v }));
    const brandOptions = [...new Set(data.map(r => r.brand).filter(Boolean))].sort().map(v => ({ label: v, value: v }));
    const agingNoteOptions = [...new Set(data.map(r => calcAgingNote(r.wh_arrival_date)).filter(v => v !== '-'))].sort().map(v => ({ label: v, value: v }));

    const columns: any[] = [
        { title: 'Location', dataIndex: 'location', key: 'location', width: 100 },
        {
            title: 'Location Category', key: 'location_category', width: 130,
            render: (_: any, r: any) => locCategoryMap[r.location] || r.location_category || '-',
        },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
        { title: 'SKU Category', dataIndex: 'sku_category', key: 'sku_category', width: 110 },
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 90 },
        { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 70 },
        { title: 'Location Type', dataIndex: 'location_type', key: 'location_type', width: 110 },
        { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 90 },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 80 },
        { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 70, sorter: (a: any, b: any) => a.qty - b.qty },
        { title: 'WH Arrival Date', dataIndex: 'wh_arrival_date', key: 'wh_arrival_date', width: 120, sorter: (a: any, b: any) => a.wh_arrival_date?.localeCompare(b.wh_arrival_date) },
        { title: 'Receipt#', dataIndex: 'receipt_no', key: 'receipt_no', width: 110 },
        { title: 'Mfg. Date', dataIndex: 'mfg_date', key: 'mfg_date', width: 100 },
        { title: 'Exp. Date', dataIndex: 'exp_date', key: 'exp_date', width: 100 },
        { title: 'Batch#', dataIndex: 'batch_no', key: 'batch_no', width: 100 },
        { title: 'Update Date', dataIndex: 'update_date', key: 'update_date', width: 110 },
        { title: 'Week', key: 'week', width: 110, render: (_: any, r: any) => calcWeek(r.update_date || r.wh_arrival_date) },
        {
            title: 'ED Note', key: 'ed_note', width: 140,
            render: (_: any, r: any) => {
                const note = calcEdNote(r.exp_date, r.update_date);
                return note !== '-' ? <Tag color={edNoteColor(note)}>{note}</Tag> : '-';
            },
        },
        {
            title: 'Aging Note', key: 'aging_note', width: 100,
            render: (_: any, r: any) => {
                const note = calcAgingNote(r.wh_arrival_date);
                return note !== '-' ? <Tag color="blue">{note}</Tag> : '-';
            },
        },
        ...(canEdit ? [{
            title: 'Actions', key: 'actions', width: 90, fixed: 'right' as const,
            render: (_: any, r: SohRecord) => (
                <Space size="small">
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                    {canDelete && (
                        <Popconfirm title="Hapus?" onConfirm={() => handleDelete(r.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        }] : []),
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Stock on Hand</h2>
                <Space wrap>
                    <DatePicker.RangePicker
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                        format="DD/MM/YYYY"
                        placeholder={['Dari Tanggal', 'Sampai Tanggal']}
                        allowClear
                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}
                    />
                    <Button size="small" onClick={() => { const now = dayjs(); setDateRange([now.startOf('month'), now.endOf('month')]); }}>Bulan Ini</Button>
                    <Button size="small" onClick={() => { const prev = dayjs().subtract(1, 'month'); setDateRange([prev.startOf('month'), prev.endOf('month')]); }}>Bulan Lalu</Button>
                    {dateRange && <Button size="small" danger onClick={() => setDateRange(null)}>Reset</Button>}
                    <Input placeholder="Search..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} allowClear />
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
                    {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Tambah</Button>}
                    {canEdit && (
                        <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport}><Button icon={<UploadOutlined />}>Import</Button></Upload>
                    )}
                    <Button icon={<DownloadOutlined />} onClick={() => downloadCsvTemplate(['location', 'sku', 'sku_category', 'brand', 'zone', 'location_type', 'owner', 'status', 'qty', 'wh_arrival_date', 'receipt_no', 'mfg_date', 'exp_date', 'batch_no', 'update_date'], 'SOH_template')}>Template</Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                    {canDelete && selectedKeys.length > 0 && (
                        <Popconfirm title={`Hapus ${selectedKeys.length} data?`} onConfirm={handleBulkDelete}>
                            <Button danger icon={<DeleteOutlined />}>Hapus ({selectedKeys.length})</Button>
                        </Popconfirm>
                    )}
                    {isSupervisor && data.length > 0 && (
                        <Button danger icon={<ClearOutlined />} onClick={handleClearAll}>Clear All</Button>
                    )}
                </Space>
            </div>
            {/* Filter row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <Select
                    mode="multiple" allowClear placeholder="Filter ED Note" options={edNoteOptions}
                    value={filterEdNote} onChange={setFilterEdNote}
                    style={{ minWidth: 180, flex: 1 }} maxTagCount="responsive"
                />
                <Select
                    mode="multiple" allowClear placeholder="Filter Location Category" options={locCategoryOptions}
                    value={filterLocCategory} onChange={setFilterLocCategory}
                    style={{ minWidth: 180, flex: 1 }} maxTagCount="responsive"
                />
                <Select
                    mode="multiple" allowClear placeholder="Filter Brand" options={brandOptions}
                    value={filterBrand} onChange={setFilterBrand}
                    style={{ minWidth: 180, flex: 1 }} maxTagCount="responsive"
                />
                <Select
                    mode="multiple" allowClear placeholder="Filter Aging Note" options={agingNoteOptions}
                    value={filterAgingNote} onChange={setFilterAgingNote}
                    style={{ minWidth: 180, flex: 1 }} maxTagCount="responsive"
                />
                {(filterEdNote.length > 0 || filterLocCategory.length > 0 || filterBrand.length > 0 || filterAgingNote.length > 0) && (
                    <Button size="small" danger onClick={() => { setFilterEdNote([]); setFilterLocCategory([]); setFilterBrand([]); setFilterAgingNote([]); }}>Reset Filter</Button>
                )}
            </div>
            <Table
                rowKey="id" columns={columns} dataSource={filteredData} loading={loading} size="small"
                scroll={{ x: 2200, y: 'calc(100vh - 280px)' }}
                pagination={{ pageSize: 50, showTotal: (t) => `Total: ${t}`, showSizeChanger: true }}
                rowSelection={canDelete ? { selectedRowKeys: selectedKeys, onChange: (keys) => setSelectedKeys(keys as number[]) } : undefined}
            />
            <Modal title={editRecord ? 'Edit Stock' : 'Tambah Stock'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)}>
                <Form form={form} layout="vertical">
                    <Form.Item name="location" label="Location"><Input /></Form.Item>
                    <Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="sku_category" label="SKU Category"><Input /></Form.Item>
                    <Form.Item name="brand" label="Brand"><Input /></Form.Item>
                    <Form.Item name="zone" label="Zone"><Input /></Form.Item>
                    <Form.Item name="location_type" label="Location Type"><Input /></Form.Item>
                    <Form.Item name="owner" label="Owner"><Input /></Form.Item>
                    <Form.Item name="status" label="Status"><Input /></Form.Item>
                    <Form.Item name="qty" label="Qty"><InputNumber style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="wh_arrival_date" label="WH Arrival Date"><Input placeholder="M/D/YYYY" /></Form.Item>
                    <Form.Item name="receipt_no" label="Receipt#"><Input /></Form.Item>
                    <Form.Item name="mfg_date" label="Mfg. Date"><Input placeholder="M/D/YYYY" /></Form.Item>
                    <Form.Item name="exp_date" label="Exp. Date"><Input placeholder="M/D/YYYY" /></Form.Item>
                    <Form.Item name="batch_no" label="Batch#"><Input /></Form.Item>
                    <Form.Item name="update_date" label="Update Date"><Input placeholder="M/D/YYYY" /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
