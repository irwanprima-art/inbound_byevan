import { useState } from 'react';
import { Form, Input, DatePicker, Tag, Button, Popconfirm, message } from 'antd';
import { CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import DataPage from '../components/DataPage';
import { inventoryProjectsApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

interface InventoryProject {
    id: number;
    start_date: string;
    project_name: string;
    task: string;
    target_date: string;
    status: string;
    updated_by?: string;
    created_at?: string;
    updated_at?: string;
}

const CAN_EDIT_ROLES = ['supervisor', 'leader'];

// Compute SLA: days remaining from today to target_date
function calcSla(targetDate: string, status: string): { text: string; color: string } {
    if (status === 'Closed') return { text: 'Closed', color: '#6b7280' };
    if (!targetDate) return { text: '-', color: '' };
    const today = dayjs().startOf('day');
    const target = dayjs(targetDate).startOf('day');
    const diff = target.diff(today, 'day');
    if (diff > 7) return { text: `${diff} hari`, color: '#22c55e' };
    if (diff > 0) return { text: `${diff} hari`, color: '#f97316' };
    if (diff === 0) return { text: 'Hari ini', color: '#ef4444' };
    return { text: `Overdue ${Math.abs(diff)} hari`, color: '#dc2626' };
}

const baseColumns = [
    {
        title: 'Tanggal Mulai',
        dataIndex: 'start_date',
        key: 'start_date',
        width: 130,
        sorter: (a: InventoryProject, b: InventoryProject) => (a.start_date || '').localeCompare(b.start_date || ''),
    },
    {
        title: 'Nama Project',
        dataIndex: 'project_name',
        key: 'project_name',
        width: 220,
        sorter: (a: InventoryProject, b: InventoryProject) => (a.project_name || '').localeCompare(b.project_name || ''),
    },
    {
        title: 'Task',
        dataIndex: 'task',
        key: 'task',
        width: 300,
        render: (v: string) => <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</div>,
    },
    {
        title: 'Target Selesai',
        dataIndex: 'target_date',
        key: 'target_date',
        width: 130,
        sorter: (a: InventoryProject, b: InventoryProject) => (a.target_date || '').localeCompare(b.target_date || ''),
    },
    {
        title: 'SLA',
        key: 'sla',
        width: 140,
        render: (_: any, r: InventoryProject) => {
            const sla = calcSla(r.target_date, r.status);
            if (!sla.color) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>;
            return <Tag style={{ background: sla.color, color: '#fff', border: 'none', fontWeight: 600 }}>{sla.text}</Tag>;
        },
        sorter: (a: InventoryProject, b: InventoryProject) => {
            const da = a.target_date ? dayjs(a.target_date).diff(dayjs(), 'day') : 9999;
            const db = b.target_date ? dayjs(b.target_date).diff(dayjs(), 'day') : 9999;
            return da - db;
        },
    },
    {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (v: string) => {
            if (v === 'Closed') return <Tag color="green" style={{ fontWeight: 600 }}>✅ Closed</Tag>;
            return <Tag color="blue" style={{ fontWeight: 600 }}>🔵 Open</Tag>;
        },
        filters: [
            { text: 'Open', value: 'Open' },
            { text: 'Closed', value: 'Closed' },
        ],
        onFilter: (value: any, record: InventoryProject) => (record.status || 'Open') === value,
    },
];

const formFields = (
    <>
        <Form.Item
            name="start_date"
            label="Tanggal Mulai"
            rules={[{ required: true }]}
            getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
            normalize={(value) => value ? dayjs(value).format('YYYY-MM-DD') : ''}
        >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="project_name" label="Nama Project" rules={[{ required: true }]}>
            <Input placeholder="Nama Project" />
        </Form.Item>
        <Form.Item name="task" label="Task">
            <Input.TextArea rows={3} placeholder="Deskripsi Task" />
        </Form.Item>
        <Form.Item
            name="target_date"
            label="Target Selesai"
            getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
            normalize={(value) => value ? dayjs(value).format('YYYY-MM-DD') : ''}
        >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
    </>
);

const csvHeaders = ['start_date', 'project_name', 'task', 'target_date', 'status'];

const columnMap: Record<string, string> = {
    'Tanggal Mulai': 'start_date',
    'Nama Project': 'project_name',
    'Task': 'task',
    'Target Selesai': 'target_date',
    'Status': 'status',
};

export default function InventoryProjectPage() {
    const { user } = useAuth();
    const canEdit = CAN_EDIT_ROLES.includes(user?.role || '');
    const [refreshKey, setRefreshKey] = useState(0);

    const handleToggleStatus = async (record: InventoryProject) => {
        const newStatus = record.status === 'Closed' ? 'Open' : 'Closed';
        try {
            await inventoryProjectsApi.update(record.id, { ...record, status: newStatus });
            message.success(`Project ${newStatus === 'Closed' ? 'ditutup' : 'dibuka kembali'}`);
            setRefreshKey(k => k + 1);
        } catch {
            message.error('Gagal mengubah status');
        }
    };

    // Only add Close/Reopen action column if user can edit
    const allColumns = canEdit
        ? [
            ...baseColumns,
            {
                title: '',
                key: 'close_action',
                width: 110,
                render: (_: any, record: InventoryProject) => {
                    if (record.status === 'Closed') {
                        return (
                            <Popconfirm title="Buka kembali project ini?" onConfirm={() => handleToggleStatus(record)}>
                                <Button size="small" icon={<ReloadOutlined />} style={{ fontSize: 12 }}>Reopen</Button>
                            </Popconfirm>
                        );
                    }
                    return (
                        <Popconfirm title="Tandai project ini sebagai selesai?" onConfirm={() => handleToggleStatus(record)}>
                            <Button size="small" type="primary" icon={<CheckCircleOutlined />} style={{ background: '#22c55e', borderColor: '#22c55e', fontSize: 12 }}>
                                Close
                            </Button>
                        </Popconfirm>
                    );
                },
            },
        ]
        : baseColumns;

    return (
        <DataPage<InventoryProject>
            key={refreshKey}
            title="Inventory Project"
            api={inventoryProjectsApi}
            columns={allColumns}
            formFields={formFields}
            csvHeaders={csvHeaders}
            columnMap={columnMap}
            dateField="start_date"
            computeSearchText={(r) => `${r.project_name} ${r.task}`}
            hideEdit={!canEdit}
        />
    );
}
