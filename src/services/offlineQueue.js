const QUEUE_KEY = 'pp_offline_queue';

class OfflineQueue {
  constructor() {
    this._syncing = false;
    window.addEventListener('online', () => this.sync());
  }

  getQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  add(request) {
    const queue = this.getQueue();
    queue.push({ ...request, timestamp: Date.now(), id: crypto.randomUUID() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  clear() {
    localStorage.removeItem(QUEUE_KEY);
  }

  async sync() {
    if (this._syncing || !navigator.onLine) return;
    this._syncing = true;

    const queue = this.getQueue();
    if (queue.length === 0) {
      this._syncing = false;
      return;
    }

    const { default: api } = await import('./api');
    const failed = [];

    for (const item of queue) {
      try {
        await api({ method: item.method, url: item.url, data: item.data });
      } catch {
        failed.push(item);
      }
    }

    if (failed.length > 0) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
    } else {
      this.clear();
    }

    this._syncing = false;
  }

  get pendingCount() {
    return this.getQueue().length;
  }
}

export const offlineQueue = new OfflineQueue();
