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

	constructor(storage: StorageService, remote?: RemoteService) {
		this.storageService = storage;
		this.remote = remote || null;
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

		// A configured remote holds heroes saved from other devices. Add any the
		// local store doesn't have; local copies stay authoritative here, so an
		// offline edit is never silently overwritten by a stale server copy.
		if (!this.remote) {
			return heroes;
		}

		try {
			const remoteHeroes = await this.remote.getHeroes();
			const localIDs = new Set(heroes.map(h => h.id));
			const missing = remoteHeroes.filter(h => !localIDs.has(h.id));
			return [ ...heroes, ...missing ];
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
			this.remote.putHero(hero).catch(err => console.warn('Failed to sync hero to remote', err));
		}

		return saved;
	}

	async deleteHero(id: string): Promise<void> {
		await this.storageService.deleteHero(id);

		if (this.remote) {
			this.remote.deleteHero(id).catch(err => console.warn('Failed to delete hero from remote', err));
		}
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
