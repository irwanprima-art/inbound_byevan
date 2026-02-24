import { useState, useMemo } from 'react';
import { Card, Select, Space } from 'antd';
import ResizableTable from '../../components/ResizableTable';
import dayjs from 'dayjs';

interface Props {
    attData: any[];
    empData: any[];
}

export default function DashboardManpowerTab({ attData, empData }: Props) {
    // Build employee status map: nik -> status (Reguler/Tambahan)
    const empStatusMap: Record<string, string> = {};
    empData.forEach((e: any) => {
        if (e.nik) empStatusMap[e.nik.toLowerCase()] = (e.status || '').trim();
    });

    // Jobdesc → Divisi mapping
    const divisiMap: Record<string, string> = {
        'Troubleshoot': 'Inventory', 'Project Inventory': 'Inventory',
        'Admin': 'Inbound', 'VAS': 'Inbound', 'Return': 'Return',
        'Putaway': 'Inbound', 'Inspect': 'Inbound', 'Bongkaran': 'Inbound',
        'Damage Project': 'Inventory', 'Cycle Count': 'Inventory',
        'Receive': 'Inbound', 'STO': 'Inventory',
    };

    const DIVISIONS = ['Inbound', 'Inventory', 'Return', 'Bongkaran/Project/Tambahan'];

    const getMonthKey = (dateStr: string) => {
        const d = dayjs(dateStr, 'YYYY-MM-DD');
        return d.isValid() ? d.format('YYYY-MM') : null;
    };

    // Classify a single attendance row into a division key
    const classifyRow = (r: any): string | null => {
        const nik = (r.nik || '').toLowerCase();
        const empStatus = empStatusMap[nik] || '';
        const jobdesc = (r.jobdesc || '').trim();
        const divisi = divisiMap[jobdesc] || '';

        if (empStatus === 'Tambahan') return 'Bongkaran/Project/Tambahan';
        if (empStatus === 'Reguler' && DIVISIONS.includes(divisi)) return divisi;
        return null;
    };

    // ========== MONTHLY HEADCOUNT (unfiltered) ==========
    const monthDivMap: Record<string, Record<string, number>> = {};
    const allMonths = new Set<string>();

    attData.forEach((r: any) => {
        const mk = getMonthKey(r.date);
        if (!mk) return;
        allMonths.add(mk);

        const rowKey = classifyRow(r);
        if (!rowKey) return;

        if (!monthDivMap[rowKey]) monthDivMap[rowKey] = {};
        monthDivMap[rowKey][mk] = (monthDivMap[rowKey][mk] || 0) + 1;
    });

    const sortedMonths = Array.from(allMonths).sort();
    const MONTH_LABELS: Record<string, string> = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
    };

    const tableRows = DIVISIONS.map(div => {
        const row: any = { key: div, divisi: div };
        sortedMonths.forEach(m => {
            row[m] = monthDivMap[div]?.[m] || 0;
        });
        return row;
    });

    const actualRow: any = { key: '_actual', divisi: 'Actual', isTotal: true };
    sortedMonths.forEach(m => {
        actualRow[m] = DIVISIONS.reduce((sum, div) => sum + (monthDivMap[div]?.[m] || 0), 0);
    });
    tableRows.push(actualRow);

    const lastMonth = sortedMonths[sortedMonths.length - 1];
    const prevMonth = sortedMonths.length >= 2 ? sortedMonths[sortedMonths.length - 2] : null;

    const monthCols = sortedMonths.map(m => {
        const [, mm] = m.split('-');
        return {
            title: MONTH_LABELS[mm] || mm,
            dataIndex: m,
            key: m,
            width: 80,
            align: 'center' as const,
            render: (v: number, rec: any) => (
                <span style={{ fontWeight: rec.isTotal ? 700 : 400, color: rec.isTotal ? '#60a5fa' : '#fff' }}>
                    {(v || 0).toLocaleString()}
                </span>
            ),
        };
    });

    const m2mCols = lastMonth && prevMonth ? [
        {
            title: 'Diff',
            key: 'diff',
            width: 70,
            align: 'center' as const,
            render: (_: any, rec: any) => {
                const curr = rec[lastMonth] || 0;
                const prev = rec[prevMonth] || 0;
                const diff = curr - prev;
                const color = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : 'rgba(255,255,255,0.4)';
                const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '';
                return <span style={{ color, fontWeight: 600 }}>{arrow} {Math.abs(diff)}</span>;
            },
        },
        {
            title: '%',
            key: 'pct',
            width: 80,
            align: 'center' as const,
            render: (_: any, rec: any) => {
                const curr = rec[lastMonth] || 0;
                const prev = rec[prevMonth] || 0;
                if (prev === 0) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>;
                const pct = (((curr - prev) / prev) * 100).toFixed(1);
                const color = parseFloat(pct) > 0 ? '#10b981' : parseFloat(pct) < 0 ? '#ef4444' : 'rgba(255,255,255,0.4)';
                return <span style={{ color, fontWeight: 600 }}>{parseFloat(pct) > 0 ? '+' : ''}{pct}%</span>;
            },
        },
    ] : [];

    // ========== DAILY HEADCOUNT (filtered by month) ==========
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

    // Month options for the filter dropdown
    const monthOptions = useMemo(() => {
        return sortedMonths.map(m => {
            const [yyyy, mm] = m.split('-');
            return { label: `${MONTH_LABELS[mm] || mm} ${yyyy}`, value: m };
        });
    }, [sortedMonths]);

    // Default to latest month if none selected
    const activeMonth = selectedMonth || lastMonth;

    // Build daily data: date → { divisi → count }
    const dailyData = useMemo(() => {
        if (!activeMonth) return [];

        const dateDivMap: Record<string, Record<string, number>> = {};
        const allDates = new Set<string>();

        attData.forEach((r: any) => {
            const mk = getMonthKey(r.date);
            if (mk !== activeMonth) return;

            const rowKey = classifyRow(r);
            if (!rowKey) return;

            const dateKey = r.date;
            allDates.add(dateKey);
            if (!dateDivMap[dateKey]) dateDivMap[dateKey] = {};
            dateDivMap[dateKey][rowKey] = (dateDivMap[dateKey][rowKey] || 0) + 1;
        });

        const sortedDates = Array.from(allDates).sort();
        const rows = sortedDates.map(date => {
            const row: any = { key: date, date };
            const dayName = dayjs(date).format('ddd');
            row.day = dayName;
            DIVISIONS.forEach(div => {
                row[div] = dateDivMap[date]?.[div] || 0;
            });
            row.total = DIVISIONS.reduce((sum, div) => sum + (row[div] || 0), 0);
            return row;
        });

        // Add total row
        if (rows.length > 0) {
            const totalRow: any = { key: '_total', date: 'Total', day: '', isTotal: true };
            DIVISIONS.forEach(div => {
                totalRow[div] = rows.reduce((sum, r) => sum + (r[div] || 0), 0);
            });
            totalRow.total = rows.reduce((sum, r) => sum + (r.total || 0), 0);
            rows.push(totalRow);
        }

        return rows;
    }, [attData, activeMonth]);

    const dailyColumns = [
        {
            title: 'Tanggal', dataIndex: 'date', key: 'date', width: 120, fixed: 'left' as const,
            render: (v: string, rec: any) => {
                if (rec.isTotal) return <span style={{ fontWeight: 700, color: '#60a5fa' }}>{v}</span>;
                return <span style={{ color: '#fff' }}>{dayjs(v).format('DD MMM YYYY')}</span>;
            },
        },
        {
            title: 'Hari', dataIndex: 'day', key: 'day', width: 60,
            render: (v: string, rec: any) => (
                <span style={{
                    color: rec.isTotal ? '#60a5fa' : (v === 'Sun' || v === 'Sat') ? '#f87171' : 'rgba(255,255,255,0.6)',
                    fontWeight: rec.isTotal ? 700 : 400,
                }}>{v}</span>
            ),
        },
        ...DIVISIONS.map(div => ({
            title: div === 'Bongkaran/Project/Tambahan' ? 'Bongkaran/Proj' : div,
            dataIndex: div,
            key: div,
            width: 100,
            align: 'center' as const,
            render: (v: number, rec: any) => (
                <span style={{ fontWeight: rec.isTotal ? 700 : 400, color: rec.isTotal ? '#60a5fa' : '#fff' }}>
                    {(v || 0).toLocaleString()}
                </span>
            ),
        })),
        {
            title: 'Total', dataIndex: 'total', key: 'total', width: 80, align: 'center' as const,
            render: (v: number, rec: any) => (
                <span style={{ fontWeight: 700, color: rec.isTotal ? '#60a5fa' : '#10b981' }}>
                    {(v || 0).toLocaleString()}
                </span>
            ),
        },
    ];

    // Active month label for title
    const activeMonthLabel = activeMonth
        ? (() => { const [yyyy, mm] = activeMonth.split('-'); return `${MONTH_LABELS[mm] || mm} ${yyyy}`; })()
        : '';

    return (
        <>
            <Card
                title="👷 Manpower Report — Monthly Headcount per Divisi"
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}
                styles={{ header: { color: '#fff' } }}
            >
                <ResizableTable
                    dataSource={tableRows}
                    columns={[
                        {
                            title: 'Divisi', dataIndex: 'divisi', key: 'divisi', width: 200, fixed: 'left' as const,
                            render: (v: string, rec: any) => (
                                <span style={{ fontWeight: rec.isTotal ? 700 : 500, color: rec.isTotal ? '#60a5fa' : '#fff' }}>{v}</span>
                            ),
                        },
                        ...monthCols,
                        ...m2mCols,
                    ]}
                    rowKey="key"
                    size="small"
                    scroll={{ x: 'max-content' }}
                    pagination={false}
                    onRow={(record: any) => ({
                        style: record.isTotal ? { background: 'rgba(99,102,241,0.15)' } : undefined,
                    })}
                />
            </Card>

            <Card
                title={`📅 Daily Headcount — ${activeMonthLabel}`}
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24 }}
                styles={{ header: { color: '#fff' } }}
                extra={
                    <Space>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Filter Bulan:</span>
                        <Select
                            value={activeMonth || undefined}
                            onChange={(val) => setSelectedMonth(val)}
                            options={monthOptions}
                            style={{ width: 160 }}
                            placeholder="Pilih Bulan"
                            allowClear
                            onClear={() => setSelectedMonth(null)}
                        />
                    </Space>
                }
            >
                <ResizableTable
                    dataSource={dailyData}
                    columns={dailyColumns}
                    rowKey="key"
                    size="small"
                    scroll={{ x: 'max-content', y: 500 }}
                    pagination={false}
                    onRow={(record: any) => ({
                        style: record.isTotal
                            ? { background: 'rgba(99,102,241,0.15)' }
                            : (record.day === 'Sun' || record.day === 'Sat')
                                ? { background: 'rgba(248,113,113,0.05)' }
                                : undefined,
                    })}
                />
            </Card>
        </>
    );
}
