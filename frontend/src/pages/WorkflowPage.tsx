import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Space, Input, Modal, Select, Table, Popconfirm, message, Typography, Tag, Tooltip, Empty, Popover, Badge } from 'antd';
import {
    PlusOutlined, DeleteOutlined, EditOutlined, ArrowUpOutlined, ArrowDownOutlined,
    SearchOutlined, InboxOutlined, DatabaseOutlined, SwapOutlined, WarningOutlined,
    CheckCircleOutlined, ToolOutlined, EllipsisOutlined, EyeOutlined,
    NodeIndexOutlined, ReloadOutlined, SaveOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { workflowsApi } from '../api/client';

const { Text } = Typography;

/* ── Workflow name options (predefined categories) ── */
interface WorkflowCategory {
    value: string;
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
}

const WORKFLOW_CATEGORIES: WorkflowCategory[] = [
    { value: 'Inspection', label: 'Inspection', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: <SearchOutlined /> },
    { value: 'Receive', label: 'Receive', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: <InboxOutlined /> },
    { value: 'Putaway', label: 'Putaway', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: <DatabaseOutlined /> },
    { value: 'Transfer Stock', label: 'Transfer Stock', color: '#f97316', bg: 'rgba(249,115,22,0.15)', icon: <SwapOutlined /> },
    { value: 'QC Damage', label: 'QC Damage', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: <WarningOutlined /> },
    { value: 'Cycle Count', label: 'Cycle Count', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', icon: <CheckCircleOutlined /> },
    { value: 'VAS', label: 'VAS', color: '#eab308', bg: 'rgba(234,179,8,0.15)', icon: <ToolOutlined /> },
    { value: 'Lainnya', label: 'Lainnya', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', icon: <EllipsisOutlined /> },
];

const CATEGORY_MAP = Object.fromEntries(WORKFLOW_CATEGORIES.map(c => [c.value, c]));

/* ── Step: just a manual text label + optional decision ── */
interface WorkflowStep {
    id: string;
    label: string;
    isDecision: boolean;
    branchYes: string;
    branchNo: string;
}

interface WorkflowRecord {
    id: number;
    name: string;
    steps: string;
    updated_by: string;
    created_at: string;
    updated_at: string;
}

const newStep = (): WorkflowStep => ({
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    label: '',
    isDecision: false,
    branchYes: '',
    branchNo: '',
});

/* ═══════════════════════════════════════════════ */
/*                 FLOWCHART RENDERER              */
/* ═══════════════════════════════════════════════ */
function FlowchartPreview({ steps, name }: { steps: WorkflowStep[]; name: string }) {
    if (steps.length === 0) return <Empty description="Belum ada langkah" />;
    const cat = CATEGORY_MAP[name] || { color: '#818cf8', bg: 'rgba(129,140,248,0.15)' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 12px', gap: 0 }}>
            {/* Title */}
            <div style={{
                fontSize: 14, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: 1,
                marginBottom: 20, textAlign: 'center', padding: '0 8px',
            }}>
                {name || 'Untitled Workflow'}
            </div>

            {/* START node */}
            <FlowNode label="START" color="#22c55e" bg="rgba(34,197,94,0.2)" shape="rounded" />
            <FlowArrow />

            {steps.map((step, i) => {
                const label = step.label || `Langkah ${i + 1}`;

                if (step.isDecision) {
                    return (
                        <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                            <div style={{
                                width: 160, height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <div style={{
                                    width: 130, height: 75, background: cat.bg, border: `2px solid ${cat.color}`,
                                    transform: 'rotate(45deg)', borderRadius: 8, position: 'absolute',
                                }} />
                                <span style={{
                                    position: 'relative', zIndex: 1, color: cat.color, fontWeight: 700, fontSize: 11,
                                    textAlign: 'center', lineHeight: 1.2, maxWidth: 90,
                                }}>{label}?</span>
                            </div>
                            <div style={{ display: 'flex', gap: 30, marginTop: 6, marginBottom: 4 }}>
                                <div style={{
                                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 6,
                                    padding: '3px 10px', fontSize: 10, color: '#22c55e', fontWeight: 600,
                                }}>
                                    ✓ Ya{step.branchYes ? `: ${step.branchYes}` : ''}
                                </div>
                                <div style={{
                                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6,
                                    padding: '3px 10px', fontSize: 10, color: '#ef4444', fontWeight: 600,
                                }}>
                                    ✗ Tidak{step.branchNo ? `: ${step.branchNo}` : ''}
                                </div>
                            </div>
                            {i < steps.length - 1 && <FlowArrow />}
                        </div>
                    );
                }

                return (
                    <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                        <FlowNode label={label} color={cat.color} bg={cat.bg} />
                        {i < steps.length - 1 && <FlowArrow />}
                    </div>
                );
            })}

            <FlowArrow />
            <FlowNode label="SELESAI" color="#6366f1" bg="rgba(99,102,241,0.2)" shape="rounded" />
        </div>
    );
}

function FlowNode({ label, color, bg, shape }: { label: string; color: string; bg: string; shape?: 'rounded' }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px 20px', minWidth: 140, maxWidth: 200,
            background: bg, border: `2px solid ${color}`,
            borderRadius: shape === 'rounded' ? 40 : 10,
            color: color, fontWeight: 700, fontSize: 12,
            boxShadow: `0 0 12px ${color}33`,
            textAlign: 'center', lineHeight: 1.2,
        }}>
            {label}
        </div>
    );
}

function FlowArrow() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 2, height: 18, background: 'rgba(255,255,255,0.2)' }} />
            <div style={{
                width: 0, height: 0,
                borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                borderTop: '7px solid rgba(255,255,255,0.3)',
            }} />
        </div>
    );
}

