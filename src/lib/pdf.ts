"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PDFOptions {
    stockName: string;
    stockCode: string;
    elementId?: string;
}

/**
 * 将页面内容导出为 PDF
 */
export async function exportToPDF({ stockName, stockCode, elementId = "report-content" }: PDFOptions): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("Report content element not found");
        return;
    }

    try {
        // 创建 canvas
        const canvas = await html2canvas(element, {
            scale: 2, // 提高清晰度
            useCORS: true,
            logging: false,
            backgroundColor: "#050505", // 匹配深色背景
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 210; // A4 宽度 (mm)
        const pageHeight = 297; // A4 高度 (mm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF({
            orientation: imgHeight > pageHeight ? "portrait" : "portrait",
            unit: "mm",
            format: "a4",
        });

        let heightLeft = imgHeight;
        let position = 0;

        // 添加第一页
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // 如果内容超过一页，添加更多页
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        // 生成文件名
        const date = new Date().toISOString().split("T")[0];
        const filename = `${stockName}_${stockCode}_分析报告_${date}.pdf`;

        // 下载 PDF
        pdf.save(filename);
    } catch (error) {
        console.error("PDF generation failed:", error);
        throw error;
    }
}
