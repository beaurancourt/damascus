import { HeroSyncRecord, HeroSyncStore, LocalHeroSyncStore } from '@/services/storage/hero-sync-store';
import { FactoryLogic } from '@/logic/factory-logic';
import { Hero } from '@/models/hero';
import { Options } from '@/models/options';
import { RemoteService } from '@/services/storage/remote-service';
import { Session } from '@/models/session';
import { Sourcebook } from '@/models/sourcebook';
import { StorageService } from '@/services/storage/storage-service';
import { SyncMergeLogic } from '@/logic/sync-merge-logic';
import localforage from 'localforage';

// How many times a push may be replayed onto a newer server copy before the
// hero is left dirty for the next load to retry.
const MAX_PUSH_ATTEMPTS = 3;

/**
 * Told when a push had to be merged, so the screen can be given the reconciled
 * hero. The reducer that holds the hero list lives above this service, and a
 * panel still rendering the pre-merge copy would otherwise save that copy back
 * over the fields the merge brought in.
 */
export type HeroMergedHandler = (hero: Hero) => void;

export class DataService {
	private readonly storageService: StorageService;
	private readonly remote: RemoteService | null;
	private readonly syncStore: HeroSyncStore;
	private onHeroMerged: HeroMergedHandler | null = null;

	constructor(storage: StorageService, remote?: RemoteService, syncStore?: HeroSyncStore) {
		this.storageService = storage;
		this.remote = remote || null;
		this.syncStore = syncStore || new LocalHeroSyncStore();
	};

	async initialize(): Promise<boolean> {
		return this.storageService.initialize();
	}

	/** Called with the merged hero whenever a conflict had to be resolved. */
	setHeroMergedHandler = (handler: HeroMergedHandler | null) => {
		this.onHeroMerged = handler;
	};

	// #region Options
	// Always local only

	async getOptions(): Promise<Options> {
		const result = await localforage.getItem<Options>('damascus-options');
		return result ?? FactoryLogic.createOptions();
	}

	async saveOptions(options: Options): Promise<Options> {
		return localforage.setItem<Options>('damascus-options', options);
	}

	// #endregion

	// #region Heroes

	async getHeroes(): Promise<Hero[]> {
		const heroes = await this.storageService.getHeroes();

		if (!this.remote) {
			return heroes;
		}

		try {
			const remoteHeroes = await this.remote.getHeroes();
			const records = await this.syncStore.getAll();
			const localIDs = new Set(heroes.map(h => h.id));
			const remoteByID = new Map(remoteHeroes.map(r => [ r.hero.id, r ]));
			let recordsChanged = false;

			const kept: Hero[] = [];
			const pulled: Hero[] = [];
			const toPush: Hero[] = [];
			const toDelete: string[] = [];

			heroes.forEach(hero => {
				const remote = remoteByID.get(hero.id);
				const record: HeroSyncRecord = records[hero.id] ?? {};

				// A copy with unsynced edits outranks the server's, and this is the
				// moment its upload is retried: nothing else ever did, so an edit made
				// offline used to sit in local storage until the hero was edited again.
				if (record.dirty === true) {
					kept.push(hero);
					toPush.push(hero);
					return;
				}

				// The server is ahead of the version this device last saw, which is how
				// stamina, recoveries, victories and XP follow you from the device you
				// were playing on.
				if (remote && (remote.version > (record.version ?? 0))) {
					records[hero.id] = { version: remote.version, dirty: false };
					recordsChanged = true;
					pulled.push(remote.hero);
					kept.push(remote.hero);
					return;
				}

				// A hero this device has already seen from the server, which the server
				// no longer lists, was deleted somewhere else and goes here too.
				if (!remote && records[hero.id]) {
					delete records[hero.id];
					recordsChanged = true;
					toDelete.push(hero.id);
					return;
				}

				// No record at all: a hero created here that has not been uploaded yet is
				// indistinguishable from one the server has never had, so it stays.
				kept.push(hero);
			});

			// Heroes this device has never had, which the server does.
			const missing = remoteHeroes.filter(r => !localIDs.has(r.hero.id));
			missing.forEach(r => {
				records[r.hero.id] = { version: r.version, dirty: false };
				recordsChanged = true;
			});

			if (toDelete.length > 0) {
				this.storageService.deleteHeroes(toDelete)
					.catch(err => console.warn('Failed to drop heroes deleted elsewhere', err));
			}

			// Cache what came off the server locally too, so a device that pulled it
			// keeps it even if the server is unreachable next launch. Best-effort: a
			// failed write shouldn't break the load.
			const toCache = [ ...pulled, ...missing.map(r => r.hero) ];
			if (toCache.length > 0) {
				this.storageService.putHeroes(toCache)
					.catch(err => console.warn('Failed to cache remote heroes locally', err));
			}

			if (recordsChanged) {
				this.syncStore.setAll(records)
					.catch(err => console.warn('Failed to record hero sync state', err));
			}

			// The outbox. Each one carries the merge-on-conflict handling, so an edit
			// that could not be uploaded lands here rather than being forgotten.
			toPush.forEach(hero => {
				this.pushHero(hero).catch(err => console.warn('Failed to sync hero to remote', err));
			});

			return [ ...kept, ...missing.map(r => r.hero) ];
		} catch (err) {
			console.warn('Failed to load remote heroes; continuing with local only', err);
			return heroes;
		}
	};

