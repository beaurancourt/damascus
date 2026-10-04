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
			setAll: vi.fn(),
			getBase: vi.fn(),
			setBase: vi.fn(),
			clearBase: vi.fn()
		};

		const heroA = { id: 'a', name: 'A', state: { staminaDamage: 4, xp: 1 } } as unknown as Hero;
		const heroAPlayed = { id: 'a', name: 'A', state: { staminaDamage: 11, xp: 1 } } as unknown as Hero;
		const heroAElsewhere = { id: 'a', name: 'A', state: { staminaDamage: 4, xp: 9 } } as unknown as Hero;
		const heroB = { id: 'b', name: 'B', state: { staminaDamage: 0, xp: 0 } } as unknown as Hero;

		const record = (version: number, dirty?: boolean) => ({ a: { version: version, dirty: dirty } });

		const build = () => {
			// A fresh object per read: the real store deserializes each time, and a
			// shared one would make every recorded call show the final state.
			mockSyncStore.getAll = vi.fn().mockImplementation(() => Promise.resolve({}));
			mockSyncStore.setAll = vi.fn().mockResolvedValue(undefined);
			mockSyncStore.getBase = vi.fn().mockResolvedValue(null);
			mockSyncStore.setBase = vi.fn().mockResolvedValue(undefined);
			mockSyncStore.clearBase = vi.fn().mockResolvedValue(undefined);
			return new DataService(mockStorage, mockRemote, mockSyncStore);
		};

		// The push happens off the back of the load, so give it a turn to run.
		const settle = () => new Promise(resolve => setTimeout(resolve, 0));

		test('getHeroes takes the server copy when the server is a version ahead', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.putHeroes = vi.fn().mockResolvedValue([ heroAPlayed ]);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([ { hero: heroAPlayed, version: 2 } ]);
			mockSyncStore.getAll = vi.fn().mockResolvedValue(record(1));

			const result = await ds.getHeroes();

			// The numbers played on the other device arrive here.
			expect(result).toHaveLength(1);
			expect(result[0].state.staminaDamage).toBe(11);
			expect(mockStorage.putHeroes).toHaveBeenCalledWith([ heroAPlayed ]);
			expect(mockSyncStore.setAll).toHaveBeenCalledWith(record(2, false));
		});

		test('getHeroes keeps the local copy when it is the version the server holds', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.putHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([ { hero: heroA, version: 1 } ]);
			mockSyncStore.getAll = vi.fn().mockResolvedValue(record(1));

			const result = await ds.getHeroes();

			expect(result[0]).toBe(heroA);
			expect(mockSyncStore.setAll).not.toHaveBeenCalled();
		});

		test('getHeroes keeps a hero with unsynced edits and retries its upload', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([ { hero: heroAPlayed, version: 2 } ]);
			mockRemote.putHero = vi.fn().mockResolvedValue({ ok: true, version: 3 });
			mockSyncStore.getAll = vi.fn().mockResolvedValue(record(1, true));

			const result = await ds.getHeroes();
			await settle();

			// Not adopted over, and not forgotten either: this is where an edit made
			// offline finally reaches the server.
			expect(result[0]).toBe(heroA);
			expect(mockRemote.putHero).toHaveBeenCalledWith(heroA, 1);
			expect(mockSyncStore.setAll).toHaveBeenCalledWith(record(3, false));
		});

		test('getHeroes adds remote-only heroes and remembers their version', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.putHeroes = vi.fn().mockResolvedValue([ heroA, heroB ]);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([ { hero: heroA, version: 1 }, { hero: heroB, version: 1 } ]);
			mockSyncStore.getAll = vi.fn().mockResolvedValue(record(1));

			const result = await ds.getHeroes();

			expect(result).toHaveLength(2);
			expect(result.find(h => h.id === 'b')).toBe(heroB);
			expect(mockStorage.putHeroes).toHaveBeenCalledWith([ heroB ]);
			expect(mockSyncStore.setAll).toHaveBeenCalledWith({ a: { version: 1 }, b: { version: 1, dirty: false } });
		});

		test('getHeroes falls back to local only when the remote fails', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockRemote.getHeroes = vi.fn().mockRejectedValue(new Error('down'));

			const result = await ds.getHeroes();

			expect(result).toEqual([ heroA ]);
		});

		test('getHeroes drops a hero the server no longer lists when this device has nothing unsynced', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.deleteHeroes = vi.fn().mockResolvedValue(undefined);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([]);
			mockSyncStore.getAll = vi.fn().mockResolvedValue(record(1));

			const result = await ds.getHeroes();

			// Deleted on another device, so it goes here too - and the sync record with
			// it, so a later load does not consider it a hero this device has never seen.
			expect(result).toEqual([]);
			expect(mockStorage.deleteHeroes).toHaveBeenCalledWith([ 'a' ]);
			expect(mockSyncStore.setAll).toHaveBeenCalledWith({});
		});

		test('getHeroes keeps a hero the server no longer lists if it has unsynced edits', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.deleteHeroes = vi.fn().mockResolvedValue(undefined);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([]);
			mockRemote.putHero = vi.fn().mockResolvedValue({ ok: true, version: 2 });
			mockSyncStore.getAll = vi.fn().mockResolvedValue(record(1, true));

			const result = await ds.getHeroes();
			await settle();

			// An edit made on this device outranks the server's silence, so the hero is
			// put back rather than dropped.
			expect(result).toEqual([ heroA ]);
			expect(mockStorage.deleteHeroes).not.toHaveBeenCalled();
			expect(mockRemote.putHero).toHaveBeenCalledWith(heroA, 1);
		});

		test('getHeroes leaves a hero the server has never heard of alone', async () => {
			const ds = build();

			mockStorage.getHeroes = vi.fn().mockResolvedValue([ heroA ]);
			mockStorage.deleteHeroes = vi.fn().mockResolvedValue(undefined);
			mockRemote.getHeroes = vi.fn().mockResolvedValue([]);

			const result = await ds.getHeroes();

			// No record means this device does not know whether the server ever had it,
			// and a hero created while offline looks exactly like this.
			expect(result).toEqual([ heroA ]);
			expect(mockStorage.deleteHeroes).not.toHaveBeenCalled();
		});

		test('saveHero persists locally and backs up to the remote', async () => {
			const ds = build();

			mockStorage.getHero = vi.fn().mockResolvedValue(null);
			mockStorage.putHero = vi.fn().mockResolvedValue(heroA);
			mockRemote.putHero = vi.fn().mockResolvedValue({ ok: true, version: 2 });

			const result = await ds.saveHero(heroA);

			expect(result).toBe(heroA);
			expect(mockRemote.putHero).toHaveBeenCalledWith(heroA, 0);
		});

		test('saveHero keeps the copy the edit was based on, for the merge', async () => {
			const ds = build();

			mockStorage.getHero = vi.fn().mockResolvedValue(heroA);
			mockStorage.putHero = vi.fn().mockResolvedValue(heroAPlayed);
			mockRemote.putHero = vi.fn().mockResolvedValue({ ok: true, version: 3 });
			mockSyncStore.getAll = vi.fn().mockResolvedValue(record(2));

			await ds.saveHero(heroAPlayed);

			expect(mockSyncStore.setBase).toHaveBeenCalledWith('a', heroA);
		});

		test('saveHero records the hero as pending, then as the version the server stored', async () => {
			const ds = build();

			mockStorage.getHero = vi.fn().mockResolvedValue(null);
			mockStorage.putHero = vi.fn().mockResolvedValue(heroA);
			mockRemote.putHero = vi.fn().mockResolvedValue({ ok: true, version: 3 });

			await ds.saveHero(heroA);
			await settle();

			expect(mockSyncStore.setAll).toHaveBeenNthCalledWith(1, { a: { dirty: true } });
			expect(mockSyncStore.setAll).toHaveBeenNthCalledWith(2, { a: { dirty: false, version: 3 } });
			expect(mockSyncStore.clearBase).toHaveBeenCalledWith('a');
		});

		test('saveHero replays this device\'s edits on top of a server copy that moved on', async () => {
			const ds = build();

			// This device changed the damage; the server's copy has an XP change made
			// somewhere else. Both have to survive the refused push.
			mockStorage.getHero = vi.fn().mockResolvedValue(heroA);
			mockStorage.putHero = vi.fn().mockResolvedValue(heroAPlayed);
			mockSyncStore.getAll = vi.fn().mockResolvedValue(record(1));
			mockSyncStore.getBase = vi.fn().mockResolvedValue(heroA);
			const put = vi.fn()
				.mockResolvedValueOnce({ ok: false, current: { hero: heroAElsewhere, version: 2 } })
				.mockResolvedValueOnce({ ok: true, version: 3 });
			mockRemote.putHero = put;

			await ds.saveHero(heroAPlayed);
			await settle();

			const merged = put.mock.calls[1][0] as Hero;
			expect(merged.state.staminaDamage).toBe(11);
			expect(merged.state.xp).toBe(9);
			expect(put).toHaveBeenNthCalledWith(2, merged, 2);
			expect(mockSyncStore.setAll).toHaveBeenLastCalledWith({ a: { dirty: false, version: 3 } });
			expect(mockStorage.putHero).toHaveBeenLastCalledWith(merged);
		});

		test('saveHero uploads outright when there is no copy to replay from', async () => {
			const ds = build();

			// An edit a build before the versions left dirty: no snapshot, so there is
			// no basis for a merge and the edit must not be dropped for the server's.
			mockStorage.getHero = vi.fn().mockResolvedValue(null);
			mockStorage.putHero = vi.fn().mockResolvedValue(heroAPlayed);
			mockSyncStore.getAll = vi.fn().mockResolvedValue(record(4, true));
			mockSyncStore.getBase = vi.fn().mockResolvedValue(null);
			const put = vi.fn()
				.mockResolvedValueOnce({ ok: false, current: { hero: heroAElsewhere, version: 5 } })
				.mockResolvedValueOnce({ ok: true, version: 6 });
			mockRemote.putHero = put;

			await ds.saveHero(heroAPlayed);
			await settle();

			expect(put).toHaveBeenNthCalledWith(1, heroAPlayed, 4);
			expect(put).toHaveBeenNthCalledWith(2, heroAPlayed);
			expect(mockSyncStore.setAll).toHaveBeenLastCalledWith({ a: { dirty: false, version: 6 } });
		});

		test('saveHero leaves the hero pending when the upload fails', async () => {
			const ds = build();

			mockStorage.getHero = vi.fn().mockResolvedValue(null);
			mockStorage.putHero = vi.fn().mockResolvedValue(heroA);
			mockRemote.putHero = vi.fn().mockRejectedValue(new Error('down'));

			await ds.saveHero(heroA);
			await settle();

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
