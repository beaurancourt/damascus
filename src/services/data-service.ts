import { HeroSyncRecord, HeroSyncStore, LocalHeroSyncStore } from '@/services/storage/hero-sync-store';
import { FactoryLogic } from '@/logic/factory-logic';
import { Hero } from '@/models/hero';
import { Options } from '@/models/options';
import { RemoteService } from '@/services/storage/remote-service';
import { Session } from '@/models/session';
import { Sourcebook } from '@/models/sourcebook';
import { StorageService } from '@/services/storage/storage-service';
import localforage from 'localforage';

export class DataService {
	private readonly storageService: StorageService;
	private readonly remote: RemoteService | null;
	private readonly syncStore: HeroSyncStore;

	constructor(storage: StorageService, remote?: RemoteService, syncStore?: HeroSyncStore) {
		this.storageService = storage;
		this.remote = remote || null;
		this.syncStore = syncStore || new LocalHeroSyncStore();
	};

	async initialize(): Promise<boolean> {
		return this.storageService.initialize();
	}

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
			let recordsChanged = false;

			// A device takes the server's copy of a hero whenever it has nothing of
			// its own left to upload, which is how stamina, recoveries, victories
			// and XP follow you from the device you were playing on. A hero with
			// unsynced local edits is left alone and pushed on its next save, so an
			// edit made offline is never silently overwritten.
			const pulled: Hero[] = [];
			const merged = heroes.map(hero => {
				const remote = remoteHeroes.find(r => r.hero.id === hero.id);
				if (!remote) {
					return hero;
				}

				// No record means this device has never tracked this hero, and every
				// save it made went up before records existed, so the server's copy is
				// taken as the newer one.
				const record: HeroSyncRecord = records[hero.id] ?? {};
				if ((record.dirty === true) || (remote.updatedAt === record.updatedAt)) {
					return hero;
				}

				records[hero.id] = { updatedAt: remote.updatedAt, dirty: false };
				recordsChanged = true;
				pulled.push(remote.hero);
				return remote.hero;
			});

			const missing = remoteHeroes.filter(r => !localIDs.has(r.hero.id));
			missing.forEach(r => {
				records[r.hero.id] = { updatedAt: r.updatedAt, dirty: false };
				recordsChanged = true;
			});

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

			return [ ...merged, ...missing.map(r => r.hero) ];
		} catch (err) {
			console.warn('Failed to load remote heroes; continuing with local only', err);
			return heroes;
		}
	};

	async getHero(id: string): Promise<Hero | null> {
		return this.storageService.getHero(id);
	}

	async saveHero(hero: Hero): Promise<Hero> {
		const saved = await this.storageService.putHero(hero);

		// Back up to the server without blocking the save or failing on a down
		// server - the app is offline-first.
		if (this.remote) {
			// Record the edit as pending before the upload starts: if the upload
			// fails, the next load must not adopt an older server copy over it.
			await this.setSyncRecord(hero.id, { dirty: true });
			this.remote.putHero(hero)
				.then(updatedAt => this.setSyncRecord(hero.id, { updatedAt, dirty: false }))
				.catch(err => console.warn('Failed to sync hero to remote', err));
		}

		return saved;
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
