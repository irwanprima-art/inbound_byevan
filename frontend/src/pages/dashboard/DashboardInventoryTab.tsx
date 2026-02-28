import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Tag, Progress, DatePicker, Space, Button as AntButton } from 'antd';
import type { Dayjs } from 'dayjs';
import ResizableTable from '../../components/ResizableTable';
import dayjs from 'dayjs';

interface Props {
    dateRange: [Dayjs, Dayjs] | null;
    setDateRange: (v: [Dayjs, Dayjs] | null) => void;
    dccList: any[];
    sohList: any[];
    damages: any[];
    qcReturns: any[];
    locations: any[];
    matchesDateRange: (d: string) => boolean;
}

export default function DashboardInventoryTab({ dateRange, setDateRange, dccList, sohList, damages, qcReturns, locations, matchesDateRange }: Props) {
    const navigate = useNavigate();

    const fDccList = useMemo(() => dccList.filter(d => matchesDateRange(d.date)), [dccList, matchesDateRange]);
    const fDamages = useMemo(() => damages.filter(d => matchesDateRange(d.date)), [damages, matchesDateRange]);
    const fSohList = useMemo(() => sohList.filter(s => matchesDateRange(s.date)), [sohList, matchesDateRange]);
    const fQcReturns = useMemo(() => qcReturns.filter(q => matchesDateRange(q.qc_date || q.date)), [qcReturns, matchesDateRange]);

    // Use reconcile_variance when available, otherwise fall back to Round 1 variance
    const effectiveVariance = (d: any): number => {
        if (d.reconcile_variance != null) return parseInt(d.reconcile_variance) || 0;
        return parseInt(d.variance) || 0;
    };

    // Accuracy calculations
    const totalSysQty = fDccList.reduce((sum, d) => sum + (parseInt(d.sys_qty) || 0), 0);
    const totalPhyQty = fDccList.reduce((sum, d) => sum + (parseInt(d.phy_qty) || 0), 0);
    const shortageQty = fDccList.reduce((sum, d) => { const v = effectiveVariance(d); return sum + (v < 0 ? Math.abs(v) : 0); }, 0);
    const gainQty = fDccList.reduce((sum, d) => { const v = effectiveVariance(d); return sum + (v > 0 ? v : 0); }, 0);
    const accuracyQty = totalSysQty > 0 ? (((totalSysQty - shortageQty - gainQty) / totalSysQty) * 100).toFixed(2) : '0.00';

    // SKU Accuracy
    const skuVarianceMap: Record<string, number> = {};
    fDccList.forEach(d => {
        const sku = (d.sku || '').trim();
        if (!sku) return;
        const v = effectiveVariance(d);
        if (!skuVarianceMap.hasOwnProperty(sku)) skuVarianceMap[sku] = 0;
        skuVarianceMap[sku] += Math.abs(v);
    });
    const totalSkuCount = Object.keys(skuVarianceMap).length;
    const totalSkuMatch = Object.values(skuVarianceMap).filter(v => v === 0).length;
    const totalSkuNotMatch = totalSkuCount - totalSkuMatch;
    const accuracySku = totalSkuCount > 0 ? ((totalSkuMatch / totalSkuCount) * 100).toFixed(2) : '0.00';

    // Location Accuracy
    const locVarianceMap: Record<string, number> = {};
    fDccList.forEach(d => {
        const loc = (d.location || '').trim();
        if (!loc) return;
        const v = effectiveVariance(d);
        if (!locVarianceMap.hasOwnProperty(loc)) locVarianceMap[loc] = 0;
        locVarianceMap[loc] += Math.abs(v);
    });
    const totalLocCount = Object.keys(locVarianceMap).length;
    const totalLocMatch = Object.values(locVarianceMap).filter(v => v === 0).length;
    const totalLocNotMatch = totalLocCount - totalLocMatch;
    const accuracyLoc = totalLocCount > 0 ? ((totalLocMatch / totalLocCount) * 100).toFixed(2) : '0.00';

    return (
        <>
            <Space style={{ marginBottom: 16 }} wrap>
                <DatePicker.RangePicker
                    value={dateRange}
                    onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                    format="DD/MM/YYYY"
                    placeholder={['Dari Tanggal', 'Sampai Tanggal']}
                    allowClear
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}
                />
                <AntButton size="small" onClick={() => { const now = dayjs(); setDateRange([now.startOf('month'), now.endOf('month')]); }}>Bulan Ini</AntButton>
                <AntButton size="small" onClick={() => { const prev = dayjs().subtract(1, 'month'); setDateRange([prev.startOf('month'), prev.endOf('month')]); }}>Bulan Lalu</AntButton>
                {dateRange && <AntButton size="small" danger onClick={() => setDateRange(null)}>Reset</AntButton>}
            </Space>

            {/* Accuracy Cards */}
            <Row gutter={[16, 16]} style={{ marginTop: 24, display: 'flex', alignItems: 'stretch' }}>
                <Col xs={24} lg={8} style={{ display: 'flex' }}>
                    <Card style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, width: '100%', display: 'flex', flexDirection: 'column' }} styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <span style={{ fontSize: 18 }}>📊</span>
                            <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Qty Accuracy</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { label: 'Total Sys. Qty', value: totalSysQty.toLocaleString(), color: 'rgba(255,255,255,0.85)' },
                                { label: 'Total Phy. Qty', value: totalPhyQty.toLocaleString(), color: 'rgba(255,255,255,0.85)' },
                                { label: 'Shortage Qty', value: shortageQty.toLocaleString(), color: '#f87171', link: '/dcc?search=Shortage' },
                                { label: 'Gain Qty', value: gainQty.toLocaleString(), color: '#fbbf24', link: '/dcc?search=Gain' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', cursor: item.link ? 'pointer' : 'default', borderRadius: 4, padding: '2px 4px', transition: 'background 0.2s' }} onClick={item.link ? () => navigate(item.link!) : undefined} onMouseEnter={e => { if (item.link) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{item.label}</span>
                                    <span style={{ color: item.color, fontWeight: 600, fontSize: 13, textDecoration: item.link ? 'underline' : 'none' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ flex: 1 }} />
                        <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>Accuracy Qty</span>
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: 16 }}>{accuracyQty}%</span>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={8} style={{ display: 'flex' }}>
                    <Card style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, width: '100%', display: 'flex', flexDirection: 'column' }} styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <span style={{ fontSize: 18 }}>📦</span>
                            <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>SKU Accuracy</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { label: 'Total SKU Count', value: totalSkuCount.toLocaleString(), color: 'rgba(255,255,255,0.85)' },
                                { label: 'Total SKU Match', value: totalSkuMatch.toLocaleString(), color: '#4ade80' },
                                { label: 'Total SKU Not Match', value: totalSkuNotMatch.toLocaleString(), color: '#f87171', link: '/dcc?search=Shortage' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', cursor: item.link ? 'pointer' : 'default', borderRadius: 4, padding: '2px 4px', transition: 'background 0.2s' }} onClick={item.link ? () => navigate(item.link!) : undefined} onMouseEnter={e => { if (item.link) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{item.label}</span>
                                    <span style={{ color: item.color, fontWeight: 600, fontSize: 13, textDecoration: item.link ? 'underline' : 'none' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ flex: 1 }} />
                        <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>Accuracy SKU</span>
                            <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: 16 }}>{accuracySku}%</span>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={8} style={{ display: 'flex' }}>
                    <Card style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, width: '100%', display: 'flex', flexDirection: 'column' }} styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <span style={{ fontSize: 18 }}>📍</span>
                            <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Location Accuracy</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { label: 'Total Location Count', value: totalLocCount.toLocaleString(), color: 'rgba(255,255,255,0.85)' },
                                { label: 'Total Location Match', value: totalLocMatch.toLocaleString(), color: '#4ade80' },
                                { label: 'Total Location Not Match', value: totalLocNotMatch.toLocaleString(), color: '#f87171', link: '/dcc?search=Shortage' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', cursor: item.link ? 'pointer' : 'default', borderRadius: 4, padding: '2px 4px', transition: 'background 0.2s' }} onClick={item.link ? () => navigate(item.link!) : undefined} onMouseEnter={e => { if (item.link) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{item.label}</span>
                                    <span style={{ color: item.color, fontWeight: 600, fontSize: 13, textDecoration: item.link ? 'underline' : 'none' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ flex: 1 }} />
                        <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>Accuracy Location</span>
                            <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 16 }}>{accuracyLoc}%</span>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Shortage & Gain */}
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card title="📉 Shortage SKU" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#f87171' } }}>
                        <ResizableTable
                            dataSource={(() => {
                                const skuBrandMap: Record<string, string> = {};
                                fSohList.forEach((s: any) => { if (s.sku && s.brand) skuBrandMap[s.sku] = s.brand; });
                                fDccList.forEach((d: any) => { if (d.sku && d.brand) skuBrandMap[d.sku] = d.brand; });
                                const map: Record<string, { sku: string; brand: string; sys: number; phy: number; variance: number }> = {};
                                fDccList.forEach(d => {
                                    const v = parseInt(d.variance) || 0;
                                    if (v >= 0) return;
                                    const sku = (d.sku || '').trim();
                                    if (!sku) return;
                                    if (!map[sku]) map[sku] = { sku, brand: d.brand || skuBrandMap[sku] || '-', sys: 0, phy: 0, variance: 0 };
                                    map[sku].sys += parseInt(d.sys_qty) || 0;
                                    map[sku].phy += parseInt(d.phy_qty) || 0;
                                    map[sku].variance += v;
                                });
                                return Object.values(map).sort((a, b) => a.variance - b.variance);
                            })()}
                            columns={[
                                { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120 },
                                { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 150 },
                                { title: 'Sys Qty', dataIndex: 'sys', key: 'sys', width: 80 },
                                { title: 'Phy Qty', dataIndex: 'phy', key: 'phy', width: 80 },
                                { title: 'Variance', dataIndex: 'variance', key: 'variance', width: 90, render: (v: number) => <Tag color="red">{v}</Tag> },
                            ]}
                            rowKey="sku"
                            size="small"
                            scroll={{ y: 200 }}
                            pagination={false}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="📈 Gain SKU" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#4ade80' } }}>
                        <ResizableTable
                            dataSource={(() => {
                                const skuBrandMap: Record<string, string> = {};
                                fSohList.forEach((s: any) => { if (s.sku && s.brand) skuBrandMap[s.sku] = s.brand; });
                                fDccList.forEach((d: any) => { if (d.sku && d.brand) skuBrandMap[d.sku] = d.brand; });
                                const map: Record<string, { sku: string; brand: string; sys: number; phy: number; variance: number }> = {};
                                fDccList.forEach(d => {
                                    const v = parseInt(d.variance) || 0;
                                    if (v <= 0) return;
                                    const sku = (d.sku || '').trim();
                                    if (!sku) return;
                                    if (!map[sku]) map[sku] = { sku, brand: d.brand || skuBrandMap[sku] || '-', sys: 0, phy: 0, variance: 0 };
                                    map[sku].sys += parseInt(d.sys_qty) || 0;
                                    map[sku].phy += parseInt(d.phy_qty) || 0;
                                    map[sku].variance += v;
                                });
                                return Object.values(map).sort((a, b) => b.variance - a.variance);
                            })()}
                            columns={[
                                { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120 },
                                { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 150 },
                                { title: 'Sys Qty', dataIndex: 'sys', key: 'sys', width: 80 },
                                { title: 'Phy Qty', dataIndex: 'phy', key: 'phy', width: 80 },
                                { title: 'Variance', dataIndex: 'variance', key: 'variance', width: 90, render: (v: number) => <Tag color="green">+{v}</Tag> },
                            ]}
                            rowKey="sku"
                            size="small"
                            scroll={{ y: 200 }}
                            pagination={false}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Cycle Count Coverage */}
            {(() => {
                const zoneTotalMap: Record<string, number> = {};
                locations.forEach((l: any) => {
                    const zone = (l.zone || '').trim();
                    if (!zone) return;
                    zoneTotalMap[zone] = (zoneTotalMap[zone] || 0) + 1;
                });
                const zoneCountedMap: Record<string, Set<string>> = {};
                fDccList.forEach((d: any) => {
                    const zone = (d.zone || '').trim();
                    const loc = (d.location || '').trim();
                    if (!zone || !loc) return;
                    if (!zoneCountedMap[zone]) zoneCountedMap[zone] = new Set();
                    zoneCountedMap[zone].add(loc);
                });
                const ccRows = Object.keys(zoneTotalMap).sort().map(zone => {
                    const total = zoneTotalMap[zone];
                    const counted = zoneCountedMap[zone]?.size || 0;
                    const pct = total > 0 ? ((counted / total) * 100).toFixed(1) : '0.0';
                    return { zone, total, counted, pct, key: zone };
                });
                const ccTotal = ccRows.reduce((s, r) => s + r.total, 0);
                const ccCounted = ccRows.reduce((s, r) => s + r.counted, 0);
                const ccPct = ccTotal > 0 ? ((ccCounted / ccTotal) * 100).toFixed(1) : '0.0';
                return (
                    <Card title="📊 Cycle Count Coverage Per Zone" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24 }} styles={{ header: { color: '#fff' } }}>
                        <ResizableTable
                            dataSource={[...ccRows, { zone: 'Total', total: ccTotal, counted: ccCounted, pct: ccPct, key: '_total', isSummary: true } as any]}
                            columns={[
                                { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 140, render: (v: string, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                                { title: 'Total Location', dataIndex: 'total', key: 'total', width: 120, render: (v: number, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                                { title: 'Counted', dataIndex: 'counted', key: 'counted', width: 120, render: (v: number) => <span style={{ color: '#4ade80', fontWeight: 600 }}>{v}</span> },
                                {
                                    title: '% Counted', dataIndex: 'pct', key: 'pct', width: 200, render: (v: string) => (
                                        <Progress percent={parseFloat(v)} size="small"
                                            strokeColor={parseFloat(v) >= 90 ? '#10b981' : parseFloat(v) >= 50 ? '#f59e0b' : '#ef4444'}
                                            format={() => `${v}%`} style={{ marginBottom: 0 }} />
                                    )
                                },
                            ]}
                            rowKey="key"
                            size="small"
                            pagination={false}
                            onRow={(record: any) => ({
                                style: record.isSummary ? { background: 'rgba(99,102,241,0.15)', fontWeight: 700 } : undefined,
                            })}
                        />
                    </Card>
                );
            })()}

            {/* Project Damage */}
            <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Project Damage — Summary</span>
                </div>
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card title="📋 Damage Note Breakdown" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#fff' } }}>
                            <ResizableTable
                                dataSource={(() => {
                                    const map: Record<string, { damage_note: string; skuCount: number; totalQty: number; skus: Set<string> }> = {};
                                    fDamages.forEach((d: any) => {
                                        const note = (d.damage_note || '').trim() || 'Unknown';
                                        const sku = (d.sku || '').trim();
                                        const qty = parseInt(d.qty) || 0;
                                        if (!map[note]) map[note] = { damage_note: note, skuCount: 0, totalQty: 0, skus: new Set() };
                                        if (sku && !map[note].skus.has(sku)) { map[note].skus.add(sku); map[note].skuCount++; }
                                        map[note].totalQty += qty;
                                    });
                                    return Object.values(map).map(({ damage_note, skuCount, totalQty }) => ({ damage_note, sku: skuCount, qty: totalQty })).sort((a, b) => b.qty - a.qty);
                                })()}
                                columns={[
                                    { title: 'Damage Note', dataIndex: 'damage_note', key: 'damage_note' },
                                    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 80 },
                                    { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 80 },
                                ]}
                                rowKey="damage_note"
                                size="small"
                                scroll={{ y: 200 }}
                                pagination={false}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title="🏢 Damage Per Brand" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#fff' } }}>
                            <ResizableTable
                                dataSource={(() => {
                                    const map: Record<string, { brand: string; skuCount: number; totalQty: number; skus: Set<string> }> = {};
                                    fDamages.forEach((d: any) => {
                                        const brand = (d.brand || '').trim() || '-';
                                        const sku = (d.sku || '').trim();
                                        const qty = parseInt(d.qty) || 0;
                                        if (!map[brand]) map[brand] = { brand, skuCount: 0, totalQty: 0, skus: new Set() };
                                        if (sku && !map[brand].skus.has(sku)) { map[brand].skus.add(sku); map[brand].skuCount++; }
                                        map[brand].totalQty += qty;
                                    });
                                    return Object.values(map).map(({ brand, skuCount, totalQty }) => ({ brand, sku: skuCount, qty: totalQty })).sort((a, b) => b.qty - a.qty);
                                })()}
                                columns={[
                                    { title: 'Brand', dataIndex: 'brand', key: 'brand' },
                                    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 80 },
                                    { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 80 },
                                ]}
                                rowKey="brand"
                                size="small"
                                scroll={{ y: 200 }}
                                pagination={false}
                            />
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* QC Return */}
            <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 20 }}>🔄</span>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>QC Return — Summary</span>
                </div>
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card title="🏢 QC Return Per Brand" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#fff' } }}>
                            <ResizableTable
                                dataSource={(() => {
                                    const map: Record<string, { brand: string; good: number; damage: number }> = {};
                                    fQcReturns.forEach((q: any) => {
                                        const brand = (q.owner || '').trim() || '-';
                                        const qty = parseInt(q.qty) || 0;
                                        const status = (q.status || '').trim().toLowerCase();
                                        if (!map[brand]) map[brand] = { brand, good: 0, damage: 0 };
                                        if (status === 'good') map[brand].good += qty;
                                        else if (status === 'damage') map[brand].damage += qty;
                                    });
                                    return Object.values(map).sort((a, b) => (b.good + b.damage) - (a.good + a.damage));
                                })()}
                                columns={[
                                    { title: 'Brand', dataIndex: 'brand', key: 'brand' },
                                    { title: 'Good', dataIndex: 'good', key: 'good', width: 80, render: (v: number) => <span style={{ color: '#4ade80' }}>{v}</span> },
                                    { title: 'Damage', dataIndex: 'damage', key: 'damage', width: 80, render: (v: number) => <span style={{ color: '#f87171' }}>{v}</span> },
                                ]}
                                rowKey="brand"
                                size="small"
                                scroll={{ y: 200 }}
                                pagination={false}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title="👤 Productivity QC By" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#fff' } }}>
                            <ResizableTable
                                dataSource={(() => {
                                    const map: Record<string, { operator: string; good: number; damage: number; total: number }> = {};
                                    fQcReturns.forEach((q: any) => {
                                        const op = (q.operator || '').trim() || '-';
                                        const qty = parseInt(q.qty) || 0;
                                        const status = (q.status || '').trim().toLowerCase();
                                        if (!map[op]) map[op] = { operator: op, good: 0, damage: 0, total: 0 };
                                        if (status === 'good') map[op].good += qty;
                                        else if (status === 'damage') map[op].damage += qty;
                                        map[op].total += qty;
                                    });
                                    return Object.values(map).sort((a, b) => b.total - a.total);
                                })()}
                                columns={[
                                    { title: 'Operator', dataIndex: 'operator', key: 'operator' },
                                    { title: 'Good', dataIndex: 'good', key: 'good', width: 70, render: (v: number) => <span style={{ color: '#4ade80' }}>{v}</span> },
                                    { title: 'Damage', dataIndex: 'damage', key: 'damage', width: 70, render: (v: number) => <span style={{ color: '#f87171' }}>{v}</span> },
                                    { title: 'Total', dataIndex: 'total', key: 'total', width: 70 },
                                ]}
                                rowKey="operator"
                                size="small"
                                scroll={{ y: 200 }}
                                pagination={false}
                            />
                        </Card>
                    </Col>
                </Row>
            </div>
        </>
    );
}
