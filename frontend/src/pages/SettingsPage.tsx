import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Button, message, Table, Space, Modal, Select, Popconfirm, Tag, Typography } from 'antd';
import { LockOutlined, UserAddOutlined, DeleteOutlined, EditOutlined, KeyOutlined } from '@ant-design/icons';
import { usersApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const ROLE_OPTIONS = [
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'leader', label: 'Leader' },
    { value: 'admin_inbound', label: 'Admin Inbound' },
    { value: 'admin_inventory', label: 'Admin Inventory' },
];

const ROLE_COLORS: Record<string, string> = {
    supervisor: 'purple',
    leader: 'blue',
    admin_inbound: 'green',
    admin_inventory: 'orange',
};

interface UserRecord {
    id: number;
    username: string;
    role: string;
}

export default function SettingsPage() {
    const { user } = useAuth();
    const role = user?.role || '';
    const isSuper = role === 'supervisor' || role === 'leader';

    // Change own password
    const [pwForm] = Form.useForm();
    const [pwLoading, setPwLoading] = useState(false);

    const handleChangeOwnPassword = async () => {
        try {
            const values = await pwForm.validateFields();
            if (values.new_password !== values.confirm_password) {
                message.error('Password baru dan konfirmasi tidak cocok');
                return;
            }
            setPwLoading(true);
            await usersApi.changePassword(user!.user_id, {
                current_password: values.current_password,
                new_password: values.new_password,
            });
            message.success('Password berhasil diubah');
            pwForm.resetFields();
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Gagal mengubah password');
        } finally {
            setPwLoading(false);
        }
    };

    // Account management (supervisor/leader only)
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [createModal, setCreateModal] = useState(false);
    const [resetPwModal, setResetPwModal] = useState<UserRecord | null>(null);
    const [editRoleModal, setEditRoleModal] = useState<UserRecord | null>(null);
    const [createForm] = Form.useForm();
    const [resetPwForm] = Form.useForm();
    const [editRoleForm] = Form.useForm();

    const fetchUsers = useCallback(async () => {
        if (!isSuper) return;
        setUsersLoading(true);
        try {
            const res = await usersApi.list();
            setUsers(res.data || []);
        } catch {
            message.error('Gagal memuat daftar user');
        } finally {
            setUsersLoading(false);
        }
    }, [isSuper]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleCreateUser = async () => {
        try {
            const values = await createForm.validateFields();
            await usersApi.create(values);
            message.success('User berhasil ditambahkan');
            setCreateModal(false);
            createForm.resetFields();
            fetchUsers();
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Gagal membuat user');
        }
    };

    const handleResetPassword = async () => {
        if (!resetPwModal) return;
        try {
            const values = await resetPwForm.validateFields();
            await usersApi.changePassword(resetPwModal.id, { new_password: values.new_password });
            message.success(`Password ${resetPwModal.username} berhasil direset`);
            setResetPwModal(null);
            resetPwForm.resetFields();
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Gagal reset password');
        }
    };

    const handleChangeRole = async () => {
        if (!editRoleModal) return;
        try {
            const values = await editRoleForm.validateFields();
            await usersApi.changeRole(editRoleModal.id, values.role);
            message.success(`Role ${editRoleModal.username} berhasil diubah`);
            setEditRoleModal(null);
            editRoleForm.resetFields();
            fetchUsers();
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Gagal mengubah role');
        }
    };

    const handleDeleteUser = async (record: UserRecord) => {
        try {
            await usersApi.remove(record.id);
            message.success(`User ${record.username} berhasil dihapus`);
            fetchUsers();
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Gagal menghapus user');
        }
    };

    const userColumns = [
        { title: 'Username', dataIndex: 'username', key: 'username' },
        {
            title: 'Role', dataIndex: 'role', key: 'role',
            render: (r: string) => <Tag color={ROLE_COLORS[r] || 'default'}>{ROLE_OPTIONS.find(o => o.value === r)?.label || r}</Tag>,
        },
        {
            title: 'Actions', key: 'actions', width: 200,
            render: (_: any, record: UserRecord) => (
                <Space size="small">
                    <Button size="small" icon={<KeyOutlined />} onClick={() => { setResetPwModal(record); resetPwForm.resetFields(); }}>
                        Reset PW
                    </Button>
                    <Button size="small" icon={<EditOutlined />} onClick={() => { setEditRoleModal(record); editRoleForm.setFieldsValue({ role: record.role }); }}>
                        Role
                    </Button>
                    {record.id !== user?.user_id && (
                        <Popconfirm title={`Hapus user ${record.username}?`} onConfirm={() => handleDeleteUser(record)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
            <Title level={3} style={{ color: '#fff', marginBottom: 24 }}>⚙️ Settings</Title>

            {/* Change Own Password */}
            <Card
                title={<Text style={{ color: '#fff', fontWeight: 600 }}>🔒 Ubah Password</Text>}
                style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, marginBottom: 24 }}
                styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.06)' } }}
            >
                <Form form={pwForm} layout="vertical" style={{ maxWidth: 400 }}>
                    <Form.Item name="current_password" label={<Text style={{ color: 'rgba(255,255,255,0.7)' }}>Password Lama</Text>} rules={[{ required: true, message: 'Wajib diisi' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Masukkan password lama" />
                    </Form.Item>
                    <Form.Item name="new_password" label={<Text style={{ color: 'rgba(255,255,255,0.7)' }}>Password Baru</Text>} rules={[{ required: true, message: 'Wajib diisi' }, { min: 6, message: 'Minimal 6 karakter' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Masukkan password baru" />
                    </Form.Item>
                    <Form.Item name="confirm_password" label={<Text style={{ color: 'rgba(255,255,255,0.7)' }}>Konfirmasi Password Baru</Text>} rules={[{ required: true, message: 'Wajib diisi' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Ulangi password baru" />
                    </Form.Item>
                    <Button type="primary" loading={pwLoading} onClick={handleChangeOwnPassword} icon={<LockOutlined />}>
                        Ubah Password
                    </Button>
                </Form>
            </Card>

            {/* Account Management (supervisor/leader only) */}
            {isSuper && (
                <Card
                    title={<Text style={{ color: '#fff', fontWeight: 600 }}>👥 Manajemen Akun</Text>}
                    style={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}
                    styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.06)' } }}
                    extra={
                        <Button type="primary" icon={<UserAddOutlined />} onClick={() => { setCreateModal(true); createForm.resetFields(); }}>
                            Tambah User
                        </Button>
                    }
                >
                    <Table
                        dataSource={users}
                        columns={userColumns}
                        rowKey="id"
                        loading={usersLoading}
                        pagination={false}
                        size="small"
                    />
                </Card>
            )}

            {/* Create User Modal */}
            <Modal title="Tambah User Baru" open={createModal} onCancel={() => setCreateModal(false)} onOk={handleCreateUser} okText="Buat" cancelText="Batal">
                <Form form={createForm} layout="vertical">
                    <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Wajib diisi' }]}>
                        <Input placeholder="Username" />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Wajib diisi' }, { min: 6, message: 'Minimal 6 karakter' }]}>
                        <Input.Password placeholder="Password" />
                    </Form.Item>
                    <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Pilih role' }]}>
                        <Select options={ROLE_OPTIONS} placeholder="Pilih role" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal title={`Reset Password — ${resetPwModal?.username}`} open={!!resetPwModal} onCancel={() => setResetPwModal(null)} onOk={handleResetPassword} okText="Reset" cancelText="Batal">
                <Form form={resetPwForm} layout="vertical">
                    <Form.Item name="new_password" label="Password Baru" rules={[{ required: true, message: 'Wajib diisi' }, { min: 6, message: 'Minimal 6 karakter' }]}>
                        <Input.Password placeholder="Password baru" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Role Modal */}
            <Modal title={`Ubah Role — ${editRoleModal?.username}`} open={!!editRoleModal} onCancel={() => setEditRoleModal(null)} onOk={handleChangeRole} okText="Simpan" cancelText="Batal">
                <Form form={editRoleForm} layout="vertical">
                    <Form.Item name="role" label="Role Baru" rules={[{ required: true, message: 'Pilih role' }]}>
                        <Select options={ROLE_OPTIONS} placeholder="Pilih role" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
