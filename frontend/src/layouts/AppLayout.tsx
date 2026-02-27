import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Space, Button } from 'antd';
import {
    DashboardOutlined, InboxOutlined, SwapOutlined, ToolOutlined,
    CheckCircleOutlined, WarningOutlined, DatabaseOutlined, RollbackOutlined, AuditOutlined,
    EnvironmentOutlined, IdcardOutlined, ClockCircleOutlined,
    LineChartOutlined, LogoutOutlined, UserOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
    CloseOutlined, CarOutlined, CalendarOutlined, FileTextOutlined, TeamOutlined,
    ShoppingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, hasPageAccess } from '../contexts/AuthContext';

// Lazy imports for all pages
import DashboardPage from '../pages/DashboardPage';
import ArrivalsPage from '../pages/ArrivalsPage';
import TransactionsPage from '../pages/TransactionsPage';
import VasPage from '../pages/VasPage';
import DccPage from '../pages/DccPage';
import DamagePage from '../pages/DamagePage';
import SohPage from '../pages/SohPage';
import QcReturnPage from '../pages/QcReturnPage';
import LocationPage from '../pages/LocationPage';
import AttendancePage from '../pages/AttendancePage';
import EmployeesPage from '../pages/EmployeesPage';
import ProductivityPage from '../pages/ProductivityPage';
import UnloadingPage from '../pages/UnloadingPage';
import SchedulePage from '../pages/SchedulePage';
import AdditionalMpPage from '../pages/AdditionalMpPage';
import BeritaAcaraPage from '../pages/BeritaAcaraPage';
import StockOpnamePage from '../pages/StockOpnamePage';
import MasterItemPage from '../pages/MasterItemPage';
import BeritaAcaraInventoryPage from '../pages/BeritaAcaraInventoryPage';
import SettingsPage from '../pages/SettingsPage';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const ROLE_LABELS: Record<string, string> = {
    supervisor: 'Supervisor',
    leader: 'Leader',
    admin_inbound: 'Admin Inbound',
    admin_inventory: 'Admin Inventory',
};

interface NavItem {
    key: string;
    icon: React.ReactNode;
    label: string;
    group?: string;
}

const NAV_ITEMS: NavItem[] = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/arrivals', icon: <InboxOutlined />, label: 'Inbound Arrival', group: 'inbound' },
    { key: '/transactions', icon: <SwapOutlined />, label: 'Inbound Transaction', group: 'inbound' },
    { key: '/unloading', icon: <CarOutlined />, label: 'Inbound Unloading', group: 'inbound' },
    { key: '/vas', icon: <ToolOutlined />, label: 'VAS', group: 'inbound' },
    { key: '/berita-acara', icon: <FileTextOutlined />, label: 'Berita Acara', group: 'inbound' },
    { key: '/locations', icon: <EnvironmentOutlined />, label: 'Master Location', group: 'inventory' },
    { key: '/master-items', icon: <ShoppingOutlined />, label: 'Master Item', group: 'inventory' },
    { key: '/soh', icon: <DatabaseOutlined />, label: 'Stock on Hand', group: 'inventory' },
    { key: '/dcc', icon: <CheckCircleOutlined />, label: 'Daily Cycle Count', group: 'inventory' },
    { key: '/stock-opname', icon: <AuditOutlined />, label: 'Stock Opname', group: 'inventory' },
    { key: '/damages', icon: <WarningOutlined />, label: 'Project Damage', group: 'inventory' },
    { key: '/qc-returns', icon: <RollbackOutlined />, label: 'QC Return', group: 'inventory' },
    { key: '/berita-acara-inventory', icon: <FileTextOutlined />, label: 'Berita Acara', group: 'inventory' },
    { key: '/attendance', icon: <ClockCircleOutlined />, label: 'Attendance', group: 'manpower' },
    { key: '/employees', icon: <IdcardOutlined />, label: 'Employees', group: 'manpower' },
    { key: '/productivity', icon: <LineChartOutlined />, label: 'Productivity', group: 'manpower' },
    { key: '/schedule', icon: <CalendarOutlined />, label: 'Schedule', group: 'manpower' },
    { key: '/additional-mp', icon: <TeamOutlined />, label: 'Additional MP', group: 'manpower' },
];

const PAGE_ID_MAP: Record<string, string> = {
    '/': 'dashboard',
    '/arrivals': 'inbound-arrival',
    '/transactions': 'inbound-transaction',
    '/unloading': 'inbound-unloading',
    '/vas': 'vas',
    '/dcc': 'daily-cycle-count',
    '/stock-opname': 'stock-opname',
    '/damages': 'project-damage',
    '/soh': 'stock-on-hand',
    '/qc-returns': 'qc-return',
    '/locations': 'master-location',
    '/master-items': 'master-item',
    '/attendance': 'attendance',
    '/employees': 'employees',
    '/productivity': 'productivity',
    '/schedule': 'schedule',
    '/additional-mp': 'additional-mp',
    '/berita-acara': 'berita-acara',
    '/berita-acara-inventory': 'berita-acara-inventory',
};

