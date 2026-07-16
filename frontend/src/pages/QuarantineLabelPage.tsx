import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, DatePicker, Row, Col, Typography, Select } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import Barcode from 'react-barcode';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface QuarantineData {
    lpn: string;
    sku: string;
    description: string;
    qty: number;
    batch: string;
    mfg: dayjs.Dayjs | null;
    exp: dayjs.Dayjs | null;
    status: string;
    startDate: dayjs.Dayjs | null;
    reason: string;
}

export default function QuarantineLabelPage() {
    const [form] = Form.useForm();
    const [labelData, setLabelData] = useState<QuarantineData | null>(null);

    useEffect(() => {
        // Auto-generate LPN Code on mount
        const generatedLpn = `QRN-${dayjs().format('YYYYMMDDHHmmss')}`;
        form.setFieldsValue({ lpn: generatedLpn });
    }, [form]);

    const onFinish = (values: any) => {
        setLabelData({
            ...values,
            mfg: values.mfg ? values.mfg : null,
            exp: values.exp ? values.exp : null,
            startDate: values.startDate ? values.startDate : null,
        });
        
        setTimeout(() => {
            printLabel();
            // Generate a new LPN for the next label after printing
            form.setFieldsValue({ lpn: `QRN-${dayjs().format('YYYYMMDDHHmmss')}` });
        }, 100);
    };

    const printLabel = () => {
        const printContent = document.getElementById('quarantine-label-print');
        if (printContent) {
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Print Quarantine Label</title>
                        <style>
                            @page {
                                size: 10cm 10cm;
                                margin: 0;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                                width: 10cm;
                                height: 10cm;
                                font-family: Arial, sans-serif;
                                color: black;
                                background-color: white;
                                display: flex;
                                flex-direction: column;
                                box-sizing: border-box;
                            }
                            .label-container {
                                border: 2px solid black;
                                margin: 0.2cm;
                                padding: 0.2cm;
                                width: 9.6cm;
                                height: 9.6cm;
                                box-sizing: border-box;
                                display: flex;
                                flex-direction: column;
                            }
                            .header {
                                text-align: center;
                                font-size: 16pt;
                                font-weight: bold;
                                border-bottom: 2px solid black;
                                padding-bottom: 0.1cm;
                                margin-bottom: 0.1cm;
                                text-transform: uppercase;
                            }
                            .barcode-section {
                                text-align: center;
                                margin: 0.1cm 0;
                            }
                            .barcode-section svg {
                                width: 100%;
                                height: 1.5cm;
                            }
                            .info-row {
                                display: flex;
                                font-size: 10pt;
                                margin-bottom: 0.1cm;
                                line-height: 1.2;
                            }
                            .info-label {
                                font-weight: bold;
                                width: 2.2cm;
                                flex-shrink: 0;
                            }
                            .info-value {
                                flex-grow: 1;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                word-break: break-all;
                            }
                            .desc-value {
                                flex-grow: 1;
                                height: 2.4em;
                                overflow: hidden;
                                line-height: 1.2;
                            }
                            .status-box {
                                border: 2px solid black;
                                font-weight: bold;
                                text-align: center;
                                padding: 0.1cm;
                                margin-top: auto;
                                font-size: 12pt;
                                text-transform: uppercase;
                            }
                        </style>
                    </head>
                    <body>
                        ${printContent.innerHTML}
                        <script>
                            window.onload = function() {
                                window.print();
                                window.onafterprint = function() {
                                    window.close();
                                };
                            }
                        </script>
                    </body>
                    </html>
                `);
                win.document.close();
            }
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>Quarantine Label Generator</Title>
            <Card>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ status: 'QUARANTINE' }}
                >
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="lpn" label="LPN Code (Unique ID)" rules={[{ required: true }]}>
                                <Input readOnly style={{ backgroundColor: '#f5f5f5' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
                                <Input placeholder="SKU Number" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="qty" label="Qty" rules={[{ required: true }]}>
                                <Input type="number" placeholder="Quantity" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="description" label="Deskripsi" rules={[{ required: true }]}>
                                <Input.TextArea rows={2} placeholder="Item description..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="reason" label="Alasan Quarantine" rules={[{ required: true }]}>
                                <Input.TextArea rows={2} placeholder="Reason for quarantine..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item name="batch" label="Batch" rules={[{ required: true }]}>
                                <Input placeholder="Batch Number" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="mfg" label="Mfg Date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="exp" label="Exp Date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="startDate" label="Mulai Tanggal" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="QUARANTINE">QUARANTINE</Option>
                                    <Option value="HOLD">HOLD</Option>
                                    <Option value="REJECT">REJECT</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<PrinterOutlined />}>
                            Generate & Print Label
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {/* Hidden Print Section */}
            <div style={{ display: 'none' }}>
                <div id="quarantine-label-print">
                    <div className="label-container">
                        <div className="header">
                            QUARANTINE LABEL
                        </div>
                        
                        <div className="barcode-section">
                            {labelData?.lpn && (
                                <Barcode 
                                    value={labelData.lpn} 
                                    width={1.5} 
                                    height={40} 
                                    fontSize={12} 
                                    margin={0}
                                    displayValue={true}
                                />
                            )}
                        </div>

                        <div className="info-row">
                            <div className="info-label">SKU</div>
                            <div className="info-value">: {labelData?.sku}</div>
                        </div>
                        <div className="info-row">
                            <div className="info-label">Deskripsi</div>
                            <div className="info-value desc-value">: {labelData?.description}</div>
                        </div>
                        <div className="info-row">
                            <div className="info-label">Qty</div>
                            <div className="info-value">: {labelData?.qty}</div>
                        </div>
                        <div className="info-row">
                            <div className="info-label">Batch</div>
                            <div className="info-value">: {labelData?.batch}</div>
                        </div>
                        <div style={{ display: 'flex' }}>
                            <div style={{ flex: 1 }}>
                                <div className="info-row">
                                    <div className="info-label" style={{width: '1.2cm'}}>Mfg</div>
                                    <div className="info-value">: {labelData?.mfg?.format('DD MMM YYYY') || '-'}</div>
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="info-row">
                                    <div className="info-label" style={{width: '1.2cm'}}>Exp</div>
                                    <div className="info-value">: {labelData?.exp?.format('DD MMM YYYY') || '-'}</div>
                                </div>
                            </div>
                        </div>
                        <div className="info-row">
                            <div className="info-label">Mulai Tgl</div>
                            <div className="info-value">: {labelData?.startDate?.format('DD MMM YYYY') || '-'}</div>
                        </div>
                        <div className="info-row">
                            <div className="info-label">Alasan</div>
                            <div className="info-value desc-value">: {labelData?.reason}</div>
                        </div>

                        <div className="status-box">
                            STATUS: {labelData?.status}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
