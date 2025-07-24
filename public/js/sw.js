// Service Worker for Note Taking App PWA
const CACHE_NAME = 'notes-app-v1';
const STATIC_CACHE = 'notes-static-v1';
const DYNAMIC_CACHE = 'notes-dynamic-v1';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/editor.html',
  '/billing.html',
  '/settings.html',
  '/invite.html',
  '/css/overrides.css',
  '/js/boot.js',
  '/js/supabaseClient.js',
  '/js/auth.js',
  '/js/api.js',
  '/js/ui.js',
  '/js/notes.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Literata:ital@0;1&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
  'https://fonts.gstatic.com/s/literata/v35/or3PQ6P12-iJxAIgLa78DkrbXsDgk0oVDaDPYLanFLHpPf2TbJG_F_bcTWCWp9IlPQs.woff2'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('Failed to cache static files:', error);
      })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(request.url)) {
    // Static assets - cache first
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(request.url)) {
    // API requests - network first
    event.respondWith(networkFirst(request));
  } else if (isHTMLRequest(request)) {
    // HTML pages - network first with fallback
    event.respondWith(networkFirstWithFallback(request));
  } else {
    // Everything else - network first
    event.respondWith(networkFirst(request));
  }
});

// Background sync for offline note updates
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'notes-sync') {
    event.waitUntil(syncNotes());
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Notes App', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/dashboard.html')
  );
});

// Helper functions
function isStaticAsset(url) {
  return url.includes('.css') || 
         url.includes('.js') || 
         url.includes('.woff') || 
         url.includes('.woff2') || 
         url.includes('fonts.googleapis.com') ||
         url.includes('fonts.gstatic.com') ||
         url.includes('cdn.tailwindcss.com');
}

function isAPIRequest(url) {
  return url.includes('/api/') || url.includes('supabase.co');
}

function isHTMLRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

// Cache strategies
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses for dynamic content
    if (networkResponse.ok && !isAPIRequest(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for HTML, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page or dashboard
    const fallbackResponse = await caches.match('/dashboard.html');
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Notes App</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>You're offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Sync notes when back online
async function syncNotes() {
  try {
    console.log('Syncing notes...');
    
    // Get offline queue from IndexedDB or localStorage
    const offlineQueue = JSON.parse(localStorage.getItem('notes_offline_queue') || '[]');
    
    if (offlineQueue.length === 0) {
      console.log('No notes to sync');
      return;
    }
    
    // Process each queued update
    for (const item of offlineQueue) {
      if (item.type === 'update') {
        try {
          // This would normally call the Supabase API
          // For now, we'll just log it
          console.log('Syncing note update:', item);
          
          // Remove from queue after successful sync
          const index = offlineQueue.indexOf(item);
          if (index > -1) {
            offlineQueue.splice(index, 1);
          }
        } catch (error) {
          console.error('Failed to sync note:', error);
        }
      }
    }
    
    // Update localStorage with remaining items
    localStorage.setItem('notes_offline_queue', JSON.stringify(offlineQueue));
    
    console.log('Notes sync completed');
  } catch (error) {
    console.error('Notes sync failed:', error);
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SYNC_NOTES') {
    // Register background sync
    self.registration.sync.register('notes-sync');
  }
});
