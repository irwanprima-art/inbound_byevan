import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Table, Button, Input, Space, Modal, Form, InputNumber, Tag, message, Popconfirm, Upload, DatePicker } from 'antd';
import {
    PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined,
    DownloadOutlined, UploadOutlined, ReloadOutlined, ClearOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { returnReceivesApi, returnTransactionsApi } from '../api/client';
import { normalizeDate, downloadCsvTemplate } from '../utils/csvTemplate';

export default function ReturnReceivePage() {
    const { user } = useAuth();
    const isSupervisor = user?.role === 'supervisor';
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<any[]>([]);
    const [transData, setTransData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [form] = Form.useForm();
    const editRecord = useRef<any>(null);

    // Fetch return receives + return transactions
    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [rRes, tRes] = await Promise.all([returnReceivesApi.list(), returnTransactionsApi.list()]);
            const receives = rRes.data || [];
            receives.sort((a: any, b: any) => b.id - a.id);
            setData(receives);
            setTransData(tRes.data || []);
        } catch {
            if (!silent) message.error('Gagal memuat data');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const interval = setInterval(() => { fetchAll(true); }, 60000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    // Build lookup from return transactions: receipt_no → { firstReceiveTime, lastPutawayTime }
    const txLookup = useMemo(() => {
        const map: Record<string, { firstReceiveTime: string | null; lastPutawayTime: string | null }> = {};
        transData.forEach((tx: any) => {
            const key = (tx.receipt_no || '').trim().toLowerCase();
            if (!key) return;
            if (!map[key]) map[key] = { firstReceiveTime: null, lastPutawayTime: null };
            const type = (tx.operate_type || '').trim().toLowerCase();
            const txTime = tx.time_transaction || '';
            if (type === 'receive' || type === 'receiving') {
                if (txTime && (!map[key].firstReceiveTime || txTime < map[key].firstReceiveTime!)) {
                    map[key].firstReceiveTime = txTime;
                }
            } else if (type === 'putaway') {
                if (txTime && (!map[key].lastPutawayTime || txTime > map[key].lastPutawayTime!)) {
                    map[key].lastPutawayTime = txTime;
                }
            }
        });
        return map;
    }, [transData]);

    // Enriched data with First Receive and Last Putaway
    const enrichedData = useMemo(() => {
        return data.map((row: any) => {
            const key = (row.receipt_no || '').trim().toLowerCase();
            const tx = txLookup[key] || { firstReceiveTime: null, lastPutawayTime: null };
            return {
                ...row,
                first_receive: tx.firstReceiveTime || '-',
                last_putaway: tx.lastPutawayTime || '-',
            };
        });
    }, [data, txLookup]);

    // Filter by date range and search
    const filteredData = useMemo(() => {
        let result = enrichedData;
        if (dateRange) {
            result = result.filter((d: any) => {
                const dd = dayjs(d.return_date || d.receive_date);
                if (!dd.isValid()) return true;
                return !dd.isBefore(dateRange[0], 'day') && !dd.isAfter(dateRange[1], 'day');
            });
        }
        const q = search.toLowerCase();
        if (!q) return result;
        return result.filter((d: any) =>
            Object.values(d).some(v => String(v).toLowerCase().includes(q))
        );
    }, [enrichedData, dateRange, search]);

    const columns = [
        { title: 'Return Date', dataIndex: 'return_date', key: 'return_date', width: 110, sorter: (a: any, b: any) => (a.return_date || '').localeCompare(b.return_date || '') },
        { title: 'Receive Date', dataIndex: 'receive_date', key: 'receive_date', width: 110 },
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
        { title: 'Receipt No', dataIndex: 'receipt_no', key: 'receipt_no', width: 140 },
        { title: 'Ref#', dataIndex: 'ref_no', key: 'ref_no', width: 130 },
        { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 100 },
        { title: 'Arrival Date', dataIndex: 'arrival_date', key: 'arrival_date', width: 110 },
        { title: 'Tracking#', dataIndex: 'tracking_no', key: 'tracking_no', width: 140 },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 140 },
        {
            title: 'Stock Status', dataIndex: 'stock_status', key: 'stock_status', width: 110,
            render: (v: string) => {
                if (!v) return '-';
                const color = v.toLowerCase().includes('good') ? 'green' : v.toLowerCase().includes('damage') ? 'red' : 'default';
                return <Tag color={color}>{v}</Tag>;
            },
        },
        { title: 'Return Qty', dataIndex: 'return_qty', key: 'return_qty', width: 90, sorter: (a: any, b: any) => a.return_qty - b.return_qty },
        { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 110 },
        { title: 'Return Reason', dataIndex: 'return_reason', key: 'return_reason', width: 150 },
        { title: 'Reason Group', dataIndex: 'reason_group', key: 'reason_group', width: 120 },
        {
            title: 'First Receive', dataIndex: 'first_receive', key: 'first_receive', width: 160,
            render: (v: string) => <span style={{ color: v === '-' ? 'rgba(255,255,255,0.3)' : '#60a5fa' }}>{v}</span>,
        },
        {
            title: 'Last Putaway', dataIndex: 'last_putaway', key: 'last_putaway', width: 160,
            render: (v: string) => <span style={{ color: v === '-' ? 'rgba(255,255,255,0.3)' : '#a78bfa' }}>{v}</span>,
        },
        {
            title: 'Aksi', key: 'action', width: 100, fixed: 'right' as const,
            render: (_: any, r: any) => (
                <Space size="small">
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                    <Popconfirm title="Hapus?" onConfirm={() => handleDelete(r.id)}>
                        <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Add / Edit
    const handleAdd = () => { editRecord.current = null; setEditId(null); form.resetFields(); setModalOpen(true); };
    const handleEdit = (record: any) => {
        editRecord.current = record;
        setEditId(record.id);
        setModalOpen(true);
    };

    useEffect(() => {
        if (modalOpen) {
            if (editRecord.current) {
                const rec = { ...editRecord.current };
                rec.return_date = rec.return_date && rec.return_date !== '-' ? (dayjs(rec.return_date).isValid() ? dayjs(rec.return_date) : null) : null;
                rec.receive_date = rec.receive_date && rec.receive_date !== '-' ? (dayjs(rec.receive_date).isValid() ? dayjs(rec.receive_date) : null) : null;
                rec.arrival_date = rec.arrival_date && rec.arrival_date !== '-' ? (dayjs(rec.arrival_date).isValid() ? dayjs(rec.arrival_date) : null) : null;
                form.setFieldsValue(rec);
            } else {
                form.resetFields();
            }
        }
    }, [modalOpen, form]);

    const handleSave = async () => {
        try {
            const vals = await form.validateFields();
            const toDateStr = (v: any, fmt: string) => v && typeof v === 'object' && v.format ? v.format(fmt) : (v || '');
            vals.return_date = toDateStr(vals.return_date, 'YYYY-MM-DD');
            vals.receive_date = toDateStr(vals.receive_date, 'YYYY-MM-DD');
            vals.arrival_date = toDateStr(vals.arrival_date, 'YYYY-MM-DD');
            if (editId) {
                await returnReceivesApi.update(editId, vals);
                message.success('Data diupdate');
            } else {
                await returnReceivesApi.create(vals);
                message.success('Data ditambahkan');
            }
            setModalOpen(false);
            fetchAll();
        } catch (err: any) {
            if (err.response) message.error('Error: ' + (err.response?.data?.error || 'Unknown'));
        }
    };

    const handleDelete = async (id: number) => { await returnReceivesApi.remove(id); message.success('Data dihapus'); fetchAll(); };

    const handleBulkDelete = async () => {
        await returnReceivesApi.bulkDelete(selectedKeys as number[]);
        message.success(`${selectedKeys.length} data dihapus`);
        setSelectedKeys([]);
        fetchAll();
    };

    const handleClearAll = () => {
        Modal.confirm({
            title: '⚠️ Clear All Data',
            content: `Apakah Anda yakin ingin menghapus SEMUA ${data.length} data Return Receive? Tindakan ini tidak bisa dibatalkan!`,
            okText: 'Ya, Hapus Semua', okType: 'danger', cancelText: 'Batal',
            onOk: async () => {
                try {
                    await returnReceivesApi.sync([]);
                    message.success('Semua data Return Receive berhasil dihapus');
                    setSelectedKeys([]);
                    fetchAll();
                } catch { message.error('Gagal menghapus semua data'); }
            },
        });
    };

    // CSV Export — all columns including auto-calculated
    const handleExport = () => {
        const headers = ['return_date', 'receive_date', 'brand', 'receipt_no', 'ref_no', 'owner', 'arrival_date', 'tracking_no', 'sku', 'stock_status', 'return_qty', 'operator', 'return_reason', 'reason_group', 'first_receive', 'last_putaway'];
        const csv = '\uFEFF' + headers.join(',') + '\n' +
            filteredData.map((r: any) => headers.map(h => `"${r[h] ?? ''}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Return_Receive_${dayjs().format('YYYY-MM-DD')}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    // CSV Import
    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
            if (lines.length < 2) { message.warning('CSV kosong'); return; }
            const headerLine = lines[0].replace(/^\uFEFF/, '');
            const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/#/g, '_no'));
            const colIdx = (name: string) => headers.findIndex(h => h === name || h.includes(name));

            const rows = lines.slice(1).map(line => {
                const cells = line.match(/(".*?"|[^,]*)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
                const get = (name: string, fallback = '') => { const i = colIdx(name); return i >= 0 && cells[i] ? cells[i] : fallback; };
                return {
                    return_date: normalizeDate(get('return_date')),
                    receive_date: normalizeDate(get('receive_date')),
                    brand: get('brand'),
                    receipt_no: get('receipt_no'),
                    ref_no: get('ref_no') || get('ref'),
                    owner: get('owner'),
                    arrival_date: normalizeDate(get('arrival_date')),
                    tracking_no: get('tracking_no') || get('tracking'),
                    sku: get('sku'),
                    stock_status: get('stock_status'),
                    return_qty: parseInt(get('return_qty', '0')) || 0,
                    operator: get('operator'),
                    return_reason: get('return_reason'),
                    reason_group: get('reason_group'),
                };
            }).filter(obj => Object.values(obj).some(v => v !== '' && v !== 0 && v != null));

            if (rows.length === 0) { message.warning('Tidak ada data valid'); return; }
            try {
                const CHUNK = 1000;
                const hide = message.loading(`Importing... 0/${rows.length}`, 0);
                let processed = 0;
                for (let i = 0; i < rows.length; i += CHUNK) {
                    await returnReceivesApi.batchImport(rows.slice(i, i + CHUNK));
                    processed += Math.min(CHUNK, rows.length - i);
                    hide();
                    if (processed < rows.length) message.loading(`Importing... ${processed}/${rows.length}`, 0);
                }
                hide();
                message.success(`✅ ${rows.length} data berhasil diimport`);
                fetchAll();
            } catch {
                message.error('Import gagal');
            }
        };
        reader.readAsText(file);
        return false;
    };

    // Template headers — only manual fields (no auto-calculated)
    const templateHeaders = ['return_date', 'receive_date', 'brand', 'receipt_no', 'ref_no', 'owner', 'arrival_date', 'tracking_no', 'sku', 'stock_status', 'return_qty', 'operator', 'return_reason', 'reason_group'];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, color: '#fff' }}>Return Receive</h2>
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
                    <Input placeholder="Search..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ width: 200 }} />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchAll()}>Refresh</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Tambah</Button>
                    <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport as any}>
                        <Button icon={<UploadOutlined />}>Import</Button>
                    </Upload>
                    <Button icon={<DownloadOutlined />} onClick={() => downloadCsvTemplate(templateHeaders, 'Return_Receive_template')}>Template</Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                    {isSupervisor && data.length > 0 && (
                        <Button danger icon={<ClearOutlined />} onClick={handleClearAll}>Clear All</Button>
                    )}
                </Space>
            </div>

            {selectedKeys.length > 0 && (
                <Popconfirm title={`Hapus ${selectedKeys.length} data?`} onConfirm={handleBulkDelete}>
                    <Button danger style={{ marginBottom: 12 }}><DeleteOutlined /> Hapus {selectedKeys.length} data</Button>
                </Popconfirm>
            )}

            <Table
                dataSource={filteredData}
                columns={columns}
                rowKey="id"
                loading={loading}
                size="small"
                scroll={{ x: 'max-content' }}
                pagination={{ pageSize: 100, showSizeChanger: true, pageSizeOptions: ['50', '100', '200', '500'], showTotal: (t) => `Total ${t} data` }}
                rowSelection={{ selectedRowKeys: selectedKeys, onChange: (keys) => setSelectedKeys(keys) }}
            />

            <Modal title={editId ? 'Edit Return Receive' : 'Tambah Return Receive'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} width={600}>
                <Form form={form} layout="vertical">
                    <Form.Item name="return_date" label="Return Date">
                        <DatePicker format="YYYY-MM-DD" placeholder="Pilih tanggal return" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="receive_date" label="Receive Date">
                        <DatePicker format="YYYY-MM-DD" placeholder="Pilih tanggal receive" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="brand" label="Brand">
                        <Input />
                    </Form.Item>
                    <Form.Item name="receipt_no" label="Receipt No" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="ref_no" label="Ref#">
                        <Input />
                    </Form.Item>
                    <Form.Item name="owner" label="Owner">
                        <Input />
                    </Form.Item>
                    <Form.Item name="arrival_date" label="Arrival Date">
                        <DatePicker format="YYYY-MM-DD" placeholder="Pilih tanggal arrival" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="tracking_no" label="Tracking#">
                        <Input />
                    </Form.Item>
                    <Form.Item name="sku" label="SKU">
                        <Input />
                    </Form.Item>
                    <Form.Item name="stock_status" label="Stock Status">
                        <Input />
                    </Form.Item>
                    <Form.Item name="return_qty" label="Return Qty">
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name="operator" label="Operator">
                        <Input />
                    </Form.Item>
                    <Form.Item name="return_reason" label="Return Reason">
                        <Input />
                    </Form.Item>
                    <Form.Item name="reason_group" label="Reason Group">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
