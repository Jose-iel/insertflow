import { StorageProvider } from './types';
import { LocalStorage } from './local';

export * from './types';

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    const type = process.env.STORAGE_TYPE || 'local';

    switch (type) {
      case 'local':
        storageInstance = new LocalStorage();
        break;
      // Futuro: case 'r2': storageInstance = new R2Storage(); break;
      // Futuro: case 'minio': storageInstance = new MinioStorage(); break;
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }

  return storageInstance;
}
