import puppeteer from 'puppeteer';
import { print as printPdf } from 'pdf-to-printer';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Render HTML to PDF using headless Chromium, then send to printer silently.
 * This avoids any browser dialog — true 1-click printing.
 */
export async function renderAndPrint(
  html: string,
  paperWidth: 58 | 80,
  printerName?: string
): Promise<void> {
  const tmpDir = path.join(os.tmpdir(), 'foodhub-print');
  fs.mkdirSync(tmpDir, { recursive: true });

  const pdfPath = path.join(tmpDir, `receipt-${Date.now()}.pdf`);

  let browser;
  try {
    // Launch headless Chromium
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Set viewport to match paper width
    const widthPx = paperWidth === 58 ? 220 : 302; // approx px for 58mm/80mm at 96dpi
    await page.setViewport({ width: widthPx, height: 800 });

    // Load the HTML content
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 10000 });

    // Generate PDF matching thermal paper size
    const widthMM = paperWidth === 58 ? 58 : 80;
    await page.pdf({
      path: pdfPath,
      width: `${widthMM}mm`,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });

    await browser.close();
    browser = null;

    // Send PDF to printer silently
    const printOptions: { printer?: string } = {};
    if (printerName) {
      printOptions.printer = printerName;
    }

    await printPdf(pdfPath, printOptions);

    console.log(`[Print] ✓ Printed to ${printerName || 'default printer'} (${paperWidth}mm)`);
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    throw err;
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch {}
  }
}
