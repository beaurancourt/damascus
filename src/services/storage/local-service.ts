import { Hero } from '@/models/hero';
import { Session } from '@/models/session';
import { Sourcebook } from '@/models/sourcebook';
import { StorageService } from '@/services/storage/storage-service';
import { Utils } from '@/utils/utils';
import localforage from 'localforage';

export enum DataStorageKeys {
	Heroes = 'damascus-heroes',
	Sourcebooks = 'damascus-homebrew-settings',
	Session = 'damascus-session'
};

export class LocalService implements StorageService {
	initialize(): Promise<boolean> {
		return Promise.resolve(true);
	}

	// #region Heroes
	async getHeroes(): Promise<Hero[]> {
		const heroes = await localforage.getItem<Hero[]>(DataStorageKeys.Heroes);
		if (!heroes) {
			return [];
		}
		return heroes;
	}

	async getHero(id: string): Promise<Hero | null> {
		const heroes = await localforage.getItem<Hero[]>(DataStorageKeys.Heroes);
		if (heroes) {
			const found = heroes.find(h => h.id === id);
			if (found) {
				return found;
			}
		}
		return null;
	}

	async putHero(hero: Hero): Promise<Hero> {
		const heroes = await localforage.getItem<Hero[]>(DataStorageKeys.Heroes);
		if (heroes) {
			// localforage deep-serializes on setItem anyway, so just build the new
			// array without deep-cloning every hero.
			const list = heroes.some(h => h.id === hero.id)
				? heroes.map(h => h.id === hero.id ? hero : h)
				: [ ...heroes, hero ];
			await localforage.setItem<Hero[]>(DataStorageKeys.Heroes, list);
		} else {
			await localforage.setItem<Hero[]>(DataStorageKeys.Heroes, [ hero ]);
		}

		return hero;
	}

	async deleteHero(id: string): Promise<void> {
		const heroes = await localforage.getItem<Hero[]>(DataStorageKeys.Heroes);
		if (heroes) {
			const list = heroes.filter(h => h.id !== id);
			await localforage.setItem<Hero[]>(DataStorageKeys.Heroes, list);
		}
	}

	// Batch upsert: merges heroes by id in one read + one write, so restoring a
	// batch of remote heroes doesn't race itself with overlapping putHero calls.
	async putHeroes(heroes: Hero[]): Promise<Hero[]> {
		const current = await localforage.getItem<Hero[]>(DataStorageKeys.Heroes) || [];
		const byID = new Map(current.map(h => [ h.id, h ]));
		heroes.forEach(h => byID.set(h.id, h));
		const list = [ ...byID.values() ];
		await localforage.setItem<Hero[]>(DataStorageKeys.Heroes, list);
		return list;
	}
	// #endregion

	// #region Sourcebooks
	async getSourcebooks(): Promise<Sourcebook[]> {
		const sourcebooks = await localforage.getItem<Sourcebook[]>(DataStorageKeys.Sourcebooks);
		if (!sourcebooks) {
			return [];
		}
		return sourcebooks;
	}

	async getSourcebook(id: string): Promise<Sourcebook | null> {
		const sourcebooks = await localforage.getItem<Sourcebook[]>(DataStorageKeys.Sourcebooks);
		if (sourcebooks) {
			const found = sourcebooks.find(h => h.id === id);
			if (found) {
				return found;
			}
		}
		return null;
	}

	async putSourcebook(sourcebook: Sourcebook): Promise<Sourcebook> {
		const sourcebooks = await localforage.getItem<Sourcebook[]>(DataStorageKeys.Sourcebooks);
		if (sourcebooks) {
			const copy = Utils.copy(sourcebooks);
			if (sourcebooks.some(h => h.id === sourcebook.id)) {
				const list = copy.map(h => h.id === sourcebook.id ? sourcebook : h);
				localforage.setItem<Sourcebook[]>(DataStorageKeys.Sourcebooks, list);
			} else {
				copy.push(sourcebook);
				localforage.setItem<Sourcebook[]>(DataStorageKeys.Sourcebooks, copy);
			}
		} else {
			localforage.setItem<Sourcebook[]>(DataStorageKeys.Sourcebooks, [ sourcebook ]);
		}

		return sourcebook;
	}

	async deleteSourcebook(id: string): Promise<void> {
		const sourcebooks = await localforage.getItem<Sourcebook[]>(DataStorageKeys.Sourcebooks);
		if (sourcebooks) {
			const copy = Utils.copy(sourcebooks.filter(h => h.id !== id));
			localforage.setItem<Sourcebook[]>(DataStorageKeys.Sourcebooks, copy);
		}
	}
	// #endregion

	getSession(): Promise<Session | null> {
		try {
			return localforage.getItem<Session>(DataStorageKeys.Session);
		} catch (error) {
			console.error('Error getting Session', error);
			return Promise.resolve(null);
		}
	}

	putSession(session: Session): Promise<Session> {
		return localforage.setItem<Session>(DataStorageKeys.Session, session);
	}
};
