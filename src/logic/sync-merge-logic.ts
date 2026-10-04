import { Hero } from '@/models/hero';

// A three-way merge for hero sync, run when a device's push turns out to be based
// on a version the server has moved past. It takes the copy this device started
// from (`base`), the copy it holds now (`local`), and what the server holds
// (`remote`), and keeps both sides' work: a field only this device touched comes
// from here, a field only the other device touched comes from the server, and a
// field both touched takes this device's value.
//
// The comparison that decides "did this device change it" is always local against
// base - the two are the same lineage, so key order cannot lie. The server's copy
// has been through Postgres jsonb, which reorders object keys; treating that as a
// change would make every field look edited on both sides.
export class SyncMergeLogic {
	static mergeHero = (base: Hero, local: Hero, remote: Hero): Hero => {
		return SyncMergeLogic.mergeValue(base, local, remote) as Hero;
	};

	private static mergeValue = (base: unknown, local: unknown, remote: unknown): unknown => {
		// This device left it alone, so the server's copy stands - including a gap
		// where the other device deleted something.
		if (SyncMergeLogic.same(local, base)) {
			return remote;
		}

		// Nobody else touched it, so this device's edit stands.
		if (SyncMergeLogic.same(remote, base)) {
			return local;
		}

		if (SyncMergeLogic.isObject(base) && SyncMergeLogic.isObject(local) && SyncMergeLogic.isObject(remote)) {
			return SyncMergeLogic.mergeObject(base, local, remote);
		}

		if (Array.isArray(local) && Array.isArray(remote)) {
			return SyncMergeLogic.mergeArray(base, local, remote);
		}

		// Both sides changed the same leaf, so there is a genuine conflict and no
		// way to keep both. This device's edit is the newer intent.
		return local;
	};

	private static mergeObject = (base: Record<string, unknown>, local: Record<string, unknown>, remote: Record<string, unknown>): Record<string, unknown> => {
		const result: Record<string, unknown> = { ...remote };
		const keys = new Set([ ...Object.keys(base), ...Object.keys(local), ...Object.keys(remote) ]);
		keys.forEach(key => {
			const value = SyncMergeLogic.mergeValue(base[key], local[key], remote[key]);
			if (value === undefined) {
				delete result[key];
			} else {
				result[key] = value;
			}
		});
		return result;
	};

	// Arrays of things with ids - projects, conditions, inventory items, titles -
	// merge per item, so two devices working on different projects both keep their
	// work instead of one array replacing the other. A project's own points then
	// merge the same way one level down.
	private static mergeArray = (base: unknown, local: unknown[], remote: unknown[]): unknown[] => {
		const keyed = (list: unknown) => Array.isArray(list) && list.every(item => SyncMergeLogic.isObject(item) && (typeof item.id === 'string'));
		if (!keyed(base) || !keyed(local) || !keyed(remote)) {
			// Nothing to match items up by, so the whole list is the unit of change.
			return local;
		}

		const baseByID = new Map((base as { id: string }[]).map(item => [ item.id, item ]));
		const remoteByID = new Map(remote.map(item => [ (item as { id: string }).id, item ]));
		const result: unknown[] = [];

		local.forEach(item => {
			const id = (item as { id: string }).id;
			const starting = baseByID.get(id);
			const other = remoteByID.get(id);

			if (other) {
				result.push(SyncMergeLogic.mergeValue(starting, item, other));
				return;
			}

			// Not on the server: either it is new here, or the other device deleted
			// it. A local edit since then is this device's newer intent, otherwise the
			// deletion stands.
			if (!starting || !SyncMergeLogic.same(item, starting)) {
				result.push(item);
			}
		});

		// Anything the other device added, appended in its order.
		remote.forEach(item => {
			const id = (item as { id: string }).id;
			if (!baseByID.has(id) && !local.some(candidate => (candidate as { id: string }).id === id)) {
				result.push(item);
			}
		});

		return result;
	};

	private static isObject = (value: unknown): value is Record<string, unknown> => {
		return (value !== null) && (typeof value === 'object') && !Array.isArray(value);
	};

	private static same = (a: unknown, b: unknown): boolean => {
		return JSON.stringify(a) === JSON.stringify(b);
	};
};
