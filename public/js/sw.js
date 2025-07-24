// Service Worker for PWA functionality
const CACHE_NAME = 'notes-app-v1';
const STATIC_CACHE = 'notes-static-v1';
const DYNAMIC_CACHE = 'notes-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/editor.html',
  '/settings.html',
  '/billing.html',
  '/invite.html',
  '/css/overrides.css',
  '/js/boot.js',
  '/js/auth.js',
  '/js/api.js',
  '/js/ui.js',
  '/js/notes.js',
  '/js/supabaseClient.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com/3.4.0',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Literata:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
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
      .then(() => {
        console.log('Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static files:', error);
      })
  );
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
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip API calls and external resources (except fonts and CDN)
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('cdnjs.cloudflare.com') &&
      !url.hostname.includes('cdn.tailwindcss.com')) {
    return;
  }
  
  event.respondWith(
    cacheFirst(request)
      .catch(() => networkFirst(request))
      .catch(() => fallbackResponse(request))
  );
});

// Cache first strategy - for static assets
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  // Cache successful responses
  if (networkResponse.status === 200) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
};

// Network first strategy - for dynamic content
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
};

// Fallback response for offline scenarios
const fallbackResponse = (request) => {
  const url = new URL(request.url);
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    return caches.match('/index.html');
  }
  
  // Return placeholder for images
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">Image unavailable</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  
  // Return generic offline response
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
};

// Background sync for note updates
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'note-sync') {
    event.waitUntil(syncNotes());
  }
});

// Sync notes when back online
const syncNotes = async () => {
  try {
    // Get pending notes from IndexedDB
    const pendingNotes = await getPendingNotes();
    
    for (const note of pendingNotes) {
      try {
        // Attempt to sync note
        await syncNote(note);
        
        // Remove from pending queue on success
        await removePendingNote(note.id);
      } catch (error) {
        console.error('Failed to sync note:', note.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
};

// IndexedDB operations for offline storage
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NotesAppDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('updated_at', 'updated_at');
      }
      
      if (!db.objectStoreNames.contains('pendingSync')) {
        db.createObjectStore('pendingSync', { keyPath: 'id' });
      }
    };
  });
};

const getPendingNotes = async () => {
  const db = await openDB();
  const transaction = db.transaction(['pendingSync'], 'readonly');
  const store = transaction.objectStore('pendingSync');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const removePendingNote = async (noteId) => {
  const db = await openDB();
  const transaction = db.transaction(['pendingSync'], 'readwrite');
  const store = transaction.objectStore('pendingSync');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(noteId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const syncNote = async (note) => {
  // This would make an API call to sync the note
  // Implementation depends on the specific API structure
  const response = await fetch('/api/notes/' + note.id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + note.token
    },
    body: JSON.stringify({
      title: note.title,
      body: note.body
    })
  });
  
  if (!response.ok) {
    throw new Error('Sync failed');
  }
  
  return response.json();
};

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: 'You have new activity in your notes',
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    tag: 'notes-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.data = data;
  }
  
  event.waitUntil(
    self.registration.showNotification('Notes App', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/dashboard.html')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
