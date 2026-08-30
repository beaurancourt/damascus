import { Hero } from '@/models/hero';

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

	async getHeroes(): Promise<Hero[]> {
		const res = await fetch(`${this.baseURL}/heroes`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error(`remote getHeroes failed: ${res.status}`);
		}
		const rows: { id: string, data: Hero, updatedAt: string }[] = await res.json();
		return rows.map(row => row.data);
	}

	async putHero(hero: Hero): Promise<void> {
		const res = await fetch(`${this.baseURL}/heroes/${encodeURIComponent(hero.id)}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
			body: JSON.stringify(hero)
		});
		if (!res.ok) {
			throw new Error(`remote putHero failed: ${res.status}`);
		}
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
