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
DATABASE_URL=postgres://user:pass@127.0.0.1:5432/damascus PORT=8543 npm start
```

On `pop` it runs as the `damascus-server` systemd service
(`/etc/systemd/system/damascus-server.service`), reading config from
`/opt/damascus-server/.env`, with ufw allowing `8543/tcp` from the LAN
(`192.168.1.0/24`) and Tailscale (`100.64.0.0/10`).

## Client

The app syncs to this server only when `VITE_REMOTE_API_URL` is set at build
time (e.g. `VITE_REMOTE_API_URL=http://192.168.1.126:8543`). Without it the app
stays local-only.
