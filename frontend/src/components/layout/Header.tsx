import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

export function Header() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: '/editor', label: 'Editor' },
    { to: '/pixelart', label: 'Pixel Art' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition">
            PixelSprite
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive(link.to) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                {link.label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link to="/admin" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive('/admin') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                Admin
              </Link>
            )}
            <div className="w-px h-6 bg-gray-200 mx-2" />
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{user.username}</span>
                <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 transition">
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                  Entrar
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 pt-2">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={`block px-3 py-2 rounded-lg text-sm font-medium ${isActive(link.to) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}>
                {link.label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link to="/admin" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600">
                Admin
              </Link>
            )}
            <div className="border-t border-gray-100 mt-2 pt-2">
              {user ? (
                <>
                  <span className="block px-3 py-2 text-sm text-gray-500">{user.username}</span>
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full text-left px-3 py-2 text-sm text-gray-600">
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-600">Entrar</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-indigo-600">Registrarse</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
