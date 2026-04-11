import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StokvelType      = 'rotation' | 'burial' | 'investment' | 'grocery' | 'social';
export type Frequency        = 'weekly' | 'biweekly' | 'monthly';
export type InvestmentVehicle = 'money_market' | 'property' | 'jse_etf';
export type RiskProfile       = 'low' | 'medium' | 'high';

export type InvestmentConfig = {
  vehicle:            InvestmentVehicle;
  riskProfile:        RiskProfile;
  targetReturnPercent: number;
  platformFeePercent:  number;
};

export const VEHICLE_META: Record<InvestmentVehicle, {
  label: string; icon: string; minReturn: number; maxReturn: number;
  riskLevel: RiskProfile; platformFee: number; description: string; minContrib: number;
}> = {
  money_market: {
    label: 'Money Market Fund', icon: 'trending-up',
    minReturn: 7, maxReturn: 9, riskLevel: 'low', platformFee: 0.5,
    description: 'Low-risk pooled fund. Beats bank savings by 2–4%. Capital preserved.',
    minContrib: 500,
  },
  property: {
    label: 'Property Stokvel', icon: 'home',
    minReturn: 8, maxReturn: 14, riskLevel: 'medium', platformFee: 1.0,
    description: 'Save for a rental property deposit. Returns via rental income + capital growth.',
    minContrib: 1000,
  },
  jse_etf: {
    label: 'JSE Top 40 ETF', icon: 'bar-chart-2',
    minReturn: 10, maxReturn: 15, riskLevel: 'high', platformFee: 0.75,
    description: 'Pooled JSE Top 40 shares. Historically 10–15% p.a. Market risk applies.',
    minContrib: 250,
  },
};

export type StokvelMember = {
  id: string;
  name: string;
  avatar?: string;
  position: number;
  totalPaid: number;
  lastPayment?: string;
};

/* ─── Chat types ─────────────────────────────────────── */
export type VoteChoice = 'yes' | 'no';

export type VoteItem = {
  id: string;
  product: string;
  description: string;
  totalPrice: number;
  retailer: string;
  /** Marketplace product IDs for visual display */
  itemIds?: string[];
  /** memberId → choice */
  votes: Record<string, VoteChoice>;
  /** How many yes votes needed to approve */
  requiredVotes: number;
  memberCount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  timestamp: string;
  type: 'text' | 'vote' | 'system' | 'voice' | 'product';
  vote?: VoteItem;
  voiceDuration?: number;
  /** For type === 'product': shared marketplace product id */
  productId?: string;
};

export type Stokvel = {
  id: string;
  name: string;
  type: StokvelType;
  contributionAmount: number;
  frequency: Frequency;
  members: StokvelMember[];
  maxMembers: number;
  currentPosition: number;
  nextPayout: string;
  totalSaved: number;
  createdAt: string;
  color: string;
  icon: string;
  photo?: string;
  investmentConfig?: InvestmentConfig;
};

export type Transaction = {
  id: string;
  stokvelId?: string;
  stokvelName?: string;
  type: 'contribution' | 'payout' | 'marketplace' | 'transfer' | 'request' | 'credit' | 'debit';
  amount: number;
  date: string;
  description: string;
  status: 'paid' | 'pending' | 'overdue';
  recipientName?: string;
  recipientId?: string;
  senderName?: string;
  senderId?: string;
  reference?: string;
  note?: string;
};

export type PaymentRequest = {
  id: string;
  fromName: string;
  fromId: string;
  toName: string;
  toId: string;
  amount: number;
  note: string;
  date: string;
  status: 'pending' | 'paid' | 'declined';
};

type StokvelContextType = {
  stokvels: Stokvel[];
  transactions: Transaction[];
  paymentRequests: PaymentRequest[];
  addStokvel: (s: Omit<Stokvel, 'id' | 'createdAt'>) => string;
  removeStokvel: (id: string) => void;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateStokvelPhoto: (id: string, uri: string) => void;
  depositFunds: (amount: number) => void;
  withdrawFunds: (amount: number) => void;
  sendFunds: (toName: string, toId: string, amount: number, note?: string) => string;
  addPaymentRequest: (req: Omit<PaymentRequest, 'id' | 'date' | 'status'>) => void;
  respondToRequest: (reqId: string, accept: boolean) => void;
  totalSavings: number;
  userBalance: number;
};

