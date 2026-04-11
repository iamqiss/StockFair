import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Icon from '@/components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useStokvel } from '@/context/StokvelContext';
import { TransactionItem } from '@/components/TransactionItem';
import { DepositModal } from '@/components/DepositModal';
import { WithdrawModal } from '@/components/WithdrawModal';
import { SendMoneyModal } from '@/components/SendMoneyModal';
import { RequestPaymentModal } from '@/components/RequestPaymentModal';

type Period = 'thisWeek' | 'thisMonth' | 'allTime';
type TxType = 'all' | 'contribution' | 'payout' | 'marketplace' | 'transfer';

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { transactions, userBalance, paymentRequests, respondToRequest } = useStokvel();
  const [period, setPeriod] = useState<Period>('thisMonth');
  const [filter, setFilter] = useState<TxType>('all');

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showRequest, setShowRequest] = useState(false);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const filtered = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;
    if (period === 'thisWeek') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'thisMonth') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      const inPeriod = !cutoff || d >= cutoff;
      const matchesType = filter === 'all' || tx.type === filter;
      return inPeriod && matchesType;
    });
  }, [transactions, period, filter]);

  const totalIn = filtered.filter((t) => ['payout', 'credit'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => !['payout', 'credit'].includes(t.type)).reduce((s, t) => s + t.amount, 0);

  const pendingRequests = paymentRequests.filter(r => r.status === 'pending' && r.toId === 'me');

  const periods: { key: Period; label: string }[] = [
    { key: 'thisWeek', label: t('thisWeek') },
    { key: 'thisMonth', label: t('thisMonth') },
    { key: 'allTime', label: t('allTime') },
  ];

  const filters: { key: TxType; label: string; icon: string; color: string }[] = [
    { key: 'all', label: 'All', icon: 'activity', color: colors.foreground },
    { key: 'contribution', label: 'Contributions', icon: 'arrow-up-right', color: colors.mutedForeground },
    { key: 'payout', label: 'Payouts', icon: 'arrow-down-left', color: colors.success },
    { key: 'transfer', label: 'Transfers', icon: 'send', color: '#3B82F6' },
    { key: 'marketplace', label: 'Market', icon: 'shopping-bag', color: colors.foreground },
  ];

  const quickActions = [
    { icon: 'send', label: 'Send', color: '#fff', bg: colors.foreground, textColor: colors.background, onPress: () => setShowSend(true) },
    { icon: 'arrow-down-circle', label: 'Request', color: '#3B82F6', bg: '#3B82F618', textColor: '#3B82F6', onPress: () => setShowRequest(true) },
    { icon: 'plus-circle', label: 'Deposit', color: '#16A34A', bg: '#16A34A18', textColor: '#16A34A', onPress: () => setShowDeposit(true) },
    { icon: 'minus-circle', label: 'Withdraw', color: '#F59E0B', bg: '#F59E0B18', textColor: '#F59E0B', onPress: () => setShowWithdraw(true) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#000000', '#111111']}
          style={[styles.header, { paddingTop: topPadding + 16 }]}
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Wallet</Text>
            <TouchableOpacity
              style={styles.autopayBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/payments/autopay' as any); }}
            >
              <Icon name="zap" size={14} color="#F59E0B" />
              <Text style={styles.autopayTxt}>Auto-Pay</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.balanceSummary, { backgroundColor: 'rgba(255,255,255,0.07)' }]}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>{t('balance')}</Text>
              <Text style={[styles.balanceValue, { color: '#FFFFFF' }]}>R {userBalance.toLocaleString('en-ZA')}</Text>
            </View>
            <View style={styles.balanceSep} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>In</Text>
              <Text style={[styles.balanceValue, { color: colors.success }]}>+R {totalIn.toLocaleString('en-ZA')}</Text>
            </View>
            <View style={styles.balanceSep} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Out</Text>
              <Text style={[styles.balanceValue, { color: colors.destructive }]}>-R {totalOut.toLocaleString('en-ZA')}</Text>
            </View>
          </View>

          <View style={styles.quickActions}>
            {quickActions.map(qa => (
              <TouchableOpacity
                key={qa.label}
                style={[styles.actionBtn, { backgroundColor: qa.bg }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); qa.onPress(); }}
                activeOpacity={0.7}
              >
                <Icon name={qa.icon as any} size={18} color={qa.color} />
                <Text style={[styles.actionLabel, { color: qa.textColor }]}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {pendingRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              Pending Requests ({pendingRequests.length})
            </Text>
            {pendingRequests.map(req => (
              <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.requestTop}>
                  <View style={[styles.requestAvatar, { backgroundColor: '#3B82F620' }]}>
                    <Text style={[styles.requestAvatarTxt, { color: '#3B82F6' }]}>
                      {req.fromName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.requestName, { color: colors.foreground }]}>{req.fromName}</Text>
                    {req.note ? <Text style={[styles.requestNote, { color: colors.mutedForeground }]}>{req.note}</Text> : null}
                  </View>
                  <Text style={[styles.requestAmt, { color: colors.foreground }]}>R {req.amount.toLocaleString()}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.reqBtn, { backgroundColor: colors.muted }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); respondToRequest(req.id, false); }}
                  >
                    <Text style={[styles.reqBtnTxt, { color: colors.mutedForeground }]}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reqBtn, { backgroundColor: '#16A34A' }]}
                    onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); respondToRequest(req.id, true); }}
                  >
                    <Text style={[styles.reqBtnTxt, { color: '#fff' }]}>Pay R {req.amount}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.filterSection}>
          <View style={[styles.periodSelector, { backgroundColor: colors.muted }]}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodBtn, period === p.key && { backgroundColor: colors.card }]}
                onPress={() => setPeriod(p.key)}
              >
                <Text style={[styles.periodText, { color: period === p.key ? colors.foreground : colors.mutedForeground }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilters}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.typeChip,
                {
                  backgroundColor: filter === f.key ? f.color + '15' : colors.card,
                  borderColor: filter === f.key ? f.color : colors.border,
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Icon name={f.icon as any} size={14} color={filter === f.key ? f.color : colors.mutedForeground} />
              <Text style={[styles.typeChipText, { color: filter === f.key ? f.color : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.txList, { backgroundColor: colors.card }]}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions found</Text>
            </View>
          ) : (
            filtered.map((tx) => <TransactionItem key={tx.id} transaction={tx} />)
          )}
        </View>
      </ScrollView>

      <SendMoneyModal visible={showSend} onClose={() => setShowSend(false)} colors={colors} />
      <RequestPaymentModal visible={showRequest} onClose={() => setShowRequest(false)} colors={colors} />
      <DepositModal visible={showDeposit} onClose={() => setShowDeposit(false)} />
      <WithdrawModal visible={showWithdraw} onClose={() => setShowWithdraw(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  autopayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  autopayTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  balanceSummary: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  balanceSep: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  requestsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  requestCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestAvatarTxt: {
    fontSize: 13,
    fontWeight: '700',
  },
  requestName: {
    fontSize: 13,
    fontWeight: '600',
  },
  requestNote: {
    fontSize: 11,
    marginTop: 2,
  },
  requestAmt: {
    fontSize: 15,
    fontWeight: '800',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reqBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  reqBtnTxt: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '500',
  },
  typeFilters: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  txList: {
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
  },
});
