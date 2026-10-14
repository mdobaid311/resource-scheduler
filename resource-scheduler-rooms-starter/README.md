# Room booking starter: Next.js + Prisma + Resource Scheduler

The finished code of the tutorial [Room booking app with Next.js and Prisma](https://github.com/mdobaid311/resource-scheduler#readme). Rooms and bookings live in Postgres, the calendar is [Resource Scheduler](https://www.npmjs.com/package/resource-scheduler) in a client component, and the route handlers re-check every booking with `isPlacementAllowed` inside a `Serializable` transaction and answer 409 on a conflict. Create, move and resize are optimistic and roll back when the server refuses.

```bash
npm install
cp .env.example .env        # point DATABASE_URL at a Postgres database
npx prisma migrate dev --name init
npm run seed                # two rooms
npm run dev
```

Try the guard without the UI: send the same `POST /api/bookings` twice and the second answers `409`.

There is no sign-in. Anyone who can reach the routes can book and move anything; add authentication before real use.

MIT licensed.
