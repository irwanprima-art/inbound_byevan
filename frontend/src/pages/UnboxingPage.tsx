import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Table, Button, Space, Modal, Input, Typography, Tag, message, Popconfirm,
    Steps, Card, Descriptions, Spin, Select,
} from 'antd';
import {
    VideoCameraOutlined, DeleteOutlined, PlayCircleOutlined,
    ScanOutlined, StopOutlined, CheckCircleOutlined,
    CameraOutlined, ReloadOutlined,
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

type WorkflowStep = 'idle' | 'scan' | 'recording' | 'preview' | 'uploading';

export default function UnboxingPage() {
    const { user } = useAuth();
    const [data, setData] = useState<UnboxingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [videoLoading, setVideoLoading] = useState(false);

    // Workflow state
    const [step, setStep] = useState<WorkflowStep>('idle');
    const [orderNos, setOrderNos] = useState<string[]>([]);
    const [trackingNo, setTrackingNo] = useState('');
    const [brand, setBrand] = useState('');
    const [notes, setNotes] = useState('');

    // Recording state
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState('');
    const previewRef = useRef<HTMLVideoElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordDuration, setRecordDuration] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Search
    const [searchText, setSearchText] = useState('');

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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const startCamera = async () => {
        try {
            // Try rear camera first (mobile), fall back to any available
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
            }
            return true;
        } catch (err) {
            message.error('Tidak bisa akses kamera. Pastikan izin kamera sudah diberikan.');
            console.error('Camera error:', err);
            return false;
        }
    };

    const startRecording = () => {
        if (!streamRef.current) return;

        chunksRef.current = [];
        const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
        let selectedMime = '';
        for (const mime of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mime)) {
                selectedMime = mime;
                break;
            }
        }

        const recorder = new MediaRecorder(streamRef.current, {
            mimeType: selectedMime || undefined,
            videoBitsPerSecond: 2500000, // 2.5 Mbps
        });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: selectedMime || 'video/webm' });
            setRecordedBlob(blob);
            const url = URL.createObjectURL(blob);
            setRecordedUrl(url);
            setStep('preview');
            stopCamera();
        };

        recorder.start(1000); // collect data every second
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordDuration(0);

        timerRef.current = setInterval(() => {
            setRecordDuration((prev: number) => prev + 1);
        }, 1000);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleStartUnboxing = () => {
        setStep('scan');
        setOrderNos([]);
        setTrackingNo('');
        setBrand('');
        setNotes('');
        setRecordedBlob(null);
        setRecordedUrl('');
        setRecordDuration(0);
        setModalOpen(true);
    };

    const handleScanNext = async () => {
        if (orderNos.length === 0) {
            message.warning('Masukkan minimal 1 nomor resi / order');
            return;
        }
        setStep('recording');
        const ok = await startCamera();
        if (!ok) setStep('scan');
    };

    const handleUpload = async () => {
        if (!recordedBlob) return;
        setStep('uploading');

        const formData = new FormData();
        const combinedOrders = orderNos.join('_').replace(/[^a-zA-Z0-9_]/g, '');
        formData.append('video', recordedBlob, `unboxing_${combinedOrders.substring(0, 50)}.webm`);
        formData.append('order_no', orderNos.join(', '));
        formData.append('tracking_no', trackingNo.trim());
        formData.append('brand', brand.trim());
        formData.append('operator', user?.username || '');
        formData.append('notes', notes.trim());
        formData.append('date', new Date().toISOString().split('T')[0]);

        try {
            await unboxingApi.upload(formData);
            message.success('Video unboxing berhasil diupload!');
            setModalOpen(false);
            setStep('idle');
            // Cleanup
            if (recordedUrl) URL.revokeObjectURL(recordedUrl);
            setRecordedBlob(null);
            setRecordedUrl('');
            fetchData();
        } catch {
            message.error('Gagal mengupload video');
            setStep('preview');
        }
    };

    const handleCancel = () => {
        stopRecording();
        stopCamera();
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedBlob(null);
        setRecordedUrl('');
        setStep('idle');
        setModalOpen(false);
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
            message.success('Data berhasil dihapus');
            fetchData();
        } catch {
            message.error('Gagal menghapus data');
        }
    };

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const filteredData = data.filter((item: UnboxingRecord) => {
        if (!searchText) return true;
        const s = searchText.toLowerCase();
        return (
            (item.order_no || '').toLowerCase().includes(s) ||
            (item.tracking_no || '').toLowerCase().includes(s) ||
            (item.brand || '').toLowerCase().includes(s) ||
            (item.operator || '').toLowerCase().includes(s)
        );
    });

    const columns: ColumnsType<UnboxingRecord> = [
        {
            title: 'Date', dataIndex: 'date', key: 'date', width: 110,
            sorter: (a, b) => (a.date || '').localeCompare(b.date || ''),
        },
        {
            title: 'Order / Resi No', dataIndex: 'order_no', key: 'order_no', width: 220,
            render: (v: string) => (
                <Space size={[0, 4]} wrap>
                    {v ? v.split(',').map(tag => (
                        <Tag color="cyan" key={tag.trim()} style={{ margin: 0 }}>{tag.trim()}</Tag>
                    )) : null}
                </Space>
            ),
        },
        { title: 'Tracking No', dataIndex: 'tracking_no', key: 'tracking_no', width: 160 },
        { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 120 },
        { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 120 },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 100,
            render: (v: string) => (
                <Tag color={v === 'completed' ? 'green' : 'blue'}>{v || 'completed'}</Tag>
            ),
        },
        { title: 'Notes', dataIndex: 'notes', key: 'notes', width: 200, ellipsis: true },
        {
            title: 'Video', key: 'video', width: 80, align: 'center' as const,
            render: (_: unknown, record: UnboxingRecord) => (
                record.video_key ? (
                    <Button
                        type="link"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handlePlayVideo(record)}
                        style={{ color: '#818cf8' }}
                    />
                ) : <Text type="secondary">—</Text>
            ),
        },
        {
            title: 'Action', key: 'action', width: 80, align: 'center' as const,
            render: (_: unknown, record: UnboxingRecord) => (
                <Popconfirm
                    title="Hapus data unboxing ini?"
                    description="Video juga akan dihapus dari server."
                    onConfirm={() => handleDelete(record.id)}
                    okText="Hapus"
                    cancelText="Batal"
                >
                    <Button type="link" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    const stepIndex = step === 'scan' ? 0 : step === 'recording' ? 1 : step === 'preview' || step === 'uploading' ? 2 : 0;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0, color: '#e0e0e0' }}>
                    <VideoCameraOutlined style={{ marginRight: 8, color: '#818cf8' }} />
                    Return Order — Unboxing
                </Title>
                <Space>
                    <Input.Search
                        placeholder="Cari order, resi, brand..."
                        allowClear
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 280 }}
                    />
                    <Button
                        type="primary"
                        icon={<CameraOutlined />}
                        onClick={handleStartUnboxing}
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}
                    >
                        Start Unboxing
                    </Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="id"
                loading={loading}
                size="small"
                scroll={{ x: 1100 }}
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `Total: ${t}` }}
            />

            {/* Unboxing Workflow Modal */}
            <Modal
                title={
                    <Space>
                        <VideoCameraOutlined style={{ color: '#818cf8' }} />
                        <span>Unboxing Paket Return</span>
                    </Space>
                }
                open={modalOpen}
                onCancel={handleCancel}
                footer={null}
                width={720}
                destroyOnClose
                maskClosable={false}
            >
                <Steps
                    current={stepIndex}
                    size="small"
                    style={{ marginBottom: 24 }}
                    items={[
                        { title: 'Scan Resi', icon: <ScanOutlined /> },
                        { title: 'Record Video', icon: <VideoCameraOutlined /> },
                        { title: 'Upload', icon: <CheckCircleOutlined /> },
                    ]}
                />

                {/* Step 1: Scan */}
                {step === 'scan' && (
                    <div>
                        <Card size="small" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                <div>
                                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Nomor Resi / Order No *</Text>
                                    <Select
                                        mode="tags"
                                        style={{ width: '100%' }}
                                        placeholder="Scan barcode (otomatis enter) atau ketik manual lalu Enter..."
                                        value={orderNos}
                                        onChange={setOrderNos}
                                        size="large"
                                        open={false}
                                        autoFocus
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <Text strong style={{ display: 'block', marginBottom: 4 }}>Tracking No</Text>
                                        <Input
                                            placeholder="Nomor tracking..."
                                            value={trackingNo}
                                            onChange={e => setTrackingNo(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Text strong style={{ display: 'block', marginBottom: 4 }}>Brand</Text>
                                        <Input
                                            placeholder="Brand..."
                                            value={brand}
                                            onChange={e => setBrand(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="primary"
                                    icon={<CameraOutlined />}
                                    onClick={handleScanNext}
                                    block
                                    size="large"
                                    style={{ marginTop: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}
                                >
                                    Mulai Recording
                                </Button>
                            </Space>
                        </Card>
                    </div>
                )}

                {/* Step 2: Recording */}
                {step === 'recording' && (
                    <div>
                        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 16 }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                style={{ width: '100%', maxHeight: 400, display: 'block' }}
                            />
                            {isRecording && (
                                <div style={{
                                    position: 'absolute', top: 12, right: 12,
                                    background: 'rgba(239,68,68,0.9)', color: '#fff',
                                    padding: '4px 12px', borderRadius: 20, fontSize: 14,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    animation: 'pulse 1.5s infinite',
                                }}>
                                    <span style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: '#fff', display: 'inline-block',
                                    }} />
                                    REC {formatDuration(recordDuration)}
                                </div>
                            )}
                            <Descriptions
                                size="small"
                                column={3}
                                style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'rgba(0,0,0,0.7)', padding: '8px 12px',
                                }}
                            >
                                <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Order</span>}>
                                    <span style={{ color: '#818cf8', fontWeight: 600 }}>{orderNos.join(', ')}</span>
                                </Descriptions.Item>
                                {trackingNo && (
                                    <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Tracking</span>}>
                                        <span style={{ color: '#fff' }}>{trackingNo}</span>
                                    </Descriptions.Item>
                                )}
                                {brand && (
                                    <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Brand</span>}>
                                        <span style={{ color: '#fff' }}>{brand}</span>
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </div>
                        <Space style={{ width: '100%', justifyContent: 'center' }}>
                            {!isRecording ? (
                                <Button
                                    type="primary"
                                    danger
                                    icon={<VideoCameraOutlined />}
                                    onClick={startRecording}
                                    size="large"
                                    style={{ minWidth: 200 }}
                                >
                                    Mulai Record
                                </Button>
                            ) : (
                                <Button
                                    type="primary"
                                    icon={<StopOutlined />}
                                    onClick={stopRecording}
                                    size="large"
                                    style={{ minWidth: 200, background: '#ef4444', border: 'none' }}
                                >
                                    Stop Recording ({formatDuration(recordDuration)})
                                </Button>
                            )}
                        </Space>
                    </div>
                )}

                {/* Step 3: Preview & Upload */}
                {(step === 'preview' || step === 'uploading') && (
                    <div>
                        <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 16 }}>
                            <video
                                ref={previewRef}
                                src={recordedUrl}
                                controls
                                style={{ width: '100%', maxHeight: 360, display: 'block' }}
                            />
                        </div>
                        <Card size="small" style={{ marginBottom: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                            <Descriptions size="small" column={2}>
                                <Descriptions.Item label="Order No">{orderNos.join(', ')}</Descriptions.Item>
                                <Descriptions.Item label="Tracking No">{trackingNo || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Brand">{brand || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Duration">{formatDuration(recordDuration)}</Descriptions.Item>
                                <Descriptions.Item label="Size">
                                    {recordedBlob ? `${(recordedBlob.size / 1024 / 1024).toFixed(1)} MB` : '—'}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ display: 'block', marginBottom: 4 }}>Catatan (opsional)</Text>
                            <Input.TextArea
                                placeholder="Tambah catatan tentang kondisi paket..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => {
                                    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
                                    setRecordedBlob(null);
                                    setRecordedUrl('');
                                    setStep('recording');
                                    startCamera();
                                }}
                                disabled={step === 'uploading'}
                            >
                                Record Ulang
                            </Button>
                            <Button
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={handleUpload}
                                loading={step === 'uploading'}
                                size="large"
                                style={{ minWidth: 200, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                            >
                                {step === 'uploading' ? 'Mengupload...' : 'Upload Video'}
                            </Button>
                        </Space>
                    </div>
                )}
            </Modal>

            {/* Video Playback Modal */}
            <Modal
                title="Video Unboxing"
                open={videoModalOpen}
                onCancel={() => { setVideoModalOpen(false); setVideoUrl(''); }}
                footer={null}
                width={720}
                destroyOnClose
            >
                {videoLoading ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin size="large" tip="Memuat video..." />
                    </div>
                ) : (
                    <video
                        src={videoUrl}
                        controls
                        autoPlay
                        style={{ width: '100%', maxHeight: 480, borderRadius: 8, background: '#000' }}
                    />
                )}
            </Modal>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}
