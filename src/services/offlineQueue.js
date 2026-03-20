// ParkingPro Offline Queue – IndexedDB-backed, priority-ordered, auto-syncing.

const DB_NAME = 'parkingpro-app-offline';
const DB_VERSION = 1;
const STORE_QUEUE = 'queue';
const STORE_CACHE = 'cache';

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000; // doubles each attempt

// Priority values (lower number = higher priority)
const PRIORITY = {
  entry:   1,
  exit:    1,
  payment: 2,
  default: 3,
};

// ─── IndexedDB bootstrap ─────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('priority', 'priority', { unique: false });
        queueStore.createIndex('status',   'status',   { unique: false });
        queueStore.createIndex('createdAt','createdAt',{ unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        const cacheStore = db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
        cacheStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolvePriority(url = '') {
  if (/\/access\/(entry|exit)/.test(url)) return PRIORITY.entry;
  if (/\/access\/sessions\/.+\/payment/.test(url)) return PRIORITY.payment;
  if (/\/payments/.test(url)) return PRIORITY.payment;
  return PRIORITY.default;
}

function backoffDelay(attempt) {
  return BASE_BACKOFF_MS * Math.pow(2, attempt);
}

function dispatch(eventName, detail) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// ─── OfflineQueue class ───────────────────────────────────────────────────────

class OfflineQueue {
  constructor() {
    this._dbPromise = openDB();
    this._syncing = false;

    window.addEventListener('online', () => this.sync());
  }

  // ── DB wrappers ─────────────────────────────────────────────────────────

  async _tx(storeName, mode, fn) {
    const db = await this._dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async _getAll(storeName) {
    const db = await this._dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async _put(storeName, record) {
    return this._tx(storeName, 'readwrite', (store) => store.put(record));
  }

  async _delete(storeName, key) {
    return this._tx(storeName, 'readwrite', (store) => store.delete(key));
  }

  // ── Queue API ────────────────────────────────────────────────────────────

  /**
   * Add a mutation to the offline queue.
   * Priority is inferred from `url` unless explicitly provided.
   *
   * @param {{ url: string, method: string, data?: any, headers?: object, priority?: number }} request
   */
  async enqueue(request) {
    const item = {
      id:        crypto.randomUUID(),
      url:       request.url,
      method:    request.method,
      data:      request.data,
      headers:   request.headers || {},
      priority:  request.priority ?? resolvePriority(request.url),
      retries:   0,
      status:    'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this._put(STORE_QUEUE, item);
    dispatch('offlinequeue:enqueued', { item });

    // Register a background sync if the SW supports it.
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('sync-offline-queue').catch(() => {});
    }

    return item;
  }

  // ── Sync ─────────────────────────────────────────────────────────────────

  async sync() {
    if (this._syncing || !navigator.onLine) return;
    this._syncing = true;

    try {
      const allItems = await this._getAll(STORE_QUEUE);
      const pending = allItems
        .filter((i) => i.status === 'pending' || i.status === 'syncing')
        .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);

      if (pending.length === 0) return;

      const { default: api } = await import('./api');

      for (const item of pending) {
        // Mark as syncing
        await this._put(STORE_QUEUE, { ...item, status: 'syncing', updatedAt: Date.now() });

        try {
          await api({
            method:  item.method,
            url:     item.url,
            data:    item.data,
            headers: item.headers,
          });

          // Success – mark completed
          await this._put(STORE_QUEUE, {
            ...item,
            status:      'completed',
            completedAt: Date.now(),
            updatedAt:   Date.now(),
          });
          dispatch('offlinequeue:synced', { item });

        } catch (err) {
          const retries = item.retries + 1;
          if (retries >= MAX_RETRIES) {
            await this._put(STORE_QUEUE, {
              ...item,
              status:    'failed',
              retries,
              lastError: err?.message || String(err),
              updatedAt: Date.now(),
            });
            dispatch('offlinequeue:failed', { item: { ...item, retries }, error: err });
          } else {
            // Back off and retry later
            const nextAttemptAt = Date.now() + backoffDelay(retries);
            await this._put(STORE_QUEUE, {
              ...item,
              status:       'pending',
              retries,
              nextAttemptAt,
              lastError:    err?.message || String(err),
              updatedAt:    Date.now(),
            });
          }
        }
      }
    } finally {
      this._syncing = false;
      await this._cleanup();
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async stats() {
    const items = await this._getAll(STORE_QUEUE);
    return {
      pending:   items.filter((i) => i.status === 'pending').length,
      syncing:   items.filter((i) => i.status === 'syncing').length,
      failed:    items.filter((i) => i.status === 'failed').length,
      completed: items.filter((i) => i.status === 'completed').length,
    };
  }

  get pendingCount() {
    // Sync helper that returns a promise; kept for backward compat shim.
    return this._getAll(STORE_QUEUE).then(
      (items) => items.filter((i) => i.status === 'pending').length
    );
  }

  // ── Offline data cache ────────────────────────────────────────────────────

  async cacheData(key, data) {
    await this._put(STORE_CACHE, { key, data, updatedAt: Date.now() });
  }

  async getCachedData(key) {
    const db = await this._dbPromise;
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_CACHE, 'readonly');
      const req = tx.objectStore(STORE_CACHE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  async _cleanup() {
    const items = await this._getAll(STORE_QUEUE);
    const now   = Date.now();
    const MS_24H = 24 * 60 * 60 * 1000;
    const MS_7D  =  7 * 24 * 60 * 60 * 1000;

    const toDelete = items.filter((i) => {
      if (i.status === 'completed' && now - i.updatedAt > MS_24H) return true;
      if (i.status === 'failed'    && now - i.updatedAt > MS_7D)  return true;
      return false;
    });

    await Promise.all(toDelete.map((i) => this._delete(STORE_QUEUE, i.id)));
  }

  // ── Manual clear ─────────────────────────────────────────────────────────

  async clear() {
    const db = await this._dbPromise;
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_QUEUE, 'readwrite');
      const req = tx.objectStore(STORE_QUEUE).clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }
}

export const offlineQueue = new OfflineQueue();
