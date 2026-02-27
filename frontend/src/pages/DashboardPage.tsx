import { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, Tabs, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { arrivalsApi, transactionsApi, vasApi, dccApi, damagesApi, sohApi, qcReturnsApi, locationsApi, attendancesApi, employeesApi, unloadingsApi, schedulesApi, additionalMpApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

import DashboardInboundTab from './dashboard/DashboardInboundTab';
import DashboardInventoryTab from './dashboard/DashboardInventoryTab';
import DashboardUtilizationTab from './dashboard/DashboardUtilizationTab';
import DashboardAgingTab from './dashboard/DashboardAgingTab';
import DashboardManpowerTab from './dashboard/DashboardManpowerTab';

const { Title } = Typography;

// Tab groups: only fetch the APIs each group needs
const TAB_GROUPS: Record<string, string> = {
    inbound: 'inbound',
    inventory: 'inventory',
    utilization: 'inventory', // shares data with inventory group
    aging_stock: 'inventory', // shares data with inventory group
    manpower: 'manpower',
};

export default function DashboardPage() {
    const { user } = useAuth();
    const isKeyAccount = user?.role === 'key_account';
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [activeTab, setActiveTab] = useState(isKeyAccount ? 'aging_stock' : 'inbound');

    // Per-group loading state
    const [loadedGroups, setLoadedGroups] = useState<Set<string>>(new Set());
    const [loadingGroup, setLoadingGroup] = useState<string | null>(null);

    // Inbound group data
    const [arrivals, setArrivals] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [vasList, setVasList] = useState<any[]>([]);
    const [unloadings, setUnloadings] = useState<any[]>([]);

    // Inventory group data (also used by Utilization + Aging)
    const [dccList, setDccList] = useState<any[]>([]);
    const [sohList, setSohList] = useState<any[]>([]);
    const [damages, setDamages] = useState<any[]>([]);
    const [qcReturns, setQcReturns] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);

    // Manpower group data
    const [attData, setAttData] = useState<any[]>([]);
    const [empData, setEmpData] = useState<any[]>([]);
    const [schedData, setSchedData] = useState<any[]>([]);
    const [addMpData, setAddMpData] = useState<any[]>([]);

    // Track if auto-refresh is active
    const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch a specific group of APIs
    const fetchGroup = useCallback(async (group: string) => {
        setLoadingGroup(group);
        try {
            if (group === 'inbound') {
                const [a, t, v, ul] = await Promise.all([
                    arrivalsApi.list(), transactionsApi.list(), vasApi.list(), unloadingsApi.list(),
                ]);
                setArrivals(a.data || []);
                setTransactions(t.data || []);
                setVasList(v.data || []);
                setUnloadings(ul.data || []);
            } else if (group === 'inventory') {
                const [d, s, dm, q, loc] = await Promise.all([
                    dccApi.list(), sohApi.list(), damagesApi.list(), qcReturnsApi.list(), locationsApi.list(),
                ]);
                setDccList(d.data || []);
                setSohList(s.data || []);
                setDamages(dm.data || []);
                setQcReturns(q.data || []);
                setLocations(loc.data || []);
            } else if (group === 'manpower') {
                const [att, emp, sch, addMp] = await Promise.all([
                    attendancesApi.list(), employeesApi.list(), schedulesApi.list(), additionalMpApi.list(),
                ]);
                setAttData(att.data || []);
                setEmpData(emp.data || []);
                setSchedData(sch.data || []);
                setAddMpData(addMp.data || []);
            }
            setLoadedGroups(prev => new Set(prev).add(group));
        } catch {
            // silently fail, data stays empty
        }
        setLoadingGroup(null);
    }, []);

    // Fetch the active tab's group if not yet loaded
    useEffect(() => {
        const group = TAB_GROUPS[activeTab];
        if (group && !loadedGroups.has(group)) {
            fetchGroup(group);
        }
    }, [activeTab, loadedGroups, fetchGroup]);

    // Auto-refresh: reload the currently active tab's group every 30 seconds
    useEffect(() => {
        if (refreshRef.current) clearInterval(refreshRef.current);
        refreshRef.current = setInterval(() => {
            const group = TAB_GROUPS[activeTab];
            if (group) fetchGroup(group);
        }, 30000);
        return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
    }, [activeTab, fetchGroup]);

    // === DATE FILTER HELPER ===
    // Backend now returns dates in consistent YYYY-MM-DD format via FlexDate
    const matchesDateRange = useCallback((dateStr: string): boolean => {
        if (!dateRange) return true;
        if (!dateStr) return false;
        const d = dayjs(dateStr);
        if (!d.isValid()) return false;
        return d.diff(dateRange[0], 'day') >= 0 && d.diff(dateRange[1], 'day') <= 0;
    }, [dateRange]);

    // Loading spinner for a tab group
    const groupSpinner = (group: string) => {
        if (loadingGroup === group && !loadedGroups.has(group)) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                    <Spin size="large" />
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            <Title level={3} style={{ color: '#fff', marginBottom: 24 }}>📊 Dashboard</Title>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                items={[
                    {
                        key: 'inbound',
                        label: '📦 Inbound',
                        children: groupSpinner('inbound') || (
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
                        children: groupSpinner('inventory') || (
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
                        children: groupSpinner('inventory') || (
                            <DashboardUtilizationTab
                                sohList={sohList}
                                locations={locations}
                            />
                        ),
                    },
                    {
                        key: 'aging_stock',
                        label: '📅 Aging Stock',
                        children: groupSpinner('inventory') || (
                            <DashboardAgingTab
                                sohList={sohList}
                                locations={locations}
                            />
                        ),
                    },
                    {
                        key: 'manpower',
                        label: '👷 Manpower',
                        children: groupSpinner('manpower') || (
                            <DashboardManpowerTab
                                attData={attData}
                                empData={empData}
                                schedData={schedData}
                                addMpData={addMpData}
                            />
                        ),
                    },
                ].filter(item => !isKeyAccount || item.key === 'aging_stock')}
            />
        </div>
    );
}
