import { Button, Modal, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { isAxiosError } from 'axios';

interface DeleteFilteredButtonProps {
    title: string;
    count: number;
    active: boolean;
    onDelete: () => Promise<void>;
}

export default function DeleteFilteredButton({
    title,
    count,
    active,
    onDelete,
}: DeleteFilteredButtonProps) {
    if (!active || count === 0) return null;

    return (
        <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => Modal.confirm({
                title: `Hapus ${count} data terfilter?`,
                content: `Semua ${count} data ${title} yang sesuai dengan filter aktif akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
                okText: `Ya, Hapus ${count} Data`,
                okType: 'danger',
                cancelText: 'Batal',
                onOk: async () => {
                    try {
                        await onDelete();
                        message.success(`${count} data ${title} berhasil dihapus`);
                    } catch (error) {
                        const serverMessage = isAxiosError<{ error?: string }>(error)
                            ? error.response?.data?.error
                            : undefined;
                        message.error(serverMessage || `Gagal menghapus data terfilter ${title}`);
                    }
                },
            })}
        >
            Hapus Terfilter ({count})
        </Button>
    );
}
