import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Button, Card, Col, DatePicker, Empty, Input, message, Popconfirm, Row,
    Space, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SaveOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import {
    arrivalsApi, attendancesApi, briefingsApi, inventoryProjectsApi, transactionsApi,
} from '../api/client';

const { Title, Text } = Typography;
const { TextArea } = Input;

const JOBDESC_ORDER = [
    'Admin',
    'Inspect',
    'Putaway',
    'VAS',
    'Damage Project',
    'Troubleshoot',
    'Cycle Count',
    'Project Inventory',
    'Bongkaran',
];

interface AttendanceRecord {
    id: number;
    date: string;
    nik: string;
    name: string;
    company?: string;
    jobdesc?: string;
    clock_in?: string;
    clock_out?: string;
    status?: string;
}

interface ArrivalRecord {
    id: number;
    date: string;
    receipt_no?: string;
    po_no?: string;
    brand?: string;
    supplier?: string;
    po_qty?: number | string;
}

interface TransactionRecord {
    receipt_no?: string;
    qty?: number | string;
    operate_type?: string;
}

interface InventoryProjectRecord {
    id: number;
    project_name: string;
    task?: string;
    target_date?: string;
    status?: string;
}

interface BriefingRecord {
    id: number;
    date: string;
    pic?: string;
    notes?: string;
    updated_by?: string;
}

interface PendingArrival extends ArrivalRecord {
    receive_qty: number;
    putaway_qty: number;
    status: 'Pending Receive' | 'Pending Putaway';
}

function readList<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === 'object' && 'data' in value && Array.isArray(value.data)) {
        return value.data as T[];
    }
    return [];
}

