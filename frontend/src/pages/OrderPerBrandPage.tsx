import { Form, Input, InputNumber } from 'antd';
import DataPage from '../components/DataPage';
import { orderPerBrandsApi } from '../api/client';

const columns = [
    {
        title: 'Bulan', dataIndex: 'month', key: 'month', width: 120,
        sorter: (a: any, b: any) => (a.month || '').localeCompare(b.month || ''),
    },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 130 },
    {
        title: 'Order', dataIndex: 'order_count', key: 'order_count', width: 100,
        sorter: (a: any, b: any) => a.order_count - b.order_count,
        render: (v: number) => (v || 0).toLocaleString(),
    },
    {
        title: 'Qty', dataIndex: 'qty', key: 'qty', width: 100,
        sorter: (a: any, b: any) => a.qty - b.qty,
        render: (v: number) => (v || 0).toLocaleString(),
    },
];

const formFields = (
    <>
        <Form.Item name="month" label="Bulan" rules={[{ required: true }]}>
            <Input placeholder="contoh: Januari 2026" />
        </Form.Item>
        <Form.Item name="brand" label="Brand" rules={[{ required: true }]}>
            <Input />
        </Form.Item>
        <Form.Item name="order_count" label="Order" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="qty" label="Qty" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
    </>
);

const csvHeaders = ['month', 'brand', 'order_count', 'qty'];
const numberFields = ['order_count', 'qty'];

const parseCSVRow = (row: string[], headers?: string[]) => {
    const idx = (name: string) => headers ? headers.findIndex(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_') === name) : -1;
    const get = (name: string, fallback = '') => { const i = idx(name); return i >= 0 && row[i] ? row[i] : fallback; };
    return {
        month: get('month'),
        brand: get('brand'),
        order_count: parseInt(get('order_count', '0')) || 0,
        qty: parseInt(get('qty', '0')) || 0,
    };
};

export default function OrderPerBrandPage() {
    return <DataPage title="Order per Brand" api={orderPerBrandsApi} columns={columns} formFields={formFields} csvHeaders={csvHeaders} numberFields={numberFields} parseCSVRow={parseCSVRow} />;
}
