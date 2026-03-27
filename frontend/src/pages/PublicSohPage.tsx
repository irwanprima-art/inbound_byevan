import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Button, Space, Tag, Select, Input, DatePicker, ConfigProvider, theme, Typography, message, Popover, Badge } from 'antd';
import { DownloadOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { publicApi } from '../api/client';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;

const parseDate = (s: string) => { if (!s) return null; const d = dayjs(s); return d.isValid() ? d : null; };
const calcWeek = (dateStr: string): string => {
    const d = parseDate(dateStr); if (!d) return '-';
    return `Week ${Math.ceil(d.date() / 7)} ${d.format('MMM')}`;
};
const calcEdNote = (expStr: string, updateStr: string): string => {
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
const calcAgingNote = (whStr: string): string => {
    const d = parseDate(whStr); if (!d) return '-';
    const y = d.year(); const m = d.month() + 1;
    if (y < 2025) return 'Under 2025';
    const q = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';
    return `${q} ${y}`;
};
const edNoteColor = (note: string): string => {
    if (note === 'Expired') return 'red'; if (note === 'NED 1 Month') return 'volcano';
    if (note === 'NED 2 Month') return 'orange'; if (note === 'NED 3 Month') return 'gold';
    if (note === '3 - 6 Month') return 'lime'; if (note === '6 - 12 Month') return 'green';
    if (note === '1yr++') return 'cyan'; if (note === 'No Expiry Date') return 'purple';
    return 'default';
};

interface SohRecord {
    id: number; location: string; location_category: string; sku: string; sku_category: string;
    brand: string; zone: string; location_type: string; owner: string; status: string;
    qty: number; wh_arrival_date: string; receipt_no: string; mfg_date: string;
    exp_date: string; batch_no: string; update_date: string;
}

export default function PublicSohPage() {
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<SohRecord[]>([]);
    const [locCategoryMap, setLocCategoryMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [filterEdNote, setFilterEdNote] = useState<string[]>(() => { const v = searchParams.get('edNote'); return v ? v.split(',') : []; });
    const [filterLocCategory, setFilterLocCategory] = useState<string[]>(() => { const v = searchParams.get('locCategory'); return v ? v.split(',') : []; });
    const [filterBrand, setFilterBrand] = useState<string[]>(() => { const v = searchParams.get('brand'); return v ? v.split(',') : []; });
    const [filterAgingNote, setFilterAgingNote] = useState<string[]>(() => { const v = searchParams.get('agingNote'); return v ? v.split(',') : []; });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [sohRes, locRes] = await Promise.all([publicApi.sohList(), publicApi.locationsList()]);
            setData((sohRes.data || []) as SohRecord[]);
            const map: Record<string, string> = {};
            ((locRes.data || []) as any[]).forEach((loc: any) => { if (loc.location && loc.location_category) map[loc.location] = loc.location_category; });
            setLocCategoryMap(map);
        } catch { message.error('Gagal memuat data'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const searchTerms = search.split('\n').map(t => t.trim().toLowerCase()).filter(Boolean);

    const filteredData = data.filter(r => {
        if (dateRange) {
            const d = dayjs(r.update_date);
            if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false;
        }
        if (filterEdNote.length > 0) { if (!filterEdNote.includes(calcEdNote(r.exp_date, r.update_date))) return false; }
        if (filterLocCategory.length > 0) { const cat = locCategoryMap[r.location] || r.location_category || ''; if (!filterLocCategory.includes(cat)) return false; }
        if (filterBrand.length > 0) { const bu = (r.brand || '').toUpperCase(); if (!filterBrand.some(fb => fb.toUpperCase() === bu)) return false; }
        if (filterAgingNote.length > 0) { if (!filterAgingNote.includes(calcAgingNote(r.wh_arrival_date))) return false; }
        if (searchTerms.length === 0) return true;
        return searchTerms.some(q => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
    });

    const edNoteOptions = [...new Set(data.map(r => calcEdNote(r.exp_date, r.update_date)))].sort().map(v => ({ label: v, value: v }));
    const locCategoryOptions = [...new Set(data.map(r => locCategoryMap[r.location] || r.location_category || '').filter(Boolean))].sort().map(v => ({ label: v, value: v }));
    const brandOptions = [...new Set(data.map(r => r.brand).filter(Boolean))].sort().map(v => ({ label: v, value: v }));
    const agingNoteOptions = [...new Set(data.map(r => calcAgingNote(r.wh_arrival_date)).filter(v => v !== '-'))].sort().map(v => ({ label: v, value: v }));

    const handleExport = () => {
        const hdr = ['location', 'location_category', 'sku', 'sku_category', 'brand', 'zone', 'location_type', 'owner', 'status', 'qty', 'wh_arrival_date', 'receipt_no', 'mfg_date', 'exp_date', 'batch_no', 'update_date', 'week', 'ed_note', 'aging_note', 'fifo_alert', 'fefo_alert'];
        const rows = filteredData.map(r => [
            r.location, locCategoryMap[r.location] || r.location_category || '', r.sku, r.sku_category, r.brand, r.zone,
            r.location_type, r.owner, r.status, r.qty, r.wh_arrival_date, r.receipt_no, r.mfg_date, r.exp_date, r.batch_no, r.update_date,
            calcWeek(r.update_date || r.wh_arrival_date), calcEdNote(r.exp_date, r.update_date), calcAgingNote(r.wh_arrival_date), getFifoAlert(r), getFefoAlert(r),
        ].map(v => `"${v}"`).join(','));
        const blob = new Blob([hdr.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'stock_on_hand.csv'; a.click();
        message.success('Export berhasil');
    };

    // === FIFO & FEFO Alert computation ===
    // Use only records from latest update_date (consistent with dashboard)
    const latestDateStr = data.reduce((latest, s) => (s.update_date && s.update_date > latest ? s.update_date : latest), '');
    const latestDatePrefix = latestDateStr ? latestDateStr.substring(0, 10) : '';
    const latestData = latestDatePrefix ? data.filter(r => (r.update_date || '').startsWith(latestDatePrefix)) : data;
    const pickMaxArrival: Record<string, string> = {};
    const pickMaxExp: Record<string, string> = {};
    latestData.forEach(r => {
        const cat = locCategoryMap[r.location] || r.location_category || '';
        const locType = (r.location_type || '').trim();
        if (cat !== 'Sellable' || locType !== 'Pick') return;
        if (!r.sku) return;
        if (r.wh_arrival_date && (!pickMaxArrival[r.sku] || r.wh_arrival_date > pickMaxArrival[r.sku])) pickMaxArrival[r.sku] = r.wh_arrival_date;
        if (r.exp_date && (!pickMaxExp[r.sku] || r.exp_date > pickMaxExp[r.sku])) pickMaxExp[r.sku] = r.exp_date;
    });
    const getFifoAlert = (r: SohRecord): string => {
        const cat = locCategoryMap[r.location] || r.location_category || '';
        if (cat !== 'Sellable') return '-';
        const locType = (r.location_type || '').trim();
        if (locType === 'Pick') return 'OK';
        if (locType !== 'Storage') return '-';
        if (!r.wh_arrival_date || !r.sku) return '-';
        const maxPick = pickMaxArrival[r.sku];
        if (!maxPick) return '⚠️ Alert';
        return r.wh_arrival_date < maxPick ? '⚠️ Alert' : 'OK';
    };
    const getFefoAlert = (r: SohRecord): string => {
        const cat = locCategoryMap[r.location] || r.location_category || '';
        if (cat !== 'Sellable') return '-';
        const locType = (r.location_type || '').trim();
        if (locType === 'Pick') return 'OK';
        if (locType !== 'Storage') return '-';
        if (!r.exp_date || !r.sku) return '-';
        const maxPick = pickMaxExp[r.sku];
        if (!maxPick) return '⚠️ Alert';
        return r.exp_date < maxPick ? '⚠️ Alert' : 'OK';
    };

    const columns: any[] = [
        { title: 'Location', dataIndex: 'location', key: 'location', width: 100 },
        { title: 'Location Category', key: 'location_category', width: 130, render: (_: any, r: any) => locCategoryMap[r.location] || r.location_category || '-' },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
        { title: 'SKU Category', dataIndex: 'sku_category', key: 'sku_category', width: 110 },
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 90 },
        { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 70 },
        { title: 'Location Type', dataIndex: 'location_type', key: 'location_type', width: 110 },
        { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 90 },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 80 },
        { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 70, sorter: (a: any, b: any) => a.qty - b.qty },
        { title: 'WH Arrival Date', dataIndex: 'wh_arrival_date', key: 'wh_arrival_date', width: 120 },
        { title: 'Receipt#', dataIndex: 'receipt_no', key: 'receipt_no', width: 110 },
        { title: 'Mfg. Date', dataIndex: 'mfg_date', key: 'mfg_date', width: 100 },
        { title: 'Exp. Date', dataIndex: 'exp_date', key: 'exp_date', width: 100 },
        { title: 'Batch#', dataIndex: 'batch_no', key: 'batch_no', width: 100 },
        { title: 'Update Date', dataIndex: 'update_date', key: 'update_date', width: 110 },
        { title: 'Week', key: 'week', width: 110, render: (_: any, r: any) => calcWeek(r.update_date || r.wh_arrival_date) },
        {
            title: 'ED Note', key: 'ed_note', width: 140,
            render: (_: any, r: any) => { const note = calcEdNote(r.exp_date, r.update_date); return note !== '-' ? <Tag color={edNoteColor(note)}>{note}</Tag> : '-'; },
        },
        {
            title: 'Aging Note', key: 'aging_note', width: 100,
            render: (_: any, r: any) => { const note = calcAgingNote(r.wh_arrival_date); return note !== '-' ? <Tag color="blue">{note}</Tag> : '-'; },
        },
        {
            title: 'FIFO Alert', key: 'fifo_alert', width: 110,
            render: (_: any, r: SohRecord) => {
                const alert = getFifoAlert(r);
                if (alert === '⚠️ Alert') return <Tag color="red" style={{ fontWeight: 600 }}>⚠️ FIFO</Tag>;
                if (alert === 'OK') return <Tag color="green">OK</Tag>;
                return <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>;
            },
            filters: [{ text: '⚠️ Alert', value: '⚠️ Alert' }, { text: 'OK', value: 'OK' }, { text: '-', value: '-' }],
            onFilter: (value: string, r: SohRecord) => getFifoAlert(r) === value,
        },
        {
            title: 'FEFO Alert', key: 'fefo_alert', width: 110,
            render: (_: any, r: SohRecord) => {
                const alert = getFefoAlert(r);
                if (alert === '⚠️ Alert') return <Tag color="orange" style={{ fontWeight: 600 }}>⚠️ FEFO</Tag>;
                if (alert === 'OK') return <Tag color="green">OK</Tag>;
                return <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>;
            },
            filters: [{ text: '⚠️ Alert', value: '⚠️ Alert' }, { text: 'OK', value: 'OK' }, { text: '-', value: '-' }],
            onFilter: (value: string, r: SohRecord) => getFefoAlert(r) === value,
        },
    ];

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#6366f1', borderRadius: 8, fontFamily: "'Inter', sans-serif", colorBgContainer: '#1a1f3a', colorBgElevated: '#1e2340', colorBorder: 'rgba(255,255,255,0.08)', colorText: 'rgba(255,255,255,0.85)' }, components: { Table: { headerBg: '#0d1117', headerColor: 'rgba(255,255,255,0.7)', rowHoverBg: 'rgba(99,102,241,0.08)', borderColor: 'rgba(255,255,255,0.06)' } } }}>
            <div style={{ background: '#0d1117', minHeight: '100vh', padding: 24 }}>
                <div style={{ maxWidth: 1800, margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Title level={4} style={{ margin: 0, color: '#fff' }}>Stock on Hand</Title>
                        <Space wrap>
                            <DatePicker.RangePicker value={dateRange} onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)} format="DD/MM/YYYY" placeholder={['Dari Tanggal', 'Sampai Tanggal']} allowClear />
                            <Popover trigger="click" placement="bottomRight" content={<div style={{ width: 280 }}><div style={{ marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Masukkan keyword (satu per baris)</div><Input.TextArea value={search} onChange={e => setSearch(e.target.value)} placeholder={"Keyword 1\nKeyword 2\nKeyword 3"} autoSize={{ minRows: 4, maxRows: 10 }} style={{ marginBottom: 8 }} /><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{searchTerms.length > 0 ? `${searchTerms.length} keyword aktif` : 'Tidak ada filter'}</span>{search && <Button size="small" danger onClick={() => setSearch('')}>Clear</Button>}</div></div>}><Badge count={searchTerms.length} size="small" offset={[-4, 4]}><Button icon={<SearchOutlined />}>{searchTerms.length > 0 ? `Search (${searchTerms.length})` : 'Search'}</Button></Badge></Popover>
                            <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
                            <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                        </Space>
                    </div>
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <Select mode="multiple" allowClear placeholder="Filter ED Note" options={edNoteOptions} value={filterEdNote} onChange={setFilterEdNote} style={{ minWidth: 180, flex: 1 }} maxTagCount="responsive" />
                        <Select mode="multiple" allowClear placeholder="Filter Location Category" options={locCategoryOptions} value={filterLocCategory} onChange={setFilterLocCategory} style={{ minWidth: 180, flex: 1 }} maxTagCount="responsive" />
                        <Select mode="multiple" allowClear placeholder="Filter Brand" options={brandOptions} value={filterBrand} onChange={setFilterBrand} style={{ minWidth: 180, flex: 1 }} maxTagCount="responsive" />
                        <Select mode="multiple" allowClear placeholder="Filter Aging Note" options={agingNoteOptions} value={filterAgingNote} onChange={setFilterAgingNote} style={{ minWidth: 180, flex: 1 }} maxTagCount="responsive" />
                        {(filterEdNote.length > 0 || filterLocCategory.length > 0 || filterBrand.length > 0 || filterAgingNote.length > 0) && (
                            <Button size="small" danger onClick={() => { setFilterEdNote([]); setFilterLocCategory([]); setFilterBrand([]); setFilterAgingNote([]); }}>Reset Filter</Button>
                        )}
                    </div>
                    <Table
                        rowKey="id" columns={columns} dataSource={filteredData} loading={loading} size="small"
                        scroll={{ x: 2500, y: 'calc(100vh - 280px)' }}
                        pagination={{ pageSize: 50, showTotal: (t) => `Total: ${t}`, showSizeChanger: true }}
                    />
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Warehouse Report & Monitoring System</Text>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}
