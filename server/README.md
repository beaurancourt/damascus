# Damascus server

Remote hero storage for Damascus. The player app is a static site, so it can't
talk to Postgres directly; this tiny API sits in front of the database and
stores each hero's full JSON under its GUID.

## API

| Method | Path            | Description                                   |
| ------ | --------------- | --------------------------------------------- |
| GET    | `/health`       | Health check                                  |
| GET    | `/heroes`       | List heroes (`id`, `data`, `updatedAt`)       |
| GET    | `/heroes/:id`   | One hero's JSON, or `404`                     |
| PUT    | `/heroes/:id`   | Upsert a hero's full JSON                     |
| DELETE | `/heroes/:id`   | Delete a hero                                 |

## Auth

Every `/heroes` route requires `Authorization: Bearer <token>` when `API_TOKEN`
is set in the environment (unset = open, for local dev). The token is a
shared secret baked into the client build; it stops casual access but isn't a
substitute for real per-user auth.

## Database

Postgres 16, table `heroes (id text primary key, data jsonb not null, updated_at timestamptz not null default now())`.

```sql
CREATE TABLE heroes (
	id TEXT PRIMARY KEY,
	data JSONB NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Running

```sh
npm install
DATABASE_URL=postgres://user:pass@127.0.0.1:5432/damascus API_TOKEN=... PORT=8543 npm start
```

On `pop` it runs as the `damascus-server` systemd service
(`/etc/systemd/system/damascus-server.service`), reading config from
`/opt/damascus-server/.env`, with ufw allowing `8543/tcp` from the LAN
(`192.168.1.0/24`) and Tailscale (`100.64.0.0/10`).

## Public access (Cloudflare tunnel)

`pop` runs a named Cloudflare tunnel (`ackssrd.cc`). The ingress routes
`damascus.ackssrd.cc` → `http://localhost:8543`, so the deployed HTTPS app
reaches the API at `https://damascus.ackssrd.cc` without mixed-content
blocking. The DNS record was added with:

```sh
cloudflared tunnel route dns <tunnel-id> damascus.ackssrd.cc
```

## Client

The app syncs to this server only when `VITE_REMOTE_API_URL` is set at build
time, e.g. `VITE_REMOTE_API_URL=https://damascus.ackssrd.cc` plus
`VITE_REMOTE_API_KEY=<token>`. Without the URL the app stays local-only.
