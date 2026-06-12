import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi, transactionsApi } from '../lib/api';
import { Transaction } from '../types';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { statusBadge } from '../components/ui/Badge';
import { Coins, Edit, Lock, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect } from 'react';

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ fullName: user?.fullName || '', bio: user?.bio || '', avatar: user?.avatar || '' });
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);

  const fetchTransactions = async (page = 1) => {
    setTxLoading(true);
    try {
      const res = await transactionsApi.getMy({ page, limit: 10 });
      setTransactions(res.data.transactions);
      setTxTotal(res.data.totalPages);
      setTxPage(page);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await authApi.updateProfile(form);
      updateUser(res.data);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      await authApi.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      setPasswordError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getTransactionIcon = (_type: string, amount: number) => {
    if (amount > 0) return <ArrowUpCircle className="w-4 h-4 text-emerald-500" />;
    return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Personal Info</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  icon={<Edit className="w-4 h-4" />}
                >
                  {editMode ? 'Cancel' : 'Edit'}
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-start gap-4 mb-6">
                <Avatar src={user.avatar} name={user.fullName} size="xl" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{user.fullName}</h3>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                  <div className="mt-1">{statusBadge(user.status)}</div>
                </div>
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                  />
                  <Textarea
                    label="Bio"
                    value={form.bio}
                    onChange={e => setForm({ ...form, bio: e.target.value })}
                    rows={3}
                    placeholder="Tell others about yourself..."
                  />
                  <Input
                    label="Avatar URL"
                    value={form.avatar}
                    onChange={e => setForm({ ...form, avatar: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <Button onClick={handleSaveProfile} loading={saving}>Save Changes</Button>
                </div>
              ) : (
                <div>
                  {user.bio && <p className="text-gray-600">{user.bio}</p>}
                  {!user.bio && <p className="text-gray-400 italic text-sm">No bio added yet</p>}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5" /> Change Password
              </h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
                <Input
                  label="New Password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                {passwordSuccess && <p className="text-sm text-emerald-600">Password changed successfully!</p>}
                <Button onClick={handleChangePassword} loading={passwordLoading}>Update Password</Button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* SKC Balance */}
        <div className="space-y-4">
          <Card>
            <CardBody>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Coins className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-sm text-gray-500 mb-1">SKC Balance</p>
                <p className="text-4xl font-bold text-amber-600">{user.skc.toFixed(0)}</p>
                <p className="text-sm text-gray-400">Skill Coins</p>
              </div>
            </CardBody>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Transaction History</h3>
            </CardHeader>
            <CardBody className="p-0">
              {txLoading ? (
                <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
              ) : transactions.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No transactions yet</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {transactions.map(tx => (
                    <div key={tx.id} className="px-4 py-3 flex items-center gap-3">
                      {getTransactionIcon(tx.type, tx.amount)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">{tx.description}</p>
                        <p className="text-xs text-gray-400">{format(new Date(tx.createdAt), 'dd MMM, HH:mm')}</p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {txTotal > 1 && (
                <div className="flex justify-center gap-2 p-3 border-t border-gray-100">
                  <Button variant="ghost" size="sm" disabled={txPage === 1} onClick={() => fetchTransactions(txPage - 1)}>
                    Prev
                  </Button>
                  <span className="text-xs text-gray-500 flex items-center">
                    {txPage}/{txTotal}
                  </span>
                  <Button variant="ghost" size="sm" disabled={txPage === txTotal} onClick={() => fetchTransactions(txPage + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
