import { describe, expect, it } from 'vitest';
import { Hero } from '@/models/hero';
import { SyncMergeLogic } from '@/logic/sync-merge-logic';

// The merge is what stands between two devices and a lost evening's XP: it runs
// when a push is refused because the server moved on, and it has to keep both
// sides' edits without guessing which fields were touched.
const hero = (state: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
	return { id: 'h', name: 'Hero', state: state, ...extra } as unknown as Hero;
};

const merge = (base: Hero, local: Hero, remote: Hero) => SyncMergeLogic.mergeHero(base, local, remote) as unknown as { state: Record<string, unknown>, name: string };

describe('SyncMergeLogic', () => {
	it('keeps a field each device changed, the case that loses data today', () => {
		const base = hero({ xp: 12, victories: 3, staminaDamage: 1, projectPoints: 0 });
		const local = hero({ xp: 12, victories: 3, staminaDamage: 2, projectPoints: 0 }); // this device took damage
		const remote = hero({ xp: 12, victories: 3, staminaDamage: 1, projectPoints: 1 }); // the other spent a project point

		const merged = merge(base, local, remote);

		expect(merged.state.staminaDamage).toBe(2);
		expect(merged.state.projectPoints).toBe(1);
	});

	it('takes the server copy where this device changed nothing', () => {
		const base = hero({ xp: 12, victories: 3 });
		const local = hero({ xp: 12, victories: 3 });
		const remote = hero({ xp: 15, victories: 3 });

		expect(merge(base, local, remote).state.xp).toBe(15);
	});

	it('keeps this device\'s edit where the server changed nothing', () => {
		const base = hero({ xp: 12, victories: 3 });
		const local = hero({ xp: 12, victories: 5 });
		const remote = hero({ xp: 12, victories: 3 });

		expect(merge(base, local, remote).state.victories).toBe(5);
	});

	it('gives the same field to this device when both changed it', () => {
		const base = hero({ xp: 12 });
		const local = hero({ xp: 13 });
		const remote = hero({ xp: 20 });

		expect(merge(base, local, remote).state.xp).toBe(13);
	});

	it('does not mistake jsonb key order for an edit', () => {
		// The server's copy comes back from jsonb with its keys in a different
		// order. That is not a change, and treating it as one is how a merge turns
		// into an overwrite.
		const base = hero({ xp: 12, victories: 3, projectPoints: 4 });
		const local = hero({ xp: 12, victories: 3, projectPoints: 4 });
		const remote = { state: { projectPoints: 1, victories: 3, xp: 12 }, id: 'h', name: 'Hero' } as unknown as Hero;

		expect(merge(base, local, remote).state.projectPoints).toBe(1);
	});

	it('keeps work on different projects from two devices', () => {
		const project = (id: string, points: number) => ({ id: id, name: id, goal: 45, progress: { points: points } });
		const base = hero({}, { projects: [ project('p1', 10), project('p2', 20) ] });
		const local = hero({}, { projects: [ project('p1', 15), project('p2', 20) ] }); // advanced p1 here
		const remote = hero({}, { projects: [ project('p1', 10), project('p2', 44) ] }); // advanced p2 elsewhere

		const merged = merge(base, local, remote) as unknown as { projects: { id: string, progress: { points: number } }[] };

		expect(merged.projects.find(p => p.id === 'p1')!.progress.points).toBe(15);
		expect(merged.projects.find(p => p.id === 'p2')!.progress.points).toBe(44);
	});

	it('keeps a project added here and one added elsewhere', () => {
		const project = (id: string) => ({ id: id, name: id, progress: { points: 0 } });
		const base = hero({}, { projects: [] });
		const local = hero({}, { projects: [ project('mine') ] });
		const remote = hero({}, { projects: [ project('theirs') ] });

		const merged = merge(base, local, remote) as unknown as { projects: { id: string }[] };

		expect(merged.projects.map(p => p.id).sort()).toEqual([ 'mine', 'theirs' ]);
	});

	it('lets a deletion stand when this device did not touch the thing', () => {
		const item = (id: string) => ({ id: id, name: id, progress: { points: 0 } });
		const base = hero({}, { projects: [ item('gone') ] });
		const local = hero({}, { projects: [ item('gone') ] }); // this device did nothing
		const remote = hero({}, { projects: [] }); // deleted elsewhere

		const merged = merge(base, local, remote) as unknown as { projects: unknown[] };

		expect(merged.projects).toEqual([]);
	});

	it('keeps a thing this device edited after it was deleted elsewhere', () => {
		const item = (id: string, points: number) => ({ id: id, name: id, progress: { points: points } });
		const base = hero({}, { projects: [ item('kept', 5) ] });
		const local = hero({}, { projects: [ item('kept', 9) ] }); // edited here
		const remote = hero({}, { projects: [] }); // deleted elsewhere

		const merged = merge(base, local, remote) as unknown as { projects: { id: string }[] };

		expect(merged.projects.map(p => p.id)).toEqual([ 'kept' ]);
	});

	it('adds a field this device introduced and one the server did', () => {
		const base = hero({});
		const local = hero({}, { notes: 'from here' });
		const remote = hero({}, { folder: 'from there' });

		const merged = merge(base, local, remote) as unknown as { notes: string, folder: string };

		expect(merged.notes).toBe('from here');
		expect(merged.folder).toBe('from there');
	});

	it('drops a field this device cleared', () => {
		const base = hero({}, { notes: 'here' });
		const local = hero({});
		const remote = hero({}, { notes: 'here' });

		const merged = merge(base, local, remote) as unknown as { notes?: string };

		expect(merged.notes).toBeUndefined();
	});

	it('replaces a list with nothing to match items by', () => {
		const base = hero({ conditions: [ 'bleeding' ] });
		const local = hero({ conditions: [ 'bleeding', 'dazed' ] });
		const remote = hero({ conditions: [ 'bleeding', 'prone' ] });

		expect(merge(base, local, remote).state.conditions).toEqual([ 'bleeding', 'dazed' ]);
	});
});
