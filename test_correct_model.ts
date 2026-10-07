
import fetch from 'node-fetch';

// User Credentials
const BASE_URL = "https://api.apiyi.com/v1beta";
const KEY = process.env.APIYI_API_KEY;
if (!KEY) throw new Error('APIYI_API_KEY is not set');
const MODEL = "gemini-3-pro-preview";

async function main() {
    console.log(`=== TESTING MODEL: ${MODEL} ===`);
    const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });

        const text = await response.text();
        console.log(`Status: ${response.status}`);

        if (response.ok) {
            console.log("✅ SUCCESS");
            console.log(text.substring(0, 100));
        } else {
            console.log("❌ FAILED");
            console.log(text);
        }
    } catch (e: any) {
        console.log(`❌ ERROR: ${e.message}`);
    }
}

main();
