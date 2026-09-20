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

		const mockSyncStore = {
			getAll: vi.fn(),
			setAll: vi.fn()
		};

		const heroA = { id: 'a', name: 'A', state: { staminaDamage: 4, xp: 1 } } as unknown as Hero;
		const heroAPlayed = { id: 'a', name: 'A', state: { staminaDamage: 11, xp: 2 } } as unknown as Hero;
		const heroB = { id: 'b', name: 'B', state: { staminaDamage: 0, xp: 0 } } as unknown as Hero;

		const build = () => {
			// A fresh object per read: the real store deserializes each time, and a
			// shared one would make every recorded call show the final state.
			mockSyncStore.getAll = vi.fn().mockImplementation(() => Promise.resolve({}));
			mockSyncStore.setAll = vi.fn().mockResolvedValue(undefined);
			return new DataService(mockStorage, mockRemote, mockSyncStore);
		};

		test('getHeroes takes the server copy of a hero this device has nothing unsynced for', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.putHeroes = vi.fn().mockResolvedValue([ heroAPlayed ]);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([ { hero: heroAPlayed, updatedAt: 'v2' } ]);

			const result = await ds.getHeroes();

			// The numbers played on the other device arrive here.
			expect(result).toHaveLength(1);
			expect(result[0].state.staminaDamage).toBe(11);
			expect(result[0].state.xp).toBe(2);
			expect(mockStorage.putHeroes).toHaveBeenCalledWith([ heroAPlayed ]);
		});

		test('getHeroes leaves a hero with unsynced edits alone', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.putHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([ { hero: heroAPlayed, updatedAt: 'v2' } ]);
			mockSyncStore.getAll = vi.fn().mockResolvedValue({ a: { updatedAt: 'v1', dirty: true } });

			const result = await ds.getHeroes();

			expect(result[0]).toBe(heroA);
			expect(mockStorage.putHeroes).not.toHaveBeenCalled();
		});

		test('getHeroes does nothing when it already has the version the server holds', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.putHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([ { hero: heroA, updatedAt: 'v1' } ]);
			mockSyncStore.getAll = vi.fn().mockResolvedValue({ a: { updatedAt: 'v1', dirty: false } });

			const result = await ds.getHeroes();

			expect(result[0]).toBe(heroA);
			expect(mockSyncStore.setAll).not.toHaveBeenCalled();
		});

		test('getHeroes adds remote-only heroes and remembers their version', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.putHeroes = vi.fn().mockResolvedValue([ heroA, heroB ]);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([ { hero: heroA, updatedAt: 'v1' }, { hero: heroB, updatedAt: 'v1' } ]);
			mockSyncStore.getAll = vi.fn().mockResolvedValue({ a: { updatedAt: 'v1', dirty: false } });

			const result = await ds.getHeroes();

			expect(result).toHaveLength(2);
			expect(result.find(h => h.id === 'b')).toBe(heroB);
			expect(mockStorage.putHeroes).toHaveBeenCalledWith([ heroB ]);
			expect(mockSyncStore.setAll).toHaveBeenCalledWith({ a: { updatedAt: 'v1', dirty: false }, b: { updatedAt: 'v1', dirty: false } });
		});

		test('getHeroes falls back to local only when the remote fails', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockRemote.getHeroes = vi.fn().mockRejectedValue(new Error('down'));

			const result = await ds.getHeroes();

			expect(result).toEqual([ heroA ]);
		});

		test('saveHero persists locally and backs up to the remote', async () => {
			const ds = build();

			mockStorage.putHero = vi.fn().mockResolvedValue(heroA);
			mockRemote.putHero = vi.fn().mockResolvedValue('v2');

			const result = await ds.saveHero(heroA);

			expect(result).toBe(heroA);
			expect(mockRemote.putHero).toHaveBeenCalledWith(heroA);
		});

		test('saveHero records the hero as pending, then as the version the server stored', async () => {
			const ds = build();

			mockStorage.putHero = vi.fn().mockResolvedValue(heroA);
			mockRemote.putHero = vi.fn().mockResolvedValue('v2');

			await ds.saveHero(heroA);
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockSyncStore.setAll).toHaveBeenNthCalledWith(1, { a: { dirty: true } });
			expect(mockSyncStore.setAll).toHaveBeenNthCalledWith(2, { a: { dirty: false, updatedAt: 'v2' } });
		});

		test('saveHero leaves the hero pending when the upload fails', async () => {
			const ds = build();

			mockStorage.putHero = vi.fn().mockResolvedValue(heroA);
			mockRemote.putHero = vi.fn().mockRejectedValue(new Error('down'));

			await ds.saveHero(heroA);
			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockSyncStore.setAll).toHaveBeenCalledTimes(1);
			expect(mockSyncStore.setAll).toHaveBeenCalledWith({ a: { dirty: true } });
		});

		test('deleteHero removes locally and remotely', async () => {
			const ds = build();

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
