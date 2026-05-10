import pg from 'pg'

const { Client } = pg

export function buildConnectionString(params: {
  server: string
  username: string
  password: string
  database: string
}): string {
  // Parse server (could be "host:port" or just "host")
  const [host, port = '5432'] = params.server.split(':')

  return `postgresql://${params.username}:${params.password}@${host}:${port}/${params.database}`
}

export async function testConnection(connectionString: string): Promise<boolean> {
  const client = new Client({ connectionString })

  try {
    await client.connect()
    await client.query('SELECT 1')
    return true
  } catch (error) {
    console.error('Connection test failed:', error)
    return false
  } finally {
    await client.end()
  }
}

export async function getTables(connectionString: string): Promise<Array<{ table_name: string; table_schema: string }>> {
  const client = new Client({ connectionString })

  try {
    await client.connect()

    const result = await client.query(`
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `)

    return result.rows
  } finally {
    await client.end()
  }
}