	async getHero(id: string): Promise<Hero | null> {
		return this.storageService.getHero(id);
	}

	async saveHero(hero: Hero): Promise<Hero> {
		// The copy this edit was made from, kept so a refused push can be merged
		// rather than guessed at, and only while there is something unsynced to
		// replay.
		const previous = await this.storageService.getHero(hero.id);
		const records = await this.syncStore.getAll();
		if (previous && (records[hero.id]?.dirty !== true)) {
			await this.syncStore.setBase(hero.id, previous);
		}

		const saved = await this.storageService.putHero(hero);

		// Back up to the server without blocking the save or failing on a down
		// server - the app is offline-first. Record the edit as pending before the
		// upload starts: if the upload fails, the next load must not adopt an older
		// server copy over it.
		if (this.remote) {
			await this.setSyncRecord(hero.id, { dirty: true });
			this.pushHero(hero).catch(err => console.warn('Failed to sync hero to remote', err));
		}

		return saved;
	}

	/**
	 * Upload a hero, and when the server has moved past the version this copy is
	 * based on, replay what changed here onto what is there now and try again.
	 * Without that second step the refusal has nowhere to go, and the edit is the
	 * user's to redo.
	 */
	private async pushHero(hero: Hero): Promise<void> {
		if (!this.remote) {
			return;
		}

		const record = (await this.syncStore.getAll())[hero.id] ?? {};
		let copy = hero;
		let base = record.version ?? 0;

		for (let attempt = 0; attempt < MAX_PUSH_ATTEMPTS; attempt++) {
			const result = await this.remote.putHero(copy, base);

			if (result.ok) {
				await this.setSyncRecord(hero.id, { version: result.version, dirty: false });
				await this.syncStore.clearBase(hero.id);
				return;
			}

			const starting = await this.syncStore.getBase(hero.id);
			if (!starting) {
				// Nothing to replay from. This is an edit a build before the versions
				// left dirty, or a snapshot that failed to write; either way there is
				// no basis for a merge, and the alternatives are to upload it outright
				// (what the old client did) or to drop it in favour of the server's
				// copy. Losing the edit is the bug being fixed, so it goes up.
				const forced = await this.remote.putHero(copy);
				if (forced.ok) {
					await this.setSyncRecord(hero.id, { version: forced.version, dirty: false });
					await this.syncStore.clearBase(hero.id);
				}
				return;
			}

			copy = SyncMergeLogic.mergeHero(starting, copy, result.current.hero);
			base = result.current.version;
			await this.storageService.putHero(copy);
			this.onHeroMerged?.(copy);
		}

		// Out of attempts. The hero stays dirty, so the next load pushes it again
		// instead of the edit quietly disappearing.
	}

	async deleteHero(id: string): Promise<void> {
		await this.storageService.deleteHero(id);

		if (this.remote) {
			this.remote.deleteHero(id).catch(err => console.warn('Failed to delete hero from remote', err));
			this.setSyncRecord(id, undefined)
				.catch(err => console.warn('Failed to record hero sync state', err));
		}
	}

	/** Merge into one hero's sync record; an undefined record forgets it. */
	private async setSyncRecord(id: string, record: HeroSyncRecord | undefined): Promise<void> {
		const records = await this.syncStore.getAll();
		if (record === undefined) {
			delete records[id];
		} else {
			records[id] = { ...records[id], ...record };
		}
		await this.syncStore.setAll(records);
	}

	// #endregion

	// #region Homebrew sourcebooks

	async getHomebrew(): Promise<Sourcebook[]> {
		const result = await this.storageService.getSourcebooks();
		return result ?? [];
	}

	async getSourcebook(id: string): Promise<Sourcebook | null> {
		return this.storageService.getSourcebook(id);
	}

	async saveSourcebook(sourcebook: Sourcebook): Promise<Sourcebook> {
		return this.storageService.putSourcebook(sourcebook);
	}

	async deleteSourcebook(id: string): Promise<void> {
		return this.storageService.deleteSourcebook(id);
	}

	// #endregion

	// #region Session

	async getSession(): Promise<Session> {
		const result = await this.storageService.getSession();
		return result ?? FactoryLogic.createSession();
	}

	async saveSession(session: Session): Promise<Session> {
		return this.storageService.putSession(session);
	}

	// #endregion
};
