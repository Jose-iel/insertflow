import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { getStorage, logger } from '@insertflow/lib';

export class ImageGenerator {
  private browser: import('puppeteer').Browser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Gera PNG de alta qualidade a partir de HTML
   */
  async generatePNG(
    html: string,
    width: number,
    height: number,
    outputPath: string
  ): Promise<string> {
    await this.initialize();

    const page = await this.browser!.newPage();

    try {
      // Renderizar em 3x para qualidade de impressão
      const scale = 3;
      await page.setViewport({
        width: width * scale,
        height: height * scale,
        deviceScaleFactor: scale,
      });

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Aguardar todas as fontes carregarem
      await page.evaluate(() => {
        return document.fonts.ready;
      });

      // Aguardar um pouco mais para garantir renderização
      await page.waitForTimeout(500);

      // Screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      // Pós-processamento com Sharp (ajustar DPI metadata)
      const storage = getStorage();
      const processedBuffer = await sharp(screenshot)
        .withMetadata({ density: 300 }) // 300 DPI
        .png({ quality: 100, compressionLevel: 0 })
        .toBuffer();

      // Salvar
      await storage.upload(processedBuffer, outputPath, 'image/png');

      logger.info({ outputPath, size: processedBuffer.length }, 'PNG generated');

      return outputPath;
    } finally {
      await page.close();
    }
  }
}
