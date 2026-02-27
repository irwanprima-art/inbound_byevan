import { useState, useEffect, useCallback } from 'react';
import { Form, Input, InputNumber, Table, Button, Modal, Space, Popconfirm, Upload, Tag, message } from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    UploadOutlined, DownloadOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../contexts/AuthContext';
import { masterItemsApi } from '../api/client';
import { downloadCsvTemplate } from '../utils/csvTemplate';

interface MasterItemRecord {
    id: number;
    sku: string;
    description: string;
    brand: string;
    sku_category: string;
    price: number;
}

export default function MasterItemPage() {
    const { user } = useAuth();
    const role = user?.role || '';
    const readOnly = role === 'admin_inbound';

    const [data, setData] = useState<MasterItemRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await masterItemsApi.list();
            setData(res.data || []);
        } catch { message.error('Failed to load data'); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = () => { setEditingId(null); form.resetFields(); setModalOpen(true); };
    const handleEdit = (r: MasterItemRecord) => { setEditingId(r.id); form.setFieldsValue(r); setModalOpen(true); };
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (editingId) {
                await masterItemsApi.update(editingId, values);
                message.success('Updated');
            } else {
                await masterItemsApi.create(values);
                message.success('Created');
            }
            setModalOpen(false);
            load();
        } catch { /* validation error */ }
    };
    const handleDelete = async (id: number) => {
        await masterItemsApi.remove(id);
        message.success('Deleted');
        load();
    };
    const handleBulkDelete = async () => {
        await masterItemsApi.bulkDelete(selectedKeys as number[]);
        message.success(`Deleted ${selectedKeys.length} items`);
        setSelectedKeys([]);
        load();
    };

    // CSV helpers
    const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
                else if (ch === '"') { inQuotes = false; }
                else { current += ch; }
            } else {
                if (ch === '"') { inQuotes = true; }
                else if (ch === ',') { result.push(current.trim()); current = ''; }
                else { current += ch; }
            }
        }
        result.push(current.trim());
        return result;
    };

    const normalizeHeader = (h: string): string =>
        h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    const HEADER_MAP: Record<string, string> = {
        sku: 'sku', description: 'description', brand: 'brand',
        sku_category: 'sku_category', category: 'sku_category',
        price: 'price',
    };

    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { message.warning('File is empty'); return; }

            const rawHeaders = parseCsvLine(lines[0]);
            const headers = rawHeaders.map(h => {
                const norm = normalizeHeader(h);
                return HEADER_MAP[norm] || norm;
            });

            const rows = lines.slice(1).map(line => {
                const vals = parseCsvLine(line);
                const obj: Record<string, unknown> = {};
                headers.forEach((h, i) => {
                    if (h === 'price') {
                        obj[h] = parseFloat(vals[i] || '0') || 0;
                    } else {
                        obj[h] = (vals[i] || '').trim();
                    }
                });
                return obj;
            }).filter(r => r.sku);

            if (rows.length === 0) { message.warning('No valid rows found'); return; }

            try {
                await masterItemsApi.batchImport(rows);
                message.success(`Imported ${rows.length} items`);
                load();
            } catch { message.error('Import failed'); }
        };
        reader.readAsText(file);
        return false;
    };

    const handleExport = () => {
        const bom = '\uFEFF';
        const headers = ['SKU', 'Description', 'Brand', 'SKU Category', 'Price'];
        const csvRows = [headers.join(',')];
        const filtered = getFilteredData();
        filtered.forEach(r => {
            csvRows.push([
                `"${(r.sku || '').replace(/"/g, '""')}"`,
                `"${(r.description || '').replace(/"/g, '""')}"`,
                `"${(r.brand || '').replace(/"/g, '""')}"`,
                `"${(r.sku_category || '').replace(/"/g, '""')}"`,
                r.price || 0,
            ].join(','));
        });
        const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `master_items_export.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getFilteredData = () => {
        if (!searchText) return data;
        const s = searchText.toLowerCase();
        return data.filter(r =>
            (r.sku || '').toLowerCase().includes(s) ||
            (r.description || '').toLowerCase().includes(s) ||
            (r.brand || '').toLowerCase().includes(s) ||
            (r.sku_category || '').toLowerCase().includes(s)
        );
    };

    const columns: ColumnsType<MasterItemRecord> = [
        {
            title: 'SKU', dataIndex: 'sku', key: 'sku', width: 160,
            sorter: (a, b) => (a.sku || '').localeCompare(b.sku || ''),
        },
        {
            title: 'Description', dataIndex: 'description', key: 'description', width: 300,
            sorter: (a, b) => (a.description || '').localeCompare(b.description || ''),
        },
        {
            title: 'Brand', dataIndex: 'brand', key: 'brand', width: 150,
            sorter: (a, b) => (a.brand || '').localeCompare(b.brand || ''),
            render: (v) => v ? <Tag color="blue">{v}</Tag> : '-',
        },
        {
            title: 'SKU Category', dataIndex: 'sku_category', key: 'sku_category', width: 160,
            sorter: (a, b) => (a.sku_category || '').localeCompare(b.sku_category || ''),
            render: (v) => v ? <Tag color="cyan">{v}</Tag> : '-',
        },
        {
            title: 'Price', dataIndex: 'price', key: 'price', width: 130, align: 'right',
            sorter: (a, b) => (a.price || 0) - (b.price || 0),
            render: (v: number) => v ? v.toLocaleString('id-ID', { minimumFractionDigits: 0 }) : '-',
        },
    ];

    if (!readOnly) {
        columns.push({
            title: 'Action', key: 'action', width: 120, fixed: 'right',
            render: (_: any, r: MasterItemRecord) => (
                <Space size="small">
                    <Button type="link" icon={<EditOutlined />} size="small" onClick={() => handleEdit(r)} />
                    <Popconfirm title="Delete?" onConfirm={() => handleDelete(r.id)}>
                        <Button type="link" danger icon={<DeleteOutlined />} size="small" />
                    </Popconfirm>
                </Space>
            ),
        });
    }

    const filteredData = getFilteredData();

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Space wrap>
                    {!readOnly && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Item</Button>
                    )}
                    {!readOnly && selectedKeys.length > 0 && (
                        <Popconfirm title={`Delete ${selectedKeys.length} items?`} onConfirm={handleBulkDelete}>
                            <Button danger icon={<DeleteOutlined />}>Delete Selected ({selectedKeys.length})</Button>
                        </Popconfirm>
                    )}
                </Space>
                <Space wrap>
                    <Input.Search
                        placeholder="Search SKU, Description, Brand..."
                        allowClear
                        style={{ width: 280 }}
                        onSearch={setSearchText}
                        onChange={e => !e.target.value && setSearchText('')}
                    />
                    <Button icon={<DownloadOutlined />} onClick={() => downloadCsvTemplate(
                        ['SKU', 'Description', 'Brand', 'SKU Category', 'Price'],
                        'master_items_template.csv'
                    )}>Template</Button>
                    {!readOnly && (
                        <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport}>
                            <Button icon={<UploadOutlined />}>Import CSV</Button>
                        </Upload>
                    )}
                    <Button icon={<FileExcelOutlined />} onClick={handleExport}>Export</Button>
                </Space>
            </div>

            <Table
                dataSource={filteredData}
                columns={columns}
                rowKey="id"
                size="small"
                loading={loading}
                scroll={{ x: 'max-content' }}
                pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} items`, defaultPageSize: 50 }}
                rowSelection={readOnly ? undefined : {
                    selectedRowKeys: selectedKeys,
                    onChange: (keys) => setSelectedKeys(keys),
                }}
            />

            <Modal
                title={editingId ? 'Edit Master Item' : 'Add Master Item'}
                open={modalOpen}
                onOk={handleSave}
                onCancel={() => setModalOpen(false)}
                width={520}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="sku" label="SKU" rules={[{ required: true, message: 'SKU is required' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input />
                    </Form.Item>
                    <Form.Item name="brand" label="Brand">
                        <Input />
                    </Form.Item>
                    <Form.Item name="sku_category" label="SKU Category">
                        <Input />
                    </Form.Item>
                    <Form.Item name="price" label="Price">
                        <InputNumber style={{ width: '100%' }} min={0} precision={0} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
