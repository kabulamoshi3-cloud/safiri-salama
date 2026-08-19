/**
 * Wallet Page — balance, top-up, credits, transaction history
 */

import React, { useEffect, useState } from 'react';
import { Wallet, Plus, TrendingUp, TrendingDown, Gift } from 'lucide-react';
import api from '../services/api';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
}

interface WalletData {
  balance: number;
  pending_credits: number;
  transactions: Transaction[];
}

const TOPUP_AMOUNTS = [500, 1000, 2000, 5000];

const WalletPage: React.FC = () => {
  const [wallet,     setWallet]     = useState<WalletData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [topupAmt,   setTopupAmt]   = useState<number | ''>('');
  const [topping,    setTopping]    = useState(false);
  const [topupDone,  setTopupDone]  = useState(false);

  useEffect(() => { fetchWallet(); }, []);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await api.get('/wallet');
      setWallet(res.data);
    } catch {
      // use empty state
      setWallet({ balance: 0, pending_credits: 0, transactions: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!topupAmt || Number(topupAmt) < 100) return;
    setTopping(true);
    try {
      await api.post('/wallet/topup', { amount: topupAmt });
      setTopupDone(true);
      setTopupAmt('');
      await fetchWallet();
      setTimeout(() => setTopupDone(false), 3000);
    } catch {
      alert('Top-up failed. Please try again.');
    } finally {
      setTopping(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={20} />
          <span className="text-blue-100 text-sm font-semibold">Available Balance</span>
        </div>
        <p className="text-4xl font-black mb-4">Sh{wallet?.balance ?? 0}</p>
        {wallet?.pending_credits ? (
          <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-3 py-2 w-fit">
            <Gift size={14} />
            <span className="text-sm font-semibold">Sh{wallet.pending_credits} in rewards pending</span>
          </div>
        ) : null}
      </div>

      {/* Top-Up */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus size={18} className="text-blue-600" /> Top Up Wallet
        </h2>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {TOPUP_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => setTopupAmt(amt)}
              className={`py-2 rounded-lg text-sm font-bold border transition ${
                topupAmt === amt
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-gray-200 text-gray-700 hover:border-blue-400'
              }`}
            >
              Sh{amt}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Custom amount"
            value={topupAmt}
            onChange={(e) => setTopupAmt(e.target.value === '' ? '' : Number(e.target.value))}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
          />
          <button
            onClick={handleTopup}
            disabled={topping || !topupAmt}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-lg transition"
          >
            {topping ? '...' : 'Pay'}
          </button>
        </div>

        {topupDone && (
          <p className="text-green-600 text-sm font-semibold mt-3">✓ Wallet topped up successfully!</p>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4">Transaction History</h2>

        {wallet?.transactions?.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No transactions yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {(wallet?.transactions ?? []).map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.type === 'credit'
                      ? <TrendingUp size={16} className="text-green-600" />
                      : <TrendingDown size={16} className="text-red-600" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <p className={`font-bold text-sm ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'credit' ? '+' : '-'}Sh{tx.amount}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletPage;
