import { afterEach, describe, expect, test, vi } from 'vitest';
import { DataService } from '@/services/data-service';
import { Hero } from '@/models/hero';
import { Options } from '@/models/options';
import { RemoteService } from '@/services/storage/remote-service';
import { Session } from '@/models/session';
import { Sourcebook } from '@/models/sourcebook';
import { StorageService } from '@/services/storage/storage-service';
import localforage from 'localforage';

afterEach(() => {
	vi.resetAllMocks();
});

vi.mock('localforage');

const mockStorage = {} as StorageService;

const mockOptions = {} as Options;
const mockHeroes = [] as Hero[];
const mockHomebrew = [] as Sourcebook[];
const mockSession = {} as Session;

const catchFn = vi.fn();
const thenFn = vi.fn();

describe('DataService', () => {
	// #region Options
	describe('getOptions', () => {
		test('always calls localforage', async () => {
			const ds = new DataService(mockStorage);

			localforage.getItem = vi.fn().mockImplementation(() => Promise.resolve(mockOptions));

			await ds.getOptions()
				.then(thenFn)
				.catch(catchFn);

			expect(localforage.getItem).toHaveBeenCalledWith('damascus-options');
			expect(thenFn).toHaveBeenCalledWith(mockOptions);
			expect(catchFn).not.toHaveBeenCalled();
		});
	});

	describe('saveOptions', () => {
		test('always calls localforage', async () => {
			const ds = new DataService(mockStorage);

			localforage.setItem = vi.fn().mockImplementation(() => Promise.resolve(mockOptions));

			await ds.saveOptions(mockOptions)
				.then(thenFn)
				.catch(catchFn);

			expect(localforage.setItem).toHaveBeenCalledWith('damascus-options', mockOptions);
			expect(thenFn).toHaveBeenCalledWith(mockOptions);
			expect(catchFn).not.toHaveBeenCalled();
		});
	});
	// #endregion Options

	// #region Heroes
	describe('getHeroes', () => {
		test('forwards to the storage service', async () => {
			const ds = new DataService(mockStorage);

			mockStorage.getHeroes = vi.fn().mockImplementation(() => Promise.resolve(mockHeroes));

			await ds.getHeroes()
				.then(thenFn)
				.catch(catchFn);

			expect(mockStorage.getHeroes).toHaveBeenCalled();
			expect(thenFn).toHaveBeenCalledWith(mockHeroes);
			expect(catchFn).not.toHaveBeenCalled();
		});
	});

	describe('remote sync', () => {
		const mockRemote = {
			getHeroes: vi.fn(),
			putHero: vi.fn(),
			deleteHero: vi.fn()
		} as unknown as RemoteService;

		const heroA = { id: 'a', name: 'A' } as Hero;
		const heroAStale = { id: 'a', name: 'A-stale' } as Hero;
		const heroB = { id: 'b', name: 'B' } as Hero;

		test('getHeroes keeps the local copy of a hero and adds remote-only heroes', async () => {
			const ds = new DataService(mockStorage, mockRemote);

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.putHeroes = vi.fn().mockResolvedValue([ heroA, heroB ]);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([ heroAStale, heroB ]);

			const result = await ds.getHeroes();

			expect(result).toHaveLength(2);
			expect(result.find(h => h.id === 'a')).toBe(heroA);
			expect(result.find(h => h.id === 'b')).toBe(heroB);
		});

		test('getHeroes falls back to local only when the remote fails', async () => {
			const ds = new DataService(mockStorage, mockRemote);

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockRemote.getHeroes = vi.fn().mockRejectedValue(new Error('down'));

			const result = await ds.getHeroes();

			expect(result).toEqual([ heroA ]);
		});

		test('getHeroes caches remote-only heroes locally', async () => {
			const ds = new DataService(mockStorage, mockRemote);

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.putHeroes = vi.fn().mockResolvedValue([ heroA, heroB ]);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([ heroA, heroB ]);

			const result = await ds.getHeroes();

			expect(result).toHaveLength(2);
			expect(mockStorage.putHeroes).toHaveBeenCalledWith([ heroB ]);
		});

		test('saveHero persists locally and backs up to the remote', async () => {
			const ds = new DataService(mockStorage, mockRemote);

			mockStorage.putHero = vi.fn().mockResolvedValue(heroA);
			mockRemote.putHero = vi.fn().mockResolvedValue(undefined);

			const result = await ds.saveHero(heroA);

			expect(result).toBe(heroA);
			expect(mockRemote.putHero).toHaveBeenCalledWith(heroA);
		});

		test('deleteHero removes locally and remotely', async () => {
			const ds = new DataService(mockStorage, mockRemote);

			mockStorage.deleteHero = vi.fn().mockResolvedValue(undefined);
			mockRemote.deleteHero = vi.fn().mockResolvedValue(undefined);

			await ds.deleteHero('a');

			expect(mockRemote.deleteHero).toHaveBeenCalledWith('a');
		});
	});
	// #endregion Heroes

	// #region Homebrew
	describe('getHomebrew', () => {
		test('forwards to the storage service', async () => {
			const ds = new DataService(mockStorage);

			mockStorage.getSourcebooks = vi.fn().mockImplementation(() => Promise.resolve(mockHomebrew));

			await ds.getHomebrew()
				.then(thenFn)
				.catch(catchFn);

			expect(mockStorage.getSourcebooks).toHaveBeenCalled();
			expect(thenFn).toHaveBeenCalledWith(mockHomebrew);
			expect(catchFn).not.toHaveBeenCalled();
		});
	});
	// #endregion Homebrew

	// #region Session
	describe('getSession', () => {
		test('forwards to the storage service', async () => {
			const ds = new DataService(mockStorage);

			mockStorage.getSession = vi.fn().mockImplementation(() => Promise.resolve(mockSession));

			await ds.getSession()
				.then(thenFn)
				.catch(catchFn);

			expect(mockStorage.getSession).toHaveBeenCalled();
			expect(thenFn).toHaveBeenCalledWith(mockSession);
			expect(catchFn).not.toHaveBeenCalled();
		});
	});

	describe('saveSession', () => {
		test('forwards to the storage service', async () => {
			const ds = new DataService(mockStorage);

			mockStorage.putSession = vi.fn().mockImplementation(() => Promise.resolve(mockSession));

			await ds.saveSession(mockSession)
				.then(thenFn)
				.catch(catchFn);

			expect(mockStorage.putSession).toHaveBeenCalledWith(mockSession);
			expect(thenFn).toHaveBeenCalledWith(mockSession);
			expect(catchFn).not.toHaveBeenCalled();
		});
	});
	// #endregion Session
});