const StokvelContext = createContext<StokvelContextType>({
  stokvels: [],
  transactions: [],
  paymentRequests: [],
  addStokvel: () => '',
  removeStokvel: () => {},
  addTransaction: () => {},
  updateStokvelPhoto: () => {},
  depositFunds: () => {},
  withdrawFunds: () => {},
  sendFunds: () => '',
  addPaymentRequest: () => {},
  respondToRequest: () => {},
  totalSavings: 0,
  userBalance: 0,
});

const STOKVELS_KEY    = '@stockfair_stokvels';
const TRANSACTIONS_KEY = '@stockfair_transactions';

/* ─── Mock chat messages (keyed by stokvelId) ───────── */
const mkVote = (id: string, yesIds: string[], memberCount: number): VoteItem => ({
  id,
  product:      'May Bulk Grocery Order',
  description:  '10kg Maize Meal ×5 · Cooking Oil 5L ×4 · Long Grain Rice ×3 · Sugar 10kg ×2',
  totalPrice:   1806,
  retailer:     'Shoprite',
  itemIds:      ['p1', 'p2', 'p3', 'p4'],
  votes:        Object.fromEntries(yesIds.map((mid) => [mid, 'yes' as VoteChoice])),
  requiredVotes: Math.ceil(memberCount * 0.67),
  memberCount,
  status:       'pending',
  createdAt:    '2026-04-07T08:11:00',
});

export const MOCK_CHAT: Record<string, ChatMessage[]> = {
  '1': [
    { id: 'c1', senderId: 'm1', senderName: 'Thandi Dlamini',  type: 'text', timestamp: '2026-04-07T07:55:00', text: 'Morning sisi\'s! 🌅 May order planning time' },
    { id: 'c2', senderId: 'm2', senderName: 'Nomsa Khumalo',   type: 'text', timestamp: '2026-04-07T07:58:00', text: 'Yebo! Shoprite maize meal is R89 this week 🙌' },
    { id: 'c3', senderId: 'm3', senderName: 'Zanele Nkosi',    type: 'text', timestamp: '2026-04-07T08:02:00', text: 'I\'ve loaded 4 items into the group cart. Total R1,806' },
    { id: 'c4', senderId: 'me', senderName: 'You',             type: 'text', timestamp: '2026-04-07T08:04:00', text: 'That\'s within our pool 💪 let\'s vote!' },
    { id: 'c5', senderId: 'm3', senderName: 'Zanele Nkosi',    type: 'vote', timestamp: '2026-04-07T08:05:00', vote: mkVote('v1', ['m1', 'm2', 'm4', 'm5'], 6) },
    { id: 'c6', senderId: 'm4', senderName: 'Lindiwe Mokoena', type: 'text', timestamp: '2026-04-07T08:14:00', text: 'Voted YES 👍' },
    { id: 'c7', senderId: 'm5', senderName: 'Sipho Ndlovu',    type: 'text', timestamp: '2026-04-07T08:17:00', text: 'Yes from me! What\'s the pickup date?' },
    { id: 'c8', senderId: 'm1', senderName: 'Thandi Dlamini',  type: 'text',  timestamp: '2026-04-07T08:19:00', text: '1 May — remember your collection code 📋' },
    { id: 'c9', senderId: 'me', senderName: 'You',             type: 'text',  timestamp: '2026-04-07T08:21:00', text: 'Just need my vote to get us to approval! 🗳️' },
    { id: 'ca', senderId: 'm2', senderName: 'Nomsa Khumalo',   type: 'voice', timestamp: '2026-04-07T08:23:00', voiceDuration: 14 },
  ],
  '2': [
    { id: 'd1', senderId: 'm1', senderName: 'Bongani Zulu',       type: 'text', timestamp: '2026-04-01T09:00:00', text: 'Reminder: April contributions due TODAY 📢' },
    { id: 'd2', senderId: 'm2', senderName: 'Precious Sithole',   type: 'text', timestamp: '2026-04-01T09:05:00', text: 'Done ✅ EFT processed this morning' },
    { id: 'd3', senderId: 'me', senderName: 'You',                type: 'text', timestamp: '2026-04-01T09:07:00', text: 'Paid via auto-pay 🤖' },
    { id: 'd4', senderId: 'm4', senderName: 'Mandla Cele',        type: 'text', timestamp: '2026-04-01T10:30:00', text: 'Will pay by end of day, bank app acting up 🙄' },
    { id: 'd5', senderId: 'm1', senderName: 'Bongani Zulu',       type: 'text', timestamp: '2026-04-01T10:33:00', text: 'No stress, 3 days grace 👍' },
    { id: 'd6', senderId: 'm5', senderName: 'Ayanda Mthembu',    type: 'text', timestamp: '2026-04-01T11:00:00', text: 'When is the June payout, Bongani?' },
    { id: 'd7', senderId: 'm1', senderName: 'Bongani Zulu',       type: 'text', timestamp: '2026-04-01T11:05:00', text: 'June 1st — going to Precious (position #2). Her turn 🎉' },
    { id: 'd8', senderId: 'm2', senderName: 'Precious Sithole',   type: 'text', timestamp: '2026-04-01T11:07:00', text: '🙏🙏🙏 Can\'t wait!!' },
    { id: 'd9', senderId: 'me', senderName: 'You',                type: 'text', timestamp: '2026-04-01T11:10:00', text: 'Congratulations Precious! Big things coming 💪' },
  ],
  '5': [
    { id: 'f1', senderId: 'm1', senderName: 'Nandi Zulu',      type: 'text',   timestamp: '2026-04-06T09:00:00', text: 'Sizwe squad! Time to plan the April order 🛒' },
    { id: 'f2', senderId: 'm2', senderName: 'Lerato Dlamini',  type: 'text',   timestamp: '2026-04-06T09:04:00', text: 'Spar has sugar on special this week, R139 for 10kg' },
    { id: 'f3', senderId: 'me', senderName: 'You',             type: 'text',   timestamp: '2026-04-06T09:06:00', text: 'Nice! I\'ll add some items to the group cart now 🙌' },
    { id: 'f4', senderId: 'm3', senderName: 'Mpho Sithole',    type: 'text',   timestamp: '2026-04-06T09:10:00', text: 'Remember we also need washing powder' },
    { id: 'f5', senderId: 'm1', senderName: 'Nandi Zulu',      type: 'text',   timestamp: '2026-04-06T09:13:00', text: 'Checkers has it 20% off 💪 add it sis' },
  ],
  '3': [
    { id: 'e1', senderId: 'm1', senderName: 'Nokwanda Gumede', type: 'system', timestamp: '2026-04-01T08:00:00', text: 'Ntshingila Burial Society group created' },
    { id: 'e2', senderId: 'm1', senderName: 'Nokwanda Gumede', type: 'text',   timestamp: '2026-04-01T08:05:00', text: 'Good morning family. April statements sent to email 📧' },
    { id: 'e3', senderId: 'm2', senderName: 'Sandile Mkhize',  type: 'text',   timestamp: '2026-04-01T08:20:00', text: 'Thank you Nokwanda. EFT done.' },
    { id: 'e4', senderId: 'me', senderName: 'You',             type: 'text',   timestamp: '2026-04-01T08:22:00', text: 'Paid via auto-pay. See you at the AGM ✊' },
    { id: 'e5', senderId: 'm1', senderName: 'Nokwanda Gumede', type: 'text',   timestamp: '2026-04-01T08:30:00', text: 'AGM is 10 May, 10am. Please confirm attendance' },
  ],
};

