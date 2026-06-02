import { useState, useEffect } from 'react';
import HostCreate from './components/HostCreate';
import GuestEntry from './components/GuestEntry';
import Feed from './components/Feed';

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = (newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
  };

  // Route dispatcher
  const renderRoute = () => {
    // 1. Join Gate route: /join/:inviteToken
    if (path.startsWith('/join/')) {
      const inviteToken = path.split('/')[2];
      if (!inviteToken) return <HostCreate navigate={navigate} />;
      return <GuestEntry inviteToken={inviteToken} navigate={navigate} />;
    }

    // 2. Feed route: /party/:inviteToken
    if (path.startsWith('/party/')) {
      const inviteToken = path.split('/')[2];
      if (!inviteToken) return <HostCreate navigate={navigate} />;
      return <Feed inviteToken={inviteToken} navigate={navigate} />;
    }

    // 3. Fallback: Host Creation View
    return <HostCreate navigate={navigate} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased text-slate-100 selection:bg-purple-500/30">
      {renderRoute()}
    </div>
  );
}

export default App;
