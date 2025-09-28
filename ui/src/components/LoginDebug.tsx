import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function LoginDebug() {
  const { user, session, profile, isLoading, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev].slice(0, 20));
  };
  
  useEffect(() => {
    addLog(`isLoading: ${isLoading}, isAuth: ${isAuthenticated}, hasUser: ${!!user}, hasProfile: ${!!profile}`);
  }, [isLoading, isAuthenticated, user, profile]);
  
  const clearLogs = () => setLogs([]);
  
  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Debug Login</h3>
        <button 
          onClick={clearLogs}
          className="text-xs bg-gray-100 px-2 py-1 rounded"
        >
          Limpar
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>Loading:</strong> 
            <span className={isLoading ? "text-red-600" : "text-green-600"}>
              {isLoading ? " SIM" : " NÃO"}
            </span>
          </div>
          <div>
            <strong>Authenticated:</strong> 
            <span className={isAuthenticated ? "text-green-600" : "text-red-600"}>
              {isAuthenticated ? " SIM" : " NÃO"}
            </span>
          </div>
        </div>
        
        <div>
          <strong>User ID:</strong> {user?.id || "null"}
        </div>
        
        <div>
          <strong>Profile:</strong> {profile ? `${profile.email} (${profile.role})` : "null"}
        </div>
        
        <div>
          <strong>Session:</strong> {session ? "Ativa" : "null"}
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <h4 className="font-bold text-xs mb-2">Logs:</h4>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {logs.length === 0 && (
            <div className="text-gray-500 text-xs">Nenhum log ainda...</div>
          )}
          {logs.map((log, index) => (
            <div key={index} className="text-xs font-mono bg-gray-50 p-1 rounded">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}