/* ─── Sample data ────────────────────────────────────── */
const SAMPLE_STOKVELS: Stokvel[] = [
  {
    id: '1', name: "Mama's Kitchen Club", type: 'grocery',
    contributionAmount: 500, frequency: 'monthly',
    members: [
      { id: 'm1', name: 'Thandi Dlamini',  position: 1, totalPaid: 3000 },
      { id: 'm2', name: 'Nomsa Khumalo',   position: 2, totalPaid: 3000 },
      { id: 'm3', name: 'Zanele Nkosi',    position: 3, totalPaid: 2500 },
      { id: 'm4', name: 'Lindiwe Mokoena', position: 4, totalPaid: 2500 },
      { id: 'm5', name: 'Sipho Ndlovu',    position: 5, totalPaid: 2000 },
      { id: 'me', name: 'You',             position: 6, totalPaid: 1500 },
    ],
    maxMembers: 12, currentPosition: 6, nextPayout: '2026-05-01',
    totalSaved: 15000, createdAt: '2025-01-01', color: '#2C2C2C', icon: 'shopping-cart',
  },
  {
    id: '2', name: 'Ubuntu Savings Circle', type: 'rotation',
    contributionAmount: 1000, frequency: 'monthly',
    members: [
      { id: 'm1', name: 'Bongani Zulu',    position: 1, totalPaid: 5000 },
      { id: 'm2', name: 'Precious Sithole',position: 2, totalPaid: 5000 },
      { id: 'me', name: 'You',             position: 3, totalPaid: 3000 },
      { id: 'm4', name: 'Mandla Cele',     position: 4, totalPaid: 2000 },
      { id: 'm5', name: 'Ayanda Mthembu', position: 5, totalPaid: 1000 },
    ],
    maxMembers: 10, currentPosition: 3, nextPayout: '2026-06-01',
    totalSaved: 16000, createdAt: '2024-08-01', color: '#1A1A1A', icon: 'refresh-cw',
  },
  {
    id: '3', name: 'Ntshingila Burial Society', type: 'burial',
    contributionAmount: 200, frequency: 'monthly',
    members: [
      { id: 'm1', name: 'Nokwanda Gumede', position: 1, totalPaid: 2400 },
      { id: 'm2', name: 'Sandile Mkhize',  position: 2, totalPaid: 2400 },
      { id: 'me', name: 'You',             position: 3, totalPaid: 1200 },
    ],
    maxMembers: 20, currentPosition: 3, nextPayout: '2026-05-15',
    totalSaved: 6000, createdAt: '2024-01-01', color: '#3A3A3A', icon: 'heart',
  },
  {
    id: '5', name: 'Sizwe Grocery Circle', type: 'grocery',
    contributionAmount: 400, frequency: 'monthly',
    members: [
      { id: 'm1', name: 'Nandi Zulu',      position: 1, totalPaid: 2400 },
      { id: 'm2', name: 'Lerato Dlamini',  position: 2, totalPaid: 2400 },
      { id: 'me', name: 'You',             position: 3, totalPaid: 1600 },
      { id: 'm3', name: 'Mpho Sithole',    position: 4, totalPaid: 800 },
    ],
    maxMembers: 10, currentPosition: 3, nextPayout: '2026-05-15',
    totalSaved: 7200, createdAt: '2025-06-01', color: '#2C2C2C', icon: 'shopping-bag',
  },
  {
    id: '4', name: 'Vuka Investment Club', type: 'investment',
    contributionAmount: 1000, frequency: 'monthly',
    members: [
      { id: 'm1', name: 'Thabo Molefe',   position: 1, totalPaid: 12000 },
      { id: 'm2', name: 'Yolanda Dube',   position: 2, totalPaid: 12000 },
      { id: 'm3', name: 'Refilwe Sithole',position: 3, totalPaid: 10000 },
      { id: 'm4', name: 'Kagiso Mahlangu',position: 4, totalPaid: 8000 },
      { id: 'me', name: 'You',            position: 5, totalPaid: 6000 },
    ],
    maxMembers: 15, currentPosition: 1, nextPayout: '2026-12-31',
    totalSaved: 52400, createdAt: '2025-03-01', color: '#16A34A', icon: 'trending-up',
    investmentConfig: {
      vehicle: 'money_market',
      riskProfile: 'low',
      targetReturnPercent: 8.5,
      platformFeePercent: 0.5,
    },
  },
];

