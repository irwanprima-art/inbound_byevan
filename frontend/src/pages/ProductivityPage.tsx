import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Typography, Input, Button, DatePicker, Space, Spin, Modal, Form, InputNumber, message } from 'antd';
import {
    SearchOutlined, ReloadOutlined, DownloadOutlined, PlusOutlined,
    TrophyOutlined, InboxOutlined, SwapOutlined, TagsOutlined,
    CheckCircleOutlined, SafetyOutlined, ProjectOutlined,
} from '@ant-design/icons';
import { arrivalsApi, transactionsApi, vasApi, dccApi, damagesApi, qcReturnsApi, productivityApi } from '../api/client';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;

// ─── Types ─────────────────────────────────────────────
interface RankItem {
    name: string;
    divisi: string;
    jobdesc: string;
    value: number;
    valueLabel?: string;
    detail: string;
}

interface CategoryConfig {
    key: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    gradient: string;
    data: RankItem[];
}

// ─── Medal Podium Component ────────────────────────────
function PodiumSection({ items }: { items: RankItem[] }) {
    if (items.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(255,255,255,0.35)' }}>
                <InboxOutlined style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.4 }} />
                <Text style={{ color: 'rgba(255,255,255,0.35)' }}>Belum ada data</Text>
            </div>
        );
    }

    const medals = ['🥇', '🥈', '🥉'];
    const medalBg = [
        'linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)',
        'linear-gradient(135deg, #9ca3af, #d1d5db, #9ca3af)',
        'linear-gradient(135deg, #b45309, #d97706, #b45309)',
    ];
    const medalShadow = [
        '0 4px 20px rgba(245, 158, 11, 0.4)',
        '0 4px 16px rgba(156, 163, 175, 0.3)',
        '0 4px 16px rgba(180, 83, 9, 0.3)',
    ];
    const barHeight = [80, 60, 40];
    const barColor = [
        'rgba(245, 158, 11, 0.25)',
        'rgba(156, 163, 175, 0.18)',
        'rgba(217, 119, 6, 0.18)',
    ];
    const barBorder = [
        'rgba(245, 158, 11, 0.3)',
        'rgba(156, 163, 175, 0.2)',
        'rgba(217, 119, 6, 0.2)',
    ];

    const top3 = items.slice(0, 3);
    // Podium order: 2nd, 1st, 3rd
    const ordered = top3.length >= 3 ? [top3[1], top3[0], top3[2]] :
        top3.length === 2 ? [top3[1], top3[0]] : [top3[0]];
    const orderIdx = top3.length >= 3 ? [1, 0, 2] :
        top3.length === 2 ? [1, 0] : [0];

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, padding: '24px 16px 16px', minHeight: 160 }}>
            {ordered.map((item, i) => {
                const origIdx = orderIdx[i];
                const medalSize = origIdx === 0 ? 60 : 52;
                const fontSize = origIdx === 0 ? 30 : 26;
                return (
                    <div key={item.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default', transition: 'transform 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                        <div style={{
                            width: medalSize, height: medalSize, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize, background: medalBg[origIdx], boxShadow: medalShadow[origIdx], marginBottom: 8,
                        }}>
                            {medals[origIdx]}
                        </div>
                        <Text style={{ fontSize: 13, fontWeight: 600, color: '#fff', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }} title={item.name}>
                            {item.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
                            {item.valueLabel || item.value.toLocaleString()}
                        </Text>
                        <div style={{
                            width: 70, height: barHeight[origIdx],
                            borderRadius: '8px 8px 0 0', marginTop: 8,
                            background: `linear-gradient(to top, ${barColor[origIdx]}, ${barColor[origIdx]})`,
                            border: `1px solid ${barBorder[origIdx]}`,
                            transition: 'height 0.4s ease',
                        }} />
                    </div>
                );
            })}
        </div>
    );
}

