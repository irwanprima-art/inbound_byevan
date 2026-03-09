import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Typography, Tag, Table, Progress, DatePicker, Space, Button as AntButton } from 'antd';
import type { Dayjs } from 'dayjs';
import {
    InboxOutlined, SwapOutlined, ToolOutlined, CheckCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { Tooltip as RTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line, LineChart } from 'recharts';
import dayjs from 'dayjs';

const { Text } = Typography;


interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
}

function StatCard({ title, value, icon, color, onClick }: StatCardProps) {
    return (
        <Card
            style={{
                background: `linear-gradient(135deg, ${color}22, ${color}11)`,
                border: `1px solid ${color}33`,
                borderRadius: 12,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            hoverable={!!onClick}
            onClick={onClick}
        >
            <Statistic
                title={<Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{title}</Text>}
                value={value}
                prefix={<span style={{ color, fontSize: 20 }}>{icon}</span>}
                valueStyle={{ color: '#fff', fontWeight: 700 }}
            />
        </Card>
    );
}

interface Props {
    dateRange: [Dayjs, Dayjs] | null;
    setDateRange: (v: [Dayjs, Dayjs] | null) => void;
    arrivals: any[];
    transactions: any[];
    vasList: any[];
    unloadings: any[];
    inboundCases: any[];
    rejections: any[];
    baData: any[];
    matchesDateRange: (d: string) => boolean;
    /** Optional: only render specific sections. When undefined, render all. */
    sections?: string[];
}

export default function DashboardInboundTab({ dateRange, setDateRange, arrivals, transactions, vasList, unloadings, inboundCases, rejections, baData, matchesDateRange, sections }: Props) {
    const show = (key: string) => !sections || sections.includes(key);
    const navigate = useNavigate();

    const fArrivals = useMemo(() => arrivals.filter(a => matchesDateRange(a.date)), [arrivals, matchesDateRange]);
    const fVasList = useMemo(() => vasList.filter(v => matchesDateRange(v.date)), [vasList, matchesDateRange]);
    const fCases = useMemo(() => inboundCases.filter(c => matchesDateRange(c.date)), [inboundCases, matchesDateRange]);

    // Previous month VAS for MoM comparison
    const prevMonthVasList = useMemo(() => {
        if (!dateRange) return [];
        const prevStart = dateRange[0].subtract(1, 'month').startOf('month');
        const prevEnd = dateRange[0].subtract(1, 'month').endOf('month');
        return vasList.filter(v => {
            const d = dayjs(v.date);
            if (!d.isValid()) return false;
            return (d.isAfter(prevStart) || d.isSame(prevStart, 'day')) && (d.isBefore(prevEnd) || d.isSame(prevEnd, 'day'));
        });
    }, [vasList, dateRange]);

    // Previous month arrivals for MoM comparison on plan_vs_po
    const prevMonthArrivals = useMemo(() => {
        if (!dateRange) return [];
        const prevStart = dateRange[0].subtract(1, 'month').startOf('month');
        const prevEnd = dateRange[0].subtract(1, 'month').endOf('month');
        return arrivals.filter(a => {
            const d = dayjs(a.date);
            if (!d.isValid()) return false;
            return (d.isAfter(prevStart) || d.isSame(prevStart, 'day')) && (d.isBefore(prevEnd) || d.isSame(prevEnd, 'day'));
        });
    }, [arrivals, dateRange]);

    // Build transaction lookup per receipt_no (same logic as ArrivalsPage)
    // IMPORTANT: Use ALL transactions (not date-filtered) so that receive/putaway
    // data is correctly matched even when filtering arrivals by date range.
    const txLookup = useMemo(() => {
        const map: Record<string, { receiveQty: number; putawayQty: number; firstReceiveTime: string | null; lastPutawayTime: string | null }> = {};
        transactions.forEach((tx: any) => {
            const key = (tx.receipt_no || '').trim().toLowerCase();
            if (!key) return;
            if (!map[key]) map[key] = { receiveQty: 0, putawayQty: 0, firstReceiveTime: null, lastPutawayTime: null };
            const qty = parseInt(tx.qty) || 0;
            const type = (tx.operate_type || '').trim().toLowerCase();
            const txTime = tx.time_transaction || '';
            if (type === 'receive' || type === 'receiving') {
                map[key].receiveQty += qty;
                if (txTime && (!map[key].firstReceiveTime || txTime < map[key].firstReceiveTime!)) {
                    map[key].firstReceiveTime = txTime;
                }
            } else if (type === 'putaway') {
                map[key].putawayQty += qty;
                if (txTime && (!map[key].lastPutawayTime || txTime > map[key].lastPutawayTime!)) {
                    map[key].lastPutawayTime = txTime;
                }
            }
        });
        return map;
    }, [transactions]);

    // Enriched arrivals: attach receive/putaway/pending/first_receive/last_putaway/status
    const enrichedArrivals = useMemo(() => {
        return fArrivals.map((row: any) => {
            const key = (row.receipt_no || '').trim().toLowerCase();
            const tx = txLookup[key] || { receiveQty: 0, putawayQty: 0, firstReceiveTime: null, lastPutawayTime: null };
            const poQty = parseInt(row.po_qty) || 0;
            const receiveQty = tx.receiveQty;
            const putawayQty = tx.putawayQty;
            const pendingQty = Math.max(0, poQty - receiveQty);
            let status = 'Pending Receive';
            if (receiveQty >= poQty && putawayQty >= poQty) status = 'Completed';
            else if (receiveQty >= poQty) status = 'Pending Putaway';
            return {
                ...row,
                receive_qty: receiveQty,
                putaway_qty: putawayQty,
                pending_qty: pendingQty,
                first_receive: tx.firstReceiveTime || null,
                last_putaway: tx.lastPutawayTime || null,
                status,
            };
        });
    }, [fArrivals, txLookup]);

    // Inbound stats — all from enriched arrivals
    const totalKedatangan = new Set(enrichedArrivals.map((a: any) => `${a.brand}|${a.date}|${a.arrival_time}`).filter((k: string) => k !== '||')).size;
    const totalPO = new Set(enrichedArrivals.map((a: any) => `${(a.receipt_no || '').trim()}|${(a.po_no || '').trim()}`).filter((k: string) => k !== '|')).size;
    const totalBrand = new Set(enrichedArrivals.map((a: any) => a.brand).filter(Boolean)).size;
    const totalQtyKedatangan = enrichedArrivals.reduce((s: number, a: any) => s + (parseInt(a.po_qty) || 0), 0);
    const totalReceiveQty = enrichedArrivals.reduce((s: number, a: any) => s + (a.receive_qty || 0), 0);
    const totalPutawayQty = enrichedArrivals.reduce((s: number, a: any) => s + (a.putaway_qty || 0), 0);
    const pendingReceive = enrichedArrivals.reduce((s: number, a: any) => s + (a.pending_qty || 0), 0);
    const completedCount = enrichedArrivals.filter((a: any) => a.status === 'Completed').length;
    const pctCompleted = enrichedArrivals.length > 0 ? ((completedCount / enrichedArrivals.length) * 100).toFixed(1) : '0.0';

    // Avg Arrival → Putaway: average diff between arrival_time and last_putaway per receipt_no
    const calcAvgKedatanganPutaway = () => {
        const diffs: number[] = [];
        // Group by receipt_no to get one diff per receipt
        const seen = new Set<string>();
        enrichedArrivals.forEach((a: any) => {
            const key = (a.receipt_no || '').trim().toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            if (!a.arrival_time || !a.last_putaway) return;
            const arrTime = dayjs(a.arrival_time);
            const putTime = dayjs(a.last_putaway);
            if (!arrTime.isValid() || !putTime.isValid()) return;
            const diffMin = putTime.diff(arrTime, 'minute');
            if (diffMin > 0) diffs.push(diffMin);
        });
        if (diffs.length === 0) return '-';
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const h = Math.floor(avg / 60); const m = Math.floor(avg % 60); const s = Math.round((avg % 1) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Avg Receive → Putaway: average diff between first_receive and last_putaway per receipt_no
    const calcAvgReceivePutaway = () => {
        const diffs: number[] = [];
        const seen = new Set<string>();
        enrichedArrivals.forEach((a: any) => {
            const key = (a.receipt_no || '').trim().toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            if (!a.first_receive || !a.last_putaway) return;
            const recTime = dayjs(a.first_receive);
            const putTime = dayjs(a.last_putaway);
            if (!recTime.isValid() || !putTime.isValid()) return;
            const diffMin = putTime.diff(recTime, 'minute');
            if (diffMin > 0) diffs.push(diffMin);
        });
        if (diffs.length === 0) return '-';
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const h = Math.floor(avg / 60); const m = Math.floor(avg % 60); const s = Math.round((avg % 1) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Monthly avg Receive → Putaway for line chart (follows date filter)
    const monthlyAvgRecPut = useMemo(() => {
        const monthlyMap: Record<string, number[]> = {};
        const seen = new Set<string>();
        enrichedArrivals.forEach((a: any) => {
            const rkey = (a.receipt_no || '').trim().toLowerCase();
            if (!rkey || seen.has(rkey)) return;
            seen.add(rkey);
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
            const hh = Math.floor(min / 60); const mm = Math.floor(min % 60); const ss = Math.round((min % 1) * 60);
            return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        };
        return {
            data: Object.keys(monthlyMap).sort().map(m => {
                const diffs = monthlyMap[m];
                const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
                const d = dayjs(m, 'YYYY-MM');
                return { month: d.isValid() ? monthLabels[d.month()] + ' ' + d.format('YYYY') : m, avgMin: Math.round(avg * 100) / 100, label: fmtMin(avg) };
            }),
            fmtMin,
        };
    }, [enrichedArrivals]);

    const totalVAS = fVasList.reduce((s, v) => s + (parseInt(v.qty) || 0), 0);
    const vasOperators = new Set(fVasList.map(v => v.operator).filter(Boolean)).size;
    const avgVasPerMP = vasOperators > 0 ? Math.round(totalVAS / vasOperators) : 0;

    const avgKedPutaway = calcAvgKedatanganPutaway();
    const avgRecPutaway = calcAvgReceivePutaway();

    const receiveRate = totalQtyKedatangan > 0 ? ((totalReceiveQty / totalQtyKedatangan) * 100).toFixed(1) : '0.0';
    const putawayRate = totalQtyKedatangan > 0 ? ((totalPutawayQty / totalQtyKedatangan) * 100).toFixed(1) : '0.0';
    const pendingRate = totalQtyKedatangan > 0 ? ((Math.max(0, pendingReceive) / totalQtyKedatangan) * 100).toFixed(1) : '0.0';

    const breakdownData = [
        { name: 'Receive Qty', value: totalReceiveQty, color: '#3b82f6' },
        { name: 'Putaway Qty', value: totalPutawayQty, color: '#10b981' },
        { name: 'Pending Qty', value: Math.max(0, pendingReceive), color: '#f59e0b' },
    ];

    // Per item-type brand data: plan_qty (line) + po_qty (bar) — for Barang Jual & Gimmick
    const buildItemTypeData = (itemType: string) => {
        const map: Record<string, { po_qty: number; plan_qty: number }> = {};
        enrichedArrivals.forEach((a: any) => {
            const t = (a.item_type || 'Barang Jual');
            if (t !== itemType) return;
            const brand = (a.brand || 'Unknown').toUpperCase();
            if (!map[brand]) map[brand] = { po_qty: 0, plan_qty: 0 };
            map[brand].po_qty += parseInt(a.po_qty) || 0;
            map[brand].plan_qty += parseInt(a.plan_qty) || 0;
        });
        return Object.entries(map)
            .map(([name, v]) => ({ name, po_qty: v.po_qty, plan_qty: v.plan_qty }))
            .sort((a, b) => b.po_qty - a.po_qty);
    };
    const barangJualData = buildItemTypeData('Barang Jual');
    const gimmickData = buildItemTypeData('Gimmick');

    // ATK: per-SKU receive qty from Inbound Transactions where receipt_no belongs to ATK arrivals
    const atkData = (() => {
        // Step 1: collect receipt_no set from ATK arrivals
        const atkReceiptSet = new Set<string>();
        enrichedArrivals.forEach((a: any) => {
            if ((a.item_type || 'Barang Jual') !== 'ATK') return;
            const rn = (a.receipt_no || '').trim().toLowerCase();
            if (rn) atkReceiptSet.add(rn);
        });

        // Step 2: sum receive qty per SKU from transactions
        const skuMap: Record<string, number> = {};
        transactions.forEach((tx: any) => {
            const rn = (tx.receipt_no || '').trim().toLowerCase();
            if (!atkReceiptSet.has(rn)) return;
            const opType = (tx.operate_type || '').trim().toLowerCase();
            if (opType !== 'receive' && opType !== 'receiving') return;
            const sku = (tx.sku || '-').trim();
            skuMap[sku] = (skuMap[sku] || 0) + (parseInt(tx.qty) || 0);
        });

        return Object.entries(skuMap)
            .map(([name, qty]) => ({ name, po_qty: qty, plan_qty: 0 }))
            .sort((a, b) => b.po_qty - a.po_qty);
    })();

    // Custom tooltip for item type charts
    const ItemTypeTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                <div style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                {payload.map((p: any) => (
                    <div key={p.dataKey} style={{ color: p.color, fontSize: 12 }}>
                        {p.name} : <strong>{(p.value || 0).toLocaleString()}</strong>
                    </div>
                ))}
            </div>
        );
    };

    const brandMap: Record<string, { poSet: Set<string>; qty: number }> = {};
    enrichedArrivals.forEach((a: any) => {
        const brand = a.brand || 'Unknown';
        if (!brandMap[brand]) brandMap[brand] = { poSet: new Set(), qty: 0 };
        const rn = (a.receipt_no || '').trim();
        const pn = (a.po_no || '').trim();
        const poKey = `${rn}|${pn}`;
        if (rn || pn) brandMap[brand].poSet.add(poKey);
        brandMap[brand].qty += parseInt(a.po_qty) || 0;
    });
    const brandData = Object.entries(brandMap).map(([name, v]) => ({ name, po: v.poSet.size, qty: v.qty }));

    const vasBrandItemMap: Record<string, { barangJual: number; gimmick: number }> = {};
    fVasList.forEach((v: any) => {
        const brand = (v.brand || 'Unknown').toUpperCase();
        if (!vasBrandItemMap[brand]) vasBrandItemMap[brand] = { barangJual: 0, gimmick: 0 };
        const qty = parseInt(v.qty) || 0;
        const itemType = (v.item_type || 'Barang Jual').toLowerCase();
        if (itemType === 'gimmick') {
            vasBrandItemMap[brand].gimmick += qty;
        } else {
            vasBrandItemMap[brand].barangJual += qty;
        }
    });
    const vasBrandItemData = Object.entries(vasBrandItemMap)
        .map(([name, v]) => ({ name, qtyItem: v.barangJual, qtyGimmick: v.gimmick }))
        .sort((a, b) => (b.qtyItem + b.qtyGimmick) - (a.qtyItem + a.qtyGimmick));

    // VAS by Operator (same chart but grouped by operator)
    const vasOperatorItemMap: Record<string, { barangJual: number; gimmick: number }> = {};
    fVasList.forEach((v: any) => {
        const operator = (v.operator || 'Unknown').toUpperCase();
        if (!vasOperatorItemMap[operator]) vasOperatorItemMap[operator] = { barangJual: 0, gimmick: 0 };
        const qty = parseInt(v.qty) || 0;
        const itemType = (v.item_type || 'Barang Jual').toLowerCase();
        if (itemType === 'gimmick') {
            vasOperatorItemMap[operator].gimmick += qty;
        } else {
            vasOperatorItemMap[operator].barangJual += qty;
        }
    });
    const vasOperatorItemData = Object.entries(vasOperatorItemMap)
        .map(([name, v]) => ({ name, qtyItem: v.barangJual, qtyGimmick: v.gimmick }))
        .sort((a, b) => (b.qtyItem + b.qtyGimmick) - (a.qtyItem + a.qtyGimmick));

    // VAS summary stats
    const totalVasCurrent = fVasList.reduce((s, v) => s + (parseInt(v.qty) || 0), 0);
    const totalVasPrev = prevMonthVasList.reduce((s: number, v: any) => s + (parseInt(v.qty) || 0), 0);
    const vasMomPct = totalVasPrev > 0 ? ((totalVasCurrent - totalVasPrev) / totalVasPrev * 100) : null;
    const avgVasPerBrand = vasBrandItemData.length > 0 ? Math.round(totalVasCurrent / vasBrandItemData.length) : 0;
    const avgVasPerOperator = vasOperatorItemData.length > 0 ? Math.round(totalVasCurrent / vasOperatorItemData.length) : 0;
    const prevMonthLabel = dateRange ? dateRange[0].subtract(1, 'month').format('MMM YYYY') : '';

    const pendingArrivals = useMemo(() => {
        return enrichedArrivals.filter((a: any) => a.status !== 'Completed');
    }, [enrichedArrivals]);

    return (
        <>
            {show('datefilter') && <Space style={{ marginBottom: 16 }} wrap>
                <DatePicker.RangePicker
                    value={dateRange}
                    onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                    format="DD/MM/YYYY"
                    placeholder={['From Date', 'To Date']}
                    allowClear
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}
                />
                <AntButton size="small" onClick={() => { const now = dayjs(); setDateRange([now.startOf('month'), now.endOf('month')]); }}>This Month</AntButton>
                <AntButton size="small" onClick={() => { const prev = dayjs().subtract(1, 'month'); setDateRange([prev.startOf('month'), prev.endOf('month')]); }}>Last Month</AntButton>
                {dateRange && <AntButton size="small" danger onClick={() => setDateRange(null)}>Reset</AntButton>}
            </Space>}
            {show('cards') && <><Row gutter={[16, 16]}>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total Arrivals" value={totalKedatangan} icon={<InboxOutlined />} color="#6366f1" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total PO" value={totalPO} icon={<InboxOutlined />} color="#8b5cf6" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total Brand" value={totalBrand} icon={<InboxOutlined />} color="#a855f7" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total Arrival Qty" value={totalQtyKedatangan.toLocaleString()} icon={<SwapOutlined />} color="#06b6d4" /></Col>
            </Row>
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={12} sm={8} lg={6}><StatCard title="Total Receive Qty" value={totalReceiveQty.toLocaleString()} icon={<SwapOutlined />} color="#3b82f6" /></Col>
                    <Col xs={12} sm={8} lg={6}><StatCard title="Total Putaway Qty" value={totalPutawayQty.toLocaleString()} icon={<CheckCircleOutlined />} color="#10b981" /></Col>
                    <Col xs={12} sm={8} lg={6}><StatCard title="Pending Receive" value={pendingReceive.toLocaleString()} icon={<ClockCircleOutlined />} color="#f59e0b" onClick={() => navigate('/arrivals?search=Pending')} /></Col>
                    <Col xs={12} sm={8} lg={6}><StatCard title="% Completed" value={`${pctCompleted}%`} icon={<CheckCircleOutlined />} color="#22c55e" /></Col>
                </Row>
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={12} sm={8} lg={6}><StatCard title="Avg Arrival → Putaway" value={avgKedPutaway} icon={<ClockCircleOutlined />} color="#ec4899" /></Col>
                    <Col xs={12} sm={8} lg={6}><StatCard title="Avg Receive → Putaway" value={avgRecPutaway} icon={<ClockCircleOutlined />} color="#f97316" /></Col>
                    <Col xs={12} sm={8} lg={6}><StatCard title="Total VAS" value={totalVAS.toLocaleString()} icon={<ToolOutlined />} color="#14b8a6" /></Col>
                    <Col xs={12} sm={8} lg={6}><StatCard title="Avg VAS / Manpower" value={avgVasPerMP} icon={<ToolOutlined />} color="#64748b" /></Col>
                </Row></>}

            {show('pending') && <Card
                title={`⏳ Pending Inbound (${pendingArrivals.length})`}
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}
                styles={{ header: { color: '#fff' } }}
            >
                {pendingArrivals.length > 0 ? (
                    <Table
                        dataSource={pendingArrivals}
                        columns={[
                            { title: 'Arrival Date', dataIndex: 'date', key: 'date', width: 110 },
                            { title: 'Time', dataIndex: 'arrival_time', key: 'arrival_time', width: 90 },
                            { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
                            { title: 'Receipt No', dataIndex: 'receipt_no', key: 'receipt_no', width: 130 },
                            { title: 'PO No', dataIndex: 'po_no', key: 'po_no', width: 130 },
                            { title: 'PO Qty', dataIndex: 'po_qty', key: 'po_qty', width: 80 },
                            { title: 'Receive', dataIndex: 'receive_qty', key: 'receive_qty', width: 80, render: (v: number) => <span style={{ color: '#60a5fa' }}>{v}</span> },
                            { title: 'Putaway', dataIndex: 'putaway_qty', key: 'putaway_qty', width: 80, render: (v: number) => <span style={{ color: '#a78bfa' }}>{v}</span> },
                            { title: 'Status', dataIndex: 'status', key: 'status', width: 140, render: (s: string) => <Tag color={s === 'Pending Putaway' ? 'orange' : 'red'}>{s}</Tag> },
                        ]}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 10, showTotal: (t) => `Total: ${t}` }}
                        scroll={{ x: 'max-content' }}
                    />
                ) : (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)' }}>✅ No pending items — all completed</Text>
                    </div>
                )}
            </Card>}

            {show('plan_vs_po') && <Row gutter={[16, sections ? 6 : 16]} style={{ marginTop: sections ? 4 : 24, ...(sections ? { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' } : {}) }}>
                {([
                    { label: '🏷️ Items — Plan Qty vs PO Qty per Brand', data: barangJualData, color: '#3b82f6', barName: 'PO Qty', showPlan: true, itemType: 'Barang Jual' },
                    { label: '🎁 Gimmick — Plan Qty vs PO Qty per Brand', data: gimmickData, color: '#a78bfa', barName: 'PO Qty', showPlan: true, itemType: 'Gimmick' },
                    { label: '📎 ATK — Receive Qty per SKU', data: atkData, color: '#f59e0b', barName: 'Receive Qty', showPlan: false, itemType: 'ATK' },
                ] as { label: string; data: typeof barangJualData; color: string; barName: string; showPlan: boolean; itemType: string }[]).map(({ label, data, color, barName, showPlan, itemType }) => {
                    // Compute total for current and previous month
                    const currentTotal = data.reduce((s, d) => s + d.po_qty, 0);
                    const prevTotal = prevMonthArrivals
                        .filter(a => (a.item_type || 'Barang Jual') === itemType)
                        .reduce((s: number, a: any) => s + (parseInt(a.po_qty) || 0), 0);
                    const momPct = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal * 100) : null;
                    return (
                        <Col xs={24} key={label} style={sections ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : undefined}>
                            <Card
                                title={label}
                                size={sections ? 'small' : 'default'}
                                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', ...(sections ? { flex: 1, display: 'flex', flexDirection: 'column' } : {}) }}
                                styles={{ header: { color: '#fff', padding: sections ? '0 12px' : undefined, minHeight: sections ? 36 : undefined, fontSize: sections ? 13 : undefined }, ...(sections ? { body: { flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 12px' } } : {}) }}
                            >
                                {data.length > 0 ? (
                                    <div style={sections ? { flex: 1, minHeight: 0 } : undefined}>
                                        <ResponsiveContainer width="100%" height={sections ? '100%' : 320}>
                                            <ComposedChart data={data} margin={{ bottom: sections ? 5 : 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: sections ? 9 : 11 }} angle={-20} textAnchor="end" height={sections ? 40 : 60} />
                                                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                                                <RTooltip content={<ItemTypeTooltip />} />
                                                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                                                <Bar dataKey="po_qty" name={barName} fill={color} radius={[4, 4, 0, 0]} />
                                                {showPlan && <Line type="monotone" dataKey="plan_qty" name="Plan Qty" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />}
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.4)' }}>No data available for {label.split('—')[0].trim()}</Text>
                                    </div>
                                )}
                                <div style={{ marginTop: sections ? 4 : 12, padding: sections ? '4px 12px' : '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Total = {currentTotal.toLocaleString()}</Text>
                                    {momPct !== null ? (
                                        <Text style={{ color: momPct >= 0 ? '#10b981' : '#ef4444', fontSize: 13 }}>
                                            {momPct >= 0 ? '▲' : '▼'} {Math.abs(momPct).toFixed(1)}% vs {prevMonthLabel || 'last month'}
                                        </Text>
                                    ) : (
                                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>🆕 Baru — no previous data</Text>
                                    )}
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>}

            {show('breakdown') && <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card title="📈 Breakdown Qty" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#fff' } }}>
                        {breakdownData.map(item => (
                            <div key={item.name} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{item.name}</Text>
                                    <Text style={{ color: '#fff', fontWeight: 600 }}>{item.value.toLocaleString()}</Text>
                                </div>
                                <Progress
                                    percent={totalQtyKedatangan > 0 ? (item.value / totalQtyKedatangan) * 100 : 0}
                                    showInfo={false}
                                    strokeColor={item.color}
                                    trailColor="rgba(255,255,255,0.08)"
                                    size="small"
                                />
                            </div>
                        ))}
                        <Row gutter={8} style={{ marginTop: 16 }}>
                            <Col span={8}>
                                <Card size="small" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', textAlign: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>RECEIVE RATE</Text>
                                    <Text style={{ color: '#3b82f6', fontWeight: 700, fontSize: 18 }}>{receiveRate}%</Text>
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>PUTAWAY RATE</Text>
                                    <Text style={{ color: '#10b981', fontWeight: 700, fontSize: 18 }}>{putawayRate}%</Text>
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', textAlign: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>PENDING RATE</Text>
                                    <Text style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18 }}>{pendingRate}%</Text>
                                </Card>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>}

            {show('avg_recv_put_chart') && monthlyAvgRecPut.data.length > 0 && (
                <Card title="📈 Avg Receive → Putaway per Month (Inbound)" size="small" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginTop: 24, position: 'relative' as const, zIndex: 0, overflow: 'hidden' as const }} styles={{ header: { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyAvgRecPut.data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} tickFormatter={(v) => monthlyAvgRecPut.fmtMin(v)} />
                            <RTooltip
                                contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                                formatter={(value: any) => [monthlyAvgRecPut.fmtMin(value || 0), 'Avg Time']}
                            />
                            <Line type="monotone" dataKey="avgMin" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 5 }} activeDot={{ r: 7 }} name="Avg Receive→Putaway" />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {show('po_qty_brand') && <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24}>
                    <Card title="📊 PO & Qty per Brand" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#fff' } }}>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={brandData} margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                                <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                                <RTooltip contentStyle={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }} />
                                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                                <Bar yAxisId="left" dataKey="po" name="Total PO" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="right" dataKey="qty" name="Total Qty" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        <Row gutter={8} style={{ marginTop: 12 }}>
                            <Col span={6}>
                                <Card size="small" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', textAlign: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>TOTAL PO</Text>
                                    <Text style={{ color: '#6366f1', fontWeight: 700, fontSize: 16 }}>{brandData.reduce((s, d) => s + d.po, 0).toLocaleString()}</Text>
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card size="small" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', textAlign: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>AVG PO / BRAND</Text>
                                    <Text style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 16 }}>{brandData.length > 0 ? Math.round(brandData.reduce((s, d) => s + d.po, 0) / brandData.length).toLocaleString() : 0}</Text>
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card size="small" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', textAlign: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>TOTAL QTY</Text>
                                    <Text style={{ color: '#06b6d4', fontWeight: 700, fontSize: 16 }}>{brandData.reduce((s, d) => s + d.qty, 0).toLocaleString()}</Text>
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card size="small" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', textAlign: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>AVG QTY / BRAND</Text>
                                    <Text style={{ color: '#14b8a6', fontWeight: 700, fontSize: 16 }}>{brandData.length > 0 ? Math.round(brandData.reduce((s, d) => s + d.qty, 0) / brandData.length).toLocaleString() : 0}</Text>
                                </Card>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>}

            {show('vas_type') && <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} sm={12}>
                    <Card size="small" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))', border: '1px solid rgba(59,130,246,0.3)', textAlign: 'center', borderRadius: 12, padding: '16px 0' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, display: 'block', marginBottom: 4 }}>📦 TOTAL VAS</Text>
                        <Text style={{ color: '#3b82f6', fontWeight: 700, fontSize: 32 }}>{totalVasCurrent.toLocaleString()}</Text>
                    </Card>
                </Col>
                <Col xs={24} sm={12}>
                    <Card size="small" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center', borderRadius: 12, padding: '16px 0' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, display: 'block', marginBottom: 4 }}>👷 AVG VAS / MANPOWER</Text>
                        <Text style={{ color: '#10b981', fontWeight: 700, fontSize: 32 }}>{avgVasPerOperator.toLocaleString()}</Text>
                    </Card>
                </Col>
            </Row>}

            {show('vas') && <Card
                title="📦 Value-Added Services (VAS)"
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}
                styles={{ header: { color: '#fff' } }}
            >
                {vasBrandItemData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={vasBrandItemData} margin={{ bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                            <RTooltip contentStyle={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                            <Bar dataKey="qtyItem" name="Qty Item" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="qtyGimmick" name="Qty Gimmick" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)' }}>No VAS data available</Text>
                    </div>
                )}
                <Row gutter={8} style={{ marginTop: 16 }}>
                    <Col span={8}>
                        <Card size="small" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', textAlign: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>TOTAL VAS</Text>
                            <Text style={{ color: '#3b82f6', fontWeight: 700, fontSize: 18 }}>{totalVasCurrent.toLocaleString()}</Text>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card size="small" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', textAlign: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>AVG / BRAND</Text>
                            <Text style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 18 }}>{avgVasPerBrand.toLocaleString()}</Text>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card size="small" style={{ background: vasMomPct !== null && vasMomPct >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${vasMomPct !== null && vasMomPct >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, textAlign: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>VS {prevMonthLabel.toUpperCase() || 'LAST MONTH'}</Text>
                            {vasMomPct !== null ? (
                                <Text style={{ color: vasMomPct >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 18 }}>
                                    {vasMomPct >= 0 ? '▲' : '▼'} {Math.abs(vasMomPct).toFixed(1)}%
                                </Text>
                            ) : (
                                <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 18 }}>—</Text>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Card>}

            {show('vas_operator') && <Card
                title="👷 VAS per Operator"
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}
                styles={{ header: { color: '#fff' } }}
            >
                {vasOperatorItemData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={vasOperatorItemData} margin={{ bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                            <RTooltip contentStyle={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                            <Bar dataKey="qtyItem" name="Qty Item" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="qtyGimmick" name="Qty Gimmick" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)' }}>No VAS data available</Text>
                    </div>
                )}
                <Row gutter={8} style={{ marginTop: 16 }}>
                    <Col span={12}>
                        <Card size="small" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>AVG VAS / OPERATOR</Text>
                            <Text style={{ color: '#10b981', fontWeight: 700, fontSize: 18 }}>{avgVasPerOperator.toLocaleString()}</Text>
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card size="small" style={{ background: vasMomPct !== null && vasMomPct >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${vasMomPct !== null && vasMomPct >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, textAlign: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block' }}>VS {prevMonthLabel.toUpperCase() || 'LAST MONTH'}</Text>
                            {vasMomPct !== null ? (
                                <Text style={{ color: vasMomPct >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 18 }}>
                                    {vasMomPct >= 0 ? '▲' : '▼'} {Math.abs(vasMomPct).toFixed(1)}%
                                </Text>
                            ) : (
                                <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 18 }}>—</Text>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Card>}

            {show('unloading') && <Card
                title="🚚 Unloading Summary"
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}
                styles={{ header: { color: '#fff' } }}
            >
                <Table
                    dataSource={(() => {
                        const fUl = dateRange
                            ? unloadings.filter((u: any) => matchesDateRange(u.date))
                            : unloadings;
                        const bMap: Record<string, { days: Set<string>; vehicles: number }> = {};
                        fUl.forEach((u: any) => {
                            const brand = u.brand || 'Unknown';
                            if (!bMap[brand]) bMap[brand] = { days: new Set(), vehicles: 0 };
                            if (u.date) bMap[brand].days.add(u.date);
                            bMap[brand].vehicles += (u.total_vehicles || 0);
                        });
                        return Object.entries(bMap).map(([brand, v]) => ({
                            key: brand,
                            brand,
                            total_unloading: v.days.size,
                            total_vehicles: v.vehicles,
                        })).sort((a, b) => b.total_vehicles - a.total_vehicles);
                    })()}
                    columns={[
                        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 200 },
                        {
                            title: 'Total Unloading (Days)', dataIndex: 'total_unloading', key: 'total_unloading', width: 160, align: 'center' as const,
                            render: (v: number) => <span style={{ color: '#60a5fa', fontWeight: 600 }}>{v}</span>
                        },
                        {
                            title: 'Total Vehicles', dataIndex: 'total_vehicles', key: 'total_vehicles', width: 140, align: 'center' as const,
                            render: (v: number) => <span style={{ color: '#10b981', fontWeight: 600 }}>{v.toLocaleString()}</span>
                        },
                    ]}
                    rowKey="key"
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                />
            </Card>}

            {/* Inbound by Brand */}
            {show('inbound_by_brand') && <Card
                title="📊 Inbound by Brand"
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24 }}
                styles={{ header: { color: '#fff' } }}
            >
                <Table
                    dataSource={(() => {
                        // Build case count per brand (from fCases)
                        const caseByBrand: Record<string, number> = {};
                        fCases.forEach((c: any) => {
                            const brand = (c.brand || 'Unknown').toUpperCase();
                            caseByBrand[brand] = (caseByBrand[brand] || 0) + 1;
                        });

                        const bMap: Record<string, { kedatanganKeys: Set<string>; terjadwal: Set<string>; tidakScheduled: Set<string>; tepatWaktu: Set<string>; terlambat: Set<string>; cases: number; urgensi: Set<string> }> = {};
                        enrichedArrivals.forEach((a: any) => {
                            const brand = (a.brand || 'Unknown').toUpperCase();
                            if (!bMap[brand]) bMap[brand] = { kedatanganKeys: new Set(), terjadwal: new Set(), tidakScheduled: new Set(), tepatWaktu: new Set(), terlambat: new Set(), cases: 0, urgensi: new Set() };

                            // Unique kedatangan key = brand|date|arrival_time (same as stat card)
                            const kedKey = `${a.brand}|${a.date}|${a.arrival_time}`;

                            bMap[brand].kedatanganKeys.add(kedKey);

                            const sched = (a.scheduled_arrival_time || '').trim();
                            const arrival = (a.arrival_time || '').trim();
                            if (sched && sched !== '-') {
                                bMap[brand].terjadwal.add(kedKey);
                                // Tepat waktu: arrival_time <= scheduled_arrival_time
                                if (arrival && arrival !== '-' && arrival <= sched) bMap[brand].tepatWaktu.add(kedKey);
                                else if (arrival && arrival !== '-') bMap[brand].terlambat.add(kedKey);
                            } else {
                                bMap[brand].tidakScheduled.add(kedKey);
                            }

                            const urg = (a.urgensi || '').trim().toUpperCase();
                            if (urg === 'YA') bMap[brand].urgensi.add(kedKey);
                        });

                        // Merge cases
                        Object.entries(caseByBrand).forEach(([brand, cnt]) => {
                            if (!bMap[brand]) bMap[brand] = { kedatanganKeys: new Set(), terjadwal: new Set(), tidakScheduled: new Set(), tepatWaktu: new Set(), terlambat: new Set(), cases: 0, urgensi: new Set() };
                            bMap[brand].cases = cnt;
                        });

                        // Total Arrivals = unique kedatangan per brand (consistent with stat card)
                        const rows = Object.entries(bMap).map(([brand, v]) => ({ key: brand, brand, total: v.kedatanganKeys.size, terjadwal: v.terjadwal.size, tidakScheduled: v.tidakScheduled.size, tepatWaktu: v.tepatWaktu.size, terlambat: v.terlambat.size, cases: v.cases, urgensi: v.urgensi.size })).sort((a, b) => b.total - a.total);
                        const totalRow = { key: '_TOTAL', brand: 'TOTAL', total: 0, terjadwal: 0, tidakScheduled: 0, tepatWaktu: 0, terlambat: 0, cases: 0, urgensi: 0, _isTotal: true };
                        rows.forEach(r => { totalRow.total += r.total; totalRow.terjadwal += r.terjadwal; totalRow.tidakScheduled += r.tidakScheduled; totalRow.tepatWaktu += r.tepatWaktu; totalRow.terlambat += r.terlambat; totalRow.cases += r.cases; totalRow.urgensi += r.urgensi; });
                        return [totalRow, ...rows];
                    })()}
                    columns={[
                        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 140, render: (v: string, r: any) => r._isTotal ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                        { title: 'Total Arrivals', dataIndex: 'total', key: 'total', width: 130, align: 'center' as const, render: (v: number, r: any) => <span style={{ color: '#6366f1', fontWeight: r._isTotal ? 700 : 600 }}>{v}</span> },
                        { title: 'Scheduled', dataIndex: 'terjadwal', key: 'terjadwal', width: 110, align: 'center' as const, render: (v: number) => <span style={{ color: '#3b82f6', fontWeight: 600 }}>{v || '-'}</span> },
                        { title: 'Unscheduled', dataIndex: 'tidakTerjadwal', key: 'tidakScheduled', width: 130, align: 'center' as const, render: (v: number) => <span style={{ color: '#f59e0b', fontWeight: 600 }}>{v || '-'}</span> },
                        { title: 'On Time', dataIndex: 'tepatWaktu', key: 'tepatWaktu', width: 110, align: 'center' as const, render: (v: number) => <span style={{ color: '#10b981', fontWeight: 600 }}>{v || '-'}</span> },
                        { title: 'Late', dataIndex: 'terlambat', key: 'terlambat', width: 110, align: 'center' as const, render: (v: number) => <span style={{ color: '#ef4444', fontWeight: 600 }}>{v || '-'}</span> },
                        { title: 'Case', dataIndex: 'cases', key: 'cases', width: 80, align: 'center' as const, render: (v: number) => v ? <span style={{ color: '#ec4899', fontWeight: 600 }}>{v}</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span> },
                        { title: 'Urgency', dataIndex: 'urgensi', key: 'urgensi', width: 90, align: 'center' as const, render: (v: number) => v ? <span style={{ color: '#f97316', fontWeight: 600 }}>{v}</span> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span> },
                    ]}
                    rowKey="key"
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    onRow={(record: any) => ({ style: record._isTotal ? { background: 'rgba(99,102,241,0.12)', fontWeight: 700 } : undefined })}
                />
            </Card>}

            {/* Inbound Rejection Summary */}
            {show('tolakan') && (() => {
                // Merge BA-sourced rejections + manual rejections, filtered by dateRange
                const baRejections: any[] = [];
                baData
                    .filter((ba: any) => (ba.doc_type || '').toLowerCase().includes('penolakan'))
                    .forEach((ba: any) => {
                        let items: any[] = [];
                        try { items = JSON.parse(ba.items || '[]'); } catch { items = []; }
                        items.forEach((item: any) => {
                            baRejections.push({
                                date: ba.date,
                                brand: ba.kepada || '',
                                sku: item.sku || item.SKU || '',
                                qty: parseInt(item.qty || item.Qty || '1') || 1,
                                catatan: item.catatan || item.note || ba.notes || '',
                            });
                        });
                    });
                const allRej = [...baRejections, ...rejections];
                const fRej = allRej.filter(r => matchesDateRange(r.date));

                if (fRej.length === 0) return null;

                const brandMap: Record<string, { brand: string; skuCount: number; totalQty: number; skus: Set<string> }> = {};
                fRej.forEach(r => {
                    const brand = (r.brand || '').trim() || '-';
                    const sku = (r.sku || '').trim();
                    const qty = parseInt(r.qty) || 0;
                    if (!brandMap[brand]) brandMap[brand] = { brand, skuCount: 0, totalQty: 0, skus: new Set() };
                    if (sku && !brandMap[brand].skus.has(sku)) { brandMap[brand].skus.add(sku); brandMap[brand].skuCount++; }
                    brandMap[brand].totalQty += qty;
                });
                const rows = Object.values(brandMap).map(({ brand, skuCount, totalQty }) => ({ brand, sku: skuCount, qty: totalQty, key: brand })).sort((a, b) => b.qty - a.qty);
                const totalRow = { brand: 'TOTAL', sku: rows.reduce((s, r) => s + r.sku, 0), qty: rows.reduce((s, r) => s + r.qty, 0), key: '_TOTAL', _isTotal: true };

                return (
                    <Card
                        title={<span>🚫 Inbound Rejection — Summary ({fRej.length} item)</span>}
                        style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24 }}
                        styles={{ header: { color: '#f87171' } }}
                    >
                        <Table
                            dataSource={[totalRow, ...rows]}
                            columns={[
                                { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 160, render: (v: string, r: any) => r._isTotal ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                                { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 80, align: 'center' as const, render: (v: number) => <span style={{ color: '#60a5fa', fontWeight: 600 }}>{v}</span> },
                                { title: 'Rejected Qty', dataIndex: 'qty', key: 'qty', width: 100, align: 'center' as const, render: (v: number, r: any) => <span style={{ color: '#f87171', fontWeight: r._isTotal ? 700 : 600 }}>{v}</span> },
                            ]}
                            rowKey="key"
                            size="small"
                            pagination={false}
                            onRow={(record: any) => ({ style: record._isTotal ? { background: 'rgba(248,113,113,0.1)', fontWeight: 700 } : undefined })}
                        />
                    </Card>
                );
            })()}

            {/* Case Inbound Summary */}
            {show('case') && (() => {
                const fCases = inboundCases.filter(c => matchesDateRange(c.date));
                if (fCases.length === 0) return null;

                const caseMap: Record<string, { caseType: string; totalQty: number; brands: Set<string> }> = {};
                fCases.forEach(c => {
                    const caseType = (c.case || '').trim() || 'Others';
                    const brand = (c.brand || '').trim();
                    const qty = parseInt(c.qty) || 0;
                    if (!caseMap[caseType]) caseMap[caseType] = { caseType, totalQty: 0, brands: new Set() };
                    caseMap[caseType].totalQty += qty;
                    if (brand) caseMap[caseType].brands.add(brand);
                });
                const rows = Object.values(caseMap).map(({ caseType, totalQty, brands }) => ({
                    caseType,
                    qty: totalQty,
                    brandCount: brands.size,
                    key: caseType,
                })).sort((a, b) => b.qty - a.qty);
                const totalRow = { caseType: 'TOTAL', qty: rows.reduce((s, r) => s + r.qty, 0), brandCount: new Set(fCases.map(c => (c.brand || '').trim()).filter(Boolean)).size, key: '_TOTAL', _isTotal: true };

                return (
                    <Card
                        title={<span>📋 Case Inbound — Summary ({fCases.length} item)</span>}
                        style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24 }}
                        styles={{ header: { color: '#ec4899' } }}
                    >
                        <Table
                            dataSource={[totalRow, ...rows]}
                            columns={[
                                { title: 'Case Type', dataIndex: 'caseType', key: 'caseType', width: 180, render: (v: string, r: any) => r._isTotal ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                                { title: 'Brand', dataIndex: 'brandCount', key: 'brandCount', width: 80, align: 'center' as const, render: (v: number) => <span style={{ color: '#60a5fa', fontWeight: 600 }}>{v}</span> },
                                { title: 'Total Qty', dataIndex: 'qty', key: 'qty', width: 100, align: 'center' as const, render: (v: number, r: any) => <span style={{ color: '#ec4899', fontWeight: r._isTotal ? 700 : 600 }}>{v}</span> },
                            ]}
                            rowKey="key"
                            size="small"
                            pagination={false}
                            onRow={(record: any) => ({ style: record._isTotal ? { background: 'rgba(236,72,153,0.1)', fontWeight: 700 } : undefined })}
                        />
                    </Card>
                );
            })()}
        </>
    );
}