const SAMPLE_TRANSACTIONS: Transaction[] = [
  { id: 't1', stokvelId: '1', stokvelName: "Mama's Kitchen Club",     type: 'contribution', amount: 500,  date: '2026-04-01', description: 'Monthly contribution', status: 'paid' },
  { id: 't2', stokvelId: '2', stokvelName: 'Ubuntu Savings Circle',   type: 'contribution', amount: 1000, date: '2026-04-01', description: 'Monthly contribution', status: 'paid' },
  { id: 't3', stokvelId: '3', stokvelName: 'Ntshingila Burial Society',type: 'contribution', amount: 200,  date: '2026-04-01', description: 'Monthly contribution', status: 'paid' },
  { id: 't4', type: 'marketplace', amount: 2340, date: '2026-03-28', description: 'Shoprite Bulk Order', status: 'paid' },
  { id: 't5', stokvelId: '2', stokvelName: 'Ubuntu Savings Circle', type: 'payout', amount: 5000, date: '2026-03-01', description: 'Monthly payout to Bongani', status: 'paid' },
  { id: 't6', stokvelId: '1', stokvelName: "Mama's Kitchen Club",   type: 'contribution', amount: 500, date: '2026-05-01', description: 'Monthly contribution due', status: 'pending' },
];

const REQUESTS_KEY = '@stockfair_payment_requests';

