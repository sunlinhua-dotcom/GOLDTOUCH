"use client";

import { useEffect, useState } from "react";
import { checkSession } from "@/app/actions/auth";
import Link from "next/link";

export default function Header() {
    const [user, setUser] = useState<{ phone: string | null } | null>(null);
    // Removed sidebar state

    useEffect(() => {
        checkSession().then((u) => {
            if (u && u.phone) setUser({ phone: u.phone });
        });
    }, []);

    if (!user) return null; // Or show Login button if desired

    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-6 pointer-events-none">
            {/* User Avatar (App Store Style) - Absolute Positioned */}
            <div className="pointer-events-auto absolute top-6 right-6">
                <Link href="/profile">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-[2px] shadow-lg cursor-pointer hover:scale-105 transition-transform">
                        <div className="w-full h-full rounded-full bg-[#161622] flex items-center justify-center overflow-hidden">
                            {/* Initials or Icon */}
                            <span className="font-bold text-white text-sm">
                                {user.phone ? user.phone.slice(-2) : 'ME'}
                            </span>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
