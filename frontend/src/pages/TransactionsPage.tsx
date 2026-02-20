import 'react';
import { Form, Input, InputNumber, Select, Tag } from 'antd';
import DataPage from '../components/DataPage';
import { transactionsApi } from '../api/client';

const columns = [
    {
        title: 'Tanggal Transaksi', dataIndex: 'date', key: 'date', width: 130,
        sorter: (a: any, b: any) => a.date?.localeCompare(b.date),
    },
    { title: 'Waktu Transaksi', dataIndex: 'time_transaction', key: 'time_transaction', width: 180 },
    { title: 'Receipt No', dataIndex: 'receipt_no', key: 'receipt_no', width: 140 },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 140 },
    {
        title: 'Operate Type', dataIndex: 'operate_type', key: 'operate_type', width: 130,
        render: (v: string) => {
            const color = v?.toLowerCase() === 'receive' ? 'blue' : v?.toLowerCase() === 'putaway' ? 'purple' : 'default';
            return <Tag color={color}>{v}</Tag>;
        },
    },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 90, sorter: (a: any, b: any) => a.qty - b.qty },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 130 },
];

const formFields = (
    <>
        <Form.Item name="date" label="Tanggal Transaksi" rules={[{ required: true }]}>
            <Input placeholder="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="time_transaction" label="Waktu Transaksi">
            <Input placeholder="YYYY-MM-DD HH:mm:ss" />
        </Form.Item>
        <Form.Item name="receipt_no" label="Receipt No" rules={[{ required: true }]}>
            <Input />
        </Form.Item>
        <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
            <Input />
        </Form.Item>
        <Form.Item name="operate_type" label="Operate Type" rules={[{ required: true }]}>
            <Select options={[
                { value: 'receive', label: 'Receive' },
                { value: 'putaway', label: 'Putaway' },
            ]} placeholder="Pilih tipe operasi" />
        </Form.Item>
        <Form.Item name="qty" label="Qty" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
        </Form.Item>
        <Form.Item name="operator" label="Operator" rules={[{ required: true }]}>
            <Input />
        </Form.Item>
    </>
);

const csvHeaders = ['date', 'time_transaction', 'receipt_no', 'sku', 'operate_type', 'qty', 'operator'];
const numberFields = ['qty'];

// Header-based CSV row parser that normalizes operate_type to lowercase
const parseCSVRow = (row: string[], headers?: string[]) => {
    const idx = (name: string) => headers ? headers.findIndex(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_') === name) : -1;
    const get = (name: string, fallback = '') => { const i = idx(name); return i >= 0 && row[i] ? row[i] : fallback; };
    return {
        date: get('date'), time_transaction: get('time_transaction'), receipt_no: get('receipt_no'),
        sku: get('sku'), operate_type: get('operate_type').toLowerCase(), qty: parseInt(get('qty', '0')) || 0,
        operator: get('operator'),
    };
};

export default function TransactionsPage() {
    return <DataPage title="Inbound Transaction" api={transactionsApi} columns={columns} formFields={formFields} csvHeaders={csvHeaders} numberFields={numberFields} parseCSVRow={parseCSVRow} />;
}
