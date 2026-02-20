import { useState, useEffect, useCallback } from 'react';
import {
    Table, Button, Input, InputNumber, Select, Space, Form, Modal,
    Popconfirm, Upload, message, DatePicker,
} from 'antd';
import {
    EditOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined,
    DownloadOutlined, UploadOutlined, PlusOutlined,
} from '@ant-design/icons';
import { unloadingsApi } from '../api/client';
import dayjs from 'dayjs';

const VEHICLE_OPTIONS = [
    'Blind Van', 'CDD', 'CDE', 'Fuso',
    'Container 20ft', 'Container 40ft', 'Wingbox',
].map(v => ({ label: v, value: v }));

interface UnloadingRecord {
    id: number;
    date: string;
    brand: string;
    vehicle_type: string;
    total_vehicles: number;
}

export default function UnloadingPage() {
    const [data, setData] = useState<UnloadingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<number[]>([]);

    // Add modal
    const [addOpen, setAddOpen] = useState(false);
    const [addForm] = Form.useForm();

    // Edit modal
    const [editOpen, setEditOpen] = useState(false);
    const [editRecord, setEditRecord] = useState<UnloadingRecord | null>(null);
    const [editForm] = Form.useForm();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await unloadingsApi.list();
            setData((res.data || []) as UnloadingRecord[]);
        } catch {
            message.error('Gagal memuat data');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Add
    const handleAdd = async () => {
        try {
            const vals = await addForm.validateFields();
            const payload = {
                ...vals,
                date: vals.date ? vals.date.format('YYYY-MM-DD') : '',
            };
            await unloadingsApi.create(payload);
            message.success('Data ditambahkan');
            setAddOpen(false);
            addForm.resetFields();
            fetchData();
        } catch {
            message.error('Gagal menambahkan');
        }
    };

    // Edit
    const handleEdit = (r: UnloadingRecord) => {
        setEditRecord(r);
        editForm.setFieldsValue({
            ...r,
            date: r.date ? dayjs(r.date, 'YYYY-MM-DD') : null,
        });
        setEditOpen(true);
    };
    const handleSave = async () => {
        try {
            const vals = await editForm.validateFields();
            const payload = {
                ...vals,
                date: vals.date ? vals.date.format('YYYY-MM-DD') : '',
            };
            if (editRecord) {
                await unloadingsApi.update(editRecord.id, payload);
                message.success('Data diupdate');
            }
            setEditOpen(false);
            fetchData();
        } catch {
            message.error('Gagal menyimpan');
        }
    };

    // Delete
    const handleDelete = async (id: number) => {
        try {
            await unloadingsApi.remove(id);
            message.success('Dihapus');
            fetchData();
        } catch {
            message.error('Gagal menghapus');
        }
    };
    const handleBulkDelete = async () => {
        try {
            await unloadingsApi.bulkDelete(selectedKeys);
            message.success(`${selectedKeys.length} data dihapus`);
            setSelectedKeys([]);
            fetchData();
        } catch {
            message.error('Gagal menghapus');
        }
    };

    // Export
    const handleExport = () => {
        const hdr = ['date', 'brand', 'vehicle_type', 'total_vehicles'];
        const rows = filteredData.map(r =>
            [r.date, r.brand, r.vehicle_type, r.total_vehicles].map(v => `"${v || ''}"`).join(',')
        );
        const blob = new Blob([hdr.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'unloading.csv';
        a.click();
    };

    // Import
    const parseCsvLine = (line: string): string[] => {
        const cells: string[] = [];
        let current = '';
        let inQ = false;
        for (const ch of line) {
            if (ch === '"') { inQ = !inQ; continue; }
            if (ch === ',' && !inQ) { cells.push(current.trim()); current = ''; continue; }
            current += ch;
        }
        cells.push(current.trim());
        return cells;
    };
    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) return;
            const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
            const rows = lines.slice(1).map(l => parseCsvLine(l));
            const parsed = rows.map(cells => {
                const obj: Record<string, unknown> = {};
                headers.forEach((h, i) => {
                    if (h === 'id') return;
                    if (h === 'total_vehicles') obj[h] = parseInt(cells[i]) || 0;
                    else obj[h] = cells[i] ?? '';
                });
                return obj;
            }).filter(o => Object.values(o).some(v => v !== '' && v !== 0));
            if (!parsed.length) return;

            const CHUNK = 1000;
            let imported = 0;
            const hide = message.loading(`Importing... 0/${parsed.length}`, 0);
            try {
                for (let i = 0; i < parsed.length; i += CHUNK) {
                    await unloadingsApi.batchImport(parsed.slice(i, i + CHUNK));
                    imported += Math.min(CHUNK, parsed.length - i);
                    hide();
                    if (i + CHUNK < parsed.length) message.loading(`Importing... ${imported}/${parsed.length}`, 0);
                }
                message.success(`✅ ${imported} data diimport`);
                fetchData();
            } catch {
                hide();
                message.error('Gagal import');
                if (imported > 0) fetchData();
            }
        };
        reader.readAsText(file);
        return false;
    };

    const filteredData = data.filter(r => {
        const s = search.toLowerCase();
        return Object.values(r).some(v => String(v).toLowerCase().includes(s));
    });

    const columns: any[] = [
        {
            title: 'Date', dataIndex: 'date', key: 'date', width: 110,
            sorter: (a: any, b: any) => (a.date || '').localeCompare(b.date || ''),
        },
        {
            title: 'Brand', dataIndex: 'brand', key: 'brand', width: 150,
            sorter: (a: any, b: any) => (a.brand || '').localeCompare(b.brand || ''),
        },
        {
            title: 'Vehicle Type', dataIndex: 'vehicle_type', key: 'vehicle_type', width: 150,
            filters: VEHICLE_OPTIONS.map(v => ({ text: v.label, value: v.value })),
            onFilter: (value: string, record: UnloadingRecord) => record.vehicle_type === value,
        },
        {
            title: 'Total Vehicles', dataIndex: 'total_vehicles', key: 'total_vehicles', width: 120,
            sorter: (a: any, b: any) => (a.total_vehicles || 0) - (b.total_vehicles || 0),
        },
        {
            title: 'Actions', key: 'actions', width: 90, fixed: 'right' as const,
            render: (_: any, r: UnloadingRecord) => (
                <Space size="small">
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                    <Popconfirm title="Hapus?" onConfirm={() => handleDelete(r.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const formFields = (
        <>
            <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Pilih tanggal' }]}>
                <DatePicker format="D/M/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="brand" label="Brand" rules={[{ required: true, message: 'Masukkan brand' }]}>
                <Input />
            </Form.Item>
            <Form.Item name="vehicle_type" label="Vehicle Type" rules={[{ required: true, message: 'Pilih tipe kendaraan' }]}>
                <Select options={VEHICLE_OPTIONS} placeholder="Pilih tipe kendaraan" />
            </Form.Item>
            <Form.Item name="total_vehicles" label="Total Vehicles" rules={[{ required: true, message: 'Masukkan jumlah kendaraan' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
        </>
    );

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Inbound Unloading</h2>
                <Space>
                    <Input placeholder="Search..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} allowClear />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { addForm.resetFields(); setAddOpen(true); }}>Add</Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
                    <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport}><Button icon={<UploadOutlined />}>Import</Button></Upload>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                    {selectedKeys.length > 0 && (
                        <Popconfirm title={`Hapus ${selectedKeys.length} data?`} onConfirm={handleBulkDelete}>
                            <Button danger icon={<DeleteOutlined />}>Hapus ({selectedKeys.length})</Button>
                        </Popconfirm>
                    )}
                </Space>
            </div>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredData}
                loading={loading}
                size="small"
                scroll={{ x: 700, y: 'calc(100vh - 280px)' }}
                pagination={{ pageSize: 50, showTotal: (t) => `Total: ${t}`, showSizeChanger: true }}
                rowSelection={{ selectedRowKeys: selectedKeys, onChange: (keys) => setSelectedKeys(keys as number[]) }}
            />

            {/* Add Modal */}
            <Modal title="Tambah Unloading" open={addOpen} onOk={handleAdd} onCancel={() => setAddOpen(false)} okText="Simpan">
                <Form form={addForm} layout="vertical">
                    {formFields}
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal title="Edit Unloading" open={editOpen} onOk={handleSave} onCancel={() => setEditOpen(false)} okText="Simpan">
                <Form form={editForm} layout="vertical">
                    {formFields}
                </Form>
            </Modal>
        </div>
    );
}
