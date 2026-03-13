import { useMemo, useState } from 'react';
import { Card, Tag } from 'antd';
import dayjs from 'dayjs';
import StorageHeatmap from '../../components/StorageHeatmap';

interface Props {
    sohList: any[];
    locations: any[];
}

const ZONES = ['RA', 'RB', 'RC', 'RD', 'RE', 'RF', 'RG'];

export default function DashboardHeatmapTab({ sohList, locations }: Props) {
    const [activeZone, setActiveZone] = useState('RA');

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
            if (!map[loc]) {
                map[loc] = { qty: 0, brand };
            }
            map[loc].qty += qty;
            // Keep dominant brand (first encountered or highest qty)
            if (!map[loc].brand && brand) map[loc].brand = brand;
        });
        return map;
    }, [latestSoh]);

    // Count occupied/total per zone for zone selector badges
    const zoneStats = useMemo(() => {
        const stats: Record<string, { total: number; occupied: number }> = {};
        ZONES.forEach(z => { stats[z] = { total: 0, occupied: 0 }; });
        locations.forEach((l: any) => {
            const locName = (l.location || '').trim();
            ZONES.forEach(z => {
                if (locName.startsWith(z + '-')) {
                    stats[z].total++;
                    if (occupiedMap[locName]) stats[z].occupied++;
                }
            });
        });
        return stats;
    }, [locations, occupiedMap]);

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
                style={{
                    background: '#1a1f3a',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}
                styles={{ header: { color: '#fff' } }}
            >
                {/* Zone selector */}
                <div style={{
                    display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap',
                }}>
                    {ZONES.map(zone => {
                        const st = zoneStats[zone];
                        const isActive = activeZone === zone;
                        const pct = st.total > 0 ? ((st.occupied / st.total) * 100).toFixed(0) : '0';
                        const hasData = st.total > 0;

                        return (
                            <div
                                key={zone}
                                onClick={() => setActiveZone(zone)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 10,
                                    cursor: 'pointer',
                                    background: isActive
                                        ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                        : 'rgba(255,255,255,0.04)',
                                    border: isActive
                                        ? '1px solid rgba(59,130,246,0.5)'
                                        : '1px solid rgba(255,255,255,0.08)',
                                    transition: 'all 0.2s ease',
                                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                    textAlign: 'center',
                                    minWidth: 80,
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
                                        {pct}% used
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Heatmap */}
                <div style={{
                    overflowX: 'auto',
                    padding: '8px 0',
                }}>
                    <StorageHeatmap
                        zone={activeZone}
                        locations={locations}
                        occupiedMap={occupiedMap}
                    />
                </div>
            </Card>

            {/* Overall summary cards */}
            <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
                {ZONES.map(zone => {
                    const st = zoneStats[zone];
                    if (st.total === 0) return null;
                    const pct = ((st.occupied / st.total) * 100).toFixed(1);
                    const pctNum = parseFloat(pct);
                    const color = pctNum >= 80 ? '#ef4444' : pctNum >= 50 ? '#f59e0b' : '#22c55e';
                    return (
                        <div
                            key={zone}
                            onClick={() => setActiveZone(zone)}
                            style={{
                                flex: '1 1 140px',
                                background: activeZone === zone
                                    ? 'linear-gradient(135deg, #1e3a5f, #0f2744)'
                                    : 'rgba(255,255,255,0.03)',
                                border: activeZone === zone
                                    ? '1px solid rgba(59,130,246,0.3)'
                                    : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 12,
                                padding: '14px 18px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: 16 }}>{zone}</span>
                                <Tag color={color} style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{pct}%</Tag>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Occupied</div>
                                    <div style={{ color: '#4ade80', fontWeight: 600, fontSize: 14 }}>{st.occupied}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Empty</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 14 }}>{st.total - st.occupied}</div>
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
