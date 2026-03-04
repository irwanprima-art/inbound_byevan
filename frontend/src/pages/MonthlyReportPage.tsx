import { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, DatePicker, Button, Space, Spin, Row, Col, Card } from 'antd';
import {
    PlayCircleOutlined, LeftOutlined, RightOutlined,
    FullscreenExitOutlined, LoadingOutlined,
    InboxOutlined, DatabaseOutlined, HomeOutlined, CalendarOutlined, TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
    arrivalsApi, transactionsApi, vasApi, dccApi, damagesApi,
    sohApi, qcReturnsApi, locationsApi, attendancesApi, employeesApi,
    unloadingsApi, schedulesApi, additionalMpApi, inboundCasesApi,
    inboundRejectionsApi, beritaAcaraApi,
} from '../api/client';

import DashboardInboundTab from './dashboard/DashboardInboundTab';
import DashboardInventoryTab from './dashboard/DashboardInventoryTab';
import DashboardUtilizationTab from './dashboard/DashboardUtilizationTab';
import DashboardAgingTab from './dashboard/DashboardAgingTab';
import DashboardManpowerTab from './dashboard/DashboardManpowerTab';

const { Title, Text } = Typography;

const SLIDES = [
    // Inbound sub-slides
    { key: 'inbound_1', label: '📦 Inbound — Overview', icon: <InboxOutlined />, color: '#6366f1', sections: ['cards', 'pending'] },
    { key: 'inbound_2', label: '📦 Inbound — Plan vs PO', icon: <InboxOutlined />, color: '#8b5cf6', sections: ['plan_vs_po'] },
    { key: 'inbound_3', label: '📦 Inbound — By Brand', icon: <InboxOutlined />, color: '#a855f7', sections: ['inbound_by_brand'] },
    { key: 'inbound_4', label: '📦 Inbound — VAS', icon: <InboxOutlined />, color: '#14b8a6', sections: ['vas', 'vas_operator', 'vas_type'] },
    { key: 'inbound_5', label: '📦 Inbound — PO & Qty', icon: <InboxOutlined />, color: '#06b6d4', sections: ['po_qty_brand'] },
    { key: 'inbound_6', label: '📦 Inbound — Tolakan & Case', icon: <InboxOutlined />, color: '#f87171', sections: ['tolakan', 'case'] },
    // Inventory sub-slides
    { key: 'inventory_1', label: '📋 Inventory — Accuracy', icon: <DatabaseOutlined />, color: '#10b981', sections: ['accuracy'] },
    { key: 'inventory_2', label: '📋 Inventory — Cycle Count', icon: <DatabaseOutlined />, color: '#06b6d4', sections: ['cycle_count'] },
    { key: 'inventory_3', label: '📋 Inventory — Damage & QC', icon: <DatabaseOutlined />, color: '#f87171', sections: ['damage_qc'] },
    { key: 'inventory_4', label: '📦 Inventory — Variances', icon: <DatabaseOutlined />, color: '#a78bfa', sections: ['variances'] },
    // Other tabs
    { key: 'utilization', label: '🏭 WH Utilization', icon: <HomeOutlined />, color: '#f59e0b', sections: undefined },
    // Aging sub-slides
    { key: 'aging_1', label: '📅 Aging Stock — ED Note', icon: <CalendarOutlined />, color: '#ec4899', sections: ['ed_note', 'critical_ed'] },
    { key: 'aging_2', label: '📅 Aging Stock — Aging Note', icon: <CalendarOutlined />, color: '#f472b6', sections: ['aging_note'] },
    { key: 'manpower', label: '👷 Manpower', icon: <TeamOutlined />, color: '#06b6d4', sections: undefined },
];

