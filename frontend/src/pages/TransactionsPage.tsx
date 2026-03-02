import { useCallback } from 'react';
import { Form, Input, InputNumber, Select, Tag } from 'antd';
import DataPage from '../components/DataPage';
import { transactionsApi, arrivalsApi } from '../api/client';
import { normalizeDateTime, normalizeDate } from '../utils/csvTemplate';

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
    {
        title: 'Item Type', dataIndex: '_item_type', key: '_item_type', width: 120,
        render: (v: string) => {
            if (!v || v === '-') return <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>;
            const color = v === 'Barang Jual' ? 'blue' : v === 'Gimmick' ? 'magenta' : v === 'ATK' ? 'orange' : 'default';
            return <Tag color={color}>{v}</Tag>;
        },
    },
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
        date: normalizeDate(get('date')), time_transaction: normalizeDateTime(get('time_transaction')), receipt_no: get('receipt_no'),
        sku: get('sku'), operate_type: get('operate_type').toLowerCase(), qty: parseInt(get('qty', '0')) || 0,
        operator: get('operator'),
    };
};

export default function TransactionsPage() {
    // Enrich each transaction with item_type from arrivals by receipt_no
    const enrichData = useCallback(async (items: any[]) => {
        try {
            const arrRes = await arrivalsApi.list();
            const arrivals = arrRes.data || [];
            // Build receipt_no → item_type map
            const map: Record<string, string> = {};
            arrivals.forEach((a: any) => {
                if (a.receipt_no) map[a.receipt_no] = a.item_type || '-';
            });
            return items.map((t: any) => ({
                ...t,
                _item_type: map[t.receipt_no] || '-',
            }));
        } catch {
            return items;
        }
    }, []);

    return <DataPage title="Inbound Transaction" api={transactionsApi} columns={columns} formFields={formFields} csvHeaders={csvHeaders} numberFields={numberFields} parseCSVRow={parseCSVRow} dateField="date" enrichData={enrichData} />;
}