// ─── Rank List Component ───────────────────────────────
function RankList({ items }: { items: RankItem[] }) {
    const rest = items.slice(3);
    if (rest.length === 0) return null;

    return (
        <div style={{ padding: '0 12px 16px', maxHeight: 320, overflowY: 'auto' }}>
            {rest.map((item, i) => {
                const rank = i + 4;
                return (
                    <div key={`${item.name}-${rank}`} style={{
                        display: 'flex', alignItems: 'center', padding: '10px 12px',
                        borderRadius: 10, marginBottom: 4,
                        background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        transition: 'background 0.2s',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99, 138, 255, 0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent')}>
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.4)', marginRight: 12, flexShrink: 0,
                        }}>
                            {rank}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                                {item.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                                {item.divisi} · {item.jobdesc}
                            </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', marginLeft: 12, flexShrink: 0 }}>
                            {item.valueLabel || item.value.toLocaleString()}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Leaderboard Card Component ────────────────────────
function LeaderboardCard({ config }: { config: CategoryConfig }) {
    return (
        <Card
            style={{
                background: '#161b22', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
                transition: 'all 0.2s',
            }}
            styles={{ body: { padding: 0 } }}
            hoverable
        >
            <div style={{
                padding: '20px 24px', textAlign: 'center', position: 'relative',
                background: config.gradient, color: '#fff',
            }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.9 }}>{config.icon}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {config.title}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{config.subtitle}</div>
            </div>
            <PodiumSection items={config.data} />
            <RankList items={config.data} />
        </Card>
    );
}

// ─── Main Page ─────────────────────────────────────────
export default function ProductivityPage() {
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDate, setFilterDate] = useState<Dayjs | null>(null);
    const [filterMonth, setFilterMonth] = useState<Dayjs | null>(null);

    // Raw data from all modules
    const [arrivals, setArrivals] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [vasList, setVasList] = useState<any[]>([]);
    const [dccList, setDccList] = useState<any[]>([]);
    const [damageList, setDamageList] = useState<any[]>([]);
    const [qcrList, setQcrList] = useState<any[]>([]);
    const [projectList, setProjectList] = useState<any[]>([]);

    // Project modal
    const [projModalOpen, setProjModalOpen] = useState(false);
    const [projForm] = Form.useForm();

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [a, t, v, d, dm, q, p] = await Promise.all([
                arrivalsApi.list(), transactionsApi.list(), vasApi.list(),
                dccApi.list(), damagesApi.list(), qcReturnsApi.list(), productivityApi.list(),
            ]);
            setArrivals(a.data || []);
            setTransactions(t.data || []);
            setVasList(v.data || []);
            setDccList(d.data || []);
            setDamageList(dm.data || []);
            setQcrList(q.data || []);
            setProjectList(p.data || []);
        } catch {
            message.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // Build leaderboard data — same logic as old script.js
    const categories = useMemo((): CategoryConfig[] => {
        // Date filter — backend now returns YYYY-MM-DD via FlexDate
        const matchDate = (dateStr: string) => {
            if (!dateStr) return false;
            const d = dayjs(dateStr);
            if (!d.isValid()) return false;
            if (filterDate) return d.format('YYYY-MM-DD') === filterDate.format('YYYY-MM-DD');
            if (filterMonth) return d.format('YYYY-MM') === filterMonth.format('YYYY-MM');
            return true;
        };

        const fArrivals = (filterDate || filterMonth) ? arrivals.filter(d => matchDate(d.date || '')) : arrivals;
        const fTransactions = (filterDate || filterMonth) ? transactions.filter(d => matchDate(d.date || '')) : transactions;
        const fVas = (filterDate || filterMonth) ? vasList.filter(d => matchDate(d.date || '')) : vasList;
        const fDcc = (filterDate || filterMonth) ? dccList.filter(d => matchDate(d.date || '')) : dccList;
        const fDamage = (filterDate || filterMonth) ? damageList.filter(d => matchDate(d.date || '')) : damageList;
        const fQcr = (filterDate || filterMonth) ? qcrList.filter(d => matchDate(d.return_date || d.date || '')) : qcrList;
        let fProject = (filterDate || filterMonth) ? projectList.filter(d => matchDate(d.date || '')) : projectList;

        // Build employee map from ALL sources
        const empMap: Record<string, { name: string; divisi: string; jobdesc: string }> = {};
        const addEmp = (name: string, divisi: string, jobdesc: string) => {
            const key = (name || '').trim().toLowerCase();
            if (!key) return;
            if (!empMap[key]) empMap[key] = { name, divisi, jobdesc };
        };

        fArrivals.forEach(d => addEmp(d.operator, 'Inbound', ''));
        fTransactions.forEach(d => addEmp(d.operator, 'Inbound', d.operate_type || ''));
        fVas.forEach(d => addEmp(d.operator, 'Inbound', 'VAS'));
        fDcc.forEach(d => addEmp(d.operator, 'Inventory', 'Cycle Count'));
        fDamage.forEach(d => addEmp(d.operator, 'Inventory', 'Project Damage'));
        fQcr.forEach(d => addEmp(d.operator, 'Inventory', 'QC Return'));

        const inspection: RankItem[] = [];
        const receive: RankItem[] = [];
        const vas: RankItem[] = [];
        const dcc: RankItem[] = [];
        const qc: RankItem[] = [];

        for (const [key, emp] of Object.entries(empMap)) {
            // Inspection
            let arrQty = 0;
            fArrivals.forEach(d => { if ((d.operator || '').trim().toLowerCase() === key) arrQty += (parseInt(d.po_qty) || 0); });
            if (arrQty > 0) inspection.push({ ...emp, value: arrQty, detail: `${arrQty.toLocaleString()} pcs inspected` });

            // Receive & Putaway
            let txQty = 0;
            fTransactions.forEach(d => { if ((d.operator || '').trim().toLowerCase() === key) txQty += (parseInt(d.qty) || 0); });
            if (txQty > 0) receive.push({ ...emp, value: txQty, detail: `${txQty.toLocaleString()} pcs received/putaway` });

            // VAS
            let vasQty = 0;
            fVas.forEach(d => { if ((d.operator || '').trim().toLowerCase() === key) vasQty += (parseInt(d.qty) || 0); });
            if (vasQty > 0) vas.push({ ...emp, value: vasQty, detail: `${vasQty.toLocaleString()} pcs VAS` });

            // DCC
            let dccQty = 0;
            const dccLocSet = new Set<string>();
            fDcc.forEach(d => {
                if ((d.operator || '').trim().toLowerCase() === key) {
                    dccQty += (parseInt(d.sys_qty) || 0) + (parseInt(d.phy_qty) || 0);
                    if (d.location) dccLocSet.add(d.location);
                }
            });
            if (dccQty > 0 || dccLocSet.size > 0) {
                dcc.push({ ...emp, value: dccQty, valueLabel: `${dccQty.toLocaleString()} pcs / ${dccLocSet.size} loc`, detail: `${dccLocSet.size} lokasi dicek` });
            }

            // Damage + QC Return
            let dmgQty = 0;
            fDamage.forEach(d => { if ((d.operator || '').trim().toLowerCase() === key) dmgQty += (parseInt(d.qty) || 0); });
            let qcrQty = 0;
            fQcr.forEach(d => { if ((d.operator || '').trim().toLowerCase() === key) qcrQty += (parseInt(d.qty) || 0); });
            const qcTotal = dmgQty + qcrQty;
            if (qcTotal > 0) qc.push({ ...emp, value: qcTotal, detail: `Damage: ${dmgQty.toLocaleString()} | QC Return: ${qcrQty.toLocaleString()}` });
        }

        // Project (manual input)
        const projMap: Record<string, { name: string; tasks: Set<string>; qty: number }> = {};
        fProject.forEach(d => {
            const key = (d.operator || d.name || '').trim().toLowerCase();
            if (!key) return;
            if (!projMap[key]) projMap[key] = { name: d.operator || d.name, tasks: new Set(), qty: 0 };
            projMap[key].qty += (parseInt(d.qty) || 0);
            if (d.activity || d.project) projMap[key].tasks.add(d.activity || d.project);
        });
        const project: RankItem[] = Object.values(projMap).map(p => ({
            name: p.name, divisi: 'Project', jobdesc: [...p.tasks].join(', '),
            value: p.qty, detail: [...p.tasks].join(', '),
        }));

        // Sort all descending
        [inspection, receive, vas, dcc, qc, project].forEach(arr => arr.sort((a, b) => b.value - a.value));

        // Apply search filter
        const q = search.toLowerCase();
        const filterSearch = (arr: RankItem[]) =>
            q ? arr.filter(d => d.name.toLowerCase().includes(q) || d.divisi.toLowerCase().includes(q) || d.jobdesc.toLowerCase().includes(q)) : arr;

        return [
            { key: 'inspection', title: 'Inspection', subtitle: 'Inbound Arrival', icon: <SearchOutlined />, gradient: 'linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)', data: filterSearch(inspection) },
            { key: 'receive', title: 'Receive & Putaway', subtitle: 'Inbound Transaction', icon: <SwapOutlined />, gradient: 'linear-gradient(135deg, #0d4a3a 0%, #10b981 100%)', data: filterSearch(receive) },
            { key: 'vas', title: 'Value Added Service', subtitle: 'VAS', icon: <TagsOutlined />, gradient: 'linear-gradient(135deg, #3b1a6b 0%, #8b5cf6 100%)', data: filterSearch(vas) },
            { key: 'dcc', title: 'Daily Cycle Count', subtitle: 'Qty & Location', icon: <CheckCircleOutlined />, gradient: 'linear-gradient(135deg, #0d4a3a 0%, #059669 100%)', data: filterSearch(dcc) },
            { key: 'qc', title: 'Damage & QC Return', subtitle: 'Project Damage + QC Return', icon: <SafetyOutlined />, gradient: 'linear-gradient(135deg, #3b1a6b 0%, #7c3aed 100%)', data: filterSearch(qc) },
            { key: 'project', title: 'Project', subtitle: 'Input Manual', icon: <ProjectOutlined />, gradient: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)', data: filterSearch(project) },
        ];
    }, [arrivals, transactions, vasList, dccList, damageList, qcrList, projectList, search, filterDate, filterMonth]);

    // Export CSV
    const handleExport = () => {
        const headers = ['Kategori', 'Rank', 'Nama Karyawan', 'Divisi', 'Job Desc', 'Nilai'];
        const rows: string[][] = [];
        categories.forEach(cat => {
            cat.data.forEach((d, i) => {
                rows.push([cat.title, String(i + 1), d.name, d.divisi, d.jobdesc, d.valueLabel || String(d.value)]);
            });
        });
        const csv = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `productivity_leaderboard_${dayjs().format('YYYY-MM-DD')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('Export CSV berhasil');
    };

    // Add project
    const handleAddProject = async () => {
        try {
            const vals = await projForm.validateFields();
            await productivityApi.create(vals);
            message.success('Data project ditambahkan');
            setProjModalOpen(false);
            projForm.resetFields();
            fetchAll();
        } catch (err: any) {
            if (err.response) message.error('Gagal menyimpan: ' + (err.response?.data?.error || ''));
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0, color: '#fff' }}>
                    <TrophyOutlined style={{ color: '#f59e0b', marginRight: 8 }} />
                    Productivity Leaderboard
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Peringkat produktivitas karyawan — auto-aggregated dari semua halaman
                </Text>
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <Space>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Export CSV</Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchAll}>Refresh</Button>
                </Space>
                <Space>
                    <DatePicker placeholder="Filter per hari" onChange={d => setFilterDate(d)} value={filterDate} allowClear />
                    <DatePicker.MonthPicker placeholder="Filter per bulan" onChange={d => setFilterMonth(d)} value={filterMonth} allowClear />
                    <Input
                        placeholder="Cari nama, divisi, job desc..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: 240 }}
                        allowClear
                    />
                </Space>
            </div>

            {/* Leaderboard Grid */}
            <Row gutter={[20, 20]}>
                {categories.map(cat => (
                    <Col key={cat.key} xs={24} lg={8}>
                        <LeaderboardCard config={cat} />
                        {/* Add Project button overlay for Project card */}
                        {cat.key === 'project' && (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setProjModalOpen(true)}
                                style={{
                                    position: 'relative', marginTop: -60, float: 'right', marginRight: 12,
                                    background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)',
                                    boxShadow: 'none', zIndex: 2,
                                }}
                                size="small"
                            />
                        )}
                    </Col>
                ))}
            </Row>

            {/* Project Add Modal */}
            <Modal
                title="Tambah Data Project"
                open={projModalOpen}
                onCancel={() => setProjModalOpen(false)}
                onOk={handleAddProject}
                destroyOnClose
            >
                <Form form={projForm} layout="vertical" preserve={false}>
                    <Form.Item name="operator" label="Nama Karyawan" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="activity" label="Task / Activity" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="qty" label="Qty" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={1} />
                    </Form.Item>
                    <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                        <Input placeholder="YYYY-MM-DD" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
