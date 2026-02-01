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
    aiScore?: number | null;
    type?: string | null; // "BASIC" | "PRO"
    isUnlocked?: boolean;
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<{ phone: string | null } | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"ALL" | "PRO">("ALL");

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

    const filteredHistory = tab === "ALL"
        ? history
        : history.filter(h => h.type === "PRO" || h.aiScore && h.aiScore > 0);

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
            <div className="max-w-md mx-auto relative pt-4 mb-8">
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
                    className="p-8 rounded-[2rem] mb-8 relative overflow-hidden"
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                    }}
                >
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 to-purple-500 mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            <div className="w-full h-full rounded-full bg-[#161622] flex items-center justify-center">
                                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-tr from-blue-400 to-purple-400">
                                    {user?.phone ? user.phone.slice(-2) : 'U'}
                                </span>
                            </div>
                        </div>
                        <div className="text-xl font-bold tracking-widest mb-1">
                            {user?.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20 text-[var(--accent-gold)] text-xs font-medium tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)] animate-pulse"></span>
                            MOJIN MEMBER
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-white/5 pb-2">
                    <button
                        onClick={() => setTab("ALL")}
                        className={`text-sm font-bold tracking-wide pb-2 transition-colors ${tab === "ALL" ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-white"}`}
                    >
                        全部历史
                    </button>
                    <button
                        onClick={() => setTab("PRO")}
                        className={`text-sm font-bold tracking-wide pb-2 transition-colors flex items-center gap-1 ${tab === "PRO" ? "text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)]" : "text-gray-500 hover:text-[var(--accent-gold)]"}`}
                    >
                        <span>💎</span> 黑金内参
                    </button>
                </div>

                <div className="space-y-3">
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-12 text-gray-600 text-sm bg-white/5 rounded-2xl border border-white/5 border-dashed">
                            {tab === "ALL" ? "暂无历史记录" : "暂无黑金内参记录"}
                        </div>
                    ) : (
                        filteredHistory.map((item) => {
                            const isPro = item.type === "PRO" || (item.aiScore && item.aiScore > 0);
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => router.push(isPro ? `/report/${encodeURIComponent(item.stockCode)}/pro` : `/report/${encodeURIComponent(item.stockCode)}`)}
                                    className="group p-4 rounded-xl relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                    style={{
                                        background: isPro
                                            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(0,0,0,0.2) 100%)'
                                            : 'rgba(255, 255, 255, 0.03)',
                                        border: isPro
                                            ? '1px solid rgba(255, 215, 0, 0.15)'
                                            : '1px solid rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    {/* Score Badge */}
                                    {item.aiScore ? (
                                        <div className="absolute right-4 top-4">
                                            <div className={`text-xl font-bold font-mono ${isPro ? 'text-[var(--accent-gold)]' : 'text-blue-400'}`}>
                                                {item.aiScore}
                                                <span className="text-[10px] text-gray-500 ml-0.5">/100</span>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="flex justify-between items-center relative z-10">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className={`font-bold text-lg tracking-wide transition-colors ${isPro ? 'text-[var(--accent-gold)]' : 'text-white group-hover:text-blue-400'}`}>
                                                    {item.stockName || item.stockCode}
                                                </div>
                                                {isPro && <span className="text-[10px] bg-[var(--accent-gold)] text-black px-1.5 py-0.5 rounded font-bold">PRO</span>}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="text-sm font-mono text-gray-400 bg-black/20 px-2 py-0.5 rounded border border-white/5">
                                                    {item.stockCode}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono">
                                                    {new Date(item.createdAt).toLocaleString('zh-CN', {
                                                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
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
