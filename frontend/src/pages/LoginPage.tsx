import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onFinish = async (values: { username: string; password: string }) => {
        setLoading(true);
        setError('');
        try {
            await login(values.username.trim().toLowerCase(), values.password);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login gagal. Periksa username dan password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d1117 100%)',
        }}>
            <Card
                style={{
                    width: 400,
                    borderRadius: 16,
                    background: 'rgba(26, 31, 58, 0.95)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                }}
                styles={{ body: { padding: 40 } }}
            >
                <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                    <div>
                        <Title level={3} style={{ color: '#fff', margin: 0 }}>
                            📦 Warehouse
                        </Title>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                            Report & Monitoring System
                        </Text>
                    </div>

                    {error && <Alert message={error} type="error" showIcon />}

                    <Form onFinish={onFinish} layout="vertical" size="large">
                        <Form.Item name="username" rules={[{ required: true, message: 'Username wajib diisi' }]}>
                            <Input prefix={<UserOutlined />} placeholder="Username" autoFocus />
                        </Form.Item>
                        <Form.Item name="password" rules={[{ required: true, message: 'Password wajib diisi' }]}>
                            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" block loading={loading}
                                style={{ height: 44, borderRadius: 8, fontWeight: 600 }}>
                                Login
                            </Button>
                        </Form.Item>
                    </Form>

                </Space>
            </Card>
        </div>
    );
}
