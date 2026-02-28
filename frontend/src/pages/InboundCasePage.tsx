import DataPage from '../components/DataPage';
import { inboundCasesApi } from '../api/client';
import { Form, Input, InputNumber, Select } from 'antd';

const CASE_OPTIONS = [
    { label: 'Karton Rusak', value: 'Karton Rusak' },
    { label: 'Basah', value: 'Basah' },
    { label: 'Terbuka', value: 'Terbuka' },
    { label: 'Hilang', value: 'Hilang' },
    { label: 'Salah Kirim', value: 'Salah Kirim' },
    { label: 'Lainnya', value: 'Lainnya' },
];

const columns = [
    { title: 'Tanggal', dataIndex: 'date', key: 'date', width: 110, sorter: (a: any, b: any) => a.date?.localeCompare(b.date) },
    { title: 'Receipt No', dataIndex: 'receipt_no', key: 'receipt_no', width: 140 },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
    { title: 'Case', dataIndex: 'case', key: 'case', width: 130 },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 70 },
    { title: 'Keterangan', dataIndex: 'keterangan', key: 'keterangan', width: 200, ellipsis: true },
];

const csvHeaders = ['date', 'receipt_no', 'brand', 'case', 'operator', 'qty', 'keterangan'];

const formFields = (
    <>
        <Form.Item name="date" label="Tanggal Inbound" rules={[{ required: true }]}>
            <Input placeholder="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="receipt_no" label="Receipt No">
            <Input />
        </Form.Item>
        <Form.Item name="brand" label="Brand">
            <Input />
        </Form.Item>
        <Form.Item name="case" label="Case">
            <Select options={CASE_OPTIONS} placeholder="Pilih jenis case" allowClear />
        </Form.Item>
        <Form.Item name="operator" label="Operator">
            <Input />
        </Form.Item>
        <Form.Item name="qty" label="Qty">
            <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="keterangan" label="Keterangan">
            <Input.TextArea rows={2} />
        </Form.Item>
    </>
);

export default function InboundCasePage() {
    return (
        <DataPage
            title="Case Inbound"
            api={inboundCasesApi}
            columns={columns}
            formFields={formFields}
            csvHeaders={csvHeaders}
            dateField="date"
            columnMap={{
                date: 'date',
                receipt_no: 'receipt_no',
                brand: 'brand',
                case: 'case',
                operator: 'operator',
                qty: 'qty',
                keterangan: 'keterangan',
            }}
            numberFields={['qty']}
        />
    );
}
