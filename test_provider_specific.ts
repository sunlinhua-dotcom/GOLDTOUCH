
import fetch from 'node-fetch';

// User Credentials
const BASE_URL = "https://api.apiyi.com/v1beta";
const KEY = "sk-odv3sA6QHXCSt95O8c1902509b6f41A7861f78Ff007d1879";

async function testModel(modelName: string) {
    const url = `${BASE_URL}/models/${modelName}:generateContent?key=${KEY}`;
    console.log(`\n🧪 Testing Model: ${modelName}`);
    console.log(`📡 URL: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello, are you working?" }] }]
            })
        });

        const text = await response.text();
        console.log(`📝 Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            console.log(`✅ SUCCESS! Response snippet: ${text.substring(0, 100)}...`);
            return true;
        } else {
            console.log(`❌ FAILED. Response: ${text}`);
            return false;
        }
    } catch (e: any) {
        console.log(`❌ EXCEPTION: ${e.message}`);
        return false;
    }
}

async function main() {
    console.log("=== PROVIDER CONFIGURATION TEST ===");

    // Test 1: User's Claimed Model
    const userModel = "gemini-3-pro-preview-thinking";
    const userSuccess = await testModel(userModel);

    // Test 2: Current Env Model (if different)
    const envModel = "gemini-3-pro-preview";
    if (userModel !== envModel) {
        await testModel(envModel);
    }
}

main();
