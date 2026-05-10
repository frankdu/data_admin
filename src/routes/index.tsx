import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [inputMode, setInputMode] = useState<'connectionString' | 'separateFields'>('connectionString')
  const [connectionString, setConnectionString] = useState('')
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [database, setDatabase] = useState('')
  const [rememberLogin, setRememberLogin] = useState(false)

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault()

    if (inputMode === 'connectionString') {
      console.log('Connecting with connection string:', connectionString)
      console.log('Remember login:', rememberLogin)
      // TODO: Implement connection logic with connection string
    } else {
      console.log('Connecting with separate fields:', { server, username, password, database })
      console.log('Remember login:', rememberLogin)
      // TODO: Implement connection logic with separate fields
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">Database Connection</h1>

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
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition-colors"
          >
            Connect
          </button>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberLogin"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
