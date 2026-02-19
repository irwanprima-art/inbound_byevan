import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Table, Button, Modal, Space, Popconfirm, Upload, Tag, message } from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, UploadOutlined, DownloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../contexts/AuthContext';
import { locationsApi, sohApi } from '../api/client';

interface LocationRecord {
    id: number;
    location: string;
    location_category: string;
    zone: string;
    location_type: string;
}

interface SohRecord {
    location: string;
    qty: number;
    brand: string;
}

// Aggregate SOH data by location
function buildSohMap(sohData: SohRecord[]) {
    const map: Record<string, { totalQty: number; brands: Record<string, number> }> = {};
    sohData.forEach(s => {
        const loc = s.location?.trim();
        if (!loc) return;
        if (!map[loc]) map[loc] = { totalQty: 0, brands: {} };
        map[loc].totalQty += (s.qty || 0);
        if (s.brand) {
            map[loc].brands[s.brand] = (map[loc].brands[s.brand] || 0) + (s.qty || 0);
        }
    });
    return map;
}

function getDominantBrand(brands: Record<string, number>): string {
    let maxBrand = '';
    let maxQty = 0;
    for (const [brand, qty] of Object.entries(brands)) {
        if (qty > maxQty) { maxQty = qty; maxBrand = brand; }
    }
    return maxBrand;
}

