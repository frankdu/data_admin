import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { connectDatabase, getDatabaseTables } from '../server/functions'

export const Route = createFileRoute('/')({ component: Home })

interface Table {
  table_name: string
  table_schema: string
}

function Home() {
  const [inputMode, setInputMode] = useState<'connectionString' | 'separateFields'>('connectionString')
  const [connectionString, setConnectionString] = useState('')
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [database, setDatabase] = useState('')
  const [rememberLogin, setRememberLogin] = useState(false)

  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [tables, setTables] = useState<Table[]>([])

  // Load session token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('sessionToken')
    if (savedToken) {
      setSessionToken(savedToken)
      loadTables(savedToken)
    }
  }, [])

  const loadTables = async (token: string) => {
    setIsLoadingTables(true)
    setError(null)

    try {
      const result = await getDatabaseTables({ data: { sessionToken: token } })

      if (result.success && result.tables) {
        setTables(result.tables)
      } else {
        setError(result.error || 'Failed to load tables')
        setSessionToken(null)
        localStorage.removeItem('sessionToken')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setSessionToken(null)
      localStorage.removeItem('sessionToken')
    } finally {
      setIsLoadingTables(false)
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsConnecting(true)
    setError(null)

    try {
      const connectionData = inputMode === 'connectionString'
        ? { mode: 'connectionString' as const, connectionString }
        : { mode: 'separateFields' as const, server, username, password, database }

      const result = await connectDatabase({ data: connectionData })

      if (result.success && result.sessionToken) {
        setSessionToken(result.sessionToken)

        // Save to localStorage if "Remember Login" is checked
        if (rememberLogin) {
          localStorage.setItem('sessionToken', result.sessionToken)
        }

        // Load tables
        await loadTables(result.sessionToken)
      } else {
        setError(result.error || 'Connection failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setSessionToken(null)
    setTables([])
    localStorage.removeItem('sessionToken')
    setConnectionString('')
    setServer('')
    setUsername('')
    setPassword('')
    setDatabase('')
  }

  // Show tables view if connected
  if (sessionToken && !isLoadingTables) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Database Tables</h1>
          <button
            onClick={handleDisconnect}
            className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
          >
            Disconnect
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {tables.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No tables found in the database.
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schema
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table Name
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tables.map((table, index) => (
                  <tr key={`${table.table_schema}.${table.table_name}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {table.table_schema}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {table.table_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // Show loading state
  if (isLoadingTables) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-gray-600">Loading tables...</div>
        </div>
      </div>
    )
  }

  // Show connection form
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">Database Connection</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setInputMode('connectionString')}
          className={`px-4 py-2 rounded ${
            inputMode === 'connectionString'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Connection String
        </button>
        <button
          onClick={() => setInputMode('separateFields')}
          className={`px-4 py-2 rounded ${
            inputMode === 'separateFields'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Separate Fields
        </button>
      </div>

      <form onSubmit={handleConnect} className="space-y-4">
        {inputMode === 'connectionString' ? (
          <div>
            <label htmlFor="connectionString" className="block text-sm font-medium mb-2">
              PostgreSQL Connection String
            </label>
            <input
              type="text"
              id="connectionString"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              placeholder="postgresql://username:password@host:port/database"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isConnecting}
            />
            <p className="mt-1 text-sm text-gray-500">
              Example: postgresql://user:pass@localhost:5432/mydb
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="server" className="block text-sm font-medium mb-2">
                Server
              </label>
              <input
                type="text"
                id="server"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="localhost:5432"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isConnecting}
              />
              <p className="mt-1 text-sm text-gray-500">
                Format: host:port (e.g., localhost:5432)
              </p>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="postgres"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isConnecting}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isConnecting}
              />
            </div>

            <div>
              <label htmlFor="database" className="block text-sm font-medium mb-2">
                Database
              </label>
              <input
                type="text"
                id="database"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="mydb"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isConnecting}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberLogin"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isConnecting}
            />
            <label htmlFor="rememberLogin" className="ml-2 text-sm font-medium">
              Remember Login
            </label>
          </div>
        </div>
      </form>
    </div>
  )
}
