// Service Worker for Damascus PWA
// Using proper TypeScript with DOM types

// Service Worker interfaces
interface Client {
	postMessage(message: unknown): void;
}

interface Clients {
	claim(): Promise<void>;
	matchAll(): Promise<Client[]>;
}

interface ServiceWorkerGlobalScope extends EventTarget {
	skipWaiting(): Promise<void>;
	clients: Clients;
	registration: ServiceWorkerRegistration;
}

// Cast self to the service worker global scope
const swSelf = self as unknown as ServiceWorkerGlobalScope;

// Both sites are served from a subdirectory - /damascus/ and /damascus-gm/ -
// so every URL the worker touches has to be resolved against its own scope.
// Rooted at '/' these fetched https://<host>/index.html, which 404s, which
// rejected cache.addAll and failed the install: nothing was ever cached.
const BASE = new URL('./', self.location.href);
const scoped = (path: string) => new URL(path, BASE).toString();

// A fixed name. This used to be a timestamp taken when the script ran, so a
// worker that had been terminated and restarted would compute a different name
// from the one it installed with, write into a fresh empty cache, and leave the
// old one behind uncollected. Asset filenames carry their own hashes, so the
// cache doesn't need a version in its name.
const CACHE_NAME = 'damascus-shell';
const STATIC_CACHE_URLS = [
	scoped('.'),
	scoped('index.html'),
	scoped('manifest.json')
];

// Install event - cache static assets
self.addEventListener('install', (event: Event) => {
	const installEvent = event as ExtendableEvent;
	installEvent.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache: Cache) => {
				return cache.addAll(STATIC_CACHE_URLS);
			})
			.then(() => {
				return swSelf.skipWaiting();
			})
			.catch((error: Error) => {
				console.error('Service Worker installation failed:', error);
			})
	);
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: Event) => {
	const activateEvent = event as ExtendableEvent;
	activateEvent.waitUntil(
		caches
			.keys()
			.then((cacheNames: string[]) => {
				return Promise.all(
					cacheNames
						.filter((cacheName: string) => cacheName !== CACHE_NAME)
						.map((cacheName: string) => {
							return caches.delete(cacheName);
						})
				);
			})
			.then(() => {
				return swSelf.clients.claim();
			})
	);
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event: Event) => {
	const fetchEvent = event as FetchEvent;

	// Skip non-GET requests
	if (fetchEvent.request.method !== 'GET') {
		return;
	}

	// Skip chrome-extension and other non-http requests
	if (!fetchEvent.request.url.startsWith('http')) {
		return;
	}

	fetchEvent.respondWith(
		(async () => {
			try {
				// Online: Just fetch from network (transparent)
				const response = await fetch(fetchEvent.request);

				// Keep a copy for offline use. Same-origin only - putting an
				// opaque cross-origin response throws - and deliberately not
				// awaited: a rejected put used to land in the catch below and
				// serve the offline branch while the network was working fine.
				if (response && response.status === 200 && new URL(fetchEvent.request.url).origin === self.location.origin) {
					const copy = response.clone();
					caches
						.open(CACHE_NAME)
						.then((cache: Cache) => cache.put(fetchEvent.request, copy))
						.catch(() => {
							// caching is best effort; the response still stands
						});
				}

				return response;
			} catch {
				// Offline: Try cache
				const cachedResponse = await caches.match(fetchEvent.request);
				if (cachedResponse) {
					return cachedResponse;
				}

				// Fallback to main page for navigation
				if (fetchEvent.request.destination === 'document') {
					const fallback = await caches.match(scoped('index.html'));
					if (fallback) {
						return fallback;
					}
				}

				return new Response('Offline - content not available', { status: 503 });
			}
		})()
	);
});

// Handle background sync for data persistence
self.addEventListener('sync', (event: Event) => {
	const syncEvent = event as SyncEvent;
	if (syncEvent.tag === 'background-sync') {
		// This would be used for syncing data when connection is restored
		// For now, localforage handles persistence automatically
	}
});

// Handle push notifications (for future use)
self.addEventListener('push', (event: Event) => {
	const pushEvent = event as PushEvent;
	if (pushEvent.data) {
		const data = pushEvent.data.json() as { title: string; body: string };
		const options: NotificationOptions = {
			body: data.body,
			icon: '/src/assets/shield.png',
			badge: '/src/assets/shield.png',
			data: {
				dateOfArrival: Date.now(),
				primaryKey: 1
			}
		};

		pushEvent.waitUntil(
			swSelf.registration.showNotification(data.title, options)
		);
	}
});

// Type definitions for service worker events
interface ExtendableEvent extends Event {
	waitUntil(promise: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
	request: Request;
	respondWith(response: Response | Promise<Response>): void;
}

interface SyncEvent extends ExtendableEvent {
	tag: string;
}

interface PushEvent extends ExtendableEvent {
	data: PushMessageData | null;
}

interface PushMessageData {
	json(): unknown;
	text(): string;
	arrayBuffer(): ArrayBuffer;
	blob(): Blob;
}
