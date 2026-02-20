import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Typography, Tag, Table, Progress, DatePicker, Space, Button as AntButton } from 'antd';
import type { Dayjs } from 'dayjs';
import {
    InboxOutlined, SwapOutlined, ToolOutlined, CheckCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line } from 'recharts';
import dayjs from 'dayjs';

const { Text } = Typography;
const CHART_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#ef4444'];

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
    matchesDateRange: (d: string) => boolean;
}

export default function DashboardInboundTab({ dateRange, setDateRange, arrivals, transactions, vasList, unloadings, matchesDateRange }: Props) {
    const navigate = useNavigate();

    const fArrivals = useMemo(() => arrivals.filter(a => matchesDateRange(a.date)), [arrivals, matchesDateRange]);
    const fTransactions = transactions;
    const fVasList = useMemo(() => vasList.filter(v => matchesDateRange(v.date)), [vasList, matchesDateRange]);

    // Inbound stats
    const totalKedatangan = new Set(fArrivals.map(a => `${a.brand}|${a.date}|${a.arrival_time}`).filter(k => k !== '||')).size;
    const totalPO = new Set(fArrivals.map(a => a.po_no).filter(Boolean)).size;
    const totalBrand = new Set(fArrivals.map(a => a.brand).filter(Boolean)).size;
    const totalQtyKedatangan = fArrivals.reduce((s, a) => s + (parseInt(a.po_qty) || 0), 0);

    const receiveTx = fTransactions.filter(t => ['receive', 'receiving'].includes((t.operate_type || '').toLowerCase()));
    const putawayTx = fTransactions.filter(t => (t.operate_type || '').toLowerCase() === 'putaway');
    const totalReceiveQty = receiveTx.reduce((s, t) => s + (parseInt(t.qty) || 0), 0);
    const totalPutawayQty = putawayTx.reduce((s, t) => s + (parseInt(t.qty) || 0), 0);
    const pendingReceive = totalQtyKedatangan - totalReceiveQty;
    const pctCompleted = totalQtyKedatangan > 0 ? ((totalPutawayQty / totalQtyKedatangan) * 100).toFixed(1) : '0.0';

    const parseToMin = (raw: string): number | null => {
        if (!raw) return null;
        const s = raw.trim();
        const spaceIdx = s.lastIndexOf(' ');
        if (spaceIdx > 0) {
            const datePart = s.substring(0, spaceIdx);
            const timePart = s.substring(spaceIdx + 1);
            const tp = timePart.split(':').map(Number);
            if (tp.length < 2 || isNaN(tp[0]) || isNaN(tp[1])) return null;
            const dp = datePart.split('/').map(Number);
            if (dp.length === 3 && !isNaN(dp[0]) && !isNaN(dp[1]) && !isNaN(dp[2])) {
                const d = new Date(dp[2], dp[0] - 1, dp[1]);
                const dayMin = Math.floor(d.getTime() / 60000);
                return dayMin + tp[0] * 60 + tp[1];
            }
            return tp[0] * 60 + tp[1];
        }
        const tp = s.split(':').map(Number);
        if (tp.length < 2 || isNaN(tp[0]) || isNaN(tp[1])) return null;
        return tp[0] * 60 + tp[1];
    };

    const calcAvgKedatanganPutaway = () => {
        const arrivalMap: Record<string, number> = {};
        fArrivals.forEach(a => {
            const key = (a.receipt_no || '').trim().toLowerCase();
            const t = parseToMin(a.arrival_time);
            if (key && t !== null) {
                if (arrivalMap[key] === undefined || t < arrivalMap[key]) arrivalMap[key] = t;
            }
        });
        const putawayMap: Record<string, number> = {};
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

    const calcAvgReceivePutaway = () => {
        const receiveMap: Record<string, number> = {};
        receiveTx.forEach(t => {
            const key = (t.receipt_no || '').trim().toLowerCase();
            const tm = parseToMin(t.time_transaction);
            if (key && tm !== null) {
                if (receiveMap[key] === undefined || tm < receiveMap[key]) receiveMap[key] = tm;
            }
        });
        const putawayMap: Record<string, number> = {};
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

    const brandItemTypeMap: Record<string, Record<string, number>> = {};
    fArrivals.forEach((a: any) => {
        const brand = a.brand || 'Unknown';
        const t = a.item_type || 'Barang Jual';
        if (!brandItemTypeMap[brand]) brandItemTypeMap[brand] = {};
        brandItemTypeMap[brand][t] = (brandItemTypeMap[brand][t] || 0) + (parseInt(a.po_qty) || 0);
    });
    const allItemTypes = Array.from(new Set(fArrivals.map((a: any) => a.item_type || 'Barang Jual')));
    const brandItemTypeData = Object.entries(brandItemTypeMap).map(([brand, types]) => ({ brand, ...types }));

    const brandMap: Record<string, { po: number; qty: number }> = {};
    fArrivals.forEach((a: any) => {
        const brand = a.brand || 'Unknown';
        if (!brandMap[brand]) brandMap[brand] = { po: 0, qty: 0 };
        brandMap[brand].po += 1;
        brandMap[brand].qty += parseInt(a.po_qty) || 0;
    });
    const brandData = Object.entries(brandMap).map(([name, v]) => ({ name, po: v.po, qty: v.qty }));

    const vasTypeMap: Record<string, number> = {};
    fVasList.forEach((v: any) => {
        const t = v.vas_type || 'Unknown';
        vasTypeMap[t] = (vasTypeMap[t] || 0) + (parseInt(v.qty) || 0);
    });
    const vasTypeData = Object.entries(vasTypeMap).map(([name, value]) => ({ name, value }));

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
            <Row gutter={[16, 16]}>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total Kedatangan" value={totalKedatangan} icon={<InboxOutlined />} color="#6366f1" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total PO" value={totalPO} icon={<InboxOutlined />} color="#8b5cf6" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total Brand" value={totalBrand} icon={<InboxOutlined />} color="#a855f7" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total Qty Kedatangan" value={totalQtyKedatangan.toLocaleString()} icon={<SwapOutlined />} color="#06b6d4" /></Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total Receive Qty" value={totalReceiveQty.toLocaleString()} icon={<SwapOutlined />} color="#3b82f6" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total Putaway Qty" value={totalPutawayQty.toLocaleString()} icon={<CheckCircleOutlined />} color="#10b981" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Pending Receive" value={pendingReceive.toLocaleString()} icon={<ClockCircleOutlined />} color="#f59e0b" onClick={() => navigate('/arrivals?search=Pending')} /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="% Completed" value={`${pctCompleted}%`} icon={<CheckCircleOutlined />} color="#22c55e" /></Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={12} sm={8} lg={6}><StatCard title="Avg Kedatangan → Putaway" value={avgKedPutaway} icon={<ClockCircleOutlined />} color="#ec4899" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Avg Receive → Putaway" value={avgRecPutaway} icon={<ClockCircleOutlined />} color="#f97316" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Total VAS" value={totalVAS.toLocaleString()} icon={<ToolOutlined />} color="#14b8a6" /></Col>
                <Col xs={12} sm={8} lg={6}><StatCard title="Avg VAS / Manpower" value={avgVasPerMP} icon={<ToolOutlined />} color="#64748b" /></Col>
            </Row>

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

            <Card
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
                        <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Belum ada data VAS</Text>
                    </div>
                )}
            </Card>

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
    );
}
