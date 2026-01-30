const apiKey = process.env.GEMINI_API_KEY;
const baseUrl = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const modelName = process.env.GEMINI_MODEL || "gemini-1.5-pro";

export async function generateContent(prompt: string): Promise<string> {
    if (!apiKey) {
        throw new Error("Gemini API Key not set");
    }

    const url = `${baseUrl}/models/${modelName}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", response.status, errorText);
            throw new Error(`Gemini API Failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI 未返回有效内容";

    } catch (error) {
        console.error("Gemini Request Failed:", error);
        throw error;
    }
}
