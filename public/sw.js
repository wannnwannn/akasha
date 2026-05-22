const CACHE_NAME = 'akasha-shell-v1';
const API_CACHE = 'akasha-api-v1';
const OFFLINE_QUEUE_DB = 'akasha-offline-queue';
const OFFLINE_QUEUE_STORE = 'requests';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json', '/legal.html', '/sw.js'];
const SUPABASE_HOST = 'supabase.co';

const openQueueDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(OFFLINE_QUEUE_DB, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
      db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const serializeRequest = async (request) => {
  const headers = {};
  for (const [key, value] of request.headers.entries()) {
    headers[key] = value;
  }

  let body = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const cloned = request.clone();
      const blob = await cloned.blob();
      body = await blob.arrayBuffer();
    } catch (err) {
      console.warn('Impossible de sérialiser le corps de la requête', err);
    }
  }

  return {
    url: request.url,
    method: request.method,
    headers,
    body: body ? Array.from(new Uint8Array(body)) : null,
    timestamp: Date.now()
  };
};

const waitForTransaction = (transaction) => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = transaction.onerror = (event) => reject(event.target?.error || new Error('IDB transaction failed'));
});

const queueRequest = async (request) => {
  try {
    const db = await openQueueDb();
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(OFFLINE_QUEUE_STORE);
    const serialized = await serializeRequest(request);
    store.add(serialized);
    await waitForTransaction(tx);
    db.close();
  } catch (err) {
    console.warn('Impossible de mettre en file d’attente la requête hors ligne', err);
  }
};

const replayQueue = async () => {
  try {
    const db = await openQueueDb();
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(OFFLINE_QUEUE_STORE);
    const all = await store.getAll();
    for (const requestData of all) {
      try {
        const requestInit = {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body ? new Uint8Array(requestData.body).buffer : undefined,
          credentials: 'include'
        };
        const response = await fetch(requestData.url, requestInit);
        if (response.ok) {
          store.delete(requestData.id);
        }
      } catch (err) {
        console.warn('Réexécution de requête échouée', err);
      }
    }
    await waitForTransaction(tx);
    db.close();
  } catch (err) {
    console.warn('Impossible de traiter la file d’attente hors ligne', err);
  }
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  const isSupabaseRequest = requestUrl.hostname.includes(SUPABASE_HOST);

  if (isSupabaseRequest && request.method !== 'GET' && request.method !== 'HEAD') {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        await queueRequest(request.clone());
        if (self.registration.sync) {
          self.registration.sync.register('akasha-offline-sync').catch(() => {});
        }
        return new Response(JSON.stringify({ offline: true, queued: true }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  if (isSupabaseRequest && request.method === 'GET') {
    event.respondWith(
      fetch(request.clone()).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  if (request.method === 'GET' && request.destination !== 'document' && request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (request.method === 'GET' && request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'akasha-offline-sync') {
    event.waitUntil(replayQueue());
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'sync-queue') {
    event.waitUntil(replayQueue());
  }
});

