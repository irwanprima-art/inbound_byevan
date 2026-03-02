import { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, Typography, Space, Select, Modal, message, Form, Alert } from 'antd';
import { ClockCircleOutlined, LoginOutlined, LogoutOutlined, LockOutlined, UserOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const API = (import.meta as any).env?.VITE_API_URL || '/api';

const jobdescOptions = [
    'Troubleshoot', 'Project Inventory', 'Admin', 'VAS', 'Return',
    'Putaway', 'Inspect', 'Bongkaran', 'Damage Project', 'Cycle Count',
    'Receive', 'STO',
].map(v => ({ label: v, value: v }));

export default function PublicClockPage() {
    // ── Supervisor gate ──
    const [authenticated, setAuthenticated] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    const handleLogin = async (values: { username: string; password: string }) => {
        setLoginLoading(true);
        setLoginError('');
        try {
            const res = await axios.post(`${API}/auth/login`, {
                username: values.username.trim().toLowerCase(),
                password: values.password,
            });
            const role = res.data?.user?.role || res.data?.role || '';
            if (role !== 'supervisor') {
                setLoginError('Hanya akun Supervisor yang dapat mengakses Clock In/Out.');
                setLoginLoading(false);
                return;
            }
            setAuthenticated(true);
        } catch (err: any) {
            setLoginError(err.response?.data?.error || 'Login gagal. Periksa username dan password.');
        }
        setLoginLoading(false);
    };

    // ── Clock In / Out state ──
    const [nik, setNik] = useState('');
    const [jobdesc, setJobdesc] = useState('');
    const [employees, setEmployees] = useState<any[]>([]);
    const [attendances, setAttendances] = useState<any[]>([]);
    const [clock, setClock] = useState('');
    const [loading, setLoading] = useState(false);

    const today = dayjs().format('YYYY-MM-DD');

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

    useEffect(() => { if (authenticated) fetchData(); }, [authenticated, fetchData]);

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

    const findActiveRecord = (nikVal: string) => {
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        return attendances.find(r =>
            r.nik?.toLowerCase() === nikVal?.toLowerCase() &&
            (r.date === today || r.date === yesterday) &&
            r.clock_in && !r.clock_out
        );
    };

    const calcWorkhourMin = (clockIn: string, clockOut: string): number => {
        if (!clockIn || !clockOut) return 0;
        const inParts = clockIn.split(':').map(Number);
        const outParts = clockOut.split(':').map(Number);
        const inSec = (inParts[0] || 0) * 3600 + (inParts[1] || 0) * 60 + (inParts[2] || 0);
        const outSec = (outParts[0] || 0) * 3600 + (outParts[1] || 0) * 60 + (outParts[2] || 0);
        let diff = outSec - inSec;
        if (diff < 0) diff += 86400;
        return Math.floor(diff / 60);
    };

    const formatMinutes = (totalMin: number): string => {
        if (totalMin <= 0) return '0:00';
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const handleClockIn = async () => {
        if (!nik.trim()) { message.warning('Masukkan NIK!'); return; }
        if (!jobdesc) { message.warning('Pilih Jobdesc!'); return; }
        const emp = findEmployee(nik);
        if (!emp) { message.error(`NIK "${nik}" tidak ditemukan di data Employee!`); return; }
        if (emp.is_active === 'Inactive') { message.error(`${emp.name} berstatus Inactive dan tidak dapat clock in!`); return; }
        const active = findActiveRecord(nik);
        if (active) { message.error(`${emp.name} sudah clock in hari ini dan belum clock out!`); return; }

        setLoading(true);
        const now = dayjs().format('HH:mm:ss');
        try {
            await axios.post(`${API}/clock/attendances`, { date: today, nik: emp.nik, name: emp.name, jobdesc, clock_in: now, clock_out: '', status: 'Active' });
            Modal.success({ title: '🎉 Clock In Berhasil, ' + emp.name + '!', content: '"Langkah pelan kaya zombie,\ntapi rezeki nggak boleh lari!" 🧟' });
            setNik(''); setJobdesc(''); fetchData();
        } catch (err: any) { message.error(err?.response?.data?.error || 'Gagal clock in'); }
        setLoading(false);
    };

    const handleClockOut = async () => {
        if (!nik.trim()) { message.warning('Masukkan NIK!'); return; }
        const emp = findEmployee(nik);
        if (!emp) { message.error(`NIK "${nik}" tidak ditemukan di data Employee!`); return; }
        if (emp.is_active === 'Inactive') { message.error(`${emp.name} berstatus Inactive dan tidak dapat clock out!`); return; }
        const active = findActiveRecord(nik);
        if (!active) { message.error(`${emp.name} belum clock in hari ini atau sudah clock out!`); return; }

        setLoading(true);
        const now = dayjs().format('HH:mm:ss');
        const totalMin = calcWorkhourMin(active.clock_in, now);
        try {
            await axios.put(`${API}/clock/attendances/${active.id}`, { ...active, clock_out: now, status: `Done (${formatMinutes(totalMin)})` });
            Modal.success({ title: '🎉 Clock Out Berhasil, ' + emp.name + '!', content: '"Kerja tuntas tanpa drama,\nwaktunya rebahan penuh bahagia!" 🛌' });
            setNik(''); setJobdesc(''); fetchData();
        } catch (err: any) { message.error(err?.response?.data?.error || 'Gagal clock out'); }
        setLoading(false);
    };

    // ── LOGIN GATE ──
    if (!authenticated) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d1117 100%)',
            }}>
                <Card style={{
                    width: 400, borderRadius: 16,
                    background: 'rgba(26, 31, 58, 0.95)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                }} styles={{ body: { padding: 40 } }}>
                    <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                        <div>
                            <ClockCircleOutlined style={{ fontSize: 40, color: '#6366f1' }} />
                            <Title level={3} style={{ color: '#fff', margin: '8px 0 0' }}>Clock In / Out</Title>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                                Login Supervisor untuk melanjutkan
                            </Text>
                        </div>

                        {loginError && <Alert message={loginError} type="error" showIcon />}

                        <Form onFinish={handleLogin} layout="vertical" size="large">
                            <Form.Item name="username" rules={[{ required: true, message: 'Username wajib diisi' }]}>
                                <Input prefix={<UserOutlined />} placeholder="Username" autoFocus />
                            </Form.Item>
                            <Form.Item name="password" rules={[{ required: true, message: 'Password wajib diisi' }]}>
                                <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" block loading={loginLoading}
                                    style={{ height: 44, borderRadius: 8, fontWeight: 600 }}>
                                    Login Supervisor
                                </Button>
                            </Form.Item>
                        </Form>
                    </Space>
                </Card>
            </div>
        );
    }

    // ── CLOCK IN / OUT UI ──
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d1117 100%)',
            padding: '24px 0',
        }}>
            <Card style={{
                width: 460, borderRadius: 16,
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

                    <Button type="text" danger onClick={() => setAuthenticated(false)}
                        style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                        Logout Supervisor
                    </Button>
                </Space>
            </Card>

            {/* Active Attendance Records */}
            {(() => {
                const now = dayjs();
                const isOverdue = (r: any) => {
                    const clockInTime = dayjs(`${r.date} ${r.clock_in}`, 'YYYY-MM-DD HH:mm');
                    return clockInTime.isValid() && now.diff(clockInTime, 'hour', true) >= 12;
                };
                const normalRecords = attendances.filter(r => r.clock_in && !r.clock_out && !isOverdue(r));
                const overdueRecords = attendances.filter(r => r.clock_in && !r.clock_out && isOverdue(r));

                return (
                    <>
                        {normalRecords.length > 0 && (
                            <Card style={{
                                width: 520, borderRadius: 16,
                                background: 'rgba(26, 31, 58, 0.95)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                                marginTop: 16,
                            }} styles={{ body: { padding: '16px 20px' } }}>
                                <div style={{ color: '#10b981', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                                    🟢 Sedang Aktif — {normalRecords.length} orang
                                </div>
                                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Nama</th>
                                                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Jobdesc</th>
                                                <th style={{ textAlign: 'center', padding: '6px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Tanggal</th>
                                                <th style={{ textAlign: 'center', padding: '6px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Clock In</th>
                                                <th style={{ textAlign: 'center', padding: '6px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Durasi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {normalRecords.map((r: any, i: number) => {
                                                const mins = calcWorkhourMin(r.clock_in, dayjs().format('HH:mm'));
                                                return (
                                                    <tr key={r.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <td style={{ padding: '7px 8px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{r.name}</td>
                                                        <td style={{ padding: '7px 8px', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{r.jobdesc || '-'}</td>
                                                        <td style={{ padding: '7px 8px', color: r.date !== today ? '#faad14' : 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', fontWeight: r.date !== today ? 600 : 400 }}>{r.date}</td>
                                                        <td style={{ padding: '7px 8px', color: '#6366f1', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{r.clock_in}</td>
                                                        <td style={{ padding: '7px 8px', color: '#10b981', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{formatMinutes(mins)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

                        {overdueRecords.length > 0 && (
                            <Card style={{
                                width: 520, borderRadius: 16,
                                background: 'rgba(26, 31, 58, 0.95)',
                                border: '1px solid rgba(255, 77, 79, 0.4)',
                                boxShadow: '0 10px 40px rgba(255, 77, 79, 0.15)',
                                marginTop: 16,
                            }} styles={{ body: { padding: '16px 20px' } }}>
                                <div style={{ color: '#ff4d4f', fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <WarningOutlined style={{ fontSize: 16 }} /> Peringatan Belum Clock Out ({'>'}12 jam) — {overdueRecords.length} orang
                                </div>
                                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255, 77, 79, 0.2)' }}>
                                                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Nama</th>
                                                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Jobdesc</th>
                                                <th style={{ textAlign: 'center', padding: '6px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Tanggal</th>
                                                <th style={{ textAlign: 'center', padding: '6px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Clock In</th>
                                                <th style={{ textAlign: 'center', padding: '6px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Durasi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {overdueRecords.map((r: any, i: number) => {
                                                const clockInTime = dayjs(`${r.date} ${r.clock_in}`, 'YYYY-MM-DD HH:mm');
                                                const totalMin = Math.floor(now.diff(clockInTime, 'minute'));
                                                const h = Math.floor(totalMin / 60);
                                                const m = totalMin % 60;
                                                return (
                                                    <tr key={r.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255, 77, 79, 0.05)' }}>
                                                        <td style={{ padding: '7px 8px', color: '#ff4d4f', fontSize: 13, fontWeight: 600 }}>{r.name}</td>
                                                        <td style={{ padding: '7px 8px', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{r.jobdesc || '-'}</td>
                                                        <td style={{ padding: '7px 8px', color: '#faad14', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>{r.date}</td>
                                                        <td style={{ padding: '7px 8px', color: '#6366f1', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{r.clock_in}</td>
                                                        <td style={{ padding: '7px 8px', color: '#ff4d4f', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{h}:{m.toString().padStart(2, '0')}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </>
                );
            })()}
        </div>
    );
}
