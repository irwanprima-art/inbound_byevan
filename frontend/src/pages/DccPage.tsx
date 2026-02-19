import React from 'react';
import { Form, Input, InputNumber, Tag } from 'antd';
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

const csvHeaders = ['date', 'phy_inv', 'zone', 'location', 'owner', 'sku', 'brand', 'description', 'sys_qty', 'phy_qty', 'variance', 'pct_variance', 'operator', 'remarks'];

// Map common CSV header names to database fields
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

export default function DccPage() {
    return (
        <DataPage
            title="Daily Cycle Count"
            api={dccApi}
            columns={columns}
            formFields={formFields}
            csvHeaders={csvHeaders}
            columnMap={columnMap}
            numberFields={numberFields}
        />
    );
}
