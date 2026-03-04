import { Typography } from 'antd';

const { Title } = Typography;

export default function MonthlyReportPage() {
    return (
        <div style={{ padding: 24 }}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
                📊 Monthly Report
            </Title>
            <div style={{
                marginTop: 40,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 16,
                padding: '80px 0',
            }}>
                Halaman ini sedang dalam pengembangan.
            </div>
        </div>
    );
}
