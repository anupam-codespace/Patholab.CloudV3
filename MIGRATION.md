# Migrating Patholab from SQLite → PostgreSQL (Neon)

This guide walks you through migrating your existing Patholab database from SQLite
to a managed PostgreSQL instance (Neon, Supabase, Railway, Render, or self-hosted).

---

## Why this migration is needed

Patholab v3.2.0 and earlier used SQLite, which has **no native array type**. Prisma
silently serialized JS arrays (`["b2b","inventory"]`) into strings before storing
them in `TEXT` columns. The Prisma schema declared these fields as `String`, which
matched SQLite's behavior.

When you switch to PostgreSQL (Neon), Postgres enforces **strict typing** — a `TEXT`
column cannot hold a `text[]` array. This causes the error:

```
Error converting field "activeModules" of expected non-nullable type "String",
found incompatible value of "[String("b2b"), String("inventory"), ...]".
```

**Patholab v3.2.2** fixes this by declaring the four affected fields as native
Postgres `String[]` arrays (and two JSON-shaped fields as `Json?`):

| Model            | Field             | Before (v3.2.1) | After (v3.2.2) |
|------------------|-------------------|-----------------|----------------|
| `User`           | `activeModules`   | `String`        | `String[]`     |
| `Lab`            | `activeModules`   | `String`        | `String[]`     |
| `Branch`         | `activeModules`   | `String`        | `String[]`     |
| `LabStaff`       | `permissions`     | `String`        | `String[]`     |
| `SystemConfig`   | `socialLinks`     | `String?`       | `Json?`        |
| `RadiologyStudy` | `safetyChecklist` | `String?`       | `Json?`        |

---

## Migration steps

### 1. Set up your Neon database

1. Go to [neon.tech](https://neon.tech) → sign up (free tier is fine).
2. Create a new project → copy the **Pooled connection** string (it looks like):
   ```
   postgresql://neondb_owner:npg_xxxxxxxx@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
   Use the **pooled** URL (not direct) — it leverages PgBouncer for connection pooling,
   which is important for serverless deployments like Vercel.

### 2. Update your `.env` file

Replace the SQLite URL with the Neon URL:

```bash
# OLD (SQLite)
# DATABASE_URL="file:/home/z/my-project/db/custom.db"

# NEW (Neon Postgres)
DATABASE_URL="postgresql://neondb_owner:npg_xxxxxxxx@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

Also set these required env vars if you haven't already (see `.env.example`):

```bash
JWT_SECRET="generate-with-openssl-rand-hex-48"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
TZ="Asia/Kolkata"
RESEND_API_KEY="re_xxxxxxxx"
RAZORPAY_KEY_ID="rzp_test_xxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxx"
```

### 3. Install `better-sqlite3` (only needed for the migration script)

```bash
npm install --save-dev better-sqlite3 @types/better-sqlite3 tsx
```

### 4. Push the new schema to Postgres

This creates all tables with the correct types (`text[]` for arrays, `jsonb` for Json):

```bash
npx prisma db push
```

If you get an error like "database is not empty", either:
- Drop all tables in the Neon DB first: `npx prisma migrate reset` (⚠️ destructive), OR
- Create a fresh empty Neon database.

### 5. Migrate your existing data

If your SQLite DB (`db/custom.db`) has real data you want to preserve, run the
migration script:

```bash
npx tsx scripts/migrate-sqlite-to-postgres.ts
```

This script:
- Reads each row from the old SQLite DB.
- Detects the legacy string-encoded array format (Prisma on SQLite stored
  `String[]` as `["b2b","inventory"]` or comma-separated `b2b,inventory`).
- Converts it to a real JS array.
- Inserts the row into the new Postgres DB.

**Currently migrates:** `SystemConfig`, `User`, `Lab`, `Branch`, `LabStaff`, `RadiologyStudy`
(the tables with field-type conversions). For full migration of all 60+ tables, extend
the script following the same pattern, or use `pgloader`:

```bash
# Option A: Use pgloader for bulk migration (install first: brew install pgloader)
pgloader sqlite:///db/custom.db $DATABASE_URL

# Option B: Extend scripts/migrate-sqlite-to-postgres.ts with the remaining tables
```

### 6. Regenerate the Prisma client

```bash
npx prisma generate
```

### 7. Restart your dev server

```bash
npm run dev
```

You should now be able to log in without the `P2032` error.

### 8. Verify

1. Open `http://localhost:3000/login` and log in.
2. The `/api/auth/me` endpoint should return successfully with `activeModules: []` (or the migrated array).
3. Go to **Settings → Modules** and toggle a module on/off — it should save correctly.
4. Check Neon's SQL editor: `SELECT id, name, active_modules FROM "Lab";` — you should see `{b2b,inventory}` (Postgres array syntax).

---

## Common issues & fixes

### "relation does not exist" error

You ran `prisma generate` but not `prisma db push`. Run:

```bash
npx prisma db push
```

### "database connection closed" errors on Vercel

Neon's free tier limits concurrent connections. Make sure you're using the **pooled**
connection string (it has `pooler` in the hostname), not the direct connection.

### Prisma migration history conflicts

If you previously ran `prisma migrate dev` against SQLite, the `_prisma_migrations`
table may have stale entries. Drop it:

```sql
DROP TABLE IF EXISTS "_prisma_migrations";
```

Then run `npx prisma db push` fresh.

### Existing SQLite data has `[object Object]` in `safetyChecklist`

This happened because the old code passed a JS object to a `String?` column. The
migration script handles this gracefully by wrapping unparseable strings in
`{ _legacy: "<raw>" }` so no data is lost. You can manually clean these up later.

### `mode: 'insensitive'` queries now work properly

SQLite ignored `mode: 'insensitive'` (it was always case-insensitive). Postgres
respects it — so your search queries will now be truly case-insensitive. No action
needed; this is an improvement.

---

## Verifying the fix

After migration, these Prisma queries should all work without error:

```typescript
// Reading — returns a real JS array now
const user = await prisma.user.findUnique({ where: { id: '...' } });
console.log(user.activeModules); // ['b2b', 'inventory', 'logistics', 'radiology', 'iot']

// Writing — accepts a real JS array
await prisma.lab.update({
  where: { id: '...' },
  data: { activeModules: ['b2b', 'inventory'] },
});

// Querying by array membership
const labs = await prisma.lab.findMany({
  where: { activeModules: { has: 'b2b' } },
});
```

---

## Rollback (if something goes wrong)

To revert to SQLite:

1. Change `prisma/schema.prisma` back to `provider = "sqlite"`.
2. Change `.env` back to `DATABASE_URL="file:./db/custom.db"`.
3. Run `npx prisma generate`.
4. Restart the dev server.

Your SQLite database file is untouched by the migration (the script opens it in
`readonly` mode), so you can always fall back to it.
