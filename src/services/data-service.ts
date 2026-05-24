import { FactoryLogic } from '@/logic/factory-logic';
import { Hero } from '@/models/hero';
import { Options } from '@/models/options';
import { Session } from '@/models/session';
import { Sourcebook } from '@/models/sourcebook';
import { StorageService } from '@/services/storage/storage-service';
import localforage from 'localforage';

export class DataService {
	private readonly storageService: StorageService;

	constructor(storage: StorageService) {
		this.storageService = storage;
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
		return this.storageService.getHeroes();
	};

	async getHero(id: string): Promise<Hero | null> {
		return this.storageService.getHero(id);
	}

	async saveHero(hero: Hero): Promise<Hero> {
		return this.storageService.putHero(hero);
	}

	async deleteHero(id: string): Promise<void> {
		return this.storageService.deleteHero(id);
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
