export interface StorageProvider {
  upload(file: Buffer, path: string, contentType: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
  exists(path: string): Promise<boolean>;
}

export interface UploadResult {
  original: string;
  optimized: string;
  thumb: string;
}
