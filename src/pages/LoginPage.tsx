import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/marketplace');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-linear-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">ST</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Đăng nhập</h1>
          <p className="text-gray-500 mt-1">Chào mừng bạn quay lại SkillTrading</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-violet-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-2">🔑 Demo accounts:</p>
          <div className="space-y-1 text-xs text-amber-600">
            <p><strong>Admin:</strong> admin@skilltrading.com / admin123</p>
            <p><strong>User:</strong> alice@example.com / user123</p>
          </div>
        </div>
      </div>
    </div>
  );
};
