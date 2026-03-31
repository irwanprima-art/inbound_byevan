import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Table, Button, Space, Modal, Input, Typography, Tag, message, Popconfirm,
    Spin,
} from 'antd';
import {
    VideoCameraOutlined, DeleteOutlined, PlayCircleOutlined,
    CameraOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { unboxingApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

interface UnboxingRecord {
    id: number;
    date: string;
    order_no: string;
    tracking_no: string;
    brand: string;
    operator: string;
    video_key: string;
    status: string;
    notes: string;
    updated_by: string;
    created_at: string;
}

export default function UnboxingPage() {
    const { user } = useAuth();
    const [data, setData] = useState<UnboxingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    
    // UI State
    const [unboxingMode, setUnboxingMode] = useState(false);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [videoLoading, setVideoLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    // Workflow State
    const [currentResi, setCurrentResi] = useState('');
    const [scanInput, setScanInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordDuration, setRecordDuration] = useState(0);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const currentResiRef = useRef<string>('');
    const isRecordingRef = useRef<boolean>(false);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const stopReasonRef = useRef<'scan' | 'cancel'>('scan');
    const inputRef = useRef<any>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await unboxingApi.list();
            setData(res.data || []);
        } catch {
            message.error('Gagal memuat data unboxing');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        currentResiRef.current = currentResi;
    }, [currentResi]);

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    useEffect(() => {
        return () => {
            stopCamera();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Focus input continually when modal is open so scanning always works
    useEffect(() => {
        let focusInterval: ReturnType<typeof setInterval>;
        if (unboxingMode) {
            focusInterval = setInterval(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 500);
        }
        return () => clearInterval(focusInterval);
    }, [unboxingMode]);

    const stopCamera = () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const startCanvasAnimation = () => {
        const drawFrame = () => {
            if (!canvasRef.current || !videoRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            const w = canvasRef.current.width;
            const h = canvasRef.current.height;

            // Draw video frame
            ctx.drawImage(videoRef.current, 0, 0, w, h);

            // Draw overlay background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, w, 60);

            // Timestamp
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textBaseline = 'middle';
            const now = new Date();
            const timeString = now.toLocaleString('id-ID');
            ctx.fillText(`Waktu: ${timeString}`, 20, 30);

            // Resi
            const resi = currentResiRef.current;
            const resiText = resi ? `Resi: ${resi}` : 'SCAN RESI UNTUK MULAI RECORD';
            ctx.fillStyle = resi ? '#a78bfa' : '#9ca3af'; // purple / gray
            ctx.fillText(resiText, 350, 30);

            // REC indicator
            if (isRecordingRef.current) {
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(w - 180, 30, 8, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.fillText('REC', w - 160, 30);
            }

            animationRef.current = requestAnimationFrame(drawFrame);
        };
        drawFrame();
    };

    const startCamera = async () => {
        try {
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: true,
                });
            } catch {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            }
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    if (videoRef.current && canvasRef.current) {
                        canvasRef.current.width = videoRef.current.videoWidth;
                        canvasRef.current.height = videoRef.current.videoHeight;
                        startCanvasAnimation();
                    }
                };
            }
            return true;
        } catch (err) {
            message.error('Tidak bisa akses kamera. Pastikan izin kamera sudah diberikan.');
            return false;
        }
    };

    const startRecording = () => {
        if (!canvasRef.current) return;

        chunksRef.current = [];
        const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
        let selectedMime = '';
        for (const mime of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mime)) {
                selectedMime = mime;
                break;
            }
        }

        const canvasStream = (canvasRef.current as any).captureStream(30);
        const audioTracks = streamRef.current?.getAudioTracks() || [];
        if (audioTracks.length > 0) {
            canvasStream.addTrack(audioTracks[0]);
        }

        const recorder = new MediaRecorder(canvasStream, {
            mimeType: selectedMime || undefined,
            videoBitsPerSecond: 2500000,
        });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: selectedMime || 'video/webm' });
            if (stopReasonRef.current === 'scan' && currentResiRef.current) {
                autoUpload(blob, currentResiRef.current);
            }
            setCurrentResi(''); // Clear it here so the UI resets
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordDuration(0);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setRecordDuration((prev) => prev + 1);
        }, 1000);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const autoUpload = async (blob: Blob, resi: string) => {
        const formData = new FormData();
        formData.append('video', blob, `unboxing_${resi.replace(/[^a-zA-Z0-9_]/g, '')}.webm`);
        formData.append('order_no', resi);
        formData.append('operator', user?.username || '');
        formData.append('date', new Date().toISOString().split('T')[0]);

        const key = `upload_${Date.now()}`;
        message.loading({ content: `Mengupload video resi ${resi}...`, key, duration: 0 });
        try {
            await unboxingApi.upload(formData);
            message.success({ content: `Video unboxing ${resi} berhasil disimpan!`, key, duration: 3 });
            fetchData();
        } catch {
            message.error({ content: `Gagal mengupload video ${resi}`, key, duration: 5 });
        }
    };

    const handleStartTask = async () => {
        setUnboxingMode(true);
        setCurrentResi('');
        setScanInput('');
        setRecordDuration(0);
        stopReasonRef.current = 'scan';
        await startCamera();
    };

    const handleCloseTask = () => {
        stopReasonRef.current = 'cancel'; // If they close the modal, don't auto-upload a partial thing
        if (isRecording) {
            stopRecording();
        }
        stopCamera();
        setUnboxingMode(false);
    };

    const handleScan = (value: string) => {
        const resi = value.trim();
        if (!resi) return;

        if (!isRecording) {
            // First scan -> Start Recording
            setCurrentResi(resi);
            startRecording();
            setScanInput('');
        } else {
            // Second scan -> Stop Recording & Upload
            stopReasonRef.current = 'scan';
            stopRecording(); // Will asynchronously trigger auto-upload and clear currentResi
            setScanInput('');
        }
    };

    const handlePlayVideo = async (record: UnboxingRecord) => {
        setVideoLoading(true);
        setVideoModalOpen(true);
        try {
            const res = await unboxingApi.getVideoUrl(record.id);
            setVideoUrl(res.data.url);
        } catch {
            message.error('Gagal memuat video');
            setVideoModalOpen(false);
        } finally {
            setVideoLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await unboxingApi.remove(id);
            message.success('Data dihapus');
            fetchData();
        } catch {
            message.error('Gagal menghapus');
        }
    };

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const filteredData = data.filter((item) => {
        if (!searchText) return true;
        const s = searchText.toLowerCase();
        return (item.order_no || '').toLowerCase().includes(s);
    });

    const columns: ColumnsType<UnboxingRecord> = [
        { title: 'Date', dataIndex: 'date', key: 'date', width: 110, sorter: (a, b) => (a.date || '').localeCompare(b.date || '') },
        { title: 'Order / Resi No', dataIndex: 'order_no', key: 'order_no', width: 220, render: (v: string) => <Tag color="cyan">{v}</Tag> },
        { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
        { title: 'Video', key: 'video', width: 80, align: 'center', render: (_: any, record: UnboxingRecord) => (
            record.video_key ? <Button type="link" icon={<PlayCircleOutlined />} onClick={() => handlePlayVideo(record)} /> : <Text type="secondary">—</Text>
        ) },
        { title: 'Action', key: 'action', width: 80, align: 'center', render: (_: any, record: UnboxingRecord) => (
            <Popconfirm title="Hapus?" onConfirm={() => handleDelete(record.id)}><Button type="link" danger icon={<DeleteOutlined />} /></Popconfirm>
        ) },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0, color: '#e0e0e0' }}>
                    <VideoCameraOutlined style={{ marginRight: 8, color: '#818cf8' }} />
                    Return Order — Unboxing Hands-Free
                </Title>
                <Space>
                    <Input.Search placeholder="Cari resi..." allowClear value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 280 }} />
                    <Button type="primary" icon={<CameraOutlined />} onClick={handleStartTask} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>
                        Start Task Unboxing
                    </Button>
                </Space>
            </div>

            <Table columns={columns} dataSource={filteredData} rowKey="id" loading={loading} size="small" scroll={{ x: 800 }} pagination={{ pageSize: 20 }} />

            {/* Unboxing Task Modal */}
            <Modal
                title={
                    <Space>
                        <VideoCameraOutlined style={{ color: '#818cf8' }} />
                        <span>Hands-Free Unboxing Task</span>
                    </Space>
                }
                open={unboxingMode}
                onCancel={handleCloseTask}
                footer={null}
                width={800}
                destroyOnClose
                maskClosable={false}
                keyboard={false} // Prevent escape from interrupting
            >
                <div style={{ marginBottom: 16 }}>
                    <Input
                        ref={inputRef}
                        autoFocus
                        size="large"
                        placeholder="Scan Resi Barcode di sini..."
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onPressEnter={() => handleScan(scanInput)}
                        prefix={<CameraOutlined />}
                        style={{ background: isRecording ? '#1e1b4b' : '#374151', color: '#fff', borderColor: isRecording ? '#4f46e5' : '#4b5563', borderWidth: 2 }}
                    />
                    <Text type="secondary" style={{ display: 'block', marginTop: 8, textAlign: 'center' }}>
                        {!isRecording 
                            ? "▶️ STATUS: READY. Silakan SCAN RESI BARCODE ke kotak di atas untuk MULAI MEREKAM." 
                            : `⏸️ STATUS: MEREKAM [${formatDuration(recordDuration)}]. Silakan SCAN LAGI resi untuk BERHENTI dan UPLOAD.`}
                    </Text>
                </div>

                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 16 }}>
                    <video ref={videoRef} autoPlay muted playsInline style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
                    <canvas ref={canvasRef} style={{ width: '100%', maxHeight: 480, display: 'block', background: '#000' }} />
                </div>
            </Modal>

            {/* View Video */}
            <Modal title="Video Unboxing" open={videoModalOpen} onCancel={() => { setVideoModalOpen(false); setVideoUrl(''); }} footer={null} width={720} destroyOnClose>
                {videoLoading ? <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div> : <video src={videoUrl} controls autoPlay style={{ width: '100%', maxHeight: 480, borderRadius: 8, background: '#000' }} />}
            </Modal>
        </div>
    );
}
