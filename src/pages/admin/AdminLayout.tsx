import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Navbar } from '../../components/layout/Navbar';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { to: '/admin/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { to: '/admin/skills', label: 'Skills', icon: <BookOpen className="w-4 h-4" /> },
  { to: '/admin/bookings', label: 'Bookings', icon: <Calendar className="w-4 h-4" /> },
];

export const AdminLayout = () => {
  const location = useLocation();
  const isActive = (path: string) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600">
                <p className="text-white font-semibold text-sm">Admin Panel</p>
              </div>
              <nav className="p-2">
                {adminLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors',
                      isActive(link.to)
                        ? 'bg-violet-50 text-violet-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {link.icon}
                      {link.label}
                    </div>
                    {isActive(link.to) && <ChevronRight className="w-3.5 h-3.5" />}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
