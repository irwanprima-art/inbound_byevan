import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Table, Button, Input, InputNumber, Space, Card, Typography, Tag, message,
    Popconfirm, Upload, Form, Modal, Row, Col, Badge, Select,
} from 'antd';
import {
    PlayCircleOutlined, CheckCircleOutlined, ReloadOutlined, SearchOutlined,
    EditOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, PlusOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import { vasApi } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface ActiveTask {
    id: string;
    brand: string;
    sku: string;
    vas_type: string;
    operator: string;
    startTime: string;
    startTs: number;
    expanded: boolean;
}

export default function VasPage() {
    // ─── Data table state ───────────────────────
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

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
    const [finishQty, setFinishQty] = useState<number>(1);

    // ─── New task form ─────────────────────────
    const [swForm] = Form.useForm();

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
                brand: vals.brand,
                sku: vals.sku,
                vas_type: vals.vas_type,
                operator: vals.operator,
                startTime: now.format('M/D/YYYY HH:mm:ss'),
                startTs: Date.now(),
                expanded: false,
            };
            setActiveTasks(prev => [...prev, task]);
            swForm.resetFields();
            message.success(`⏱ Task started — ${vals.operator} melakukan ${vals.vas_type}`);
        } catch {
            message.error('Isi Brand, SKU, VAS Type, dan Operator dulu!');
        }
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
        setFinishQty(1);
    };

    // ─── Save after entering Qty ───────────────
    const handleSaveQty = async () => {
        if (!qtyModalTask) return;
        try {
            const endTime = dayjs().format('M/D/YYYY HH:mm:ss');
            const record = {
                date: dayjs().format('M/D/YYYY'),
                start_time: qtyModalTask.startTime,
                end_time: endTime,
                brand: qtyModalTask.brand,
                sku: qtyModalTask.sku,
                vas_type: qtyModalTask.vas_type,
                qty: finishQty,
                operator: qtyModalTask.operator,
            };
            await vasApi.create(record);
            message.success(`✅ ${qtyModalTask.operator} — ${qtyModalTask.vas_type} selesai!`);

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
        const s = dayjs(start, 'M/D/YYYY HH:mm:ss');
        const e = dayjs(end, 'M/D/YYYY HH:mm:ss');
        if (!s.isValid() || !e.isValid()) return '-';
        const diff = e.diff(s, 'second');
        if (diff < 0) return '-';
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const sec = diff % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

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

    const filteredData = search
        ? data.filter((d: any) => Object.values(d).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
        : data;

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
        const headers = ['date', 'start_time', 'end_time', 'duration', 'brand', 'sku', 'vas_type', 'qty', 'operator'];
        const csv = '\uFEFF' + headers.join(',') + '\n' +
            data.map((r: any) => {
                const dur = computeDuration(r.start_time, r.end_time);
                return [r.date, r.start_time, r.end_time, dur, r.brand, r.sku, r.vas_type, r.qty, r.operator]
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
            const rows = lines.slice(1).map(line => {
                const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
                return {
                    date: cols[0] || '', start_time: cols[1] || '', end_time: cols[2] || '',
                    brand: cols[4] || '', sku: cols[5] || '', vas_type: cols[6] || '',
                    qty: parseInt(cols[7]) || 0, operator: cols[8] || '',
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
                        <Col xs={12} md={5}>
                            <Form.Item name="brand" label="Brand" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="Brand" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={5}>
                            <Form.Item name="sku" label="SKU" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="SKU" />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={5}>
                            <Form.Item name="vas_type" label="VAS Type" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Select placeholder="Pilih jenis VAS" options={[
                                    { value: 'Barcode', label: 'Barcode' },
                                    { value: 'Repacking / relabeling', label: 'Repacking / relabeling' },
                                    { value: 'Assembly', label: 'Assembly' },
                                    { value: 'Disassembly', label: 'Disassembly' },
                                    { value: 'Bundling', label: 'Bundling' },
                                    { value: 'Additional QC', label: 'Additional QC' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={5}>
                            <Form.Item name="operator" label="Operator" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input placeholder="Nama operator" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={4}>
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
                                                    sedang melakukan
                                                </Text>
                                                <Tag color="blue" style={{ marginLeft: 8 }}>{task.vas_type}</Tag>
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
                                                <Row gutter={8}>
                                                    <Col span={12}><Text style={{ color: 'rgba(255,255,255,0.4)' }}>Brand:</Text> <Text style={{ color: '#fff' }}>{task.brand}</Text></Col>
                                                    <Col span={12}><Text style={{ color: 'rgba(255,255,255,0.4)' }}>SKU:</Text> <Text style={{ color: '#fff' }}>{task.sku}</Text></Col>
                                                </Row>
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
                                                — {task.vas_type}
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
                title="⏱ Finish — Masukkan Qty"
                open={!!qtyModalTask}
                onCancel={() => setQtyModalTask(null)}
                onOk={handleSaveQty}
                okText="Simpan"
                width={400}
            >
                {qtyModalTask && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <Text style={{ color: '#60a5fa', fontWeight: 700 }}>{qtyModalTask.operator}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.4)' }}> — {qtyModalTask.vas_type}</Text>
                        </div>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Duration: </Text>
                            <Tag color="blue" style={{ fontSize: 18, padding: '4px 12px' }}>
                                {formatElapsed(elapsed[qtyModalTask.id] || 0)}
                            </Tag>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <Text style={{ display: 'block', marginBottom: 8 }}>Qty yang dikerjakan:</Text>
                            <InputNumber
                                value={finishQty}
                                onChange={v => setFinishQty(v || 1)}
                                min={1}
                                size="large"
                                style={{ width: 200 }}
                                autoFocus
                            />
                        </div>
                    </>
                )}
            </Modal>

            {/* ───── DATA TABLE ───── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0, color: '#fff' }}>VAS Records</Title>
                <Space>
                    <Input placeholder="Search..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ width: 200 }} />
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
                    <Button icon={<PlusOutlined />} onClick={handleAddManual}>Manual Add</Button>
                    <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport as any}>
                        <Button icon={<UploadOutlined />}>Import</Button>
                    </Upload>
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
                    <Form.Item name="vas_type" label="VAS Type"><Select placeholder="Pilih jenis VAS" options={[
                        { value: 'Barcode', label: 'Barcode' },
                        { value: 'Repacking / relabeling', label: 'Repacking / relabeling' },
                        { value: 'Assembly', label: 'Assembly' },
                        { value: 'Disassembly', label: 'Disassembly' },
                        { value: 'Bundling', label: 'Bundling' },
                        { value: 'Additional QC', label: 'Additional QC' },
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
