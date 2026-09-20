import localforage from 'localforage';

/**
 * What this device last knew about a hero's copy on the server.
 *
 * `updatedAt` is the server version this device pushed or pulled, so a
 * difference means the server has moved on without us. `dirty` means a local
 * edit has not reached the server yet, which is the one case where the local
 * copy has to win: adopting the server's copy then would throw the edit away.
 */
export interface HeroSyncRecord {
	updatedAt?: string;
	dirty?: boolean;
}

export interface HeroSyncStore {
	getAll(): Promise<Record<string, HeroSyncRecord>>;
	setAll(records: Record<string, HeroSyncRecord>): Promise<void>;
}

const KEY = 'damascus-hero-sync';

export class LocalHeroSyncStore implements HeroSyncStore {
	async getAll(): Promise<Record<string, HeroSyncRecord>> {
		return await localforage.getItem<Record<string, HeroSyncRecord>>(KEY) ?? {};
	}

	async setAll(records: Record<string, HeroSyncRecord>): Promise<void> {
		await localforage.setItem(KEY, records);
	}
}
