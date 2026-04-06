import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Typography, DatePicker, Button, Space, Spin, Row, Col, Card, Modal, Progress } from 'antd';
import {
    PlayCircleOutlined, LeftOutlined, RightOutlined,
    FullscreenExitOutlined, LoadingOutlined,
    InboxOutlined, DatabaseOutlined, HomeOutlined, CalendarOutlined, TeamOutlined,
    UndoOutlined, DownloadOutlined,
} from '@ant-design/icons';
import html2canvas from 'html2canvas';
import PptxGenJS from 'pptxgenjs';
import { MemoryRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
    arrivalsApi, transactionsApi, vasApi, dccApi, damagesApi,
    sohApi, qcReturnsApi, locationsApi, attendancesApi, employeesApi,
    unloadingsApi, schedulesApi, additionalMpApi, inboundCasesApi,
    inboundRejectionsApi, beritaAcaraApi,
    returnReceivesApi, rejectReturnsApi, orderPerBrandsApi, returnTransactionsApi,
} from '../api/client';

import DashboardInboundTab from './dashboard/DashboardInboundTab';
import DashboardReturnTab from './dashboard/DashboardReturnTab';
import DashboardInventoryTab from './dashboard/DashboardInventoryTab';
import DashboardUtilizationTab from './dashboard/DashboardUtilizationTab';
import DashboardAgingTab from './dashboard/DashboardAgingTab';
import DashboardManpowerTab from './dashboard/DashboardManpowerTab';

import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme as antTheme } from 'antd';

const { Title, Text } = Typography;

