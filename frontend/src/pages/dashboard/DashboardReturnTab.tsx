import { useMemo } from 'react';
import { Row, Col, Card, Typography, Table, DatePicker, Space, Button as AntButton, Statistic } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    LineChart, Line,
} from 'recharts';

const { Text } = Typography;
const COLORS = ['#10b981', '#ef4444', '#6366f1', '#f59e0b', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6', '#14b8a6', '#e11d48'];

interface Props {
    dateRange: [Dayjs, Dayjs] | null;
    setDateRange: (v: [Dayjs, Dayjs] | null) => void;
    returnReceives: any[];
    rejectReturns: any[];
    orderPerBrands: any[];
    returnTransactions: any[];
    matchesDateRange: (d: string) => boolean;
    sections?: string[];
}

export default function DashboardReturnTab({ dateRange, setDateRange, returnReceives, rejectReturns, orderPerBrands, returnTransactions, matchesDateRange, sections }: Props) {
    const show = (key: string) => !sections || sections.includes(key);

    // Brand normalization: merge similar brand names + case-insensitive
    const BRAND_ALIASES: [RegExp, string][] = [
        [/^Mama'?s\s*Choice/i, "Mama's Choice"],
    ];
    const normalizeBrand = (brand: string): string => {
        // Title Case: "MAKUKU" / "makuku" → "Makuku"
        const titleCase = brand.trim().toLowerCase().replace(/(?:^|\s|[-_])\S/g, c => c.toUpperCase());
        for (const [pattern, alias] of BRAND_ALIASES) {
            if (pattern.test(titleCase)) return alias;
        }
        return titleCase;
    };

    // Filter by date range
    const filteredReceives = useMemo(() =>
        returnReceives.filter(r => matchesDateRange(r.return_date || r.receive_date)),
        [returnReceives, matchesDateRange]
    );
    const filteredRejects = useMemo(() =>
        rejectReturns.filter(r => matchesDateRange(r.input_date || r.order_date)),
        [rejectReturns, matchesDateRange]
    );

    // ═══ 1. Return per Brand (GOOD / DAMAGE / TOTAL) + Chart ═══
    const returnPerBrand = useMemo(() => {
        const map: Record<string, { good: number; damage: number }> = {};
        filteredReceives.forEach((r: any) => {
            const brand = normalizeBrand(r.brand || 'Unknown');
            if (!map[brand]) map[brand] = { good: 0, damage: 0 };
            const qty = r.return_qty || 0;
            const status = (r.stock_status || '').toLowerCase();
            if (status.includes('damage')) map[brand].damage += qty;
            else map[brand].good += qty;
        });
        return Object.entries(map)
            .map(([brand, v]) => ({ brand, good: v.good, damage: v.damage, total: v.good + v.damage }))
            .sort((a, b) => b.total - a.total);
    }, [filteredReceives]);

    // ═══ 2. Return per Reason Group (qty) ═══
    const reasonGroups = useMemo(() => {
        const groups = new Set<string>();
        filteredReceives.forEach((r: any) => { if (r.reason_group) groups.add(r.reason_group); });
        return Array.from(groups).sort();
    }, [filteredReceives]);

    const returnPerReasonQty = useMemo(() => {
        const map: Record<string, Record<string, number>> = {};
        filteredReceives.forEach((r: any) => {
            const brand = normalizeBrand(r.brand || 'Unknown');
            const rg = r.reason_group || 'Unknown';
            if (!map[brand]) map[brand] = {};
            map[brand][rg] = (map[brand][rg] || 0) + (r.return_qty || 0);
        });
        return Object.entries(map).map(([brand, groups]) => {
            const row: any = { brand };
            let total = 0;
            reasonGroups.forEach(g => { row[g] = groups[g] || 0; total += groups[g] || 0; });
            row.total = total;
            return row;
        }).sort((a, b) => b.total - a.total);
    }, [filteredReceives, reasonGroups]);

    // ═══ 3. Return per Reason Group (order = countunique receipt_no) ═══
    const returnPerReasonOrder = useMemo(() => {
        const map: Record<string, Record<string, Set<string>>> = {};
        filteredReceives.forEach((r: any) => {
            const brand = normalizeBrand(r.brand || 'Unknown');
            const rg = r.reason_group || 'Unknown';
            const receipt = r.receipt_no || '';
            if (!receipt) return;
            if (!map[brand]) map[brand] = {};
            if (!map[brand][rg]) map[brand][rg] = new Set();
            map[brand][rg].add(receipt);
        });
        return Object.entries(map).map(([brand, groups]) => {
            const row: any = { brand };
            let total = 0;
            reasonGroups.forEach(g => { const cnt = groups[g]?.size || 0; row[g] = cnt; total += cnt; });
            row.total = total;
            return row;
        }).sort((a, b) => b.total - a.total);
    }, [filteredReceives, reasonGroups]);

    // Shared columns for reason group tables
    const reasonCols = () => [
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120, fixed: 'left' as const },
        ...reasonGroups.map(g => ({ title: g, dataIndex: g, key: g, width: 120, render: (v: number) => (v || 0).toLocaleString() })),
        { title: 'Total', dataIndex: 'total', key: 'total', width: 100, render: (v: number) => <Text strong style={{ color: '#60a5fa' }}>{(v || 0).toLocaleString()}</Text> },
    ];

    // ═══ 4. % Return per Brand per Month (uses ALL data, not date-filtered) ═══
    const MONTH_FORMATS = ['MMMM YYYY', 'YYYY-MM', 'MM-YYYY', 'MMM-YY', 'MMM YY', 'MMM-YYYY', 'MMM YYYY'];
    const months = useMemo(() => {
        const ms = new Set<string>();
        // Use ALL return receives (not filtered) so all months appear
        returnReceives.forEach((r: any) => {
            const d = dayjs(r.return_date || r.receive_date);
            if (d.isValid()) ms.add(d.format('YYYY-MM'));
        });
        orderPerBrands.forEach((o: any) => {
            if (o.month) {
                const d = dayjs(o.month, MONTH_FORMATS);
                if (d.isValid()) ms.add(d.format('YYYY-MM'));
            }
        });
        return Array.from(ms).sort();
    }, [returnReceives, orderPerBrands]);

    const returnPercentData = useMemo(() => {
        // Count unique receipt_no per brand per month from ALL return receives
        const returnMap: Record<string, Record<string, Set<string>>> = {};
        returnReceives.forEach((r: any) => {
            const brand = normalizeBrand(r.brand || 'Unknown');
            const d = dayjs(r.return_date || r.receive_date);
            if (!d.isValid()) return;
            const month = d.format('YYYY-MM');
            if (!returnMap[brand]) returnMap[brand] = {};
            if (!returnMap[brand][month]) returnMap[brand][month] = new Set();
            if (r.receipt_no) returnMap[brand][month].add(r.receipt_no);
        });

        // Order counts from Order per Brand
        const orderMap: Record<string, Record<string, number>> = {};
        orderPerBrands.forEach((o: any) => {
            const brand = normalizeBrand(o.brand || 'Unknown');
            if (o.month) {
                const d = dayjs(o.month, MONTH_FORMATS);
                if (d.isValid()) {
                    const month = d.format('YYYY-MM');
                    if (!orderMap[brand]) orderMap[brand] = {};
                    orderMap[brand][month] = (orderMap[brand][month] || 0) + (o.order_count || 0);
                }
            }
        });

        // Build rows
        const allBrands = new Set<string>([...Object.keys(returnMap), ...Object.keys(orderMap)]);
        return Array.from(allBrands).map(brand => {
            const row: any = { brand };
            months.forEach(m => {
                const retCount = returnMap[brand]?.[m]?.size || 0;
                const ordCount = orderMap[brand]?.[m] || 0;
                const pct = ordCount > 0 ? ((retCount / ordCount) * 100).toFixed(1) : '-';
                row[`${m}_return`] = retCount;
                row[`${m}_order`] = ordCount;
                row[`${m}_pct`] = pct;
            });
            return row;
        }).sort((a, b) => a.brand.localeCompare(b.brand));
    }, [returnReceives, orderPerBrands, months]);

    const percentCols = useMemo(() => [
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100, fixed: 'left' as const },
        ...months.map(m => ({
            title: dayjs(m, 'YYYY-MM').format('MMM YYYY'),
            children: [
                { title: 'Return', dataIndex: `${m}_return`, key: `${m}_return`, width: 70, render: (v: number) => (v || 0).toLocaleString() },
                { title: 'Order', dataIndex: `${m}_order`, key: `${m}_order`, width: 70, render: (v: number) => (v || 0).toLocaleString() },
                { title: '%', dataIndex: `${m}_pct`, key: `${m}_pct`, width: 60, render: (v: string) => <Text style={{ color: v === '-' ? 'rgba(255,255,255,0.3)' : parseFloat(v) > 5 ? '#ef4444' : '#10b981' }}>{v === '-' ? '-' : `${v}%`}</Text> },
            ],
        })),
    ], [months]);

    // ═══ 5. Reject Return per Logistics (countunique AWB per brand) ═══
    const logistics = useMemo(() => {
        const set = new Set<string>();
        filteredRejects.forEach((r: any) => { if (r.logistic) set.add(r.logistic); });
        return Array.from(set).sort();
    }, [filteredRejects]);

    const rejectPerLogistic = useMemo(() => {
        const map: Record<string, Record<string, Set<string>>> = {};
        filteredRejects.forEach((r: any) => {
            const brand = normalizeBrand(r.brand || 'Unknown');
            const log = r.logistic || 'Unknown';
            const awb = r.awb_num || '';
            if (!awb) return;
            if (!map[brand]) map[brand] = {};
            if (!map[brand][log]) map[brand][log] = new Set();
            map[brand][log].add(awb);
        });
        return Object.entries(map).map(([brand, logs]) => {
            const row: any = { brand };
            let total = 0;
            logistics.forEach(l => { const cnt = logs[l]?.size || 0; row[l] = cnt; total += cnt; });
            row.total = total;
            return row;
        }).sort((a, b) => b.total - a.total);
    }, [filteredRejects, logistics]);

    const rejectCols = useMemo(() => [
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120, fixed: 'left' as const },
        ...logistics.map(l => ({ title: l, dataIndex: l, key: l, width: 120, render: (v: number) => (v || 0).toLocaleString() })),
        { title: 'Total', dataIndex: 'total', key: 'total', width: 100, render: (v: number) => <Text strong style={{ color: '#f59e0b' }}>{(v || 0).toLocaleString()}</Text> },
    ], [logistics]);

    // ═══ 6. AWB per Brand chart data ═══
    const awbPerBrandChart = useMemo(() => {
        const map: Record<string, Set<string>> = {};
        filteredRejects.forEach((r: any) => {
            const brand = normalizeBrand(r.brand || 'Unknown');
            if (!map[brand]) map[brand] = new Set();
            if (r.awb_num) map[brand].add(r.awb_num);
        });
        return Object.entries(map)
            .map(([brand, awbs]) => ({ brand, count: awbs.size }))
            .sort((a, b) => b.count - a.count);
    }, [filteredRejects]);

    const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' as const, zIndex: 0, overflow: 'hidden' as const };

    return (
        <div>
            {/* Date Filter */}
            {show('date_filter') && (
                <Space style={{ marginBottom: 16 }} wrap>
                    <DatePicker.RangePicker
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                        format="DD/MM/YYYY"
                        allowClear
                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}
                    />
                    <AntButton size="small" onClick={() => { const n = dayjs(); setDateRange([n.startOf('month'), n.endOf('month')]); }}>Bulan Ini</AntButton>
                    <AntButton size="small" onClick={() => { const p = dayjs().subtract(1, 'month'); setDateRange([p.startOf('month'), p.endOf('month')]); }}>Bulan Lalu</AntButton>
                    {dateRange && <AntButton size="small" danger onClick={() => setDateRange(null)}>Reset</AntButton>}
                </Space>
            )}

            {/* Avg Arrival→Putaway & Avg Receive→Putaway cards */}
            {show('avg_times') && (() => {
                // Build txLookup from returnTransactions
                const txLookup: Record<string, { firstReceive: string | null; lastPutaway: string | null }> = {};
                returnTransactions.forEach((tx: any) => {
                    const key = (tx.receipt_no || '').trim().toLowerCase();
                    if (!key) return;
                    if (!txLookup[key]) txLookup[key] = { firstReceive: null, lastPutaway: null };
                    const type = (tx.operate_type || '').trim().toLowerCase();
                    const txTime = tx.time_transaction || '';
                    if (type === 'receive' || type === 'receiving') {
                        if (txTime && (!txLookup[key].firstReceive || txTime < txLookup[key].firstReceive!)) txLookup[key].firstReceive = txTime;
                    } else if (type === 'putaway') {
                        if (txTime && (!txLookup[key].lastPutaway || txTime > txLookup[key].lastPutaway!)) txLookup[key].lastPutaway = txTime;
                    }
                });

                // Enrich filtered receives
                const enriched = filteredReceives.map((row: any) => {
                    const key = (row.receipt_no || '').trim().toLowerCase();
                    const tx = txLookup[key] || { firstReceive: null, lastPutaway: null };
                    return { ...row, first_receive: tx.firstReceive, last_putaway: tx.lastPutaway };
                });

                // Avg Arrival → Putaway
                const calcAvg = (getStart: (r: any) => string | null, getEnd: (r: any) => string | null) => {
                    const diffs: number[] = [];
                    const seen = new Set<string>();
                    enriched.forEach((a: any) => {
                        const key = (a.receipt_no || '').trim().toLowerCase();
                        if (!key || seen.has(key)) return;
                        seen.add(key);
                        const startVal = getStart(a);
                        const endVal = getEnd(a);
                        if (!startVal || !endVal) return;
                        const s = dayjs(startVal);
                        const e = dayjs(endVal);
                        if (!s.isValid() || !e.isValid()) return;
                        const diffMin = e.diff(s, 'minute');
                        if (diffMin > 0) diffs.push(diffMin);
                    });
                    if (diffs.length === 0) return '-';
                    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
                    const h = Math.floor(avg / 60); const m = Math.floor(avg % 60); const s = Math.round((avg % 1) * 60);
                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                };

                const avgArrPut = calcAvg(r => r.arrival_date, r => r.last_putaway);
                const avgRecPut = calcAvg(r => r.first_receive, r => r.last_putaway);

                // Monthly avg Receive → Putaway for line chart
                const monthlyMap: Record<string, number[]> = {};
                const seenMonthly = new Set<string>();
                enriched.forEach((a: any) => {
                    const rkey = (a.receipt_no || '').trim().toLowerCase();
                    if (!rkey || seenMonthly.has(rkey)) return;
                    seenMonthly.add(rkey);
                    if (!a.first_receive || !a.last_putaway) return;
                    const s = dayjs(a.first_receive);
                    const e = dayjs(a.last_putaway);
                    if (!s.isValid() || !e.isValid()) return;
                    const diffMin = e.diff(s, 'minute');
                    if (diffMin <= 0) return;
                    const month = s.format('YYYY-MM');
                    if (!monthlyMap[month]) monthlyMap[month] = [];
                    monthlyMap[month].push(diffMin);
                });
                const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const fmtMin = (min: number) => {
                    const h = Math.floor(min / 60); const m = Math.floor(min % 60); const sec = Math.round((min % 1) * 60);
                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                };
                const monthlyChartData = Object.keys(monthlyMap).sort().map(m => {
                    const diffs = monthlyMap[m];
                    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
                    const d = dayjs(m, 'YYYY-MM');
                    return { month: d.isValid() ? monthLabels[d.month()] + ' ' + d.format('YYYY') : m, avgMin: Math.round(avg * 100) / 100, label: fmtMin(avg) };
                });

                return (
                    <>
                        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                            <Col xs={12} sm={6}>
                                <Card style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                                    <Statistic title={<span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>⏱ Avg Arrival → Putaway</span>} value={avgArrPut} valueStyle={{ color: '#f59e0b', fontSize: 24, fontWeight: 700 }} />
                                </Card>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Card style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                                    <Statistic title={<span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>⏱ Avg Receive → Putaway</span>} value={avgRecPut} valueStyle={{ color: '#10b981', fontSize: 24, fontWeight: 700 }} />
                                </Card>
                            </Col>
                        </Row>
                        {monthlyChartData.length > 0 && (
                            <Card title="📈 Avg Receive → Putaway per Month (Return)" size="small" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24, position: 'relative' as const, zIndex: 0, overflow: 'hidden' as const }} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                                        <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} tickFormatter={(v) => fmtMin(v)} />
                                        <Tooltip
                                            contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                                            formatter={(value: any) => [fmtMin(value || 0), 'Avg Time']}
                                        />
                                        <Line type="monotone" dataKey="avgMin" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} activeDot={{ r: 7 }} name="Avg Receive→Putaway" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Card>
                        )}
                    </>
                );
            })()}
            {show('return_per_brand') && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} lg={12}>
                        <Card title="📦 Return per Brand (Qty)" size="small" style={cardStyle} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { padding: 0 } }}>
                            <Table
                                dataSource={returnPerBrand}
                                rowKey="brand"
                                size="small"
                                pagination={false}
                                scroll={{ y: 300 }}
                                columns={[
                                    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120 },
                                    { title: 'GOOD', dataIndex: 'good', key: 'good', width: 90, render: (v: number) => <Text style={{ color: '#10b981' }}>{v.toLocaleString()}</Text> },
                                    { title: 'DAMAGE', dataIndex: 'damage', key: 'damage', width: 90, render: (v: number) => <Text style={{ color: '#ef4444' }}>{v.toLocaleString()}</Text> },
                                    { title: 'TOTAL', dataIndex: 'total', key: 'total', width: 90, render: (v: number) => <Text strong style={{ color: '#60a5fa' }}>{v.toLocaleString()}</Text> },
                                ]}
                                summary={() => {
                                    const totGood = returnPerBrand.reduce((s, r) => s + r.good, 0);
                                    const totDamage = returnPerBrand.reduce((s, r) => s + r.damage, 0);
                                    return (
                                        <Table.Summary fixed>
                                            <Table.Summary.Row style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                <Table.Summary.Cell index={0}><Text strong style={{ color: '#fff' }}>TOTAL</Text></Table.Summary.Cell>
                                                <Table.Summary.Cell index={1}><Text strong style={{ color: '#10b981' }}>{totGood.toLocaleString()}</Text></Table.Summary.Cell>
                                                <Table.Summary.Cell index={2}><Text strong style={{ color: '#ef4444' }}>{totDamage.toLocaleString()}</Text></Table.Summary.Cell>
                                                <Table.Summary.Cell index={3}><Text strong style={{ color: '#60a5fa' }}>{(totGood + totDamage).toLocaleString()}</Text></Table.Summary.Cell>
                                            </Table.Summary.Row>
                                        </Table.Summary>
                                    );
                                }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title="📊 Good vs Damage per Brand" size="small" style={cardStyle} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={returnPerBrand} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="brand" tick={{ fill: '#aaa', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#aaa', fontSize: 11 }} />
                                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    <Legend />
                                    <Bar dataKey="good" name="GOOD" fill="#10b981" />
                                    <Bar dataKey="damage" name="DAMAGE" fill="#ef4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* 2. Return per Reason Group (Qty) */}
            {show('reason_qty') && (
                <Card title="📋 Return per Reason Group (Qty)" size="small" style={{ ...cardStyle, marginBottom: 24 }} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { padding: 0 } }}>
                    <Table dataSource={returnPerReasonQty} rowKey="brand" size="small" pagination={false} scroll={{ x: 'max-content', y: 300 }} columns={reasonCols()}
                        summary={() => {
                            const totals: Record<string, number> = {};
                            returnPerReasonQty.forEach((r: any) => { reasonGroups.forEach(g => { totals[g] = (totals[g] || 0) + (r[g] || 0); }); totals.total = (totals.total || 0) + (r.total || 0); });
                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <Table.Summary.Cell index={0}><Text strong style={{ color: '#fff' }}>TOTAL</Text></Table.Summary.Cell>
                                        {reasonGroups.map((g, i) => <Table.Summary.Cell key={g} index={i + 1}><Text strong style={{ color: '#fff' }}>{(totals[g] || 0).toLocaleString()}</Text></Table.Summary.Cell>)}
                                        <Table.Summary.Cell index={reasonGroups.length + 1}><Text strong style={{ color: '#60a5fa' }}>{(totals.total || 0).toLocaleString()}</Text></Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </Table.Summary>
                            );
                        }}
                    />
                </Card>
            )}

            {/* 3. Return per Reason Group (Order = unique receipt_no) */}
            {show('reason_order') && (
                <Card title="📋 Return per Reason Group (Order - Unique Receipt)" size="small" style={{ ...cardStyle, marginBottom: 24 }} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { padding: 0 } }}>
                    <Table dataSource={returnPerReasonOrder} rowKey="brand" size="small" pagination={false} scroll={{ x: 'max-content', y: 300 }} columns={reasonCols()}
                        summary={() => {
                            const totals: Record<string, number> = {};
                            returnPerReasonOrder.forEach((r: any) => { reasonGroups.forEach(g => { totals[g] = (totals[g] || 0) + (r[g] || 0); }); totals.total = (totals.total || 0) + (r.total || 0); });
                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <Table.Summary.Cell index={0}><Text strong style={{ color: '#fff' }}>TOTAL</Text></Table.Summary.Cell>
                                        {reasonGroups.map((g, i) => <Table.Summary.Cell key={g} index={i + 1}><Text strong style={{ color: '#fff' }}>{(totals[g] || 0).toLocaleString()}</Text></Table.Summary.Cell>)}
                                        <Table.Summary.Cell index={reasonGroups.length + 1}><Text strong style={{ color: '#60a5fa' }}>{(totals.total || 0).toLocaleString()}</Text></Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </Table.Summary>
                            );
                        }}
                    />
                </Card>
            )}

            {/* 4. % Return per Brand per Month */}
            {show('return_pct') && months.length > 0 && (
                <Card title="📊 % Return per Brand" size="small" style={{ ...cardStyle, marginBottom: 24 }} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { padding: 0 } }}>
                    <Table dataSource={returnPercentData} rowKey="brand" size="small" pagination={false} scroll={{ x: 'max-content', y: 300 }} columns={percentCols} bordered
                        summary={() => {
                            const totals: Record<string, number> = {};
                            returnPercentData.forEach((r: any) => {
                                months.forEach(m => {
                                    totals[`${m}_return`] = (totals[`${m}_return`] || 0) + (r[`${m}_return`] || 0);
                                    totals[`${m}_order`] = (totals[`${m}_order`] || 0) + (r[`${m}_order`] || 0);
                                });
                            });
                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <Table.Summary.Cell index={0}><Text strong style={{ color: '#fff' }}>TOTAL</Text></Table.Summary.Cell>
                                        {months.map((m, mi) => {
                                            const ret = totals[`${m}_return`] || 0;
                                            const ord = totals[`${m}_order`] || 0;
                                            const pct = ord > 0 ? ((ret / ord) * 100).toFixed(1) : '-';
                                            return [
                                                <Table.Summary.Cell key={`${m}_r`} index={mi * 3 + 1}><Text strong style={{ color: '#fff' }}>{ret.toLocaleString()}</Text></Table.Summary.Cell>,
                                                <Table.Summary.Cell key={`${m}_o`} index={mi * 3 + 2}><Text strong style={{ color: '#fff' }}>{ord.toLocaleString()}</Text></Table.Summary.Cell>,
                                                <Table.Summary.Cell key={`${m}_p`} index={mi * 3 + 3}><Text strong style={{ color: pct === '-' ? 'rgba(255,255,255,0.3)' : parseFloat(pct) > 5 ? '#ef4444' : '#10b981' }}>{pct === '-' ? '-' : `${pct}%`}</Text></Table.Summary.Cell>,
                                            ];
                                        })}
                                    </Table.Summary.Row>
                                </Table.Summary>
                            );
                        }}
                    />
                </Card>
            )}

            {/* 5. Reject Return per Logistics */}
            {show('reject_logistics') && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} lg={14}>
                        <Card title="🚫 Reject Return per Logistics (Unique AWB)" size="small" style={cardStyle} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { padding: 0 } }}>
                            <Table dataSource={rejectPerLogistic} rowKey="brand" size="small" pagination={false} scroll={{ x: 'max-content', y: 300 }} columns={rejectCols}
                                summary={() => {
                                    const totals: Record<string, number> = {};
                                    rejectPerLogistic.forEach((r: any) => { logistics.forEach(l => { totals[l] = (totals[l] || 0) + (r[l] || 0); }); totals.total = (totals.total || 0) + (r.total || 0); });
                                    return (
                                        <Table.Summary fixed>
                                            <Table.Summary.Row style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                <Table.Summary.Cell index={0}><Text strong style={{ color: '#fff' }}>TOTAL</Text></Table.Summary.Cell>
                                                {logistics.map((l, i) => <Table.Summary.Cell key={l} index={i + 1}><Text strong style={{ color: '#fff' }}>{(totals[l] || 0).toLocaleString()}</Text></Table.Summary.Cell>)}
                                                <Table.Summary.Cell index={logistics.length + 1}><Text strong style={{ color: '#f59e0b' }}>{(totals.total || 0).toLocaleString()}</Text></Table.Summary.Cell>
                                            </Table.Summary.Row>
                                        </Table.Summary>
                                    );
                                }}
                            />
                        </Card>
                    </Col>
                    {/* 6. AWB per Brand chart */}
                    <Col xs={24} lg={10}>
                        <Card title="📊 AWB per Brand" size="small" style={cardStyle} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={awbPerBrandChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="brand" tick={{ fill: '#aaa', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#aaa', fontSize: 11 }} />
                                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    <Bar dataKey="count" name="Unique AWB" fill="#f59e0b">
                                        {awbPerBrandChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    );
}
