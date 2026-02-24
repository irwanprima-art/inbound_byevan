import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Select, Space, Typography, message, Modal, DatePicker, InputNumber, Input, Popconfirm } from 'antd';
import { LeftOutlined, RightOutlined, ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { additionalMpApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const MONTH_LABELS: Record<string, string> = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

const DAY_NAMES: Record<number, string> = {
    0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu',
};

const CAN_EDIT_ROLES = ['supervisor', 'leader'];

export default function AdditionalMpPage() {
    const { user } = useAuth();
    const canEdit = CAN_EDIT_ROLES.includes(user?.role || '');

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formDate, setFormDate] = useState<dayjs.Dayjs | null>(null);
    const [formMp, setFormMp] = useState<number>(0);
    const [formTasks, setFormTasks] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await additionalMpApi.list();
            setData(res.data || []);
        } catch {
            message.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Filter data by month
    const filteredData = useMemo(() => {
        return data
            .filter((d: any) => {
                const dk = dayjs(d.date, 'YYYY-MM-DD');
                return dk.isValid() && dk.format('YYYY-MM') === currentMonth;
            })
            .sort((a: any, b: any) => a.date.localeCompare(b.date));
    }, [data, currentMonth]);

    // Month options
    const monthOptions = useMemo(() => {
        const months = new Set<string>();
        // Add current month always
        months.add(currentMonth);
        data.forEach((d: any) => {
            const dk = dayjs(d.date, 'YYYY-MM-DD');
            if (dk.isValid()) months.add(dk.format('YYYY-MM'));
        });
        return Array.from(months).sort().map(m => {
            const [yyyy, mm] = m.split('-');
            return { label: `${MONTH_LABELS[mm] || mm} ${yyyy}`, value: m };
        });
    }, [data, currentMonth]);

    // Open modal for Add
    const openAdd = () => {
        setEditingId(null);
        setFormDate(dayjs());
        setFormMp(0);
        setFormTasks('');
        setModalOpen(true);
    };

    // Open modal for Edit
    const openEdit = (record: any) => {
        setEditingId(record.id);
        setFormDate(dayjs(record.date, 'YYYY-MM-DD'));
        setFormMp(record.additional_mp || 0);
        setFormTasks(record.tasks || '');
        setModalOpen(true);
    };

    // Save
    const handleSave = async () => {
        if (!formDate) {
            message.warning('Pilih tanggal');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                date: formDate.format('YYYY-MM-DD'),
                additional_mp: formMp,
                tasks: formTasks.trim(),
            };
            if (editingId) {
                await additionalMpApi.update(editingId, payload);
                message.success('Data berhasil diupdate');
            } else {
                await additionalMpApi.create(payload);
                message.success('Data berhasil ditambahkan');
            }
            setModalOpen(false);
            fetchData();
        } catch {
            message.error('Gagal menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    // Delete
    const handleDelete = async (id: number) => {
        try {
            await additionalMpApi.delete(id);
            message.success('Data berhasil dihapus');
            fetchData();
        } catch {
            message.error('Gagal menghapus data');
        }
    };

    const prevMonth = () => setCurrentMonth(dayjs(currentMonth + '-01').subtract(1, 'month').format('YYYY-MM'));
    const nextMonth = () => setCurrentMonth(dayjs(currentMonth + '-01').add(1, 'month').format('YYYY-MM'));
    const thisMonth = () => setCurrentMonth(dayjs().format('YYYY-MM'));

    const totalMp = filteredData.reduce((sum: number, r: any) => sum + (r.additional_mp || 0), 0);

    const [yyyy, mm] = currentMonth.split('-');
    const monthLabel = `${MONTH_LABELS[mm] || mm} ${yyyy}`;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>👷 Additional Manpower & Task</Title>
                <Space>
                    <Button icon={<LeftOutlined />} onClick={prevMonth} size="small" />
                    <Select
                        value={currentMonth}
                        onChange={setCurrentMonth}
                        options={monthOptions}
                        style={{ width: 180 }}
                    />
                    <Button icon={<RightOutlined />} onClick={nextMonth} size="small" />
                    <Button size="small" onClick={thisMonth}>Bulan Ini</Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
                    {canEdit && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Tambah</Button>
                    )}
                </Space>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    borderRadius: 12, padding: '16px 24px', minWidth: 160,
                }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 }}>Total Hari</div>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{filteredData.length}</div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                    borderRadius: 12, padding: '16px 24px', minWidth: 160,
                }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 }}>Total MP Tambahan</div>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{totalMp.toLocaleString()}</div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: 12, padding: '16px 24px', minWidth: 160,
                }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 }}>Rata-rata/Hari</div>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>
                        {filteredData.length > 0 ? (totalMp / filteredData.length).toFixed(1) : 0}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div style={{
                background: '#1a1f3a',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden',
            }}>
                <div style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: '#fff', fontWeight: 600, fontSize: 14,
                }}>
                    📅 {monthLabel}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Hari</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Additional MP</th>
                                <th style={thStyle}>Task</th>
                                {canEdit && <th style={{ ...thStyle, textAlign: 'center', width: 100 }}>Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 5 : 4} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>
                                        Tidak ada data untuk bulan ini
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((row: any) => {
                                    const d = dayjs(row.date);
                                    const dayOfWeek = d.day();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const tasks = (row.tasks || '').split('\n').filter((t: string) => t.trim());
                                    return (
                                        <tr key={row.id} style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            background: isWeekend ? 'rgba(248,113,113,0.05)' : undefined,
                                        }}>
                                            <td style={{ ...tdStyle, fontWeight: 500, width: 130 }}>
                                                {d.format('D MMM YYYY')}
                                            </td>
                                            <td style={{
                                                ...tdStyle, width: 90,
                                                color: isWeekend ? '#f87171' : 'rgba(255,255,255,0.6)',
                                            }}>
                                                {DAY_NAMES[dayOfWeek] || ''}
                                            </td>
                                            <td style={{
                                                ...tdStyle, textAlign: 'center', width: 130,
                                                fontWeight: 700, fontSize: 16, color: '#c084fc',
                                            }}>
                                                {row.additional_mp || 0}
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {tasks.map((task: string, i: number) => (
                                                        <span key={i} style={{ color: 'rgba(255,255,255,0.85)' }}>
                                                            {i + 1}. {task}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            {canEdit && (
                                                <td style={{ ...tdStyle, textAlign: 'center', width: 100 }}>
                                                    <Space size={4}>
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<EditOutlined />}
                                                            onClick={() => openEdit(row)}
                                                            style={{ color: '#60a5fa' }}
                                                        />
                                                        <Popconfirm
                                                            title="Hapus data ini?"
                                                            onConfirm={() => handleDelete(row.id)}
                                                            okText="Ya"
                                                            cancelText="Batal"
                                                        >
                                                            <Button
                                                                type="text"
                                                                size="small"
                                                                icon={<DeleteOutlined />}
                                                                style={{ color: '#f87171' }}
                                                            />
                                                        </Popconfirm>
                                                    </Space>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                            {filteredData.length > 0 && (
                                <tr style={{ background: 'rgba(99,102,241,0.15)', borderTop: '2px solid rgba(99,102,241,0.3)' }}>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: '#60a5fa' }} colSpan={2}>Total</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 16, color: '#60a5fa' }}>
                                        {totalMp}
                                    </td>
                                    <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)', fontSize: 12 }} colSpan={canEdit ? 2 : 1}>
                                        {filteredData.length} hari
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                title={editingId ? '✏️ Edit Data' : '➕ Tambah Additional MP'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                confirmLoading={saving}
                okText="Simpan"
                cancelText="Batal"
                width={500}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Tanggal</label>
                        <DatePicker
                            value={formDate}
                            onChange={(val) => setFormDate(val)}
                            style={{ width: '100%' }}
                            format="DD MMM YYYY"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Total Additional MP</label>
                        <InputNumber
                            value={formMp}
                            onChange={(val) => setFormMp(val || 0)}
                            min={0}
                            style={{ width: '100%' }}
                            placeholder="Jumlah MP tambahan"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                            Task List <span style={{ color: 'rgba(0,0,0,0.4)', fontWeight: 400 }}>(satu task per baris)</span>
                        </label>
                        <TextArea
                            value={formTasks}
                            onChange={(e) => setFormTasks(e.target.value)}
                            rows={5}
                            placeholder={`Bongkaran Makuku 5 Wingbox\nPecakang Mattel\nProject ABC`}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.6)',
    fontSize: 12, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
    padding: '10px 16px', color: 'rgba(255,255,255,0.85)', fontSize: 13,
    borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top',
};
