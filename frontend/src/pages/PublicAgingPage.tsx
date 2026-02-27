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

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#6366f1', borderRadius: 8, fontFamily: "'Inter', sans-serif", colorBgContainer: '#1a1f3a', colorBgElevated: '#1e2340', colorBorder: 'rgba(255,255,255,0.08)', colorText: 'rgba(255,255,255,0.85)' }, components: { Table: { headerBg: '#0d1117', headerColor: 'rgba(255,255,255,0.7)', rowHoverBg: 'rgba(99,102,241,0.08)', borderColor: 'rgba(255,255,255,0.06)' } } }}>
            <div style={{ background: '#0d1117', minHeight: '100vh', padding: 24 }}>
                <div style={{ maxWidth: 1400, margin: '0 auto' }}>
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
