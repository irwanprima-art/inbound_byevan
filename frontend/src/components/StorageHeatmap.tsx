import { useMemo, useState } from 'react';
import { Tooltip, Tag } from 'antd';

interface Props {
    zone: string;
    locations: any[];
    occupiedMap: Record<string, { qty: number; brand: string }>;
}

/**
 * Parse location name like "RA-01-A-04-01" into structured parts.
 * Format: Zone-Bay-Aisle-Level-Bin
 */
function parseLocation(locName: string) {
    const parts = locName.split('-');
    if (parts.length < 5) return null;
    return {
        zone: parts[0],
        bay: parts[1],
        aisle: parts[2],
        level: parseInt(parts[3]) || 0,
        bin: parts[4],
        raw: locName,
    };
}

export default function StorageHeatmap({ zone, locations, occupiedMap }: Props) {
    const [hoveredLoc, setHoveredLoc] = useState<string | null>(null);

    // Parse all locations belonging to this zone
    const parsed = useMemo(() => {
        return locations
            .map((l: any) => {
                const locName = (l.location || '').trim();
                if (!locName.startsWith(zone + '-')) return null;
                const p = parseLocation(locName);
                if (!p) return null;
                return { ...p, locationType: (l.location_type || '').trim() };
            })
            .filter(Boolean) as {
                zone: string; bay: string; aisle: string; level: number; bin: string; raw: string; locationType: string;
            }[];
    }, [locations, zone]);

    // Get unique aisles, sorted
    const aisles = useMemo(() =>
        [...new Set(parsed.map(p => p.aisle))].sort(),
        [parsed]);

    // Get unique bays, sorted
    const bays = useMemo(() =>
        [...new Set(parsed.map(p => p.bay))].sort(),
        [parsed]);

    // Get unique bins per bay (should be consistent across bays)
    const bins = useMemo(() =>
        [...new Set(parsed.map(p => p.bin))].sort(),
        [parsed]);

    // Build lookup: key = "aisle|bay|level|bin" -> location info
    const locLookup = useMemo(() => {
        const map: Record<string, { raw: string; locationType: string }> = {};
        parsed.forEach(p => {
            map[`${p.aisle}|${p.bay}|${p.level}|${p.bin}`] = { raw: p.raw, locationType: p.locationType };
        });
        return map;
    }, [parsed]);

    // Summary stats for this zone
    const stats = useMemo(() => {
        const allLocs = parsed.map(p => p.raw);
        const total = allLocs.length;
        const occupied = allLocs.filter(l => occupiedMap[l]).length;
        return { total, occupied, empty: total - occupied, pct: total > 0 ? ((occupied / total) * 100).toFixed(1) : '0.0' };
    }, [parsed, occupiedMap]);

    if (parsed.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
                Tidak ada data lokasi untuk zone <strong>{zone}</strong>
            </div>
        );
    }

    // Color for a cell
    const getCellColor = (locName: string | null, isHovered: boolean) => {
        if (!locName) return 'rgba(255,255,255,0.03)'; // no location exists
        const occ = occupiedMap[locName];
        if (isHovered) return occ ? '#22d3ee' : 'rgba(255,255,255,0.2)';
        if (occ) {
            // Color intensity based on qty
            const qty = occ.qty || 0;
            if (qty >= 500) return '#16a34a';
            if (qty >= 100) return '#22c55e';
            if (qty >= 10) return '#4ade80';
            return '#86efac';
        }
        return 'rgba(255,255,255,0.06)'; // empty
    };

    const cellSize = 28;
    const cellGap = 2;

    return (
        <div>
            {/* Zone summary */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                    Total: {stats.total} lokasi
                </Tag>
                <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                    Occupied: {stats.occupied} ({stats.pct}%)
                </Tag>
                <Tag color="default" style={{ fontSize: 14, padding: '4px 12px' }}>
                    Empty: {stats.empty} ({stats.total > 0 ? (100 - parseFloat(stats.pct)).toFixed(1) : '0.0'}%)
                </Tag>
            </div>

            {/* Heatmap grid per aisle */}
            {aisles.map(aisle => {
                const aisleData = parsed.filter(p => p.aisle === aisle);
                const aisleLevels = [...new Set(aisleData.map(p => p.level))].sort((a, b) => a - b);
                // Determine level order: odd aisles (A, C, E) bottom-up, even aisles (B, D, F) top-down
                const aisleIndex = aisle.charCodeAt(0) - 'A'.charCodeAt(0);
                const isOddAisle = aisleIndex % 2 === 0; // A=0 (even char index = bottom-up)
                const levelOrder = isOddAisle
                    ? [...aisleLevels].reverse() // A: Level 4 at top, Level 1 at bottom
                    : aisleLevels; // B: Level 1 at top, Level 4 at bottom

                return (
                    <div key={aisle} style={{ marginBottom: 20 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                        }}>
                            <span style={{
                                color: '#60a5fa', fontWeight: 700, fontSize: 13,
                                background: 'rgba(59,130,246,0.15)',
                                padding: '2px 10px', borderRadius: 6,
                            }}>
                                AISLE {aisle}
                            </span>
                        </div>

                        {/* Bay headers */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 4 }}>
                            <div style={{ width: 60, flexShrink: 0 }} /> {/* label spacer */}
                            {bays.map(bay => (
                                <div key={bay} style={{
                                    width: bins.length * (cellSize + cellGap),
                                    textAlign: 'center',
                                    color: 'rgba(255,255,255,0.5)',
                                    fontSize: 11,
                                    fontWeight: 600,
                                }}>
                                    BAY {bay}
                                </div>
                            ))}
                        </div>

                        {/* Level rows */}
                        {levelOrder.map(level => (
                            <div key={level} style={{ display: 'flex', alignItems: 'center', marginBottom: cellGap }}>
                                <div style={{
                                    width: 60, flexShrink: 0,
                                    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500,
                                    textAlign: 'right', paddingRight: 8,
                                }}>
                                    Level {level}
                                </div>
                                {bays.map(bay => (
                                    <div key={bay} style={{ display: 'flex', gap: cellGap, marginRight: cellGap * 2 }}>
                                        {bins.map(bin => {
                                            const key = `${aisle}|${bay}|${level}|${bin}`;
                                            const loc = locLookup[key];
                                            const locName = loc?.raw || null;
                                            const occ = locName ? occupiedMap[locName] : null;
                                            const isHovered = hoveredLoc === locName;

                                            const cell = (
                                                <div
                                                    key={bin}
                                                    onMouseEnter={() => locName && setHoveredLoc(locName)}
                                                    onMouseLeave={() => setHoveredLoc(null)}
                                                    style={{
                                                        width: cellSize,
                                                        height: cellSize,
                                                        borderRadius: 4,
                                                        background: getCellColor(locName, isHovered),
                                                        border: isHovered
                                                            ? '2px solid #22d3ee'
                                                            : '1px solid rgba(255,255,255,0.08)',
                                                        cursor: locName ? 'pointer' : 'default',
                                                        transition: 'all 0.15s ease',
                                                        transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                                                        zIndex: isHovered ? 10 : 1,
                                                        position: 'relative',
                                                    }}
                                                />
                                            );

                                            if (!locName) return <div key={bin} style={{ width: cellSize, height: cellSize }} />;

                                            return (
                                                <Tooltip
                                                    key={bin}
                                                    title={
                                                        <div style={{ fontSize: 12 }}>
                                                            <div style={{ fontWeight: 700 }}>{locName}</div>
                                                            {occ ? (
                                                                <>
                                                                    <div>Qty: <span style={{ color: '#4ade80' }}>{occ.qty.toLocaleString()}</span></div>
                                                                    {occ.brand && <div>Brand: {occ.brand}</div>}
                                                                </>
                                                            ) : (
                                                                <div style={{ color: 'rgba(255,255,255,0.5)' }}>Empty</div>
                                                            )}
                                                        </div>
                                                    }
                                                    mouseEnterDelay={0}
                                                    mouseLeaveDelay={0}
                                                >
                                                    {cell}
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Bin labels under first bay */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: 60, flexShrink: 0 }} />
                            {bays.map((bay, bayIdx) => (
                                <div key={bay} style={{ display: 'flex', gap: cellGap, marginRight: cellGap * 2 }}>
                                    {bins.map(bin => (
                                        <div key={bin} style={{
                                            width: cellSize,
                                            textAlign: 'center',
                                            color: 'rgba(255,255,255,0.25)',
                                            fontSize: 9,
                                        }}>
                                            {bayIdx === 0 ? `B${bin}` : ''}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Legend */}
            <div style={{
                display: 'flex', gap: 16, marginTop: 16, padding: '10px 16px',
                background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                alignItems: 'center', flexWrap: 'wrap',
            }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>Legend:</span>
                {[
                    { color: '#16a34a', label: '≥500 qty' },
                    { color: '#22c55e', label: '≥100 qty' },
                    { color: '#4ade80', label: '≥10 qty' },
                    { color: '#86efac', label: '<10 qty' },
                    { color: 'rgba(255,255,255,0.06)', label: 'Empty', border: true },
                ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                            width: 14, height: 14, borderRadius: 3,
                            background: item.color,
                            border: item.border ? '1px solid rgba(255,255,255,0.15)' : 'none',
                        }} />
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
