import { createContext, useContext, useState, type ReactNode } from 'react';
import { authApi } from '../api/client';

interface User {
    user_id: number;
    username: string;
    role: string;
    token: string;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    const login = async (username: string, password: string) => {
        const res = await authApi.login(username, password);
        const userData: User = {
            user_id: res.data.user_id,
            username: res.data.username,
            role: res.data.role,
            token: res.data.token,
        };
        localStorage.setItem('token', userData.token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

// Role-based access config
export const ROLE_ACCESS: Record<string, { pages: string[] | 'all' }> = {
    supervisor: { pages: 'all' },
    leader: { pages: 'all' },
    admin_inbound: {
        pages: ['dashboard', 'inbound-arrival', 'inbound-transaction', 'inbound-unloading', 'vas', 'berita-acara', 'clock-inout', 'productivity'],
    },
    admin_inventory: {
        pages: ['dashboard', 'daily-cycle-count', 'project-damage', 'stock-on-hand', 'qc-return', 'master-location', 'stock-opname', 'clock-inout', 'productivity'],
    },
};

export function hasPageAccess(role: string, pageId: string): boolean {
    const access = ROLE_ACCESS[role];
    if (!access) return false;
    if (access.pages === 'all') return true;
    return access.pages.includes(pageId);
}
