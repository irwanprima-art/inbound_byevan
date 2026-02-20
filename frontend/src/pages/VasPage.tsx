import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Table, Button, Input, InputNumber, Space, Card, Typography, Tag, message,
    Popconfirm, Upload, Form, Modal, Row, Col, Badge, Select, DatePicker,
} from 'antd';
import {
    PlayCircleOutlined, CheckCircleOutlined, ReloadOutlined, SearchOutlined,
    EditOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, PlusOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import { vasApi } from '../api/client';
import { downloadCsvTemplate } from '../utils/csvTemplate';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;

interface TaskItem {
    brand: string;
    sku: string;
    vas_type: string;
    item_type: string;
}

interface ActiveTask {
    id: string;
    operator: string;
    startTime: string;
    startTs: number;
    expanded: boolean;
    items: TaskItem[];
}

export default function VasPage() {
    // ─── Data table state ───────────────────────
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

    // ─── Edit modal state ──────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const editRecord = useRef<any>(null);
    const [form] = Form.useForm();

    // ─── Active tasks (multi-stopwatch) ────────
    const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
    const [elapsed, setElapsed] = useState<Record<string, number>>({});

    // ─── Qty finish modal ─────────────────────
    const [qtyModalTask, setQtyModalTask] = useState<ActiveTask | null>(null);
    const [finishQtys, setFinishQtys] = useState<number[]>([]);

    // ─── New task form ─────────────────────────
    const [swForm] = Form.useForm();

    // ─── Add SKU form (inline per task) ────────
    const [addSkuTaskId, setAddSkuTaskId] = useState<string | null>(null);
    const [addSkuForm] = Form.useForm();

    // ─── Data fetching ─────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await vasApi.list();
            setData(res.data || []);
        } catch {
            message.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => { fetchData(); }, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // ─── Global timer for all active tasks ─────
    useEffect(() => {
        if (activeTasks.length === 0) return;
        const iv = setInterval(() => {
            const now = Date.now();
            const e: Record<string, number> = {};
            activeTasks.forEach(t => { e[t.id] = Math.floor((now - t.startTs) / 1000); });
            setElapsed(e);
        }, 1000);
        return () => clearInterval(iv);
    }, [activeTasks]);

    const formatElapsed = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // ─── Start new task ────────────────────────
    const handleStart = async () => {
        try {
            const vals = await swForm.validateFields();
            const now = dayjs();
            const task: ActiveTask = {
                id: `task_${Date.now()}`,
                operator: vals.operator,
                startTime: now.format('YYYY-MM-DD HH:mm:ss'),
                startTs: Date.now(),
                expanded: false,
                items: [{ brand: vals.brand, sku: vals.sku, vas_type: vals.vas_type, item_type: vals.item_type || 'Barang Jual' }],
            };
            setActiveTasks(prev => [...prev, task]);
            swForm.resetFields();
            message.success(`⏱ Task started — ${vals.operator} melakukan ${vals.vas_type}`);
        } catch {
            message.error('Isi Brand, SKU, VAS Type, dan Operator dulu!');
        }
    };

    // ─── Add SKU to existing task ──────────────
    const handleAddSku = async (taskId: string) => {
        try {
            const vals = await addSkuForm.validateFields();
            setActiveTasks(prev => prev.map(t =>
                t.id === taskId
                    ? { ...t, items: [...t.items, { brand: vals.brand, sku: vals.sku, vas_type: vals.vas_type, item_type: vals.item_type || 'Barang Jual' }] }
                    : t
            ));
            addSkuForm.resetFields();
            setAddSkuTaskId(null);
            message.success('SKU ditambahkan ke task');
        } catch {
            message.error('Isi Brand, SKU, dan VAS Type!');
        }
    };

    // ─── Remove SKU item from task ─────────────
    const handleRemoveItem = (taskId: string, itemIdx: number) => {
        setActiveTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            if (t.items.length <= 1) return t; // can't remove last item
            return { ...t, items: t.items.filter((_, i) => i !== itemIdx) };
        }));
    };

    // ─── Toggle expand/collapse card ───────────
    const toggleExpand = (taskId: string) => {
        setActiveTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, expanded: !t.expanded } : t
        ));
    };

    // ─── Finish task → open qty modal ──────────
    const handleFinish = (task: ActiveTask) => {
        setQtyModalTask(task);
        setFinishQtys(task.items.map(() => 1));
    };

    // ─── Save after entering Qty ───────────────
    const handleSaveQty = async () => {
        if (!qtyModalTask) return;
        try {
            const endTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
            const dateStr = dayjs().format('YYYY-MM-DD');

            // Save one record per item
            for (let i = 0; i < qtyModalTask.items.length; i++) {
                const item = qtyModalTask.items[i];
                const qty = finishQtys[i] || 1;
                const record = {
                    date: dateStr,
                    start_time: qtyModalTask.startTime,
                    end_time: endTime,
                    brand: item.brand,
                    sku: item.sku,
                    vas_type: item.vas_type,
                    item_type: item.item_type,
                    qty,
                    operator: qtyModalTask.operator,
                };
                await vasApi.create(record);
            }

            message.success(`✅ ${qtyModalTask.operator} — ${qtyModalTask.items.length} SKU selesai!`);

            // Remove from active
            setActiveTasks(prev => prev.filter(t => t.id !== qtyModalTask.id));
            setQtyModalTask(null);
            fetchData();
        } catch (err: any) {
            message.error('Gagal menyimpan: ' + (err.response?.data?.error || ''));
        }
    };

    // ─── Cancel / remove active task ──────────
    const handleCancelTask = (taskId: string) => {
        setActiveTasks(prev => prev.filter(t => t.id !== taskId));
        message.info('Task dibatalkan');
    };

    // ─── Computed duration for table ──────────
    const computeDuration = (start: string, end: string) => {
        if (!start || !end) return '-';
        const s = dayjs(start, 'YYYY-MM-DD HH:mm:ss');
        const e = dayjs(end, 'YYYY-MM-DD HH:mm:ss');
        if (!s.isValid() || !e.isValid()) return '-';
        const diff = e.diff(s, 'second');
        if (diff < 0) return '-';
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const sec = diff % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    // ─── VAS type options ──────────────────────
    const vasTypeOptions = [
        { value: 'Barcode', label: 'Barcode' },
        { value: 'Repacking / relabeling', label: 'Repacking / relabeling' },
        { value: 'Assembly', label: 'Assembly' },
        { value: 'Disassembly', label: 'Disassembly' },
        { value: 'Bundling', label: 'Bundling' },
        { value: 'Additional QC', label: 'Additional QC' },
    ];

    // ─── Table columns ────────────────────────
    const columns = [
        { title: 'Date', dataIndex: 'date', key: 'date', width: 110, sorter: (a: any, b: any) => a.date?.localeCompare(b.date) },
        { title: 'Start Time', dataIndex: 'start_time', key: 'start_time', width: 170 },
        { title: 'End Time', dataIndex: 'end_time', key: 'end_time', width: 170 },
        {
            title: 'Duration', key: 'duration', width: 100,
            render: (_: any, r: any) => <Tag color="blue">{computeDuration(r.start_time, r.end_time)}</Tag>,
        },
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
        { title: 'VAS Type', dataIndex: 'vas_type', key: 'vas_type', width: 120 },
        { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 80, sorter: (a: any, b: any) => a.qty - b.qty },
        { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
        { title: 'Item Type', dataIndex: 'item_type', key: 'item_type', width: 120, render: (v: string) => <Tag color={v === 'Gimmick' ? 'orange' : 'green'}>{v || 'Barang Jual'}</Tag> },
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

    const filteredData = data.filter((d: any) => {
        if (dateRange) {
            const dd = dayjs(d.date);
            if (dd.isBefore(dateRange[0], 'day') || dd.isAfter(dateRange[1], 'day')) return false;
        }
        if (!search) return true;
        return Object.values(d).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
    });

    // ─── Edit modal ───────────────────────────
    const handleEdit = (record: any) => {
        setEditId(record.id);
        editRecord.current = record;
        setModalOpen(true);
    };

    const handleAddManual = () => {
        setEditId(null);
        editRecord.current = null;
        setModalOpen(true);
    };

    useEffect(() => {
        if (modalOpen) {
            if (editRecord.current) {
                form.setFieldsValue(editRecord.current);
            } else {
                form.resetFields();
            }
        }
    }, [modalOpen, form]);

    const handleSave = async () => {
        try {
            const vals = await form.validateFields();
            if (editId) {
                await vasApi.update(editId, vals);
                message.success('Data diupdate');
            } else {
                await vasApi.create(vals);
                message.success('Data ditambahkan');
            }
            setModalOpen(false);
            fetchData();
        } catch (err: any) {
            if (err.response) message.error('Error: ' + (err.response?.data?.error || ''));
        }
    };

    const handleDelete = async (id: number) => {
        await vasApi.remove(id);
        message.success('Data dihapus');
        fetchData();
    };

    const handleBulkDelete = async () => {
        await vasApi.bulkDelete(selectedKeys as number[]);
        message.success(`${selectedKeys.length} data dihapus`);
        setSelectedKeys([]);
        fetchData();
    };

    // ─── Export / Import CSV ──────────────────
    const handleExport = () => {
        const headers = ['date', 'start_time', 'end_time', 'duration', 'brand', 'sku', 'vas_type', 'qty', 'operator', 'item_type'];
        const csv = '\uFEFF' + headers.join(',') + '\n' +
            data.map((r: any) => {
                const dur = computeDuration(r.start_time, r.end_time);
                return [r.date, r.start_time, r.end_time, dur, r.brand, r.sku, r.vas_type, r.qty, r.operator, r.item_type || 'Barang Jual']
                    .map(v => `"${v ?? ''}"`).join(',');
            }).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vas_${dayjs().format('M-D-YYYY')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

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
                    date: get('date'), start_time: get('start_time'), end_time: get('end_time'),
                    brand: get('brand'), sku: get('sku'), vas_type: get('vas_type'),
                    qty: parseInt(get('qty', '0')) || 0, operator: get('operator'),
                    item_type: get('item_type', 'Barang Jual'),
                };
            });
            try {
                await vasApi.sync(rows);
                message.success(`${rows.length} data imported`);
                fetchData();
            } catch { message.error('Import gagal'); }
        };
        reader.readAsText(file);
        return false;
    };

    // ─── Mini card styles ─────────────────────
    const miniCardStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '1px solid rgba(59,130,246,0.3)',
        borderRadius: 12,
        padding: '10px 16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        minWidth: 220,
    };

    const expandedCardStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, #0c1829 0%, #1a3a5c 100%)',
        border: '1px solid rgba(59,130,246,0.5)',
        borderRadius: 16,
        padding: '20px 24px',
        transition: 'all 0.3s ease',
        boxShadow: '0 8px 32px rgba(59,130,246,0.15)',
    };

    return (
        <div>
            {/* ───── NEW TASK FORM ───── */}
            <Card style={{
                background: '#161b22', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <PlayCircleOutlined style={{ color: '#22c55e', fontSize: 20 }} />
                    <Title level={5} style={{ margin: 0, color: '#fff' }}>Mulai Task VAS Baru</Title>
                </div>
                <Form form={swForm} layout="vertical">
                    <Row gutter={12} align="bottom">
                        <Col xs={12} md={4}>
                            <Form.Item name="brand" label="Brand" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="Brand" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={4}>
                            <Form.Item name="sku" label="SKU" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="SKU" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={4}>
                            <Form.Item name="vas_type" label="VAS Type" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Select placeholder="Pilih jenis VAS" options={vasTypeOptions} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={4}>
                            <Form.Item name="item_type" label="Item Type" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Select placeholder="Item Type" options={[
                                    { value: 'Barang Jual', label: 'Barang Jual' },
                                    { value: 'Gimmick', label: 'Gimmick' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={4}>
                            <Form.Item name="operator" label="Operator" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="Nama operator" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button
                                type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}
                                block
                                style={{
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    border: 'none', borderRadius: 10, height: 40, fontWeight: 700,
                                }}
                            >
                                START
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Card>

            {/* ───── ACTIVE TASKS (mini cards) ───── */}
            {activeTasks.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Badge count={activeTasks.length} style={{ backgroundColor: '#3b82f6' }} />
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Task sedang berjalan</Text>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {activeTasks.map(task => {
                            const sec = elapsed[task.id] || 0;
                            if (task.expanded) {
                                // ── Expanded card ──
                                return (
                                    <div key={task.id} style={{ ...expandedCardStyle, width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <Text style={{ color: '#60a5fa', fontWeight: 700, fontSize: 16 }}>
                                                    {task.operator}
                                                </Text>
                                                <Text style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                                                    — {task.items.length} SKU
                                                </Text>
                                            </div>
                                            <Button type="text" icon={<CloseOutlined />}
                                                onClick={() => toggleExpand(task.id)}
                                                style={{ color: 'rgba(255,255,255,0.4)' }} />
                                        </div>

                                        <Row gutter={24} style={{ marginTop: 16 }} align="middle">
                                            <Col span={6} style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    fontSize: 36, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                                                    color: '#60a5fa',
                                                    textShadow: '0 0 20px rgba(59,130,246,0.3)',
                                                }}>
                                                    {formatElapsed(sec)}
                                                </div>
                                                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                                                    Started: {task.startTime}
                                                </Text>
                                            </Col>
                                            <Col span={12}>
                                                {/* SKU Items List */}
                                                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                                                    {task.items.map((item, idx) => (
                                                        <div key={idx} style={{
                                                            display: 'flex', alignItems: 'center', gap: 8,
                                                            padding: '5px 10px', marginBottom: 4, borderRadius: 8,
                                                            background: 'rgba(255,255,255,0.04)',
                                                            border: '1px solid rgba(255,255,255,0.06)',
                                                        }}>
                                                            <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{item.vas_type}</Tag>
                                                            <Tag color={item.item_type === 'Gimmick' ? 'orange' : 'green'} style={{ margin: 0, fontSize: 10 }}>{item.item_type}</Tag>
                                                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{item.brand}</Text>
                                                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{item.sku}</Text>
                                                            {task.items.length > 1 && (
                                                                <Button type="text" size="small"
                                                                    icon={<CloseOutlined style={{ fontSize: 10 }} />}
                                                                    onClick={() => handleRemoveItem(task.id, idx)}
                                                                    style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', padding: 0, width: 20, height: 20 }}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Add SKU inline form */}
                                                {addSkuTaskId === task.id ? (
                                                    <Form form={addSkuForm} layout="inline" style={{ marginTop: 8 }}>
                                                        <Form.Item name="brand" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                            <Input placeholder="Brand" size="small" style={{ width: 80 }} />
                                                        </Form.Item>
                                                        <Form.Item name="sku" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                            <Input placeholder="SKU" size="small" style={{ width: 100 }} />
                                                        </Form.Item>
                                                        <Form.Item name="vas_type" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                            <Select placeholder="VAS Type" size="small" style={{ width: 130 }} options={vasTypeOptions} />
                                                        </Form.Item>
                                                        <Form.Item name="item_type" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                            <Select placeholder="Item Type" size="small" style={{ width: 110 }} options={[
                                                                { value: 'Barang Jual', label: 'Barang Jual' },
                                                                { value: 'Gimmick', label: 'Gimmick' },
                                                            ]} />
                                                        </Form.Item>
                                                        <Button type="primary" size="small" icon={<PlusOutlined />}
                                                            onClick={() => handleAddSku(task.id)}
                                                            style={{ background: '#22c55e', border: 'none', borderRadius: 6 }}>
                                                            Add
                                                        </Button>
                                                        <Button type="text" size="small"
                                                            onClick={() => { setAddSkuTaskId(null); addSkuForm.resetFields(); }}
                                                            style={{ color: 'rgba(255,255,255,0.4)' }}>
                                                            Batal
                                                        </Button>
                                                    </Form>
                                                ) : (
                                                    <Button type="dashed" size="small" icon={<PlusOutlined />}
                                                        onClick={() => { setAddSkuTaskId(task.id); addSkuForm.resetFields(); }}
                                                        style={{ marginTop: 8, borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: 6 }}>
                                                        Tambah SKU lain
                                                    </Button>
                                                )}
                                            </Col>
                                            <Col span={6} style={{ textAlign: 'right' }}>
                                                <Space>
                                                    <Button
                                                        type="primary" icon={<CheckCircleOutlined />}
                                                        onClick={() => handleFinish(task)}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                            border: 'none', borderRadius: 10, height: 40, fontWeight: 700,
                                                        }}
                                                    >
                                                        FINISH
                                                    </Button>
                                                    <Popconfirm title="Batalkan task ini?" onConfirm={() => handleCancelTask(task.id)}>
                                                        <Button danger style={{ borderRadius: 10, height: 40 }}>Cancel</Button>
                                                    </Popconfirm>
                                                </Space>
                                            </Col>
                                        </Row>
                                    </div>
                                );
                            }

                            // ── Mini card (collapsed) ──
                            return (
                                <div
                                    key={task.id}
                                    style={miniCardStyle}
                                    onClick={() => toggleExpand(task.id)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={{ color: '#60a5fa', fontWeight: 700, fontSize: 13 }}
                                                ellipsis>
                                                {task.operator}
                                            </Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginLeft: 4 }}>
                                                — {task.items.length} SKU
                                            </Text>
                                        </div>
                                        <div style={{
                                            fontFamily: "'JetBrains Mono', monospace",
                                            color: '#60a5fa', fontWeight: 800, fontSize: 15,
                                            marginLeft: 12, whiteSpace: 'nowrap',
                                            textShadow: '0 0 10px rgba(59,130,246,0.3)',
                                        }}>
                                            {formatElapsed(sec)}
                                        </div>
                                    </div>
                                    <div style={{
                                        height: 2, borderRadius: 1, marginTop: 6,
                                        background: 'linear-gradient(90deg, #3b82f6, rgba(59,130,246,0.1))',
                                        animation: 'pulse 2s ease-in-out infinite',
                                    }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ───── QTY MODAL on FINISH ───── */}
            <Modal
                title="⏱ Finish — Masukkan Qty per SKU"
                open={!!qtyModalTask}
                onCancel={() => setQtyModalTask(null)}
                onOk={handleSaveQty}
                okText="Simpan Semua"
                width={520}
            >
                {qtyModalTask && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <Text style={{ color: '#60a5fa', fontWeight: 700 }}>{qtyModalTask.operator}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.4)' }}> — {qtyModalTask.items.length} SKU</Text>
                        </div>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Duration: </Text>
                            <Tag color="blue" style={{ fontSize: 18, padding: '4px 12px' }}>
                                {formatElapsed(elapsed[qtyModalTask.id] || 0)}
                            </Tag>
                        </div>
                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                            {qtyModalTask.items.map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 14px', marginBottom: 8, borderRadius: 10,
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{item.vas_type}</Tag>
                                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{item.brand}</Text>
                                        </div>
                                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{item.sku}</Text>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Qty:</Text>
                                        <InputNumber
                                            value={finishQtys[idx]}
                                            onChange={v => {
                                                const next = [...finishQtys];
                                                next[idx] = v || 1;
                                                setFinishQtys(next);
                                            }}
                                            min={1}
                                            size="small"
                                            style={{ width: 80 }}
                                            autoFocus={idx === 0}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Modal>

            {/* ───── DATA TABLE ───── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0, color: '#fff' }}>VAS Records</Title>
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
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
                    <Button icon={<PlusOutlined />} onClick={handleAddManual}>Manual Add</Button>
                    <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport as any}>
                        <Button icon={<UploadOutlined />}>Import</Button>
                    </Upload>
                    <Button icon={<DownloadOutlined />} onClick={() => downloadCsvTemplate(['date', 'start_time', 'end_time', 'brand', 'sku', 'vas_type', 'qty', 'operator', 'item_type'], 'VAS_template')}>Template</Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
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
                scroll={{ x: 1200, y: 'calc(100vh - 280px)' }}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `Total ${t} data` }}
                rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
            />

            {/* ───── EDIT MODAL ───── */}
            <Modal
                title={editId ? 'Edit VAS' : 'Tambah VAS (Manual)'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                width={520}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="date" label="Date" rules={[{ required: true }]}><Input placeholder="M/D/YYYY" /></Form.Item>
                    <Form.Item name="start_time" label="Start Time"><Input placeholder="M/D/YYYY HH:mm:ss" /></Form.Item>
                    <Form.Item name="end_time" label="End Time"><Input placeholder="M/D/YYYY HH:mm:ss" /></Form.Item>
                    <Form.Item name="brand" label="Brand"><Input /></Form.Item>
                    <Form.Item name="sku" label="SKU"><Input /></Form.Item>
                    <Form.Item name="vas_type" label="VAS Type"><Select placeholder="Pilih jenis VAS" options={vasTypeOptions} /></Form.Item>
                    <Form.Item name="item_type" label="Item Type"><Select placeholder="Item Type" options={[
                        { value: 'Barang Jual', label: 'Barang Jual' },
                        { value: 'Gimmick', label: 'Gimmick' },
                    ]} /></Form.Item>
                    <Form.Item name="qty" label="Qty"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
                    <Form.Item name="operator" label="Operator"><Input /></Form.Item>
                </Form>
            </Modal>

            {/* pulse animation */}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
        </div>
    );
}
