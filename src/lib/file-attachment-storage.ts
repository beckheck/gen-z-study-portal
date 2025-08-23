/**
 * File Attachment Storage System
 * Stores file attachments in the centralized AppState store for easy export/import
 */

import { store } from '@/store';

export interface FileAttachmentMetadata {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: number;
}

export interface StoredFileAttachment extends FileAttachmentMetadata {
  fileData: string; // base64 data
}

class FileAttachmentStorage {
  private static readonly CACHE_SIZE = 10; // Keep last 10 files in memory cache

  // Simple LRU cache for frequently accessed files
  private fileCache: Map<string, { data: StoredFileAttachment; accessTime: number }> = new Map();

  /**
   * Generate a unique ID for file attachments
   */
  private generateFileId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store a file attachment and return its metadata
   */
  async storeFile(file: File): Promise<FileAttachmentMetadata> {
    const fileId = this.generateFileId();

    // Convert file to base64
    const base64 = await this.fileToBase64(file);

    // Create metadata
    const metadata: FileAttachmentMetadata = {
      id: fileId,
      fileName: file.name,
      fileSize: this.formatFileSize(file.size),
      fileType: file.type,
      uploadedAt: Date.now(),
    };

    // Store the actual file data
    const storedFile: StoredFileAttachment = {
      ...metadata,
      fileData: base64,
    };

    try {
      // Store both the file data and metadata in the centralized store
      store.fileAttachments.files[fileId] = storedFile;
      store.fileAttachments.metadata[fileId] = metadata;

      return metadata;
    } catch (error) {
      console.error('Failed to store file attachment:', error);
      throw new Error('Failed to store file attachment');
    }
  }

  /**
   * Get file metadata by ID (fast operation)
   */
  async getFileMetadata(fileId: string): Promise<FileAttachmentMetadata | null> {
    try {
      return store.fileAttachments.metadata[fileId] || null;
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      return null;
    }
  }

  /**
   * Get complete file data by ID (loads file data on demand)
   */
  async getFile(fileId: string): Promise<StoredFileAttachment | null> {
    // Check cache first
    const cached = this.fileCache.get(fileId);
    if (cached) {
      // Update access time for LRU
      cached.accessTime = Date.now();
      return cached.data;
    }

    try {
      const fileData = store.fileAttachments.files[fileId] || null;

      if (fileData) {
        // Add to cache
        this.addToCache(fileId, fileData);
      }

      return fileData;
    } catch (error) {
      console.error('Failed to get file:', error);
      return null;
    }
  }
  /**
   * Add file to cache with LRU eviction
   */
  private addToCache(fileId: string, fileData: StoredFileAttachment): void {
    // Remove oldest entries if cache is full
    while (this.fileCache.size >= FileAttachmentStorage.CACHE_SIZE) {
      let oldestKey: string | undefined;
      let oldestTime = Date.now();

      for (const [key, value] of this.fileCache.entries()) {
        if (value.accessTime < oldestTime) {
          oldestTime = value.accessTime;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.fileCache.delete(oldestKey);
      } else {
        break; // Safety break
      }
    }

    // Add new entry
    this.fileCache.set(fileId, {
      data: fileData,
      accessTime: Date.now(),
    });
  }

  /**
   * Delete a file attachment
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      // Remove from cache
      this.fileCache.delete(fileId);

      // Remove from centralized store
      delete store.fileAttachments.files[fileId];
      delete store.fileAttachments.metadata[fileId];

      return true;
    } catch (error) {
      console.error('Failed to delete file attachment:', error);
      return false;
    }
  }

  /**
   * Get all file metadata (for listing files)
   */
  async getAllFileMetadata(): Promise<FileAttachmentMetadata[]> {
    try {
      return Object.values(store.fileAttachments.metadata);
    } catch (error) {
      console.error('Failed to get all file metadata:', error);
      return [];
    }
  }

  /**
   * Clean up orphaned files (files not referenced in any rich text content)
   * This should be called periodically to manage storage size
   */
  async cleanupOrphanedFiles(referencedFileIds: Set<string>): Promise<number> {
    let deletedCount = 0;

    try {
      const allMetadata = await this.getAllFileMetadata();

      for (const metadata of allMetadata) {
        if (!referencedFileIds.has(metadata.id)) {
          const success = await this.deleteFile(metadata.id);
          if (success) {
            deletedCount++;
            console.log(`Cleaned up orphaned file: ${metadata.fileName}`);
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
      return 0;
    }
  }

  /**
   * Helper: Convert file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Helper: Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}

// Export singleton instance
export const fileAttachmentStorage = new FileAttachmentStorage();
