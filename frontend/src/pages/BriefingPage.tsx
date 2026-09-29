import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Button, Card, Col, DatePicker, Empty, Input, InputNumber, message, Popconfirm, Row, Select,
    Space, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SaveOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import {
    arrivalsApi, attendancesApi, briefingsApi, dailyInboundSchedulesApi, inventoryProjectsApi, transactionsApi,
} from '../api/client';

const { Title, Text } = Typography;
const SHIFT_OPTIONS = ['Shift 1', 'Shift 2', 'Shift 3'].map(value => ({ label: value, value }));
const JOBDESC_ORDER = [
    'Admin',
    'Inspect',
    'Putaway',
    'VAS',
    'Damage Project',
    'Troubleshoot',
    'Investigation VAR',
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
    shift?: string;
    pic?: string;
    notes?: string;
    schedule_inbound?: string;
    updated_by?: string;
}

interface DailyInboundScheduleRecord {
    id: number;
    date: string;
    entries: string;
}

interface ScheduleInboundEntry {
    key: string;
    brand: string;
    total_qty?: number;
    estimated_arrival: string;
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

function parseScheduleInbound(value?: string): ScheduleInboundEntry[] {
    if (!value) return [];
    try {
        const entries: unknown = JSON.parse(value);
        if (!Array.isArray(entries)) throw new Error('Schedule inbound format is invalid');
        return entries.map((entry, index) => {
            const row = entry as Partial<ScheduleInboundEntry>;
            return {
                key: row.key || `schedule-${index}`,
                brand: row.brand || '',
                total_qty: row.total_qty,
                estimated_arrival: row.estimated_arrival || '',
            };
        });
    } catch {
        message.error('Data Schedule Inbound tidak dapat dibaca');
        return [];
    }
}

function newScheduleInboundEntry(): ScheduleInboundEntry {
    return { key: `${Date.now()}-${Math.random()}`, brand: '', total_qty: undefined, estimated_arrival: '' };
}

export default function BriefingPage() {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [briefings, setBriefings] = useState<BriefingRecord[]>([]);
    const [dailyInboundSchedules, setDailyInboundSchedules] = useState<DailyInboundScheduleRecord[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [arrivals, setArrivals] = useState<ArrivalRecord[]>([]);
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [projects, setProjects] = useState<InventoryProjectRecord[]>([]);
    const [shift, setShift] = useState('Shift 1');
    const [pic, setPic] = useState(user?.username || '');
    const [notes, setNotes] = useState<string[]>(['']);
    const [scheduleInbound, setScheduleInbound] = useState<ScheduleInboundEntry[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [briefingRes, dailyScheduleRes, attendanceRes, arrivalRes, transactionRes, projectRes] = await Promise.all([
                briefingsApi.list(),
                dailyInboundSchedulesApi.list(),
                attendancesApi.list(),
                arrivalsApi.list(),
                transactionsApi.list(),
                inventoryProjectsApi.list(),
            ]);
            setBriefings(readList<BriefingRecord>(briefingRes.data));
            setDailyInboundSchedules(readList<DailyInboundScheduleRecord>(dailyScheduleRes.data));
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

    const savedScheduleInboundForDate = useMemo(() => {
        const date = selectedDate.format('YYYY-MM-DD');
        const dailySchedule = dailyInboundSchedules.find(record => record.date?.slice(0, 10) === date);
        if (dailySchedule) return parseScheduleInbound(dailySchedule.entries);

        const legacySchedule = [...briefings]
            .filter(record => record.date?.slice(0, 10) === date && record.schedule_inbound)
            .sort((a, b) => b.id - a.id)[0];
        return parseScheduleInbound(legacySchedule?.schedule_inbound);
    }, [briefings, dailyInboundSchedules, selectedDate]);

    useEffect(() => {
        setScheduleInbound(savedScheduleInboundForDate);
    }, [savedScheduleInboundForDate]);

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
        setShift('Shift 1');
        setPic(user?.username || '');
        setNotes(['']);
    };

    const editBriefing = (briefing: BriefingRecord) => {
        setEditingId(briefing.id);
        setSelectedDate(dayjs(briefing.date));
        setShift(briefing.shift || 'Shift 1');
        setPic(briefing.pic || '');
        setNotes(briefing.notes ? briefing.notes.split(/\r?\n/) : ['']);
    };

    const handleDateChange = (date: dayjs.Dayjs | null) => {
        if (!date) return;
        setSelectedDate(date);
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
                shift,
                pic: pic.trim(),
                notes: notes.map(note => note.trim()).filter(Boolean).join('\n'),
            };
            if (editingId) {
                await briefingsApi.update(editingId, payload);
                message.success('Catatan briefing berhasil diperbarui');
            } else {
                await briefingsApi.create(payload);
                message.success('Briefing berhasil disimpan');
            }
            await fetchData();
        } catch {
            message.error('Gagal menyimpan briefing');
        } finally {
            setSaving(false);
        }
    };

