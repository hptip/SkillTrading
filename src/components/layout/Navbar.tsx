import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Coins, BookOpen, ShoppingBag, LayoutDashboard, LogOut, User, Menu, X, Bell } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = user?.role === 'ADMIN'
    ? [{ to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }]
    : [
        { to: '/marketplace', label: 'Marketplace', icon: <ShoppingBag className="w-4 h-4" /> },
        { to: '/my-skills', label: 'My Skills', icon: <BookOpen className="w-4 h-4" /> },
        { to: '/bookings', label: 'Bookings', icon: <Bell className="w-4 h-4" /> },
      ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ST</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">SkillTrading</span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(link.to)
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* SKC Balance */}
                {user.role !== 'ADMIN' && (
                  <Link
                    to="/transactions"
                    className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-amber-100 transition-colors"
                  >
                    <Coins className="w-4 h-4" />
                    {user.skc.toFixed(0)} SKC
                  </Link>
                )}

                {/* Profile */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-violet-300 transition-all"
                  >
                    <Avatar src={user.avatar} name={user.fullName} size="sm" />
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 top-12 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-2 w-52">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="font-semibold text-gray-900 text-sm">{user.fullName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile menu toggle */}
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {user && menuOpen && (
          <div className="md:hidden py-3 border-t border-gray-100">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium',
                  isActive(link.to)
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            {user.role !== 'ADMIN' && (
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-sm font-semibold mt-1">
                <Coins className="w-4 h-4" />
                {user.skc.toFixed(0)} SKC
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
