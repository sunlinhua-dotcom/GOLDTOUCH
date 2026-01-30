"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkSession, logout } from "@/app/actions/auth";
import { getUserHistory } from "@/app/actions/analysis";

interface HistoryItem {
    id: string;
    stockCode: string;
    stockName: string | null;
    createdAt: Date;
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<{ phone: string | null } | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Check Session
                const u = await checkSession();
                if (!u) {
                    router.replace("/"); // Redirect if not logged in
                    return;
                }
                setUser({ phone: u.phone });

                // 2. Fetch History
                const data = await getUserHistory();
                setHistory(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [router]);

    const handleLogout = async () => {
        if (confirm("确定要退出登录吗？")) {
            await logout();
            router.replace("/");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500"
                style={{
                    background: 'radial-gradient(circle at 50% 30%, #1a1a3a 0%, #0d0d12 70%)'
                }}
            >
                加载中...
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white p-6 pb-20 fade-in"
            style={{
                background: 'radial-gradient(circle at 50% 30%, #1a1a3a 0%, #0d0d12 70%)',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
        >
            {/* Header / Nav */}
            <div className="max-w-md mx-auto relative pt-4 mb-10">
                <button
                    onClick={() => router.back()}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <span className="text-xl pb-1">←</span>
                </button>
                <h1 className="text-center font-bold tracking-[0.2em] text-lg text-white/90">
                    MOJIN USER
                </h1>
            </div>

            <div className="max-w-md mx-auto">
                {/* User Card */}
                <div
                    className="p-8 rounded-[2rem] mb-10 relative overflow-hidden"
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                    }}
                >
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 to-purple-500 mb-4 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                            <div className="w-full h-full rounded-full bg-[#161622] flex items-center justify-center">
                                <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-tr from-blue-400 to-purple-400">
                                    {user?.phone ? user.phone.slice(-2) : 'U'}
                                </span>
                            </div>
                        </div>
                        <div className="text-2xl font-bold tracking-widest mb-1">
                            {user?.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20 text-[var(--accent-gold)] text-xs font-medium tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)] animate-pulse"></span>
                            MOJIN MEMBER
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="mb-6 flex justify-between items-end px-2">
                    <h2 className="text-sm text-gray-400 font-bold uppercase tracking-widest">History</h2>
                    <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-md font-mono">{history.length} RECORDS</span>
                </div>

                <div className="space-y-3">
                    {history.length === 0 ? (
                        <div className="text-center py-12 text-gray-600 text-sm bg-white/5 rounded-2xl border border-white/5 border-dashed">
                            暂无历史记录
                        </div>
                    ) : (
                        history.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => router.push(`/report/${encodeURIComponent(item.stockCode)}`)}
                                className="group p-4 rounded-xl relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex justify-between items-center relative z-10">
                                    <div>
                                        <div className="font-bold text-white text-lg tracking-wide group-hover:text-blue-400 transition-colors">
                                            {item.stockName || item.stockCode}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 font-mono">
                                            {new Date(item.createdAt).toLocaleString('zh-CN', {
                                                month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                    <div className="text-sm font-mono text-gray-400 bg-black/20 px-3 py-1 rounded-lg border border-white/5 group-hover:border-blue-500/30 transition-colors">
                                        {item.stockCode}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Logout */}
                <div className="mt-12 mb-8">
                    <button
                        onClick={handleLogout}
                        className="w-full py-4 rounded-2xl text-red-400 font-medium text-sm tracking-widest hover:bg-red-500/10 active:bg-red-500/20 transition-all border border-transparent hover:border-red-500/20"
                    >
                        LOGOUT
                    </button>
                </div>
            </div>
        </div>
    );
}
