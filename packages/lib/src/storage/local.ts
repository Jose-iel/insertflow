import fs from 'fs/promises';
import path from 'path';
import { StorageProvider } from './types';

export class LocalStorage implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    // STORAGE_PATH deve ser um caminho absoluto
    // Se não definido, usar /Users/josehenrique/Pessoal/insertflow/uploads como fallback de dev
    const storagePath = process.env.STORAGE_PATH || '/Users/josehenrique/Pessoal/insertflow/uploads';
    this.basePath = storagePath;
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    console.log('[LocalStorage] basePath:', this.basePath);
    console.log('[LocalStorage] baseUrl:', this.baseUrl);
  }

  async upload(file: Buffer, filePath: string, contentType: string): Promise<string> {
    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file);

    return filePath;
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, filePath);
    return await fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    await fs.unlink(fullPath);
  }

  getUrl(filePath: string): string {
    // Adicionar timestamp para cache busting (evitar cache do Cloudflare)
    const timestamp = Date.now();
    return `${this.baseUrl}/api/files/${filePath}?v=${timestamp}`;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
