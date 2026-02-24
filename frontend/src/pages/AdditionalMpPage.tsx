import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Select, Space, Typography, message } from 'antd';
import { LeftOutlined, RightOutlined, ReloadOutlined } from '@ant-design/icons';
import { schedulesApi, employeesApi } from '../api/client';
import dayjs from 'dayjs';

const { Title } = Typography;

const MONTH_LABELS: Record<string, string> = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

export default function AdditionalMpPage() {
    const [schedData, setSchedData] = useState<any[]>([]);
    const [empData, setEmpData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [sch, emp] = await Promise.all([schedulesApi.list(), employeesApi.list()]);
            setSchedData(sch.data || []);
            setEmpData(emp.data || []);
        } catch {
            message.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Build employee status map: nik -> status
    const empStatusMap = useMemo(() => {
        const map: Record<string, string> = {};
        empData.forEach((e: any) => {
            if (e.nik) map[e.nik.toLowerCase()] = (e.status || '').trim();
        });
        return map;
    }, [empData]);

    // Month options from schedule data
    const monthOptions = useMemo(() => {
        const months = new Set<string>();
        schedData.forEach((s: any) => {
            const d = dayjs(s.date, 'YYYY-MM-DD');
            if (d.isValid()) months.add(d.format('YYYY-MM'));
        });
        const sorted = Array.from(months).sort();
        return sorted.map(m => {
            const [yyyy, mm] = m.split('-');
            return { label: `${MONTH_LABELS[mm] || mm} ${yyyy}`, value: m };
        });
    }, [schedData]);

    // Filter & aggregate: only Tambahan employees, group by date
    const tableData = useMemo(() => {
        const dateMap: Record<string, { count: number; tasks: Set<string> }> = {};

        schedData.forEach((s: any) => {
            const d = dayjs(s.date, 'YYYY-MM-DD');
            if (!d.isValid()) return;
            if (d.format('YYYY-MM') !== currentMonth) return;

            const nik = (s.nik || '').toLowerCase();
            const empStatus = empStatusMap[nik] || '';
            if (empStatus !== 'Tambahan') return;

            // Skip Off entries
            const jobdesc = (s.jobdesc || '').trim();
            if (!jobdesc || jobdesc.toLowerCase() === 'off') return;

            const dateKey = s.date;
            if (!dateMap[dateKey]) dateMap[dateKey] = { count: 0, tasks: new Set() };
            dateMap[dateKey].count += 1;
            dateMap[dateKey].tasks.add(jobdesc);
        });

        return Object.entries(dateMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, { count, tasks }]) => ({
                key: date,
                date,
                additionalMp: count,
                tasks: Array.from(tasks),
            }));
    }, [schedData, empStatusMap, currentMonth]);

    const prevMonth = () => setCurrentMonth(dayjs(currentMonth + '-01').subtract(1, 'month').format('YYYY-MM'));
    const nextMonth = () => setCurrentMonth(dayjs(currentMonth + '-01').add(1, 'month').format('YYYY-MM'));
    const thisMonth = () => setCurrentMonth(dayjs().format('YYYY-MM'));

    const totalMp = tableData.reduce((sum, r) => sum + r.additionalMp, 0);

    const DAY_NAMES: Record<number, string> = {
        0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu',
    };

    const [yyyy, mm] = currentMonth.split('-');
    const monthLabel = `${MONTH_LABELS[mm] || mm} ${yyyy}`;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>👷 Additional Manpower & Task</Title>
                <Space>
                    <Button icon={<LeftOutlined />} onClick={prevMonth} size="small" />
                    <Select
                        value={currentMonth}
                        onChange={setCurrentMonth}
                        options={monthOptions}
                        style={{ width: 180 }}
                    />
                    <Button icon={<RightOutlined />} onClick={nextMonth} size="small" />
                    <Button size="small" onClick={thisMonth}>Bulan Ini</Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
                </Space>
            </div>

            {/* Summary */}
            <div style={{
                display: 'flex', gap: 16, marginBottom: 20,
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    borderRadius: 12, padding: '16px 24px', minWidth: 160,
                }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 }}>Total Hari</div>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{tableData.length}</div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                    borderRadius: 12, padding: '16px 24px', minWidth: 160,
                }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 }}>Total MP Tambahan</div>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{totalMp.toLocaleString()}</div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: 12, padding: '16px 24px', minWidth: 160,
                }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 }}>Rata-rata/Hari</div>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>
                        {tableData.length > 0 ? (totalMp / tableData.length).toFixed(1) : 0}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div style={{
                background: '#1a1f3a',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden',
            }}>
                <div style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: '#fff', fontWeight: 600, fontSize: 14,
                }}>
                    📅 {monthLabel}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Hari</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Additional MP</th>
                                <th style={thStyle}>Task</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>
                                        Tidak ada data MP tambahan untuk bulan ini
                                    </td>
                                </tr>
                            ) : (
                                tableData.map((row) => {
                                    const d = dayjs(row.date);
                                    const dayOfWeek = d.day();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    return (
                                        <tr key={row.key} style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            background: isWeekend ? 'rgba(248,113,113,0.05)' : undefined,
                                        }}>
                                            <td style={{ ...tdStyle, fontWeight: 500, width: 130 }}>
                                                {d.format('D MMM YYYY')}
                                            </td>
                                            <td style={{
                                                ...tdStyle, width: 90,
                                                color: isWeekend ? '#f87171' : 'rgba(255,255,255,0.6)',
                                            }}>
                                                {DAY_NAMES[dayOfWeek] || ''}
                                            </td>
                                            <td style={{
                                                ...tdStyle, textAlign: 'center', width: 130,
                                                fontWeight: 700, fontSize: 16, color: '#c084fc',
                                            }}>
                                                {row.additionalMp}
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {row.tasks.map((task, i) => (
                                                        <span key={i} style={{ color: 'rgba(255,255,255,0.85)' }}>
                                                            {i + 1}. {task}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            {tableData.length > 0 && (
                                <tr style={{ background: 'rgba(99,102,241,0.15)', borderTop: '2px solid rgba(99,102,241,0.3)' }}>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: '#60a5fa' }} colSpan={2}>Total</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 16, color: '#60a5fa' }}>
                                        {totalMp}
                                    </td>
                                    <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                                        {tableData.length} hari kerja
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.6)',
    fontSize: 12, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
    padding: '10px 16px', color: 'rgba(255,255,255,0.85)', fontSize: 13,
    borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top',
};