const SLIDES = [
    // Inbound sub-slides
    { key: 'inbound_1', label: '📦 Inbound — Overview', icon: <InboxOutlined />, color: '#6366f1', sections: ['cards', 'pending', 'po_qty_brand'] },
    { key: 'inbound_2', label: '📦 Inbound — Plan vs PO', icon: <InboxOutlined />, color: '#8b5cf6', sections: ['plan_vs_po'] },
    { key: 'inbound_3', label: '📦 Inbound — By Brand', icon: <InboxOutlined />, color: '#a855f7', sections: ['inbound_by_brand'] },
    { key: 'inbound_4', label: '📦 Inbound — VAS', icon: <InboxOutlined />, color: '#14b8a6', sections: ['vas', 'vas_operator', 'vas_type'] },

    { key: 'inbound_6', label: '📦 Inbound — Rejection & Case', icon: <InboxOutlined />, color: '#f87171', sections: ['tolakan', 'case'] },
    // Return sub-slides
    { key: 'return_1', label: '🔄 Return — Per Brand & Good vs Damage', icon: <UndoOutlined />, color: '#06b6d4', sections: ['avg_times', 'return_per_brand'] },
    { key: 'return_3', label: '🔄 Return — Reason Group (Qty & Order)', icon: <UndoOutlined />, color: '#0ea5e9', sections: ['reason_combined'] },
    { key: 'return_4', label: '🔄 Return — % Return per Brand', icon: <UndoOutlined />, color: '#0e7490', sections: ['return_pct'] },
    { key: 'return_5', label: '🔄 Return — Reject & AWB per Brand', icon: <UndoOutlined />, color: '#155e75', sections: ['reject_logistics'] },
    // Inventory sub-slides
    { key: 'inventory_1', label: '📋 Inventory — Accuracy', icon: <DatabaseOutlined />, color: '#10b981', sections: ['accuracy'] },
    { key: 'inventory_2', label: '📋 Inventory — Cycle Count', icon: <DatabaseOutlined />, color: '#06b6d4', sections: ['cycle_count'] },
    { key: 'inventory_3', label: '📋 Inventory — Damage & QC', icon: <DatabaseOutlined />, color: '#f87171', sections: ['damage_qc'] },
    { key: 'inventory_4', label: '📦 Inventory — Variances', icon: <DatabaseOutlined />, color: '#a78bfa', sections: ['variances'] },
    { key: 'inventory_5', label: '📈 Inventory — Inventory Rate', icon: <DatabaseOutlined />, color: '#f59e0b', sections: ['inventory_rate'] },
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
    // Return data
    const [returnReceives, setReturnReceives] = useState<any[]>([]);
    const [rejectReturns, setRejectReturns] = useState<any[]>([]);
    const [orderPerBrands, setOrderPerBrands] = useState<any[]>([]);
    const [returnTransactions, setReturnTransactions] = useState<any[]>([]);

    // Date range for selected month
    const dateRange: [Dayjs, Dayjs] = [
        selectedMonth.startOf('month'),
        selectedMonth.endOf('month'),
    ];

    const matchesDateRange = useCallback((dateStr: string): boolean => {
        if (!dateStr) return false;
        const d = dayjs(dateStr);
        if (!d.isValid()) return false;
        return !d.isBefore(dateRange[0], 'day') && !d.isAfter(dateRange[1], 'day');
    }, [dateRange]);

    // Dummy setDateRange (tabs won't change the range in presentation mode)
    const noop = useCallback(() => { }, []);

    // Fetch all data in parallel (fastest approach)
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [a, t, v, ul, ic, rej, rr, rjr, opb, rtx, d, s, dm, q, loc, ba, att, emp, sch, addMp] = await Promise.all([
                arrivalsApi.list(), transactionsApi.list(), vasApi.list(),
                unloadingsApi.list(), inboundCasesApi.list(), inboundRejectionsApi.list(),
                returnReceivesApi.list(), rejectReturnsApi.list(),
                orderPerBrandsApi.list(), returnTransactionsApi.list(),
                dccApi.list(), sohApi.list(), damagesApi.list(),
                qcReturnsApi.list(), locationsApi.list(), beritaAcaraApi.list(),
                attendancesApi.list(), employeesApi.list(),
                schedulesApi.list(), additionalMpApi.list(),
            ]);
            setArrivals(a.data || []);
            setTransactions(t.data || []);
            setVasList(v.data || []);
            setUnloadings(ul.data || []);
            setInboundCases(ic.data || []);
            setRejections(rej.data || []);
            setReturnReceives(rr.data || []);
            setRejectReturns(rjr.data || []);
            setOrderPerBrands(opb.data || []);
            setReturnTransactions(rtx.data || []);
            setDccList(d.data || []);
            setSohList(s.data || []);
            setDamages(dm.data || []);
            setQcReturns(q.data || []);
            setLocations(loc.data || []);
            setBaData(ba.data || []);
            setAttData(att.data || []);
            setEmpData(emp.data || []);
            setSchedData(sch.data || []);
            setAddMpData(addMp.data || []);
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
        // All return sub-slides
        if (slide.key.startsWith('return_')) {
            return (
                <DashboardReturnTab
                    dateRange={dateRange}
                    setDateRange={noop}
                    returnReceives={returnReceives}
                    rejectReturns={rejectReturns}
                    orderPerBrands={orderPerBrands}
                    returnTransactions={returnTransactions}
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
                return <DashboardManpowerTab attData={attData} empData={empData} schedData={schedData} addMpData={addMpData} filterMonth={selectedMonth} isPresentation />;
            default:
                return null;
        }
    };

    // ═══ PPT DOWNLOAD ═══
    const [pptGenerating, setPptGenerating] = useState(false);
    const [pptProgress, setPptProgress] = useState(0);
    const [pptStatus, setPptStatus] = useState('');

    const captureSlideImage = useCallback(async (content: ReactNode, width = 1280, _height = 720): Promise<string> => {
        const container = document.createElement('div');
        // Allow the container to grow to fit all content (no overflow:hidden / fixed height)
        container.style.cssText = `position:fixed;left:-9999px;top:0;width:${width}px;background:#0a0e1a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;z-index:-1;`;
        document.body.appendChild(container);
        const root = ReactDOM.createRoot(container);
        await new Promise<void>(resolve => {
            root.render(
                <MemoryRouter>
                    <ConfigProvider theme={{ algorithm: antTheme.darkAlgorithm }}>
                        <div style={{ width, background: '#0a0e1a', color: '#fff' }}>{content}</div>
                    </ConfigProvider>
                </MemoryRouter>
            );
            // Wait longer so Recharts SVGs & large Ant Design tables fully render
            setTimeout(resolve, 2500);
        });

        // Pre-process: convert all SVGs to canvas images (html2canvas can't render SVG properly)
        const svgs = container.querySelectorAll('svg');
        for (const svg of Array.from(svgs)) {
            try {
                const svgRect = svg.getBoundingClientRect();
                if (svgRect.width === 0 || svgRect.height === 0) continue;
                // Inline all computed styles into SVG elements for accurate rendering
                const deepClone = svg.cloneNode(true) as SVGElement;
                const allEls = svg.querySelectorAll('*');
                const cloneEls = deepClone.querySelectorAll('*');
                allEls.forEach((el, idx) => {
                    const cs = window.getComputedStyle(el);
                    const clone = cloneEls[idx] as SVGElement;
                    if (clone) {
                        clone.setAttribute('style',
                            `fill:${cs.fill};stroke:${cs.stroke};stroke-width:${cs.strokeWidth};` +
                            `stroke-dasharray:${cs.strokeDasharray};opacity:${cs.opacity};` +
                            `font-size:${cs.fontSize};font-family:${cs.fontFamily};font-weight:${cs.fontWeight};` +
                            `visibility:${cs.visibility};display:${cs.display};`
                        );
                    }
                });
                // Set explicit dimensions on the SVG clone
                deepClone.setAttribute('width', String(svgRect.width));
                deepClone.setAttribute('height', String(svgRect.height));
                const svgData = new XMLSerializer().serializeToString(deepClone);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                const img = new Image();
                img.style.cssText = `width:${svgRect.width}px;height:${svgRect.height}px;`;
                await new Promise<void>((resolve2, reject2) => {
                    img.onload = () => resolve2();
                    img.onerror = () => reject2();
                    img.src = url;
                });
                // Draw onto a canvas for best compatibility
                const cvs = document.createElement('canvas');
                cvs.width = svgRect.width * 2;
                cvs.height = svgRect.height * 2;
                cvs.style.cssText = `width:${svgRect.width}px;height:${svgRect.height}px;`;
                const ctx = cvs.getContext('2d');
                if (ctx) {
                    ctx.scale(2, 2);
                    ctx.drawImage(img, 0, 0, svgRect.width, svgRect.height);
                }
                svg.parentNode?.replaceChild(cvs, svg);
                URL.revokeObjectURL(url);
            } catch {
                // If SVG conversion fails, leave the original SVG
            }
        }

        // Capture actual rendered height (may be taller than 720px for tables)
        const actualHeight = Math.max(container.scrollHeight, _height);
        const canvas = await html2canvas(container, { backgroundColor: '#0a0e1a', width, height: actualHeight, scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        root.unmount();
        document.body.removeChild(container);
        return imgData;
    }, []);

    const handleDownloadPPT = useCallback(async () => {
        if (!dataLoaded) return;
        setPptGenerating(true);
        setPptProgress(0);
        const totalCount = SLIDES.length + 2;
        try {
            const pptx = new PptxGenJS();
            pptx.layout = 'LAYOUT_WIDE';
            pptx.author = 'WRM System';
            pptx.subject = `Monthly Report - ${monthLabel}`;
            pptx.title = `Monthly Report - ${monthLabel}`;

            setPptStatus('Opening slide...');
            const openingContent = (
                <div style={{ width: 1280, height: 720, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, #0a0e1a 70%)' }}>
                    <div style={{ fontSize: 64, marginBottom: 20 }}>📊</div>
                    <div style={{ color: '#fff', fontSize: 42, fontWeight: 800, marginBottom: 10 }}>Monthly Report</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, marginBottom: 30 }}>Warehouse Report & Monitoring System</div>
                    <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '12px 40px', borderRadius: 14, fontSize: 26, fontWeight: 700, color: '#fff' }}>{monthLabel}</div>
                </div>
            );
            const openingImg = await captureSlideImage(openingContent);
            const openSlide = pptx.addSlide();
            openSlide.background = { color: '0a0e1a' };
            openSlide.addImage({ data: openingImg, x: 0, y: 0, w: '100%', h: '100%' });
            setPptProgress(Math.round(1 / totalCount * 100));

            for (let i = 0; i < SLIDES.length; i++) {
                const s = SLIDES[i];
                setPptStatus(`Slide ${i + 1}/${SLIDES.length}: ${s.label}`);
                try {
                    const slideContent = (
                        <div style={{ width: 1280, minHeight: 720 }}>
                            <div style={{ padding: '16px 24px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 28, color: s.color }}>{s.icon}</span>
                                <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{s.label}</span>
                            </div>
                            <div style={{ padding: '8px 24px 24px' }}>{renderSlide(i)}</div>
                        </div>
                    );
                    const img = await captureSlideImage(slideContent);
                    const contentSlide = pptx.addSlide();
                    contentSlide.background = { color: '0a0e1a' };
                    contentSlide.addImage({ data: img, x: 0, y: 0, w: '100%', h: '100%' });
                } catch (slideErr) {
                    console.warn(`Failed to capture slide ${s.key}:`, slideErr);
                    // Add an error placeholder slide so numbering stays correct
                    const errSlide = pptx.addSlide();
                    errSlide.background = { color: '0a0e1a' };
                    errSlide.addText(`⚠ ${s.label} — Failed to render`, { x: 1, y: 3, w: 10, h: 1, fontSize: 24, color: 'ff6b6b', align: 'center' });
                }
                setPptProgress(Math.round((i + 2) / totalCount * 100));
            }

            setPptStatus('Closing slide...');
            const closingContent = (
                <div style={{ width: 1280, height: 720, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, #0a0e1a 70%)' }}>
                    <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
                    <div style={{ color: '#fff', fontSize: 42, fontWeight: 800, marginBottom: 10 }}>Thank You</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, marginBottom: 30 }}>Monthly Report — {monthLabel}</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Warehouse Report & Monitoring System</div>
                </div>
            );
            const closingImg = await captureSlideImage(closingContent);
            const closeSlide = pptx.addSlide();
            closeSlide.background = { color: '0a0e1a' };
            closeSlide.addImage({ data: closingImg, x: 0, y: 0, w: '100%', h: '100%' });
            setPptProgress(100);

            setPptStatus('Saving file...');
            await pptx.writeFile({ fileName: `Monthly_Report_${selectedMonth.format('YYYY_MM')}.pptx` });
        } catch (err) {
            console.error('PPT generation error:', err);
        }
        setPptGenerating(false);
        setPptProgress(0);
        setPptStatus('');
    }, [dataLoaded, monthLabel, selectedMonth, captureSlideImage, renderSlide]);
    // ═══ END PPT ═══

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
                                Thank You
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
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, display: 'block', marginBottom: 4 }}>Select Month</Text>
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
                                <><LoadingOutlined spin style={{ marginRight: 8 }} />Loading data from all modules...</>
                            ) : dataLoaded ? (
                                <span style={{ color: '#10b981' }}>✅ Data ready</span>
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
                    <Button
                        size="large"
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadPPT}
                        disabled={loading || !dataLoaded || pptGenerating}
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            borderRadius: 12,
                            height: 48,
                            fontSize: 16,
                            fontWeight: 600,
                            paddingInline: 24,
                            color: '#fff',
                            boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                        }}
                    >
                        Download PPT
                    </Button>
                </div>
            </Card>

            {/* Slide previews */}
            {loading && !dataLoaded ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin size="large" />
                    <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>Loading data from all modules...</div>
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

            {/* PPT Download Progress Modal */}
            <Modal
                open={pptGenerating}
                closable={false}
                footer={null}
                centered
                maskClosable={false}
                styles={{ body: { background: '#161b22', padding: 32 } }}
                width={420}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
                    <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Generating PowerPoint...</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>{pptStatus}</div>
                    <Progress
                        percent={pptProgress}
                        strokeColor={{ '0%': '#6366f1', '100%': '#10b981' }}
                        trailColor="rgba(255,255,255,0.08)"
                        style={{ marginBottom: 8 }}
                    />
                </div>
            </Modal>
        </div>
    );
}
