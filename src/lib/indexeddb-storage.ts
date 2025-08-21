/**
 * IndexedDB Storage Layer for Gen Z Study Portal
 * Provides high-capacity storage with graceful fallback to localStorage
 */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  isAvailable(): boolean;
  getStorageInfo(): Promise<{ used: number; available: number; quota: number }>;
}

/**
 * IndexedDB Storage Adapter
 * Provides localStorage-compatible interface with much higher quota
 */
export class IndexedDBAdapter implements StorageAdapter {
  private dbName = 'StudyPortalDB';
  private dbVersion = 1;
  private storeName = 'keyValueStore';
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('key', 'key', { unique: true });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };
      });
    } catch (error) {
      console.error('IndexedDB getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put({ key, value, timestamp: Date.now() });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB removeItem error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && indexedDB !== null;
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const available = quota - used;

        return { used, available, quota };
      } catch (error) {
        console.warn('Could not get storage estimate:', error);
      }
    }

    // Fallback estimates
    return {
      used: 0,
      available: 50 * 1024 * 1024, // 50MB conservative estimate
      quota: 50 * 1024 * 1024,
    };
  }
}

/**
 * localStorage Adapter (fallback)
 * Provides consistent interface for localStorage
 */
export class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('localStorage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('localStorage setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('localStorage removeItem error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('localStorage clear error:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && 'localStorage' in window && localStorage !== null;
    } catch {
      return false;
    }
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    // Estimate localStorage usage
    let used = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }
    } catch (error) {
      console.warn('Could not estimate localStorage usage:', error);
    }

    const quota = 5 * 1024 * 1024; // 5MB typical localStorage limit
    const available = Math.max(0, quota - used);

    return { used, available, quota };
  }
}

/**
 * Hybrid Storage Manager
 * Automatically chooses best available storage and handles migration
 */
export class HybridStorage {
  private primaryAdapter: StorageAdapter;
  private fallbackAdapter: StorageAdapter;
  private currentAdapter: StorageAdapter;
  private migrationKey = 'sp:migrationStatus';

  constructor() {
    this.primaryAdapter = new IndexedDBAdapter();
    this.fallbackAdapter = new LocalStorageAdapter();

    // Choose initial adapter
    this.currentAdapter = this.primaryAdapter.isAvailable() ? this.primaryAdapter : this.fallbackAdapter;
  }

  async initialize(): Promise<void> {
    // Check if we need to migrate from localStorage to IndexedDB
    if (this.primaryAdapter.isAvailable() && (await this.shouldMigrate())) {
      await this.migrateFromLocalStorage();
    }
  }

  private async shouldMigrate(): Promise<boolean> {
    try {
      // Check if we're already using IndexedDB
      const migrationStatus = await this.primaryAdapter.getItem(this.migrationKey);
      if (migrationStatus === 'completed') {
        return false;
      }

      // Check if localStorage has data to migrate
      const localStorageData = await this.fallbackAdapter.getItem('sp:appStateExchange');
      if (!localStorageData) {
        // No data to migrate, mark as completed
        await this.primaryAdapter.setItem(this.migrationKey, 'completed');
        return false;
      }

      // Check storage quota pressure
      const localStorageInfo = await this.fallbackAdapter.getStorageInfo();
      const usageRatio = localStorageInfo.used / localStorageInfo.quota;

      // Migrate if we're using more than 70% of localStorage quota
      return usageRatio > 0.7;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  private async migrateFromLocalStorage(): Promise<void> {
    try {
      console.log('Starting migration from localStorage to IndexedDB...');

      // Get all localStorage data that needs migration
      const appStateData = await this.fallbackAdapter.getItem('sp:appStateExchange');

      if (appStateData) {
        // Migrate main app state
        await this.primaryAdapter.setItem('sp:appStateExchange', appStateData);
        console.log('Migrated app state to IndexedDB');
      }

      // Mark migration as completed
      await this.primaryAdapter.setItem(this.migrationKey, 'completed');

      // Switch to IndexedDB as current adapter
      this.currentAdapter = this.primaryAdapter;

      // Set flag for UI notification
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('sp:migration-just-completed', 'true');
      }

      console.log('Migration to IndexedDB completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      // Keep using localStorage if migration fails
      this.currentAdapter = this.fallbackAdapter;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.currentAdapter.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      // Try fallback if primary fails
      if (this.currentAdapter === this.primaryAdapter) {
        return await this.fallbackAdapter.getItem(key);
      }
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.currentAdapter.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
      // Try fallback if primary fails
      if (this.currentAdapter === this.primaryAdapter) {
        await this.fallbackAdapter.setItem(key, value);
      } else {
        throw error;
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.currentAdapter.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
      // Try fallback if primary fails
      if (this.currentAdapter === this.primaryAdapter) {
        await this.fallbackAdapter.removeItem(key);
      } else {
        throw error;
      }
    }
  }

  async clear(): Promise<void> {
    await this.currentAdapter.clear();
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number; adapter: string }> {
    const info = await this.currentAdapter.getStorageInfo();
    return {
      ...info,
      adapter: this.currentAdapter === this.primaryAdapter ? 'IndexedDB' : 'localStorage',
    };
  }

  getCurrentAdapter(): string {
    return this.currentAdapter === this.primaryAdapter ? 'IndexedDB' : 'localStorage';
  }

  // Debug and utility methods
  async checkMigrationStatus(): Promise<{
    shouldMigrate: boolean;
    currentAdapter: string;
    localStorageUsage: { used: number; quota: number; percentage: number };
    migrationCompleted: boolean;
  }> {
    const localStorageInfo = await this.fallbackAdapter.getStorageInfo();
    const usagePercentage = localStorageInfo.used / localStorageInfo.quota;

    let migrationCompleted = false;
    try {
      migrationCompleted = (await this.primaryAdapter.getItem(this.migrationKey)) === 'completed';
    } catch {
      migrationCompleted = false;
    }

    return {
      shouldMigrate: this.primaryAdapter.isAvailable() && usagePercentage > 0.7 && !migrationCompleted,
      currentAdapter: this.getCurrentAdapter(),
      localStorageUsage: {
        used: localStorageInfo.used,
        quota: localStorageInfo.quota,
        percentage: Math.round(usagePercentage * 100),
      },
      migrationCompleted,
    };
  }

  async forceMigration(): Promise<boolean> {
    if (!this.primaryAdapter.isAvailable()) {
      console.warn('IndexedDB is not available for migration');
      return false;
    }

    try {
      await this.migrateFromLocalStorage();
      return true;
    } catch (error) {
      console.error('Forced migration failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const hybridStorage = new HybridStorage();
