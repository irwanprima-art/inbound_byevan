import { useState, useEffect } from 'react';
import { Typography, Spin, Card, Tag, ConfigProvider, theme } from 'antd';
import ResizableTable from '../components/ResizableTable';
import { publicApi } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const parseDate = (s: string) => { if (!s) return null; const d = dayjs(s); return d.isValid() ? d : null; };
const calcEdNote = (expStr: string, updateStr: string) => {
    if (!expStr?.trim()) return 'No Expiry Date';
    const exp = parseDate(expStr); if (!exp) return 'No Expiry Date';
    const ref = parseDate(updateStr) || dayjs();
    const diff = exp.diff(ref, 'day');
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

export default function PublicAgingPage() {
    const [loading, setLoading] = useState(true);
    const [sohList, setSohList] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const [s, l] = await Promise.all([publicApi.sohList(), publicApi.locationsList()]);
                setSohList(s.data || []);
                setLocations(l.data || []);
            } catch { /* ignore */ }
            setLoading(false);
        })();
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0d1117' }}>
            <Spin size="large" />
        </div>
    );

    // Build location category map
    const locCatMap: Record<string, string> = {};
    locations.forEach((loc: any) => { if (loc.location && loc.location_category) locCatMap[loc.location] = loc.location_category; });
    const sellable = sohList.filter((s: any) => {
        const cat = locCatMap[s.location] || s.location_category || '';
        const owner = (s.owner || '').trim();
        return cat === 'Sellable' && owner === 'JC-ID' && (Number(s.qty) || 0) > 0;
    });

    // ED Note pivot
    const edCats = ['Expired', 'NED 1 Month', 'NED 2 Month', 'NED 3 Month', '3 - 6 Month', '6 - 12 Month', '1yr++', 'No Expiry Date'];
    const edMap: Record<string, Record<string, number>> = {};
    sellable.forEach((s: any) => {
        const brand = ((s.brand || '').trim() || 'Unknown').toUpperCase();
        const ed = calcEdNote(s.exp_date, s.update_date);
        if (!edMap[brand]) edMap[brand] = {};
        edMap[brand][ed] = (edMap[brand][ed] || 0) + (Number(s.qty) || 0);
    });
    const edRows = Object.entries(edMap).map(([brand, cats]) => ({ brand, ...cats, key: `ed_${brand}` })).sort((a, b) => a.brand.localeCompare(b.brand));
    const edTotal: Record<string, any> = { brand: 'TOTAL', key: 'ed_TOTAL', _isTotal: true };
    edCats.forEach(cat => { edTotal[cat] = edRows.reduce((sum, r) => sum + ((r as any)[cat] || 0), 0); });
    const edRowsWithTotal = [edTotal, ...edRows];

    // Aging Note pivot
    const agingMap: Record<string, Record<string, number>> = {};
    sellable.forEach((s: any) => {
        const brand = ((s.brand || '').trim() || 'Unknown').toUpperCase();
        const aging = calcAgingNote(s.wh_arrival_date);
        if (aging === '-') return;
        if (!agingMap[brand]) agingMap[brand] = {};
        agingMap[brand][aging] = (agingMap[brand][aging] || 0) + (Number(s.qty) || 0);
    });
    const agingCats = [...new Set(sellable.map((s: any) => calcAgingNote(s.wh_arrival_date)).filter(v => v !== '-'))].sort((a, b) => {
        if (a === 'Under 2025') return -1; if (b === 'Under 2025') return 1;
        const [qa, ya] = a.split(' '); const [qb, yb] = b.split(' ');
        const yd = Number(ya) - Number(yb); if (yd !== 0) return yd;
        return qa.localeCompare(qb);
    });
    const agingRows = Object.entries(agingMap).map(([brand, cats]) => ({ brand, ...cats, key: `aging_${brand}` })).sort((a, b) => a.brand.localeCompare(b.brand));
    const agingTotal: Record<string, any> = { brand: 'TOTAL', key: 'aging_TOTAL', _isTotal: true };
    agingCats.forEach(cat => { agingTotal[cat] = agingRows.reduce((sum, r) => sum + ((r as any)[cat] || 0), 0); });
    const agingRowsWithTotal = [agingTotal, ...agingRows];

    // Critical ED
    const criticalNotes = ['Expired', 'NED 1 Month', 'NED 2 Month', 'NED 3 Month'];
    const criticalItems = sellable
        .filter((s: any) => criticalNotes.includes(calcEdNote(s.exp_date, s.update_date)))
        .map((s: any, i: number) => ({
            key: `crit_${i}`, brand: ((s.brand || '').trim() || 'Unknown').toUpperCase(),
            sku: s.sku || '-', qty: Number(s.qty) || 0, exp_date: s.exp_date || '-', ed_note: calcEdNote(s.exp_date, s.update_date),
        }))
        .sort((a, b) => criticalNotes.indexOf(a.ed_note) - criticalNotes.indexOf(b.ed_note) || a.brand.localeCompare(b.brand));

    // Latest update date
    const latestUpdate = sohList.reduce((latest: string, s: any) => {
        if (s.update_date && s.update_date > latest) return s.update_date;
        return latest;
    }, '');

    // === W2W Movement ===
    const calcWeek = (dateStr: string) => {
        const d = parseDate(dateStr); if (!d) return '';
        return `W${Math.ceil(d.date() / 7)} ${d.format('MMM')}`;
    };
    // Group sellable by week
    const weekSet = new Set<string>();
    sellable.forEach((s: any) => { const w = calcWeek(s.update_date); if (w) weekSet.add(w); });
    // Sort weeks chronologically
    const monthOrder: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    const sortedWeeks = [...weekSet].sort((a, b) => {
        const [wa, ma] = a.replace('W', '').split(' ');
        const [wb, mb] = b.replace('W', '').split(' ');
        const md = (monthOrder[ma] || 0) - (monthOrder[mb] || 0);
        return md !== 0 ? md : Number(wa) - Number(wb);
    });

    // Take last 2 weeks
    const w2wCats = ['Expired', 'NED 1 Month', 'NED 2 Month', 'NED 3 Month', '3 - 6 Month', '6 - 12 Month', '1yr++', 'No Expiry Date'];
    const lastWeek = sortedWeeks.length >= 2 ? sortedWeeks[sortedWeeks.length - 2] : null;
    const currWeek = sortedWeeks.length >= 1 ? sortedWeeks[sortedWeeks.length - 1] : null;

    let w2wRows: any[] = [];
    let w2wColumns: any[] = [];
    if (lastWeek && currWeek && lastWeek !== currWeek) {
        // Build per-brand per-edNote totals per week
        const weekData: Record<string, Record<string, Record<string, number>>> = {};
        [lastWeek, currWeek].forEach(w => { weekData[w] = {}; });
        sellable.forEach((s: any) => {
            const w = calcWeek(s.update_date);
            if (w !== lastWeek && w !== currWeek) return;
            const brand = ((s.brand || '').trim() || 'Unknown').toUpperCase();
            const ed = calcEdNote(s.exp_date, s.update_date);
            const qty = Number(s.qty) || 0;
            if (!weekData[w][brand]) weekData[w][brand] = {};
            weekData[w][brand][ed] = (weekData[w][brand][ed] || 0) + qty;
            weekData[w][brand]['_total'] = (weekData[w][brand]['_total'] || 0) + qty;
        });

        const allBrands = [...new Set([...Object.keys(weekData[lastWeek] || {}), ...Object.keys(weekData[currWeek] || {})])].sort();
        w2wRows = allBrands.map(brand => {
            const row: any = { brand, key: `w2w_${brand}` };
            const prev = weekData[lastWeek]?.[brand] || {};
            const curr = weekData[currWeek]?.[brand] || {};
            row[`total_prev`] = prev['_total'] || 0;
            row[`total_curr`] = curr['_total'] || 0;
            row[`total_diff`] = (curr['_total'] || 0) - (prev['_total'] || 0);
            w2wCats.forEach(cat => {
                row[`${cat}_prev`] = prev[cat] || 0;
                row[`${cat}_curr`] = curr[cat] || 0;
                row[`${cat}_diff`] = (curr[cat] || 0) - (prev[cat] || 0);
            });
            return row;
        });
        // Total row
        const totalRow: any = { brand: 'TOTAL', key: 'w2w_TOTAL', _isTotal: true };
        totalRow.total_prev = w2wRows.reduce((s, r) => s + r.total_prev, 0);
        totalRow.total_curr = w2wRows.reduce((s, r) => s + r.total_curr, 0);
        totalRow.total_diff = totalRow.total_curr - totalRow.total_prev;
        w2wCats.forEach(cat => {
            totalRow[`${cat}_prev`] = w2wRows.reduce((s, r) => s + r[`${cat}_prev`], 0);
            totalRow[`${cat}_curr`] = w2wRows.reduce((s, r) => s + r[`${cat}_curr`], 0);
            totalRow[`${cat}_diff`] = totalRow[`${cat}_curr`] - totalRow[`${cat}_prev`];
        });
        w2wRows = [totalRow, ...w2wRows];

        const diffRender = (v: number) => {
            if (!v) return <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>;
            const color = v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : 'rgba(255,255,255,0.5)';
            return <span style={{ color, fontWeight: 600 }}>{v > 0 ? `+${v.toLocaleString()}` : v.toLocaleString()}</span>;
        };
        const qtyRender = (v: number) => v ? <span style={{ fontWeight: 500 }}>{v.toLocaleString()}</span> : <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>;

        // Build columns: Brand | Total Prev | Total Curr | W2W Diff | ...per ED Note cat
        w2wColumns = [
            { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 160, fixed: 'left' as const, render: (v: string, r: any) => r._isTotal ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
            { title: `Total ${lastWeek}`, dataIndex: 'total_prev', key: 'total_prev', width: 110, render: qtyRender },
            { title: `Total ${currWeek}`, dataIndex: 'total_curr', key: 'total_curr', width: 110, render: qtyRender },
            { title: 'W2W Diff', dataIndex: 'total_diff', key: 'total_diff', width: 100, render: diffRender },
        ];
        w2wCats.forEach(cat => {
            w2wColumns.push(
                { title: <span style={{ fontSize: 11 }}>{cat}<br />{lastWeek}</span>, dataIndex: `${cat}_prev`, key: `${cat}_prev`, width: 110, render: qtyRender },
                { title: <span style={{ fontSize: 11 }}>{cat}<br />{currWeek}</span>, dataIndex: `${cat}_curr`, key: `${cat}_curr`, width: 110, render: qtyRender },
                { title: <span style={{ fontSize: 11 }}>{cat}<br />Diff</span>, dataIndex: `${cat}_diff`, key: `${cat}_diff`, width: 90, render: diffRender },
            );
        });
    }

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#6366f1', borderRadius: 8, fontFamily: "'Inter', sans-serif", colorBgContainer: '#1a1f3a', colorBgElevated: '#1e2340', colorBorder: 'rgba(255,255,255,0.08)', colorText: 'rgba(255,255,255,0.85)' }, components: { Table: { headerBg: '#0d1117', headerColor: 'rgba(255,255,255,0.7)', rowHoverBg: 'rgba(99,102,241,0.08)', borderColor: 'rgba(255,255,255,0.06)' } } }}>
            <div style={{ background: '#0d1117', minHeight: '100vh', padding: 24 }}>
                <div style={{ maxWidth: 1800, margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Title level={3} style={{ color: '#fff', margin: 0 }}>📅 Aging Stock Report</Title>
                        {latestUpdate && <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>📆 Data Update: {dayjs(latestUpdate).format('DD MMM YYYY')}</Text>}
                    </div>

                    <Card title="📅 ED Note by Brand" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }} styles={{ header: { color: '#fff' }, body: { overflow: 'hidden' } }}>
                        <ResizableTable dataSource={edRowsWithTotal} columns={[
                            { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 140, render: (v: string, r: any) => r._isTotal ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                            ...edCats.map(cat => ({
                                title: <span style={{ color: '#fff', background: edNoteColor(cat), padding: '2px 8px', borderRadius: 4, fontSize: 11, whiteSpace: 'nowrap' as const }}>{cat}</span>,
                                dataIndex: cat, key: cat, width: 130,
                                render: (v: number, r: any) => v ? (
                                    <a href={`/public/soh?edNote=${encodeURIComponent(cat)}&locCategory=Sellable`} style={{ color: r._isTotal ? '#fff' : edNoteColor(cat), fontWeight: 600, textDecoration: 'underline dotted' }}>
                                        {v.toLocaleString()}
                                    </a>
                                ) : <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>,
                            })),
                        ]} rowKey="key" size="small" scroll={{ x: 'max-content', y: 500 }} pagination={false}
                            onRow={(record: any) => ({ style: record._isTotal ? { background: 'rgba(99,102,241,0.18)', fontWeight: 700 } : undefined })} />
                    </Card>

                    {criticalItems.length > 0 && (
                        <Card title={`⚠️ Critical ED Stock (Expired – NED 3 Month) — ${criticalItems.length} items`} style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24, overflow: 'hidden' }} styles={{ header: { color: '#ff6b6b' }, body: { overflow: 'hidden' } }}>
                            <ResizableTable dataSource={criticalItems} columns={[
                                { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 150 },
                                { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 200 },
                                { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 100, render: (v: number) => <span style={{ color: '#60a5fa', fontWeight: 600 }}>{v.toLocaleString()}</span> },
                                { title: 'Exp. Date', dataIndex: 'exp_date', key: 'exp_date', width: 120 },
                                { title: 'ED Note', dataIndex: 'ed_note', key: 'ed_note', width: 140, render: (v: string) => <Tag color={edNoteColor(v)} style={{ border: 'none' }}>{v}</Tag> },
                            ]} rowKey="key" size="small" scroll={{ x: 'max-content', y: 400 }} pagination={false} />
                        </Card>
                    )}

                    {w2wRows.length > 0 && (
                        <Card
                            title={`📊 Week to Week Movement (${lastWeek} → ${currWeek})`}
                            style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24, overflow: 'hidden' }}
                            styles={{ header: { color: '#fff' }, body: { overflow: 'hidden' } }}
                        >
                            <ResizableTable dataSource={w2wRows} columns={w2wColumns} rowKey="key" size="small"
                                scroll={{ x: 'max-content', y: 500 }} pagination={false}
                                onRow={(record: any) => ({ style: record._isTotal ? { background: 'rgba(99,102,241,0.18)', fontWeight: 700 } : undefined })} />
                        </Card>
                    )}

                    <Card title="📦 Aging Note by Brand" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24, overflow: 'hidden' }} styles={{ header: { color: '#fff' }, body: { overflow: 'hidden' } }}>
                        <ResizableTable dataSource={agingRowsWithTotal} columns={[
                            { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 140, render: (v: string, r: any) => r._isTotal ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                            ...agingCats.map(cat => ({
                                title: cat, dataIndex: cat, key: cat, width: 120,
                                render: (v: number, r: any) => v ? (
                                    <a href={`/public/soh?agingNote=${encodeURIComponent(cat)}&locCategory=Sellable`} style={{ color: r._isTotal ? '#fff' : '#60a5fa', fontWeight: 600, textDecoration: 'underline dotted' }}>
                                        {v.toLocaleString()}
                                    </a>
                                ) : <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>,
                            })),
                        ]} rowKey="key" size="small" scroll={{ x: 'max-content', y: 500 }} pagination={false}
                            onRow={(record: any) => ({ style: record._isTotal ? { background: 'rgba(99,102,241,0.18)', fontWeight: 700 } : undefined })} />
                    </Card>

                    <div style={{ marginTop: 24, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.25)' }}>Warehouse Report & Monitoring System</Text>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}
