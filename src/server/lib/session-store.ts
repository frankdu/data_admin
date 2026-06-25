import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_DIR = path.join(__dirname, '../../../.data')
const DB_PATH = path.join(DB_DIR, 'sessions.db')

// Ensure the data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

// Use a singleton pattern to ensure only one database instance
let db: Database.Database

function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, {
      timeout: 5000, // Wait up to 5 seconds for locks to clear
    })

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL')

    // Initialize the database schema
    initializeDatabase()
  }
  return db
}

function initializeDatabase() {
  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      encrypted_connection_string TEXT NOT NULL,
      db_type TEXT,
      server TEXT,
      username TEXT,
      database TEXT,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER NOT NULL
    )
  `)

  // Migration: Add new columns if they don't exist
  try {
    // Check if db_type column exists
    const columns = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>
    const columnNames = columns.map(col => col.name)

    if (!columnNames.includes('db_type')) {
      db.exec('ALTER TABLE sessions ADD COLUMN db_type TEXT')
    }
    if (!columnNames.includes('server')) {
      db.exec('ALTER TABLE sessions ADD COLUMN server TEXT')
    }
    if (!columnNames.includes('username')) {
      db.exec('ALTER TABLE sessions ADD COLUMN username TEXT')
    }
    if (!columnNames.includes('database')) {
      db.exec('ALTER TABLE sessions ADD COLUMN database TEXT')
    }
  } catch (error) {
    console.error('Migration error:', error)
  }

  // Create index for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_last_used
    ON sessions(last_used_at)
  `)
}

// Initialize database on first import
getDatabase()

export interface SessionData {
  token: string
  encryptedConnectionString: string
  dbType?: string
  server?: string
  username?: string
  database?: string
  createdAt: number
  lastUsedAt: number
}

export function saveSession(
  token: string,
  encryptedConnectionString: string,
  metadata?: { dbType?: string; server?: string; username?: string; database?: string }
): void {
  const database = getDatabase()
  const now = Date.now()
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO sessions (token, encrypted_connection_string, db_type, server, username, database, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    token,
    encryptedConnectionString,
    metadata?.dbType || null,
    metadata?.server || null,
    metadata?.username || null,
    metadata?.database || null,
    now,
    now
  )
}

export function getSession(token: string): SessionData | null {
  const database = getDatabase()
  const stmt = database.prepare(`
    SELECT token, encrypted_connection_string as encryptedConnectionString,
           db_type as dbType, server, username, database,
           created_at as createdAt, last_used_at as lastUsedAt
    FROM sessions
    WHERE token = ?
  `)
  const result = stmt.get(token) as SessionData | undefined

  if (result) {
    // Update last used timestamp
    const updateStmt = database.prepare(`
      UPDATE sessions SET last_used_at = ? WHERE token = ?
    `)
    updateStmt.run(Date.now(), token)
  }

  return result || null
}

export function deleteSession(token: string): void {
  const database = getDatabase()
  const stmt = database.prepare('DELETE FROM sessions WHERE token = ?')
  stmt.run(token)
}

// Clean up old sessions (older than 7 days)
export function cleanupOldSessions(): void {
  const database = getDatabase()
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const stmt = database.prepare('DELETE FROM sessions WHERE last_used_at < ?')
  stmt.run(sevenDaysAgo)
}

// Run cleanup on startup
cleanupOldSessions()

// Schedule periodic cleanup (every hour)
setInterval(cleanupOldSessions, 60 * 60 * 1000)
