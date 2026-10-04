import { Hero } from '@/models/hero';

export interface RemoteHero {
	hero: Hero;
	version: number;
}

/**
 * A push either lands, or is refused because the server has moved past the
 * version this copy was based on - in which case the server's current copy comes
 * back with it, so the caller can merge instead of overwriting.
 */
export type PushResult =
	| { ok: true, version: number }
	| { ok: false, current: RemoteHero };

// Talks to the remote hero-storage API (server/index.js). Absent when no
// VITE_REMOTE_API_URL is configured, in which case the app stays local-only.
// An optional token becomes a Bearer header on every request, for the public
// tunnel.
export class RemoteService {
	private readonly baseURL: string;
	private readonly token: string | null;

	constructor(baseURL: string, token?: string) {
		this.baseURL = baseURL.replace(/\/+$/, '');
		this.token = token || null;
	}

	private authHeaders(): Record<string, string> {
		return this.token ? { Authorization: `Bearer ${this.token}` } : {};
	}

	async getHeroes(): Promise<RemoteHero[]> {
		const res = await fetch(`${this.baseURL}/heroes`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error(`remote getHeroes failed: ${res.status}`);
		}
		const rows: { id: string, data: Hero, version?: number }[] = await res.json();
		// A server older than the version column answers without one; 0 reads as
		// "no version known", which takes the merge path on the next push and then
		// settles once the server is updated.
		return rows.map(row => ({ hero: row.data, version: row.version ?? 0 }));
	}

	/**
	 * Store a hero. `base` is the version this copy was based on: the server
	 * refuses the write if it has moved past that (412) and answers with the copy
	 * it holds instead of losing either side's work.
	 */
	async putHero(hero: Hero, base?: number): Promise<PushResult> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...this.authHeaders()
		};
		if (base !== undefined) {
			headers['If-Match'] = `"${base}"`;
		}

		const res = await fetch(`${this.baseURL}/heroes/${encodeURIComponent(hero.id)}`, {
			method: 'PUT',
			headers: headers,
			body: JSON.stringify(hero)
		});

		if (res.status === 412) {
			const body = await res.json().catch(() => undefined) as { data?: Hero, version?: number } | undefined;
			if (body?.data) {
				return { ok: false, current: { hero: body.data, version: body.version ?? 0 } };
			}
			throw new Error('remote putHero conflicted without sending its copy');
		}

		if (!res.ok) {
			throw new Error(`remote putHero failed: ${res.status}`);
		}

		const body = await res.json().catch(() => undefined) as { version?: number } | undefined;
		return { ok: true, version: body?.version ?? 0 };
	}

	async deleteHero(id: string): Promise<void> {
		const res = await fetch(`${this.baseURL}/heroes/${encodeURIComponent(id)}`, {
			method: 'DELETE',
			headers: this.authHeaders()
		});
		if (!res.ok) {
			throw new Error(`remote deleteHero failed: ${res.status}`);
		}
	}
}
