import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Table, Button, Input, Space, Modal, Form, InputNumber, Tag, message, Popconfirm, Upload, Select, DatePicker } from 'antd';
import {
    PlusOutlined, ReloadOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
    DownloadOutlined, UploadOutlined,
} from '@ant-design/icons';
import { arrivalsApi, transactionsApi } from '../api/client';
import { downloadCsvTemplate, normalizeDateTime, normalizeDate } from '../utils/csvTemplate';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

export default function ArrivalsPage() {
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

    // Fetch arrivals + transactions data
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [aRes, tRes] = await Promise.all([arrivalsApi.list(), transactionsApi.list()]);
            const arrivals = aRes.data || [];
            arrivals.sort((a: any, b: any) => b.id - a.id);
            setData(arrivals);
            setTransData(tRes.data || []);
        } catch {
            message.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => { fetchAll(); }, 30000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    // Build lookup: receipt_no → { receiveQty, putawayQty } from transactions
    const txLookup = useMemo(() => {
        const map: Record<string, { receiveQty: number; putawayQty: number }> = {};
        transData.forEach((tx: any) => {
            const key = (tx.receipt_no || '').trim().toLowerCase();
            if (!key) return;
            if (!map[key]) map[key] = { receiveQty: 0, putawayQty: 0 };
            const qty = parseInt(tx.qty) || 0;
            const type = (tx.operate_type || '').trim().toLowerCase();
            if (type === 'receive' || type === 'receiving') {
                map[key].receiveQty += qty;
            } else if (type === 'putaway') {
                map[key].putawayQty += qty;
            }
        });
        return map;
    }, [transData]);

    // Compute enriched data with Receive Qty, Putaway Qty, Pending Qty, Status
    const enrichedData = useMemo(() => {
        return data.map((row: any) => {
            const key = (row.receipt_no || '').trim().toLowerCase();
            const tx = txLookup[key] || { receiveQty: 0, putawayQty: 0 };
            const poQty = parseInt(row.po_qty) || 0;
            const receiveQty = tx.receiveQty;
            const putawayQty = tx.putawayQty;
            const pendingQty = Math.abs(receiveQty - poQty);

            let status = 'Pending Receive';
            if (receiveQty === poQty && putawayQty === poQty) {
                status = 'Completed';
            } else if (receiveQty === poQty && putawayQty !== poQty) {
                status = 'Pending Putaway';
            }

            return { ...row, receive_qty: receiveQty, putaway_qty: putawayQty, pending_qty: pendingQty, status };
        });
    }, [data, txLookup]);

    // Filter by date range and search
    const filteredData = useMemo(() => {
        let result = enrichedData;
        if (dateRange) {
            result = result.filter((d: any) => {
                if (!d.date) return true;
                const dd = dayjs(d.date);
                return !dd.isBefore(dateRange[0], 'day') && !dd.isAfter(dateRange[1], 'day');
            });
        }
        const q = search.toLowerCase();
        if (!q) return result;
        return result.filter((d: any) =>
            Object.values(d).some(v => String(v).toLowerCase().includes(q))
        );
    }, [enrichedData, search, dateRange]);

    // Status color
    const statusColor = (s: string) => {
        if (s === 'Completed') return 'green';
        if (s === 'Pending Putaway') return 'orange';
        return 'red';
    };

    const columns = [
        { title: 'Tgl Kedatangan', dataIndex: 'date', key: 'date', width: 120, sorter: (a: any, b: any) => a.date?.localeCompare(b.date) },
        { title: 'Waktu Kedatangan', dataIndex: 'arrival_time', key: 'arrival_time', width: 90 },
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
        {
            title: 'Item Type', dataIndex: 'item_type', key: 'item_type', width: 110,
            render: (v: string) => {
                const color = v === 'ATK' ? 'blue' : v === 'Gimmick' ? 'purple' : 'green';
                return <Tag color={color}>{v || 'Barang Jual'}</Tag>;
            },
            filters: [{ text: 'ATK', value: 'ATK' }, { text: 'Barang Jual', value: 'Barang Jual' }, { text: 'Gimmick', value: 'Gimmick' }],
            onFilter: (value: any, record: any) => (record.item_type || 'Barang Jual') === value,
        },
        { title: 'Receipt No', dataIndex: 'receipt_no', key: 'receipt_no', width: 120 },
        { title: 'PO No', dataIndex: 'po_no', key: 'po_no', width: 120 },
        { title: 'PO Qty', dataIndex: 'po_qty', key: 'po_qty', width: 90, sorter: (a: any, b: any) => a.po_qty - b.po_qty },
        { title: 'Receive Qty', dataIndex: 'receive_qty', key: 'receive_qty', width: 100, render: (v: number) => <span style={{ color: '#60a5fa' }}>{v.toLocaleString()}</span> },
        { title: 'Putaway Qty', dataIndex: 'putaway_qty', key: 'putaway_qty', width: 100, render: (v: number) => <span style={{ color: '#a78bfa' }}>{v.toLocaleString()}</span> },
        { title: 'Pending Qty', dataIndex: 'pending_qty', key: 'pending_qty', width: 100, render: (v: number) => v > 0 ? <span style={{ color: '#f87171', fontWeight: 600 }}>{v}</span> : <span style={{ color: '#4ade80' }}>0</span> },
        { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
        { title: 'Note', dataIndex: 'note', key: 'note', width: 150, ellipsis: true },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 140, render: (s: string) => <Tag color={statusColor(s)}>{s}</Tag> },
        {
            title: 'Actions', key: 'actions', width: 100, fixed: 'right' as const,
            render: (_: any, record: any) => (
                <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm title="Hapus data ini?" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Track record to edit
    const editRecord = useRef<any>(null);

    // Add / Edit
    const handleAdd = () => {
        setEditId(null);
        editRecord.current = null;
        setModalOpen(true);
    };

    const handleEdit = (record: any) => {
        setEditId(record.id);
        editRecord.current = record;
        setModalOpen(true);
    };

    // Set form values when modal opens
    useEffect(() => {
        if (modalOpen) {
            if (editRecord.current) {
                form.setFieldsValue(editRecord.current);
            } else {
                form.resetFields();
                form.setFieldsValue({
                    date: dayjs().format('YYYY-MM-DD'),
                    arrival_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                });
            }
        }
    }, [modalOpen, form]);

    const handleSave = async () => {
        try {
            const vals = await form.validateFields();
            if (editId) {
                await arrivalsApi.update(editId, vals);
                message.success('Data diupdate');
            } else {
                await arrivalsApi.create(vals);
                message.success('Data ditambahkan');
            }
            setModalOpen(false);
            fetchAll();
        } catch (err: any) {
            if (err.response) message.error('Error: ' + (err.response?.data?.error || 'Unknown'));
        }
    };

    const handleDelete = async (id: number) => {
        await arrivalsApi.remove(id);
        message.success('Data dihapus');
        fetchAll();
    };

    const handleBulkDelete = async () => {
        await arrivalsApi.bulkDelete(selectedKeys as number[]);
        message.success(`${selectedKeys.length} data dihapus`);
        setSelectedKeys([]);
        fetchAll();
    };

    // CSV Export
    const handleExport = () => {
        const headers = ['date', 'arrival_time', 'brand', 'item_type', 'receipt_no', 'po_no', 'po_qty', 'receive_qty', 'putaway_qty', 'pending_qty', 'operator', 'note', 'status'];
        const csv = '\uFEFF' + headers.join(',') + '\n' +
            enrichedData.map((r: any) => headers.map(h => `"${r[h] ?? ''}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inbound_arrival_${dayjs().format('YYYY-MM-DD')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('Export berhasil');
    };

    // CSV Import — reads by header name, not column position
    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { message.warning('CSV kosong atau hanya header'); return; }

            // Parse header row to build column index map
            const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
            const colIdx = (name: string) => headers.indexOf(name);

            const rows = lines.slice(1).map(line => {
                const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
                const get = (name: string, fallback = '') => {
                    const idx = colIdx(name);
                    return idx >= 0 && cols[idx] ? cols[idx] : fallback;
                };
                return {
                    date: normalizeDate(get('date', dayjs().format('YYYY-MM-DD'))),
                    arrival_time: normalizeDateTime(get('arrival_time', dayjs().format('YYYY-MM-DD HH:mm:ss'))),
                    brand: get('brand'),
                    item_type: get('item_type'),
                    receipt_no: get('receipt_no'),
                    po_no: get('po_no'),
                    po_qty: parseInt(get('po_qty', '0')) || 0,
                    receive_qty: parseInt(get('receive_qty', '0')) || 0,
                    putaway_qty: parseInt(get('putaway_qty', '0')) || 0,
                    pending_qty: parseInt(get('pending_qty', '0')) || 0,
                    operator: get('operator'),
                    note: get('note'),
                    status: get('status', 'Completed'),
                };
            }).filter(obj => Object.values(obj).some(v => v !== '' && v !== 0 && v != null && v !== 'Completed'));
            if (rows.length === 0) { message.warning('Tidak ada data valid'); return; }
            try {
                const CHUNK = 1000;
                let imported = 0;
                const hide = message.loading(`Importing... 0/${rows.length}`, 0);
                for (let i = 0; i < rows.length; i += CHUNK) {
                    await arrivalsApi.batchImport(rows.slice(i, i + CHUNK));
                    imported += Math.min(CHUNK, rows.length - i);
                    hide();
                    if (i + CHUNK < rows.length) message.loading(`Importing... ${imported}/${rows.length}`, 0);
                }
                message.success(`✅ ${imported} data imported`);
                fetchAll();
            } catch {
                message.error('Import gagal');
            }
        };
        reader.readAsText(file);
        return false;
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, color: '#fff' }}>Inbound Arrival</h2>
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
                    <Button icon={<ReloadOutlined />} onClick={fetchAll}>Refresh</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Tambah</Button>
                    <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport as any}>
                        <Button icon={<UploadOutlined />}>Import</Button>
                    </Upload>
                    <Button icon={<DownloadOutlined />} onClick={() => downloadCsvTemplate(['date', 'arrival_time', 'brand', 'item_type', 'receipt_no', 'po_no', 'po_qty', 'operator', 'note'], 'Arrivals_template')}>Template</Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                </Space>
            </div>

            {/* Bulk delete */}
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
                scroll={{ x: 1400, y: 'calc(100vh - 280px)' }}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Total ${t} data` }}
                rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
            />

            {/* Add / Edit Modal */}
            <Modal
                title={editId ? 'Edit Arrival' : 'Tambah Arrival'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                width={520}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="date" label="Tanggal Kedatangan" rules={[{ required: true }]}
                        tooltip="Otomatis terisi tanggal hari ini">
                        <Input disabled={!editId} />
                    </Form.Item>
                    <Form.Item name="arrival_time" label="Waktu Kedatangan"
                        tooltip="Otomatis terisi jam saat input">
                        <Input disabled={!editId} />
                    </Form.Item>
                    <Form.Item name="brand" label="Brand" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="receipt_no" label="Receipt No" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="po_no" label="PO No" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="po_qty" label="PO Qty" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name="operator" label="Operator">
                        <Input />
                    </Form.Item>
                    <Form.Item name="note" label="Note">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="item_type" label="Item Type" initialValue="Barang Jual">
                        <Select options={[
                            { label: 'ATK', value: 'ATK' },
                            { label: 'Barang Jual', value: 'Barang Jual' },
                            { label: 'Gimmick', value: 'Gimmick' },
                        ]} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
