import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, DatePicker, Empty, message, Row, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
    arrivalsApi, attendancesApi, briefingsApi, employeesApi, inventoryProjectsApi, transactionsApi,
} from '../../api/client';

const { Text, Title } = Typography;

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
}

interface EmployeeRecord {
    nik: string;
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
    schedule_inbound?: string;
}

interface ScheduleInboundEntry {
    key: string;
    brand: string;
    total_qty: number;
    estimated_arrival: string;
}

interface PendingArrival extends ArrivalRecord {
    receive_qty: number;
    putaway_qty: number;
    status: 'Pending Receive' | 'Pending Putaway';
}

interface AttendanceSummary {
    key: string;
    jobdesc: string;
    manpowerType: 'Reguler' | 'Tambahan';
    shift1: number;
    shift2: number;
    shift3: number;
    total: number;
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

export default function DashboardBriefingTab() {
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
    const [arrivals, setArrivals] = useState<ArrivalRecord[]>([]);
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [projects, setProjects] = useState<InventoryProjectRecord[]>([]);
    const [briefings, setBriefings] = useState<BriefingRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [attendanceRes, employeeRes, arrivalRes, transactionRes, projectRes, briefingRes] = await Promise.all([
                attendancesApi.list(),
                employeesApi.list(),
                arrivalsApi.list(),
                transactionsApi.list(),
                inventoryProjectsApi.list(),
                briefingsApi.list(),
            ]);
            setAttendance(readList<AttendanceRecord>(attendanceRes.data));
            setEmployees(readList<EmployeeRecord>(employeeRes.data));
            setArrivals(readList<ArrivalRecord>(arrivalRes.data));
            setTransactions(readList<TransactionRecord>(transactionRes.data));
            setProjects(readList<InventoryProjectRecord>(projectRes.data));
            setBriefings(readList<BriefingRecord>(briefingRes.data));
        } catch {
            message.error('Gagal memuat laporan briefing');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const date = selectedDate.format('YYYY-MM-DD');
    const attendanceSummary = useMemo(() => {
        const employeeTypes = new Map(
            employees.map(employee => [employee.nik.toLowerCase(), employee.status?.trim() || 'Reguler']),
        );
        const summaryMap = new Map<string, AttendanceSummary>();

        attendance
            .filter(record => record.date?.slice(0, 10) === date)
            .forEach(record => {
                const jobdesc = record.jobdesc?.trim() || 'Lainnya';
                const manpowerType = employeeTypes.get(record.nik.toLowerCase()) === 'Tambahan'
                    ? 'Tambahan'
                    : 'Reguler';
                const key = `${manpowerType}|${jobdesc.toLowerCase()}`;
                const summary = summaryMap.get(key) || {
                    key,
                    jobdesc,
                    manpowerType,
                    shift1: 0,
                    shift2: 0,
                    shift3: 0,
                    total: 0,
                };
                const hour = Number(record.clock_in?.split(':')[0]);
                if (Number.isFinite(hour)) {
                    if (hour >= 6 && hour < 12) summary.shift1 += 1;
                    else if (hour >= 12 && hour < 15) summary.shift2 += 1;
                    else if (hour >= 15) summary.shift3 += 1;
                }
                summary.total += 1;
                summaryMap.set(key, summary);
            });

        return Array.from(summaryMap.values()).sort((a, b) => {
            if (a.manpowerType !== b.manpowerType) return a.manpowerType === 'Reguler' ? -1 : 1;
            const aRank = JOBDESC_ORDER.indexOf(a.jobdesc);
            const bRank = JOBDESC_ORDER.indexOf(b.jobdesc);
            return (aRank === -1 ? JOBDESC_ORDER.length : aRank)
                - (bRank === -1 ? JOBDESC_ORDER.length : bRank)
                || a.jobdesc.localeCompare(b.jobdesc);
        });
    }, [attendance, employees, date]);

    const briefing = useMemo(() => briefings
        .filter(item => item.date?.slice(0, 10) === date)
        .sort((a, b) => b.id - a.id)[0], [briefings, date]);

    const briefingNotes = useMemo(
        () => (briefing?.notes || '').split(/\r?\n/).map(note => note.trim()).filter(Boolean),
        [briefing],
    );

    const scheduleInbound = useMemo((): ScheduleInboundEntry[] => {
        if (!briefing?.schedule_inbound) return [];
        try {
            const entries: unknown = JSON.parse(briefing.schedule_inbound);
            if (!Array.isArray(entries)) throw new Error('Schedule inbound format is invalid');
            return entries.map((entry, index) => {
                const row = entry as Partial<ScheduleInboundEntry>;
                return {
                    key: row.key || `schedule-${index}`,
                    brand: row.brand || '',
                    total_qty: toNumber(row.total_qty),
                    estimated_arrival: row.estimated_arrival || '',
                };
            });
        } catch {
            message.error('Data Schedule Inbound tidak dapat dibaca');
            return [];
        }
    }, [briefing]);

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
        const receiptNo = (arrival.receipt_no || '').trim().toLowerCase();
        const totals = transactionTotals[receiptNo] || { receive: 0, putaway: 0 };
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

    const attendanceColumns: ColumnsType<AttendanceSummary> = [
        {
            title: 'Jobdesc', dataIndex: 'jobdesc', key: 'jobdesc',
            render: (value, record) => (
                <Space size={6}>
                    <span>{value}</span>
                    {record.manpowerType === 'Tambahan' && <Tag color="gold">Tambahan</Tag>}
                </Space>
            ),
        },
        { title: 'Shift 1', dataIndex: 'shift1', key: 'shift1', width: 90, align: 'center' },
        { title: 'Shift 2', dataIndex: 'shift2', key: 'shift2', width: 90, align: 'center' },
        { title: 'Shift 3', dataIndex: 'shift3', key: 'shift3', width: 90, align: 'center' },
        { title: 'Total', dataIndex: 'total', key: 'total', width: 90, align: 'center' },
    ];

    const arrivalColumns: ColumnsType<PendingArrival> = [
        { title: 'Receipt No', dataIndex: 'receipt_no', key: 'receipt_no', width: 140, render: value => value || '-' },
        { title: 'PO No', dataIndex: 'po_no', key: 'po_no', width: 120, render: value => value || '-' },
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100, render: value => value || '-' },
        { title: 'PO Qty', dataIndex: 'po_qty', key: 'po_qty', width: 80, render: toNumber },
        { title: 'Receive', dataIndex: 'receive_qty', key: 'receive_qty', width: 80 },
        { title: 'Putaway', dataIndex: 'putaway_qty', key: 'putaway_qty', width: 80 },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 140,
            render: value => <Tag color={value === 'Pending Putaway' ? 'orange' : 'red'}>{value}</Tag>,
        },
    ];

    const projectColumns: ColumnsType<InventoryProjectRecord> = [
        { title: 'Project', dataIndex: 'project_name', key: 'project_name', width: 190 },
        { title: 'Task', dataIndex: 'task', key: 'task', render: value => value || '-' },
        { title: 'Target Selesai', dataIndex: 'target_date', key: 'target_date', width: 130, render: value => value || '-' },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 90, render: value => value || 'Open' },
    ];

    const scheduleInboundColumns: ColumnsType<ScheduleInboundEntry> = [
        { title: 'Brand', dataIndex: 'brand', key: 'brand' },
        { title: 'Total Qty', dataIndex: 'total_qty', key: 'total_qty', width: 100, align: 'right' },
        { title: 'Estimasi Kedatangan', dataIndex: 'estimated_arrival', key: 'estimated_arrival', width: 150 },
    ];

    return (
        <div className="dashboard-briefing-tab">
            <div className="briefing-toolbar">
                <Space wrap>
                    <Text strong>Tanggal briefing</Text>
                    <DatePicker value={selectedDate} onChange={value => value && setSelectedDate(value)} format="DD/MM/YYYY" />
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
                    <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>Print / PDF</Button>
                </Space>
            </div>

            <section className="briefing-report-print">
                <header className="briefing-report-heading">
                    <Title level={2}>DAILY BRIEFING REPORT</Title>
                    <Text>{selectedDate.format('dddd, DD MMMM YYYY')}</Text>
                    <Text strong>Team Leader / PIC: {briefing?.pic || '-'}</Text>
                </header>

                <Row gutter={[16, 0]} className="briefing-report-grid">
                    <Col xs={24} md={12}>
                        <section className="briefing-report-section">
                            <Title level={4}>Ringkasan Daftar Hadir ({attendanceSummary.reduce((total, row) => total + row.total, 0)})</Title>
                            <Table
                                rowKey="key"
                                size="small"
                                columns={attendanceColumns}
                                dataSource={attendanceSummary}
                                loading={loading}
                                pagination={false}
                                locale={{ emptyText: <Empty description="Tidak ada data attendance pada tanggal ini" /> }}
                            />
                        </section>
                    </Col>
                    <Col xs={24} md={12}>
                        <section className="briefing-report-section">
                            <Title level={4}>Pending Project ({openProjects.length})</Title>
                            <Table
                                rowKey="id"
                                size="small"
                                columns={projectColumns}
                                dataSource={openProjects}
                                loading={loading}
                                pagination={false}
                                scroll={{ x: 'max-content' }}
                                locale={{ emptyText: <Empty description="Tidak ada pending project" /> }}
                            />
                        </section>
                    </Col>
                </Row>

                <Row gutter={[16, 0]} className="briefing-report-grid">
                    <Col xs={24} md={12}>
                        <section className="briefing-report-section">
                            <Title level={4}>Pending Inbound ({pendingArrivals.length})</Title>
                            <Table
                                rowKey="id"
                                size="small"
                                columns={arrivalColumns}
                                dataSource={pendingArrivals}
                                loading={loading}
                                pagination={false}
                                scroll={{ x: 'max-content' }}
                                locale={{ emptyText: <Empty description="Tidak ada pending inbound" /> }}
                            />
                        </section>
                    </Col>
                    <Col xs={24} md={12}>
                        <section className="briefing-report-section">
                            <Title level={4}>Schedule Inbound ({scheduleInbound.length})</Title>
                            <Table
                                rowKey="key"
                                size="small"
                                columns={scheduleInboundColumns}
                                dataSource={scheduleInbound}
                                loading={loading}
                                pagination={false}
                                locale={{ emptyText: <Empty description="Belum ada schedule inbound" /> }}
                            />
                        </section>
                    </Col>
                </Row>

                <section className="briefing-report-section briefing-notes">
                    <Title level={4}>Catatan / Arahan Briefing</Title>
                    {briefingNotes.length > 0 ? (
                        <ol className="briefing-notes-list">
                            {briefingNotes.map((note, index) => (
                                <li key={`${index}-${note}`}>{note}</li>
                            ))}
                        </ol>
                    ) : (
                        <div className="briefing-notes-content">Belum ada catatan briefing untuk tanggal ini.</div>
                    )}
                    <Text className="briefing-updated-by">Dicatat oleh: {briefing?.pic || '-'}</Text>
                </section>
            </section>
        </div>
    );
}