export function StokvelProvider({ children }: { children: React.ReactNode }) {
  const [stokvels, setStokvels]         = useState<Stokvel[]>(SAMPLE_STOKVELS);
  const [transactions, setTransactions] = useState<Transaction[]>(SAMPLE_TRANSACTIONS);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [sv, tx, reqs] = await Promise.all([
          AsyncStorage.getItem(STOKVELS_KEY),
          AsyncStorage.getItem(TRANSACTIONS_KEY),
          AsyncStorage.getItem(REQUESTS_KEY),
        ]);
        if (sv) setStokvels(JSON.parse(sv));
        if (tx) setTransactions(JSON.parse(tx));
        if (reqs) setPaymentRequests(JSON.parse(reqs));
      } catch {}
    })();
  }, []);

  const persist = async (sv: Stokvel[], tx: Transaction[]) => {
    await AsyncStorage.multiSet([
      [STOKVELS_KEY,     JSON.stringify(sv)],
      [TRANSACTIONS_KEY, JSON.stringify(tx)],
    ]);
  };

  const addStokvel = (s: Omit<Stokvel, 'id' | 'createdAt'>): string => {
    const n = { ...s, id: Date.now().toString(), createdAt: new Date().toISOString() };
    const up = [...stokvels, n];
    setStokvels(up);
    persist(up, transactions);
    return n.id;
  };

  const removeStokvel = (id: string) => {
    const up = stokvels.filter((s) => s.id !== id);
    setStokvels(up);
    persist(up, transactions);
  };

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const n = { ...tx, id: Date.now().toString() };
    const up = [n, ...transactions];
    setTransactions(up);
    persist(stokvels, up);
  };

  const updateStokvelPhoto = (id: string, uri: string) => {
    const up = stokvels.map((s) => s.id === id ? { ...s, photo: uri } : s);
    setStokvels(up);
    persist(up, transactions);
  };

  const [walletBalance, setWalletBalance] = useState(4750);

  const depositFunds = (amount: number) => {
    setWalletBalance((b) => b + amount);
    addTransaction({ type: 'credit', amount, description: 'Deposit', date: new Date().toISOString(), status: 'paid' });
  };

  const withdrawFunds = (amount: number) => {
    setWalletBalance((b) => Math.max(0, b - amount));
    addTransaction({ type: 'debit', amount, description: 'Withdrawal', date: new Date().toISOString(), status: 'paid' });
  };

  const sendFunds = (toName: string, toId: string, amount: number, note?: string): string => {
    if (amount <= 0 || amount > walletBalance) return '';
    const ref = `SF-${Date.now().toString(36).toUpperCase()}`;
    setWalletBalance((b) => b - amount);
    addTransaction({
      type: 'transfer',
      amount,
      description: `Sent to ${toName}`,
      date: new Date().toISOString(),
      status: 'paid',
      recipientName: toName,
      recipientId: toId,
      reference: ref,
      note,
    });
    return ref;
  };

  const persistRequests = async (reqs: PaymentRequest[]) => {
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(reqs));
  };

  const addPaymentRequest = (req: Omit<PaymentRequest, 'id' | 'date' | 'status'>) => {
    const newReq: PaymentRequest = {
      ...req,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      status: 'pending',
    };
    const up = [newReq, ...paymentRequests];
    setPaymentRequests(up);
    persistRequests(up);
  };

  const respondToRequest = (reqId: string, accept: boolean) => {
    setPaymentRequests(prev => {
      const target = prev.find(r => r.id === reqId);
      if (!target || target.status !== 'pending') return prev;
      if (accept && target.amount > walletBalance) return prev;
      if (accept) {
        setWalletBalance((b) => b - target.amount);
        addTransaction({
          type: 'transfer',
          amount: target.amount,
          description: `Paid request from ${target.fromName}`,
          date: new Date().toISOString(),
          status: 'paid',
          recipientName: target.fromName,
          recipientId: target.fromId,
          reference: `SF-REQ-${target.id.slice(-6)}`,
          note: target.note,
        });
      }
      const up = prev.map(r =>
        r.id === reqId ? { ...r, status: accept ? 'paid' as const : 'declined' as const } : r
      );
      persistRequests(up);
      return up;
    });
  };

  const totalSavings = stokvels.reduce((sum, s) => sum + s.totalSaved, 0);
  const userBalance  = walletBalance;

  return (
    <StokvelContext.Provider value={{
      stokvels, transactions, paymentRequests,
      addStokvel, removeStokvel, addTransaction, updateStokvelPhoto,
      depositFunds, withdrawFunds, sendFunds,
      addPaymentRequest, respondToRequest,
      totalSavings, userBalance,
    }}>
      {children}
    </StokvelContext.Provider>
  );
}

export function useStokvel() { return useContext(StokvelContext); }
