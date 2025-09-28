import React from 'react'
import { useAuth } from '../contexts/AuthContext'

interface AuthDebugProps {
  show?: boolean
}

const AuthDebug: React.FC<AuthDebugProps> = ({ show = false }) => {
  const { user, session, profile, isAuthenticated, isAdmin, isLoading } = useAuth()

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">🔍 Auth Debug</h4>
      <div className="space-y-1">
        <div>
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isLoading ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
          Loading: {isLoading ? 'true' : 'false'}
        </div>
        <div>
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></span>
          Authenticated: {isAuthenticated ? 'true' : 'false'}
        </div>
        <div>
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${user ? 'bg-green-500' : 'bg-gray-500'}`}></span>
          User: {user?.id ? user.id.slice(0, 8) : 'null'}
        </div>
        <div>
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${session ? 'bg-green-500' : 'bg-gray-500'}`}></span>
          Session: {session ? 'active' : 'null'}
        </div>
        <div>
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${profile ? 'bg-green-500' : 'bg-gray-500'}`}></span>
          Profile: {profile?.role || 'null'}
        </div>
        <div>
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isAdmin ? 'bg-blue-500' : 'bg-gray-500'}`}></span>
          Admin: {isAdmin ? 'true' : 'false'}
        </div>
        <div className="text-xs text-gray-300 mt-2">
          Email: {user?.email || profile?.email || 'N/A'}
        </div>
      </div>
    </div>
  )
}

export default AuthDebug