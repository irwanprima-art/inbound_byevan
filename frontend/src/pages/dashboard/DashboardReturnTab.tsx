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

    // Build brand → owner lookup from return receives (use first encountered owner per brand)
    const brandOwnerMap = useMemo(() => {
        const map: Record<string, string> = {};
        returnReceives.forEach((r: any) => {
            const brand = normalizeBrand(r.brand || 'Unknown');
            if (!map[brand] && r.owner) map[brand] = (r.owner || '').trim().toUpperCase();
        });
        return map;
    }, [returnReceives]);

    // ═══ 1. Return per Brand (GOOD / DAMAGE / TOTAL) + Chart ═══
    const returnPerBrandRaw = useMemo(() => {
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
            .map(([brand, v]) => ({ brand, owner: brandOwnerMap[brand] || '', good: v.good, damage: v.damage, total: v.good + v.damage }))
            .sort((a, b) => b.total - a.total);
    }, [filteredReceives, brandOwnerMap]);

    // For chart usage (flat, no grouping)
    const returnPerBrand = returnPerBrandRaw;

    // Grouped Return per Brand data: owner header → brand rows → subtotal → grand total
    const returnPerBrandGrouped = useMemo(() => {
        // Group by owner
        const ownerMap: Record<string, typeof returnPerBrandRaw> = {};
        returnPerBrandRaw.forEach(r => {
            const owner = r.owner || 'OTHER';
            if (!ownerMap[owner]) ownerMap[owner] = [];
            ownerMap[owner].push(r);
        });
        // Sort owners: JC-ID first, JC-FFM second, others after
        const ownerOrder = Object.keys(ownerMap).sort((a, b) => {
            if (a === 'JC-ID') return -1; if (b === 'JC-ID') return 1;
            if (a === 'JC-FFM') return -1; if (b === 'JC-FFM') return 1;
            return a.localeCompare(b);
        });
        const rows: any[] = [];
        let grandGood = 0, grandDamage = 0;
        ownerOrder.forEach(owner => {
            const brands = ownerMap[owner];
            // Owner header row
            rows.push({ _key: `header_${owner}`, _type: 'header', brand: owner, good: '', damage: '', total: '' });
            let subGood = 0, subDamage = 0;
            brands.forEach(b => {
                rows.push({ _key: `brand_${owner}_${b.brand}`, _type: 'brand', brand: b.brand, good: b.good, damage: b.damage, total: b.total });
                subGood += b.good; subDamage += b.damage;
            });
            rows.push({ _key: `subtotal_${owner}`, _type: 'subtotal', brand: `Total ${owner}`, good: subGood, damage: subDamage, total: subGood + subDamage });
            grandGood += subGood; grandDamage += subDamage;
        });
        rows.push({ _key: 'grand_total', _type: 'grandtotal', brand: 'Total All', good: grandGood, damage: grandDamage, total: grandGood + grandDamage });
        return rows;
    }, [returnPerBrandRaw]);

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
    // Combined reason group data (qty + order in one table)
    const returnPerReasonCombined = useMemo(() => {
        // Merge qty and order data by brand
        const allBrands = new Set<string>();
        returnPerReasonQty.forEach((r: any) => allBrands.add(r.brand));
        returnPerReasonOrder.forEach((r: any) => allBrands.add(r.brand));
        const qtyMap: Record<string, any> = {};
        const orderMap: Record<string, any> = {};
        returnPerReasonQty.forEach((r: any) => { qtyMap[r.brand] = r; });
        returnPerReasonOrder.forEach((r: any) => { orderMap[r.brand] = r; });
        return Array.from(allBrands).map(brand => {
            const row: any = { brand };
            let totalQty = 0, totalOrder = 0;
            reasonGroups.forEach(g => {
                row[`${g}_qty`] = qtyMap[brand]?.[g] || 0;
                row[`${g}_order`] = orderMap[brand]?.[g] || 0;
                totalQty += row[`${g}_qty`];
                totalOrder += row[`${g}_order`];
            });
            row.total_qty = totalQty;
            row.total_order = totalOrder;
            return row;
        }).sort((a, b) => b.total_qty - a.total_qty);
    }, [returnPerReasonQty, returnPerReasonOrder, reasonGroups]);

    // Grouped columns for combined reason table
    const reasonCombinedCols = useMemo(() => [
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120, fixed: 'left' as const },
        ...reasonGroups.map(g => ({
            title: g, key: g,
            children: [
                { title: 'Qty', dataIndex: `${g}_qty`, key: `${g}_qty`, width: 80, render: (v: number) => (v || 0).toLocaleString() },
                { title: 'Order', dataIndex: `${g}_order`, key: `${g}_order`, width: 80, render: (v: number) => (v || 0).toLocaleString() },
            ],
        })),
        {
            title: 'Total', key: 'total_group',
            children: [
                { title: 'Qty', dataIndex: 'total_qty', key: 'total_qty', width: 80, render: (v: number) => <Text strong style={{ color: '#60a5fa' }}>{(v || 0).toLocaleString()}</Text> },
                { title: 'Order', dataIndex: 'total_order', key: 'total_order', width: 80, render: (v: number) => <Text strong style={{ color: '#60a5fa' }}>{(v || 0).toLocaleString()}</Text> },
            ],
        },
    ], [reasonGroups]);

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

    const returnPercentDataRaw = useMemo(() => {
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
            const row: any = { brand, owner: brandOwnerMap[brand] || '' };
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
    }, [returnReceives, orderPerBrands, months, brandOwnerMap]);

    // Grouped % Return per Brand data: owner header → brand rows → subtotal → grand total

    const returnPercentGrouped = useMemo(() => {
        const ownerMap: Record<string, any[]> = {};
        returnPercentDataRaw.forEach(r => {
            const owner = r.owner || 'OTHER';
            if (!ownerMap[owner]) ownerMap[owner] = [];
            ownerMap[owner].push(r);
        });
        const ownerOrder = Object.keys(ownerMap).sort((a, b) => {
            if (a === 'JC-ID') return -1; if (b === 'JC-ID') return 1;
            if (a === 'JC-FFM') return -1; if (b === 'JC-FFM') return 1;
            return a.localeCompare(b);
        });
        const rows: any[] = [];
        const grandTotals: Record<string, number> = {};
        ownerOrder.forEach(owner => {
            const brands = ownerMap[owner];
            rows.push({ _key: `header_${owner}`, _type: 'header', brand: owner });
            const subTotals: Record<string, number> = {};
            brands.forEach(b => {
                rows.push({ ...b, _key: `brand_${owner}_${b.brand}`, _type: 'brand' });
                months.forEach(m => {
                    subTotals[`${m}_return`] = (subTotals[`${m}_return`] || 0) + (b[`${m}_return`] || 0);
                    subTotals[`${m}_order`] = (subTotals[`${m}_order`] || 0) + (b[`${m}_order`] || 0);
                });
            });
            // Compute subtotal pct
            const subRow: any = { _key: `subtotal_${owner}`, _type: 'subtotal', brand: `Total ${owner}` };
            months.forEach(m => {
                subRow[`${m}_return`] = subTotals[`${m}_return`] || 0;
                subRow[`${m}_order`] = subTotals[`${m}_order`] || 0;
                const ret = subRow[`${m}_return`], ord = subRow[`${m}_order`];
                subRow[`${m}_pct`] = ord > 0 ? ((ret / ord) * 100).toFixed(1) : '-';
                grandTotals[`${m}_return`] = (grandTotals[`${m}_return`] || 0) + (subTotals[`${m}_return`] || 0);
                grandTotals[`${m}_order`] = (grandTotals[`${m}_order`] || 0) + (subTotals[`${m}_order`] || 0);
            });
            rows.push(subRow);
        });
        // Grand total
        const grandRow: any = { _key: 'grand_total', _type: 'grandtotal', brand: 'Total All' };
        months.forEach(m => {
            grandRow[`${m}_return`] = grandTotals[`${m}_return`] || 0;
            grandRow[`${m}_order`] = grandTotals[`${m}_order`] || 0;
            const ret = grandRow[`${m}_return`], ord = grandRow[`${m}_order`];
            grandRow[`${m}_pct`] = ord > 0 ? ((ret / ord) * 100).toFixed(1) : '-';
        });
        rows.push(grandRow);
        return rows;
    }, [returnPercentDataRaw, months]);



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
                    <AntButton size="small" onClick={() => { const n = dayjs(); setDateRange([n.startOf('month'), n.endOf('month')]); }}>This Month</AntButton>
                    <AntButton size="small" onClick={() => { const p = dayjs().subtract(1, 'month'); setDateRange([p.startOf('month'), p.endOf('month')]); }}>Last Month</AntButton>
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
                                dataSource={returnPerBrandGrouped}
                                rowKey="_key"
                                size="small"
                                pagination={false}
                                scroll={{ y: sections ? undefined : 400 }}
                                rowClassName={(record: any) => {
                                    if (record._type === 'header') return 'owner-header-row';
                                    if (record._type === 'subtotal') return 'owner-subtotal-row';
                                    if (record._type === 'grandtotal') return 'owner-grandtotal-row';
                                    return '';
                                }}
                                columns={[
                                    {
                                        title: 'Brand', dataIndex: 'brand', key: 'brand', width: 140,
                                        render: (v: string, record: any) => {
                                            if (record._type === 'header') return <Text strong style={{ color: '#f59e0b', fontSize: 13 }}>▸ {v}</Text>;
                                            if (record._type === 'subtotal') return <Text strong style={{ color: '#fff' }}>{v}</Text>;
                                            if (record._type === 'grandtotal') return <Text strong style={{ color: '#60a5fa', fontSize: 13 }}>{v}</Text>;
                                            return <Text style={{ color: 'rgba(255,255,255,0.85)', paddingLeft: 12 }}>{v}</Text>;
                                        }
                                    },
                                    {
                                        title: 'GOOD', dataIndex: 'good', key: 'good', width: 90,
                                        render: (v: any, record: any) => {
                                            if (record._type === 'header') return null;
                                            const isTotal = record._type === 'subtotal' || record._type === 'grandtotal';
                                            return <Text strong={isTotal} style={{ color: '#10b981' }}>{(v || 0).toLocaleString()}</Text>;
                                        }
                                    },
                                    {
                                        title: 'DAMAGE', dataIndex: 'damage', key: 'damage', width: 90,
                                        render: (v: any, record: any) => {
                                            if (record._type === 'header') return null;
                                            const isTotal = record._type === 'subtotal' || record._type === 'grandtotal';
                                            return <Text strong={isTotal} style={{ color: '#ef4444' }}>{(v || 0).toLocaleString()}</Text>;
                                        }
                                    },
                                    {
                                        title: 'TOTAL', dataIndex: 'total', key: 'total', width: 90,
                                        render: (v: any, record: any) => {
                                            if (record._type === 'header') return null;
                                            const isTotal = record._type === 'subtotal' || record._type === 'grandtotal';
                                            return <Text strong={isTotal} style={{ color: '#60a5fa' }}>{(v || 0).toLocaleString()}</Text>;
                                        }
                                    },
                                ]}
                            />
                            <style>{`
                                .owner-header-row td { background: rgba(245,158,11,0.12) !important; border-bottom: 1px solid rgba(245,158,11,0.3) !important; }
                                .owner-subtotal-row td { background: rgba(255,255,255,0.06) !important; border-top: 1px solid rgba(255,255,255,0.15) !important; }
                                .owner-grandtotal-row td { background: rgba(96,165,250,0.12) !important; border-top: 2px solid rgba(96,165,250,0.4) !important; }
                            `}</style>
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

            {/* 2+3 Combined: Return per Reason Group (Qty + Order) */}
            {show('reason_combined') && (
                <Card title="📋 Return per Reason Group (Qty & Order)" size="small" style={{ ...cardStyle, marginBottom: 24 }} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { padding: 0 } }}>
                    <Table dataSource={returnPerReasonCombined} rowKey="brand" size="small" pagination={false} scroll={{ x: 'max-content', y: sections ? undefined : 400 }} columns={reasonCombinedCols} bordered
                        summary={() => {
                            const totals: Record<string, number> = {};
                            returnPerReasonCombined.forEach((r: any) => {
                                reasonGroups.forEach(g => {
                                    totals[`${g}_qty`] = (totals[`${g}_qty`] || 0) + (r[`${g}_qty`] || 0);
                                    totals[`${g}_order`] = (totals[`${g}_order`] || 0) + (r[`${g}_order`] || 0);
                                });
                                totals.total_qty = (totals.total_qty || 0) + (r.total_qty || 0);
                                totals.total_order = (totals.total_order || 0) + (r.total_order || 0);
                            });
                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <Table.Summary.Cell index={0}><Text strong style={{ color: '#fff' }}>TOTAL</Text></Table.Summary.Cell>
                                        {reasonGroups.map((g, i) => (
                                            <>
                                                <Table.Summary.Cell key={`${g}_qty`} index={i * 2 + 1}><Text strong style={{ color: '#fff' }}>{(totals[`${g}_qty`] || 0).toLocaleString()}</Text></Table.Summary.Cell>
                                                <Table.Summary.Cell key={`${g}_order`} index={i * 2 + 2}><Text strong style={{ color: '#fff' }}>{(totals[`${g}_order`] || 0).toLocaleString()}</Text></Table.Summary.Cell>
                                            </>
                                        ))}
                                        <Table.Summary.Cell index={reasonGroups.length * 2 + 1}><Text strong style={{ color: '#60a5fa' }}>{(totals.total_qty || 0).toLocaleString()}</Text></Table.Summary.Cell>
                                        <Table.Summary.Cell index={reasonGroups.length * 2 + 2}><Text strong style={{ color: '#60a5fa' }}>{(totals.total_order || 0).toLocaleString()}</Text></Table.Summary.Cell>
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
                    <Table
                        dataSource={returnPercentGrouped}
                        rowKey="_key"
                        size="small"
                        pagination={false}
                        scroll={{ x: 'max-content', y: sections ? undefined : 400 }}
                        bordered
                        rowClassName={(record: any) => {
                            if (record._type === 'header') return 'owner-header-row';
                            if (record._type === 'subtotal') return 'owner-subtotal-row';
                            if (record._type === 'grandtotal') return 'owner-grandtotal-row';
                            return '';
                        }}
                        columns={[
                            {
                                title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120, fixed: 'left' as const,
                                render: (v: string, record: any) => {
                                    if (record._type === 'header') return <Text strong style={{ color: '#f59e0b', fontSize: 13 }}>▸ {v}</Text>;
                                    if (record._type === 'subtotal') return <Text strong style={{ color: '#fff' }}>{v}</Text>;
                                    if (record._type === 'grandtotal') return <Text strong style={{ color: '#60a5fa', fontSize: 13 }}>{v}</Text>;
                                    return <Text style={{ color: 'rgba(255,255,255,0.85)', paddingLeft: 12 }}>{v}</Text>;
                                }
                            },
                            ...months.map(m => ({
                                title: dayjs(m, 'YYYY-MM').format('MMM YYYY'),
                                children: [
                                    {
                                        title: 'Return', dataIndex: `${m}_return`, key: `${m}_return`, width: 70,
                                        render: (v: any, record: any) => {
                                            if (record._type === 'header') return null;
                                            const isTotal = record._type === 'subtotal' || record._type === 'grandtotal';
                                            return <Text strong={isTotal} style={{ color: isTotal ? '#fff' : undefined }}>{(v || 0).toLocaleString()}</Text>;
                                        }
                                    },
                                    {
                                        title: 'Order', dataIndex: `${m}_order`, key: `${m}_order`, width: 70,
                                        render: (v: any, record: any) => {
                                            if (record._type === 'header') return null;
                                            const isTotal = record._type === 'subtotal' || record._type === 'grandtotal';
                                            return <Text strong={isTotal} style={{ color: isTotal ? '#fff' : undefined }}>{(v || 0).toLocaleString()}</Text>;
                                        }
                                    },
                                    {
                                        title: '%', dataIndex: `${m}_pct`, key: `${m}_pct`, width: 60,
                                        render: (v: any, record: any) => {
                                            if (record._type === 'header') return null;
                                            const isTotal = record._type === 'subtotal' || record._type === 'grandtotal';
                                            const strV = String(v || '-');
                                            return <Text strong={isTotal} style={{ color: strV === '-' ? 'rgba(255,255,255,0.3)' : parseFloat(strV) > 5 ? '#ef4444' : '#10b981' }}>{strV === '-' ? '-' : `${strV}%`}</Text>;
                                        }
                                    },
                                ],
                            })),
                        ]}
                    />
                </Card>
            )}

            {/* 5. Reject Return per Logistics */}
            {show('reject_logistics') && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} lg={14}>
                        <Card title="🚫 Reject Return per Logistics (Unique AWB)" size="small" style={cardStyle} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { padding: 0 } }}>
                            <Table dataSource={rejectPerLogistic} rowKey="brand" size="small" pagination={false} scroll={{ x: 'max-content', y: sections ? undefined : 300 }} columns={rejectCols}
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
