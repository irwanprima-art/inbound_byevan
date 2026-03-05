import { Form, Input, Tag, DatePicker, Select } from 'antd';
import DataPage from '../components/DataPage';
import { rejectReturnsApi } from '../api/client';
import { normalizeDate } from '../utils/csvTemplate';
import dayjs from 'dayjs';

const columns = [
    {
        title: 'Input Date', dataIndex: 'input_date', key: 'input_date', width: 110,
        sorter: (a: any, b: any) => (a.input_date || '').localeCompare(b.input_date || ''),
    },
    { title: 'Order Date', dataIndex: 'order_date', key: 'order_date', width: 110 },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
    { title: 'Platform', dataIndex: 'platform', key: 'platform', width: 110 },
    { title: 'Order ID', dataIndex: 'order_id', key: 'order_id', width: 160 },
    { title: 'Logistic', dataIndex: 'logistic', key: 'logistic', width: 110 },
    { title: 'AWB Num', dataIndex: 'awb_num', key: 'awb_num', width: 160 },
    { title: 'WH Note', dataIndex: 'wh_note', key: 'wh_note', width: 200 },
    { title: 'CS Name', dataIndex: 'cs_name', key: 'cs_name', width: 130 },
    {
        title: 'Status', dataIndex: 'status', key: 'status', width: 110,
        render: (v: string) => {
            if (!v) return '-';
            const color = v.toLowerCase().includes('done') || v.toLowerCase().includes('completed') ? 'green'
                : v.toLowerCase().includes('pending') ? 'orange'
                    : v.toLowerCase().includes('reject') || v.toLowerCase().includes('cancel') ? 'red'
                        : 'default';
            return <Tag color={color}>{v}</Tag>;
        },
        filters: [
            { text: 'Pending', value: 'Pending' },
            { text: 'Done', value: 'Done' },
            { text: 'Rejected', value: 'Rejected' },
            { text: 'Cancelled', value: 'Cancelled' },
        ],
        onFilter: (value: any, record: any) => (record.status || '') === value,
    },
];

const formFields = (
    <>
        <Form.Item name="input_date" label="Input Date">
            <DatePicker format="YYYY-MM-DD" placeholder="Pilih tanggal input" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="order_date" label="Order Date">
            <DatePicker format="YYYY-MM-DD" placeholder="Pilih tanggal order" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="brand" label="Brand"><Input /></Form.Item>
        <Form.Item name="platform" label="Platform"><Input /></Form.Item>
        <Form.Item name="order_id" label="Order ID" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="logistic" label="Logistic"><Input /></Form.Item>
        <Form.Item name="awb_num" label="AWB Num"><Input /></Form.Item>
        <Form.Item name="wh_note" label="WH Note"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="cs_name" label="CS Name"><Input /></Form.Item>
        <Form.Item name="status" label="Status" initialValue="Pending">
            <Select options={[
                { value: 'Pending', label: 'Pending' },
                { value: 'Done', label: 'Done' },
                { value: 'Rejected', label: 'Rejected' },
                { value: 'Cancelled', label: 'Cancelled' },
            ]} />
        </Form.Item>
    </>
);

const csvHeaders = ['input_date', 'order_date', 'brand', 'platform', 'order_id', 'logistic', 'awb_num', 'wh_note', 'cs_name', 'status'];

const parseCSVRow = (row: string[], headers?: string[]) => {
    const idx = (name: string) => headers ? headers.findIndex(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_') === name) : -1;
    const get = (name: string, fallback = '') => { const i = idx(name); return i >= 0 && row[i] ? row[i] : fallback; };
    return {
        input_date: normalizeDate(get('input_date')),
        order_date: normalizeDate(get('order_date')),
        brand: get('brand'),
        platform: get('platform'),
        order_id: get('order_id'),
        logistic: get('logistic'),
        awb_num: get('awb_num'),
        wh_note: get('wh_note'),
        cs_name: get('cs_name'),
        status: get('status', 'Pending'),
    };
};

const dateFields = ['input_date', 'order_date'];

export default function RejectReturnPage() {
    return <DataPage title="Reject Return" api={rejectReturnsApi} columns={columns} formFields={formFields} csvHeaders={csvHeaders} parseCSVRow={parseCSVRow} dateField="input_date" dateFields={dateFields} />;
}