// Map route key → component
const PAGE_COMPONENTS: Record<string, React.ReactNode> = {
    '/': <DashboardPage />,
    '/arrivals': <ArrivalsPage />,
    '/transactions': <TransactionsPage />,
    '/unloading': <UnloadingPage />,
    '/vas': <VasPage />,
    '/dcc': <DccPage />,
    '/stock-opname': <StockOpnamePage />,
    '/damages': <DamagePage />,
    '/soh': <SohPage />,
    '/qc-returns': <QcReturnPage />,
    '/locations': <LocationPage />,
    '/master-items': <MasterItemPage />,
    '/attendance': <AttendancePage />,
    '/employees': <EmployeesPage />,
    '/productivity': <ProductivityPage />,
    '/schedule': <SchedulePage />,
    '/additional-mp': <AdditionalMpPage />,
    '/berita-acara': <BeritaAcaraPage />,
    '/berita-acara-inventory': <BeritaAcaraInventoryPage />,
    '/settings': <SettingsPage />,
};

// Icon map for tabs
const ICON_MAP: Record<string, React.ReactNode> = {
    '/': <DashboardOutlined />,
    '/arrivals': <InboxOutlined />,
    '/transactions': <SwapOutlined />,
    '/unloading': <CarOutlined />,
    '/vas': <ToolOutlined />,
    '/dcc': <CheckCircleOutlined />,
    '/stock-opname': <AuditOutlined />,
    '/damages': <WarningOutlined />,
    '/soh': <DatabaseOutlined />,
    '/qc-returns': <RollbackOutlined />,
    '/locations': <EnvironmentOutlined />,
    '/master-items': <ShoppingOutlined />,
    '/attendance': <ClockCircleOutlined />,
    '/employees': <IdcardOutlined />,
    '/productivity': <LineChartOutlined />,
    '/schedule': <CalendarOutlined />,
    '/additional-mp': <TeamOutlined />,
    '/berita-acara': <FileTextOutlined />,
    '/berita-acara-inventory': <FileTextOutlined />,
};

const LABEL_MAP: Record<string, string> = {};
NAV_ITEMS.forEach(item => { LABEL_MAP[item.key] = item.label; });
LABEL_MAP['/settings'] = 'Settings';
LABEL_MAP['/clock'] = 'Clock In/Out';

interface TabItem {
    key: string;
    label: string;
}

