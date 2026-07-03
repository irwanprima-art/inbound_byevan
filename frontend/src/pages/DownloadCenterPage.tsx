import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, message, Tag } from 'antd';
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { downloadTasksApi } from '../api/client';

export default function DownloadCenterPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await downloadTasksApi.list();
            const tasks = res.data || [];
            tasks.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setData(tasks);
        } catch {
            if (!silent) message.error('Gagal memuat data download tasks');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-refresh every 15 seconds to check task status
    useEffect(() => {
        const interval = setInterval(() => { fetchAll(true); }, 15000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    const statusColor = (s: string) => {
        if (s === 'Success') return 'green';
        if (s === 'Failed') return 'red';
        return 'orange';
    };

    const columns = [
        { title: 'Report Name', dataIndex: 'report_name', key: 'report_name', width: 250 },
        { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status', 
            width: 120,
            render: (s: string) => <Tag color={statusColor(s)}>{s || 'Pending'}</Tag>
        },
        { 
            title: 'Created Time', 
            dataIndex: 'created_at', 
            key: 'created_at', 
            width: 180,
            render: (v: string) => v ? new Date(v).toLocaleString('id-ID') : '-'
        },
        { 
            title: 'Download Time', 
            dataIndex: 'download_time', 
            key: 'download_time', 
            width: 180,
            render: (v: string) => v && v !== '-' ? v : '-'
        },
        { title: 'Error Message', dataIndex: 'error_message', key: 'error_message', width: 250, ellipsis: true },
        {
            title: 'Operation', key: 'operation', width: 120, fixed: 'right' as const,
            render: (_: any, record: any) => {
                if (record.status === 'Success' && record.file_url) {
                    return (
                        <Button 
                            type="link" 
                            icon={<DownloadOutlined />} 
                            href={record.file_url} 
                            target="_blank"
                        >
                            Download
                        </Button>
                    );
                }
                if (record.status === 'Pending' || !record.status) {
                    return <span style={{ color: 'rgba(255,255,255,0.45)' }}>Processing...</span>;
                }
                return null;
            },
        },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, color: '#fff' }}>Download Center</h2>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => fetchAll()}>Refresh</Button>
                </Space>
            </div>

            <Table
                dataSource={data}
                columns={columns}
                rowKey="id"
                loading={loading}
                size="small"
                scroll={{ x: 1000, y: 'calc(100vh - 250px)' }}
                pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} items` }}
            />
        </div>
    );
}
