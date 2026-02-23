import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Select, message, Typography, Space, Popconfirm, Tooltip } from 'antd';
import {
    LeftOutlined, RightOutlined,
    CopyOutlined, ReloadOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { schedulesApi, employeesApi } from '../api/client';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

const { Title } = Typography;

const JOBDESC_OPTIONS = [
    'Troubleshoot', 'Project Inventory', 'Admin', 'VAS', 'Return',
    'Putaway', 'Inspect', 'Bongkaran', 'Damage Project', 'Cycle Count',
    'Receive', 'STO',
].map(v => ({ label: v, value: v }));

// Clock-in options: 07:00 to 22:00
const CLOCK_IN_OPTIONS = Array.from({ length: 16 }, (_, i) => {
    const h = (7 + i).toString().padStart(2, '0');
    return { label: `${h}:00`, value: `${h}:00:00` };
});

// Add "Off" option
const CLOCK_IN_WITH_OFF = [{ label: 'Off', value: 'Off' }, ...CLOCK_IN_OPTIONS];

// Calculate clock-out = clock_in + 9 hours
function calcClockOut(clockIn: string): string {
    if (!clockIn || clockIn === 'Off') return '';
    const parts = clockIn.split(':').map(Number);
    let h = (parts[0] + 9) % 24;
    return `${h.toString().padStart(2, '0')}:00:00`;
}

// Shift color based on clock-in time
function shiftColor(clockIn: string): string {
    if (!clockIn || clockIn === 'Off') return 'transparent';
    const h = parseInt(clockIn.split(':')[0]);
    if (h >= 7 && h <= 9) return 'rgba(16, 185, 129, 0.25)';     // morning → green
    if (h >= 10 && h <= 14) return 'rgba(250, 204, 21, 0.18)';    // midday → yellow
    if (h >= 15 && h <= 18) return 'rgba(239, 68, 68, 0.2)';      // afternoon → red
    return 'rgba(139, 92, 246, 0.2)';                               // evening → purple
}

function shiftTextColor(clockIn: string): string {
    if (!clockIn || clockIn === 'Off') return 'rgba(255,255,255,0.3)';
    const h = parseInt(clockIn.split(':')[0]);
    if (h >= 7 && h <= 9) return '#34d399';
    if (h >= 10 && h <= 14) return '#fbbf24';
    if (h >= 15 && h <= 18) return '#f87171';
    return '#a78bfa';
}

type ScheduleRow = {
    nik: string;
    name: string;
    jobdesc: string;
    shifts: Record<string, { id?: number; clock_in: string; clock_out: string }>;
};

export default function SchedulePage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [weekStart, setWeekStart] = useState(dayjs().isoWeekday(1).format('YYYY-MM-DD'));
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // 7 days of the selected week
    const weekDays = useMemo(() => {
        const start = dayjs(weekStart);
        return Array.from({ length: 7 }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
    }, [weekStart]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [empRes, schRes] = await Promise.all([employeesApi.list(), schedulesApi.list()]);
            setEmployees((empRes.data || []).filter((e: any) => e.is_active !== 'Inactive'));
            setSchedules(schRes.data || []);
        } catch { message.error('Gagal memuat data'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Build rows from schedules for this week
    const rows = useMemo((): ScheduleRow[] => {
        const weekSet = new Set(weekDays);
        const weekSchedules = schedules.filter((s: any) => weekSet.has(s.date));
        const nikMap: Record<string, ScheduleRow> = {};
        weekSchedules.forEach((s: any) => {
            const nik = s.nik || '';
            if (!nikMap[nik]) {
                nikMap[nik] = { nik, name: s.name || '', jobdesc: s.jobdesc || '', shifts: {} };
            }
            nikMap[nik].shifts[s.date] = { id: s.id, clock_in: s.clock_in || 'Off', clock_out: s.clock_out || '' };
        });
        return Object.values(nikMap).sort((a, b) => {
            const aMinId = Math.min(...Object.values(a.shifts).map(s => s.id || Infinity));
            const bMinId = Math.min(...Object.values(b.shifts).map(s => s.id || Infinity));
            return aMinId - bMinId;
        });
    }, [schedules, weekDays]);

    // Available employees not yet in this week's schedule
    const availableEmployees = useMemo(() => {
        const usedNiks = new Set(rows.map(r => r.nik.toLowerCase()));
        return employees.filter(e => !usedNiks.has((e.nik || '').toLowerCase()));
    }, [employees, rows]);

    // Navigate week
    const prevWeek = () => setWeekStart(dayjs(weekStart).subtract(7, 'day').format('YYYY-MM-DD'));
    const nextWeek = () => setWeekStart(dayjs(weekStart).add(7, 'day').format('YYYY-MM-DD'));
    const thisWeek = () => setWeekStart(dayjs().isoWeekday(1).format('YYYY-MM-DD'));

    // Add employee to schedule
    const handleAddEmployee = async (nikVal: string) => {
        const emp = employees.find(e => e.nik === nikVal);
        if (!emp) return;
        setSaving(true);
        try {
            // Create 7 records for the week (all Off by default)
            const batch = weekDays.map(date => ({
                date, nik: emp.nik, name: emp.name, jobdesc: '', clock_in: 'Off', clock_out: '',
            }));
            await schedulesApi.batchImport(batch);
            message.success(`${emp.name} ditambahkan ke jadwal`);
            fetchData();
        } catch { message.error('Gagal menambahkan'); }
        setSaving(false);
    };

    // Update a single cell
    const handleCellChange = async (row: ScheduleRow, date: string, field: string, value: string) => {
        const existing = row.shifts[date];
        const clockIn = field === 'clock_in' ? value : (existing?.clock_in || 'Off');
        const clockOut = calcClockOut(clockIn);
        const payload: any = {
            date, nik: row.nik, name: row.name,
            jobdesc: field === 'jobdesc' ? value : row.jobdesc,
            clock_in: clockIn === 'Off' ? '' : clockIn,
            clock_out: clockIn === 'Off' ? '' : clockOut,
        };

        try {
            if (existing?.id) {
                await schedulesApi.update(existing.id, payload);
            } else {
                await schedulesApi.create(payload);
            }
            fetchData();
        } catch { message.error('Gagal menyimpan'); }
    };

    // Update jobdesc for all days of this employee in this week
    const handleJobdescChange = async (row: ScheduleRow, newJobdesc: string) => {
        setSaving(true);
        try {
            const updates = weekDays.map(date => {
                const existing = row.shifts[date];
                if (existing?.id) {
                    return schedulesApi.update(existing.id, { ...existing, jobdesc: newJobdesc, clock_in: existing.clock_in === 'Off' ? '' : existing.clock_in });
                }
                return schedulesApi.create({ date, nik: row.nik, name: row.name, jobdesc: newJobdesc, clock_in: '', clock_out: '' });
            });
            await Promise.all(updates);
            fetchData();
        } catch { message.error('Gagal update jobdesc'); }
        setSaving(false);
    };

    // Remove employee from this week
    const handleRemoveEmployee = async (row: ScheduleRow) => {
        const ids = Object.values(row.shifts).filter(s => s.id).map(s => s.id as number);
        if (ids.length === 0) return;
        setSaving(true);
        try {
            await schedulesApi.bulkDelete(ids);
            message.success(`${row.name} dihapus dari jadwal`);
            fetchData();
        } catch { message.error('Gagal menghapus'); }
        setSaving(false);
    };

    // Copy previous week schedule to this week
    const handleCopyPrevWeek = async () => {
        const prevWeekStart = dayjs(weekStart).subtract(7, 'day').format('YYYY-MM-DD');
        const prevDays = Array.from({ length: 7 }, (_, i) => dayjs(prevWeekStart).add(i, 'day').format('YYYY-MM-DD'));
        const prevSet = new Set(prevDays);
        const prevSchedules = schedules.filter((s: any) => prevSet.has(s.date));
        if (prevSchedules.length === 0) { message.warning('Tidak ada jadwal minggu sebelumnya'); return; }

        setSaving(true);
        try {
            const batch = prevSchedules.map((s: any, i: number) => {
                const dayOffset = prevDays.indexOf(s.date);
                return {
                    date: weekDays[dayOffset >= 0 ? dayOffset : i % 7],
                    nik: s.nik, name: s.name, jobdesc: s.jobdesc,
                    clock_in: s.clock_in || '', clock_out: s.clock_out || '',
                };
            });
            await schedulesApi.batchImport(batch);
            message.success(`${batch.length} jadwal dicopy dari minggu sebelumnya`);
            fetchData();
        } catch { message.error('Gagal copy jadwal'); }
        setSaving(false);
    };

    const weekEndStr = dayjs(weekStart).add(6, 'day').format('DD MMM YYYY');
    const weekStartStr = dayjs(weekStart).format('DD MMM YYYY');

    const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    return (
        <div style={{ padding: '0 4px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0, color: '#fff' }}>📅 Manpower Schedule</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
                    <Popconfirm title="Copy jadwal minggu lalu ke minggu ini?" onConfirm={handleCopyPrevWeek} okText="Ya" cancelText="Batal">
                        <Button icon={<CopyOutlined />} loading={saving}>Copy Minggu Lalu</Button>
                    </Popconfirm>
                </Space>
            </div>

            {/* Week navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Button icon={<LeftOutlined />} onClick={prevWeek} />
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, minWidth: 240, textAlign: 'center' }}>
                    {weekStartStr} — {weekEndStr}
                </div>
                <Button icon={<RightOutlined />} onClick={nextWeek} />
                <Button size="small" onClick={thisWeek} style={{ marginLeft: 8 }}>Minggu Ini</Button>

                {/* Add employee */}
                <Select
                    showSearch
                    style={{ minWidth: 250, marginLeft: 'auto' }}
                    placeholder="+ Tambah Karyawan..."
                    optionFilterProp="label"
                    options={availableEmployees.map(e => ({ label: `${e.name} (${e.nik})`, value: e.nik }))}
                    value={undefined}
                    onChange={handleAddEmployee}
                    loading={saving}
                />
            </div>

            {/* Schedule Grid */}
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
                    <thead>
                        <tr style={{ background: '#0d1117' }}>
                            <th style={thStyle} rowSpan={2}>Nama</th>
                            <th style={thStyle} rowSpan={2}>Divisi</th>
                            <th style={thStyle} rowSpan={2}>NIK</th>
                            {weekDays.map((d, i) => {
                                const dd = dayjs(d);
                                const isToday = d === dayjs().format('YYYY-MM-DD');
                                const isWeekend = i >= 5;
                                return (
                                    <th key={d} colSpan={2} style={{
                                        ...thStyle, textAlign: 'center', minWidth: 160,
                                        background: isToday ? 'rgba(99, 102, 241, 0.15)' : isWeekend ? 'rgba(239, 68, 68, 0.08)' : undefined,
                                        borderBottom: 'none',
                                    }}>
                                        <div style={{ fontWeight: 700 }}>{dayNames[i]}</div>
                                        <div style={{ fontSize: 11, opacity: 0.7 }}>{dd.format('DD/MM')}</div>
                                    </th>
                                );
                            })}
                            <th style={thStyle} rowSpan={2}>⚙</th>
                        </tr>
                        <tr style={{ background: '#0d1117' }}>
                            {weekDays.map((d, i) => {
                                const isToday = d === dayjs().format('YYYY-MM-DD');
                                const isWeekend = i >= 5;
                                const bg = isToday ? 'rgba(99, 102, 241, 0.15)' : isWeekend ? 'rgba(239, 68, 68, 0.08)' : undefined;
                                return [
                                    <th key={d + '-in'} style={{ ...thSubStyle, background: bg }}>IN</th>,
                                    <th key={d + '-out'} style={{ ...thSubStyle, background: bg }}>OUT</th>,
                                ];
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={3 + weekDays.length * 2 + 1} style={{ ...tdStyle, textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>
                                    Belum ada jadwal. Tambahkan karyawan menggunakan dropdown di atas.
                                </td>
                            </tr>
                        )}
                        {rows.map((row) => (
                            <tr key={row.nik} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ ...tdStyle, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{row.name}</td>
                                <td style={{ ...tdStyle, minWidth: 140 }}>
                                    <Select
                                        size="small"
                                        options={JOBDESC_OPTIONS}
                                        value={row.jobdesc || undefined}
                                        onChange={v => handleJobdescChange(row, v)}
                                        placeholder="Pilih..."
                                        style={{ width: '100%' }}
                                        variant="borderless"
                                        popupMatchSelectWidth={false}
                                    />
                                </td>
                                <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)', fontSize: 12, whiteSpace: 'nowrap' }}>{row.nik}</td>
                                {weekDays.map((d) => {
                                    const shift = row.shifts[d];
                                    const clockIn = shift?.clock_in || 'Off';
                                    const clockOut = shift?.clock_out || '';
                                    const bg = shiftColor(clockIn);
                                    const fg = shiftTextColor(clockIn);
                                    return [
                                        <td key={d + '-in'} style={{ ...tdStyle, background: bg, padding: '2px 4px' }}>
                                            <Select
                                                size="small"
                                                options={CLOCK_IN_WITH_OFF}
                                                value={clockIn}
                                                onChange={v => handleCellChange(row, d, 'clock_in', v)}
                                                variant="borderless"
                                                style={{ width: '100%' }}
                                                popupMatchSelectWidth={false}
                                                dropdownStyle={{ minWidth: 90 }}
                                            />
                                        </td>,
                                        <td key={d + '-out'} style={{
                                            ...tdStyle, background: bg, textAlign: 'center',
                                            color: fg, fontWeight: 600, fontSize: 12,
                                        }}>
                                            {clockIn === 'Off' ? <span style={{ opacity: 0.4 }}>Off</span> :
                                                clockOut ? clockOut.substring(0, 5) : '-'}
                                        </td>,
                                    ];
                                })}
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    <Tooltip title="Hapus dari jadwal minggu ini">
                                        <Popconfirm title={`Hapus ${row.name} dari jadwal?`} onConfirm={() => handleRemoveEmployee(row)} okText="Ya" cancelText="Batal">
                                            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                                        </Popconfirm>
                                    </Tooltip>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                    { label: 'Pagi (07-09)', color: 'rgba(16, 185, 129, 0.25)', text: '#34d399' },
                    { label: 'Siang (10-14)', color: 'rgba(250, 204, 21, 0.18)', text: '#fbbf24' },
                    { label: 'Sore (15-18)', color: 'rgba(239, 68, 68, 0.2)', text: '#f87171' },
                    { label: 'Malam (19-22)', color: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
                ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: l.color, border: `1px solid ${l.text}` }} />
                        <span style={{ color: l.text }}>{l.label}</span>
                    </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Off</span>
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.6)',
    fontSize: 12, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)',
    position: 'sticky', top: 0, background: '#0d1117', zIndex: 2,
};

const thSubStyle: React.CSSProperties = {
    padding: '4px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.4)',
    fontSize: 10, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)',
    position: 'sticky', top: 44, background: '#0d1117', zIndex: 2,
};

const tdStyle: React.CSSProperties = {
    padding: '6px 10px', color: 'rgba(255,255,255,0.85)', fontSize: 13,
    borderBottom: '1px solid rgba(255,255,255,0.04)',
};
