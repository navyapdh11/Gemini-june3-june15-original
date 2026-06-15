/**
 * AASTACLEAN IndexedDB Client-Side Persistence Layer
 * Provides high-capacity, durable local storage for digital client signatures
 * and photographic evidence blocks that survive browser restarts in offline environments.
 */

const DB_NAME = "AastaCleanOfflineDB";
const DB_VERSION = 1;

export interface OfflineSignature {
  quoteId: string;
  dataUrl: string;
  createdAt: string;
}

export interface OfflinePhoto {
  id: string; // unique ID
  quoteId: string;
  type: "before" | "after";
  dataUrl: string;
  createdAt: string;
}

/**
 * Open the AastaClean IndexedDB Database
 */
export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this browser environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store signatures by quoteId (primary identifier)
      if (!db.objectStoreNames.contains("signatures")) {
        db.createObjectStore("signatures", { keyPath: "quoteId" });
        console.log("👷 IndexedDB Schema: Created 'signatures' object store.");
      }

      // Store multiple before/after proof photos
      if (!db.objectStoreNames.contains("photos")) {
        const photoStore = db.createObjectStore("photos", { keyPath: "id" });
        photoStore.createIndex("by_quoteId", "quoteId", { unique: false });
        photoStore.createIndex("by_quote_type", ["quoteId", "type"], { unique: false });
        console.log("👷 IndexedDB Schema: Created 'photos' object store and indices.");
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to open IndexedDB database: ${(event.target as IDBOpenDBRequest).error?.message}`));
    };
  });
}

/**
 * Persist or update a digital signature for a specific job
 */
export async function saveSignatureInDB(quoteId: string, dataUrl: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("signatures", "readwrite");
    const store = transaction.objectStore("signatures");

    const record: OfflineSignature = {
      quoteId,
      dataUrl,
      createdAt: new Date().toISOString()
    };

    const request = store.put(record);

    request.onsuccess = () => {
      console.log(`💾 IndexedDB signature stored for Quote #${quoteId.slice(-6)}`);
      resolve();
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
}

/**
 * Retrieve the offline signature cached for a specific job
 */
export async function getSignatureFromDB(quoteId: string): Promise<string | null> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("signatures", "readonly");
      const store = transaction.objectStore("signatures");
      const request = store.get(quoteId);

      request.onsuccess = () => {
        const result = request.result as OfflineSignature | undefined;
        resolve(result ? result.dataUrl : null);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (err) {
    console.error("Failed fetching signature from indexedDB", err);
    return null;
  }
}

/**
 * Clear signature records of a specific job
 */
export async function deleteSignatureFromDB(quoteId: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("signatures", "readwrite");
    const store = transaction.objectStore("signatures");
    const request = store.delete(quoteId);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

/**
 * Store a custom captured evidence photograph
 */
export async function savePhotoInDB(quoteId: string, type: "before" | "after", dataUrl: string): Promise<string> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("photos", "readwrite");
    const store = transaction.objectStore("photos");

    const id = `photo_${quoteId}_${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const record: OfflinePhoto = {
      id,
      quoteId,
      type,
      dataUrl,
      createdAt: new Date().toISOString()
    };

    const request = store.put(record);

    request.onsuccess = () => {
      console.log(`📸 IndexedDB photo stored for Quote #${quoteId.slice(-6)} [${type.toUpperCase()}]`);
      resolve(id);
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
}

/**
 * Get all evidence logs of a specific type (before/after) for a job
 */
