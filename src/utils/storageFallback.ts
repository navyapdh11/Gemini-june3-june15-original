// Safe storage fallback when localStorage access is blocked (e.g. in cross-origin sandboxed iframes)

class MemoryStorage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    try {
      this.store[key] = String(value);
    } catch (e) {
      console.warn("MemoryStorage write failed:", e);
    }
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

function getStorage(): Storage {
  try {
    // Try to access and verify localStorage
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    const value = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    if (value === testKey) {
      return window.localStorage;
    }
  } catch (e) {
    console.warn("window.localStorage is blocked or inaccessible. Falling back to an in-memory dictionary.", e);
  }
  return new MemoryStorage() as any;
}

export const safeLocalStorage = getStorage();
