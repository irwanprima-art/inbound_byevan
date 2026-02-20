import 'react';
import { Form, Input, InputNumber, Select, Tag } from 'antd';
import DataPage from '../components/DataPage';
import { damagesApi } from '../api/client';

const damageNoteOptions = [
    { label: 'Internal Damage', value: 'Internal Damage' },
    { label: 'External Damage', value: 'External Damage' },
    { label: 'Expired', value: 'Expired' },
    { label: 'PEST', value: 'PEST' },
];

const damageNoteColors: Record<string, string> = {
    'Internal Damage': 'red',
    'External Damage': 'orange',
    'Expired': 'volcano',
    'PEST': 'magenta',
};

const columns = [
    { title: 'Tanggal', dataIndex: 'date', key: 'date', width: 110, sorter: (a: any, b: any) => a.date?.localeCompare(b.date) },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 180, ellipsis: true },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 70, sorter: (a: any, b: any) => a.qty - b.qty },
    {
        title: 'Damage Type', dataIndex: 'damage_note', key: 'damage_note', width: 140,
        render: (v: string) => v ? <Tag color={damageNoteColors[v] || 'default'}>{v}</Tag> : '-',
    },
    { title: 'Damage Reason', dataIndex: 'damage_reason', key: 'damage_reason', width: 160, ellipsis: true },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
    { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 100 },
];

const formFields = (
    <>
        <Form.Item name="date" label="Tanggal" rules={[{ required: true }]}><Input placeholder="M/D/YYYY" /></Form.Item>
        <Form.Item name="brand" label="Brand"><Input /></Form.Item>
        <Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="Description"><Input /></Form.Item>
        <Form.Item name="qty" label="Qty" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="damage_note" label="Damage Note" rules={[{ required: true }]}>
            <Select options={damageNoteOptions} placeholder="Pilih tipe damage" />
        </Form.Item>
        <Form.Item name="damage_reason" label="Damage Reason"><Input /></Form.Item>
        <Form.Item name="operator" label="Operator"><Input /></Form.Item>
        <Form.Item name="owner" label="Owner"><Input /></Form.Item>
    </>
);

const csvHeaders = ['date', 'brand', 'sku', 'description', 'qty', 'damage_note', 'damage_reason', 'operator', 'owner'];

const columnMap: Record<string, string> = {
    'tanggal': 'date',
    'Tanggal': 'date',
    'Damage Note': 'damage_note',
    'damage note': 'damage_note',
    'Damage Reason': 'damage_reason',
    'damage reason': 'damage_reason',
};

const numberFields = ['qty'];

export default function DamagePage() {
    return (
        <DataPage
            title="Project Damage"
            api={damagesApi}
            columns={columns}
            formFields={formFields}
            csvHeaders={csvHeaders}
            columnMap={columnMap}
            numberFields={numberFields}
            dateField="date"
        />
    );
}
