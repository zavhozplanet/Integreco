/* ================================================================
   FILE SYSTEM ACCESS API STORAGE
================================================================ */
const DB_NAME = 'IntegrecoStorage';
const STORE_NAME = 'handles';

class StorageManager {
  constructor() {
    this.dirHandle = null;
    this.db = null;
  }

  async init() {
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = async (e) => {
        this.db = e.target.result;
        await this.loadHandles();
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  async get(key) {
    return new Promise((resolve) => {
      if (!this.db) return resolve(null);
      try {
        const tx = this.db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  }

  async set(key, val) {
    return new Promise((resolve) => {
      if (!this.db) return resolve();
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(val, key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (e) { resolve(); }
    });
  }

  async loadHandles() {
    this.dirHandle = await this.get('dirHandle');
  }

  async selectFolder() {
    try {
      this.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await this.set('dirHandle', this.dirHandle);
      return true;
    } catch (e) {
      console.log('Folder selection cancelled or failed', e);
      return false;
    }
  }

  async verifyPermission() {
    if (!this.dirHandle) return false;
    const opts = { mode: 'readwrite' };
    if ((await this.dirHandle.queryPermission(opts)) === 'granted') {
      return true;
    }
    // Note: requestPermission requires user gesture.
    try {
      if ((await this.dirHandle.requestPermission(opts)) === 'granted') {
        return true;
      }
    } catch (e) {
      console.log('Permission request failed', e);
    }
    return false;
  }

  async saveData(dataStr, filename = 'map.json') {
    if (!this.dirHandle || !(await this.verifyPermission())) return false;
    try {
      const fileHandle = await this.dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(dataStr);
      await writable.close();
      return true;
    } catch (e) {
      console.error('Failed to save to FS', e);
      return false;
    }
  }

  async loadData(filename = 'map.json') {
    if (!this.dirHandle || !(await this.verifyPermission())) return null;
    try {
      const fileHandle = await this.dirHandle.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return text;
    } catch (e) {
      // File not found or read error
      return null;
    }
  }
}

window.storageAPI = new StorageManager();
