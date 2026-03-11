import { useState, useEffect, useCallback } from 'react';
import {
    Form, Input, Select, Table, Button, Space, Tag, Modal,
    Popconfirm, Upload, message, DatePicker, Tooltip,
} from 'antd';
import {
    EditOutlined, DeleteOutlined, ReloadOutlined, UploadOutlined,
    DownloadOutlined, SearchOutlined, ClearOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { downloadCsvTemplate, normalizeDate } from '../utils/csvTemplate';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { attendancesApi, employeesApi } from '../api/client';

const jobdescOptions = [
    'Troubleshoot', 'Project Inventory', 'Admin', 'VAS', 'Return',
    'Putaway', 'Inspect', 'Bongkaran', 'Damage Project', 'Cycle Count',
    'Receive', 'STO',
].map(v => ({ label: v, value: v }));

// Jobdesc → Divisi mapping
const divisiMap: Record<string, string> = {
    'Troubleshoot': 'Inventory', 'Project Inventory': 'Inventory',
    'Admin': 'Inbound', 'VAS': 'Inbound', 'Return': 'Return',
    'Putaway': 'Inbound', 'Inspect': 'Inbound', 'Bongkaran': 'Inbound',
    'Damage Project': 'Inventory', 'Cycle Count': 'Inventory',
    'Receive': 'Inbound', 'STO': 'Inventory',
};

const calcWorkhourMin = (clockIn: string, clockOut: string): number => {
    if (!clockIn || !clockOut) return 0;
    const inParts = clockIn.split(':').map(Number);
    const outParts = clockOut.split(':').map(Number);
    const inSec = (inParts[0] || 0) * 3600 + (inParts[1] || 0) * 60 + (inParts[2] || 0);
    const outSec = (outParts[0] || 0) * 3600 + (outParts[1] || 0) * 60 + (outParts[2] || 0);
    let diff = outSec - inSec;
    if (diff < 0) diff += 86400; // cross-midnight: add 24 hours
    return Math.floor(diff / 60);
};

const formatMinutes = (totalMin: number): string => {
    if (totalMin <= 0) return '0:00';
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
};

const calcOvertime = (totalMin: number): string => {
    if (totalMin < 570) return '0:00'; // < 9:30
    return formatMinutes(totalMin - 540); // workhour - 9:00
};

const calcRemarks = (clockIn: string, clockOut: string): string => {
    if (!clockOut) return '-'; // still active
    const totalMin = calcWorkhourMin(clockIn, clockOut);
    if (totalMin <= 0) return 'Anomaly';
    if (totalMin < 521) return 'Anomaly';     // below 8:41
    if (totalMin <= 570) return 'Normal';      // 8:41 – 9:30
    if (totalMin <= 720) return 'Overtime';    // 9:31 – 12:00
    return 'Anomaly';                          // above 12:00
};

interface AttRecord { id: number; date: string; nik: string; name: string; jobdesc: string; clock_in: string; clock_out: string; status: string; approval_status: string; approval_note: string; }
interface EmpRecord { nik: string; name: string; status: string; }

export default function AttendancePage() {
    const { user } = useAuth();
    const [data, setData] = useState<AttRecord[]>([]);
    const [employees, setEmployees] = useState<EmpRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [editRecord, setEditRecord] = useState<AttRecord | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [approvalRecord, setApprovalRecord] = useState<AttRecord | null>(null);
    const [approvalNote, setApprovalNote] = useState('');
    const [editForm] = Form.useForm();

    const canDelete = user?.role === 'admin' || user?.role === 'supervisor';
    const isSupervisor = user?.role === 'supervisor';

    const empMap: Record<string, EmpRecord> = {};
    employees.forEach(e => { if (e.nik) empMap[e.nik.toLowerCase()] = e; });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [attRes, empRes] = await Promise.all([attendancesApi.list(), employeesApi.list()]);
            const attData = (attRes.data || []) as AttRecord[];
            setData(attData);
            setEmployees((empRes.data || []) as EmpRecord[]);
        } catch { message.error('Gagal memuat data'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Edit / Delete
    const handleEdit = (r: AttRecord) => { setEditRecord(r); editForm.setFieldsValue(r); setEditModalOpen(true); };
    const handleSave = async () => {
        const vals = await editForm.validateFields();
        try { if (editRecord) { await attendancesApi.update(editRecord.id, vals); message.success('Data diupdate'); } setEditModalOpen(false); fetchData(); }
        catch { message.error('Gagal menyimpan'); }
    };
    const handleDelete = async (id: number) => {
        try { await attendancesApi.remove(id); message.success('Dihapus'); fetchData(); } catch { message.error('Gagal menghapus'); }
    };
    const handleBulkDelete = async () => {
        try { await attendancesApi.bulkDelete(selectedKeys); message.success(`${selectedKeys.length} data dihapus`); setSelectedKeys([]); fetchData(); } catch { message.error('Gagal menghapus'); }
    };

    // Approval
    const handleApproveClick = (r: AttRecord) => {
        setApprovalRecord(r);
        setApprovalNote(r.approval_note || '');
        setApprovalModalOpen(true);
    };
    const handleApprove = async () => {
        if (!approvalRecord) return;
        try {
            await attendancesApi.update(approvalRecord.id, {
                ...approvalRecord,
                approval_status: 'Approved',
                approval_note: approvalNote.trim(),
                updated_by: user?.username || '',
            });
            message.success('Anomaly di-approve');
            setApprovalModalOpen(false);
            fetchData();
        } catch { message.error('Gagal approve'); }
    };
    const handleUnapprove = async (r: AttRecord) => {
        try {
            await attendancesApi.update(r.id, {
                ...r,
                approval_status: '',
                approval_note: '',
                updated_by: user?.username || '',
            });
            message.success('Approval dicabut');
            fetchData();
        } catch { message.error('Gagal mencabut approval'); }
    };
    const handleReject = async (r: AttRecord) => {
        Modal.confirm({
            title: 'Reject Anomaly',
            content: `Reject anomaly untuk ${r.name} (${r.date})?`,
            okText: 'Reject',
            okType: 'danger',
            cancelText: 'Batal',
            onOk: async () => {
                try {
                    await attendancesApi.update(r.id, {
                        ...r,
                        approval_status: 'Rejected',
                        approval_note: '',
                        updated_by: user?.username || '',
                    });
                    message.success('Anomaly di-reject');
                    fetchData();
                } catch { message.error('Gagal reject'); }
            },
        });
    };

    const handleClearAll = () => {
        Modal.confirm({
            title: '⚠️ Clear All Data',
            content: `Apakah Anda yakin ingin menghapus SEMUA ${data.length} data Attendance? Tindakan ini tidak bisa dibatalkan!`,
            okText: 'Ya, Hapus Semua',
            okType: 'danger',
            cancelText: 'Batal',
            onOk: async () => {
                try {
                    await attendancesApi.sync([]);
                    message.success('Semua data Attendance berhasil dihapus');
                    setSelectedKeys([]);
                    fetchData();
                } catch { message.error('Gagal menghapus semua data'); }
            },
        });
    };

    // Export
    const handleExport = () => {
        const hdr = ['date', 'nik', 'name', 'status_employee', 'jobdesc', 'divisi', 'clock_in', 'clock_out', 'shift', 'workhour', 'overtime', 'remarks'];
        const rows = filteredData.map(r => {
            const totalMin = calcWorkhourMin(r.clock_in, r.clock_out);
            const emp = empMap[r.nik?.toLowerCase()];
            return [r.date, r.nik, r.name, emp?.status || '', r.jobdesc, divisiMap[r.jobdesc] || '', r.clock_in, r.clock_out,
            r.clock_in && parseInt(r.clock_in) < 12 ? 'Shift 1' : 'Shift 2', formatMinutes(totalMin), calcOvertime(totalMin), calcRemarks(r.clock_in, r.clock_out),
            ].map(v => `"${v || ''}"`).join(',');
        });
        const blob = new Blob([hdr.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'attendance.csv'; a.click();
    };

    // Import
    const parseCsvLine = (line: string): string[] => {
        const cells: string[] = []; let current = ''; let inQ = false;
        for (const ch of line) { if (ch === '"') { inQ = !inQ; continue; } if (ch === ',' && !inQ) { cells.push(current.trim()); current = ''; continue; } current += ch; }
        cells.push(current.trim()); return cells;
    };
    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) return;
            const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
            const rows = lines.slice(1).map(l => parseCsvLine(l));
            const normalizeTime = (v: string) => {
                if (!v) return v;
                const t = v.trim();
                if (/^\d{1,2}:\d{2}$/.test(t)) return t + ':00';        // HH:MM → HH:MM:00
                if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) return t;          // HH:MM:SS → keep
                return t;
            };
            const parsed = rows.map(cells => {
                const obj: Record<string, unknown> = {};
                headers.forEach((h, i) => { if (h !== 'id') obj[h] = cells[i] ?? ''; });
                if (obj.date) obj.date = normalizeDate(obj.date as string);
                if (obj.clock_in) obj.clock_in = normalizeTime(obj.clock_in as string);
                if (obj.clock_out) obj.clock_out = normalizeTime(obj.clock_out as string);
                return obj;
            }).filter(o => Object.values(o).some(v => v !== ''));
            if (!parsed.length) return;
            const CHUNK = 1000; let imported = 0;
            const hide = message.loading(`Importing... 0/${parsed.length}`, 0);
            try {
                for (let i = 0; i < parsed.length; i += CHUNK) {
                    await attendancesApi.batchImport(parsed.slice(i, i + CHUNK));
                    imported += Math.min(CHUNK, parsed.length - i); hide();
                    if (i + CHUNK < parsed.length) message.loading(`Importing... ${imported}/${parsed.length}`, 0);
                }
                message.success(`✅ ${imported} data diimport`); fetchData();
            } catch { hide(); message.error(`Gagal import`); if (imported > 0) fetchData(); }
        };
        reader.readAsText(file); return false;
    };

    const filteredData = data.filter(r => {
        if (dateRange) {
            const d = dayjs(r.date);
            if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false;
        }
        const s = search.toLowerCase();
        if (!s) return true;
        return Object.values(r).some(v => String(v).toLowerCase().includes(s))
            || (divisiMap[r.jobdesc] || '').toLowerCase().includes(s);
    }).sort((a, b) => b.id - a.id);

    const columns: any[] = [
        { title: 'Tanggal', dataIndex: 'date', key: 'date', width: 100, sorter: (a: any, b: any) => a.date?.localeCompare(b.date) },
        { title: 'NIK', dataIndex: 'nik', key: 'nik', width: 90 },
        { title: 'Name', dataIndex: 'name', key: 'name', width: 130, sorter: (a: any, b: any) => a.name?.localeCompare(b.name) },
        {
            title: 'Status', key: 'emp_status', width: 90,
            filters: [{ text: 'Reguler', value: 'Reguler' }, { text: 'Tambahan', value: 'Tambahan' }],
            onFilter: (value: any, r: AttRecord) => (empMap[r.nik?.toLowerCase()]?.status || '') === value,
            render: (_: any, r: AttRecord) => {
                const emp = empMap[r.nik?.toLowerCase()];
                const st = emp?.status || '-';
                return st === 'Reguler' ? <Tag color="blue">Reguler</Tag> : st === 'Tambahan' ? <Tag color="orange">Tambahan</Tag> : st;
            },
        },
        {
            title: 'Jobdesc', dataIndex: 'jobdesc', key: 'jobdesc', width: 130,
            filters: jobdescOptions.map(o => ({ text: o.label, value: o.value })),
            onFilter: (value: any, r: AttRecord) => r.jobdesc === value,
        },
        {
            title: 'Divisi', key: 'divisi', width: 100,
            filters: [{ text: 'Inbound', value: 'Inbound' }, { text: 'Inventory', value: 'Inventory' }, { text: 'Return', value: 'Return' }],
            onFilter: (value: any, r: AttRecord) => (divisiMap[r.jobdesc] || '') === value,
            render: (_: any, r: AttRecord) => {
                const d = divisiMap[r.jobdesc] || '-';
                const color = d === 'Inbound' ? 'blue' : d === 'Inventory' ? 'green' : d === 'Return' ? 'orange' : 'default';
                return <Tag color={color}>{d}</Tag>;
            },
        },
        { title: 'Clock In', dataIndex: 'clock_in', key: 'clock_in', width: 80 },
        { title: 'Clock Out', dataIndex: 'clock_out', key: 'clock_out', width: 85 },
        {
            title: 'Shift', key: 'shift', width: 75,
            render: (_: any, r: AttRecord) => {
                if (!r.clock_in) return '-';
                const hour = parseInt(r.clock_in.split(':')[0]);
                return hour < 12 ? <Tag color="cyan">Shift 1</Tag> : <Tag color="purple">Shift 2</Tag>;
            },
        },
        {
            title: 'Workhour', key: 'workhour', width: 85,
            sorter: (a: any, b: any) => calcWorkhourMin(a.clock_in, a.clock_out) - calcWorkhourMin(b.clock_in, b.clock_out),
            render: (_: any, r: AttRecord) => {
                const min = calcWorkhourMin(r.clock_in, r.clock_out);
                return min > 0 ? formatMinutes(min) : r.clock_out ? '0:00' : <Tag color="green">Active</Tag>;
            },
        },
        {
            title: 'Overtime', key: 'overtime', width: 85,
            render: (_: any, r: AttRecord) => {
                const min = calcWorkhourMin(r.clock_in, r.clock_out);
                if (!r.clock_out) return '-';
                const ot = calcOvertime(min);
                return ot !== '0:00' ? <Tag color="gold">{ot}</Tag> : '0:00';
            },
        },
        {
            title: 'Remarks', key: 'remarks', width: 100,
            filters: [
                { text: 'Normal', value: 'Normal' },
                { text: 'Overtime', value: 'Overtime' },
                { text: 'Anomaly', value: 'Anomaly' },
            ],
            onFilter: (value: any, r: AttRecord) => calcRemarks(r.clock_in, r.clock_out) === value,
            render: (_: any, r: AttRecord) => {
                const remark = calcRemarks(r.clock_in, r.clock_out);
                if (remark === '-') return <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>;
                const color = remark === 'Normal' ? 'green' : remark === 'Overtime' ? 'gold' : 'red';
                return <Tag color={color}>{remark}</Tag>;
            },
        },
        {
            title: 'Approval', key: 'approval', width: 170,
            filters: [
                { text: 'Approved', value: 'Approved' },
                { text: 'Rejected', value: 'Rejected' },
                { text: 'Pending', value: 'Pending' },
            ],
            onFilter: (value: any, r: AttRecord) => {
                if (value === 'Approved') return r.approval_status === 'Approved';
                if (value === 'Rejected') return r.approval_status === 'Rejected';
                return !r.approval_status;
            },
            render: (_: any, r: AttRecord) => {
                if (r.approval_status === 'Approved') {
                    return (
                        <Tooltip title={r.approval_note ? `Note: ${r.approval_note}` : 'Approved'}>
                            <Tag color="green" style={{ cursor: isSupervisor ? 'pointer' : 'default' }} onClick={isSupervisor ? () => handleApproveClick(r) : undefined}>
                                <CheckCircleOutlined /> Approved
                            </Tag>
                        </Tooltip>
                    );
                }
                if (r.approval_status === 'Rejected') {
                    return (
                        <Tooltip title="Rejected">
                            <Tag color="red" style={{ cursor: isSupervisor ? 'pointer' : 'default' }} onClick={isSupervisor ? () => handleApproveClick(r) : undefined}>
                                <CloseCircleOutlined /> Rejected
                            </Tag>
                        </Tooltip>
                    );
                }
                if (isSupervisor) {
                    return (
                        <Space size={4}>
                            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApproveClick(r)} style={{ fontSize: 11 }}>Approve</Button>
                            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReject(r)} style={{ fontSize: 11 }}>Reject</Button>
                        </Space>
                    );
                }
                return <Tag color="orange">Pending</Tag>;
            },
        },
        {
            title: 'Actions', key: 'actions', width: 90, fixed: 'right' as const,
            render: (_: any, r: AttRecord) => (
                <Space size="small">
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                    {canDelete && (
                        <Popconfirm title="Hapus?" onConfirm={() => handleDelete(r.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Attendance</h2>
                <Space wrap>
                    <DatePicker.RangePicker
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                        format="DD/MM/YYYY"
                        placeholder={['Dari Tanggal', 'Sampai Tanggal']}
                        allowClear
                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}
                    />
                    <Button size="small" onClick={() => { const now = dayjs(); setDateRange([now.startOf('month'), now.endOf('month')]); }}>Bulan Ini</Button>
                    <Button size="small" onClick={() => { const prev = dayjs().subtract(1, 'month'); setDateRange([prev.startOf('month'), prev.endOf('month')]); }}>Bulan Lalu</Button>
                    {dateRange && <Button size="small" danger onClick={() => setDateRange(null)}>Reset</Button>}
                    <Input placeholder="Search..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} allowClear />
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
                    <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport}><Button icon={<UploadOutlined />}>Import</Button></Upload>
                    <Button icon={<DownloadOutlined />} onClick={() => downloadCsvTemplate(['date', 'nik', 'name', 'jobdesc', 'clock_in', 'clock_out', 'status'], 'Attendance_template')}>Template</Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                    {canDelete && selectedKeys.length > 0 && (
                        <Popconfirm title={`Hapus ${selectedKeys.length} data?`} onConfirm={handleBulkDelete}>
                            <Button danger icon={<DeleteOutlined />}>Hapus ({selectedKeys.length})</Button>
                        </Popconfirm>
                    )}
                    {isSupervisor && data.length > 0 && (
                        <Button danger icon={<ClearOutlined />} onClick={handleClearAll}>Clear All</Button>
                    )}
                </Space>
            </div>

            <Table
                rowKey="id" columns={columns} dataSource={filteredData} loading={loading} size="small"
                scroll={{ x: 1300, y: 'calc(100vh - 280px)' }}
                pagination={{ pageSize: 50, showTotal: (t) => `Total: ${t}`, showSizeChanger: true }}
                rowSelection={canDelete ? { selectedRowKeys: selectedKeys, onChange: (keys) => setSelectedKeys(keys as number[]) } : undefined}
                sortDirections={['descend', 'ascend']}
            />

            <Modal title="Edit Attendance" open={editModalOpen} onOk={handleSave} onCancel={() => setEditModalOpen(false)}>
                <Form form={editForm} layout="vertical">
                    <Form.Item name="date" label="Date"><Input /></Form.Item>
                    <Form.Item name="nik" label="NIK"><Input /></Form.Item>
                    <Form.Item name="name" label="Name"><Input /></Form.Item>
                    <Form.Item name="jobdesc" label="Jobdesc"><Select options={jobdescOptions} /></Form.Item>
                    <Form.Item name="clock_in" label="Clock In"><Input /></Form.Item>
                    <Form.Item name="clock_out" label="Clock Out"><Input /></Form.Item>
                    <Form.Item name="status" label="Status"><Input /></Form.Item>
                </Form>
            </Modal>

            {/* Approval Modal */}
            <Modal
                title="Approve Anomaly"
                open={approvalModalOpen}
                onCancel={() => setApprovalModalOpen(false)}
                onOk={handleApprove}
                okText="Approve"
                cancelText="Batal"
            >
                <div style={{ marginBottom: 12 }}>
                    <strong>{approvalRecord?.name}</strong> — {approvalRecord?.date}
                    <br />
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Clock In: {approvalRecord?.clock_in} | Clock Out: {approvalRecord?.clock_out}
                    </span>
                </div>
                <Input.TextArea
                    placeholder="Approval note (opsional)..."
                    value={approvalNote}
                    onChange={e => setApprovalNote(e.target.value)}
                    rows={3}
                />
                {isSupervisor && approvalRecord?.approval_status === 'Approved' && (
                    <Button
                        danger
                        size="small"
                        style={{ marginTop: 12 }}
                        onClick={() => { handleUnapprove(approvalRecord); setApprovalModalOpen(false); }}
                    >
                        Cabut Approval
                    </Button>
                )}
            </Modal>
        </div>
    );
}
