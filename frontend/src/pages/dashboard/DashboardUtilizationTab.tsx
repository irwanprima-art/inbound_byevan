import { Row, Col, Card, Progress } from 'antd';
import ResizableTable from '../../components/ResizableTable';

interface Props {
    sohList: any[];
    locations: any[];
}

export default function DashboardUtilizationTab({ sohList, locations }: Props) {
    // Build set of occupied locations from SOH data
    const occupiedLocs = new Set<string>();
    sohList.forEach((s: any) => {
        const loc = (s.location || '').trim();
        const qty = parseInt(s.qty) || 0;
        if (loc && qty > 0) occupiedLocs.add(loc);
    });

    // Filter locations to Picking Area and Storage Area, then group
    const filtered = locations.filter((l: any) => {
        const lt = (l.location_type || '').trim();
        return lt === 'Picking Area' || lt === 'Storage Area';
    });

    const groupMap: Record<string, { category: string; zone: string; total: number; occupied: number }> = {};
    filtered.forEach((l: any) => {
        const cat = (l.location_type || '').trim();
        const zone = (l.zone || '').trim() || '-';
        const key = `${cat}|${zone}`;
        if (!groupMap[key]) groupMap[key] = { category: cat, zone, total: 0, occupied: 0 };
        groupMap[key].total++;
        const locName = (l.location || '').trim();
        if (locName && occupiedLocs.has(locName)) groupMap[key].occupied++;
    });

    const zoneRows = Object.values(groupMap)
        .map(g => ({
            ...g,
            empty: g.total - g.occupied,
            pctOccupied: g.total > 0 ? ((g.occupied / g.total) * 100).toFixed(1) : '0.0',
            pctEmpty: g.total > 0 ? (((g.total - g.occupied) / g.total) * 100).toFixed(1) : '0.0',
            key: `${g.category}|${g.zone}`,
            isSummary: false,
        }))
        .sort((a, b) => a.category.localeCompare(b.category) || a.zone.localeCompare(b.zone));

    const types = ['Picking Area', 'Storage Area'];
    const finalRows: any[] = [];
    let grandTotal = 0, grandOccupied = 0;

    types.forEach(type => {
        const rows = zoneRows.filter(r => r.category === type);
        if (rows.length === 0) return;
        finalRows.push(...rows);
        const subTotal = rows.reduce((s, r) => s + r.total, 0);
        const subOccupied = rows.reduce((s, r) => s + r.occupied, 0);
        const subEmpty = subTotal - subOccupied;
        grandTotal += subTotal;
        grandOccupied += subOccupied;
        finalRows.push({
            category: `Total ${type}`, zone: '', total: subTotal, occupied: subOccupied,
            empty: subEmpty,
            pctOccupied: subTotal > 0 ? ((subOccupied / subTotal) * 100).toFixed(1) : '0.0',
            pctEmpty: subTotal > 0 ? ((subEmpty / subTotal) * 100).toFixed(1) : '0.0',
            key: `subtotal_${type}`, isSummary: true,
        });
    });

    const grandEmpty = grandTotal - grandOccupied;
    finalRows.push({
        category: 'Total All', zone: '', total: grandTotal, occupied: grandOccupied,
        empty: grandEmpty,
        pctOccupied: grandTotal > 0 ? ((grandOccupied / grandTotal) * 100).toFixed(1) : '0.0',
        pctEmpty: grandTotal > 0 ? ((grandEmpty / grandTotal) * 100).toFixed(1) : '0.0',
        key: 'grand_total', isSummary: true,
    });

    const summaryRowStyle = { background: 'rgba(99,102,241,0.15)', fontWeight: 700 };

    // Location Use Per Brand
    const locBrandMap: Record<string, Record<string, number>> = {};
    sohList.forEach((s: any) => {
        const loc = (s.location || '').trim();
        const brand = (s.brand || '').trim();
        const qty = parseInt(s.qty) || 0;
        if (!loc || !brand || qty <= 0) return;
        if (!locBrandMap[loc]) locBrandMap[loc] = {};
        locBrandMap[loc][brand] = (locBrandMap[loc][brand] || 0) + qty;
    });

    const locDominant: Record<string, string> = {};
    Object.entries(locBrandMap).forEach(([loc, brands]) => {
        let maxB = '', maxQ = 0;
        Object.entries(brands).forEach(([b, q]) => { if (q > maxQ) { maxQ = q; maxB = b; } });
        if (maxB) locDominant[loc] = maxB;
    });

    const brandCount: Record<string, Record<string, number>> = { 'Picking Area': {}, 'Storage Area': {} };
    filtered.forEach((l: any) => {
        const lt = (l.location_type || '').trim();
        const locName = (l.location || '').trim();
        const brand = locDominant[locName];
        if (!brand || !brandCount[lt]) return;
        brandCount[lt][brand] = (brandCount[lt][brand] || 0) + 1;
    });

    const buildBrandRows = (type: string) =>
        Object.entries(brandCount[type] || {})
            .map(([brand, count]) => ({ brand, count, key: `${type}_${brand}` }))
            .sort((a, b) => b.count - a.count);

    const pickingBrands = buildBrandRows('Picking Area').slice(0, 5);
    const storageBrands = buildBrandRows('Storage Area').slice(0, 5);

    const brandColumns = [
        { title: '#', key: 'rank', width: 50, render: (_: any, __: any, idx: number) => idx + 1 },
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 180 },
        { title: 'Location', dataIndex: 'count', key: 'count', width: 100, render: (v: number) => <span style={{ color: '#60a5fa', fontWeight: 600 }}>{v}</span> },
    ];

    return (
        <>
            <Card title="📊 WH Utilization by Zone" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#fff' } }}>
                <ResizableTable
                    dataSource={finalRows}
                    columns={[
                        { title: 'Location Type', dataIndex: 'category', key: 'category', width: 160, render: (v: string, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                        { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 120 },
                        { title: 'Total Unit', dataIndex: 'total', key: 'total', width: 100, render: (v: number, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                        { title: 'Occupied', dataIndex: 'occupied', key: 'occupied', width: 100, render: (v: number) => <span style={{ color: '#4ade80', fontWeight: 600 }}>{v}</span> },
                        { title: '% Occupied', dataIndex: 'pctOccupied', key: 'pctOccupied', width: 120, render: (v: string) => (<Progress percent={parseFloat(v)} size="small" strokeColor="#10b981" format={() => `${v}%`} style={{ marginBottom: 0 }} />) },
                        { title: 'Empty', dataIndex: 'empty', key: 'empty', width: 100, render: (v: number) => <span style={{ color: '#f87171', fontWeight: 600 }}>{v}</span> },
                        { title: '% Empty', dataIndex: 'pctEmpty', key: 'pctEmpty', width: 120, render: (v: string) => (<Progress percent={parseFloat(v)} size="small" strokeColor="#f59e0b" format={() => `${v}%`} style={{ marginBottom: 0 }} />) },
                    ]}
                    rowKey="key"
                    size="small"
                    scroll={{ x: 'max-content' }}
                    pagination={false}
                    onRow={(record: any) => ({
                        style: record.isSummary ? summaryRowStyle : undefined,
                    })}
                />
            </Card>

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card title="📍 Location Use Per Brand — Picking Area" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#60a5fa' } }}>
                        <ResizableTable dataSource={pickingBrands} columns={brandColumns} rowKey="key" size="small" pagination={false} />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="📍 Location Use Per Brand — Storage Area" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#f59e0b' } }}>
                        <ResizableTable dataSource={storageBrands} columns={brandColumns} rowKey="key" size="small" pagination={false} />
                    </Card>
                </Col>
            </Row>
        </>
    );
}
