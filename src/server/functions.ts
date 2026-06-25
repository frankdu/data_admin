import { createServerFn } from '@tanstack/react-start'
import { encrypt, decrypt, generateSessionToken } from './lib/encryption'
import { saveSession, getSession } from './lib/session-store'
import { buildConnectionString, testConnection, getTables } from './lib/postgres'

export type ConnectionInput =
  | { mode: 'connectionString'; connectionString: string }
  | { mode: 'separateFields'; server: string; username: string; password: string; database: string }

export const connectDatabase = createServerFn({
  method: 'POST',
}).handler(async ({ data }: { data: ConnectionInput }) => {
  try {
    // Build connection string
    let connectionString: string
    let metadata: { dbType?: string; server?: string; username?: string; database?: string } = {}

    if (data.mode === 'connectionString') {
      connectionString = data.connectionString
      // Try to parse connection string to extract metadata
      try {
        const url = new URL(connectionString)
        const [host, port] = [url.hostname, url.port]

        // Extract database type from scheme (e.g., postgresql, mysql, sqlite)
        const dbType = url.protocol.replace(':', '')

        metadata = {
          dbType: dbType,
          server: port ? `${host}:${port}` : host,
          username: url.username || undefined,
          database: url.pathname.slice(1) || undefined, // Remove leading slash
        }
      } catch {
        // If parsing fails, leave metadata empty
      }
    } else {
      connectionString = buildConnectionString({
        server: data.server,
        username: data.username,
        password: data.password,
        database: data.database,
      })
      metadata = {
        dbType: 'postgresql', // Default to postgresql for separate fields mode
        server: data.server,
        username: data.username,
        database: data.database,
      }
    }

    // Test connection
    const isValid = await testConnection(connectionString)
    if (!isValid) {
      return {
        success: false,
        error: 'Failed to connect to database. Please check your credentials.',
      }
    }

    // Generate session token
    const sessionToken = generateSessionToken()

    // Encrypt and save connection string with metadata
    const encryptedConnectionString = encrypt(connectionString)
    saveSession(sessionToken, encryptedConnectionString, metadata)

    return {
      success: true,
      sessionToken,
    }
  } catch (error) {
    console.error('Database connection error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
})

export const getDatabaseTables = createServerFn({
  method: 'POST',
}).handler(async ({ data }: { data: { sessionToken: string } }) => {
  try {
    // Retrieve session
    const session = getSession(data.sessionToken)
    if (!session) {
      return {
        success: false,
        error: 'Invalid or expired session. Please reconnect.',
      }
    }

    // Decrypt connection string
    const connectionString = decrypt(session.encryptedConnectionString)

    // Get tables
    const tables = await getTables(connectionString)

    return {
      success: true,
      tables,
    }
  } catch (error) {
    console.error('Error fetching tables:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tables',
    }
  }
})
