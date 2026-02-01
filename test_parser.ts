
// Mock of the parseReport function from page.tsx
interface ReportSections {
    signal: string;
    sentiment: string;
    technical: string;
    plan: string;
    risk: string;
}

const parseReport = (text: string): ReportSections => {
    const fallback: ReportSections = {
        signal: "分析生成中断",
        sentiment: "**数据解析异常**",
        technical: text,
        plan: "**请刷新重试**",
        risk: "**API 返回格式错误**"
    };

    try {
        const cleanText = text.replace(/```json\s*|\s*```/g, "").trim();
        const data = JSON.parse(cleanText);

        return {
            signal: data.signal || "暂无观点",
            sentiment: data.sentiment || "暂无分析",
            technical: data.technical || "暂无分析",
            plan: data.plan || "暂无计划",
            risk: data.risk || "暂无提示"
        };
    } catch (e) {
        return fallback;
    }
};

// Simulation Data
const scenarios = [
    {
        name: "✅ Perfect JSON",
        input: '{"signal": "看多", "sentiment": "良好", "technical": "支撑位100", "plan": "买入", "risk": "无"}'
    },
    {
        name: "✅ Markdown JSON",
        input: '```json\n{"signal": "看多", "sentiment": "良好", "technical": "支撑位100", "plan": "买入", "risk": "无"}\n```'
    },
    {
        name: "🛡️ Broken JSON (Fallback)",
        input: '{"signal": "看多", "broken...}' // Invalid JSON
    },
    {
        name: "🛡️ Garbage Text (Fallback)",
        input: 'This is not JSON at all.'
    }
];

console.log("🚀 Starting Parser Stability Test...\n");

scenarios.forEach(test => {
    console.log(`Testing: ${test.name}`);
    const result = parseReport(test.input);
    if (test.name.includes("Fixed") || test.name.includes("Perfect") || test.name.includes("Markdown")) {
        if (result.signal === "看多") console.log("   👉 PASS");
        else console.log("   ❌ FAIL");
    } else {
        // Fallback cases should return the technical field as the input text
        if (result.technical === test.input) console.log("   👉 PASS (Fallback Triggered)");
        else console.log("   ❌ FAIL (Fallback Missing)");
    }
});

console.log("\n✅ All Tests Completed.");
