import { useState, useCallback } from 'react';
import { Form, Input, InputNumber, Tag, Select } from 'antd';
import DataPage from '../components/DataPage';
import { dccApi } from '../api/client';

const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, sorter: (a: any, b: any) => a.date?.localeCompare(b.date) },
    { title: 'Phy. Inventory#', dataIndex: 'phy_inv', key: 'phy_inv', width: 130 },
    { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 80 },
    { title: 'Location', dataIndex: 'location', key: 'location', width: 110 },
    { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 100 },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 160, ellipsis: true },
    { title: 'Sys. Qty', dataIndex: 'sys_qty', key: 'sys_qty', width: 90, sorter: (a: any, b: any) => a.sys_qty - b.sys_qty },
    { title: 'Phy. Qty', dataIndex: 'phy_qty', key: 'phy_qty', width: 90, sorter: (a: any, b: any) => a.phy_qty - b.phy_qty },
    {
        title: 'Variance', dataIndex: 'variance', key: 'variance', width: 90,
        render: (v: number) => <Tag color={v === 0 ? 'green' : v < 0 ? 'red' : 'orange'}>{v}</Tag>,
        sorter: (a: any, b: any) => a.variance - b.variance,
    },
    {
        title: '%Variance', key: 'pct_variance', width: 100,
        render: (_: any, r: any) => {
            const sysQty = parseInt(r.sys_qty) || 0;
            if (sysQty === 0) return '-';
            const pct = (Math.abs(parseInt(r.variance) || 0) / sysQty * 100).toFixed(1);
            return <span style={{ color: parseFloat(pct) > 0 ? '#f87171' : '#4ade80' }}>{pct}%</span>;
        },
    },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
    {
        title: 'Remarks', key: 'remarks', width: 110,
        render: (_: any, r: any) => {
            const v = parseInt(r.variance) || 0;
            if (v < 0) return <Tag color="red">Shortage</Tag>;
            if (v > 0) return <Tag color="orange">Gain</Tag>;
            return <Tag color="green">Match</Tag>;
        },
    },
];

const formFields = (
    <>
        <Form.Item name="date" label="Date" rules={[{ required: true }]}><Input placeholder="M/D/YYYY" /></Form.Item>
        <Form.Item name="phy_inv" label="Phy. Inventory#" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="zone" label="Zone"><Input /></Form.Item>
        <Form.Item name="location" label="Location" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="owner" label="Owner"><Input /></Form.Item>
        <Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="brand" label="Brand"><Input /></Form.Item>
        <Form.Item name="description" label="Description"><Input /></Form.Item>
        <Form.Item name="sys_qty" label="Sys. Qty" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="phy_qty" label="Phy. Qty" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="variance" label="Variance" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="operator" label="Operator"><Input /></Form.Item>
    </>
);

const csvHeaders = ['date', 'phy_inv', 'zone', 'location', 'owner', 'sku', 'brand', 'description', 'sys_qty', 'phy_qty', 'operator'];

const columnMap: Record<string, string> = {
    'Phy. Inventory#': 'phy_inv',
    'phy_inventory': 'phy_inv',
    'phy inventory': 'phy_inv',
    'physical inventory': 'phy_inv',
    'Sys. Qty': 'sys_qty',
    'sys qty': 'sys_qty',
    'system qty': 'sys_qty',
    'Phy. Qty': 'phy_qty',
    'phy qty': 'phy_qty',
    'physical qty': 'phy_qty',
    '%Variance': 'pct_variance',
    'variance': 'variance',
    'Variance': 'variance',
    'remarks': 'remarks',
    'Remarks': 'remarks',
};

const numberFields = ['sys_qty', 'phy_qty', 'variance'];

const parseCSVRow = (row: string[], headers?: string[]): Record<string, unknown> | null => {
    if (!headers) return null;
    const get = (key: string) => {
        const idx = headers.findIndex(h => {
            const n = h.toLowerCase().replace(/[^a-z0-9]/g, '_');
            return n === key || h === key;
        });
        return idx >= 0 ? (row[idx] ?? '').toString().trim() : '';
    };
    const sku = get('sku');
    const date = get('date');
    if (!sku && !date) return null;
    const sysQty = parseInt(get('sys_qty')) || 0;
    const phyQty = parseInt(get('phy_qty')) || 0;
    return {
        date: get('date'),
        phy_inv: get('phy_inv') || get('phy__inventory_') || get('phy_inventory'),
        zone: get('zone'),
        location: get('location'),
        owner: get('owner'),
        sku,
        brand: get('brand'),
        description: get('description'),
        sys_qty: sysQty,
        phy_qty: phyQty,
        variance: phyQty - sysQty,
        operator: get('operator'),
    };
};

const getRemarks = (item: any) => {
    const v = parseInt(item.variance) || 0;
    if (v < 0) return 'Shortage';
    if (v > 0) return 'Gain';
    return 'Match';
};

const remarksOptions = ['Match', 'Shortage', 'Gain'].map(v => ({ label: v, value: v }));

export default function DccPage() {
    const [filterBrand, setFilterBrand] = useState<string[]>([]);
    const [filterZone, setFilterZone] = useState<string[]>([]);
    const [filterRemarks, setFilterRemarks] = useState<string[]>([]);
    const [allData, setAllData] = useState<any[]>([]);

    // Derive unique options from loaded data
    const brandOptions = [...new Set(allData.map((r: any) => r.brand).filter(Boolean))].sort().map(v => ({ label: v, value: v }));
    const zoneOptions = [...new Set(allData.map((r: any) => r.zone).filter(Boolean))].sort().map(v => ({ label: v, value: v }));

    // Wrap dccApi to intercept list() and capture data for filter options
    const wrappedApi = useCallback(() => ({
        ...dccApi,
        list: async () => {
            const res = await dccApi.list();
            setAllData(res.data || []);
            return res;
        },
    }), [])();

    const extraFilterUi = (
        <>
            <Select
                mode="multiple"
                allowClear
                placeholder="Filter Brand"
                options={brandOptions}
                value={filterBrand}
                onChange={setFilterBrand}
                style={{ minWidth: 130 }}
                maxTagCount="responsive"
            />
            <Select
                mode="multiple"
                allowClear
                placeholder="Filter Zone"
                options={zoneOptions}
                value={filterZone}
                onChange={setFilterZone}
                style={{ minWidth: 130 }}
                maxTagCount="responsive"
            />
            <Select
                mode="multiple"
                allowClear
                placeholder="Filter Remarks"
                options={remarksOptions}
                value={filterRemarks}
                onChange={setFilterRemarks}
                style={{ minWidth: 140 }}
                maxTagCount="responsive"
            />
        </>
    );

    const extraFilterFn = (item: any) => {
        if (filterBrand.length > 0 && !filterBrand.includes(item.brand)) return false;
        if (filterZone.length > 0 && !filterZone.includes(item.zone)) return false;
        if (filterRemarks.length > 0 && !filterRemarks.includes(getRemarks(item))) return false;
        return true;
    };

    return (
        <DataPage
            title="Daily Cycle Count"
            api={wrappedApi}
            columns={columns}
            formFields={formFields}
            csvHeaders={csvHeaders}
            columnMap={columnMap}
            numberFields={numberFields}
            parseCSVRow={parseCSVRow as any}
            dateField="date"
            computeSearchText={getRemarks}
            extraFilterUi={extraFilterUi}
            extraFilterFn={extraFilterFn}
        />
    );
}
