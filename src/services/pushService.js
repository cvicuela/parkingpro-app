/**
 * ParkingPro Push Notification Service (Admin App)
 * Handles browser push subscription management
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

function getToken() {
  return localStorage.getItem('pp_token') || '';
}

async function apiCall(path, options = {}) {
  const res = await fetch(`${API_BASE}/notifications${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  return res.json();
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPermissionState() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function getVapidKey() {
  const result = await apiCall('/push/vapid-key');
  if (!result.success) return null;
  return result.data.publicKey;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Permission denied' };
  }

  const vapidKey = await getVapidKey();
  if (!vapidKey) {
    return { success: false, error: 'Push service not configured on server' };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const result = await apiCall('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  if (result.success) {
    localStorage.setItem('pp_push_enabled', 'true');
  }

  return result;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await apiCall('/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  }

  localStorage.removeItem('pp_push_enabled');
  return { success: true };
}

export async function isSubscribed() {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

export async function getPushStatus() {
  return apiCall('/push/status');
}

export async function sendPushNotification({ title, body, target, userId, role, url, tag }) {
  return apiCall('/push/send', {
    method: 'POST',
    body: JSON.stringify({ title, body, target, userId, role, url, tag }),
  });
}
