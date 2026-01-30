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
    if (code !== MOCK_CODE) {
        return { success: false, message: "验证码错误" };
    }

    try {
        // 1. Find or Create User
        let user = await prisma.user.findUnique({
            where: { phone },
        });

        let isNewUser = false;

        if (!user) {
            user = await prisma.user.create({
                data: {
                    phone,
                    // New user gets 0 quota used (meaning 1 free try available)
                    freeQuotaUsed: 0,
                },
            });
            isNewUser = true;
        }

        // 2. Set Session Cookie (Simple ID for now, JWT in real prod)
        // We use a simple coherent session value: "USER_ID"
        const cookieStore = await cookies();
        cookieStore.set("mojin_session", user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30, // 30 Days
            path: "/",
        });

        return {
            success: true,
            userId: user.id,
            isNewUser,
            quotaUsed: user.freeQuotaUsed
        };

    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, message: "系统错误" };
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

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, phone: true, freeQuotaUsed: true, isVip: true }
    });

    return user;
}
