
const { AbortController } = require('abort-controller'); // Fallback or global

async function testTimeout() {
    console.log("🧪 Testing Fetch Timeout (1s timeout)...");

    // Node 18+ has global AbortController. If not, polyfill.
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        console.log("⏰ Timer fired, calling abort()");
        controller.abort();
    }, 1000);

    try {
        console.log("📡 Initiating request to non-routable IP (simulating hang)...");
        // 10.255.255.1 is blackhole.
        // If fetch supports signal, it should throw AbortError after 1s.
        const response = await fetch("http://10.255.255.1", {
            signal: controller.signal,
        });
        console.log("❌ Request Success (Should have timed out)");
    } catch (e) {
        if (e.name === 'AbortError' || e.code === 'ABORT_ERR') {
            console.log("✅ Caught AbortError! Runtime correctly supports signal abort.");
        } else {
            console.log(`⚠️ Caught other error: ${e.name} - ${e.message}`);
        }
    } finally {
        clearTimeout(timeout);
    }
}

testTimeout();
