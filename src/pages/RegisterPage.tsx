import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail, Lock, User, Gift } from 'lucide-react';

export const RegisterPage = () => {
  const [form, setForm] = useState({ email: '', password: '', fullName: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.fullName);
      navigate('/marketplace');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-linear-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">ST</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Tạo tài khoản</h1>
          <p className="text-gray-500 mt-1">Tham gia cộng đồng chia sẻ kỹ năng</p>
        </div>

        {/* Welcome bonus banner */}
        <div className="bg-linear-to-r from-violet-600 to-indigo-600 text-white rounded-2xl p-4 mb-6 flex items-center gap-3">
          <Gift className="w-8 h-8 shrink-0" />
          <div>
            <p className="font-semibold">Welcome Bonus!</p>
            <p className="text-sm text-violet-200">Get 100 SKC free when you register</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="Nguyen Van A"
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              icon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              icon={<Mail className="w-4 h-4" />}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              icon={<Lock className="w-4 h-4" />}
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
