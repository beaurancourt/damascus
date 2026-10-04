// Damascus remote hero storage: a thin HTTP API in front of Postgres.
// The client app is a static site, so it can't talk to the database directly;
// this server exposes heroes by their GUID.

const cors = require('cors');
const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

// Shared-secret auth for the public tunnel. If unset the API stays open (local
// dev); once set, every /heroes route requires `Authorization: Bearer <token>`.
const apiToken = process.env.API_TOKEN || '';

const app = express();
app.use(cors());
// Hero JSON is large (nested features, abilities, etc), so raise the body cap.
app.use(express.json({ limit: '20mb' }));

const handleError = (res, err) => {
	console.error(err);
	res.status(500).json({ error: err.message });
};

const requireAuth = (req, res, next) => {
	if (!apiToken) {
		return next();
	}
	const header = req.headers.authorization || '';
	const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
	if (token !== apiToken) {
		return res.status(401).json({ error: 'unauthorized' });
	}
	next();
};

// Health check for the systemd unit and the tunnel.
app.get('/health', (_req, res) => {
	res.json({ ok: true });
});

// Everything a fresh device needs to discover the heroes stored on the server.
app.get('/heroes', requireAuth, async (_req, res) => {
	try {
		const result = await pool.query('SELECT id, data, updated_at, version FROM heroes ORDER BY updated_at DESC');
		res.json(result.rows.map(row => ({
			id: row.id,
			data: row.data,
			version: row.version,
			// Older clients still key off this when deciding whether to adopt the
			// server's copy, so it stays alongside the version.
			updatedAt: row.updated_at
		})));
	} catch (err) {
		handleError(res, err);
	}
});

// One hero by GUID. 404 when it isn't stored yet.
app.get('/heroes/:id', requireAuth, async (req, res) => {
	try {
		const result = await pool.query('SELECT data, version, updated_at FROM heroes WHERE id = $1', [ req.params.id ]);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'not found' });
		}
		res.json(result.rows[0].data);
	} catch (err) {
		handleError(res, err);
	}
});

// Upsert a hero's full JSON under its GUID.
app.put('/heroes/:id', requireAuth, async (req, res) => {
	try {
		const data = JSON.stringify(req.body);
		const id = req.params.id;

		// `If-Match` carries the version this copy was based on. A write is only
		// taken if the row is still at that version, so a device that loaded a hero
		// an hour ago cannot throw away what another device did since. Older clients
		// send no header and are taken as-is, which is how they behaved before.
		const condition = req.headers['if-match'];
		const base = (typeof condition === 'string') ? Number.parseInt(condition.replace(/"/g, ''), 10) : Number.NaN;

		if (Number.isNaN(base)) {
			const result = await pool.query(
				`INSERT INTO heroes (id, data, version)
				 VALUES ($1, $2::jsonb, 1)
				 ON CONFLICT (id) DO UPDATE SET data = $2::jsonb, updated_at = now(), version = heroes.version + 1
				 RETURNING version, updated_at`,
				[ id, data ]
			);
			return res.json({ ok: true, version: result.rows[0].version, updatedAt: result.rows[0].updated_at });
		}

		// The insert path carries the version a resurrected hero should continue
		// from, so a hero deleted while a device held an unsynced edit comes back
		// ahead of where it was rather than restarting at 1.
		const result = await pool.query(
			`INSERT INTO heroes (id, data, version)
			 VALUES ($1, $2::jsonb, $3 + 1)
			 ON CONFLICT (id) DO UPDATE SET data = $2::jsonb, updated_at = now(), version = heroes.version + 1
			 WHERE heroes.version = $3
			 RETURNING version, updated_at`,
			[ id, data, base ]
		);

		if (result.rowCount === 0) {
			// Someone wrote first. Hand back the copy that won so the caller can put
			// its own changes on top of it instead of losing them.
			const current = await pool.query('SELECT data, version FROM heroes WHERE id = $1', [ id ]);
			if (current.rows.length === 0) {
				return res.status(404).json({ error: 'not found' });
			}
			return res.status(412).json({
				error: 'version conflict',
				data: current.rows[0].data,
				version: current.rows[0].version
			});
		}

		res.json({ ok: true, version: result.rows[0].version, updatedAt: result.rows[0].updated_at });
	} catch (err) {
		handleError(res, err);
	}
});

app.delete('/heroes/:id', requireAuth, async (req, res) => {
	try {
		await pool.query('DELETE FROM heroes WHERE id = $1', [ req.params.id ]);
		res.json({ ok: true });
	} catch (err) {
		handleError(res, err);
	}
});

const port = process.env.PORT || 8543;
app.listen(port, () => {
	console.log(`damascus-server listening on ${port}`);
});