export default function AppLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [clock, setClock] = useState('');

    // Tab state: list of open tabs + active tab
    const [openTabs, setOpenTabs] = useState<TabItem[]>([
        { key: '/', label: 'Dashboard' },
    ]);
    const [activeTab, setActiveTab] = useState('/');

    // Sync: when location changes, ensure tab is open
    useEffect(() => {
        const path = location.pathname;
        const label = LABEL_MAP[path];
        if (!label) return; // Unknown route, skip

        setOpenTabs(prev => {
            if (prev.find(t => t.key === path)) return prev;
            return [...prev, { key: path, label }];
        });
        setActiveTab(path);
    }, [location.pathname]);

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setClock(now.toLocaleString('id-ID', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
            }));
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    const role = user?.role || '';

    const filteredItems = NAV_ITEMS.filter((item) => {
        const pageId = PAGE_ID_MAP[item.key] || '';
        return hasPageAccess(role, pageId);
    });

    // Group items
    const groups: Record<string, NavItem[]> = {};
    filteredItems.forEach((item) => {
        const group = item.group || 'main';
        if (!groups[group]) groups[group] = [];
        groups[group].push(item);
    });

    const groupLabels: Record<string, string> = {
        main: '',
        inbound: 'INBOUND',
        inventory: 'INVENTORY',
        manpower: 'MANPOWER',
    };

    const menuItems = Object.entries(groups).map(([group, items]) => {
        if (group === 'main') {
            return items.map((item) => ({
                key: item.key,
                icon: item.icon,
                label: item.label,
            }));
        }
        return [{
            key: group,
            label: groupLabels[group],
            type: 'group' as const,
            children: items.map((item) => ({
                key: item.key,
                icon: item.icon,
                label: item.label,
            })),
        }];
    }).flat();

    // Tab handlers
    const handleTabClick = useCallback((key: string) => {
        setActiveTab(key);
        navigate(key);
    }, [navigate]);

    const handleTabClose = useCallback((key: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (key === '/' && openTabs.length === 1) return; // Don't close last tab

        setOpenTabs(prev => {
            const newTabs = prev.filter(t => t.key !== key);
            if (newTabs.length === 0) {
                newTabs.push({ key: '/', label: 'Dashboard' });
            }
            // If closing active tab, switch to last tab
            if (activeTab === key) {
                const newActive = newTabs[newTabs.length - 1].key;
                setActiveTab(newActive);
                navigate(newActive);
            }
            return newTabs;
        });
    }, [activeTab, openTabs.length, navigate]);

    const handleCloseAll = useCallback(() => {
        setOpenTabs([{ key: '/', label: 'Dashboard' }]);
        setActiveTab('/');
        navigate('/');
    }, [navigate]);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={250}
                style={{
                    background: 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)',
                    borderRight: '1px solid rgba(99, 102, 241, 0.1)',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    height: '100vh',
                    overflowY: 'auto',
                    zIndex: 100,
                }}
            >
                <div style={{
                    height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    gap: 10,
                }}>
                    <span style={{ fontSize: 24 }}>📦</span>
                    {!collapsed && (
                        <Text strong style={{ color: '#fff', fontSize: 15 }}>WRM System</Text>
                    )}
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[activeTab]}
                    onClick={({ key }) => navigate(key)}
                    items={menuItems}
                    style={{
                        background: 'transparent',
                        borderRight: 0,
                        color: 'rgba(255,255,255,0.7)',
                    }}
                    theme="dark"
                />
            </Sider>
            <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
                <Header style={{
                    padding: '0 24px',
                    background: '#0d1117',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}>
                    <Space>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ color: '#fff', fontSize: 16 }}
                        />
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{clock}</Text>
                    </Space>
                    <Dropdown menu={{
                        items: [
                            { key: 'role', label: ROLE_LABELS[role] || role, disabled: true },
                            { type: 'divider' },
                            { key: 'clock', label: 'Clock In/Out', icon: <ClockCircleOutlined />, onClick: () => navigate('/clock') },
                            { key: 'settings', label: 'Settings', icon: <span style={{ fontSize: 14 }}>⚙️</span>, onClick: () => navigate('/settings') },
                            { type: 'divider' },
                            { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, danger: true, onClick: logout },
                        ],
                    }}>
                        <Space style={{ cursor: 'pointer' }}>
                            <Avatar icon={<UserOutlined />} style={{ background: '#6366f1' }} />
                            <Text style={{ color: '#fff' }}>{user?.username}</Text>
                        </Space>
                    </Dropdown>
                </Header>

                {/* Tab Bar */}
                <div style={{
                    background: '#0d1117',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    overflowX: 'auto',
                    padding: '0 8px',
                    gap: 2,
                    minHeight: 38,
                    alignItems: 'flex-end',
                    position: 'sticky',
                    top: 64,
                    zIndex: 10,
                }}>
                    {openTabs.map(tab => (
                        <div
                            key={tab.key}
                            onClick={() => handleTabClick(tab.key)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: 12,
                                color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.5)',
                                background: activeTab === tab.key ? '#161b22' : 'transparent',
                                borderTop: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
                                borderLeft: activeTab === tab.key ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                                borderRight: activeTab === tab.key ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                                borderBottom: 'none',
                                borderRadius: '6px 6px 0 0',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                                userSelect: 'none',
                            }}
                        >
                            <span style={{ fontSize: 13 }}>{ICON_MAP[tab.key]}</span>
                            <span>{tab.label}</span>
                            {!(tab.key === '/' && openTabs.length === 1) && (
                                <CloseOutlined
                                    onClick={(e) => handleTabClose(tab.key, e)}
                                    style={{
                                        fontSize: 10,
                                        color: 'rgba(255,255,255,0.3)',
                                        marginLeft: 4,
                                        padding: 2,
                                        borderRadius: 3,
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                                />
                            )}
                        </div>
                    ))}
                    {openTabs.length > 1 && (
                        <div
                            onClick={handleCloseAll}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.35)',
                                whiteSpace: 'nowrap',
                                marginLeft: 'auto',
                                borderRadius: '6px 6px 0 0',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <CloseOutlined style={{ fontSize: 10 }} />
                            <span>Close All</span>
                        </div>
                    )}
                </div>

                {/* Content — render all open tabs, show only active */}
                <Content style={{
                    margin: 24,
                    padding: 24,
                    minHeight: 280,
                    background: '#161b22',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.04)',
                }}>
                    {openTabs.map(tab => (
                        <div
                            key={tab.key}
                            style={{ display: activeTab === tab.key ? 'block' : 'none' }}
                        >
                            {PAGE_COMPONENTS[tab.key]}
                        </div>
                    ))}
                </Content>
            </Layout>
        </Layout>
    );
}