/* ═══════════════════════════════════════════════ */
/*                   MAIN PAGE                     */
/* ═══════════════════════════════════════════════ */
export default function WorkflowPage() {
    const { user } = useAuth();
    const isSupervisor = user?.role === 'supervisor';
    const [data, setData] = useState<WorkflowRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [name, setName] = useState('Inspection');
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [viewWorkflow, setViewWorkflow] = useState<WorkflowRecord | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await workflowsApi.list();
            const items = (res.data || []) as WorkflowRecord[];
            items.sort((a, b) => b.id - a.id);
            setData(items);
        } catch { message.error('Gagal memuat data'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── CRUD ── */
    const handleAdd = () => {
        setEditId(null);
        setName('Inspection');
        setSteps([newStep()]);
        setModalOpen(true);
    };

    const handleEdit = (record: WorkflowRecord) => {
        setEditId(record.id);
        setName(record.name);
        try { setSteps(JSON.parse(record.steps || '[]')); }
        catch { setSteps([]); }
        setModalOpen(true);
    };

    const handleView = (record: WorkflowRecord) => {
        setViewWorkflow(record);
        setViewModalOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) { message.warning('Pilih nama workflow'); return; }
        if (steps.length === 0 || steps.every(s => !s.label.trim())) { message.warning('Isi minimal 1 langkah'); return; }
        const cleanSteps = steps.filter(s => s.label.trim());
        const payload = { name: name.trim(), steps: JSON.stringify(cleanSteps), updated_by: user?.username || '' };
        try {
            if (editId) { await workflowsApi.update(editId, payload); message.success('Workflow diupdate'); }
            else { await workflowsApi.create(payload); message.success('Workflow dibuat'); }
            setModalOpen(false);
            fetchData();
        } catch { message.error('Gagal menyimpan'); }
    };

    const handleDelete = async (id: number) => {
        await workflowsApi.remove(id);
        message.success('Workflow dihapus');
        fetchData();
    };

    /* ── Step management ── */
    const addStep = () => setSteps(prev => [...prev, newStep()]);

    const removeStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));

    const moveStep = (idx: number, dir: -1 | 1) => {
        setSteps(prev => {
            const arr = [...prev];
            const target = idx + dir;
            if (target < 0 || target >= arr.length) return arr;
            [arr[idx], arr[target]] = [arr[target], arr[idx]];
            return arr;
        });
    };

    const updateStep = (id: string, field: keyof WorkflowStep, value: any) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    /* ── Filter ── */
    const searchTerms = useMemo(() =>
        search.split('\n').map(t => t.trim().toLowerCase()).filter(Boolean),
    [search]);

    const filtered = useMemo(() => {
        if (searchTerms.length === 0) return data;
        return data.filter(d => searchTerms.some(q => d.name.toLowerCase().includes(q)));
    }, [data, searchTerms]);

    /* ── View modal steps ── */
    const viewSteps = useMemo(() => {
        if (!viewWorkflow) return [];
        try { return JSON.parse(viewWorkflow.steps || '[]') as WorkflowStep[]; }
        catch { return []; }
    }, [viewWorkflow]);

    /* ── Table columns ── */
    const columns = [
        {
            title: 'Nama Workflow', dataIndex: 'name', key: 'name', width: 180,
            render: (v: string) => {
                const cat = CATEGORY_MAP[v];
                if (cat) return <Tag color={cat.color} style={{ fontWeight: 600, fontSize: 12 }}>{cat.icon} {cat.label}</Tag>;
                return <Text strong style={{ color: '#818cf8' }}>{v}</Text>;
            },
        },
        {
            title: 'Jumlah Langkah', key: 'stepCount', width: 120,
            render: (_: any, r: WorkflowRecord) => {
                try { return JSON.parse(r.steps || '[]').length; } catch { return 0; }
            },
        },
        {
            title: 'Langkah-langkah', key: 'stepLabels', width: 350,
            render: (_: any, r: WorkflowRecord) => {
                try {
                    const parsed = JSON.parse(r.steps || '[]') as WorkflowStep[];
                    return (
                        <Space wrap size={4}>
                            {parsed.slice(0, 5).map((s, i) => (
                                <Tag key={i} style={{ margin: 0, fontSize: 11 }}>{i + 1}. {s.label}</Tag>
                            ))}
                            {parsed.length > 5 && <Tag style={{ margin: 0, fontSize: 11 }}>+{parsed.length - 5} lagi</Tag>}
                        </Space>
                    );
                } catch { return '-'; }
            },
        },
        {
            title: 'Dibuat', dataIndex: 'created_at', key: 'created_at', width: 120,
            render: (v: string) => v ? new Date(v).toLocaleDateString('id-ID') : '-',
        },
        {
            title: 'Actions', key: 'actions', width: 130, fixed: 'right' as const,
            render: (_: any, r: WorkflowRecord) => (
                <Space size="small">
                    <Tooltip title="Lihat Flowchart">
                        <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(r)} />
                    </Tooltip>
                    {isSupervisor && (
                        <Tooltip title="Edit">
                            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                        </Tooltip>
                    )}
                    {isSupervisor && (
                        <Popconfirm title="Hapus workflow ini?" onConfirm={() => handleDelete(r.id)}>
                            <Button type="link" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, color: '#fff' }}>
                    <NodeIndexOutlined style={{ marginRight: 8, color: '#818cf8' }} />
                    Workflow Builder
                </h2>
                <Space>
                    <Popover trigger="click" placement="bottomRight" content={<div style={{ width: 280 }}><div style={{ marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Masukkan keyword (satu per baris)</div><Input.TextArea value={search} onChange={e => setSearch(e.target.value)} placeholder={"Keyword 1\nKeyword 2\nKeyword 3"} autoSize={{ minRows: 4, maxRows: 10 }} style={{ marginBottom: 8 }} /><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{searchTerms.length > 0 ? `${searchTerms.length} keyword aktif` : 'Tidak ada filter'}</span>{search && <Button size="small" danger onClick={() => setSearch('')}>Clear</Button>}</div></div>}><Badge count={searchTerms.length} size="small" offset={[-4, 4]}><Button icon={<SearchOutlined />}>{searchTerms.length > 0 ? `Search (${searchTerms.length})` : 'Search'}</Button></Badge></Popover>
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Buat Workflow</Button>
                </Space>
            </div>

            <Table
                dataSource={filtered}
                columns={columns}
                rowKey="id"
                loading={loading}
                size="small"
                pagination={{ pageSize: 20, showTotal: t => `Total ${t} workflow` }}
            />

            {/* ═══ CREATE / EDIT MODAL ═══ */}
            <Modal
                title={editId ? 'Edit Workflow' : 'Buat Workflow Baru'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                width={900}
                footer={[
                    <Button key="cancel" onClick={() => setModalOpen(false)}>Batal</Button>,
                    <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>Simpan</Button>,
                ]}
            >
                <div style={{ display: 'flex', gap: 20 }}>
                    {/* Left: Step Builder */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Workflow name = select from predefined list */}
                        <Select
                            value={name}
                            onChange={setName}
                            style={{ width: '100%', marginBottom: 16 }}
                            size="large"
                            placeholder="Pilih Nama Workflow"
                            options={WORKFLOW_CATEGORIES.map(c => ({
                                value: c.value,
                                label: <span style={{ color: c.color, fontWeight: 600 }}>{c.icon} {c.label}</span>,
                            }))}
                        />

                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8, display: 'block' }}>
                            Tulis langkah-langkah workflow secara manual:
                        </Text>

                        <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                            {steps.map((step, idx) => {
                                const cat = CATEGORY_MAP[name] || WORKFLOW_CATEGORIES[7];
                                return (
                                    <Card
                                        key={step.id}
                                        size="small"
                                        style={{
                                            marginBottom: 8,
                                            border: `1px solid ${cat.color}33`,
                                            background: cat.bg,
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: step.isDecision ? 8 : 0 }}>
                                            <Tag color={cat.color} style={{ margin: 0, fontWeight: 700 }}>{idx + 1}</Tag>
                                            <Input
                                                placeholder={`Langkah ${idx + 1}...`}
                                                value={step.label}
                                                onChange={e => updateStep(step.id, 'label', e.target.value)}
                                                size="small"
                                                style={{ flex: 1 }}
                                            />
                                            <Space size={2}>
                                                <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => moveStep(idx, -1)} />
                                                <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === steps.length - 1} onClick={() => moveStep(idx, 1)} />
                                                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeStep(step.id)} disabled={steps.length <= 1} />
                                            </Space>
                                        </div>

                                        {/* Decision toggle */}
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                                            <Button
                                                size="small"
                                                type={step.isDecision ? 'primary' : 'default'}
                                                onClick={() => updateStep(step.id, 'isDecision', !step.isDecision)}
                                                style={{ fontSize: 11 }}
                                            >◆ Decision</Button>
                                            {step.isDecision && (
                                                <>
                                                    <Input size="small" placeholder="Jika Ya..." value={step.branchYes} onChange={e => updateStep(step.id, 'branchYes', e.target.value)} style={{ flex: 1 }} />
                                                    <Input size="small" placeholder="Jika Tidak..." value={step.branchNo} onChange={e => updateStep(step.id, 'branchNo', e.target.value)} style={{ flex: 1 }} />
                                                </>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        <Button type="dashed" icon={<PlusOutlined />} onClick={addStep} block style={{ marginTop: 8 }}>
                            Tambah Langkah
                        </Button>
                    </div>

                    {/* Right: Flowchart Preview */}
                    <div style={{
                        width: 280, minWidth: 280,
                        background: 'rgba(0,0,0,0.3)', borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.06)',
                        overflowY: 'auto', maxHeight: 520,
                    }}>
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                            📊 PREVIEW FLOWCHART
                        </div>
                        <FlowchartPreview steps={steps.filter(s => s.label.trim())} name={name} />
                    </div>
                </div>
            </Modal>

            {/* ═══ VIEW FLOWCHART MODAL ═══ */}
            <Modal
                title={
                    <span>
                        <NodeIndexOutlined style={{ marginRight: 8 }} />
                        {(() => {
                            const cat = CATEGORY_MAP[viewWorkflow?.name || ''];
                            return cat ? <Tag color={cat.color}>{cat.icon} {cat.label}</Tag> : (viewWorkflow?.name || 'Flowchart');
                        })()}
                    </span>
                }
                open={viewModalOpen}
                onCancel={() => setViewModalOpen(false)}
                footer={null}
                width={500}
            >
                <div style={{
                    background: 'rgba(0,0,0,0.2)', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '8px 0',
                }}>
                    <FlowchartPreview steps={viewSteps} name={viewWorkflow?.name || ''} />
                </div>
            </Modal>
        </div>
    );
}
