import React, { useState, useEffect } from 'react';

interface PaymentModalProps {
    onClose: () => void;
    onPaid: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onPaid }) => {
    // Simple state to detect mobile (default to desktop to match SSR, update in effect)
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-yellow-600/30 rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.15)] overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-5 border-b border-white/5 bg-gradient-to-b from-yellow-900/10 to-transparent">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                            <span className="text-yellow-500 font-bold tracking-wider text-sm">付款引导</span>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-white pb-1">✕</button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Step 1: QR Code */}
                    <div className="mb-6 text-center">
                        <div className="text-sm text-gray-400 mb-3">
                            <span className="bg-white/10 text-white px-2 py-0.5 rounded text-xs mr-2">STEP 1</span>
                            {isMobile ? "保存二维码到相册" : "使用微信扫一扫"}
                        </div>

                        <div className="relative group inline-block">
                            <div className="p-2 bg-white rounded-xl shadow-2xl relative z-10">
                                <img
                                    src="/payment-qr.jpg"
                                    alt="WeChat Pay"
                                    className="w-48 h-48 object-contain"
                                />
                            </div>
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full -z-0" />
                        </div>

                        {/* Mobile Save Hint */}
                        {isMobile && (
                            <div className="mt-3 text-xs text-gray-500">
                                *长按上方图片可保存
                            </div>
                        )}
                    </div>

                    {/* Step 2: Remark - HIGHLIGHTED */}
                    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4 mb-6 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1">
                            <div className="text-[10px] bg-yellow-600 text-black font-bold px-1.5 rounded-bl">必填</div>
                        </div>
                        <div className="text-sm text-gray-400 mb-1">
                            <span className="bg-yellow-600/20 text-yellow-500 px-2 py-0.5 rounded text-xs mr-2">STEP 2</span>
                            付款时请务必备注
                        </div>
                        <div className="text-4xl font-black text-white tracking-widest mt-1 drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)]">
                            001
                        </div>
                        <div className="text-[10px] text-gray-500 mt-2">
                            ( 系统自动识别备注码，秒级自动解锁 )
                        </div>
                    </div>

                    {/* Step 3: Action */}
                    <button
                        onClick={onPaid}
                        className="w-full py-3.5 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-bold text-lg rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 group"
                    >
                        <span>我已支付，立即解锁</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                    <div className="text-center mt-3 text-xs text-gray-600">
                        支付遇到问题？联系客服
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
