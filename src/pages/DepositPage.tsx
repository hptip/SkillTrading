import { useEffect, useState } from 'react';
import { depositsApi, uploadsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';

export const DepositPage = () => {
  const { user, refreshUser } = useAuth();
  const [qr, setQr] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [username, setUsername] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [qrRes, tiersRes] = await Promise.all([depositsApi.getQrConfig(), depositsApi.getTiers()]);
        setQr(qrRes.data);
        setTiers(tiersRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, []);

  const handleUploadProof = async (file?: File) => {
    if (!file) return '';
    try {
      const res = await uploadsApi.uploadImages([file]);
      return res.data.urls?.[0] || '';
    } catch (err) {
      console.error(err);
      return '';
    }
  };

  const handleSubmit = async () => {
    setMessage('');
    setLoading(true);
    try {
      const proofUrl = proofFile ? await handleUploadProof(proofFile) : undefined;
      const payload: any = { username, email };
      if (selectedTier) payload.tierId = selectedTier;
      else if (amount) payload.amount = amount;
      if (proofUrl) payload.transferProofImage = proofUrl;

      await depositsApi.submit(payload);
      setMessage('Deposit submitted and pending admin approval.');
      await refreshUser();
    } catch (err: unknown) {
      setMessage((err as any)?.response?.data?.message || 'Failed to submit deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Nạp SKC</h1>

      {qr && (
        <div className="rounded-xl border p-4 flex gap-4 items-center">
          <img src={qr.qrImageUrl} alt="QR" className="w-40 h-40 object-contain" />
          <div>
            <div className="font-semibold">{qr.bankName}</div>
            <div className="text-sm text-gray-600">{qr.accountHolder}</div>
            <div className="text-sm text-gray-600">{qr.bankAccount}</div>
            {qr.description && <div className="text-sm text-gray-500 mt-2">{qr.description}</div>}
          </div>
        </div>
      )}

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Chọn gói nạp</h2>
        <div className="flex gap-2 flex-wrap">
          {tiers.map((t) => (
            <button key={t.id} type="button" onClick={() => { setSelectedTier(t.id); setAmount(undefined); }} className={`px-4 py-2 rounded-lg border ${selectedTier === t.id ? 'bg-violet-600 text-white' : 'bg-white'}`}>
              {t.amount}₫ → {t.skc} SKC
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="text-sm text-gray-700">Hoặc nhập số tiền (VNĐ)</label>
          <input value={amount ?? ''} onChange={(e) => { setAmount(Number(e.target.value)); setSelectedTier(null); }} placeholder="10000" className="w-full border rounded-lg px-3 py-2 mt-1" />
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <Input label="Tên người dùng" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <label className="text-sm font-medium">Ảnh/chứng từ chuyển khoản (tuỳ chọn)</label>
          <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="block mt-2" />
        </div>
        {message && <div className="text-sm text-gray-700">{message}</div>}
        <div className="flex gap-3">
          <Button onClick={handleSubmit} loading={loading}>Gửi thông tin nạp</Button>
        </div>
      </div>
    </div>
  );
};

export default DepositPage;
