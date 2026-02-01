
import { NextRequest, NextResponse } from 'next/server';

// Get Python Service URL from env
const QUANT_API_URL = process.env.QUANT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const { path } = await params;
        const targetPath = path.join('/');
        const url = `${QUANT_API_URL}/${targetPath}`;

        console.log(`[Quant Proxy] Forwarding to ${url}`);

        const body = await request.json();

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add internal secret if needed for security
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[Quant Proxy] Error ${res.status}: ${errorText}`);
            return NextResponse.json({ error: "Quant Core Error", details: errorText }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("[Quant Proxy] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
