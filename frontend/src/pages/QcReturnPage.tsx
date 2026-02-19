import 'react';
import { Form, Input, InputNumber, Select, Tag } from 'antd';
import DataPage from '../components/DataPage';
import { qcReturnsApi } from '../api/client';

const statusOptions = [
    { label: 'Good', value: 'Good' },
    { label: 'Damage', value: 'Damage' },
];

const columns = [
    { title: 'QC Date', dataIndex: 'qc_date', key: 'qc_date', width: 110, sorter: (a: any, b: any) => a.qc_date?.localeCompare(b.qc_date) },
    { title: 'Receipt#', dataIndex: 'receipt', key: 'receipt', width: 130 },
    { title: 'Return Date', dataIndex: 'return_date', key: 'return_date', width: 110, sorter: (a: any, b: any) => a.return_date?.localeCompare(b.return_date) },
    { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 100 },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 70, sorter: (a: any, b: any) => a.qty - b.qty },
    { title: 'From Loc', dataIndex: 'from_loc', key: 'from_loc', width: 100 },
    { title: 'To Loc', dataIndex: 'to_loc', key: 'to_loc', width: 100 },
    {
        title: 'Status', dataIndex: 'status', key: 'status', width: 100,
        render: (v: string) => v ? <Tag color={v === 'Good' ? 'green' : 'red'}>{v}</Tag> : '-',
    },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
];

const formFields = (
    <>
        <Form.Item name="qc_date" label="QC Date" rules={[{ required: true }]}><Input placeholder="M/D/YYYY" /></Form.Item>
        <Form.Item name="receipt" label="Receipt#"><Input /></Form.Item>
        <Form.Item name="return_date" label="Return Date"><Input placeholder="M/D/YYYY" /></Form.Item>
        <Form.Item name="owner" label="Owner"><Input /></Form.Item>
        <Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="qty" label="Qty" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="from_loc" label="From Loc"><Input /></Form.Item>
        <Form.Item name="to_loc" label="To Loc"><Input /></Form.Item>
        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={statusOptions} placeholder="Pilih status" />
        </Form.Item>
        <Form.Item name="operator" label="Operator"><Input /></Form.Item>
    </>
);

const csvHeaders = ['qc_date', 'receipt', 'return_date', 'owner', 'sku', 'qty', 'from_loc', 'to_loc', 'status', 'operator'];

const columnMap: Record<string, string> = {
    'QC Date': 'qc_date',
    'qc date': 'qc_date',
    'Receipt#': 'receipt',
    'receipt': 'receipt',
    'Return Date': 'return_date',
    'return date': 'return_date',
    'From Loc': 'from_loc',
    'from loc': 'from_loc',
    'To Loc': 'to_loc',
    'to loc': 'to_loc',
};

const numberFields = ['qty'];

export default function QcReturnPage() {
    return (
        <DataPage
            title="QC Return"
            api={qcReturnsApi}
            columns={columns}
            formFields={formFields}
            csvHeaders={csvHeaders}
            columnMap={columnMap}
            numberFields={numberFields}
        />
    );
}
