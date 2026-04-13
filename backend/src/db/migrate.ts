import 'dotenv/config'
import { pool } from './index.js'

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  georide_user_id  INTEGER UNIQUE NOT NULL,
  email            TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_metadata (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  georide_trip_id  INTEGER NOT NULL,
  tag              TEXT CHECK (tag IN ('commute','leisure','sport','track','other')),
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, georide_trip_id)
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trip_metadata_updated_at ON trip_metadata;
CREATE TRIGGER trip_metadata_updated_at
  BEFORE UPDATE ON trip_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query(schema)
    console.log('Migration completed successfully.')
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
