import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function LoginDebug() {
  const { user, session, profile, isLoading, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [renderCount, setRenderCount] = useState(0);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev].slice(0, 30));
  };
  
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    addLog(`RENDER #${renderCount + 1} - Loading: ${isLoading}, Auth: ${isAuthenticated}, User: ${!!user}, Profile: ${!!profile}`);
  }, [isLoading, isAuthenticated, user, profile, renderCount]);
  
  useEffect(() => {
    if (user) {
      addLog(`USER DETAILS - ID: ${user.id}, Email: ${user.email}`);
    }
  }, [user]);
  
  useEffect(() => {
    if (profile) {
      addLog(`PROFILE DETAILS - Role: ${profile.role}, Email: ${profile.email}`);
    }
  }, [profile]);
  
  const clearLogs = () => setLogs([]);
  
  const forceStopLoading = () => {
    // @ts-ignore - Acesso direto ao contexto para debug
    if (window.location.hostname === 'localhost') {
      addLog('🚨 FORÇANDO FIM DO LOADING - EMERGÊNCIA');
      window.location.reload();
    }
  };
  
  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Debug Login</h3>
        <div className="flex gap-2">
          {isLoading && (
            <button 
              onClick={forceStopLoading}
              className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded"
            >
              🚨 Emergência
            </button>
          )}
          <button 
            onClick={clearLogs}
            className="text-xs bg-gray-100 px-2 py-1 rounded"
          >
            Limpar
          </button>
        </div>
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