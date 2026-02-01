const apiKey = process.env.GEMINI_API_KEY;
const baseUrl = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const modelName = process.env.GEMINI_MODEL || "gemini-1.5-pro";

interface GeminiPayload {
    contents: { parts: { text: string }[] }[];
    generationConfig: {
        temperature: number;
        maxOutputTokens: number;
    };
    system_instruction?: { parts: { text: string }[] };
}

export async function generateContent(prompt: string, systemInstruction?: string): Promise<string> {
    if (!apiKey) {
        throw new Error("Gemini API Key not set");
    }

    const url = `${baseUrl}/models/${modelName}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    // Increase timeout to 120s for "Thinking" models which are slower
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const payload: GeminiPayload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0,
                maxOutputTokens: 8192,
            }
        };

        if (systemInstruction) {
            payload.system_instruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId); // Clear timeout on response

        console.log(`[GEMINI REQUEST] Payload built with systemInstruction: ${!!systemInstruction}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", response.status, errorText);
            throw new Error(`API Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[GEMINI RESPONSE DATA] ${JSON.stringify(data).substring(0, 500)}`);
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI 未返回有效内容";

    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error("Gemini Request Timed Out (120s limit)");
            throw new Error("Connection Timeout (120s): AI Thinking took too long.");
        }
        console.error("Gemini Request Failed:", error);
        throw error;
    }
}
