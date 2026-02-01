import { spawn } from 'child_process';
import https from 'https';
import http from 'http';

const COLORS = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

function log(label: string, status: 'PASS' | 'FAIL' | 'WARN', message: string) {
    const color = status === 'PASS' ? COLORS.green : (status === 'FAIL' ? COLORS.red : COLORS.yellow);
    console.log(`${color}[${status}] ${label}: ${message}${COLORS.reset}`);
}

async function checkGoogleConnectivity() {
    console.log("\n🔍 Checking AI API Connectivity...");

    // Read from .env if possible, otherwise default
    // Note: Since this runs in ts-node, we might need dotenv, but let's try a direct approach or hardcode for diagnosis if env fails
    // For now, let's hardcode the one we found in .env as a second check
    const officialUrl = "https://generativelanguage.googleapis.com";
    const customUrl = "https://api.apiyi.com"; // Found in user's .env

    console.log(`[Target 1] Official Google: ${officialUrl}`);
    console.log(`[Target 2] Your Proxy: ${customUrl}`);

    const check = async (url: string, label: string) => {
        return new Promise((resolve) => {
            const req = https.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
                if (res.statusCode && res.statusCode < 500) {
                    // 404 is technically "connected" (server reached), just path wrong. 
                    // But 403/200 are better.
                    log(label, "PASS", `Connected (Status: ${res.statusCode})`);
                    resolve(true);
                } else {
                    log(label, "WARN", `Status Code: ${res.statusCode}`);
                    resolve(false);
                }
            });

            req.on('error', (e) => {
                log(label, "FAIL", `Connection Error: ${e.message}`);
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                log(label, "FAIL", "Connection Timed Out (5s)");
                resolve(false);
            });

            req.end();
        });
    };

    const res1 = await check(officialUrl, "OFFICIAL API");
    const res2 = await check(customUrl, "CUSTOM PROXY");

    return res1 === true || res2 === true;
}

async function checkPythonBackend() {
    console.log("\n🔍 Checking Local Python Backend...");
    return new Promise((resolve) => {
        const req = http.request("http://localhost:8000/docs", { method: 'HEAD', timeout: 2000 }, (res) => {
            if (res.statusCode === 200) {
                log("PYTHON CORE", "PASS", "Service is Running (FastAPI Docs reachable)");
                resolve(true);
            } else {
                log("PYTHON CORE", "WARN", `Service responding with ${res.statusCode} (Expected 200)`);
                resolve(true); // Still reachable
            }
        });

        req.on('error', (e) => {
            log("PYTHON CORE", "FAIL", `Connection Refused: ${e.message}`);
            console.log(`${COLORS.yellow}Hint: Is the python container or script running? Try 'python3 python-core/api.py'${COLORS.reset}`);
            resolve(false);
        });

        req.end();
    });
}

async function main() {
    console.log(`${COLORS.green}=== MOJIN DIAGNOSTIC TOOL ===${COLORS.reset}`);

    const googleOk = await checkGoogleConnectivity();
    const pythonOk = await checkPythonBackend();

    console.log("\n------------------------------------------------");
    if (googleOk && pythonOk) {
        console.log(`${COLORS.green}✅ SYSTEM GO: All systems operational.${COLORS.reset}`);
    } else {
        console.log(`${COLORS.red}❌ SYSTEM HALT: Critical connectivity issues detected.${COLORS.reset}`);
    }
    console.log("------------------------------------------------\n");
}

main();