export default function LocationPage() {
    const { user } = useAuth();
    const [data, setData] = useState<LocationRecord[]>([]);
    const [sohMap, setSohMap] = useState<ReturnType<typeof buildSohMap>>({});
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState<LocationRecord | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
    const [form] = Form.useForm();

    const canDelete = user?.role === 'admin' || user?.role === 'supervisor';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [locRes, sohRes] = await Promise.all([
                locationsApi.list(),
                sohApi.list(),
            ]);
            setData(locRes.data || []);
            setSohMap(buildSohMap((sohRes.data || []) as SohRecord[]));
        } catch {
            message.error('Gagal memuat data');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAdd = () => { setEditRecord(null); form.resetFields(); setModalOpen(true); };
    const handleEdit = (r: LocationRecord) => { setEditRecord(r); form.setFieldsValue(r); setModalOpen(true); };
    const handleSave = async () => {
        const vals = await form.validateFields();
        try {
            if (editRecord) {
                await locationsApi.update(editRecord.id, vals);
                message.success('Data diupdate');
            } else {
                await locationsApi.create(vals);
                message.success('Data ditambah');
            }
            setModalOpen(false);
            fetchData();
        } catch {
            message.error('Gagal menyimpan');
        }
    };
    const handleDelete = async (id: number) => {
        try { await locationsApi.remove(id); message.success('Dihapus'); fetchData(); }
        catch { message.error('Gagal menghapus'); }
    };
    const handleBulkDelete = async () => {
        try { await locationsApi.bulkDelete(selectedKeys); message.success(`${selectedKeys.length} data dihapus`); setSelectedKeys([]); fetchData(); }
        catch { message.error('Gagal menghapus'); }
    };

    // CSV helpers
    const parseCsvLine = (line: string): string[] => {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const ch of line) {
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; continue; }
            current += ch;
        }
        cells.push(current.trim());
        return cells;
    };

    const normalizeHeader = (h: string): string =>
        h.toLowerCase().replace(/[#.%]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    const columnMapDef: Record<string, string> = {
        'Location Category': 'location_category',
        'location_category': 'location_category',
        'Location Type': 'location_type',
        'location_type': 'location_type',
    };

    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { message.warning('CSV kosong'); return; }
            const headers = parseCsvLine(lines[0]);
            const fieldMap: { index: number; field: string }[] = [];
            headers.forEach((h, i) => {
                const n = normalizeHeader(h);
                const mapped = columnMapDef[h] || columnMapDef[n] || n;
                if (mapped && mapped !== 'id') fieldMap.push({ index: i, field: mapped });
            });
            const rows = lines.slice(1).map(l => parseCsvLine(l));
            const parsed = rows.map(cells => {
                const obj: Record<string, unknown> = {};
                fieldMap.forEach(({ index, field }) => { obj[field] = cells[index] ?? ''; });
                return obj;
            }).filter(obj => Object.values(obj).some(v => v !== ''));
            if (!parsed.length) { message.warning('Tidak ada data'); return; }
            const CHUNK = 1000;
            let imported = 0;
            const hide = message.loading(`Importing... 0/${parsed.length}`, 0);
            try {
                for (let i = 0; i < parsed.length; i += CHUNK) {
                    const chunk = parsed.slice(i, i + CHUNK);
                    await locationsApi.batchImport(chunk);
                    imported += chunk.length;
                    hide();
                    if (i + CHUNK < parsed.length) message.loading(`Importing... ${imported}/${parsed.length}`, 0);
                }
                message.success(`✅ ${imported} data diimport`);
                fetchData();
            } catch { hide(); message.error(`Gagal import (${imported}/${parsed.length})`); if (imported > 0) fetchData(); }
        };
        reader.readAsText(file);
        return false;
    };

    const handleExport = () => {
        const csvHeaders = ['location', 'location_category', 'zone', 'location_type', 'stock_level', 'occupancy', 'brand_on_location'];
        const headerLine = csvHeaders.join(',');
        const rows = filteredData.map(r => {
            const info = sohMap[r.location];
            return [
                r.location, r.location_category, r.zone, r.location_type,
                info?.totalQty ?? 0,
                (info?.totalQty ?? 0) > 0 ? 'Occupied' : 'Empty',
                info ? getDominantBrand(info.brands) : '',
            ].map(v => `"${v}"`).join(',');
        });
        const blob = new Blob([headerLine + '\n' + rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'master_location.csv'; a.click();
    };

    const filteredData = data.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
    );

    const columns: ColumnsType<LocationRecord> = [
        { title: 'Location', dataIndex: 'location', key: 'location', width: 130, sorter: (a, b) => a.location.localeCompare(b.location) },
        { title: 'Location Category', dataIndex: 'location_category', key: 'location_category', width: 140 },
        { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 80 },
        { title: 'Location Type', dataIndex: 'location_type', key: 'location_type', width: 120 },
        {
            title: 'Stock Level', key: 'stock_level', width: 100,
            sorter: (a, b) => (sohMap[a.location]?.totalQty ?? 0) - (sohMap[b.location]?.totalQty ?? 0),
            render: (_, r) => sohMap[r.location]?.totalQty ?? 0,
        },
        {
            title: 'Occupancy', key: 'occupancy', width: 100,
            render: (_, r) => {
                const qty = sohMap[r.location]?.totalQty ?? 0;
                return qty > 0
                    ? <Tag color="green">Occupied</Tag>
                    : <Tag color="default">Empty</Tag>;
            },
        },
        {
            title: 'Brand On Location', key: 'brand_on_location', width: 140,
            render: (_, r) => {
                const info = sohMap[r.location];
                if (!info) return '-';
                const brand = getDominantBrand(info.brands);
                return brand || '-';
            },
        },
        {
            title: 'Actions', key: 'actions', width: 90, fixed: 'right' as const,
            render: (_, r) => (
                <Space size="small">
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                    {canDelete && (
                        <Popconfirm title="Hapus?" onConfirm={() => handleDelete(r.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Master Location</h2>
                <Space>
                    <Input
                        placeholder="Search..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: 240 }}
                        allowClear
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Tambah</Button>
                    <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport}>
                        <Button icon={<UploadOutlined />}>Import</Button>
                    </Upload>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                    {canDelete && selectedKeys.length > 0 && (
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
                scroll={{ x: 1100, y: 'calc(100vh - 280px)' }}
                pagination={{ pageSize: 50, showTotal: (t) => `Total: ${t}`, showSizeChanger: true }}
                rowSelection={canDelete ? {
                    selectedRowKeys: selectedKeys,
                    onChange: (keys) => setSelectedKeys(keys as number[]),
                } : undefined}
            />

            <Modal title={editRecord ? 'Edit Location' : 'Tambah Location'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)}>
                <Form form={form} layout="vertical">
                    <Form.Item name="location" label="Location" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="location_category" label="Location Category"><Input /></Form.Item>
                    <Form.Item name="zone" label="Zone"><Input /></Form.Item>
                    <Form.Item name="location_type" label="Location Type"><Input /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