    const saveDailyScheduleInbound = async () => {
        const date = selectedDate.format('YYYY-MM-DD');
        const payload = {
            date,
            entries: JSON.stringify(scheduleInbound.filter(entry =>
                entry.brand.trim() || entry.total_qty != null || entry.estimated_arrival,
            ).map(({ brand, total_qty, estimated_arrival }) => ({
                brand: brand.trim(),
                total_qty: total_qty ?? 0,
                estimated_arrival,
            }))),
        };
        setSaving(true);
        try {
            const existing = dailyInboundSchedules.find(record => record.date?.slice(0, 10) === date);
            const response = existing
                ? await dailyInboundSchedulesApi.update(existing.id, payload)
                : await dailyInboundSchedulesApi.create(payload);
            const savedRecord = response.data as DailyInboundScheduleRecord;
            setDailyInboundSchedules(current => [
                ...current.filter(record => record.date?.slice(0, 10) !== date),
                savedRecord,
            ]);
            message.success('Schedule inbound harian berhasil disimpan');
        } catch {
            message.error('Gagal menyimpan schedule inbound harian');
        } finally {
            setSaving(false);
        }
    };

    const deleteBriefing = async (id: number) => {
        try {
            await briefingsApi.remove(id);
            if (editingId === id) {
                setEditingId(null);
                setPic(user?.username || '');
                setShift('Shift 1');
                setNotes(['']);
            }
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

    const scheduleInboundColumns: ColumnsType<ScheduleInboundEntry> = [
        {
            title: 'Brand', dataIndex: 'brand', key: 'brand',
            render: (value, entry) => (
                <Input
                    value={value}
                    placeholder="Nama brand"
                    onChange={event => setScheduleInbound(current => current.map(row =>
                        row.key === entry.key ? { ...row, brand: event.target.value } : row,
                    ))}
                />
            ),
        },
        {
            title: 'Total Qty', dataIndex: 'total_qty', key: 'total_qty', width: 130,
            render: (value, entry) => (
                <InputNumber
                    min={0}
                    precision={0}
                    value={value}
                    style={{ width: '100%' }}
                    onChange={qty => setScheduleInbound(current => current.map(row =>
                        row.key === entry.key ? { ...row, total_qty: qty ?? undefined } : row,
                    ))}
                />
            ),
        },
        {
            title: 'Estimasi Kedatangan', dataIndex: 'estimated_arrival', key: 'estimated_arrival', width: 170,
            render: (value, entry) => (
                <Input
                    type="time"
                    value={value}
                    onChange={event => setScheduleInbound(current => current.map(row =>
                        row.key === entry.key ? { ...row, estimated_arrival: event.target.value } : row,
                    ))}
                />
            ),
        },
        {
            title: 'Aksi', key: 'action', width: 70,
            render: (_, entry) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="Hapus schedule inbound"
                    onClick={() => setScheduleInbound(current => current.filter(row => row.key !== entry.key))}
                />
            ),
        },
    ];

    const historyColumns: ColumnsType<BriefingRecord> = [
        { title: 'Tanggal Briefing', dataIndex: 'date', key: 'date', width: 150 },
        { title: 'Shift', dataIndex: 'shift', key: 'shift', width: 100, render: value => value || 'Shift 1' },
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
                title={editingId ? 'Edit Briefing' : 'Briefing Baru'}
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}
                styles={{ header: { color: '#fff' } }}
            >
                <Row gutter={[16, 12]} style={{ marginBottom: 12 }}>
                    <Col xs={24} sm={8} md={6}>
                        <Text strong style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Tanggal Briefing</Text>
                        <DatePicker
                            value={selectedDate}
                            onChange={handleDateChange}
                            format="DD/MM/YYYY"
                            style={{ width: '100%' }}
                        />
                    </Col>
                    <Col xs={24} sm={8} md={4}>
                        <Text strong style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Shift</Text>
                        <Select
                            value={shift}
                            options={SHIFT_OPTIONS}
                            onChange={setShift}
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
                <Col xs={24} xl={12}>
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
                <Col xs={24} xl={12}>
                    <Card
                        title={`Schedule Inbound — ${selectedDate.format('DD/MM/YYYY')} (${scheduleInbound.length})`}
                        extra={(
                            <Space>
                                <Button size="small" icon={<PlusOutlined />} onClick={() => setScheduleInbound(current => [...current, newScheduleInboundEntry()])}>Tambah</Button>
                                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveDailyScheduleInbound} loading={saving}>Simpan Harian</Button>
                            </Space>
                        )}
                        style={{ height: '100%', background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}
                        styles={{ header: { color: '#fff' } }}
                    >
                        <Table
                            rowKey="key"
                            size="small"
                            columns={scheduleInboundColumns}
                            dataSource={scheduleInbound}
                            pagination={false}
                            locale={{ emptyText: <Empty description="Belum ada schedule inbound" /> }}
                        />
                    </Card>
                </Col>
                <Col span={24}>
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
                        <div className="briefing-note-list">
                            {notes.map((note, index) => (
                                <div className="briefing-note-editor-row" key={index}>
                                    <Text strong className="briefing-note-number">{index + 1}.</Text>
                                    <Input
                                        value={note}
                                        placeholder={`Catatan atau arahan ke-${index + 1}`}
                                        onChange={event => setNotes(current => current.map((item, itemIndex) =>
                                            itemIndex === index ? event.target.value : item,
                                        ))}
                                    />
                                    <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        aria-label={`Hapus catatan ${index + 1}`}
                                        onClick={() => setNotes(current => current.filter((_, itemIndex) => itemIndex !== index))}
                                    />
                                </div>
                            ))}
                            <Button
                                icon={<PlusOutlined />}
                                onClick={() => setNotes(current => [...current, ''])}
                            >
                                Tambah Catatan
                            </Button>
                        </div>
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
