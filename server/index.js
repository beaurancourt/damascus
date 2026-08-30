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
		const result = await pool.query('SELECT id, data, updated_at FROM heroes ORDER BY updated_at DESC');
		res.json(result.rows.map(row => ({
			id: row.id,
			data: row.data,
			updatedAt: row.updated_at
		})));
	} catch (err) {
		handleError(res, err);
	}
});

// One hero by GUID. 404 when it isn't stored yet.
app.get('/heroes/:id', requireAuth, async (req, res) => {
	try {
		const result = await pool.query('SELECT data FROM heroes WHERE id = $1', [ req.params.id ]);
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
		await pool.query(
			`INSERT INTO heroes (id, data, updated_at)
			 VALUES ($1, $2::jsonb, now())
			 ON CONFLICT (id) DO UPDATE SET data = $2::jsonb, updated_at = now()`,
			[ req.params.id, data ]
		);
		res.json({ ok: true });
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
