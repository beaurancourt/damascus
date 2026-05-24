import { afterEach, describe, expect, test, vi } from 'vitest';
import { DataService } from '@/services/data-service';
import { Hero } from '@/models/hero';
import { Options } from '@/models/options';
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
