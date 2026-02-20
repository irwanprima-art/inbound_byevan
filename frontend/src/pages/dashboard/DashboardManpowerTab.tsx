import { Card } from 'antd';
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

    const monthDivMap: Record<string, Record<string, number>> = {};
    const allMonths = new Set<string>();

    attData.forEach((r: any) => {
        const mk = getMonthKey(r.date);
        if (!mk) return;
        allMonths.add(mk);

        const nik = (r.nik || '').toLowerCase();
        const empStatus = empStatusMap[nik] || '';
        const jobdesc = (r.jobdesc || '').trim();
        const divisi = divisiMap[jobdesc] || '';

        let rowKey = '';
        if (empStatus === 'Tambahan') {
            rowKey = 'Bongkaran/Project/Tambahan';
        } else if (empStatus === 'Reguler' && DIVISIONS.includes(divisi)) {
            rowKey = divisi;
        } else {
            return;
        }

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
        </>
    );
}
