import { useEffect, useState } from 'react';
import { depositsApi, uploadsApi } from '../../lib/api';
import { Button } from '../../components/ui/Button';

export const AdminDepositsPage = () => {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await depositsApi.list();
      setDeposits(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [qrFile, setQrFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [tierAmount, setTierAmount] = useState<number | ''>('');
  const [tierSkc, setTierSkc] = useState<number | ''>('');

  const handleCreateQr = async () => {
    if (!qrFile || !bankName) return alert('QR image and bank name required');
    try {
      const res = await uploadsApi.uploadImages([qrFile]);
      const url = res.data.urls?.[0];
      if (!url) return alert('Upload failed');
      await depositsApi.createQrConfig({ qrImageUrl: url, bankName, bankAccount, accountHolder, isActive: true });
      alert('QR config created');
    } catch (err) { console.error(err); alert('Failed to create QR config'); }
  };

  const handleCreateTier = async () => {
    if (!tierAmount || !tierSkc) return alert('Amount and SKC are required');
    try {
      await depositsApi.createTier({ amount: Number(tierAmount), skc: Number(tierSkc) });
      alert('Tier created');
    } catch (err) { console.error(err); alert('Failed to create tier'); }
  };

  useEffect(() => { fetch(); }, []);

  const handleApprove = async (id: number) => {
    await depositsApi.approve(id);
    fetch();
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason');
    if (!reason) return;
    await depositsApi.reject(id, reason);
    fetch();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manage Deposits</h1>
      <div className="rounded-xl border p-4 mb-4">
        <h2 className="font-semibold mb-2">Create QR config</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input type="file" accept="image/*" onChange={(e) => setQrFile(e.target.files?.[0] || null)} />
          <input className="border rounded px-2 py-1" placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          <input className="border rounded px-2 py-1" placeholder="Account number" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
        </div>
        <div className="mt-2 flex gap-2">
          <input className="border rounded px-2 py-1" placeholder="Account holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
          <Button onClick={handleCreateQr}>Create QR</Button>
        </div>
      </div>

      <div className="rounded-xl border p-4 mb-4">
        <h2 className="font-semibold mb-2">Create payment tier</h2>
        <div className="flex gap-2">
          <input className="border rounded px-2 py-1" placeholder="Amount (VND)" value={tierAmount as any} onChange={(e) => setTierAmount(Number(e.target.value) || '')} />
          <input className="border rounded px-2 py-1" placeholder="SKC" value={tierSkc as any} onChange={(e) => setTierSkc(Number(e.target.value) || '')} />
          <Button onClick={handleCreateTier}>Create Tier</Button>
        </div>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="space-y-3">
          {deposits.map(d => (
            <div key={d.id} className="border rounded-xl p-3 flex justify-between items-center">
              <div>
                <div className="font-semibold">{d.user?.fullName} — {d.amount}₫ → {d.skc} SKC</div>
                <div className="text-sm text-gray-600">{d.username} • {d.email} • {new Date(d.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                {d.status === 'PENDING' && <Button onClick={() => handleApprove(d.id)}>Approve</Button>}
                {d.status === 'PENDING' && <Button variant="danger" onClick={() => handleReject(d.id)}>Reject</Button>}
                {d.transferProofImage && <a href={d.transferProofImage} target="_blank" rel="noreferrer" className="text-sm text-violet-600">View proof</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDepositsPage;
