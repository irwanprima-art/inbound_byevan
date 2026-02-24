import { useState, useMemo } from 'react';
import { Card, Select, Space } from 'antd';
import ResizableTable from '../../components/ResizableTable';
import dayjs from 'dayjs';

interface Props {
    attData: any[];
    empData: any[];
    schedData: any[];
}

export default function DashboardManpowerTab({ attData, empData, schedData }: Props) {
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

    // Classify a single row (attendance or schedule) into a division key
    const classifyRow = (r: any): string | null => {
        const nik = (r.nik || '').toLowerCase();
        const empStatus = empStatusMap[nik] || '';
        const jobdesc = (r.jobdesc || '').trim();
        const divisi = divisiMap[jobdesc] || '';

        if (empStatus === 'Tambahan') return 'Bongkaran/Project/Tambahan';
        if (empStatus === 'Reguler' && DIVISIONS.includes(divisi)) return divisi;
        return null;
    };

    const MONTH_LABELS: Record<string, string> = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
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

    // ========== DAILY HEADCOUNT (dates as columns, divisions as rows) ==========
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

    const monthOptions = useMemo(() => {
        return sortedMonths.map(m => {
            const [yyyy, mm] = m.split('-');
            return { label: `${MONTH_LABELS[mm] || mm} ${yyyy}`, value: m };
        });
    }, [sortedMonths]);

    const activeMonth = selectedMonth || lastMonth;

    // Build daily data: divisi → date → count (from attendance)
    // Build plan data: date → total count (from schedule)
    const { dailyRows, dailyColumns } = useMemo(() => {
        if (!activeMonth) return { dailyRows: [], dailyColumns: [] };

        const divDateMap: Record<string, Record<string, number>> = {};
        const allDates = new Set<string>();

        // Actual from attendance
        attData.forEach((r: any) => {
            const mk = getMonthKey(r.date);
            if (mk !== activeMonth) return;

            const rowKey = classifyRow(r);
            if (!rowKey) return;

            const dateKey = r.date;
            allDates.add(dateKey);
            if (!divDateMap[rowKey]) divDateMap[rowKey] = {};
            divDateMap[rowKey][dateKey] = (divDateMap[rowKey][dateKey] || 0) + 1;
        });

        // Plan from schedule — count per date (only non-Off entries)
        const planDateMap: Record<string, number> = {};
        schedData.forEach((s: any) => {
            const mk = getMonthKey(s.date);
            if (mk !== activeMonth) return;
            // Skip "Off" schedules
            const jobdesc = (s.jobdesc || '').trim().toLowerCase();
            if (jobdesc === 'off' || jobdesc === '') return;

            const dateKey = s.date;
            allDates.add(dateKey);
            planDateMap[dateKey] = (planDateMap[dateKey] || 0) + 1;
        });

        const sortedDates = Array.from(allDates).sort();

        // Division rows
        const rows = DIVISIONS.map(div => {
            const row: any = { key: div, divisi: div };
            let total = 0;
            sortedDates.forEach(date => {
                const count = divDateMap[div]?.[date] || 0;
                row[date] = count;
                total += count;
            });
            row._total = total;
            return row;
        });

        // Actual (total) row
        const totRow: any = { key: '_actual', divisi: 'Actual', isTotal: true, _total: 0 };
        sortedDates.forEach(date => {
            totRow[date] = DIVISIONS.reduce((sum, div) => sum + (divDateMap[div]?.[date] || 0), 0);
            totRow._total += totRow[date];
        });
        rows.push(totRow);

        // Plan row
        const planRow: any = { key: '_plan', divisi: 'Plan', isPlan: true, _total: 0 };
        sortedDates.forEach(date => {
            planRow[date] = planDateMap[date] || 0;
            planRow._total += planRow[date];
        });
        rows.push(planRow);

        // Actual vs Plan % row
        const pctRow: any = { key: '_avp', divisi: 'Actual vs Plan', isPct: true, _total: '' };
        sortedDates.forEach(date => {
            const actual = totRow[date] || 0;
            const plan = planDateMap[date] || 0;
            if (plan === 0) {
                pctRow[date] = '-';
            } else {
                pctRow[date] = ((actual / plan) * 100).toFixed(1) + '%';
            }
        });
        // Overall %
        if (planRow._total > 0) {
            pctRow._total = ((totRow._total / planRow._total) * 100).toFixed(1) + '%';
        }
        rows.push(pctRow);

        // Build columns
        const DAY_NAMES: Record<string, string> = {
            '0': 'Min', '1': 'Sen', '2': 'Sel', '3': 'Rab', '4': 'Kam', '5': 'Jum', '6': 'Sab',
        };

        const dateCols = sortedDates.map(date => {
            const d = dayjs(date);
            const dayNum = d.format('D');
            const dayOfWeek = d.day();
            const dayName = DAY_NAMES[String(dayOfWeek)] || '';
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return {
                title: (
                    <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                        <div style={{ fontSize: 11, color: isWeekend ? '#f87171' : 'rgba(255,255,255,0.45)' }}>{dayName}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isWeekend ? '#f87171' : '#fff' }}>{dayNum}</div>
                    </div>
                ),
                dataIndex: date,
                key: date,
                width: 42,
                align: 'center' as const,
                render: (v: any, rec: any) => {
                    // Actual vs Plan % row
                    if (rec.isPct) {
                        const strVal = String(v || '-');
                        const numVal = parseFloat(strVal);
                        let color = 'rgba(255,255,255,0.3)';
                        if (!isNaN(numVal)) {
                            color = numVal >= 100 ? '#10b981' : numVal >= 80 ? '#fbbf24' : '#f87171';
                        }
                        return <span style={{ fontSize: 10, fontWeight: 600, color }}>{strVal}</span>;
                    }
                    // Plan row
                    if (rec.isPlan) {
                        return <span style={{ fontWeight: 600, color: '#c084fc' }}>{v || 0}</span>;
                    }
                    // Normal / Total
                    if (!v && !rec.isTotal) return <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>;
                    return (
                        <span style={{
                            fontWeight: rec.isTotal ? 700 : 400,
                            color: rec.isTotal ? '#60a5fa' : isWeekend ? '#f87171' : '#fff',
                        }}>
                            {v || 0}
                        </span>
                    );
                },
            };
        });

        const cols = [
            {
                title: 'Divisi', dataIndex: 'divisi', key: 'divisi', width: 180, fixed: 'left' as const,
                render: (v: string, rec: any) => (
                    <span style={{
                        fontWeight: rec.isTotal || rec.isPlan || rec.isPct ? 700 : 500,
                        color: rec.isTotal ? '#60a5fa' : rec.isPlan ? '#c084fc' : rec.isPct ? '#fbbf24' : '#fff',
                    }}>{v}</span>
                ),
            },
            {
                title: 'Total', dataIndex: '_total', key: '_total', width: 65, fixed: 'left' as const,
                align: 'center' as const,
                render: (v: any, rec: any) => {
                    if (rec.isPct) {
                        const strVal = String(v || '-');
                        const numVal = parseFloat(strVal);
                        let color = 'rgba(255,255,255,0.3)';
                        if (!isNaN(numVal)) {
                            color = numVal >= 100 ? '#10b981' : numVal >= 80 ? '#fbbf24' : '#f87171';
                        }
                        return <span style={{ fontWeight: 700, fontSize: 11, color }}>{strVal}</span>;
                    }
                    return (
                        <span style={{ fontWeight: 700, color: rec.isTotal ? '#60a5fa' : rec.isPlan ? '#c084fc' : '#10b981' }}>
                            {typeof v === 'number' ? v.toLocaleString() : v}
                        </span>
                    );
                },
            },
            ...dateCols,
        ];

        return { dailyRows: rows, dailyColumns: cols };
    }, [attData, schedData, activeMonth]);

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
                title={`📅 Daily Headcount per Divisi — ${activeMonthLabel}`}
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
                    dataSource={dailyRows}
                    columns={dailyColumns}
                    rowKey="key"
                    size="small"
                    scroll={{ x: 'max-content' }}
                    pagination={false}
                    onRow={(record: any) => ({
                        style: record.isTotal
                            ? { background: 'rgba(99,102,241,0.15)' }
                            : record.isPlan
                                ? { background: 'rgba(192,132,252,0.08)' }
                                : record.isPct
                                    ? { background: 'rgba(251,191,36,0.08)' }
                                    : undefined,
                    })}
                />
            </Card>
        </>
    );
}
