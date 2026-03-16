import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Plane, Upload, LayoutDashboard, LogOut } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import UploadDetect from './pages/UploadDetect';
import Auth from './pages/Auth';

const Navbar = ({ onLogout }: { onLogout: () => void }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'History', icon: <LayoutDashboard size={18} /> },
    { path: '/upload', label: 'Upload Image', icon: <Upload size={18} /> }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="nav-brand">
          <Plane size={24} />
          DroneWatch AI
        </Link>
        <div className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          <button onClick={onLogout} className="nav-link text-danger btn-nav-logout flex items-center gap-2">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

function App() {
  const [token, setToken] = React.useState(localStorage.getItem('token') || '');

  const handleLogin = (name: string, newToken: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', name);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
  };

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-container">
        <Navbar onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadDetect />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
