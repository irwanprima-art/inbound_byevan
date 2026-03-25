import { useMemo, useState, useCallback, useEffect } from 'react';
import { Card, Tag, Switch, message } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import StorageHeatmap from '../../components/StorageHeatmap';
import { useAuth } from '../../contexts/AuthContext';
import { heatmapOverridesApi } from '../../api/client';

const CAN_EDIT_ROLES = ['supervisor', 'leader'];

interface Props {
    sohList: any[];
    locations: any[];
}

const ZONES = ['RA', 'RB', 'RC', 'RD', 'RE', 'RF', 'RG'];
const LS_KEY = 'heatmap_manual_overrides'; // kept for migration only

export default function DashboardHeatmapTab({ sohList, locations }: Props) {
    const { user } = useAuth();
    const canEdit = CAN_EDIT_ROLES.includes(user?.role || '');
    const [editMode, setEditMode] = useState(false);
    const [activeZone, setActiveZone] = useState('RA');
    const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});

    // Load overrides from API on mount + migrate localStorage if any
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await heatmapOverridesApi.list();
                const serverData: Record<string, string> = {};
                (res.data as any[]).forEach((r: any) => {
                    serverData[r.location] = r.note || 'Barang diluar system';
                });

                // Migrate localStorage data to server (one-time)
                const lsRaw = localStorage.getItem(LS_KEY);
                if (lsRaw) {
                    try {
                        const lsData: Record<string, string> = JSON.parse(lsRaw);
                        for (const [loc, note] of Object.entries(lsData)) {
                            if (!serverData[loc]) {
                                await heatmapOverridesApi.create({ location: loc, note: note || 'Barang diluar system' });
                                serverData[loc] = note || 'Barang diluar system';
                            }
                        }
                    } catch { /* ignore parse errors */ }
                    localStorage.removeItem(LS_KEY);
                }

                if (!cancelled) setManualOverrides(serverData);
            } catch {
                // Fallback to localStorage if API fails
                try {
                    const raw = localStorage.getItem(LS_KEY);
                    if (!cancelled && raw) setManualOverrides(JSON.parse(raw));
                } catch { /* ignore */ }
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleToggleManual = useCallback(async (locName: string, note?: string) => {
        if (note !== undefined) {
            // Add override
            try {
                await heatmapOverridesApi.create({ location: locName, note: note || 'Barang diluar system' });
                setManualOverrides(prev => ({ ...prev, [locName]: note || 'Barang diluar system' }));
            } catch {
                message.error('Gagal menyimpan override');
            }
        } else {
            // Remove override — find the ID first from the server
            try {
                const res = await heatmapOverridesApi.list();
                const record = (res.data as any[]).find((r: any) => r.location === locName);
                if (record) await heatmapOverridesApi.remove(record.id);
                setManualOverrides(prev => {
                    const next = { ...prev };
                    delete next[locName];
                    return next;
                });
            } catch {
                message.error('Gagal menghapus override');
            }
        }
    }, []);

    // Only use records from the latest update_date (most recent snapshot)
    const latestDateStr = sohList.reduce((latest: string, s: any) => {
        if (s.update_date && s.update_date > latest) return s.update_date;
        return latest;
    }, '');
    const latestPrefix = latestDateStr ? latestDateStr.substring(0, 10) : '';
    const latestSoh = latestPrefix ? sohList.filter((s: any) => (s.update_date || '').startsWith(latestPrefix)) : sohList;

    // Build occupied map: location -> { qty, brand }
    const occupiedMap = useMemo(() => {
        const map: Record<string, { qty: number; brand: string }> = {};
        latestSoh.forEach((s: any) => {
            const loc = (s.location || '').trim();
            const qty = parseInt(s.qty) || 0;
            const brand = (s.brand || '').trim();
            if (!loc || qty <= 0) return;
            if (!map[loc]) map[loc] = { qty: 0, brand };
            map[loc].qty += qty;
            if (!map[loc].brand && brand) map[loc].brand = brand;
        });
        return map;
    }, [latestSoh]);

    // Count per zone (including manual)
    const zoneStats = useMemo(() => {
        const stats: Record<string, { total: number; occupied: number; manual: number }> = {};
        ZONES.forEach(z => { stats[z] = { total: 0, occupied: 0, manual: 0 }; });
        locations.forEach((l: any) => {
            const locName = (l.location || '').trim();
            ZONES.forEach(z => {
                if (locName.startsWith(z + '-')) {
                    stats[z].total++;
                    if (occupiedMap[locName]) stats[z].occupied++;
                    else if (manualOverrides[locName]) stats[z].manual++;
                }
            });
        });
        return stats;
    }, [locations, occupiedMap, manualOverrides]);

    return (
        <>
            <Card
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span>🗺️ Storage Heatmap</span>
                        {latestDateStr && (
                            <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>
                                📆 Data: {dayjs(latestDateStr).format('DD MMM YYYY')}
                            </span>
                        )}
                    </div>
                }
                extra={
                    canEdit ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <EyeOutlined style={{ color: !editMode ? '#60a5fa' : 'rgba(255,255,255,0.3)' }} />
                            <Switch
                                checked={editMode}
                                onChange={setEditMode}
                                size="small"
                                style={{ background: editMode ? '#f59e0b' : undefined }}
                            />
                            <EditOutlined style={{ color: editMode ? '#f59e0b' : 'rgba(255,255,255,0.3)' }} />
                            <span style={{
                                fontSize: 12, fontWeight: 600,
                                color: editMode ? '#f59e0b' : '#60a5fa',
                            }}>
                                {editMode ? 'Edit Mode' : 'View Mode'}
                            </span>
                        </div>
                    ) : null
                }
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)' }}
                styles={{ header: { color: '#fff' } }}
            >
                {/* Zone selector */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    {ZONES.map(zone => {
                        const st = zoneStats[zone];
                        const isActive = activeZone === zone;
                        const usedPct = st.total > 0 ? (((st.occupied + st.manual) / st.total) * 100).toFixed(0) : '0';
                        const hasData = st.total > 0;

                        return (
                            <div
                                key={zone}
                                onClick={() => setActiveZone(zone)}
                                style={{
                                    padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                                    background: isActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.04)',
                                    border: isActive ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                    transition: 'all 0.2s ease',
                                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                    textAlign: 'center', minWidth: 80,
                                }}
                            >
                                <div style={{
                                    fontWeight: 700, fontSize: 15,
                                    color: isActive ? '#fff' : hasData ? '#60a5fa' : 'rgba(255,255,255,0.3)',
                                }}>
                                    {zone}
                                </div>
                                {hasData && (
                                    <div style={{
                                        fontSize: 11,
                                        color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
                                        marginTop: 2,
                                    }}>
                                        {usedPct}% used
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Heatmap */}
                <div style={{ overflowX: 'auto', padding: '8px 0' }}>
                    <StorageHeatmap
                        zone={activeZone}
                        locations={locations}
                        occupiedMap={occupiedMap}
                        manualOverrides={manualOverrides}
                        onToggleManual={handleToggleManual}
                        editMode={editMode}
                    />
                </div>
            </Card>

            {/* Overall summary cards */}
            <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
                {ZONES.map(zone => {
                    const st = zoneStats[zone];
                    if (st.total === 0) return null;
                    const totalUsed = st.occupied + st.manual;
                    const pct = ((totalUsed / st.total) * 100).toFixed(1);
                    const pctNum = parseFloat(pct);
                    const color = pctNum >= 80 ? '#ef4444' : pctNum >= 50 ? '#f59e0b' : '#22c55e';
                    const empty = st.total - totalUsed;
                    return (
                        <div
                            key={zone}
                            onClick={() => setActiveZone(zone)}
                            style={{
                                flex: '1 1 140px',
                                background: activeZone === zone ? 'linear-gradient(135deg, #1e3a5f, #0f2744)' : 'rgba(255,255,255,0.03)',
                                border: activeZone === zone ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: 16 }}>{zone}</span>
                                <Tag color={color} style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{pct}%</Tag>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>System</div>
                                    <div style={{ color: '#4ade80', fontWeight: 600, fontSize: 14 }}>{st.occupied}</div>
                                </div>
                                {st.manual > 0 && (
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Manual</div>
                                        <div style={{ color: '#f59e0b', fontWeight: 600, fontSize: 14 }}>{st.manual}</div>
                                    </div>
                                )}
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Empty</div>
                                    <div style={{ color: '#f87171', fontWeight: 600, fontSize: 14 }}>{empty}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Total</div>
                                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{st.total}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
