import React from 'react';
import { Form, Input, Select, Tag } from 'antd';
import DataPage from '../components/DataPage';
import { employeesApi } from '../api/client';

const columns = [
    { title: 'NIK', dataIndex: 'nik', key: 'nik', sorter: (a: any, b: any) => a.nik?.localeCompare(b.nik) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: any, b: any) => a.name?.localeCompare(b.name) },
    {
        title: 'Status', dataIndex: 'status', key: 'status',
        render: (v: string) => {
            if (v === 'Reguler') return <Tag color="blue">Reguler</Tag>;
            if (v === 'Tambahan') return <Tag color="orange">Tambahan</Tag>;
            return v || '-';
        },
    },
    {
        title: 'Keterangan', dataIndex: 'is_active', key: 'is_active',
        render: (v: string) => {
            if (v === 'Inactive') return <Tag color="red">Inactive</Tag>;
            return <Tag color="green">Active</Tag>;
        },
    },
];

const formFields = (
    <>
        <Form.Item name="nik" label="NIK" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={[
                { label: 'Reguler', value: 'Reguler' },
                { label: 'Tambahan', value: 'Tambahan' },
            ]} placeholder="Pilih status" />
        </Form.Item>
        <Form.Item name="is_active" label="Keterangan" initialValue="Active">
            <Select options={[
                { label: 'Active', value: 'Active' },
                { label: 'Inactive', value: 'Inactive' },
            ]} />
        </Form.Item>
    </>
);

const csvHeaders = ['nik', 'name', 'status', 'is_active'];

const columnMap: Record<string, string> = {};
const numberFields: string[] = [];

export default function EmployeesPage() {
    return (
        <DataPage
            title="Employees"
            api={employeesApi}
            columns={columns}
            formFields={formFields}
            csvHeaders={csvHeaders}
            columnMap={columnMap}
            numberFields={numberFields}
        />
    );
}
