import { Card } from 'antd';
import ResizableTable from '../../components/ResizableTable';
import dayjs from 'dayjs';

interface Props {
    sohList: any[];
    locations: any[];
}

export default function DashboardAgingTab({ sohList, locations }: Props) {
    const parseDate = (s: string) => {
        if (!s) return null;
        for (const fmt of ['M/D/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'D/M/YYYY', 'DD/MM/YYYY']) {
            const d = dayjs(s, fmt); if (d.isValid()) return d;
        }
        const d = dayjs(s); return d.isValid() ? d : null;
    };

    const calcEdNote = (expStr: string, whStr: string) => {
        if (!expStr?.trim()) return 'No Expiry Date';
        const exp = parseDate(expStr); if (!exp) return 'No Expiry Date';
        const wh = parseDate(whStr); if (!wh) return '-';
        const diff = exp.diff(wh, 'day');
        if (diff < 0) return 'Expired';
        if (diff <= 30) return 'NED 1 Month';
        if (diff <= 60) return 'NED 2 Month';
        if (diff <= 90) return 'NED 3 Month';
        if (diff <= 180) return '3 - 6 Month';
        if (diff <= 365) return '6 - 12 Month';
        return '1yr++';
    };

    const calcAgingNote = (whStr: string) => {
        const d = parseDate(whStr); if (!d) return '-';
        const y = d.year(); const m = d.month() + 1;
        if (y < 2025) return 'Under 2025';
        const q = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';
        return `${q} ${y}`;
    };

    const edNoteColor = (note: string): string => {
        if (note === 'Expired') return '#ef4444';
        if (note === 'NED 1 Month') return '#ea580c';
        if (note === 'NED 2 Month') return '#f59e0b';
        if (note === 'NED 3 Month') return '#eab308';
        if (note === '3 - 6 Month') return '#84cc16';
        if (note === '6 - 12 Month') return '#22c55e';
        if (note === '1yr++') return '#06b6d4';
        if (note === 'No Expiry Date') return '#a855f7';
        return '#6b7280';
    };

    // Build location -> location_category map
    const locCatMap: Record<string, string> = {};
    locations.forEach((loc: any) => {
        if (loc.location && loc.location_category) {
            locCatMap[loc.location] = loc.location_category;
        }
    });

    const sellable = sohList.filter((s: any) => {
        const cat = locCatMap[s.location] || s.location_category || '';
        return cat === 'Sellable' && (Number(s.qty) || 0) > 0;
    });

    // ED Note pivot
    const edCats = ['Expired', 'NED 1 Month', 'NED 2 Month', 'NED 3 Month', '3 - 6 Month', '6 - 12 Month', '1yr++', 'No Expiry Date'];
    const edMap: Record<string, Record<string, number>> = {};
    sellable.forEach((s: any) => {
        const brand = (s.brand || '').trim() || 'Unknown';
        const ed = calcEdNote(s.exp_date, s.wh_arrival_date);
        if (ed === '-') return;
        if (!edMap[brand]) edMap[brand] = {};
        edMap[brand][ed] = (edMap[brand][ed] || 0) + (Number(s.qty) || 0);
    });
    const edRows = Object.entries(edMap)
        .map(([brand, cats]) => ({ brand, ...cats, key: `ed_${brand}` }))
        .sort((a, b) => a.brand.localeCompare(b.brand));

    // Aging Note pivot
    const agingMap: Record<string, Record<string, number>> = {};
    sellable.forEach((s: any) => {
        const brand = (s.brand || '').trim() || 'Unknown';
        const aging = calcAgingNote(s.wh_arrival_date);
        if (aging === '-') return;
        if (!agingMap[brand]) agingMap[brand] = {};
        agingMap[brand][aging] = (agingMap[brand][aging] || 0) + (Number(s.qty) || 0);
    });
    const agingCats = [...new Set(sellable.map((s: any) => calcAgingNote(s.wh_arrival_date)).filter(v => v !== '-'))].sort((a, b) => {
        if (a === 'Under 2025') return -1;
        if (b === 'Under 2025') return 1;
        const [qa, ya] = a.split(' ');
        const [qb, yb] = b.split(' ');
        const yearDiff = Number(ya) - Number(yb);
        if (yearDiff !== 0) return yearDiff;
        return qa.localeCompare(qb);
    });
    const agingRows = Object.entries(agingMap)
        .map(([brand, cats]) => ({ brand, ...cats, key: `aging_${brand}` }))
        .sort((a, b) => a.brand.localeCompare(b.brand));

    // Critical ED items
    const criticalNotes = ['Expired', 'NED 1 Month', 'NED 2 Month', 'NED 3 Month'];
    const criticalItems = sellable
        .filter((s: any) => criticalNotes.includes(calcEdNote(s.exp_date, s.wh_arrival_date)))
        .map((s: any, i: number) => ({
            key: `crit_${i}`,
            brand: (s.brand || '').trim() || 'Unknown',
            sku: s.sku || '-',
            qty: Number(s.qty) || 0,
            exp_date: s.exp_date || '-',
            ed_note: calcEdNote(s.exp_date, s.wh_arrival_date),
        }))
        .sort((a, b) => {
            const order = criticalNotes;
            return order.indexOf(a.ed_note) - order.indexOf(b.ed_note) || a.brand.localeCompare(b.brand);
        });

    return (
        <>
            <Card
                title="📅 ED Note by Brand"
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}
                styles={{ header: { color: '#fff' }, body: { overflow: 'hidden' } }}
            >
                <ResizableTable
                    dataSource={edRows}
                    columns={[
                        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 140 },
                        ...edCats.map(cat => ({
                            title: <span style={{ color: '#fff', background: edNoteColor(cat), padding: '2px 8px', borderRadius: 4, fontSize: 11, whiteSpace: 'nowrap' as const }}>{cat}</span>,
                            dataIndex: cat, key: cat, width: 130,
                            render: (v: number) => v ? <span style={{ color: edNoteColor(cat), fontWeight: 600 }}>{(v || 0).toLocaleString()}</span> : <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>,
                        })),
                    ]}
                    rowKey="key"
                    size="small"
                    scroll={{ x: 'max-content', y: 500 }}
                    pagination={false}
                />
            </Card>

            {criticalItems.length > 0 && (
                <Card
                    title={`⚠️ Critical ED Stock (Expired – NED 3 Month) — ${criticalItems.length} items`}
                    style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24, overflow: 'hidden', position: 'relative' }}
                    styles={{ header: { color: '#ff6b6b' }, body: { overflow: 'hidden' } }}
                >
                    <ResizableTable
                        dataSource={criticalItems}
                        columns={[
                            { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 150 },
                            { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 200 },
                            { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 100, render: (v: number) => <span style={{ color: '#60a5fa', fontWeight: 600 }}>{v.toLocaleString()}</span> },
                            { title: 'Exp. Date', dataIndex: 'exp_date', key: 'exp_date', width: 120 },
                            { title: 'ED Note', dataIndex: 'ed_note', key: 'ed_note', width: 140, render: (v: string) => <span style={{ color: '#fff', background: edNoteColor(v), padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{v}</span> },
                        ]}
                        rowKey="key"
                        size="small"
                        scroll={{ x: 'max-content', y: 400 }}
                        pagination={false}
                    />
                </Card>
            )}

            <Card
                title="📦 Aging Note by Brand"
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24, overflow: 'hidden', position: 'relative' }}
                styles={{ header: { color: '#fff' }, body: { overflow: 'hidden' } }}
            >
                <ResizableTable
                    dataSource={agingRows}
                    columns={[
                        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 140 },
                        ...agingCats.map(cat => ({
                            title: cat, dataIndex: cat, key: cat, width: 120,
                            render: (v: number) => v ? <span style={{ color: '#60a5fa', fontWeight: 600 }}>{(v || 0).toLocaleString()}</span> : <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>,
                        })),
                    ]}
                    rowKey="key"
                    size="small"
                    scroll={{ x: 'max-content', y: 500 }}
                    pagination={false}
                />
            </Card>
        </>
    );
}
