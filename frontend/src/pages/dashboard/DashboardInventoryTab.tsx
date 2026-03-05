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
    sections?: string[];
}

export default function DashboardInventoryTab({ dateRange, setDateRange, dccList, sohList, damages, qcReturns, locations, matchesDateRange, sections }: Props) {
    const show = (key: string) => !sections || sections.includes(key);
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

    // Use reconcile qty when available, otherwise fall back to Round 1
    const effectiveSysQty = (d: any): number => {
        if (d.reconcile_sys_qty != null && d.reconcile_sys_qty !== '') return parseInt(d.reconcile_sys_qty) || 0;
        return parseInt(d.sys_qty) || 0;
    };
    const effectivePhyQty = (d: any): number => {
        if (d.reconcile_phy_qty != null && d.reconcile_phy_qty !== '') return parseInt(d.reconcile_phy_qty) || 0;
        return parseInt(d.phy_qty) || 0;
    };

    // Accuracy calculations — use effective (reconcile-aware) values
    const totalSysQty = fDccList.reduce((sum, d) => sum + effectiveSysQty(d), 0);
    const totalPhyQty = fDccList.reduce((sum, d) => sum + effectivePhyQty(d), 0);
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
            {show('datefilter') && <Space style={{ marginBottom: 16 }} wrap>
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
            </Space>}

            {/* Accuracy Cards */}
            {show('accuracy') && <><Row gutter={[16, 16]} style={{ marginTop: 24, display: 'flex', alignItems: 'stretch' }}>
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

                {/* Shortage & Gain — net per SKU using reconcile-aware values */}
                {(() => {
                    const skuBrandMap: Record<string, string> = {};
                    fSohList.forEach((s: any) => { if (s.sku && s.brand) skuBrandMap[s.sku] = s.brand; });
                    fDccList.forEach((d: any) => { if (d.sku && d.brand) skuBrandMap[d.sku] = d.brand; });
                    const map: Record<string, { sku: string; brand: string; sys: number; phy: number; variance: number }> = {};
                    fDccList.forEach(d => {
                        const sku = (d.sku || '').trim();
                        if (!sku) return;
                        if (!map[sku]) map[sku] = { sku, brand: d.brand || skuBrandMap[sku] || '-', sys: 0, phy: 0, variance: 0 };
                        map[sku].sys += effectiveSysQty(d);
                        map[sku].phy += effectivePhyQty(d);
                        map[sku].variance += effectiveVariance(d);
                    });
                    const allSkus = Object.values(map);
                    const shortageSkus = allSkus.filter(s => s.variance < 0).sort((a, b) => a.variance - b.variance);
                    const gainSkus = allSkus.filter(s => s.variance > 0).sort((a, b) => b.variance - a.variance);
                    const skuColumns = [
                        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120 },
                        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 150 },
                        { title: 'Sys Qty', dataIndex: 'sys', key: 'sys', width: 80 },
                        { title: 'Phy Qty', dataIndex: 'phy', key: 'phy', width: 80 },
                    ];
                    return (
                        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                            <Col xs={24} lg={12}>
                                <Card title={`Shortage SKU (${shortageSkus.length})`} style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#f87171' } }}>
                                    <ResizableTable
                                        dataSource={shortageSkus}
                                        columns={[...skuColumns, { title: 'Variance', dataIndex: 'variance', key: 'variance', width: 90, render: (v: number) => <Tag color="red">{v}</Tag> }]}
                                        rowKey="sku"
                                        size="small"
                                        scroll={{ y: 200 }}
                                        pagination={false}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} lg={12}>
                                <Card title={`Gain SKU (${gainSkus.length})`} style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#4ade80' } }}>
                                    <ResizableTable
                                        dataSource={gainSkus}
                                        columns={[...skuColumns, { title: 'Variance', dataIndex: 'variance', key: 'variance', width: 90, render: (v: number) => <Tag color="green">+{v}</Tag> }]}
                                        rowKey="sku"
                                        size="small"
                                        scroll={{ y: 200 }}
                                        pagination={false}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    );
                })()}</>}

            {/* Inventory Variances — from SOH location VAR01 */}
            {show('variances') && (() => {
                const MONTH_LABELS: Record<string, string> = {
                    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
                    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
                    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
                };

                // Filter SOH for location VAR01
                const varSoh = sohList.filter((s: any) => (s.location || '').trim().toUpperCase() === 'VAR01');

                // Find last update_date per month
                const lastDatePerMonth: Record<string, string> = {};
                varSoh.forEach((s: any) => {
                    const ud = (s.update_date || '').substring(0, 10);
                    if (!ud) return;
                    const mk = ud.substring(0, 7); // YYYY-MM
                    if (!lastDatePerMonth[mk] || ud > lastDatePerMonth[mk]) lastDatePerMonth[mk] = ud;
                });

                // Build brand × month map (only records matching last date of each month)
                const brandMonthMap: Record<string, Record<string, number>> = {};
                const allMonths = new Set<string>();
                varSoh.forEach((s: any) => {
                    const ud = (s.update_date || '').substring(0, 10);
                    if (!ud) return;
                    const mk = ud.substring(0, 7);
                    if (ud !== lastDatePerMonth[mk]) return; // Only last date of month
                    allMonths.add(mk);
                    const brand = (s.brand || 'Unknown').toUpperCase();
                    if (!brandMonthMap[brand]) brandMonthMap[brand] = {};
                    brandMonthMap[brand][mk] = (brandMonthMap[brand][mk] || 0) + (Number(s.qty) || 0);
                });

                const sortedMonths = Array.from(allMonths).sort();
                const rows = Object.entries(brandMonthMap).map(([brand, months]) => {
                    const row: any = { key: brand, brand };
                    sortedMonths.forEach(m => { row[m] = months[m] || 0; });
                    return row;
                }).sort((a, b) => a.brand.localeCompare(b.brand));

                // TOTAL row
                const totalRow: any = { key: '_TOTAL', brand: 'TOTAL', _isTotal: true };
                sortedMonths.forEach(m => {
                    totalRow[m] = rows.reduce((sum, r) => sum + (r[m] || 0), 0);
                });

                const monthCols = sortedMonths.map(m => {
                    const [, mm] = m.split('-');
                    return {
                        title: MONTH_LABELS[mm] || mm,
                        dataIndex: m,
                        key: m,
                        width: 90,
                        align: 'center' as const,
                        render: (v: number, rec: any) => {
                            if (!v) return <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>;
                            const color = v < 0 ? '#ef4444' : v > 0 ? '#4ade80' : '#fff';
                            return <span style={{ color, fontWeight: rec._isTotal ? 700 : 600 }}>{v.toLocaleString()}</span>;
                        },
                    };
                });

                return (
                    <Card
                        title="📦 Inventory Variances (VAR01)"
                        style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: sections ? 0 : 24, ...(sections ? { height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' } : {}) }}
                        styles={{ header: { color: '#fff' }, ...(sections ? { body: { flex: 1, overflow: 'auto', padding: '8px 16px' } } : {}) }}
                    >
                        <ResizableTable
                            dataSource={[totalRow, ...rows]}
                            columns={[
                                {
                                    title: 'Brand', dataIndex: 'brand', key: 'brand', width: 140, fixed: 'left' as const,
                                    render: (v: string, r: any) => r._isTotal ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v,
                                },
                                ...monthCols,
                            ]}
                            rowKey="key"
                            size="small"
                            scroll={{ x: 'max-content', ...(sections ? {} : { y: 300 }) }}
                            pagination={false}
                            onRow={(record: any) => ({
                                style: record._isTotal ? { background: 'rgba(99,102,241,0.12)', fontWeight: 700 } : undefined,
                            })}
                        />
                    </Card>
                );
            })()}

            {/* Cycle Count Coverage */}
            {show('cycle_count') && (() => {
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
            {show('damage_qc') && <><div style={{ marginTop: 32 }}>
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
                </div></>}
            {/* Inventory Rate */}
            {show('inventory_rate') && <><div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 20 }}>📈</span>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Inventory Rate — Per Brand</span>
                </div>
                <Card style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <ResizableTable
                        dataSource={(() => {
                            // Build location -> damage_type and location -> category/type maps
                            const locDmgMap: Record<string, string> = {};
                            const locCatMap: Record<string, string> = {};
                            const locTypeMap: Record<string, string> = {};
                            locations.forEach((loc: any) => {
                                if (!loc.location) return;
                                if (loc.damage_type) locDmgMap[loc.location] = loc.damage_type.trim().toLowerCase();
                                if (loc.location_category) locCatMap[loc.location] = loc.location_category.trim().toLowerCase();
                                if (loc.location_type) locTypeMap[loc.location] = loc.location_type.trim().toLowerCase();
                            });

                            // Use ALL SOH data (latest snapshot, not date-filtered)
                            const brandMap: Record<string, {
                                brand: string;
                                storagePicking: number;
                                variance: number;
                                extDamage: number;
                                intDamage: number;
                                expired: number;
                                pest: number;
                            }> = {};

                            sohList.forEach((s: any) => {
                                const brand = (s.brand || '').trim() || '-';
                                const qty = parseInt(s.qty) || 0;
                                const loc = (s.location || '').trim();
                                const locLower = loc.toLowerCase();
                                const locCat = locCatMap[loc] || (s.location_category || '').trim().toLowerCase();
                                const locType = locTypeMap[loc] || (s.location_type || '').trim().toLowerCase();
                                const dmgType = locDmgMap[loc] || '';

                                if (!brandMap[brand]) brandMap[brand] = { brand, storagePicking: 0, variance: 0, extDamage: 0, intDamage: 0, expired: 0, pest: 0 };

                                // Sellable: Storage+Picking where location_category = sellable
                                if ((locType === 'storage' || locType === 'picking') && locCat === 'sellable') {
                                    brandMap[brand].storagePicking += qty;
                                }
                                // Variance: location VAR01 or suspend
                                else if (locLower === 'var01' || locLower === 'suspend') {
                                    brandMap[brand].variance += qty;
                                }
                                // Non-sellable based on damage_type
                                else if (dmgType === 'external damage') {
                                    brandMap[brand].extDamage += qty;
                                } else if (dmgType === 'internal damage') {
                                    brandMap[brand].intDamage += qty;
                                } else if (dmgType === 'expired') {
                                    brandMap[brand].expired += qty;
                                } else if (dmgType === 'pest') {
                                    brandMap[brand].pest += qty;
                                }
                            });

                            const rows = Object.values(brandMap).map(b => {
                                const totalSellable = b.storagePicking + b.variance;
                                const totalNonSellable = b.extDamage + b.intDamage + b.expired + b.pest;
                                const total = totalSellable + totalNonSellable;
                                const nonSellableRate = total > 0 ? ((totalNonSellable / total) * 100).toFixed(2) : '0.00';
                                return { ...b, totalSellable, totalNonSellable, nonSellableRate, total };
                            }).sort((a, b) => b.total - a.total);

                            // Add summary row
                            const summary = rows.reduce((acc, r) => ({
                                brand: 'TOTAL', isSummary: true,
                                storagePicking: acc.storagePicking + r.storagePicking,
                                variance: acc.variance + r.variance,
                                extDamage: acc.extDamage + r.extDamage,
                                intDamage: acc.intDamage + r.intDamage,
                                expired: acc.expired + r.expired,
                                pest: acc.pest + r.pest,
                                totalSellable: acc.totalSellable + r.totalSellable,
                                totalNonSellable: acc.totalNonSellable + r.totalNonSellable,
                                total: acc.total + r.total,
                                nonSellableRate: '0',
                            }), { brand: 'TOTAL', isSummary: true, storagePicking: 0, variance: 0, extDamage: 0, intDamage: 0, expired: 0, pest: 0, totalSellable: 0, totalNonSellable: 0, total: 0, nonSellableRate: '0' });
                            summary.nonSellableRate = summary.total > 0 ? ((summary.totalNonSellable / summary.total) * 100).toFixed(2) : '0.00';

                            return [...rows, summary];
                        })()}
                        columns={[
                            {
                                title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100, fixed: 'left' as const,
                                render: (v: string, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v,
                            },
                            {
                                title: 'Sellable Qty',
                                children: [
                                    { title: 'Storage+Picking', dataIndex: 'storagePicking', key: 'storagePicking', width: 130, render: (v: number, r: any) => <span style={{ color: '#4ade80', fontWeight: r.isSummary ? 700 : 400 }}>{v.toLocaleString()}</span> },
                                    { title: 'Variance', dataIndex: 'variance', key: 'variance', width: 100, render: (v: number, r: any) => <span style={{ color: '#fbbf24', fontWeight: r.isSummary ? 700 : 400 }}>{v.toLocaleString()}</span> },
                                ],
                            },
                            { title: 'Total Sellable', dataIndex: 'totalSellable', key: 'totalSellable', width: 120, render: (v: number) => <span style={{ color: '#4ade80', fontWeight: 700 }}>{v.toLocaleString()}</span> },
                            {
                                title: 'Non Sellable Qty',
                                children: [
                                    { title: 'External Damage', dataIndex: 'extDamage', key: 'extDamage', width: 130, render: (v: number, r: any) => <span style={{ color: v > 0 ? '#f87171' : 'rgba(255,255,255,0.3)', fontWeight: r.isSummary ? 700 : 400 }}>{v.toLocaleString()}</span> },
                                    { title: 'Internal Damage', dataIndex: 'intDamage', key: 'intDamage', width: 130, render: (v: number, r: any) => <span style={{ color: v > 0 ? '#f87171' : 'rgba(255,255,255,0.3)', fontWeight: r.isSummary ? 700 : 400 }}>{v.toLocaleString()}</span> },
                                    { title: 'Expired', dataIndex: 'expired', key: 'expired', width: 100, render: (v: number, r: any) => <span style={{ color: v > 0 ? '#fb923c' : 'rgba(255,255,255,0.3)', fontWeight: r.isSummary ? 700 : 400 }}>{v.toLocaleString()}</span> },
                                    { title: 'PEST', dataIndex: 'pest', key: 'pest', width: 80, render: (v: number, r: any) => <span style={{ color: v > 0 ? '#c084fc' : 'rgba(255,255,255,0.3)', fontWeight: r.isSummary ? 700 : 400 }}>{v.toLocaleString()}</span> },
                                ],
                            },
                            { title: 'Total Non Sellable', dataIndex: 'totalNonSellable', key: 'totalNonSellable', width: 140, render: (v: number) => <span style={{ color: v > 0 ? '#f87171' : 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{v.toLocaleString()}</span> },
                            {
                                title: 'Non Sellable Rate', dataIndex: 'nonSellableRate', key: 'nonSellableRate', width: 140,
                                render: (v: string) => {
                                    const pct = parseFloat(v);
                                    return <Tag color={pct === 0 ? 'green' : pct <= 2 ? 'gold' : 'red'}>{v}%</Tag>;
                                },
                            },
                        ]}
                        rowKey="brand"
                        size="small"
                        scroll={{ x: 1200 }}
                        pagination={false}
                        bordered
                        onRow={(record: any) => ({
                            style: record.isSummary ? { background: 'rgba(99,102,241,0.15)', fontWeight: 700 } : undefined,
                        })}
                    />
                </Card>
            </div></>}
        </>
    );
}
