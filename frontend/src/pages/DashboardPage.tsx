import { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Card, Statistic, Typography, Tabs, Tag, Table, Spin, Progress, DatePicker, Space, Button as AntButton } from 'antd';
import type { Dayjs } from 'dayjs';
import ResizableTable from '../components/ResizableTable';
import {
    InboxOutlined, SwapOutlined, ToolOutlined, CheckCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { arrivalsApi, transactionsApi, vasApi, dccApi, damagesApi, sohApi, qcReturnsApi, locationsApi, attendancesApi, employeesApi, unloadingsApi } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const CHART_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#ef4444'];

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
    return (
        <Card style={{
            background: `linear-gradient(135deg, ${color}22, ${color}11)`,
            border: `1px solid ${color}33`,
            borderRadius: 12,
        }}>
            <Statistic
                title={<Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{title}</Text>}
                value={value}
                prefix={<span style={{ color, fontSize: 20 }}>{icon}</span>}
                valueStyle={{ color: '#fff', fontWeight: 700 }}
            />
        </Card>
    );
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [arrivals, setArrivals] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [vasList, setVasList] = useState<any[]>([]);
    const [dccList, setDccList] = useState<any[]>([]);
    const [damages, setDamages] = useState<any[]>([]);
    const [sohList, setSohList] = useState<any[]>([]);
    const [qcReturns, setQcReturns] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [attData, setAttData] = useState<any[]>([]);
    const [empData, setEmpData] = useState<any[]>([]);
    const [unloadings, setUnloadings] = useState<any[]>([]);

    const fetchAll = useCallback(() => {
        Promise.all([
            arrivalsApi.list(), transactionsApi.list(), vasApi.list(),
            dccApi.list(), damagesApi.list(), sohApi.list(), qcReturnsApi.list(),
            locationsApi.list(), attendancesApi.list(), employeesApi.list(),
            unloadingsApi.list(),
        ]).then(([a, t, v, d, dm, s, q, loc, att, emp, ul]) => {
            setArrivals(a.data || []);
            setTransactions(t.data || []);
            setVasList(v.data || []);
            setDccList(d.data || []);
            setDamages(dm.data || []);
            setSohList(s.data || []);
            setQcReturns(q.data || []);
            setLocations(loc.data || []);
            setAttData(att.data || []);
            setEmpData(emp.data || []);
            setUnloadings(ul.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => { fetchAll(); }, 30000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    // === DATE FILTER HELPER ===
    const matchesDateRange = useCallback((dateStr: string): boolean => {
        if (!dateRange) return true;
        if (!dateStr) return false;
        const d = dayjs(dateStr, ['M/D/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'D/M/YYYY']);
        if (!d.isValid()) return false;
        return d.diff(dateRange[0], 'day') >= 0 && d.diff(dateRange[1], 'day') <= 0;
    }, [dateRange]);

    // Filtered data for Inbound & Inventory tabs
    const fArrivals = useMemo(() => arrivals.filter(a => matchesDateRange(a.date)), [arrivals, matchesDateRange]);
    // Transactions NOT filtered by date — receive/putaway may happen on a different day than arrival
    const fTransactions = transactions;
    const fVasList = useMemo(() => vasList.filter(v => matchesDateRange(v.date)), [vasList, matchesDateRange]);
    const fDccList = useMemo(() => dccList.filter(d => matchesDateRange(d.date)), [dccList, matchesDateRange]);
    const fDamages = useMemo(() => damages.filter(d => matchesDateRange(d.date)), [damages, matchesDateRange]);
    const fSohList = useMemo(() => sohList.filter(s => matchesDateRange(s.date)), [sohList, matchesDateRange]);
    const fQcReturns = useMemo(() => qcReturns.filter(q => matchesDateRange(q.date)), [qcReturns, matchesDateRange]);

    // === INBOUND STATS (filtered) ===
    const totalKedatangan = new Set(fArrivals.map(a => `${a.brand}|${a.date}|${a.arrival_time}`).filter(k => k !== '||')).size;
    const totalPO = new Set(fArrivals.map(a => a.po_no).filter(Boolean)).size;
    const totalBrand = new Set(fArrivals.map(a => a.brand).filter(Boolean)).size;
    const totalQtyKedatangan = fArrivals.reduce((s, a) => s + (parseInt(a.po_qty) || 0), 0);

    // Transaction lookups by receipt_no
    const receiveTx = fTransactions.filter(t => ['receive', 'receiving'].includes((t.operate_type || '').toLowerCase()));
    const putawayTx = fTransactions.filter(t => (t.operate_type || '').toLowerCase() === 'putaway');
    const totalReceiveQty = receiveTx.reduce((s, t) => s + (parseInt(t.qty) || 0), 0);
    const totalPutawayQty = putawayTx.reduce((s, t) => s + (parseInt(t.qty) || 0), 0);
    const pendingReceive = totalQtyKedatangan - totalReceiveQty;
    const pctCompleted = totalQtyKedatangan > 0 ? ((totalPutawayQty / totalQtyKedatangan) * 100).toFixed(1) : '0.0';

    // Parse datetime/time string → minutes (supports "M/D/YYYY H:mm" or "HH:mm")
    const parseToMin = (raw: string): number | null => {
        if (!raw) return null;
        const s = raw.trim();
        // Full datetime: "2/18/2026 9:05" or "2/18/2026 09:05"
        const spaceIdx = s.lastIndexOf(' ');
        if (spaceIdx > 0) {
            const datePart = s.substring(0, spaceIdx);
            const timePart = s.substring(spaceIdx + 1);
            const tp = timePart.split(':').map(Number);
            if (tp.length < 2 || isNaN(tp[0]) || isNaN(tp[1])) return null;
            // Parse date for day-offset: M/D/YYYY
            const dp = datePart.split('/').map(Number);
            if (dp.length === 3 && !isNaN(dp[0]) && !isNaN(dp[1]) && !isNaN(dp[2])) {
                const d = new Date(dp[2], dp[0] - 1, dp[1]);
                const dayMin = Math.floor(d.getTime() / 60000);
                return dayMin + tp[0] * 60 + tp[1];
            }
            return tp[0] * 60 + tp[1];
        }
        // Time only: "9:05" or "09:05"
        const tp = s.split(':').map(Number);
        if (tp.length < 2 || isNaN(tp[0]) || isNaN(tp[1])) return null;
        return tp[0] * 60 + tp[1];
    };

    // Avg Kedatangan → Putaway (per receipt_no: latest putaway time - arrival_time)
    const calcAvgKedatanganPutaway = () => {
        const arrivalMap: Record<string, number> = {}; // receipt_no → arrival_time in min
        fArrivals.forEach(a => {
            const key = (a.receipt_no || '').trim().toLowerCase();
            const t = parseToMin(a.arrival_time);
            if (key && t !== null) {
                if (arrivalMap[key] === undefined || t < arrivalMap[key]) arrivalMap[key] = t;
            }
        });
        const putawayMap: Record<string, number> = {}; // receipt_no → latest putaway time
        putawayTx.forEach(t => {
            const key = (t.receipt_no || '').trim().toLowerCase();
            const tm = parseToMin(t.time_transaction);
            if (key && tm !== null) {
                if (putawayMap[key] === undefined || tm > putawayMap[key]) putawayMap[key] = tm;
            }
        });
        const diffs: number[] = [];
        Object.keys(arrivalMap).forEach(key => {
            if (putawayMap[key] !== undefined) {
                const diff = putawayMap[key] - arrivalMap[key];
                if (diff > 0) diffs.push(diff);
            }
        });
        if (diffs.length === 0) return '-';
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        return `${Math.floor(avg / 60)}h ${Math.round(avg % 60)}m`;
    };

    // Avg Receive → Putaway (per receipt_no: latest putaway time - earliest receive time)
    const calcAvgReceivePutaway = () => {
        const receiveMap: Record<string, number> = {}; // receipt_no → earliest receive time
        receiveTx.forEach(t => {
            const key = (t.receipt_no || '').trim().toLowerCase();
            const tm = parseToMin(t.time_transaction);
            if (key && tm !== null) {
                if (receiveMap[key] === undefined || tm < receiveMap[key]) receiveMap[key] = tm;
            }
        });
        const putawayMap: Record<string, number> = {}; // receipt_no → latest putaway time
        putawayTx.forEach(t => {
            const key = (t.receipt_no || '').trim().toLowerCase();
            const tm = parseToMin(t.time_transaction);
            if (key && tm !== null) {
                if (putawayMap[key] === undefined || tm > putawayMap[key]) putawayMap[key] = tm;
            }
        });
        const diffs: number[] = [];
        Object.keys(receiveMap).forEach(key => {
            if (putawayMap[key] !== undefined) {
                const diff = putawayMap[key] - receiveMap[key];
                if (diff > 0) diffs.push(diff);
            }
        });
        if (diffs.length === 0) return '-';
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        return `${Math.floor(avg / 60)}h ${Math.round(avg % 60)}m`;
    };

    // VAS stats
    const totalVAS = fVasList.reduce((s, v) => s + (parseInt(v.qty) || 0), 0);
    const vasOperators = new Set(fVasList.map(v => v.operator).filter(Boolean)).size;
    const avgVasPerMP = vasOperators > 0 ? Math.round(totalVAS / vasOperators) : 0;

    const avgKedPutaway = calcAvgKedatanganPutaway();
    const avgRecPutaway = calcAvgReceivePutaway();

    // Completion rates
    const receiveRate = totalQtyKedatangan > 0 ? ((totalReceiveQty / totalQtyKedatangan) * 100).toFixed(1) : '0.0';
    const putawayRate = totalQtyKedatangan > 0 ? ((totalPutawayQty / totalQtyKedatangan) * 100).toFixed(1) : '0.0';
    const pendingRate = totalQtyKedatangan > 0 ? ((Math.max(0, pendingReceive) / totalQtyKedatangan) * 100).toFixed(1) : '0.0';




    // Breakdown Qty bar data
    const breakdownData = [
        { name: 'Receive Qty', value: totalReceiveQty, color: '#3b82f6' },
        { name: 'Putaway Qty', value: totalPutawayQty, color: '#10b981' },
        { name: 'Pending Qty', value: Math.max(0, pendingReceive), color: '#f59e0b' },
    ];

    // Item Type breakdown per Brand from arrivals
    const brandItemTypeMap: Record<string, Record<string, number>> = {};
    fArrivals.forEach((a: any) => {
        const brand = a.brand || 'Unknown';
        const t = a.item_type || 'Barang Jual';
        if (!brandItemTypeMap[brand]) brandItemTypeMap[brand] = {};
        brandItemTypeMap[brand][t] = (brandItemTypeMap[brand][t] || 0) + (parseInt(a.po_qty) || 0);
    });
    // Collect all item types
    const allItemTypes = Array.from(new Set(fArrivals.map((a: any) => a.item_type || 'Barang Jual')));
    const brandItemTypeData = Object.entries(brandItemTypeMap).map(([brand, types]) => ({
        brand,
        ...types,
    }));

    // PO & Qty per Brand from arrivals
    const brandMap: Record<string, { po: number; qty: number }> = {};
    fArrivals.forEach((a: any) => {
        const brand = a.brand || 'Unknown';
        if (!brandMap[brand]) brandMap[brand] = { po: 0, qty: 0 };
        brandMap[brand].po += 1;
        brandMap[brand].qty += parseInt(a.po_qty) || 0;
    });
    const brandData = Object.entries(brandMap).map(([name, v]) => ({ name, po: v.po, qty: v.qty }));

    // VAS by type
    const vasTypeMap: Record<string, number> = {};
    fVasList.forEach((v: any) => {
        const t = v.vas_type || 'Unknown';
        vasTypeMap[t] = (vasTypeMap[t] || 0) + (parseInt(v.qty) || 0);
    });
    const vasTypeData = Object.entries(vasTypeMap).map(([name, value]) => ({ name, value }));

    // Pending arrivals (enriched with status from transactions)
    const pendingArrivals = useMemo(() => {
        const txMap: Record<string, { rcv: number; put: number }> = {};
        fTransactions.forEach((tx: any) => {
            const key = (tx.receipt_no || '').trim().toLowerCase();
            if (!key) return;
            if (!txMap[key]) txMap[key] = { rcv: 0, put: 0 };
            const qty = parseInt(tx.qty) || 0;
            const type = (tx.operate_type || '').toLowerCase();
            if (type === 'receive' || type === 'receiving') txMap[key].rcv += qty;
            else if (type === 'putaway') txMap[key].put += qty;
        });
        return fArrivals.map((a: any) => {
            const key = (a.receipt_no || '').trim().toLowerCase();
            const tx = txMap[key] || { rcv: 0, put: 0 };
            const poQty = parseInt(a.po_qty) || 0;
            let status = 'Pending Receive';
            if (tx.rcv >= poQty && tx.put >= poQty) status = 'Completed';
            else if (tx.rcv >= poQty) status = 'Pending Putaway';
            return { ...a, receive_qty: tx.rcv, putaway_qty: tx.put, status };
        }).filter((a: any) => a.status !== 'Completed');
    }, [fArrivals, fTransactions]);

    // Inventory stats

    const totalDcc = fDccList.length;
    const matchDcc = fDccList.filter(d => d.variance === 0).length;
    const _unmatchDcc = fDccList.filter(d => d.variance !== 0).length; void _unmatchDcc;
    const _accuracy = totalDcc > 0 ? ((matchDcc / totalDcc) * 100).toFixed(1) : '0.0'; void _accuracy;
    const _totalSku = new Set(fSohList.map(s => s.sku).filter(Boolean)).size; void _totalSku;
    const _totalDmg = fDamages.length; void _totalDmg;
    const _totalQcr = fQcReturns.length; void _totalQcr;

    // Accuracy calculations from DCC data
    const totalSysQty = fDccList.reduce((sum, d) => sum + (parseInt(d.sys_qty) || 0), 0);
    const totalPhyQty = fDccList.reduce((sum, d) => sum + (parseInt(d.phy_qty) || 0), 0);
    const shortageQty = fDccList.reduce((sum, d) => { const v = parseInt(d.variance) || 0; return sum + (v < 0 ? Math.abs(v) : 0); }, 0);
    const gainQty = fDccList.reduce((sum, d) => { const v = parseInt(d.variance) || 0; return sum + (v > 0 ? v : 0); }, 0);
    const accuracyQty = totalSysQty > 0 ? (((totalSysQty - shortageQty - gainQty) / totalSysQty) * 100).toFixed(2) : '0.00';

    // SKU Accuracy (unique SKUs)
    const skuVarianceMap: Record<string, number> = {};
    fDccList.forEach(d => {
        const sku = (d.sku || '').trim();
        if (!sku) return;
        const v = parseInt(d.variance) || 0;
        // If any line for this SKU has variance != 0, it's not matching
        if (!skuVarianceMap.hasOwnProperty(sku)) skuVarianceMap[sku] = 0;
        skuVarianceMap[sku] += Math.abs(v);
    });
    const totalSkuCount = Object.keys(skuVarianceMap).length;
    const totalSkuMatch = Object.values(skuVarianceMap).filter(v => v === 0).length;
    const totalSkuNotMatch = totalSkuCount - totalSkuMatch;
    const accuracySku = totalSkuCount > 0 ? ((totalSkuMatch / totalSkuCount) * 100).toFixed(2) : '0.00';

    // Location Accuracy (unique locations)
    const locVarianceMap: Record<string, number> = {};
    fDccList.forEach(d => {
        const loc = (d.location || '').trim();
        if (!loc) return;
        const v = parseInt(d.variance) || 0;
        if (!locVarianceMap.hasOwnProperty(loc)) locVarianceMap[loc] = 0;
        locVarianceMap[loc] += Math.abs(v);
    });
    const totalLocCount = Object.keys(locVarianceMap).length;
    const totalLocMatch = Object.values(locVarianceMap).filter(v => v === 0).length;
    const totalLocNotMatch = totalLocCount - totalLocMatch;
    const accuracyLoc = totalLocCount > 0 ? ((totalLocMatch / totalLocCount) * 100).toFixed(2) : '0.00';

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
    }

    return (
        <div>
            <Title level={4} style={{ color: '#fff', marginBottom: 24 }}>Dashboard</Title>
            <Tabs
                defaultActiveKey="inbound"
                items={[
                    {
                        key: 'inbound',
                        label: '📦 Inbound',
                        children: (
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
                                <Row gutter={[16, 16]}>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Total Kedatangan" value={totalKedatangan} icon={<InboxOutlined />} color="#6366f1" /></Col>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Total PO" value={totalPO} icon={<InboxOutlined />} color="#8b5cf6" /></Col>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Total Brand" value={totalBrand} icon={<InboxOutlined />} color="#a855f7" /></Col>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Total Qty Kedatangan" value={totalQtyKedatangan.toLocaleString()} icon={<SwapOutlined />} color="#06b6d4" /></Col>
                                </Row>
                                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Total Receive Qty" value={totalReceiveQty.toLocaleString()} icon={<SwapOutlined />} color="#3b82f6" /></Col>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Total Putaway Qty" value={totalPutawayQty.toLocaleString()} icon={<CheckCircleOutlined />} color="#10b981" /></Col>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Pending Receive" value={pendingReceive.toLocaleString()} icon={<ClockCircleOutlined />} color="#f59e0b" /></Col>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="% Completed" value={`${pctCompleted}%`} icon={<CheckCircleOutlined />} color="#22c55e" /></Col>
                                </Row>
                                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Avg Kedatangan → Putaway" value={avgKedPutaway} icon={<ClockCircleOutlined />} color="#ec4899" /></Col>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Avg Receive → Putaway" value={avgRecPutaway} icon={<ClockCircleOutlined />} color="#f97316" /></Col>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Total VAS" value={totalVAS.toLocaleString()} icon={<ToolOutlined />} color="#14b8a6" /></Col>
                                    <Col xs={12} sm={8} lg={6}><StatCard title="Avg VAS / Manpower" value={avgVasPerMP} icon={<ToolOutlined />} color="#64748b" /></Col>
                                </Row>

                                {/* Pending Arrivals Table — below stat cards */}
                                <Card
                                    title={`⏳ Pending Inbound (${pendingArrivals.length})`}
                                    style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}
                                    styles={{ header: { color: '#fff' } }}
                                >
                                    {pendingArrivals.length > 0 ? (
                                        <Table
                                            dataSource={pendingArrivals}
                                            columns={[
                                                { title: 'Tgl Kedatangan', dataIndex: 'date', key: 'date', width: 110 },
                                                { title: 'Waktu', dataIndex: 'arrival_time', key: 'arrival_time', width: 90 },
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
                                            <Text style={{ color: 'rgba(255,255,255,0.4)' }}>✅ Tidak ada pending — semua sudah selesai</Text>
                                        </div>
                                    )}
                                </Card>

                                {/* Charts Row 1: Item Type + Breakdown Qty */}
                                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                                    <Col xs={24} lg={12}>
                                        <Card title="🏷️ Qty per Item Type (per Brand)" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#fff' } }}>
                                            <ResponsiveContainer width="100%" height={Math.max(250, brandItemTypeData.length * 40)}>
                                                <BarChart data={brandItemTypeData} layout="vertical" margin={{ left: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                                                    <YAxis type="category" dataKey="brand" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} width={120} />
                                                    <RTooltip contentStyle={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                    <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                                                    {allItemTypes.map((type, i) => (
                                                        <Bar key={type} dataKey={type} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === allItemTypes.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                                                    ))}
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Card>
                                    </Col>
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
                                </Row>

                                {/* Charts Row 2: PO & Qty per Brand + VAS Type */}
                                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                                    <Col xs={24} lg={12}>
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
                                        </Card>
                                    </Col>
                                    <Col xs={24} lg={12}>
                                        <Card title="🏷️ VAS Type" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#fff' } }}>
                                            {vasTypeData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={250}>
                                                    <PieChart>
                                                        <Pie data={vasTypeData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                            {vasTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                                        </Pie>
                                                        <RTooltip contentStyle={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Belum ada data VAS</Text>
                                                </div>
                                            )}
                                        </Card>
                                    </Col>
                                </Row>


                                {/* Unloading Summary */}
                                <Card
                                    title="🚚 Unloading Summary"
                                    style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}
                                    styles={{ header: { color: '#fff' } }}
                                >
                                    <Table
                                        dataSource={(() => {
                                            const fUl = dateRange
                                                ? unloadings.filter((u: any) => matchesDateRange(u.date))
                                                : unloadings;
                                            const brandMap: Record<string, { days: Set<string>; vehicles: number }> = {};
                                            fUl.forEach((u: any) => {
                                                const brand = u.brand || 'Unknown';
                                                if (!brandMap[brand]) brandMap[brand] = { days: new Set(), vehicles: 0 };
                                                if (u.date) brandMap[brand].days.add(u.date);
                                                brandMap[brand].vehicles += (u.total_vehicles || 0);
                                            });
                                            return Object.entries(brandMap).map(([brand, v]) => ({
                                                key: brand,
                                                brand,
                                                total_unloading: v.days.size,
                                                total_vehicles: v.vehicles,
                                            })).sort((a, b) => b.total_vehicles - a.total_vehicles);
                                        })()}
                                        columns={[
                                            { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 200 },
                                            {
                                                title: 'Total Unloading (Hari)', dataIndex: 'total_unloading', key: 'total_unloading', width: 160, align: 'center' as const,
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
                                </Card>
                            </>
                        ),
                    },
                    {
                        key: 'inventory',
                        label: '📋 Inventory',
                        children: (
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
                                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                                    <Col xs={24} lg={8}>
                                        <Card style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                                <span style={{ fontSize: 18 }}>📊</span>
                                                <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Qty Accuracy</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {[
                                                    { label: 'Total Sys. Qty', value: totalSysQty.toLocaleString(), color: 'rgba(255,255,255,0.85)' },
                                                    { label: 'Total Phy. Qty', value: totalPhyQty.toLocaleString(), color: 'rgba(255,255,255,0.85)' },
                                                    { label: 'Shortage Qty', value: shortageQty.toLocaleString(), color: '#f87171' },
                                                    { label: 'Gain Qty', value: gainQty.toLocaleString(), color: '#fbbf24' },
                                                ].map(item => (
                                                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{item.label}</span>
                                                        <span style={{ color: item.color, fontWeight: 600, fontSize: 13 }}>{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>Accuracy Qty</span>
                                                <span style={{ color: '#10b981', fontWeight: 700, fontSize: 16 }}>{accuracyQty}%</span>
                                            </div>
                                        </Card>
                                    </Col>
                                    <Col xs={24} lg={8}>
                                        <Card style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                                <span style={{ fontSize: 18 }}>📦</span>
                                                <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>SKU Accuracy</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {[
                                                    { label: 'Total SKU Count', value: totalSkuCount.toLocaleString(), color: 'rgba(255,255,255,0.85)' },
                                                    { label: 'Total SKU Match', value: totalSkuMatch.toLocaleString(), color: '#4ade80' },
                                                    { label: 'Total SKU Not Match', value: totalSkuNotMatch.toLocaleString(), color: '#f87171' },
                                                ].map(item => (
                                                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{item.label}</span>
                                                        <span style={{ color: item.color, fontWeight: 600, fontSize: 13 }}>{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>Accuracy SKU</span>
                                                <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: 16 }}>{accuracySku}%</span>
                                            </div>
                                        </Card>
                                    </Col>
                                    <Col xs={24} lg={8}>
                                        <Card style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                                <span style={{ fontSize: 18 }}>📍</span>
                                                <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Location Accuracy</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {[
                                                    { label: 'Total Location Count', value: totalLocCount.toLocaleString(), color: 'rgba(255,255,255,0.85)' },
                                                    { label: 'Total Location Match', value: totalLocMatch.toLocaleString(), color: '#4ade80' },
                                                    { label: 'Total Location Not Match', value: totalLocNotMatch.toLocaleString(), color: '#f87171' },
                                                ].map(item => (
                                                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{item.label}</span>
                                                        <span style={{ color: item.color, fontWeight: 600, fontSize: 13 }}>{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>Accuracy Location</span>
                                                <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 16 }}>{accuracyLoc}%</span>
                                            </div>
                                        </Card>
                                    </Col>
                                </Row>
                                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                                    <Col xs={24} lg={12}>
                                        <Card title="📉 Shortage SKU" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#f87171' } }}>
                                            <ResizableTable
                                                dataSource={(() => {
                                                    const skuBrandMap: Record<string, string> = {};
                                                    fSohList.forEach((s: any) => { if (s.sku && s.brand) skuBrandMap[s.sku] = s.brand; });
                                                    const map: Record<string, { sku: string; brand: string; sys: number; phy: number; variance: number }> = {};
                                                    fDccList.forEach(d => {
                                                        const v = parseInt(d.variance) || 0;
                                                        if (v >= 0) return;
                                                        const sku = (d.sku || '').trim();
                                                        if (!sku) return;
                                                        if (!map[sku]) map[sku] = { sku, brand: skuBrandMap[sku] || '-', sys: 0, phy: 0, variance: 0 };
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
                                                    {
                                                        title: 'Variance', dataIndex: 'variance', key: 'variance', width: 90,
                                                        render: (v: number) => <Tag color="red">{v}</Tag>
                                                    },
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
                                                    const map: Record<string, { sku: string; brand: string; sys: number; phy: number; variance: number }> = {};
                                                    fDccList.forEach(d => {
                                                        const v = parseInt(d.variance) || 0;
                                                        if (v <= 0) return;
                                                        const sku = (d.sku || '').trim();
                                                        if (!sku) return;
                                                        if (!map[sku]) map[sku] = { sku, brand: skuBrandMap[sku] || '-', sys: 0, phy: 0, variance: 0 };
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
                                                    {
                                                        title: 'Variance', dataIndex: 'variance', key: 'variance', width: 90,
                                                        render: (v: number) => <Tag color="green">+{v}</Tag>
                                                    },
                                                ]}
                                                rowKey="sku"
                                                size="small"
                                                scroll={{ y: 200 }}
                                                pagination={false}
                                            />
                                        </Card>
                                    </Col>
                                </Row>

                                {/* Cycle Count Coverage Per Zone */}
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
                                                    {
                                                        title: 'Zone', dataIndex: 'zone', key: 'zone', width: 140,
                                                        render: (v: string, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v
                                                    },
                                                    {
                                                        title: 'Total Location', dataIndex: 'total', key: 'total', width: 120,
                                                        render: (v: number, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v
                                                    },
                                                    {
                                                        title: 'Counted', dataIndex: 'counted', key: 'counted', width: 120,
                                                        render: (v: number) => <span style={{ color: '#4ade80', fontWeight: 600 }}>{v}</span>
                                                    },
                                                    {
                                                        title: '% Counted', dataIndex: 'pct', key: 'pct', width: 200,
                                                        render: (v: string) => (
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

                                {/* Project Damage — Summary */}
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

                                {/* QC Return — Summary */}
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
                        ),
                    },
                    {
                        key: 'utilization',
                        label: '🏭 WH Utilization',
                        children: (() => {
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

                            // Build subtotals per Location Type and grand total
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

                            return (
                                <>
                                    <Card title="📊 WH Utilization by Zone" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#fff' } }}>
                                        <ResizableTable
                                            dataSource={finalRows}
                                            columns={[
                                                {
                                                    title: 'Location Type', dataIndex: 'category', key: 'category', width: 160,
                                                    render: (v: string, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v
                                                },
                                                { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 120 },
                                                {
                                                    title: 'Total Unit', dataIndex: 'total', key: 'total', width: 100,
                                                    render: (v: number, r: any) => r.isSummary ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v
                                                },
                                                {
                                                    title: 'Occupied', dataIndex: 'occupied', key: 'occupied', width: 100,
                                                    render: (v: number) => <span style={{ color: '#4ade80', fontWeight: 600 }}>{v}</span>
                                                },
                                                {
                                                    title: '% Occupied', dataIndex: 'pctOccupied', key: 'pctOccupied', width: 120,
                                                    render: (v: string) => (
                                                        <Progress percent={parseFloat(v)} size="small" strokeColor="#10b981"
                                                            format={() => `${v}%`} style={{ marginBottom: 0 }} />
                                                    )
                                                },
                                                {
                                                    title: 'Empty', dataIndex: 'empty', key: 'empty', width: 100,
                                                    render: (v: number) => <span style={{ color: '#f87171', fontWeight: 600 }}>{v}</span>
                                                },
                                                {
                                                    title: '% Empty', dataIndex: 'pctEmpty', key: 'pctEmpty', width: 120,
                                                    render: (v: string) => (
                                                        <Progress percent={parseFloat(v)} size="small" strokeColor="#f59e0b"
                                                            format={() => `${v}%`} style={{ marginBottom: 0 }} />
                                                    )
                                                },
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

                                    {/* Location Use Per Brand */}
                                    {(() => {
                                        // Build location -> dominant brand map from SOH
                                        const locBrandMap: Record<string, Record<string, number>> = {};
                                        sohList.forEach((s: any) => {
                                            const loc = (s.location || '').trim();
                                            const brand = (s.brand || '').trim();
                                            const qty = parseInt(s.qty) || 0;
                                            if (!loc || !brand || qty <= 0) return;
                                            if (!locBrandMap[loc]) locBrandMap[loc] = {};
                                            locBrandMap[loc][brand] = (locBrandMap[loc][brand] || 0) + qty;
                                        });

                                        // Determine dominant brand per location
                                        const locDominant: Record<string, string> = {};
                                        Object.entries(locBrandMap).forEach(([loc, brands]) => {
                                            let maxB = '', maxQ = 0;
                                            Object.entries(brands).forEach(([b, q]) => { if (q > maxQ) { maxQ = q; maxB = b; } });
                                            if (maxB) locDominant[loc] = maxB;
                                        });

                                        // Count locations per brand per location type
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
                                            {
                                                title: 'Location', dataIndex: 'count', key: 'count', width: 100,
                                                render: (v: number) => <span style={{ color: '#60a5fa', fontWeight: 600 }}>{v}</span>
                                            },
                                        ];

                                        return (
                                            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                                                <Col xs={24} lg={12}>
                                                    <Card title="📍 Location Use Per Brand — Picking Area" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#60a5fa' } }}>
                                                        <ResizableTable
                                                            dataSource={pickingBrands}
                                                            columns={brandColumns}
                                                            rowKey="key"
                                                            size="small"
                                                            pagination={false}
                                                        />
                                                    </Card>
                                                </Col>
                                                <Col xs={24} lg={12}>
                                                    <Card title="📍 Location Use Per Brand — Storage Area" style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }} styles={{ header: { color: '#f59e0b' } }}>
                                                        <ResizableTable
                                                            dataSource={storageBrands}
                                                            columns={brandColumns}
                                                            rowKey="key"
                                                            size="small"
                                                            pagination={false}
                                                        />
                                                    </Card>
                                                </Col>
                                            </Row>
                                        );
                                    })()}
                                </>
                            );
                        })(),
                    },
                    {
                        key: 'aging_stock',
                        label: '📅 Aging Stock',
                        children: (() => {
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

                            // Build location -> location_category map from Master Location (same as SohPage)
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

                                    {(() => {
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

                                        return criticalItems.length > 0 ? (
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
                                        ) : null;
                                    })()}

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
                        })(),
                    },
                    {
                        key: 'manpower',
                        label: '👷 Manpower',
                        children: (() => {
                            // Build employee status map: nik -> status (Reguler/Tambahan)
                            const empStatusMap: Record<string, string> = {};
                            empData.forEach((e: any) => {
                                if (e.nik) empStatusMap[e.nik.toLowerCase()] = (e.status || '').trim();
                            });

                            // Jobdesc → Divisi mapping
                            const divisiMap: Record<string, string> = {
                                'Troubleshoot': 'Inventory', 'Project Inventory': 'Inventory',
                                'Admin': 'Inbound', 'VAS': 'Inbound', 'Return': 'Return',
                                'Putaway': 'Inbound', 'Inspect': 'Inbound', 'Bongkaran': 'Inbound',
                                'Damage Project': 'Inventory', 'Cycle Count': 'Inventory',
                                'Receive': 'Inbound', 'STO': 'Inventory',
                            };

                            // Division categories for display
                            const DIVISIONS = ['Inbound', 'Inventory', 'Return', 'Bongkaran/Project/Tambahan'];

                            // Parse date and get month key
                            const getMonthKey = (dateStr: string) => {
                                const d = dayjs(dateStr, 'M/D/YYYY');
                                return d.isValid() ? d.format('YYYY-MM') : null;
                            };

                            // Count attendance per division per month
                            const monthDivMap: Record<string, Record<string, number>> = {};
                            const allMonths = new Set<string>();

                            attData.forEach((r: any) => {
                                const mk = getMonthKey(r.date);
                                if (!mk) return;
                                allMonths.add(mk);

                                const nik = (r.nik || '').toLowerCase();
                                const empStatus = empStatusMap[nik] || '';
                                const jobdesc = (r.jobdesc || '').trim();
                                const divisi = divisiMap[jobdesc] || '';

                                let rowKey = '';
                                if (empStatus === 'Tambahan') {
                                    rowKey = 'Bongkaran/Project/Tambahan';
                                } else if (empStatus === 'Reguler' && DIVISIONS.includes(divisi)) {
                                    rowKey = divisi;
                                } else {
                                    return; // skip unknown
                                }

                                if (!monthDivMap[rowKey]) monthDivMap[rowKey] = {};
                                monthDivMap[rowKey][mk] = (monthDivMap[rowKey][mk] || 0) + 1;
                            });

                            const sortedMonths = Array.from(allMonths).sort();
                            const MONTH_LABELS: Record<string, string> = {
                                '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
                                '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
                                '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
                            };

                            // Build table rows
                            const tableRows = DIVISIONS.map(div => {
                                const row: any = { key: div, divisi: div };
                                sortedMonths.forEach(m => {
                                    row[m] = monthDivMap[div]?.[m] || 0;
                                });
                                return row;
                            });

                            // Add "Actual" total row
                            const actualRow: any = { key: '_actual', divisi: 'Actual', isTotal: true };
                            sortedMonths.forEach(m => {
                                actualRow[m] = DIVISIONS.reduce((sum, div) => sum + (monthDivMap[div]?.[m] || 0), 0);
                            });
                            tableRows.push(actualRow);

                            // M2M diff columns
                            const lastMonth = sortedMonths[sortedMonths.length - 1];
                            const prevMonth = sortedMonths.length >= 2 ? sortedMonths[sortedMonths.length - 2] : null;

                            // Month columns
                            const monthCols = sortedMonths.map(m => {
                                const [, mm] = m.split('-');
                                return {
                                    title: MONTH_LABELS[mm] || mm,
                                    dataIndex: m,
                                    key: m,
                                    width: 80,
                                    align: 'center' as const,
                                    render: (v: number, rec: any) => (
                                        <span style={{ fontWeight: rec.isTotal ? 700 : 400, color: rec.isTotal ? '#60a5fa' : '#fff' }}>
                                            {(v || 0).toLocaleString()}
                                        </span>
                                    ),
                                };
                            });

                            // M2M columns
                            const m2mCols = lastMonth && prevMonth ? [
                                {
                                    title: 'Diff',
                                    key: 'diff',
                                    width: 70,
                                    align: 'center' as const,
                                    render: (_: any, rec: any) => {
                                        const curr = rec[lastMonth] || 0;
                                        const prev = rec[prevMonth] || 0;
                                        const diff = curr - prev;
                                        const color = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : 'rgba(255,255,255,0.4)';
                                        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '';
                                        return <span style={{ color, fontWeight: 600 }}>{arrow} {Math.abs(diff)}</span>;
                                    },
                                },
                                {
                                    title: '%',
                                    key: 'pct',
                                    width: 80,
                                    align: 'center' as const,
                                    render: (_: any, rec: any) => {
                                        const curr = rec[lastMonth] || 0;
                                        const prev = rec[prevMonth] || 0;
                                        if (prev === 0) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>;
                                        const pct = (((curr - prev) / prev) * 100).toFixed(1);
                                        const color = parseFloat(pct) > 0 ? '#10b981' : parseFloat(pct) < 0 ? '#ef4444' : 'rgba(255,255,255,0.4)';
                                        return <span style={{ color, fontWeight: 600 }}>{parseFloat(pct) > 0 ? '+' : ''}{pct}%</span>;
                                    },
                                },
                            ] : [];

                            return (
                                <>
                                    <Card
                                        title="👷 Manpower Report — Monthly Headcount per Divisi"
                                        style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}
                                        styles={{ header: { color: '#fff' } }}
                                    >
                                        <ResizableTable
                                            dataSource={tableRows}
                                            columns={[
                                                {
                                                    title: 'Divisi', dataIndex: 'divisi', key: 'divisi', width: 200, fixed: 'left' as const,
                                                    render: (v: string, rec: any) => (
                                                        <span style={{ fontWeight: rec.isTotal ? 700 : 500, color: rec.isTotal ? '#60a5fa' : '#fff' }}>{v}</span>
                                                    ),
                                                },
                                                ...monthCols,
                                                ...m2mCols,
                                            ]}
                                            rowKey="key"
                                            size="small"
                                            scroll={{ x: 'max-content' }}
                                            pagination={false}
                                            onRow={(record: any) => ({
                                                style: record.isTotal ? { background: 'rgba(99,102,241,0.15)' } : undefined,
                                            })}
                                        />
                                    </Card>
                                </>
                            );
                        })(),
                    },
                ]}
            />
        </div>
    );
}
