import { Hero } from '@/models/hero';
import { Session } from '@/models/session';
import { Sourcebook } from '@/models/sourcebook';

export interface StorageService {
	initialize(): Promise<boolean>;

	// Hero storage
	getHeroes(): Promise<Hero[]>;
	getHero(id: string): Promise<Hero | null>;
	putHero(hero: Hero): Promise<Hero>;
	putHeroes(heroes: Hero[]): Promise<Hero[]>;
	deleteHero(id: string): Promise<void>;

	// Homebrew storage
	getSourcebooks(): Promise<Sourcebook[]>;
	getSourcebook(id: string): Promise<Sourcebook | null>;
	putSourcebook(sourcebook: Sourcebook): Promise<Sourcebook>;
	deleteSourcebook(id: string): Promise<void>;

	// Session
	getSession(): Promise<Session | null>;
	putSession(session: Session): Promise<Session>;
};
