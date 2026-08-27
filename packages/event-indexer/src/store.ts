import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "events.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      ledger INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      contract_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      topics TEXT NOT NULL,
      data TEXT NOT NULL,
      processed_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      group_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      admin TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 1,
      total_members INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      created_at INTEGER NOT NULL,
      contract_address TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      address TEXT NOT NULL,
      join_order INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      joined_at INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(group_id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      member TEXT NOT NULL,
      amount INTEGER NOT NULL,
      round INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(group_id)
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      recipient TEXT NOT NULL,
      amount INTEGER NOT NULL,
      round INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(group_id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_ledger ON events(ledger);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract_id);
    CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_group ON contributions(group_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_member ON contributions(member);
    CREATE INDEX IF NOT EXISTS idx_payouts_group ON payouts(group_id);
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
