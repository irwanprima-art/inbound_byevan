import { Row, Col, Card, Progress, Table } from 'antd';
import ResizableTable from '../../components/ResizableTable';
import dayjs from 'dayjs';

interface Props {
    sohList: any[];
    locations: any[];
}

// Normalize location type variants to canonical names
function normalizeLocType(raw: string): '' | 'Picking Area' | 'Storage Area' {
    const t = (raw || '').trim().toLowerCase();
    if (t.includes('pick')) return 'Picking Area';
    if (t.includes('storag')) return 'Storage Area';
    return '';
}

export default function DashboardUtilizationTab({ sohList, locations }: Props) {
    // Only use records from the latest update_date (most recent snapshot)
    const latestDateStr = sohList.reduce((latest: string, s: any) => {
        if (s.update_date && s.update_date > latest) return s.update_date;
        return latest;
    }, '');
    const latestPrefix = latestDateStr ? latestDateStr.substring(0, 10) : '';
    const latestSoh = latestPrefix ? sohList.filter((s: any) => (s.update_date || '').startsWith(latestPrefix)) : sohList;

    // Build set of occupied locations from SOH data
    const occupiedLocs = new Set<string>();
    latestSoh.forEach((s: any) => {
        const loc = (s.location || '').trim();
        const qty = parseInt(s.qty) || 0;
        if (loc && qty > 0) occupiedLocs.add(loc);
    });

    // Filter locations to Picking Area and Storage Area (fuzzy match), then group
    const filtered = locations.filter((l: any) => normalizeLocType(l.location_type) !== '');

    const groupMap: Record<string, { category: string; zone: string; total: number; occupied: number }> = {};
    filtered.forEach((l: any) => {
        const cat = normalizeLocType(l.location_type);
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
    latestSoh.forEach((s: any) => {
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
        const lt = normalizeLocType(l.location_type);
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

    // Calculate Monthly WH Utilization for Table
    const sohByMonth: Record<string, any[]> = {};
    sohList.forEach((s: any) => {
        if (!s.update_date) return;
        const month = s.update_date.substring(0, 7); // 'YYYY-MM'
        if (!sohByMonth[month]) sohByMonth[month] = [];
        sohByMonth[month].push(s);
    });

    const months = Object.keys(sohByMonth).sort();
    
    const monthOccupiedLocs: Record<string, Set<string>> = {};
    months.forEach(month => {
        const monthSoh = sohByMonth[month];
        const latestDateInMonth = monthSoh.reduce((latest: string, s: any) => {
            if (s.update_date && s.update_date > latest) return s.update_date;
            return latest;
        }, '');
        const latestPrefixInMonth = latestDateInMonth ? latestDateInMonth.substring(0, 10) : '';
        const endOfMonthSoh = latestPrefixInMonth ? monthSoh.filter((s: any) => (s.update_date || '').startsWith(latestPrefixInMonth)) : monthSoh;
        
        const occLocs = new Set<string>();
        endOfMonthSoh.forEach((s: any) => {
            const loc = (s.location || '').trim();
            const qty = parseInt(s.qty) || 0;
            if (loc && qty > 0) occLocs.add(loc);
        });
        monthOccupiedLocs[month] = occLocs;
    });

    const monthlyTableMap: Record<string, any> = {};
    filtered.forEach((l: any) => {
        const cat = normalizeLocType(l.location_type);
        const zone = (l.zone || '').trim() || '-';
        const key = `${cat}|${zone}`;
        if (!monthlyTableMap[key]) {
            monthlyTableMap[key] = {
                key,
                locationType: cat,
                zone,
                total: 0,
                isSummary: false,
            };
            months.forEach(m => {
                monthlyTableMap[key][`${m}_occupiedCount`] = 0;
            });
        }
        monthlyTableMap[key].total++;
        const locName = (l.location || '').trim();
        if (locName) {
            months.forEach(m => {
                if (monthOccupiedLocs[m].has(locName)) {
                    monthlyTableMap[key][`${m}_occupiedCount`]++;
                }
            });
        }
    });

    const monthlyRows = Object.values(monthlyTableMap).sort((a, b) => a.locationType.localeCompare(b.locationType) || a.zone.localeCompare(b.zone));
    
    const finalMonthlyRows: any[] = [];
    let gmTotal = 0;
    const gmMonthlyOccupied: Record<string, number> = {};
    months.forEach(m => gmMonthlyOccupied[m] = 0);

    const locTypes = ['Picking Area', 'Storage Area'];
    locTypes.forEach(type => {
        const rows = monthlyRows.filter(r => r.locationType === type);
        if (rows.length === 0) return;
        finalMonthlyRows.push(...rows);
        
        const subTotal = rows.reduce((s, r) => s + r.total, 0);
        gmTotal += subTotal;
        const subRow: any = {
            key: `subtotal_${type}`,
            locationType: `Total ${type}`,
            zone: '',
            total: subTotal,
            isSummary: true,
        };
        months.forEach(m => {
            const mOcc = rows.reduce((s, r) => s + r[`${m}_occupiedCount`], 0);
            subRow[`${m}_occupiedCount`] = mOcc;
            gmMonthlyOccupied[m] += mOcc;
        });
        finalMonthlyRows.push(subRow);
    });

    const grandRow: any = {
        key: 'grand_total',
        locationType: 'Total All',
        zone: '',
        total: gmTotal,
        isSummary: true,
    };
    months.forEach(m => {
        grandRow[`${m}_occupiedCount`] = gmMonthlyOccupied[m];
    });
    finalMonthlyRows.push(grandRow);

    finalMonthlyRows.forEach(row => {
        months.forEach(m => {
            const occCount = row[`${m}_occupiedCount`];
            const pctOcc = row.total > 0 ? ((occCount / row.total) * 100).toFixed(1) : '0.0';
            const pctAvail = row.total > 0 ? (((row.total - occCount) / row.total) * 100).toFixed(1) : '0.0';
            row[`${m}_pctOccupied`] = pctOcc;
            row[`${m}_pctAvailable`] = pctAvail;
        });
    });

    const monthlyColumns: any[] = [
        { title: 'Location Type', dataIndex: 'locationType', key: 'locationType', width: 140, render: (v: string, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v, fixed: 'left' },
        { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 100, fixed: 'left' },
        { title: 'Total', dataIndex: 'total', key: 'total', width: 80, render: (v: number, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v, fixed: 'left' },
    ];

    months.forEach(m => {
        monthlyColumns.push({
            title: dayjs(`${m}-01`).format('MMM YYYY'),
            key: m,
            children: [
                {
                    title: '% Occupied',
                    dataIndex: `${m}_pctOccupied`,
                    key: `${m}_pctOccupied`,
                    width: 100,
                    align: 'center',
                    render: (v: string) => <span style={{ color: '#4ade80' }}>{v}%</span>
                },
                {
                    title: '% Available',
                    dataIndex: `${m}_pctAvailable`,
                    key: `${m}_pctAvailable`,
                    width: 100,
                    align: 'center',
                    render: (v: string) => <span style={{ color: '#f59e0b' }}>{v}%</span>
                }
            ]
        });
    });

    return (
        <>
            <Card
                title="📊 WH Utilization Perbulan"
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}
                styles={{ header: { color: '#fff' } }}
            >
                <Table
                    dataSource={finalMonthlyRows}
                    columns={monthlyColumns}
                    rowKey="key"
                    size="small"
                    scroll={{ x: 'max-content' }}
                    pagination={false}
                    bordered
                    onRow={(record: any) => ({
                        style: record.isSummary ? summaryRowStyle : undefined,
                    })}
                />
            </Card>

            <Card
                title={<span>📊 WH Utilization by Zone {latestDateStr && <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)', marginLeft: 12 }}>📆 Data Update: {dayjs(latestDateStr).format('DD MMM YYYY')}</span>}</span>}
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}
                styles={{ header: { color: '#fff' } }}
            >
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
