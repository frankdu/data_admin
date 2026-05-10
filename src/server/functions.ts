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

    if (data.mode === 'connectionString') {
      connectionString = data.connectionString
    } else {
      connectionString = buildConnectionString({
        server: data.server,
        username: data.username,
        password: data.password,
        database: data.database,
      })
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

    // Encrypt and save connection string
    const encryptedConnectionString = encrypt(connectionString)
    saveSession(sessionToken, encryptedConnectionString)

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
