"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getLatestProReport } from "@/app/actions/analysis";
import ReactMarkdown from "react-markdown";

export default function ProPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const router = useRouter();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                // Fetch the persistent PRO report from MongoDB
                const dbReport = await getLatestProReport(code);
                if (dbReport && dbReport.content) {
                    try {
                        const parsed = JSON.parse(dbReport.content);
                        setReport({
                            ...parsed,
                            // Ensure we use the persisted deep insight if available in the model fields
                            // @ts-ignore
                            deep_insight: dbReport.deepInsight || parsed.deep_insight
                        });
                    } catch (e) {
                        console.error("JSON Parse Error", e);
                    }
                }
            } catch (error) {
                console.error("Failed to load pro report", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [code]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-[#D4AF37]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-sm tracking-widest uppercase">Loading Black Gold Insight...</div>
                </div>
            </div>
        );
    }

    if (!report || !report.deep_insight) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <div className="text-4xl mb-4">🔒</div>
                    <p className="mb-6">暂无该标的的深度内参或权限已过期</p>
                    <button
                        onClick={() => router.push(`/report/${code}`)}
                        className="px-6 py-2 border border-[#D4AF37] text-[#D4AF37] rounded-full hover:bg-[#D4AF37]/10 transition-colors"
                    >
                        返回基础研报
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-sans selection:bg-[#D4AF37]/30 pb-20">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#D4AF37]/20 flex justify-between items-center px-4 h-14">
                <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-[#D4AF37]">
                    ←
                </button>
                <div className="text-[#D4AF37] text-xs tracking-[0.2em] font-bold">BLACK GOLD INSIGHT</div>
                <div className="w-8"></div>
            </div>

            {/* Header Content */}
            <div className="pt-24 px-6 mb-8 text-center">
                <div className="inline-block px-3 py-1 border border-[#D4AF37] rounded text-[#D4AF37] text-[10px] font-bold tracking-widest mb-4">
                    INTERNAL REFERENCE
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">{code}</h1>
                <div className="text-[#D4AF37] text-xl font-mono tracking-wider">AI SCORE: {report.ai_score || 85}</div>
            </div>

            {/* Main Content Cards */}
            <div className="px-4 space-y-6 max-w-2xl mx-auto">

                {/* 1. Deep Insight Analysis */}
                <div className="bg-[#0f0f15] border border-[#D4AF37]/30 rounded-xl p-6 shadow-[0_0_30px_rgba(212,175,55,0.05)]">
                    <h2 className="text-[#D4AF37] text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse"></span>
                        Institutional Analysis
                    </h2>

                    <div className="prose prose-invert prose-p:text-gray-300 prose-strong:text-white prose-li:text-gray-300 max-w-none">
                        <ReactMarkdown>{report.deep_insight}</ReactMarkdown>
                    </div>
                </div>

                {/* 2. Signal & Strategy */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0f0f15] border border-white/5 rounded-xl p-4">
                        <div className="text-xs text-gray-500 mb-1">SIGNAL</div>
                        <div className="text-lg font-bold text-white">{report.signal}</div>
                    </div>
                    <div className="bg-[#0f0f15] border border-white/5 rounded-xl p-4">
                        <div className="text-xs text-gray-500 mb-1">STRATEGY</div>
                        <div className="text-sm font-bold text-white line-clamp-2">{report.strategy?.rationale}</div>
                    </div>
                </div>

                {/* 3. Watermark / Footer */}
                <div className="text-center pt-8 opacity-30">
                    <div className="w-12 h-12 mx-auto border border-[#D4AF37] rounded-full flex items-center justify-center mb-2">
                        <span className="text-[#D4AF37] text-xs">M</span>
                    </div>
                    <p className="text-[10px] text-[#D4AF37] tracking-[0.3em]">MOJIN QUANT PRO</p>
                </div>
            </div>
        </div>
    );
}