export default function MonthlyReportPage() {
    const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs().subtract(1, 'month'));
    const [presenting, setPresenting] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Data states (same as DashboardPage)
    const [arrivals, setArrivals] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [vasList, setVasList] = useState<any[]>([]);
    const [unloadings, setUnloadings] = useState<any[]>([]);
    const [inboundCases, setInboundCases] = useState<any[]>([]);
    const [dccList, setDccList] = useState<any[]>([]);
    const [sohList, setSohList] = useState<any[]>([]);
    const [damages, setDamages] = useState<any[]>([]);
    const [qcReturns, setQcReturns] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [attData, setAttData] = useState<any[]>([]);
    const [empData, setEmpData] = useState<any[]>([]);
    const [schedData, setSchedData] = useState<any[]>([]);
    const [addMpData, setAddMpData] = useState<any[]>([]);
    const [rejections, setRejections] = useState<any[]>([]);
    const [baData, setBaData] = useState<any[]>([]);

    // Date range for selected month
    const dateRange: [Dayjs, Dayjs] = [
        selectedMonth.startOf('month'),
        selectedMonth.endOf('month'),
    ];

    const matchesDateRange = useCallback((dateStr: string): boolean => {
        if (!dateStr) return false;
        const d = dayjs(dateStr);
        if (!d.isValid()) return false;
        return d.diff(dateRange[0], 'day') >= 0 && d.diff(dateRange[1], 'day') <= 0;
    }, [dateRange]);

    // Dummy setDateRange (tabs won't change the range in presentation mode)
    const noop = useCallback(() => { }, []);

    // Fetch all data
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [a, t, v, ul, ic, d, s, dm, q, loc, att, emp, sch, addMp, rej, ba] = await Promise.all([
                arrivalsApi.list(), transactionsApi.list(), vasApi.list(),
                unloadingsApi.list(), inboundCasesApi.list(),
                dccApi.list(), sohApi.list(), damagesApi.list(),
                qcReturnsApi.list(), locationsApi.list(),
                attendancesApi.list(), employeesApi.list(),
                schedulesApi.list(), additionalMpApi.list(),
                inboundRejectionsApi.list(), beritaAcaraApi.list(),
            ]);
            setArrivals(a.data || []);
            setTransactions(t.data || []);
            setVasList(v.data || []);
            setUnloadings(ul.data || []);
            setInboundCases(ic.data || []);
            setDccList(d.data || []);
            setSohList(s.data || []);
            setDamages(dm.data || []);
            setQcReturns(q.data || []);
            setLocations(loc.data || []);
            setAttData(att.data || []);
            setEmpData(emp.data || []);
            setSchedData(sch.data || []);
            setAddMpData(addMp.data || []);
            setRejections(rej.data || []);
            setBaData(ba.data || []);
            setDataLoaded(true);
        } catch {
            // silently fail
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    // Fullscreen handling
    const enterFullscreen = useCallback(() => {
        if (containerRef.current) {
            containerRef.current.requestFullscreen?.().catch(() => { });
        }
    }, []);

    const exitFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => { });
        }
    }, []);

    useEffect(() => {
        const handler = () => {
            if (!document.fullscreenElement && presenting) {
                setPresenting(false);
            }
        };
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, [presenting]);

    // Keyboard controls
    useEffect(() => {
        if (!presenting) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                setCurrentSlide(prev => Math.min(prev + 1, SLIDES.length + 1));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setCurrentSlide(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Escape') {
                exitFullscreen();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [presenting, exitFullscreen]);

    const handlePresent = () => {
        setCurrentSlide(0);
        setPresenting(true);
        setTimeout(() => enterFullscreen(), 100);
    };

    const monthLabel = selectedMonth.format('MMMM YYYY');
    const totalSlides = SLIDES.length + 2; // +1 opening, +1 closing
    const isOpening = currentSlide === 0;
    const isClosing = currentSlide === totalSlides - 1;
    const contentIndex = currentSlide - 1; // index into SLIDES array
    const currentColor = isOpening || isClosing ? '#6366f1' : SLIDES[contentIndex]?.color || '#6366f1';

    // Render slide content
    const renderSlide = (slideIndex: number) => {
        const slide = SLIDES[slideIndex];
        // All inbound sub-slides use the same component with different sections
        if (slide.key.startsWith('inbound_')) {
            return (
                <DashboardInboundTab
                    dateRange={dateRange}
                    setDateRange={noop}
                    arrivals={arrivals}
                    transactions={transactions}
                    vasList={vasList}
                    unloadings={unloadings}
                    inboundCases={inboundCases}
                    rejections={rejections}
                    baData={baData}
                    matchesDateRange={matchesDateRange}
                    sections={slide.sections}
                />
            );
        }
        // All inventory sub-slides use the same component with different sections
        if (slide.key.startsWith('inventory_')) {
            return (
                <DashboardInventoryTab
                    dateRange={dateRange}
                    setDateRange={noop}
                    dccList={dccList}
                    sohList={sohList}
                    damages={damages}
                    qcReturns={qcReturns}
                    locations={locations}
                    matchesDateRange={matchesDateRange}
                    sections={slide.sections}
                />
            );
        }
        // All aging sub-slides
        if (slide.key.startsWith('aging_')) {
            return <DashboardAgingTab sohList={sohList} locations={locations} sections={slide.sections} />;
        }
        switch (slide.key) {
            case 'utilization':
                return <DashboardUtilizationTab sohList={sohList} locations={locations} />;
            case 'manpower':
                return <DashboardManpowerTab attData={attData} empData={empData} schedData={schedData} addMpData={addMpData} filterMonth={selectedMonth} />;
            default:
                return null;
        }
    };

    // Presentation mode
    if (presenting) {
        return (
            <div
                ref={containerRef}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: '#0a0e1a',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 24px',
                    background: 'linear-gradient(90deg, #0d1117, #161b22)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: 22 }}>📊</span>
                        <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Monthly Report</span>
                        <span style={{
                            color: currentColor,
                            fontSize: 14,
                            fontWeight: 600,
                            background: `${currentColor}22`,
                            padding: '4px 14px',
                            borderRadius: 20,
                            border: `1px solid ${currentColor}44`,
                        }}>
                            {monthLabel}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                            {currentSlide + 1} / {totalSlides}
                        </span>
                        <Button
                            type="text"
                            icon={<FullscreenExitOutlined />}
                            onClick={() => { exitFullscreen(); setPresenting(false); }}
                            style={{ color: 'rgba(255,255,255,0.6)' }}
                        />
                    </div>
                </div>

                {/* Slide content area */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {isOpening ? (
                        /* ===== OPENING SLIDE ===== */
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '60px 40px',
                            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)',
                        }}>
                            <div style={{
                                fontSize: 64,
                                marginBottom: 24,
                                animation: 'pulse 2s ease-in-out infinite',
                            }}>📊</div>
                            <div style={{
                                color: '#fff',
                                fontSize: 42,
                                fontWeight: 800,
                                letterSpacing: '-0.5px',
                                lineHeight: 1.2,
                                marginBottom: 12,
                            }}>
                                Monthly Report
                            </div>
                            <div style={{
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: 18,
                                fontWeight: 400,
                                marginBottom: 40,
                            }}>
                                Warehouse Report & Monitoring System
                            </div>
                            <div style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                padding: '14px 48px',
                                borderRadius: 16,
                                fontSize: 28,
                                fontWeight: 700,
                                color: '#fff',
                                boxShadow: '0 8px 40px rgba(99,102,241,0.4)',
                                letterSpacing: '0.5px',
                            }}>
                                {monthLabel}
                            </div>
                            <div style={{
                                marginTop: 60,
                                display: 'flex',
                                gap: 20,
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                            }}>
                                {SLIDES.map((s, i) => (
                                    <div key={s.key} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '8px 18px',
                                        background: `${s.color}15`,
                                        border: `1px solid ${s.color}33`,
                                        borderRadius: 10,
                                        color: s.color,
                                        fontSize: 13,
                                        fontWeight: 500,
                                    }}>
                                        <span style={{ opacity: 0.7 }}>{i + 1}.</span>
                                        {s.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : isClosing ? (
                        /* ===== CLOSING SLIDE ===== */
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '60px 40px',
                            background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.1) 0%, transparent 70%)',
                        }}>
                            <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
                            <div style={{
                                color: '#fff',
                                fontSize: 42,
                                fontWeight: 800,
                                marginBottom: 12,
                            }}>
                                Terima Kasih
                            </div>
                            <div style={{
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: 18,
                                marginBottom: 40,
                            }}>
                                Monthly Report — {monthLabel}
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: 16,
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                marginBottom: 40,
                            }}>
                                {SLIDES.map(s => (
                                    <div key={s.key} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        color: s.color,
                                        fontSize: 13,
                                        fontWeight: 500,
                                    }}>
                                        <span style={{ color: '#10b981' }}>✓</span>
                                        {s.label}
                                    </div>
                                ))}
                            </div>
                            <div style={{
                                color: 'rgba(255,255,255,0.3)',
                                fontSize: 14,
                            }}>
                                Warehouse Report & Monitoring System
                            </div>
                        </div>
                    ) : (
                        /* ===== CONTENT SLIDES ===== */
                        <>
                            {/* Slide title */}
                            <div style={{ padding: '16px 24px 8px', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 28, color: SLIDES[contentIndex].color }}>
                                        {SLIDES[contentIndex].icon}
                                    </span>
                                    <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>
                                        {SLIDES[contentIndex].label}
                                    </span>
                                </div>
                            </div>
                            <div style={{ flex: 1, overflow: 'auto', padding: '8px 24px 24px' }}>
                                {renderSlide(contentIndex)}
                            </div>
                        </>
                    )}
                </div>

                {/* Navigation arrows */}
                {currentSlide > 0 && (
                    <div
                        onClick={() => setCurrentSlide(prev => prev - 1)}
                        style={{
                            position: 'fixed',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 50,
                            height: 80,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: '0 12px 12px 0',
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 22,
                            transition: 'all 0.2s',
                            zIndex: 10,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                    >
                        <LeftOutlined />
                    </div>
                )}
                {currentSlide < totalSlides - 1 && (
                    <div
                        onClick={() => setCurrentSlide(prev => prev + 1)}
                        style={{
                            position: 'fixed',
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 50,
                            height: 80,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: '12px 0 0 12px',
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 22,
                            transition: 'all 0.2s',
                            zIndex: 10,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                    >
                        <RightOutlined />
                    </div>
                )}

                {/* Slide indicator dots */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 0',
                    background: 'linear-gradient(0deg, rgba(0,0,0,0.4), transparent)',
                    flexShrink: 0,
                }}>
                    {Array.from({ length: totalSlides }).map((_, i) => {
                        const dotColor = i === 0 || i === totalSlides - 1
                            ? '#6366f1'
                            : SLIDES[i - 1]?.color || '#6366f1';
                        return (
                            <div
                                key={i}
                                onClick={() => setCurrentSlide(i)}
                                title={i === 0 ? 'Opening' : i === totalSlides - 1 ? 'Closing' : SLIDES[i - 1]?.label}
                                style={{
                                    width: i === currentSlide ? 32 : 10,
                                    height: 10,
                                    borderRadius: 5,
                                    background: i === currentSlide ? dotColor : 'rgba(255,255,255,0.25)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    // Setup page (normal view)
    return (
        <div ref={containerRef} style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>📊 Monthly Report</Title>
            </div>

            {/* Controls */}
            <Card
                style={{
                    background: 'linear-gradient(135deg, #1a1f3a, #161b22)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 16,
                    marginBottom: 32,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <Space size="large">
                        <div>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, display: 'block', marginBottom: 4 }}>Pilih Bulan</Text>
                            <DatePicker
                                picker="month"
                                value={selectedMonth}
                                onChange={(val) => val && setSelectedMonth(val)}
                                format="MMMM YYYY"
                                allowClear={false}
                                style={{ width: 200, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}
                            />
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, paddingTop: 20 }}>
                            {loading ? (
                                <><LoadingOutlined spin style={{ marginRight: 8 }} />Memuat data...</>
                            ) : dataLoaded ? (
                                <span style={{ color: '#10b981' }}>✅ Data siap</span>
                            ) : null}
                        </div>
                    </Space>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlayCircleOutlined />}
                        onClick={handlePresent}
                        disabled={loading || !dataLoaded}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            border: 'none',
                            borderRadius: 12,
                            height: 48,
                            fontSize: 16,
                            fontWeight: 600,
                            paddingInline: 32,
                            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                        }}
                    >
                        Present
                    </Button>
                </div>
            </Card>

            {/* Slide previews */}
            {loading && !dataLoaded ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin size="large" />
                    <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>Memuat data dari semua modul...</div>
                </div>
            ) : (
                <Row gutter={[16, 16]}>
                    {SLIDES.map((slide, i) => (
                        <Col xs={24} sm={12} lg={8} xl={6} key={slide.key}>
                            <Card
                                hoverable
                                onClick={() => {
                                    setCurrentSlide(i);
                                    handlePresent();
                                }}
                                style={{
                                    background: '#1a1f3a',
                                    border: `1px solid ${slide.color}33`,
                                    borderRadius: 14,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    overflow: 'hidden',
                                }}
                                styles={{
                                    body: { padding: '24px 20px' },
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = `${slide.color}88`;
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${slide.color}22`;
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = `${slide.color}33`;
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 12,
                                        background: `${slide.color}18`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 22,
                                        color: slide.color,
                                    }}>
                                        {slide.icon}
                                    </div>
                                    <div>
                                        <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{slide.label}</div>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Slide {i + 1}</div>
                                    </div>
                                </div>
                                <div style={{
                                    marginTop: 16,
                                    padding: '6px 12px',
                                    background: `${slide.color}12`,
                                    borderRadius: 8,
                                    textAlign: 'center',
                                }}>
                                    <PlayCircleOutlined style={{ color: slide.color, marginRight: 6 }} />
                                    <span style={{ color: slide.color, fontSize: 12, fontWeight: 500 }}>Klik untuk present</span>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Keyboard shortcuts hint */}
            <div style={{
                marginTop: 32,
                padding: '16px 20px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)',
            }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                    💡 <strong>Keyboard Shortcuts saat Present:</strong>{' '}
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>→ / Space</span> = Slide berikutnya &nbsp;|&nbsp;
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>←</span> = Slide sebelumnya &nbsp;|&nbsp;
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Esc</span> = Keluar
                </Text>
            </div>
        </div>
    );
}
