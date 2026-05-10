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

const db = new Database(DB_PATH)

// Create sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    encrypted_connection_string TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL
  )
`)

// Create index for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_last_used
  ON sessions(last_used_at)
`)

export interface SessionData {
  token: string
  encryptedConnectionString: string
  createdAt: number
  lastUsedAt: number
}

export function saveSession(token: string, encryptedConnectionString: string): void {
  const now = Date.now()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO sessions (token, encrypted_connection_string, created_at, last_used_at)
    VALUES (?, ?, ?, ?)
  `)
  stmt.run(token, encryptedConnectionString, now, now)
}

export function getSession(token: string): SessionData | null {
  const stmt = db.prepare(`
    SELECT token, encrypted_connection_string as encryptedConnectionString,
           created_at as createdAt, last_used_at as lastUsedAt
    FROM sessions
    WHERE token = ?
  `)
  const result = stmt.get(token) as SessionData | undefined

  if (result) {
    // Update last used timestamp
    const updateStmt = db.prepare(`
      UPDATE sessions SET last_used_at = ? WHERE token = ?
    `)
    updateStmt.run(Date.now(), token)
  }

  return result || null
}

export function deleteSession(token: string): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?')
  stmt.run(token)
}

// Clean up old sessions (older than 7 days)
export function cleanupOldSessions(): void {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const stmt = db.prepare('DELETE FROM sessions WHERE last_used_at < ?')
  stmt.run(sevenDaysAgo)
}

// Run cleanup on startup
cleanupOldSessions()

// Schedule periodic cleanup (every hour)
setInterval(cleanupOldSessions, 60 * 60 * 1000)
