function SimpleApp() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Sistema NFSe - Debug</h1>
      <p>Se você está vendo esta mensagem, o React está funcionando.</p>
      <ul>
        <li>API URL: {import.meta.env.VITE_API_URL || 'não definida'}</li>
        <li>Modo: {import.meta.env.MODE}</li>
        <li>Dev: {import.meta.env.DEV ? 'sim' : 'não'}</li>
      </ul>
    </div>
  );
}

export default SimpleApp;