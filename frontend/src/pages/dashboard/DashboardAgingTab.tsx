import { useState } from 'react';
import { Card, Tag, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import ResizableTable from '../../components/ResizableTable';
import dayjs from 'dayjs';

interface Props {
    sohList: any[];
    locations: any[];
    sections?: string[];
}

export default function DashboardAgingTab({ sohList, locations, sections }: Props) {
    const show = (key: string) => !sections || sections.includes(key);
    const navigate = useNavigate();
    // Backend returns consistent YYYY-MM-DD via FlexDate
    const parseDate = (s: string) => {
        if (!s) return null;
        const d = dayjs(s);
        return d.isValid() ? d : null;
    };

    const calcEdNote = (expStr: string, updateStr: string) => {
        if (!expStr?.trim()) return 'No Expiry Date';
        const exp = parseDate(expStr); if (!exp) return 'No Expiry Date';
        const ref = parseDate(updateStr) || dayjs();
        const diff = exp.diff(ref, 'day');
        if (diff < 0) return 'Expired';
        if (diff <= 30) return 'NED 1 Month';
        if (diff <= 60) return 'NED 2 Month';
        if (diff <= 90) return 'NED 3 Month';
        if (diff <= 180) return '3 - 6 Month';
        if (diff <= 365) return '6 - 12 Month';
        return '1yr++';
    };

    const calcAgingNote = (whStr: string) => {
        const d = parseDate(whStr); if (!d) return '-';
        const y = d.year(); const m = d.month() + 1;
        if (y < 2025) return 'Under 2025';
        const q = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';
        return `${q} ${y}`;
    };

    const edNoteColor = (note: string): string => {
        if (note === 'Expired') return '#ef4444';
        if (note === 'NED 1 Month') return '#ea580c';
        if (note === 'NED 2 Month') return '#f59e0b';
        if (note === 'NED 3 Month') return '#eab308';
        if (note === '3 - 6 Month') return '#84cc16';
        if (note === '6 - 12 Month') return '#22c55e';
        if (note === '1yr++') return '#06b6d4';
        if (note === 'No Expiry Date') return '#a855f7';
        return '#6b7280';
    };

    // Build location -> location_category map
    const locCatMap: Record<string, string> = {};
    locations.forEach((loc: any) => {
        if (loc.location && loc.location_category) {
            locCatMap[loc.location] = loc.location_category;
        }
    });

    // Only use records from the latest update_date (most recent snapshot)
    const latestDateStr = sohList.reduce((latest: string, s: any) => {
        if (s.update_date && s.update_date > latest) return s.update_date;
        return latest;
    }, '');
    const latestDatePrefix = latestDateStr ? latestDateStr.substring(0, 10) : '';

    const sellable = sohList.filter((s: any) => {
        const cat = locCatMap[s.location] || s.location_category || '';
        const dateOk = latestDatePrefix ? (s.update_date || '').startsWith(latestDatePrefix) : true;
        return cat === 'Sellable' && (Number(s.qty) || 0) > 0 && dateOk;
    });

    // ED Note pivot
    const edCats = ['Expired', 'NED 1 Month', 'NED 2 Month', 'NED 3 Month', '3 - 6 Month', '6 - 12 Month', '1yr++', 'No Expiry Date'];
    const edMap: Record<string, Record<string, number>> = {};
    sellable.forEach((s: any) => {
        const brand = ((s.brand || '').trim() || 'Unknown').toUpperCase();
        const ed = calcEdNote(s.exp_date, s.update_date);
        if (!edMap[brand]) edMap[brand] = {};
        edMap[brand][ed] = (edMap[brand][ed] || 0) + (Number(s.qty) || 0);
    });
    const edRows = Object.entries(edMap)
        .map(([brand, cats]) => ({ brand, ...cats, key: `ed_${brand}` }))
        .sort((a, b) => a.brand.localeCompare(b.brand));
    // Total row for ED Note
    const edTotal: Record<string, any> = { brand: 'TOTAL', key: 'ed_TOTAL', _isTotal: true };
    edCats.forEach(cat => {
        edTotal[cat] = edRows.reduce((sum, r) => sum + ((r as any)[cat] || 0), 0);
    });
    const edRowsWithTotal = [edTotal, ...edRows];

    // Aging Note pivot
    const agingMap: Record<string, Record<string, number>> = {};
    sellable.forEach((s: any) => {
        const brand = ((s.brand || '').trim() || 'Unknown').toUpperCase();
        const aging = calcAgingNote(s.wh_arrival_date);
        if (aging === '-') return;
        if (!agingMap[brand]) agingMap[brand] = {};
        agingMap[brand][aging] = (agingMap[brand][aging] || 0) + (Number(s.qty) || 0);
    });
    const agingCats = [...new Set(sellable.map((s: any) => calcAgingNote(s.wh_arrival_date)).filter(v => v !== '-'))].sort((a, b) => {
        if (a === 'Under 2025') return -1;
        if (b === 'Under 2025') return 1;
        const [qa, ya] = a.split(' ');
        const [qb, yb] = b.split(' ');
        const yearDiff = Number(ya) - Number(yb);
        if (yearDiff !== 0) return yearDiff;
        return qa.localeCompare(qb);
    });
    const agingRows = Object.entries(agingMap)
        .map(([brand, cats]) => ({ brand, ...cats, key: `aging_${brand}` }))
        .sort((a, b) => a.brand.localeCompare(b.brand));
    // Total row for Aging Note
    const agingTotal: Record<string, any> = { brand: 'TOTAL', key: 'aging_TOTAL', _isTotal: true };
    agingCats.forEach(cat => {
        agingTotal[cat] = agingRows.reduce((sum, r) => sum + ((r as any)[cat] || 0), 0);
    });
    const agingRowsWithTotal = [agingTotal, ...agingRows];

    // Critical ED items
    const criticalNotes = ['Expired', 'NED 1 Month', 'NED 2 Month', 'NED 3 Month'];
    const criticalItems = sellable
        .filter((s: any) => criticalNotes.includes(calcEdNote(s.exp_date, s.update_date)))
        .map((s: any, i: number) => ({
            key: `crit_${i}`,
            brand: ((s.brand || '').trim() || 'Unknown').toUpperCase(),
            sku: s.sku || '-',
            qty: Number(s.qty) || 0,
            exp_date: s.exp_date || '-',
            ed_note: calcEdNote(s.exp_date, s.update_date),
        }))
        .sort((a, b) => {
            const order = criticalNotes;
            return order.indexOf(a.ed_note) - order.indexOf(b.ed_note) || a.brand.localeCompare(b.brand);
        });
    // Latest update date
    const latestUpdate = sohList.reduce((latest: string, s: any) => {
        if (s.update_date && s.update_date > latest) return s.update_date;
        return latest;
    }, '');

    // === FIFO & FEFO Alert computation ===
    // Use sellable records from latest update date (already filtered above)
    const pickMaxArrival: Record<string, string> = {};
    const pickMaxExp: Record<string, string> = {};
    sellable.forEach((s: any) => {
        const locType = (s.location_type || '').trim();
        if (locType !== 'Pick') return;
        const sku = s.sku;
        if (!sku) return;
        if (s.wh_arrival_date && (!pickMaxArrival[sku] || s.wh_arrival_date > pickMaxArrival[sku])) pickMaxArrival[sku] = s.wh_arrival_date;
        if (s.exp_date && (!pickMaxExp[sku] || s.exp_date > pickMaxExp[sku])) pickMaxExp[sku] = s.exp_date;
    });

    // FIFO alert items: Storage records with older arrival than newest Pick arrival (or no Pick at all)
    const fifoAlertItems = sellable
        .filter((s: any) => {
            const locType = (s.location_type || '').trim();
            if (locType !== 'Storage') return false;
            if (!s.wh_arrival_date || !s.sku) return false;
            const maxPick = pickMaxArrival[s.sku];
            return !maxPick || s.wh_arrival_date < maxPick;
        })
        .map((s: any, i: number) => ({
            key: `fifo_${i}`,
            brand: ((s.brand || '').trim() || 'Unknown').toUpperCase(),
            sku: s.sku || '-',
            wh_arrival_date: s.wh_arrival_date || '-',
            location: s.location || '-',
            qty: Number(s.qty) || 0,
            aging_note: calcAgingNote(s.wh_arrival_date),
        }))
        .sort((a, b) => a.wh_arrival_date.localeCompare(b.wh_arrival_date) || a.brand.localeCompare(b.brand));

    // FEFO alert items: Storage records with closer expiry than furthest Pick expiry (or no Pick at all)
    const fefoAlertItems = sellable
        .filter((s: any) => {
            const locType = (s.location_type || '').trim();
            if (locType !== 'Storage') return false;
            if (!s.exp_date || !s.sku) return false;
            const maxPick = pickMaxExp[s.sku];
            return !maxPick || s.exp_date < maxPick;
        })
        .map((s: any, i: number) => ({
            key: `fefo_${i}`,
            brand: ((s.brand || '').trim() || 'Unknown').toUpperCase(),
            sku: s.sku || '-',
            exp_date: s.exp_date || '-',
            location: s.location || '-',
            qty: Number(s.qty) || 0,
            ed_note: calcEdNote(s.exp_date, s.update_date),
        }))
        .sort((a, b) => a.exp_date.localeCompare(b.exp_date) || a.brand.localeCompare(b.brand));

    // Brand options for FIFO/FEFO filters
    const fifoBrands = [...new Set(fifoAlertItems.map(r => r.brand))].sort();
    const fefoBrands = [...new Set(fefoAlertItems.map(r => r.brand))].sort();

    return (
        <>
            {show('ed_note') && <Card
                title={<span>📅 ED Note by Brand {latestUpdate && <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)', marginLeft: 12 }}>📆 Data Update: {dayjs(latestUpdate).format('DD MMM YYYY')}</span>}</span>}
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}
                styles={{ header: { color: '#fff' }, body: { overflow: 'hidden' } }}
            >
                <ResizableTable
                    dataSource={edRowsWithTotal}
                    columns={[
                        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 140, render: (v: string, r: any) => r._isTotal ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                        ...edCats.map(cat => ({
                            title: <span style={{ color: '#fff', background: edNoteColor(cat), padding: '2px 8px', borderRadius: 4, fontSize: 11, whiteSpace: 'nowrap' as const }}>{cat}</span>,
                            dataIndex: cat, key: cat, width: 130,
                            render: (v: number, r: any) => {
                                if (!v) return <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>;
                                const brand = r.brand;
                                const isTotalRow = r._isTotal;
                                return (
                                    <span
                                        style={{ color: isTotalRow ? '#fff' : edNoteColor(cat), fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' as const }}
                                        onClick={() => {
                                            const params = new URLSearchParams();
                                            params.set('edNote', cat);
                                            params.set('locCategory', 'Sellable');
                                            if (!isTotalRow) params.set('brand', brand);
                                            navigate(`/soh?${params.toString()}`);
                                        }}
                                    >
                                        {v.toLocaleString()}
                                    </span>
                                );
                            },
                        })),
                    ]}
                    rowKey="key"
                    size="small"
                    scroll={{ x: 'max-content', y: 500 }}
                    pagination={false}
                    onRow={(record: any) => ({
                        style: record._isTotal ? { background: 'rgba(99,102,241,0.18)', fontWeight: 700 } : undefined,
                    })}
                />
            </Card>}

            {show('critical_ed') && criticalItems.length > 0 && (
                <Card
                    title={`⚠️ Critical ED Stock (Expired – NED 3 Month) — ${criticalItems.length} items`}
                    style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24, overflow: 'hidden', position: 'relative' }}
                    styles={{ header: { color: '#ff6b6b' }, body: { overflow: 'hidden' } }}
                >
                    <ResizableTable
                        dataSource={criticalItems}
                        columns={[
                            { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 150 },
                            { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 200 },
                            { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 100, render: (v: number) => <span style={{ color: '#60a5fa', fontWeight: 600 }}>{v.toLocaleString()}</span> },
                            { title: 'Exp. Date', dataIndex: 'exp_date', key: 'exp_date', width: 120 },
                            { title: 'ED Note', dataIndex: 'ed_note', key: 'ed_note', width: 140, render: (v: string) => <span style={{ color: '#fff', background: edNoteColor(v), padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{v}</span> },
                        ]}
                        rowKey="key"
                        size="small"
                        scroll={{ x: 'max-content', y: 400 }}
                        pagination={false}
                    />
                </Card>
            )}

            {show('aging_note') && <Card
                title="📦 Aging Note by Brand"
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24, overflow: 'hidden', position: 'relative' }}
                styles={{ header: { color: '#fff' }, body: { overflow: 'hidden' } }}
            >
                <ResizableTable
                    dataSource={agingRowsWithTotal}
                    columns={[
                        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 140, render: (v: string, r: any) => r._isTotal ? <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span> : v },
                        ...agingCats.map(cat => ({
                            title: cat, dataIndex: cat, key: cat, width: 120,
                            render: (v: number, r: any) => {
                                if (!v) return <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>;
                                const brand = r.brand;
                                const isTotalRow = r._isTotal;
                                return (
                                    <span
                                        style={{ color: isTotalRow ? '#fff' : '#60a5fa', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' as const }}
                                        onClick={() => {
                                            const params = new URLSearchParams();
                                            params.set('agingNote', cat);
                                            params.set('locCategory', 'Sellable');
                                            if (!isTotalRow) params.set('brand', brand);
                                            navigate(`/soh?${params.toString()}`);
                                        }}
                                    >
                                        {v.toLocaleString()}
                                    </span>
                                );
                            },
                        })),
                    ]}
                    rowKey="key"
                    size="small"
                    scroll={{ x: 'max-content', y: 500 }}
                    pagination={false}
                    onRow={(record: any) => ({
                        style: record._isTotal ? { background: 'rgba(99,102,241,0.18)', fontWeight: 700 } : undefined,
                    })}
                />
            </Card>}

            {show('fifo_alert') && fifoAlertItems.length > 0 && (
                <FifoFefoCard
                    title={`🔴 FIFO Alert — ${fifoAlertItems.length} items`}
                    headerColor="#ef4444"
                    items={fifoAlertItems}
                    brands={fifoBrands}
                    dateField="wh_arrival_date"
                    dateLabel="WH Arrival Date"
                    tagColor="red"
                    tagLabel="FIFO"
                    extraField="aging_note"
                    extraLabel="Aging Note"
                    extraColorFn={(v: string) => {
                        if (v === 'Under 2025') return '#6b7280';
                        if (v?.startsWith('Q1')) return '#3b82f6';
                        if (v?.startsWith('Q2')) return '#8b5cf6';
                        if (v?.startsWith('Q3')) return '#ec4899';
                        if (v?.startsWith('Q4')) return '#f97316';
                        return '#6366f1';
                    }}
                />
            )}

            {show('fefo_alert') && fefoAlertItems.length > 0 && (
                <FifoFefoCard
                    title={`🟠 FEFO Alert — ${fefoAlertItems.length} items`}
                    headerColor="#f97316"
                    items={fefoAlertItems}
                    brands={fefoBrands}
                    dateField="exp_date"
                    dateLabel="Exp. Date"
                    tagColor="orange"
                    tagLabel="FEFO"
                    extraField="ed_note"
                    extraLabel="ED Note"
                    extraColorFn={edNoteColor}
                />
            )}
        </>
    );
}

// Reusable sub-component for FIFO/FEFO alert cards with brand filter
function FifoFefoCard({ title, headerColor, items, brands, dateField, dateLabel, tagColor, tagLabel, extraField, extraLabel, extraColorFn }: {
    title: string; headerColor: string; items: any[]; brands: string[];
    dateField: string; dateLabel: string; tagColor: string; tagLabel: string;
    extraField?: string; extraLabel?: string; extraColorFn?: (v: string) => string;
}) {
    const [filterBrand, setFilterBrand] = useState<string[]>([]);
    const filtered = filterBrand.length > 0 ? items.filter(r => filterBrand.includes(r.brand)) : items;

    const columns: any[] = [
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 150 },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 200 },
        { title: dateLabel, dataIndex: dateField, key: dateField, width: 130 },
        { title: 'Location', dataIndex: 'location', key: 'location', width: 120 },
        {
            title: 'Qty', dataIndex: 'qty', key: 'qty', width: 100,
            render: (v: number) => <span style={{ color: '#60a5fa', fontWeight: 600 }}>{v.toLocaleString()}</span>,
        },
    ];
    if (extraField && extraLabel) {
        columns.push({
            title: extraLabel, dataIndex: extraField, key: extraField, width: 130,
            render: (v: string) => {
                if (!v || v === '-') return <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>;
                const color = extraColorFn ? extraColorFn(v) : '#6366f1';
                return <Tag style={{ background: color, color: '#fff', border: 'none', fontWeight: 600 }}>{v}</Tag>;
            },
        });
    }
    columns.push({
        title: 'Alert', key: 'alert', width: 100,
        render: () => <Tag color={tagColor} style={{ fontWeight: 600 }}>⚠️ {tagLabel}</Tag>,
    });

    return (
        <Card
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span>{title}</span>
                    <Select
                        mode="multiple" allowClear placeholder="Filter Brand" maxTagCount="responsive"
                        options={brands.map(b => ({ label: b, value: b }))}
                        value={filterBrand} onChange={setFilterBrand}
                        style={{ minWidth: 200, maxWidth: 400 }}
                        size="small"
                    />
                </div>
            }
            style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', marginTop: 24, overflow: 'hidden', position: 'relative' }}
            styles={{ header: { color: headerColor }, body: { overflow: 'hidden' } }}
        >
            <ResizableTable
                dataSource={filtered}
                columns={columns}
                rowKey="key"
                size="small"
                scroll={{ x: 'max-content', y: 400 }}
                pagination={false}
            />
        </Card>
    );
}