export async function getPhotosFromDB(quoteId: string, type: "before" | "after"): Promise<OfflinePhoto[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("photos", "readonly");
      const store = transaction.objectStore("photos");
      const index = store.index("by_quoteId");
      
      const photos: OfflinePhoto[] = [];
      const request = index.openCursor(IDBKeyRange.only(quoteId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const value = cursor.value as OfflinePhoto;
          if (value.type === type) {
            photos.push(value);
          }
          cursor.continue();
        } else {
          resolve(photos);
        }
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (err) {
    console.error("Failed fetching photos list from indexedDB", err);
    return [];
  }
}

/**
 * Delete a specific photo record by its unique key
 */
export async function deletePhotoFromDB(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("photos", "readwrite");
    const store = transaction.objectStore("photos");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

/**
 * Wipe all data blocks (signature and photo archives) related to a specific quote id
 */
export async function clearAllJobAssetsFromDB(quoteId: string): Promise<void> {
  try {
    const db = await openOfflineDB();
    
    // Clear signature
    await deleteSignatureFromDB(quoteId);

    // Clear photos
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("photos", "readwrite");
      const store = transaction.objectStore("photos");
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const value = cursor.value as OfflinePhoto;
          if (value.quoteId === quoteId) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (err) {
    console.warn("Problem wiping offline asset cache for QuoteID:", quoteId, err);
  }
}

/**
 * Compute the total storage footprint in terms of bytes recorded in IndexedDB
 */
export async function getOfflineDBSizeInBytes(): Promise<{ signatures: number; photos: number; total: number }> {
  try {
    const db = await openOfflineDB();
    
    const countSize = (storeName: "signatures" | "photos"): Promise<number> => {
      return new Promise((resolve) => {
        let size = 0;
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (cursor) {
            const data = JSON.stringify(cursor.value);
            size += data.length * 2; // Rough UTF-16 character byte estimate
            cursor.continue();
          } else {
            resolve(size);
          }
        };
        request.onerror = () => resolve(0);
      });
    };

    const signatureSize = await countSize("signatures");
    const photoSize = await countSize("photos");

    return {
      signatures: signatureSize,
      photos: photoSize,
      total: signatureSize + photoSize
    };
  } catch {
    return { signatures: 0, photos: 0, total: 0 };
  }
}

/**
 * Store a task-specific (subtask) evidence photograph
 */
export async function saveTaskPhotoInDB(quoteId: string, taskName: string, dataUrl: string): Promise<string> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("photos", "readwrite");
    const store = transaction.objectStore("photos");

    const id = `taskphoto_${quoteId}_${encodeURIComponent(taskName)}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const record = {
      id,
      quoteId,
      type: `task_${taskName}`,
      dataUrl,
      createdAt: new Date().toISOString()
    };

    const request = store.put(record);

    request.onsuccess = () => {
      console.log(`💾 IndexedDB subtask photo stored for Quote #${quoteId.slice(-6)} [${taskName}]`);
      resolve(id);
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
}

/**
 * Get all task-specific photos from DB
 */
export async function getTaskPhotosFromDB(quoteId: string, taskName: string): Promise<string[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("photos", "readonly");
      const store = transaction.objectStore("photos");
      
      const photos: string[] = [];
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const value = cursor.value;
          if (value.quoteId === quoteId && value.type === `task_${taskName}`) {
            photos.push(value.dataUrl);
          }
          cursor.continue();
        } else {
          resolve(photos);
        }
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (err) {
    console.error("Failed fetching task-specific photos list from indexedDB", err);
    return [];
  }
}

/**
 * Get all task-specific photos for a specific quote
 */
export async function getAllTaskPhotosForQuote(quoteId: string): Promise<Record<string, string[]>> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("photos", "readonly");
      const store = transaction.objectStore("photos");
      
      const map: Record<string, string[]> = {};
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const value = cursor.value;
          if (value.quoteId === quoteId && value.type && value.type.startsWith("task_")) {
            const taskName = value.type.substring(5); // remove 'task_' prefix
            if (!map[taskName]) {
              map[taskName] = [];
            }
            map[taskName].push(value.dataUrl);
          }
          cursor.continue();
        } else {
          resolve(map);
        }
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (err) {
    console.error("Failed fetching all task photos matching quoteId from indexedDB", err);
    return {};
  }
}


