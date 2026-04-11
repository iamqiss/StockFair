import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Icon from '@/components/Icon';
import { useColors } from '@/hooks/useColors';
import { Transaction } from '@/context/StokvelContext';
import { useLanguage } from '@/context/LanguageContext';

type Props = { transaction: Transaction };

const TX_FEATHER: Record<string, string> = {
  contribution: 'arrow-up-right',
  payout:       'arrow-down-left',
  marketplace:  'shopping-bag',
  transfer:     'send',
  credit:       'plus-circle',
  debit:        'minus-circle',
  request:      'arrow-down-circle',
};

export function TransactionItem({ transaction: tx }: Props) {
  const colors = useColors();
  const { t }  = useLanguage();

  const isInflow   = ['payout', 'credit'].includes(tx.type);
  const iconColor  = isInflow ? colors.success : colors.mutedForeground;
  const amountColor = isInflow ? colors.success : colors.foreground;
  const amountSign = isInflow ? '+' : '−';

  const statusColors: Record<string, string> = {
    paid:    colors.success,
    pending: colors.mutedForeground,
    overdue: colors.destructive,
  };
  const statusLabels: Record<string, string> = {
    paid:    t('paid'),
    pending: t('pending'),
    overdue: t('overdue'),
  };
  const date = new Date(tx.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconBg, { backgroundColor: iconColor + '14' }]}>
        <Icon name={TX_FEATHER[tx.type] ?? 'activity'} size={18} color={iconColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.desc, { color: colors.foreground }]} numberOfLines={1}>
          {tx.description}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {tx.stokvelName ? `${tx.stokvelName} · ` : ''}{date}
        </Text>
      </View>
      <View style={styles.rightCol}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountSign}R {tx.amount.toLocaleString('en-ZA')}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: (statusColors[tx.status] ?? colors.grey) + '14' }]}>
          <Text style={[styles.statusText, { color: statusColors[tx.status] ?? colors.grey }]}>
            {statusLabels[tx.status]}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  desc: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  meta: {
    fontSize: 12,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
