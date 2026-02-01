"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Mock Verification Code Store (In production use Redis)
// For dev/demo, we assume code is always "1234"
const MOCK_CODE = "1234";

export async function sendMockSms(phone: string) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!/^1[3-9]\d{9}$/.test(phone)) {
        return { success: false, message: "手机号格式错误" };
    }

    console.log(`[Mock SMS] Sending code ${MOCK_CODE} to ${phone}`);
    return { success: true, message: "验证码已发送 (测试码: 1234)" };
}

export async function loginWithPhone(phone: string, code: string) {
    console.log('[Auth] 开始登录流程:', { phone, code });

    if (code !== MOCK_CODE) {
        console.log('[Auth] 验证码错误');
        return { success: false, message: "验证码错误" };
    }

    try {
        console.log('[Auth] 查找用户...');
        // 1. Find or Create User
        let user = await prisma.user.findUnique({
            where: { phone },
        });

        let isNewUser = false;

        if (!user) {
            console.log(`[Auth] 用户不存在,创建新用户 phone=${phone}...`);
            user = await prisma.user.create({
                data: {
                    phone,
                    // New user gets 0 quota used (meaning 1 free try available)
                    freeQuotaUsed: 0,
                },
            });
            isNewUser = true;
            console.log('[Auth] 新用户创建成功, ID:', user.id);
        } else {
            console.log('[Auth] 找到已有用户:', user.id);
        }

        // 2. Set Session Cookie (Simple ID for now, JWT in real prod)
        // We use a simple coherent session value: "USER_ID"
        console.log('[Auth] 设置Cookie...');
        const cookieStore = await cookies();
        cookieStore.set("mojin_session", user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30, // 30 Days
            path: "/",
        });

        console.log('[Auth] 登录成功');
        return {
            success: true,
            userId: user.id,
            isNewUser,
            quotaUsed: user.freeQuotaUsed
        };

    } catch (error) {
        console.error("[Auth] 登录错误:", error);
        // 返回更详细的错误信息
        const errorMessage = error instanceof Error ? error.message : "系统错误";
        return { success: false, message: `系统错误: ${errorMessage}` };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("mojin_session");
    return { success: true };
}

export async function checkSession() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("mojin_session")?.value;

    if (!userId) return null;

    // Validate MongoDB ObjectID format (24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        console.warn(`[Auth] Invalid Session ID format detected (Migration cleanup): ${userId}`);
        cookieStore.delete("mojin_session");
        return null;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, phone: true, freeQuotaUsed: true, isVip: true }
        });
        return user;
    } catch (e) {
        console.error("Session Check Error:", e);
        return null;
    }
}
