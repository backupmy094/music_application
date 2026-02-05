import React, { useState } from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';
import MusicPlayer from './components/MusicPlayer';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showAdmin, setShowAdmin] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.reload();
  };

  return (
    <div className={`App ${theme === 'dark' ? 'dark-theme' : ''}`}>
      {!token ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <div className="app-layout">
          <header className="app-header">
            <div className="app-logo">
              <span className="logo-icon">🎵</span>
              <span className="logo-text">VIBE<span className="accent">SYNC</span></span>
            </div>
            <div className="header-actions">
              <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Theme">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <div className="user-info">
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setShowAdmin(!showAdmin)}
                    className={`admin-toggle-btn ${showAdmin ? 'active' : ''}`}
                    title="Toggle Admin Panel"
                  >
                    {showAdmin ? '🏠 Player' : '⚙️ Admin'}
                  </button>
                )}
                <span>👤 {user?.username}</span>
                <button onClick={handleLogout} className="logout-btn" title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </header>
          {showAdmin && user?.role === 'admin' ? (
            <AdminPanel user={user} token={token} onBack={() => setShowAdmin(false)} />
          ) : (
            <MusicPlayer user={user} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
