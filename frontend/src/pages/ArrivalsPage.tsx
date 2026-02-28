import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Table, Button, Input, Space, Modal, Form, InputNumber, Tag, message, Popconfirm, Upload, Select, DatePicker } from 'antd';
import {
    PlusOutlined, ReloadOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
    DownloadOutlined, UploadOutlined, ClearOutlined,
} from '@ant-design/icons';
import { arrivalsApi, transactionsApi } from '../api/client';
import { downloadCsvTemplate, normalizeDateTime, normalizeDate } from '../utils/csvTemplate';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useAuth } from '../contexts/AuthContext';

export default function ArrivalsPage() {
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

    // Fetch arrivals + transactions data
    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [aRes, tRes] = await Promise.all([arrivalsApi.list(), transactionsApi.list()]);
            const arrivals = aRes.data || [];
            arrivals.sort((a: any, b: any) => b.id - a.id);
            setData(arrivals);
            setTransData(tRes.data || []);
        } catch {
            if (!silent) message.error('Gagal memuat data');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-refresh every 60 seconds (silent — no loading spinner)
    useEffect(() => {
        const interval = setInterval(() => { fetchAll(true); }, 60000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    // Build lookup: receipt_no → { receiveQty, putawayQty, firstReceiveTime, lastPutawayTime } from transactions
    const txLookup = useMemo(() => {
        const map: Record<string, { receiveQty: number; putawayQty: number; firstReceiveTime: string | null; lastPutawayTime: string | null }> = {};
        transData.forEach((tx: any) => {
            const key = (tx.receipt_no || '').trim().toLowerCase();
            if (!key) return;
            if (!map[key]) map[key] = { receiveQty: 0, putawayQty: 0, firstReceiveTime: null, lastPutawayTime: null };
            const qty = parseInt(tx.qty) || 0;
            const type = (tx.operate_type || '').trim().toLowerCase();
            const txTime = tx.time_transaction || '';
            if (type === 'receive' || type === 'receiving') {
                map[key].receiveQty += qty;
                if (txTime && (!map[key].firstReceiveTime || txTime < map[key].firstReceiveTime!)) {
                    map[key].firstReceiveTime = txTime;
                }
            } else if (type === 'putaway') {
                map[key].putawayQty += qty;
                if (txTime && (!map[key].lastPutawayTime || txTime > map[key].lastPutawayTime!)) {
                    map[key].lastPutawayTime = txTime;
                }
            }
        });
        return map;
    }, [transData]);

    // Compute enriched data with Receive Qty, Putaway Qty, Pending Qty, First Receive, Last Putaway, Status
    const enrichedData = useMemo(() => {
        return data.map((row: any) => {
            const key = (row.receipt_no || '').trim().toLowerCase();
            const tx = txLookup[key] || { receiveQty: 0, putawayQty: 0, firstReceiveTime: null, lastPutawayTime: null };
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

            return {
                ...row,
                receive_qty: receiveQty,
                putaway_qty: putawayQty,
                pending_qty: pendingQty,
                first_receive: tx.firstReceiveTime || '-',
                last_putaway: tx.lastPutawayTime || '-',
                status,
            };
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
        { title: 'Jadwal Kedatangan', dataIndex: 'scheduled_arrival_time', key: 'scheduled_arrival_time', width: 130 },
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
        { title: 'Plan Qty', dataIndex: 'plan_qty', key: 'plan_qty', width: 90, sorter: (a: any, b: any) => a.plan_qty - b.plan_qty },
        { title: 'PO Qty', dataIndex: 'po_qty', key: 'po_qty', width: 90, sorter: (a: any, b: any) => a.po_qty - b.po_qty },
        { title: 'Receive Qty', dataIndex: 'receive_qty', key: 'receive_qty', width: 100, render: (v: number) => <span style={{ color: '#60a5fa' }}>{v.toLocaleString()}</span> },
        { title: 'Putaway Qty', dataIndex: 'putaway_qty', key: 'putaway_qty', width: 100, render: (v: number) => <span style={{ color: '#a78bfa' }}>{v.toLocaleString()}</span> },
        { title: 'Pending Qty', dataIndex: 'pending_qty', key: 'pending_qty', width: 100, render: (v: number) => v > 0 ? <span style={{ color: '#f87171', fontWeight: 600 }}>{v}</span> : <span style={{ color: '#4ade80' }}>0</span> },
        {
            title: 'Selesai Unloading', dataIndex: 'finish_unloading_time', key: 'finish_unloading_time', width: 160,
            render: (v: string) => v && v !== '-' ? <span style={{ color: '#34d399' }}>{v}</span> : <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>
        },
        { title: 'First Receive', dataIndex: 'first_receive', key: 'first_receive', width: 160, render: (v: string) => <span style={{ color: v === '-' ? 'rgba(255,255,255,0.3)' : '#60a5fa' }}>{v}</span> },
        { title: 'Last Putaway', dataIndex: 'last_putaway', key: 'last_putaway', width: 160, render: (v: string) => <span style={{ color: v === '-' ? 'rgba(255,255,255,0.3)' : '#a78bfa' }}>{v}</span> },
        { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
        { title: 'Note', dataIndex: 'note', key: 'note', width: 150, ellipsis: true },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 140, render: (s: string) => <Tag color={statusColor(s)}>{s}</Tag> },
        {
            title: 'Status Jadwal', key: 'schedule_status', width: 130,
            render: (_: any, r: any) => {
                const hasSchedule = r.scheduled_arrival_time && r.scheduled_arrival_time.trim() && r.scheduled_arrival_time !== '-';
                return hasSchedule
                    ? <Tag color="blue">Terjadwal</Tag>
                    : <Tag color="default">Tidak Terjadwal</Tag>;
            },
            filters: [{ text: 'Terjadwal', value: 'terjadwal' }, { text: 'Tidak Terjadwal', value: 'tidak' }],
            onFilter: (value: any, record: any) => {
                const has = record.scheduled_arrival_time && record.scheduled_arrival_time.trim() && record.scheduled_arrival_time !== '-';
                return value === 'terjadwal' ? !!has : !has;
            },
        },
        {
            title: 'Status Kedatangan', key: 'arrival_status', width: 140,
            render: (_: any, r: any) => {
                const sched = r.scheduled_arrival_time?.trim();
                const actual = r.arrival_time?.trim();
                if (!sched || sched === '-') return <Tag color="default">Tidak Terjadwal</Tag>;
                if (!actual || actual === '-') return <Tag color="orange">Belum Tiba</Tag>;
                return actual <= sched
                    ? <Tag color="green">Tepat Waktu</Tag>
                    : <Tag color="red">Terlambat</Tag>;
            },
            filters: [
                { text: 'Tepat Waktu', value: 'tepat' },
                { text: 'Terlambat', value: 'terlambat' },
                { text: 'Tidak Terjadwal', value: 'tidak' },
                { text: 'Belum Tiba', value: 'belum' },
            ],
            onFilter: (value: any, record: any) => {
                const sched = record.scheduled_arrival_time?.trim();
                const actual = record.arrival_time?.trim();
                if (!sched || sched === '-') return value === 'tidak';
                if (!actual || actual === '-') return value === 'belum';
                return value === 'tepat' ? actual <= sched : (value === 'terlambat' ? actual > sched : false);
            },
        },
        {
            title: 'Kingdee Status', dataIndex: 'kingdee_status', key: 'kingdee_status', width: 120,
            render: (v: string) => v ? <Tag color={v === 'Done' ? 'green' : 'orange'}>{v}</Tag> : '-',
            filters: [{ text: 'Done', value: 'Done' }, { text: 'Pending', value: 'Pending' }],
            onFilter: (value: any, r: any) => r.kingdee_status === value,
        },
        { title: 'Date Publish DO', dataIndex: 'date_publish_do', key: 'date_publish_do', width: 130 },
        { title: 'Remarks Publish DO', dataIndex: 'remarks_publish_do', key: 'remarks_publish_do', width: 170, ellipsis: true },
        {
            title: 'Inbound Paperwork SLA (day)', key: 'sla_days', width: 190,
            render: (_: any, r: any) => {
                const arrival = r.date;
                const publishDO = r.date_publish_do;
                if (!arrival || !publishDO || publishDO === '-') return <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>;
                const diff = dayjs(publishDO).diff(dayjs(arrival), 'day');
                return <Tag color={diff <= 1 ? 'green' : diff <= 3 ? 'orange' : 'red'}>{diff} hari</Tag>;
            },
        },
        {
            title: 'Urgensi', dataIndex: 'urgensi', key: 'urgensi', width: 100,
            render: (v: string) => v === 'YA'
                ? <Tag color="red">YA</Tag>
                : v === 'TIDAK' ? <Tag color="green">TIDAK</Tag> : '-',
            filters: [{ text: 'YA', value: 'YA' }, { text: 'TIDAK', value: 'TIDAK' }],
            onFilter: (value: any, r: any) => r.urgensi === value,
        },
        {
            title: 'Updated By', dataIndex: 'updated_by', key: 'updated_by', width: 120,
            render: (v: string) => v
                ? <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontStyle: 'italic' }}>{v}</span>
                : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>—</span>,
        },
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
                const rec = { ...editRecord.current };
                // Convert date/time strings to dayjs for DatePickers
                rec.date = rec.date ? (dayjs(rec.date).isValid() ? dayjs(rec.date) : null) : null;
                rec.arrival_time = rec.arrival_time && rec.arrival_time !== '-' ? (dayjs(rec.arrival_time).isValid() ? dayjs(rec.arrival_time) : null) : null;
                rec.scheduled_arrival_time = rec.scheduled_arrival_time && rec.scheduled_arrival_time !== '-' ? (dayjs(rec.scheduled_arrival_time).isValid() ? dayjs(rec.scheduled_arrival_time) : null) : null;
                rec.finish_unloading_time = rec.finish_unloading_time && rec.finish_unloading_time !== '-' ? (dayjs(rec.finish_unloading_time).isValid() ? dayjs(rec.finish_unloading_time) : null) : null;
                rec.date_publish_do = rec.date_publish_do && rec.date_publish_do !== '-' ? (dayjs(rec.date_publish_do).isValid() ? dayjs(rec.date_publish_do) : null) : null;
                form.setFieldsValue(rec);
            } else {
                form.resetFields();
                form.setFieldsValue({
                    date: dayjs(),
                    arrival_time: dayjs(),
                });
            }
        }
    }, [modalOpen, form]);

    const handleSave = async () => {
        try {
            const vals = await form.validateFields();
            // Convert DatePicker dayjs values back to strings
            const toDateStr = (v: any, fmt: string) => v && typeof v === 'object' && v.format ? v.format(fmt) : (v || '');
            vals.date = toDateStr(vals.date, 'YYYY-MM-DD');
            vals.arrival_time = toDateStr(vals.arrival_time, 'YYYY-MM-DD HH:mm:ss');
            vals.scheduled_arrival_time = toDateStr(vals.scheduled_arrival_time, 'YYYY-MM-DD HH:mm:ss');
            vals.finish_unloading_time = toDateStr(vals.finish_unloading_time, 'YYYY-MM-DD HH:mm:ss');
            vals.date_publish_do = toDateStr(vals.date_publish_do, 'YYYY-MM-DD');
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

    const handleClearAll = () => {
        Modal.confirm({
            title: '⚠️ Clear All Data',
            content: `Apakah Anda yakin ingin menghapus SEMUA ${data.length} data Inbound Arrival? Tindakan ini tidak bisa dibatalkan!`,
            okText: 'Ya, Hapus Semua',
            okType: 'danger',
            cancelText: 'Batal',
            onOk: async () => {
                try {
                    await arrivalsApi.sync([]);
                    message.success('Semua data Inbound Arrival berhasil dihapus');
                    setSelectedKeys([]);
                    fetchAll();
                } catch { message.error('Gagal menghapus semua data'); }
            },
        });
    };

    // CSV Export — includes all columns including auto-calculated ones
    const handleExport = () => {
        const headers = ['date', 'scheduled_arrival_time', 'arrival_time', 'finish_unloading_time', 'brand', 'item_type', 'receipt_no', 'po_no', 'plan_qty', 'po_qty', 'receive_qty', 'putaway_qty', 'pending_qty', 'first_receive', 'last_putaway', 'kingdee_status', 'date_publish_do', 'remarks_publish_do', 'inbound_paperwork_sla_day', 'urgensi', 'operator', 'note', 'status'];
        const csv = '\uFEFF' + headers.join(',') + '\n' +
            enrichedData.map((r: any) => {
                const sla = r.date && r.date_publish_do && r.date_publish_do !== '-'
                    ? dayjs(r.date_publish_do).diff(dayjs(r.date), 'day')
                    : '';
                const row: any = { ...r, inbound_paperwork_sla_day: sla };
                return headers.map(h => `"${row[h] ?? ''}"`).join(',');
            }).join('\n');
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
                    scheduled_arrival_time: normalizeDateTime(get('scheduled_arrival_time', '')),
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
                    <Button icon={<ReloadOutlined />} onClick={() => fetchAll()}>Refresh</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Tambah</Button>
                    <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport as any}>
                        <Button icon={<UploadOutlined />}>Import</Button>
                    </Upload>
                    <Button icon={<DownloadOutlined />} onClick={() => downloadCsvTemplate(
                        ['date', 'scheduled_arrival_time', 'arrival_time', 'finish_unloading_time', 'brand', 'item_type', 'receipt_no', 'po_no', 'plan_qty', 'po_qty', 'kingdee_status', 'date_publish_do', 'remarks_publish_do', 'urgensi', 'operator', 'note'],
                        'Arrivals_template'
                    )}>Template</Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                    {isSupervisor && data.length > 0 && (
                        <Button danger icon={<ClearOutlined />} onClick={handleClearAll}>Clear All</Button>
                    )}
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
                        tooltip="Pilih tanggal kedatangan">
                        <DatePicker
                            format="YYYY-MM-DD"
                            placeholder="Pilih tanggal kedatangan"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Form.Item name="scheduled_arrival_time" label="Jadwal Kedatangan"
                        tooltip="Jadwal/rencana waktu kedatangan">
                        <DatePicker
                            showTime
                            format="YYYY-MM-DD HH:mm:ss"
                            placeholder="Pilih jadwal kedatangan"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Form.Item name="arrival_time" label="Waktu Kedatangan"
                        tooltip="Waktu aktual kedatangan">
                        <DatePicker
                            showTime
                            format="YYYY-MM-DD HH:mm:ss"
                            placeholder="Pilih waktu kedatangan"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Form.Item name="finish_unloading_time" label="Selesai Unloading"
                        tooltip="Waktu selesai unloading">
                        <DatePicker
                            showTime
                            format="YYYY-MM-DD HH:mm:ss"
                            placeholder="Pilih waktu selesai unloading"
                            style={{ width: '100%' }}
                        />
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
                    <Form.Item name="plan_qty" label="Plan Qty">
                        <InputNumber style={{ width: '100%' }} min={0} />
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
                    <Form.Item name="kingdee_status" label="Kingdee Status">
                        <Select allowClear placeholder="Pilih status" options={[
                            { label: 'Done', value: 'Done' },
                            { label: 'Pending', value: 'Pending' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="date_publish_do" label="Date of Publish DO" tooltip="Tanggal publish DO">
                        <DatePicker format="YYYY-MM-DD" placeholder="Pilih tanggal" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="remarks_publish_do" label="Remarks of Date Publish DO">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="urgensi" label="Urgensi">
                        <Select allowClear placeholder="Pilih urgensi" options={[
                            { label: 'YA', value: 'YA' },
                            { label: 'TIDAK', value: 'TIDAK' },
                        ]} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
