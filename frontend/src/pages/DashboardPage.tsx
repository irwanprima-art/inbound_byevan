import { useState, useEffect, useCallback } from 'react';
import { Typography, Tabs, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { arrivalsApi, transactionsApi, vasApi, dccApi, damagesApi, sohApi, qcReturnsApi, locationsApi, attendancesApi, employeesApi, unloadingsApi } from '../api/client';

import DashboardInboundTab from './dashboard/DashboardInboundTab';
import DashboardInventoryTab from './dashboard/DashboardInventoryTab';
import DashboardUtilizationTab from './dashboard/DashboardUtilizationTab';
import DashboardAgingTab from './dashboard/DashboardAgingTab';
import DashboardManpowerTab from './dashboard/DashboardManpowerTab';

const { Title } = Typography;

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [arrivals, setArrivals] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [vasList, setVasList] = useState<any[]>([]);
    const [dccList, setDccList] = useState<any[]>([]);
    const [damages, setDamages] = useState<any[]>([]);
    const [sohList, setSohList] = useState<any[]>([]);
    const [qcReturns, setQcReturns] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [attData, setAttData] = useState<any[]>([]);
    const [empData, setEmpData] = useState<any[]>([]);
    const [unloadings, setUnloadings] = useState<any[]>([]);

    const fetchAll = useCallback(() => {
        Promise.all([
            arrivalsApi.list(), transactionsApi.list(), vasApi.list(),
            dccApi.list(), damagesApi.list(), sohApi.list(), qcReturnsApi.list(),
            locationsApi.list(), attendancesApi.list(), employeesApi.list(),
            unloadingsApi.list(),
        ]).then(([a, t, v, d, dm, s, q, loc, att, emp, ul]) => {
            setArrivals(a.data || []);
            setTransactions(t.data || []);
            setVasList(v.data || []);
            setDccList(d.data || []);
            setDamages(dm.data || []);
            setSohList(s.data || []);
            setQcReturns(q.data || []);
            setLocations(loc.data || []);
            setAttData(att.data || []);
            setEmpData(emp.data || []);
            setUnloadings(ul.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => { fetchAll(); }, 30000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    // === DATE FILTER HELPER ===
    // Backend now returns dates in consistent YYYY-MM-DD format via FlexDate
    const matchesDateRange = useCallback((dateStr: string): boolean => {
        if (!dateRange) return true;
        if (!dateStr) return false;
        const d = dayjs(dateStr);
        if (!d.isValid()) return false;
        return d.diff(dateRange[0], 'day') >= 0 && d.diff(dateRange[1], 'day') <= 0;
    }, [dateRange]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Spin size="large" tip="Loading dashboard..." />
            </div>
        );
    }

    return (
        <div>
            <Title level={3} style={{ color: '#fff', marginBottom: 24 }}>📊 Dashboard</Title>
            <Tabs
                defaultActiveKey="inbound"
                type="card"
                items={[
                    {
                        key: 'inbound',
                        label: '📦 Inbound',
                        children: (
                            <DashboardInboundTab
                                dateRange={dateRange}
                                setDateRange={setDateRange}
                                arrivals={arrivals}
                                transactions={transactions}
                                vasList={vasList}
                                unloadings={unloadings}
                                matchesDateRange={matchesDateRange}
                            />
                        ),
                    },
                    {
                        key: 'inventory',
                        label: '📋 Inventory',
                        children: (
                            <DashboardInventoryTab
                                dateRange={dateRange}
                                setDateRange={setDateRange}
                                dccList={dccList}
                                sohList={sohList}
                                damages={damages}
                                qcReturns={qcReturns}
                                locations={locations}
                                matchesDateRange={matchesDateRange}
                            />
                        ),
                    },
                    {
                        key: 'utilization',
                        label: '🏭 WH Utilization',
                        children: (
                            <DashboardUtilizationTab
                                sohList={sohList}
                                locations={locations}
                            />
                        ),
                    },
                    {
                        key: 'aging_stock',
                        label: '📅 Aging Stock',
                        children: (
                            <DashboardAgingTab
                                sohList={sohList}
                                locations={locations}
                            />
                        ),
                    },
                    {
                        key: 'manpower',
                        label: '👷 Manpower',
                        children: (
                            <DashboardManpowerTab
                                attData={attData}
                                empData={empData}
                            />
                        ),
                    },
                ]}
            />
        </div>
    );
}
