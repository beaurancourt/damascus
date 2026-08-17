import { useCallback, useEffect, useState } from 'react';

export interface SyncStatus {
	isSynced: boolean;
	isSyncing: boolean;
	isOnline: boolean;
	lastSyncTime: Date | null;
	statusMessage: string;
}

enum Messages {
	OnlineNotSynced = 'Online - not synced',
	OnlineSyncing = 'Online - syncing data',
	OnlineSynced = 'Online',
	Offline = 'Offline - using cached data'
}

// The service worker's cache, by name: this hook reports on what it holds and
// tops it up, rather than keeping a second copy of the same files. Everything
// is resolved against BASE_URL, since the sites live at /damascus/ and
// /damascus-gm/ rather than at a domain root.
const SHELL_CACHE = 'damascus-shell';
const base = import.meta.env.BASE_URL;
const SHELL_URLS = [ base, `${base}index.html`, `${base}manifest.json` ];

export const useSyncStatus = () => {
	const [ syncStatus, setSyncStatus ] = useState<SyncStatus>({
		isSynced: false,
		isSyncing: false,
		isOnline: navigator.onLine,
		lastSyncTime: null,
		statusMessage: Messages.OnlineNotSynced
	});

	const updateStatusMessage = (
		isOnline: boolean,
		isSynced: boolean,
		isSyncing: boolean
	) => {
		if (!isOnline) {
			return Messages.Offline;
		}
		if (isSyncing) {
			return Messages.OnlineSyncing;
		}
		return isSynced ? Messages.OnlineSynced : Messages.OnlineNotSynced;
	};

	const checkSyncStatus = useCallback(async () => {
		if ('serviceWorker' in navigator && 'caches' in window) {
			try {
				const cache = await caches.open(SHELL_CACHE);
				const keys = await cache.keys();

				// Check if we have the essential files cached
				const hasIndex = keys.some(request =>
					request.url.includes('/index.html')
				);
				const hasManifest = keys.some(request =>
					request.url.includes('/manifest.json')
				);
				const hasAssets = keys.some(request =>
					request.url.includes('/assets/')
				);

				const isSynced = hasIndex && hasManifest && hasAssets;

				setSyncStatus(prev => {
					const newStatus = {
						...prev,
						isSynced,
						lastSyncTime: isSynced ? new Date() : prev.lastSyncTime
					};
					return {
						...newStatus,
						statusMessage: updateStatusMessage(
							prev.isOnline,
							newStatus.isSynced,
							newStatus.isSyncing
						)
					};
				});
			} catch (error) {
				console.error('Error checking sync status:', error);
			}
		}
	}, []);

	const syncForOffline = useCallback(async () => {
		if ('serviceWorker' in navigator && 'caches' in window) {
			setSyncStatus(prev => ({
				...prev,
				isSyncing: true,
				statusMessage: updateStatusMessage(prev.isOnline, prev.isSynced, true)
			}));

			try {
				const cache = await caches.open(SHELL_CACHE);

				// The shell, plus the bundle this page is actually running.
				// Reading the asset URLs off the document means we cache the
				// current hashed filenames without the build having to tell us
				// what they are - and without it, a first-load-then-offline
				// user got a blank page, since the service worker only sees
				// asset requests from the second load onwards.
				const assets = [
					...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map(el => el.src),
					...Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')).map(el => el.href)
				].filter(url => new URL(url).origin === window.location.origin);

				await cache.addAll([ ...SHELL_URLS, ...assets ]);

				setSyncStatus(prev => {
					const newStatus = {
						isSynced: true,
						isSyncing: false,
						isOnline: prev.isOnline,
						lastSyncTime: new Date()
					};
					return {
						...newStatus,
						statusMessage: updateStatusMessage(
							newStatus.isOnline,
							newStatus.isSynced,
							newStatus.isSyncing
						)
					};
				});
			} catch (error) {
				console.error('Error syncing for offline:', error);
				setSyncStatus(prev => ({
					...prev,
					isSyncing: false,
					statusMessage: updateStatusMessage(
						prev.isOnline,
						prev.isSynced,
						false
					)
				}));
			}
		}
	}, []);

	useEffect(() => {
		checkSyncStatus();

		// Auto-sync on load if online
		if (navigator.onLine) {
			syncForOffline();
		}

		// Handle online/offline events
		const handleOnline = () => {
			setSyncStatus(prev => {
				const newStatus = { ...prev, isOnline: true };
				return {
					...newStatus,
					statusMessage: updateStatusMessage(
						newStatus.isOnline,
						newStatus.isSynced,
						newStatus.isSyncing
					)
				};
			});
			checkSyncStatus();
		};

		const handleOffline = () => {
			setSyncStatus(prev => {
				const newStatus = { ...prev, isOnline: false };
				return {
					...newStatus,
					statusMessage: updateStatusMessage(
						newStatus.isOnline,
						newStatus.isSynced,
						newStatus.isSyncing
					)
				};
			});
		};

		// Check sync status when service worker updates
		const handleServiceWorkerMessage = (event: MessageEvent) => {
			if (event.data && event.data.type === 'CACHE_UPDATED') {
				checkSyncStatus();
			}
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.addEventListener(
				'message',
				handleServiceWorkerMessage
			);
		}

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.removeEventListener(
					'message',
					handleServiceWorkerMessage
				);
			}
		};
	}, [ checkSyncStatus, syncForOffline ]);

	// Function to trigger sync when data changes
	const triggerSyncOnChange = useCallback(() => {
		if (navigator.onLine && !syncStatus.isSyncing) {
			syncForOffline();
		}
	}, [ syncStatus.isSyncing, syncForOffline ]);

	return {
		...syncStatus,
		syncForOffline,
		checkSyncStatus,
		triggerSyncOnChange
	};
};
