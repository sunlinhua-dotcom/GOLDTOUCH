"use client";

import { useState } from "react";
import styles from "@/app/page.module.css"; // Reuse existing styles or define new ones
import { sendMockSms, loginWithPhone } from "@/app/actions/auth";

interface LoginModalProps {
    onSuccess: (userId: string, isNewUser: boolean) => void;
}

export default function LoginModal({ onSuccess }: LoginModalProps) {
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState<"PHONE" | "CODE">("PHONE");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [debugCode, setDebugCode] = useState(""); // To show user the mock code

    const handleSendCode = async () => {
        if (!phone || phone.length !== 11) {
            setError("请输入正确的 11 位手机号");
            return;
        }
        setError("");
        setLoading(true);

        try {
            const res = await sendMockSms(phone);
            if (res.success) {
                setStep("CODE");
                setDebugCode("1234"); // Hardcoded for demo as per plan
            } else {
                setError(res.message || "发送失败");
            }
        } catch (e) {
            setError("网络错误");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!code || code.length !== 4) {
            setError("请输入 4 位验证码");
            return;
        }
        setError("");
        setLoading(true);

        try {
            console.log('[LoginModal] 开始登录...', { phone, code });
            const res = await loginWithPhone(phone, code);
            console.log('[LoginModal] 登录响应:', res);

            if (res.success && res.userId) {
                console.log('[LoginModal] 登录成功, 用户ID:', res.userId);
                onSuccess(res.userId, res.isNewUser || false);
            } else {
                console.error('[LoginModal] 登录失败:', res.message);
                setError(res.message || "登录失败");
            }
        } catch (e) {
            console.error('[LoginModal] 登录异常:', e);
            const errorMsg = e instanceof Error ? e.message : "系统错误";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div
                className={styles.glassCard}
                style={{ width: "90%", maxWidth: "400px", padding: "2rem", textAlign: "center" }}
            >
                <h2 className="text-xl font-bold text-white mb-2">
                    {step === "PHONE" ? "开启深度洞察" : "输入验证码"}
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    {step === "PHONE"
                        ? "登录以保存您的专属分析记录"
                        : `验证码已发送至 ${phone}`}
                </p>

                {step === "PHONE" ? (
                    <div className="space-y-4">
                        <input
                            type="tel"
                            placeholder="请输入手机号"
                            className={styles.searchInput} // Reuse style
                            style={{ width: "100%", borderRadius: "8px", textAlign: "left" }}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        <button
                            onClick={handleSendCode}
                            disabled={loading}
                            className={styles.btnPrimary} // Assuming we have this or similar in globals
                            style={{ width: "100%", padding: "12px", marginTop: "1rem" }}
                        >
                            {loading ? "发送中..." : "获取验证码"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input
                            type="number"
                            placeholder="请输入验证码 (1234)"
                            className={styles.searchInput}
                            style={{ width: "100%", borderRadius: "8px", textAlign: "center", letterSpacing: "4px" }}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        {debugCode && (
                            <div className="text-xs text-green-400 mt-2">
                                测试环境提示：验证码是 {debugCode}
                            </div>
                        )}
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className={styles.btnPrimary}
                            style={{ width: "100%", padding: "12px", marginTop: "1rem" }}
                        >
                            {loading ? "登录中..." : "立刻进入"}
                        </button>
                        <button
                            onClick={() => setStep("PHONE")}
                            className="text-gray-500 text-xs mt-4 underline"
                        >
                            返回修改手机号
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-2 bg-red-500/20 text-red-200 text-xs rounded">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
