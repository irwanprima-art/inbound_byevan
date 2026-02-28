import { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message, Popconfirm,
    Tag, DatePicker, InputNumber, Upload,
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, EditOutlined, ReloadOutlined,
    SearchOutlined, DownloadOutlined, UploadOutlined,
} from '@ant-design/icons';
import { inboundRejectionsApi, beritaAcaraApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

export default function InboundRejectionPage() {
    useAuth();

    const [data, setData] = useState<any[]>([]);
    const [baData, setBaData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
    const [form] = Form.useForm();

    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [rRes, baRes] = await Promise.all([
                inboundRejectionsApi.list(),
                beritaAcaraApi.list(),
            ]);
            setData(rRes.data || []);
            setBaData(baRes.data || []);
        } catch {
            if (!silent) message.error('Gagal memuat data');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => {
        const iv = setInterval(() => { fetchAll(true); }, 60000);
        return () => clearInterval(iv);
    }, [fetchAll]);

    // Build rows: auto-sync from BA "Penolakan barang" + manual entries
    const allRows = useMemo(() => {
        // BA-sourced rows (read-only, source = 'ba')
        const baRows: any[] = [];
        baData
            .filter((ba: any) => (ba.doc_type || '').toLowerCase().includes('penolakan'))
            .forEach((ba: any) => {
                // Parse items JSON array
                let items: any[] = [];
                try { items = JSON.parse(ba.items || '[]'); } catch { items = []; }
                items.forEach((item: any, idx: number) => {
                    baRows.push({
                        id: `ba-${ba.id}-${idx}`,
                        _baSource: true,
                        date: ba.date,
                        brand: ba.kepada || '',
                        sku: item.sku || item.SKU || '',
                        serial_number: item.serial_number || item.serialNumber || '',
                        catatan: item.catatan || item.note || ba.notes || '',
                        qty: item.qty || item.Qty || 1,
                        source_doc_no: ba.doc_number,
                    });
                });
            });
        // Manual entries (editable)
        const manualRows = data.map((r: any) => ({ ...r, _baSource: false }));
        return [...baRows, ...manualRows];
    }, [data, baData]);

    const filteredRows = useMemo(() => {
        const q = search.toLowerCase();
        return allRows.filter(r =>
            !q || [r.date, r.brand, r.sku, r.serial_number, r.catatan, r.source_doc_no]
                .some(v => (v || '').toLowerCase().includes(q))
        );
    }, [allRows, search]);

    const handleAdd = () => {
        setEditId(null);
        form.resetFields();
        form.setFieldsValue({ date: dayjs(), qty: 1 });
        setModalOpen(true);
    };

    const handleEdit = (record: any) => {
        setEditId(record.id);
        form.setFieldsValue({
            ...record,
            date: record.date ? dayjs(record.date) : null,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const vals = await form.validateFields();
            if (vals.date && typeof vals.date === 'object' && vals.date.format) {
                vals.date = vals.date.format('YYYY-MM-DD');
            }
            if (editId) {
                await inboundRejectionsApi.update(editId, vals);
                message.success('Data diupdate');
            } else {
                await inboundRejectionsApi.create(vals);
                message.success('Data ditambahkan');
            }
            setModalOpen(false);
            fetchAll();
        } catch (err: any) {
            if (err.response) message.error('Error: ' + (err.response?.data?.error || 'Unknown'));
        }
    };

    const handleDelete = async (id: number) => {
        await inboundRejectionsApi.remove(id);
        message.success('Dihapus');
        fetchAll();
    };

    const handleBulkDelete = async () => {
        const numericIds = (selectedKeys as number[]).filter(k => typeof k === 'number');
        await inboundRejectionsApi.bulkDelete(numericIds);
        setSelectedKeys([]);
        fetchAll();
    };

    // CSV Export
    const handleExport = () => {
        const headers = ['date', 'brand', 'sku', 'serial_number', 'catatan', 'qty', 'source_doc_no'];
        const csv = '\uFEFF' + headers.join(',') + '\n' +
            filteredRows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `tolakan_inbound_${dayjs().format('YYYY-MM-DD')}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    // CSV Import
    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) return;
            const hdrs = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
            const get = (cols: string[], name: string) => {
                const idx = hdrs.indexOf(name);
                return idx >= 0 && cols[idx] ? cols[idx] : '';
            };
            const rows = lines.slice(1).map(line => {
                const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
                return {
                    date: get(cols, 'date') || dayjs().format('YYYY-MM-DD'),
                    brand: get(cols, 'brand'),
                    sku: get(cols, 'sku'),
                    serial_number: get(cols, 'serial_number'),
                    catatan: get(cols, 'catatan'),
                    qty: parseInt(get(cols, 'qty') || '1') || 1,
                    source_doc_no: get(cols, 'source_doc_no'),
                };
            }).filter(r => r.brand || r.sku);
            if (rows.length === 0) { message.warning('Tidak ada data valid'); return; }
            try {
                await inboundRejectionsApi.batchImport(rows);
                message.success(`${rows.length} data imported`);
                fetchAll();
            } catch { message.error('Import gagal'); }
        };
        reader.readAsText(file);
        return false;
    };

    const columns = [
        { title: 'Tanggal', dataIndex: 'date', key: 'date', width: 110, sorter: (a: any, b: any) => (a.date || '').localeCompare(b.date || '') },
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 110 },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 160 },
        { title: 'Serial Number', dataIndex: 'serial_number', key: 'serial_number', width: 160 },
        { title: 'Catatan', dataIndex: 'catatan', key: 'catatan', width: 200, ellipsis: true },
        { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 70, render: (v: number) => <span style={{ color: '#f87171', fontWeight: 600 }}>{v}</span> },
        {
            title: 'Sumber', dataIndex: 'source_doc_no', key: 'source_doc_no', width: 130,
            render: (v: string, r: any) => r._baSource
                ? <Tag color="orange">BA&nbsp;{v}</Tag>
                : (v ? <Tag color="default">{v}</Tag> : null)
        },
        {
            title: 'Actions', key: 'actions', width: 90, fixed: 'right' as const,
            render: (_: any, record: any) => record._baSource ? (
                <Tag color="blue" style={{ fontSize: 10 }}>Auto</Tag>
            ) : (
                <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm title="Hapus?" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Tambah</Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                    <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport as any}>
                        <Button icon={<UploadOutlined />}>Import</Button>
                    </Upload>
                    <Button icon={<ReloadOutlined />} onClick={() => fetchAll()}>Refresh</Button>
                </Space>
                <Input
                    placeholder="Cari tanggal, brand, SKU..."
                    prefix={<SearchOutlined />} value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: 260 }} allowClear
                />
            </div>

            {selectedKeys.length > 0 && (
                <Popconfirm title={`Hapus ${selectedKeys.length} data?`} onConfirm={handleBulkDelete}>
                    <Button danger style={{ marginBottom: 12 }}>
                        <DeleteOutlined /> Hapus {selectedKeys.length} data
                    </Button>
                </Popconfirm>
            )}

            <Table
                dataSource={filteredRows}
                columns={columns}
                rowKey="id"
                loading={loading}
                size="small"
                scroll={{ x: 1200, y: 'calc(100vh - 280px)' }}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `Total ${t} data` }}
                rowSelection={{
                    selectedRowKeys: selectedKeys,
                    onChange: setSelectedKeys,
                    getCheckboxProps: (r: any) => ({ disabled: r._baSource }),
                }}
            />

            <Modal
                title={editId ? 'Edit Tolakan Inbound' : 'Tambah Tolakan Inbound'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                width={480}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="date" label="Tanggal" rules={[{ required: true }]}>
                        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="brand" label="Brand">
                        <Input />
                    </Form.Item>
                    <Form.Item name="sku" label="SKU">
                        <Input />
                    </Form.Item>
                    <Form.Item name="serial_number" label="Serial Number">
                        <Input />
                    </Form.Item>
                    <Form.Item name="catatan" label="Catatan">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="qty" label="Qty">
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name="source_doc_no" label="No. Berita Acara (opsional)">
                        <Input placeholder="Misal: BA/2024/001" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
