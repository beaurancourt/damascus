import { Hero } from '@/models/hero';
import localforage from 'localforage';

/**
 * What this device last knew about a hero's copy on the server.
 *
 * `version` is the server version this device pushed or pulled. The server hands
 * those out and only accepts a write that is the successor of the one it holds,
 * so a difference means the server has moved on without us. `dirty` means a local
 * edit has not reached the server yet, which is the one case where the local copy
 * has to win: adopting the server's copy then would throw the edit away.
 */
export interface HeroSyncRecord {
	version?: number;
	dirty?: boolean;
}

/**
 * `base` is the copy a pending edit started from, kept only while that edit is
 * unsynced and dropped once it lands. Without it a refused push can only pick a
 * winner; with it, the fields this device changed can be replayed on top of what
 * the server holds and both devices keep their work.
 */
export interface HeroSyncStore {
	getAll(): Promise<Record<string, HeroSyncRecord>>;
	setAll(records: Record<string, HeroSyncRecord>): Promise<void>;
	getBase(id: string): Promise<Hero | null>;
	setBase(id: string, hero: Hero): Promise<void>;
	clearBase(id: string): Promise<void>;
}

const KEY = 'damascus-hero-sync';
const baseKey = (id: string) => `damascus-hero-base-${id}`;

export class LocalHeroSyncStore implements HeroSyncStore {
	async getAll(): Promise<Record<string, HeroSyncRecord>> {
		return await localforage.getItem<Record<string, HeroSyncRecord>>(KEY) ?? {};
	}

	async setAll(records: Record<string, HeroSyncRecord>): Promise<void> {
		await localforage.setItem(KEY, records);
	}

	// One key per hero rather than a field in the map above: the map is rewritten
	// whole on every save, and a hero body in it would be copied out and written
	// back on every keystroke of an edit.
	async getBase(id: string): Promise<Hero | null> {
		return await localforage.getItem<Hero>(baseKey(id));
	}

	async setBase(id: string, hero: Hero): Promise<void> {
		await localforage.setItem(baseKey(id), hero);
	}

	async clearBase(id: string): Promise<void> {
		await localforage.removeItem(baseKey(id));
	}
}
