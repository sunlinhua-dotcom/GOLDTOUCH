
import fetch from 'node-fetch';
import { AbortController } from 'node-abort-controller';

async function testTimeout() {
    console.log("🧪 Testing Fetch Timeout (1s timeout, 3s delay)...");
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        console.log("⏰ Timer fired, calling abort()");
        controller.abort();
    }, 1000);

    try {
        // Use a known delay service (httpstat.us or similar)
        // httpstat.us is often flaky. Let's use a local server or a reliable logic.
        // Actually, since I can't easily spin up a delay server on external URL, 
        // I will rely on the fact that Google API is blocked/slow or use a non-routable IP to simulate hang?
        // Connecting to a blackhole IP (e.g. 10.255.255.1) hangs until TCP timeout.
        console.log("📡 Initiating request...");
        const response = await fetch("http://10.255.255.1", {
            signal: controller.signal,
            timeout: 5000 // node-fetch supports timeout option directly too, but we want to test signal
        });
        console.log("❌ Request Success (Should have timed out)");
    } catch (e: any) {
        if (e.name === 'AbortError') {
            console.log("✅ Caught AbortError! Timeout logic works.");
        } else {
            console.log(`⚠️ Caught other error: ${e.name} - ${e.message}`);
        }
    } finally {
        clearTimeout(timeout);
    }
}

testTimeout();
