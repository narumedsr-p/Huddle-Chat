# backend

Express + TypeScript + Prisma/PostgreSQL API for 1Carry3Monkey. See [API.md](./API.md) for the
full endpoint spec and the business rules carried over from the frontend mock.

## Full stack (recommended)

From the repo root:

```sh
docker compose up -d --build
```

Brings up Postgres, this backend (migrations run automatically on container start via
`prisma migrate deploy`), and the frontend on `http://localhost:8888`. The database starts empty —
to load the demo fixture (5 named clients, 3 groups):

```sh
docker compose run --rm backend npx prisma db seed
```

## Local dev (backend only, against the dockerized Postgres)

```sh
docker compose up -d postgres   # exposes localhost:5432
cp .env.example .env
npm install
npx prisma migrate dev          # first time only, or after schema changes
npm run prisma:seed             # optional, loads the demo fixture
npm run dev                     # serves on :4000, proxied by the frontend's vite dev server
```

## Reset the database

Wipes all data, reapplies migrations, and reloads the demo fixture in one shot. Run from `backend/`
(not the repo root):

```sh
cd backend
DATABASE_URL="postgresql://app:app@localhost:5432/carry3monkey" npx prisma migrate reset --force
```

Prompts for confirmation first — it's destructive. Only use against the local dev Postgres above,
never a shared/production database.
