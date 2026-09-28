import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Empty, message, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
    arrivalsApi, attendancesApi, briefingsApi, inventoryProjectsApi, transactionsApi,
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

function showTime(value?: string): string {
    return value ? value.substring(0, 5) : '-';
}

export default function DashboardBriefingTab() {
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [arrivals, setArrivals] = useState<ArrivalRecord[]>([]);
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [projects, setProjects] = useState<InventoryProjectRecord[]>([]);
    const [briefings, setBriefings] = useState<BriefingRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [attendanceRes, arrivalRes, transactionRes, projectRes, briefingRes] = await Promise.all([
                attendancesApi.list(),
                arrivalsApi.list(),
                transactionsApi.list(),
                inventoryProjectsApi.list(),
                briefingsApi.list(),
            ]);
            setAttendance(readList<AttendanceRecord>(attendanceRes.data));
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
    const dayAttendance = useMemo(() => attendance
        .filter(record => record.date?.slice(0, 10) === date)
        .sort((a, b) => {
            const aRank = JOBDESC_ORDER.indexOf(a.jobdesc || '');
            const bRank = JOBDESC_ORDER.indexOf(b.jobdesc || '');
            return (aRank === -1 ? JOBDESC_ORDER.length : aRank)
                - (bRank === -1 ? JOBDESC_ORDER.length : bRank)
                || (a.company || '').localeCompare(b.company || '')
                || a.name.localeCompare(b.name);
        }), [attendance, date]);

    const briefing = useMemo(() => briefings
        .filter(item => item.date?.slice(0, 10) === date)
        .sort((a, b) => b.id - a.id)[0], [briefings, date]);

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

    const attendanceColumns: ColumnsType<AttendanceRecord> = [
        { title: 'Nama', dataIndex: 'name', key: 'name', width: 180, ellipsis: true },
        { title: 'NIK', dataIndex: 'nik', key: 'nik', width: 110 },
        { title: 'Company', dataIndex: 'company', key: 'company', width: 90, render: value => value || '-' },
        { title: 'Job', dataIndex: 'jobdesc', key: 'jobdesc', width: 150, render: value => value || '-' },
        { title: 'Clock In', dataIndex: 'clock_in', key: 'clock_in', width: 80, render: showTime },
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

                <section className="briefing-report-section">
                    <Title level={4}>Daftar Hadir ({dayAttendance.length})</Title>
                    <Table
                        rowKey="id"
                        size="small"
                        columns={attendanceColumns}
                        dataSource={dayAttendance}
                        loading={loading}
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                        locale={{ emptyText: <Empty description="Tidak ada data attendance pada tanggal ini" /> }}
                    />
                </section>

                <div className="briefing-pending-grid">
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
                </div>

                <section className="briefing-report-section briefing-notes">
                    <Title level={4}>Catatan / Arahan Briefing</Title>
                    <div className="briefing-notes-content">{briefing?.notes?.trim() || 'Belum ada catatan briefing untuk tanggal ini.'}</div>
                    <Text className="briefing-updated-by">Dicatat oleh: {briefing?.pic || '-'}</Text>
                </section>
            </section>
        </div>
    );
}
