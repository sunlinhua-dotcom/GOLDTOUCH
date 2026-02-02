import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { stock_code, user_id } = body;

        // Python 后端 URL（从服务端环境变量读取）
        const quantApiUrl = process.env.QUANT_API_URL || 'http://localhost:8000';

        console.log(`[Deep Analysis Proxy] Calling Python API: ${quantApiUrl}/api/analysis/deep-analysis`);
        console.log(`[Deep Analysis Proxy] Stock: ${stock_code}, User: ${user_id}`);

        const response = await fetch(`${quantApiUrl}/api/analysis/deep-analysis`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                stock_code,
                user_id,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Deep Analysis Proxy] Python API Error: ${response.status}`, errorText);
            return NextResponse.json(
                { success: false, message: `Python API Error: ${response.status}` },
                { status: response.status }
            );
        }

        const result = await response.json();
        console.log(`[Deep Analysis Proxy] Success! Stock: ${stock_code}`);

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Deep Analysis Proxy] Error:', error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
