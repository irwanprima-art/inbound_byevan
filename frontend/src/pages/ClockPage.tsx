import { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, Typography, Space, Select, Modal, message } from 'antd';
import { ClockCircleOutlined, LoginOutlined, LogoutOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const API = (import.meta as any).env?.VITE_API_URL || '/api';

const jobdescOptions = [
    'Troubleshoot', 'Project Inventory', 'Admin', 'VAS', 'Return',
    'Putaway', 'Inspect', 'Bongkaran', 'Damage Project', 'Cycle Count',
    'Receive', 'STO',
].map(v => ({ label: v, value: v }));

export default function ClockPage() {
    const navigate = useNavigate();
    const [nik, setNik] = useState('');
    const [jobdesc, setJobdesc] = useState('');
    const [employees, setEmployees] = useState<any[]>([]);
    const [attendances, setAttendances] = useState<any[]>([]);
    const [clock, setClock] = useState('');
    const [loading, setLoading] = useState(false);

    const today = dayjs().format('M/D/YYYY');

    const fetchData = useCallback(async () => {
        try {
            const [empRes, attRes] = await Promise.all([
                axios.get(`${API}/clock/employees`),
                axios.get(`${API}/clock/attendances`),
            ]);
            setEmployees(empRes.data || []);
            setAttendances(attRes.data || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const tick = () => setClock(new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }));
        tick();
        const i = setInterval(tick, 1000);
        return () => clearInterval(i);
    }, []);

    const findEmployee = (nikVal: string) =>
        employees.find(e => e.nik?.toLowerCase() === nikVal?.toLowerCase());

    const findActiveRecord = (nikVal: string) =>
        attendances.find(r => r.nik?.toLowerCase() === nikVal?.toLowerCase() && r.date === today && r.clock_in && !r.clock_out);

    const calcWorkhourMin = (clockIn: string, clockOut: string): number => {
        if (!clockIn || !clockOut) return 0;
        const [inH, inM] = clockIn.split(':').map(Number);
        const [outH, outM] = clockOut.split(':').map(Number);
        return (outH * 60 + outM) - (inH * 60 + inM);
    };

    const formatMinutes = (totalMin: number): string => {
        if (totalMin <= 0) return '0:00';
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    // CLOCK IN
    const handleClockIn = async () => {
        if (!nik.trim()) { message.warning('Masukkan NIK!'); return; }
        if (!jobdesc) { message.warning('Pilih Jobdesc!'); return; }
        const emp = findEmployee(nik);
        if (!emp) { message.error(`NIK "${nik}" tidak ditemukan di data Employee!`); return; }
        if (emp.is_active === 'Inactive') { message.error(`${emp.name} berstatus Inactive dan tidak dapat clock in!`); return; }
        const active = findActiveRecord(nik);
        if (active) { message.error(`${emp.name} sudah clock in hari ini dan belum clock out!`); return; }

        setLoading(true);
        const now = dayjs().format('HH:mm');
        try {
            await axios.post(`${API}/clock/attendances`, { date: today, nik: emp.nik, name: emp.name, jobdesc, clock_in: now, clock_out: '', status: 'Active' });
            Modal.success({ title: '✅ Clock In Berhasil', content: `Selamat Bekerja ${emp.name}! 💪` });
            setNik(''); setJobdesc(''); fetchData();
        } catch { message.error('Gagal clock in'); }
        setLoading(false);
    };

    // CLOCK OUT
    const handleClockOut = async () => {
        if (!nik.trim()) { message.warning('Masukkan NIK!'); return; }
        const emp = findEmployee(nik);
        if (!emp) { message.error(`NIK "${nik}" tidak ditemukan di data Employee!`); return; }
        if (emp.is_active === 'Inactive') { message.error(`${emp.name} berstatus Inactive dan tidak dapat clock out!`); return; }
        const active = findActiveRecord(nik);
        if (!active) { message.error(`${emp.name} belum clock in hari ini atau sudah clock out!`); return; }

        setLoading(true);
        const now = dayjs().format('HH:mm');
        const totalMin = calcWorkhourMin(active.clock_in, now);
        try {
            await axios.put(`${API}/clock/attendances/${active.id}`, { ...active, clock_out: now, status: `Done (${formatMinutes(totalMin)})` });
            Modal.success({ title: '✅ Clock Out Berhasil', content: `Terimakasih atas kinerjanya ${emp.name}, selamat istirahat! 🙏` });
            setNik(''); setJobdesc(''); fetchData();
        } catch { message.error('Gagal clock out'); }
        setLoading(false);
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d1117 100%)',
        }}>
            <Card style={{
                width: 460,
                borderRadius: 16,
                background: 'rgba(26, 31, 58, 0.95)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }} styles={{ body: { padding: 40 } }}>
                <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                    <div>
                        <ClockCircleOutlined style={{ fontSize: 40, color: '#6366f1' }} />
                        <Title level={3} style={{ color: '#fff', margin: '8px 0 0' }}>Clock In / Out</Title>
                        <Text style={{ color: '#6366f1', fontSize: 28, fontWeight: 700 }}>{clock}</Text>
                    </div>

                    <Input
                        size="large"
                        placeholder="Masukkan NIK..."
                        value={nik}
                        onChange={e => setNik(e.target.value)}
                        onPressEnter={handleClockIn}
                        autoFocus
                        style={{ textAlign: 'center', fontSize: 18 }}
                    />

                    <Select
                        size="large"
                        options={jobdescOptions}
                        value={jobdesc || undefined}
                        onChange={setJobdesc}
                        placeholder="Pilih Jobdesc"
                        style={{ width: '100%' }}
                    />

                    <Space size="large">
                        <Button
                            type="primary"
                            size="large"
                            icon={<LoginOutlined />}
                            onClick={handleClockIn}
                            loading={loading}
                            style={{ height: 50, paddingInline: 32, fontWeight: 600, borderRadius: 8, background: '#10b981' }}
                        >
                            Clock In
                        </Button>
                        <Button
                            size="large"
                            icon={<LogoutOutlined />}
                            onClick={handleClockOut}
                            loading={loading}
                            style={{ height: 50, paddingInline: 32, fontWeight: 600, borderRadius: 8 }}
                            danger
                        >
                            Clock Out
                        </Button>
                    </Space>

                    <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/login')}
                        style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Kembali ke Login
                    </Button>
                </Space>
            </Card>
        </div>
    );
}
