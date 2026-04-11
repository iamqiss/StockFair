import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Switch,
} from 'react-native';
import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';
import { useStokvel } from '@/context/StokvelContext';

const AUTOPAY_KEY = '@stockfair_autopay';

type AutoPayEntry = {
  stokvelId: string;
  enabled: boolean;
  method: 'wallet' | 'eft';
};

export default function AutoPayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { stokvels, userBalance } = useStokvel();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [entries, setEntries] = useState<AutoPayEntry[]>([]);
  const [masterEnabled, setMasterEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTOPAY_KEY);
        const parsed: AutoPayEntry[] = raw ? JSON.parse(raw) : [];
        const existingIds = new Set(parsed.map(e => e.stokvelId));
        const reconciled = [
          ...parsed.filter(e => stokvels.some(s => s.id === e.stokvelId)),
          ...stokvels
            .filter(s => !existingIds.has(s.id))
            .map(s => ({ stokvelId: s.id, enabled: false, method: 'wallet' as const })),
        ];
        setEntries(reconciled);
        setMasterEnabled(reconciled.some(e => e.enabled));
      } catch {
        const initial = stokvels.map(s => ({ stokvelId: s.id, enabled: false, method: 'wallet' as const }));
        setEntries(initial);
      }
    })();
  }, [stokvels]);

  const persist = async (e: AutoPayEntry[]) => {
    await AsyncStorage.setItem(AUTOPAY_KEY, JSON.stringify(e));
  };

  const toggleEntry = (stokvelId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const up = entries.map(e =>
      e.stokvelId === stokvelId ? { ...e, enabled: !e.enabled } : e
    );
    setEntries(up);
    setMasterEnabled(up.some(e => e.enabled));
    persist(up);
  };

  const toggleMethod = (stokvelId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const up = entries.map(e =>
      e.stokvelId === stokvelId ? { ...e, method: e.method === 'wallet' ? 'eft' as const : 'wallet' as const } : e
    );
    setEntries(up);
    persist(up);
  };

  const toggleAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newState = !masterEnabled;
    const up = entries.map(e => ({ ...e, enabled: newState }));
    setEntries(up);
    setMasterEnabled(newState);
    persist(up);
  };

  const totalMonthly = entries
    .filter(e => e.enabled)
    .reduce((sum, e) => {
      const s = stokvels.find(s => s.id === e.stokvelId);
      return sum + (s?.contributionAmount || 0);
    }, 0);

  const freqLabel = (f: string) => {
    if (f === 'weekly') return 'Every week';
    if (f === 'biweekly') return 'Every 2 weeks';
    return 'Monthly';
  };

  const typeIcon = (type: string) => {
    const map: Record<string, string> = {
      rotation: 'refresh-cw', burial: 'shield', investment: 'trending-up',
      grocery: 'shopping-cart', social: 'users',
    };
    return map[type] || 'circle';
  };

  const typeColor = (type: string) => {
    const map: Record<string, string> = {
      rotation: '#3B82F6', burial: '#6B7280', investment: '#16A34A',
      grocery: '#F59E0B', social: '#8B5CF6',
    };
    return map[type] || colors.primary;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={[st.hero, { paddingTop: topPad + 8 }]}>
          <View style={st.headerRow}>
            <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
              <Icon name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={st.headerTitle}>Auto-Pay</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={st.heroContent}>
            <View style={[st.heroIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <Icon name="zap" size={28} color="#F59E0B" />
            </View>
            <Text style={st.heroTitle}>Never miss a payment</Text>
            <Text style={st.heroSub}>
              Auto-pay deducts your contribution automatically from your wallet on the due date.
            </Text>
          </View>
        </LinearGradient>

        <View style={st.body}>

          <Animated.View entering={FadeInDown.delay(0).springify()}>
            <View style={[st.masterCard, { backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[st.masterLabel, { color: colors.foreground }]}>Enable All Auto-Pay</Text>
                <Text style={[st.masterSub, { color: colors.mutedForeground }]}>
                  {entries.filter(e => e.enabled).length} of {entries.length} stokvels active
                </Text>
              </View>
              <Switch
                value={masterEnabled}
                onValueChange={toggleAll}
                trackColor={{ false: colors.muted, true: '#16A34A40' }}
                thumbColor={masterEnabled ? '#16A34A' : colors.border}
              />
            </View>
          </Animated.View>

          {totalMonthly > 0 && (
            <Animated.View entering={FadeInDown.delay(50).springify()}>
              <View style={[st.summaryCard, { backgroundColor: '#16A34A0F', borderColor: '#16A34A30' }]}>
                <Icon name="calendar" size={16} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={[st.summaryTitle, { color: '#16A34A' }]}>
                    R {totalMonthly.toLocaleString()} scheduled
                  </Text>
                  <Text style={[st.summarySub, { color: '#16A34A' + 'AA' }]}>
                    Wallet balance: R {userBalance.toLocaleString()}
                    {userBalance < totalMonthly ? ' — Top up recommended' : ''}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          <Text style={[st.sectionLabel, { color: colors.mutedForeground }]}>Your Stokvels</Text>

          {stokvels.map((s, i) => {
            const entry = entries.find(e => e.stokvelId === s.id);
            const enabled = entry?.enabled ?? false;
            const method = entry?.method ?? 'wallet';
            const tc = typeColor(s.type);

            return (
              <Animated.View key={s.id} entering={FadeInDown.delay(100 + i * 50).springify()}>
                <View style={[st.stokvelCard, { backgroundColor: colors.card, borderColor: enabled ? tc + '40' : colors.border }]}>
                  <View style={st.stokvelHeader}>
                    <View style={[st.stokvelIcon, { backgroundColor: tc + '18' }]}>
                      <Icon name={typeIcon(s.type) as any} size={16} color={tc} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.stokvelName, { color: colors.foreground }]}>{s.name}</Text>
                      <Text style={[st.stokvelType, { color: colors.mutedForeground }]}>
                        {s.type.charAt(0).toUpperCase() + s.type.slice(1)} · {freqLabel(s.frequency)}
                      </Text>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={() => toggleEntry(s.id)}
                      trackColor={{ false: colors.muted, true: tc + '40' }}
                      thumbColor={enabled ? tc : colors.border}
                    />
                  </View>

                  <View style={[st.stokvelDetails, { borderTopColor: colors.border }]}>
                    <View style={st.detailCol}>
                      <Text style={[st.detailLabel, { color: colors.mutedForeground }]}>Amount</Text>
                      <Text style={[st.detailValue, { color: colors.foreground }]}>R {s.contributionAmount.toLocaleString()}</Text>
                    </View>
                    <View style={st.detailCol}>
                      <Text style={[st.detailLabel, { color: colors.mutedForeground }]}>Next Due</Text>
                      <Text style={[st.detailValue, { color: colors.foreground }]}>{s.nextPayout}</Text>
                    </View>
                    <View style={st.detailCol}>
                      <Text style={[st.detailLabel, { color: colors.mutedForeground }]}>Method</Text>
                      <TouchableOpacity onPress={() => toggleMethod(s.id)} style={[st.methodChip, { backgroundColor: colors.background }]}>
                        <Icon name={method === 'wallet' ? 'wallet' : 'credit-card'} size={11} color={colors.foreground} />
                        <Text style={[st.methodTxt, { color: colors.foreground }]}>{method === 'wallet' ? 'Wallet' : 'EFT'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {enabled && (
                    <View style={[st.activeBar, { backgroundColor: tc + '0F' }]}>
                      <Icon name="check-circle" size={12} color={tc} />
                      <Text style={[st.activeBarTxt, { color: tc }]}>
                        Auto-pay active — will deduct on {s.nextPayout}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })}

          {userBalance < totalMonthly && totalMonthly > 0 && (
            <View style={[st.warningCard, { backgroundColor: '#F59E0B0F', borderColor: '#F59E0B30' }]}>
              <Icon name="alert-triangle" size={16} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[st.warningTitle, { color: '#F59E0B' }]}>Low wallet balance</Text>
                <Text style={[st.warningSub, { color: '#F59E0BAA' }]}>
                  You need R {(totalMonthly - userBalance).toLocaleString()} more to cover all scheduled payments.
                  Deposit funds to avoid missed payments.
                </Text>
              </View>
            </View>
          )}

          <View style={[st.infoCard, { backgroundColor: colors.muted }]}>
            <Icon name="info" size={14} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[st.infoTitle, { color: colors.foreground }]}>How Auto-Pay works</Text>
              <Text style={[st.infoTxt, { color: colors.mutedForeground }]}>
                On each due date, StockFair deducts your contribution from your selected payment method.
                If your wallet balance is insufficient, you'll receive a notification to top up.
                You can cancel auto-pay at any time with no penalties.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  hero:          { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:       { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: '#fff' },
  heroContent:   { alignItems: 'center', gap: 8, marginTop: 12 },
  heroIcon:      { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  heroTitle:     { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroSub:       { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 19, maxWidth: 300 },

  body:          { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  masterCard:    { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16 },
  masterLabel:   { fontSize: 15, fontWeight: '700' },
  masterSub:     { fontSize: 11, marginTop: 2 },

  summaryCard:   { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
  summaryTitle:  { fontSize: 14, fontWeight: '700' },
  summarySub:    { fontSize: 11, marginTop: 2 },

  sectionLabel:  { fontSize: 12, fontWeight: '600', marginTop: 4 },

  stokvelCard:   { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  stokvelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  stokvelIcon:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  stokvelName:   { fontSize: 14, fontWeight: '700' },
  stokvelType:   { fontSize: 11, marginTop: 2 },
  stokvelDetails:{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  detailCol:     { flex: 1, gap: 3 },
  detailLabel:   { fontSize: 10, fontWeight: '600' },
  detailValue:   { fontSize: 12, fontWeight: '700' },
  methodChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  methodTxt:     { fontSize: 11, fontWeight: '600' },
  activeBar:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  activeBarTxt:  { fontSize: 11, fontWeight: '600' },

  warningCard:   { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
  warningTitle:  { fontSize: 13, fontWeight: '700' },
  warningSub:    { fontSize: 11, lineHeight: 16, marginTop: 2 },

  infoCard:      { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, alignItems: 'flex-start' },
  infoTitle:     { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  infoTxt:       { fontSize: 11, lineHeight: 16 },
});