function toNumber(value: number | string | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function displayTime(value?: string): string {
    return value ? value.substring(0, 5) : '-';
}

export default function BriefingPage() {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [briefings, setBriefings] = useState<BriefingRecord[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [arrivals, setArrivals] = useState<ArrivalRecord[]>([]);
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [projects, setProjects] = useState<InventoryProjectRecord[]>([]);
    const [pic, setPic] = useState(user?.username || '');
    const [notes, setNotes] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [briefingRes, attendanceRes, arrivalRes, transactionRes, projectRes] = await Promise.all([
                briefingsApi.list(),
                attendancesApi.list(),
                arrivalsApi.list(),
                transactionsApi.list(),
                inventoryProjectsApi.list(),
            ]);
            setBriefings(readList<BriefingRecord>(briefingRes.data));
            setAttendance(readList<AttendanceRecord>(attendanceRes.data));
            setArrivals(readList<ArrivalRecord>(arrivalRes.data));
            setTransactions(readList<TransactionRecord>(transactionRes.data));
            setProjects(readList<InventoryProjectRecord>(projectRes.data));
        } catch {
            message.error('Gagal memuat data briefing');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const attendanceForDate = useMemo(() => {
        const date = selectedDate.format('YYYY-MM-DD');
        return attendance
            .filter(record => record.date?.slice(0, 10) === date)
            .sort((a, b) => {
                const aRank = JOBDESC_ORDER.indexOf(a.jobdesc || '');
                const bRank = JOBDESC_ORDER.indexOf(b.jobdesc || '');
                const orderedA = aRank === -1 ? JOBDESC_ORDER.length : aRank;
                const orderedB = bRank === -1 ? JOBDESC_ORDER.length : bRank;
                return orderedA - orderedB
                    || (a.company || '').localeCompare(b.company || '')
                    || a.name.localeCompare(b.name);
            });
    }, [attendance, selectedDate]);

    const transactionTotals = useMemo(() => {
        const totals: Record<string, { receive: number; putaway: number }> = {};
        transactions.forEach(transaction => {
            const key = (transaction.receipt_no || '').trim().toLowerCase();
            if (!key) return;
            if (!totals[key]) totals[key] = { receive: 0, putaway: 0 };
            const type = (transaction.operate_type || '').trim().toLowerCase();
            if (type === 'receive' || type === 'receiving') totals[key].receive += toNumber(transaction.qty);
            if (type === 'putaway') totals[key].putaway += toNumber(transaction.qty);
        });
        return totals;
    }, [transactions]);

    const pendingArrivals = useMemo((): PendingArrival[] => arrivals.flatMap(arrival => {
        const key = (arrival.receipt_no || '').trim().toLowerCase();
        const totals = transactionTotals[key] || { receive: 0, putaway: 0 };
        const poQty = toNumber(arrival.po_qty);
        if (totals.receive >= poQty && totals.putaway >= poQty) return [];
        return [{
            ...arrival,
            receive_qty: totals.receive,
            putaway_qty: totals.putaway,
            status: totals.receive >= poQty ? 'Pending Putaway' : 'Pending Receive',
        }];
    }), [arrivals, transactionTotals]);

    const openProjects = useMemo(
        () => projects.filter(project => project.status !== 'Closed'),
        [projects],
    );

    const startNewBriefing = () => {
        setEditingId(null);
        setSelectedDate(dayjs());
        setPic(user?.username || '');
        setNotes('');
    };

    const editBriefing = (briefing: BriefingRecord) => {
        setEditingId(briefing.id);
        setSelectedDate(dayjs(briefing.date));
        setPic(briefing.pic || '');
        setNotes(briefing.notes || '');
    };

    const saveBriefing = async () => {
        if (!selectedDate.isValid()) {
            message.warning('Pilih tanggal briefing');
            return;
        }
        if (!pic.trim()) {
            message.warning('Isi nama Team Leader/PIC');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                date: selectedDate.format('YYYY-MM-DD'),
                pic: pic.trim(),
                notes: notes.trim(),
            };
            if (editingId) {
                await briefingsApi.update(editingId, payload);
                message.success('Catatan briefing berhasil diperbarui');
            } else {
                await briefingsApi.create(payload);
                message.success('Briefing berhasil disimpan');
            }
            startNewBriefing();
            await fetchData();
        } catch {
            message.error('Gagal menyimpan briefing');
        } finally {
            setSaving(false);
        }
    };

    const deleteBriefing = async (id: number) => {
        try {
            await briefingsApi.remove(id);
            if (editingId === id) startNewBriefing();
            message.success('Briefing berhasil dihapus');
            await fetchData();
        } catch {
            message.error('Gagal menghapus briefing');
        }
    };

    const attendanceColumns: ColumnsType<AttendanceRecord> = [
        {
            title: 'Nama', dataIndex: 'name', key: 'name', width: 180, ellipsis: true,
            render: value => <span title={value}>{value}</span>,
        },
        { title: 'NIK', dataIndex: 'nik', key: 'nik', width: 120 },
        { title: 'Company', dataIndex: 'company', key: 'company', width: 100, render: value => value || '-' },
        { title: 'Divisi / Jobdesc', dataIndex: 'jobdesc', key: 'jobdesc', width: 180, render: value => value || '-' },
        { title: 'Clock In', dataIndex: 'clock_in', key: 'clock_in', width: 90, render: displayTime },
    ];

    const pendingArrivalColumns: ColumnsType<PendingArrival> = [
        { title: 'Tgl Kedatangan', dataIndex: 'date', key: 'date', width: 130 },
        { title: 'Receipt No', dataIndex: 'receipt_no', key: 'receipt_no', width: 150, render: value => value || '-' },
        { title: 'PO No', dataIndex: 'po_no', key: 'po_no', width: 140, render: value => value || '-' },
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120, render: value => value || '-' },
        { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', render: value => value || '-' },
        { title: 'PO Qty', dataIndex: 'po_qty', key: 'po_qty', width: 90, render: toNumber },
        { title: 'Receive', dataIndex: 'receive_qty', key: 'receive_qty', width: 90 },
        { title: 'Putaway', dataIndex: 'putaway_qty', key: 'putaway_qty', width: 90 },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 150,
            render: value => <Tag color={value === 'Pending Putaway' ? 'orange' : 'red'}>{value}</Tag>,
        },
    ];

    const projectColumns: ColumnsType<InventoryProjectRecord> = [
        { title: 'Project', dataIndex: 'project_name', key: 'project_name', width: 220 },
        { title: 'Task', dataIndex: 'task', key: 'task', render: value => value || '-' },
        { title: 'Target Selesai', dataIndex: 'target_date', key: 'target_date', width: 140, render: value => value || '-' },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: value => <Tag color="blue">{value || 'Open'}</Tag> },
    ];

    const historyColumns: ColumnsType<BriefingRecord> = [
        { title: 'Tanggal Briefing', dataIndex: 'date', key: 'date', width: 150 },
        { title: 'Team Leader / PIC', dataIndex: 'pic', key: 'pic', width: 190 },
        {
            title: 'Catatan', dataIndex: 'notes', key: 'notes',
            render: value => <div style={{ whiteSpace: 'pre-wrap', maxHeight: 90, overflow: 'auto' }}>{value || '-'}</div>,
        },
        { title: 'Diperbarui Oleh', dataIndex: 'updated_by', key: 'updated_by', width: 150, render: value => value || '-' },
        {
            title: 'Aksi', key: 'actions', width: 110,
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => editBriefing(record)} aria-label="Edit briefing" />
                    <Popconfirm title="Hapus briefing ini?" onConfirm={() => deleteBriefing(record.id)} okText="Ya" cancelText="Batal">
                        <Button type="text" danger icon={<DeleteOutlined />} aria-label="Hapus briefing" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const sortedBriefings = [...briefings].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

    return (
        <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0, color: '#fff' }}>Briefing Manpower</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
                    <Button icon={<PlusOutlined />} onClick={startNewBriefing}>Briefing Baru</Button>
                </Space>
            </div>

            <Card
                title={editingId ? 'Edit Catatan Briefing' : 'Catatan Briefing'}
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}
                styles={{ header: { color: '#fff' } }}
            >
                <Row gutter={[16, 12]} style={{ marginBottom: 12 }}>
                    <Col xs={24} sm={8} md={6}>
                        <Text strong style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Tanggal Briefing</Text>
                        <DatePicker
                            value={selectedDate}
                            onChange={value => value && setSelectedDate(value)}
                            format="DD/MM/YYYY"
                            style={{ width: '100%' }}
                        />
                    </Col>
                    <Col xs={24} sm={16} md={8}>
                        <Text strong style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Team Leader / PIC</Text>
                        <Input value={pic} onChange={event => setPic(event.target.value)} placeholder="Nama Team Leader / PIC" />
                    </Col>
                </Row>
            </Card>

            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card
                        title={`Daftar Hadir — ${selectedDate.format('DD MMMM YYYY')} (${attendanceForDate.length})`}
                        style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}
                        styles={{ header: { color: '#fff' } }}
                    >
                        <Table
                            rowKey="id"
                            size="small"
                            columns={attendanceColumns}
                            dataSource={attendanceForDate}
                            loading={loading}
                            pagination={{ pageSize: 10, showTotal: total => `Total: ${total}` }}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: <Empty description="Tidak ada data attendance pada tanggal ini" /> }}
                        />
                    </Card>
                </Col>
                <Col xs={24} xl={14}>
                    <Card
                        title={`Pending Inbound (${pendingArrivals.length})`}
                        style={{ height: '100%', background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}
                        styles={{ header: { color: '#fff' } }}
                    >
                        <Table
                            rowKey="id"
                            size="small"
                            columns={pendingArrivalColumns}
                            dataSource={pendingArrivals}
                            loading={loading}
                            pagination={{ pageSize: 8, showTotal: total => `Total: ${total}` }}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: <Empty description="Tidak ada pending inbound" /> }}
                        />
                    </Card>
                </Col>
                <Col xs={24} xl={10}>
                    <Card
                        title={`Pending Project (${openProjects.length})`}
                        style={{ height: '100%', background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}
                        styles={{ header: { color: '#fff' } }}
                    >
                        <Table
                            rowKey="id"
                            size="small"
                            columns={projectColumns}
                            dataSource={openProjects}
                            loading={loading}
                            pagination={{ pageSize: 8, showTotal: total => `Total: ${total}` }}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: <Empty description="Tidak ada pending project" /> }}
                        />
                    </Card>
                </Col>
                <Col span={24}>
                    <Card
                        title="Catatan / Arahan Team Leader atau PIC"
                        style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}
                        styles={{ header: { color: '#fff' } }}
                    >
                        <TextArea
                            value={notes}
                            onChange={event => setNotes(event.target.value)}
                            rows={5}
                            placeholder="Tulis catatan atau arahan briefing..."
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <Space>
                                {editingId && <Button onClick={startNewBriefing}>Batal Edit</Button>}
                                <Button type="primary" icon={<SaveOutlined />} onClick={saveBriefing} loading={saving}>
                                    {editingId ? 'Simpan Perubahan' : 'Simpan Briefing'}
                                </Button>
                            </Space>
                        </div>
                    </Card>
                </Col>
                <Col span={24}>
                    <Card
                        title="Riwayat Briefing"
                        style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}
                        styles={{ header: { color: '#fff' } }}
                    >
                        <Table
                            rowKey="id"
                            size="small"
                            columns={historyColumns}
                            dataSource={sortedBriefings}
                            loading={loading}
                            pagination={{ pageSize: 10, showTotal: total => `Total: ${total}` }}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: <Empty description="Belum ada catatan briefing" /> }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
