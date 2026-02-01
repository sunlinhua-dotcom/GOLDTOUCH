
async function testTimeout() {
    console.log("🧪 Testing Fetch Timeout (1s timeout)...");

    // Check for global AbortController
    if (typeof AbortController === 'undefined') {
        console.error("❌ Global AbortController not found. Node version too old?");
        process.exit(1);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
        console.log("⏰ Timer fired, calling abort()");
        controller.abort();
    }, 1000);

    try {
        console.log("📡 Initiating request to 10.255.255.1...");
        // Use global fetch
        if (typeof fetch === 'undefined') {
            console.error("❌ Global fetch not found. Node version too old?");
            process.exit(1);
        }

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
