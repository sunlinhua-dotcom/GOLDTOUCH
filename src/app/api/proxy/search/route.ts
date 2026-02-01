
import { NextRequest, NextResponse } from 'next/server';



export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Use Python Backend (QUANT_API_URL)
        const baseUrl = process.env.QUANT_API_URL || "http://localhost:8000";
        const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            console.error(`[Proxy] Backend Error: ${response.status}`);
            return NextResponse.json({ results: [] });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("[Proxy] Search Error:", error);
        return NextResponse.json({ results: [] }, { status: 500 });
    }
}
