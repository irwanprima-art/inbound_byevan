import 'react';
import { Form, Input } from 'antd';
import DataPage from '../components/DataPage';
import { inventoryProjectsApi } from '../api/client';

interface InventoryProject {
    id: number;
    start_date: string;
    project_name: string;
    task: string;
    target_date: string;
    updated_by?: string;
    created_at?: string;
    updated_at?: string;
}

const columns = [
    {
        title: 'Tanggal Mulai',
        dataIndex: 'start_date',
        key: 'start_date',
        width: 140,
        sorter: (a: InventoryProject, b: InventoryProject) => (a.start_date || '').localeCompare(b.start_date || ''),
    },
    {
        title: 'Nama Project',
        dataIndex: 'project_name',
        key: 'project_name',
        width: 250,
        sorter: (a: InventoryProject, b: InventoryProject) => (a.project_name || '').localeCompare(b.project_name || ''),
    },
    {
        title: 'Task',
        dataIndex: 'task',
        key: 'task',
        width: 350,
        ellipsis: true,
    },
    {
        title: 'Target Selesai',
        dataIndex: 'target_date',
        key: 'target_date',
        width: 140,
        sorter: (a: InventoryProject, b: InventoryProject) => (a.target_date || '').localeCompare(b.target_date || ''),
    },
];

const formFields = (
    <>
        <Form.Item name="start_date" label="Tanggal Mulai" rules={[{ required: true }]}>
            <Input placeholder="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="project_name" label="Nama Project" rules={[{ required: true }]}>
            <Input placeholder="Nama Project" />
        </Form.Item>
        <Form.Item name="task" label="Task">
            <Input.TextArea rows={3} placeholder="Deskripsi Task" />
        </Form.Item>
        <Form.Item name="target_date" label="Target Selesai">
            <Input placeholder="YYYY-MM-DD" />
        </Form.Item>
    </>
);

const csvHeaders = ['start_date', 'project_name', 'task', 'target_date'];

const columnMap: Record<string, string> = {
    'Tanggal Mulai': 'start_date',
    'Nama Project': 'project_name',
    'Task': 'task',
    'Target Selesai': 'target_date',
};

export default function InventoryProjectPage() {
    return (
        <DataPage<InventoryProject>
            title="Inventory Project"
            api={inventoryProjectsApi}
            columns={columns}
            formFields={formFields}
            csvHeaders={csvHeaders}
            columnMap={columnMap}
            dateField="start_date"
            computeSearchText={(r) => `${r.project_name} ${r.task}`}
        />
    );
}
