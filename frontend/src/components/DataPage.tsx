import { useState, useEffect, useCallback } from 'react';
import { downloadCsvTemplate, normalizeDate } from '../utils/csvTemplate';
import {
    Table, Button, Space, Input, Modal, Form, Upload, message, Popconfirm,
    Typography, Tooltip, DatePicker,
} from 'antd';
import {
    PlusOutlined, UploadOutlined, DownloadOutlined, DeleteOutlined,
    EditOutlined, ReloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { Title } = Typography;

// Resizable header cell for drag-to-resize columns
const ResizableTitle = (props: any) => {
    const { onResize, width, ...restProps } = props;
    if (!width) return <th {...restProps} />;
    return (
        <Resizable
            width={width}
            height={0}
            handle={
                <span
                    className="react-resizable-handle"
                    style={{ position: 'absolute', right: -5, bottom: 0, top: 0, width: 10, cursor: 'col-resize', zIndex: 1 }}
                    onClick={e => e.stopPropagation()}
                />
            }
            onResize={onResize}
            draggableOpts={{ enableUserSelectHack: false }}
        >
            <th {...restProps} />
        </Resizable>
    );
};

interface DataPageProps<T> {
    title: string;
    api: {
        list: () => Promise<{ data: T[] }>;
        create: (data: Record<string, unknown>) => Promise<any>;
        update: (id: number, data: Record<string, unknown>) => Promise<any>;
        remove: (id: number) => Promise<any>;
        bulkDelete: (ids: number[]) => Promise<any>;
        sync: (data: Record<string, unknown>[]) => Promise<any>;
        batchImport: (data: Record<string, unknown>[]) => Promise<any>;
    };
    columns: ColumnsType<T>;
    formFields: React.ReactNode;
    csvHeaders?: string[];
    parseCSVRow?: (row: string[], headers?: string[]) => Record<string, unknown>;
    /** Map CSV header names to database field names, e.g. { 'Phy Inventory#': 'phy_inv' } */
    columnMap?: Record<string, string>;
    /** Fields that should be parsed as numbers */
    numberFields?: string[];
    /** Compute additional searchable text from a row (for computed columns like Remarks) */
    computeSearchText?: (item: T) => string;
    /** Field name containing the date value, e.g. 'date'. When set, a date range picker is shown. */
    dateField?: string;
}

export default function DataPage<T extends { id: number }>({
    title, api, columns, formFields, csvHeaders, parseCSVRow, columnMap, numberFields, computeSearchText, dateField,
}: DataPageProps<T>) {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editRecord, setEditRecord] = useState<T | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [form] = Form.useForm();

    const canDelete = user?.role === 'supervisor' || user?.role === 'leader';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.list();
            setData(res.data || []);
        } catch (err) {
            message.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => { fetchData(); }, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleAdd = () => {
        setEditRecord(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleEdit = (record: T) => {
        setEditRecord(record);
        setModalOpen(true);
    };

    // Populate form after modal opens
    useEffect(() => {
        if (modalOpen) {
            if (editRecord) {
                form.setFieldsValue(editRecord as any);
            } else {
                form.resetFields();
            }
        }
    }, [modalOpen, editRecord, form]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (editRecord) {
                await api.update(editRecord.id, values);
                message.success('Data berhasil diupdate');
            } else {
                await api.create(values);
                message.success('Data berhasil ditambahkan');
            }
            setModalOpen(false);
            fetchData();
        } catch (err: any) {
            if (err.response) message.error('Gagal menyimpan: ' + (err.response?.data?.error || ''));
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.remove(id);
            message.success('Data berhasil dihapus');
            fetchData();
        } catch {
            message.error('Gagal menghapus');
        }
    };

    const handleBulkDelete = async () => {
        try {
            await api.bulkDelete(selectedKeys as number[]);
            message.success(`${selectedKeys.length} data berhasil dihapus`);
            setSelectedKeys([]);
            fetchData();
        } catch {
            message.error('Gagal menghapus');
        }
    };

    // Helper: parse a CSV line respecting quotes
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

    // Helper: normalize a CSV header to a field name
    const normalizeHeader = (h: string): string => {
        return h.toLowerCase()
            .replace(/[#.%]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    };

    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) {
                message.warning('File CSV kosong');
                return;
            }

            const headerCells = parseCsvLine(lines[0]);
            const rows = lines.slice(1).map(l => parseCsvLine(l));

            // Build field mappings from header
            const fieldMap: { index: number; field: string }[] = [];
            headerCells.forEach((h, i) => {
                const normalized = normalizeHeader(h);
                const mappedField = columnMap?.[h] || columnMap?.[normalized] || normalized;
                if (mappedField && mappedField !== 'id') {
                    fieldMap.push({ index: i, field: mappedField });
                }
            });

            const numSet = new Set(numberFields || []);

            // Parse each row using the detected field mapping
            let parsed: Record<string, unknown>[];
            if (parseCSVRow) {
                parsed = rows.map(r => parseCSVRow(r, headerCells)).filter(Boolean);
            } else {
                parsed = rows.map(cells => {
                    const obj: Record<string, unknown> = {};
                    fieldMap.forEach(({ index, field }) => {
                        const val = cells[index] ?? '';
                        if (numSet.has(field)) {
                            obj[field] = parseInt(val) || 0;
                        } else if (field.includes('date') || field === 'date') {
                            obj[field] = normalizeDate(val);
                        } else {
                            obj[field] = val;
                        }
                    });
                    return obj;
                }).filter(obj => Object.values(obj).some(v => v !== '' && v !== 0));
            }

            if (parsed.length === 0) {
                message.warning('Tidak ada data valid dalam CSV');
                return;
            }

            // Send in chunks of 1000 rows
            const CHUNK_SIZE = 1000;
            const totalChunks = Math.ceil(parsed.length / CHUNK_SIZE);
            let imported = 0;
            const hideMsg = message.loading(`Importing... 0/${parsed.length}`, 0);

            try {
                for (let i = 0; i < totalChunks; i++) {
                    const chunk = parsed.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                    await api.batchImport(chunk);
                    imported += chunk.length;
                    hideMsg();
                    if (i < totalChunks - 1) {
                        message.loading(`Importing... ${imported}/${parsed.length}`, 0);
                    }
                }
                message.success(`✅ ${imported} data berhasil diimport`);
                fetchData();
            } catch {
                hideMsg();
                message.error(`Gagal import (${imported}/${parsed.length} berhasil)`);
                if (imported > 0) fetchData();
            }
        };
        reader.readAsText(file);
        return false;
    };

    const handleExport = () => {
        if (!csvHeaders) return;
        const headerLine = csvHeaders.join(',');
        const rows = data.map(item =>
            csvHeaders.map(h => {
                const key = h.replace(/\s+/g, '_').toLowerCase();
                const val = (item as any)[key] ?? '';
                return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
            }).join(',')
        );
        const csv = [headerLine, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Column widths state for resizable columns
    const [colWidths, setColWidths] = useState<Record<string, number>>({});

    // Initialize column widths from props
    useEffect(() => {
        const widths: Record<string, number> = {};
        columns.forEach((col: any) => {
            const key = col.key || col.dataIndex;
            if (key && col.width) widths[key] = col.width;
            else if (key) widths[key] = 150;
        });
        setColWidths(prev => ({ ...widths, ...prev }));
    }, [columns]);

    const handleResize = (key: string) => (_: any, { size }: any) => {
        setColWidths(prev => ({ ...prev, [key]: size.width }));
    };

    // Add action column + apply resizable widths
    const fullColumns: ColumnsType<T> = [
        ...columns.map((col: any) => {
            const key = col.key || col.dataIndex;
            return {
                ...col,
                width: colWidths[key] || col.width || 150,
                onHeaderCell: (column: any) => ({
                    width: column.width,
                    onResize: handleResize(key),
                }),
            };
        }),
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            fixed: 'right',
            render: (_, record: T) => (
                <Space size="small">
                    <Tooltip title="Edit">
                        <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    </Tooltip>
                    {canDelete && (
                        <Popconfirm title="Hapus data ini?" onConfirm={() => handleDelete(record.id)}>
                            <Tooltip title="Hapus">
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    const tableComponents = { header: { cell: ResizableTitle } };

    // Filter data by date range and search
    const filtered = data.filter(item => {
        // Date range filter
        if (dateField && dateRange) {
            const val = (item as any)[dateField];
            if (val) {
                const d = dayjs(val);
                if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false;
            }
        }
        // Search filter
        if (search === '') return true;
        const q = search.toLowerCase();
        const base = JSON.stringify(item).toLowerCase().includes(q);
        if (base) return true;
        if (computeSearchText) return computeSearchText(item).toLowerCase().includes(q);
        return false;
    });

    return (
        <div>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 16,
            }}>
                <Title level={4} style={{ margin: 0, color: '#fff' }}>{title}</Title>
                <Space wrap>
                    {dateField && (
                        <>
                            <DatePicker.RangePicker
                                value={dateRange}
                                onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                                format="DD/MM/YYYY"
                                placeholder={['Dari Tanggal', 'Sampai Tanggal']}
                                allowClear
                                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}
                            />
                            <Button size="small" onClick={() => { const now = dayjs(); setDateRange([now.startOf('month'), now.endOf('month')]); }}>Bulan Ini</Button>
                            <Button size="small" onClick={() => { const prev = dayjs().subtract(1, 'month'); setDateRange([prev.startOf('month'), prev.endOf('month')]); }}>Bulan Lalu</Button>
                            {dateRange && <Button size="small" danger onClick={() => setDateRange(null)}>Reset</Button>}
                        </>
                    )}
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
                    {csvHeaders && (parseCSVRow || columnMap) && (
                        <Upload accept=".csv" showUploadList={false} beforeUpload={handleImport}>
                            <Button icon={<UploadOutlined />}>Import</Button>
                        </Upload>
                    )}
                    {csvHeaders && (
                        <>
                            <Button icon={<DownloadOutlined />} onClick={() => downloadCsvTemplate(csvHeaders, `${title.replace(/\s+/g, '_')}_template`)}>Template</Button>
                            <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                        </>
                    )}
                    {canDelete && selectedKeys.length > 0 && (
                        <Popconfirm title={`Hapus ${selectedKeys.length} data?`} onConfirm={handleBulkDelete}>
                            <Button danger icon={<DeleteOutlined />}>
                                Hapus ({selectedKeys.length})
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            </div>

            <Table
                rowKey="id"
                columns={fullColumns}
                dataSource={filtered}
                loading={loading}
                scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }}
                pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Total: ${t}` }}
                rowSelection={canDelete ? {
                    selectedRowKeys: selectedKeys,
                    onChange: setSelectedKeys,
                } : undefined}
                size="small"
                components={tableComponents}
            />

            <Modal
                title={editRecord ? `Edit ${title}` : `Tambah ${title}`}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                width={640}
            >
                <Form form={form} layout="vertical">
                    {formFields}
                </Form>
            </Modal>
        </div>
    );
}
