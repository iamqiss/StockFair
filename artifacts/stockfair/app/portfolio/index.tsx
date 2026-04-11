import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Dimensions,
} from 'react-native';
import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useStokvel, VEHICLE_META, InvestmentVehicle, Stokvel } from '@/context/StokvelContext';
import { DonutChart, DonutSlice } from '@/components/DonutChart';
import { PerformanceChart } from '@/components/PerformanceChart';

const { width: SW } = Dimensions.get('window');
const BANK_RATE = 5.0;
const TAX_THRESHOLD = 23800;

const VEHICLE_COLORS: Record<InvestmentVehicle, string> = {
  money_market: '#3B82F6',
  property:     '#F59E0B',
  jse_etf:      '#16A34A',
};

function generateMonthlyData(principal: number, monthly: number, members: number, rate: number, months: number) {
  const points: { month: string; value: number; bankValue: number }[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  if (months < 1) months = 1;

  const monthlyContrib = monthly * members;
  let poolVal = Math.max(principal - monthlyContrib * months, monthlyContrib);
  let bankVal = poolVal;

  for (let i = 0; i < months; i++) {
    const mDate = new Date(now);
    mDate.setMonth(mDate.getMonth() - (months - 1 - i));
    const label = `${monthNames[mDate.getMonth()]} '${String(mDate.getFullYear()).slice(2)}`;

    poolVal += monthlyContrib;
    poolVal *= 1 + rate / 100 / 12;
    bankVal += monthlyContrib;
    bankVal *= 1 + BANK_RATE / 100 / 12;

    points.push({ month: label, value: Math.round(poolVal), bankValue: Math.round(bankVal) });
  }
  return points;
}

function InvestmentStokvelCard({
  stokvel, colors, router,
}: { stokvel: Stokvel; colors: any; router: any }) {
  const cfg = stokvel.investmentConfig;
  const vehicle = (cfg?.vehicle ?? 'money_market') as InvestmentVehicle;
  const vm = VEHICLE_META[vehicle];
  const midReturn = (vm.minReturn + vm.maxReturn) / 2;
  const members = stokvel.members.length;
  const grossReturn = stokvel.totalSaved * (midReturn / 100);
  const netReturn = grossReturn * (1 - (cfg?.platformFeePercent ?? vm.platformFee) / 100);
  const perMember = netReturn / members;
  const vColor = VEHICLE_COLORS[vehicle];

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <TouchableOpacity
        style={[cs.card, { backgroundColor: colors.card }]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({ pathname: '/stokvel/invest', params: { id: stokvel.id } });
        }}
      >
        <View style={cs.topRow}>
          <View style={[cs.iconWrap, { backgroundColor: vColor + '18' }]}>
            <Icon name={vm.icon as any} size={18} color={vColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[cs.name, { color: colors.foreground }]} numberOfLines={1}>{stokvel.name}</Text>
            <Text style={[cs.vehicle, { color: colors.mutedForeground }]}>{vm.label}</Text>
          </View>
          <View style={[cs.returnBadge, { backgroundColor: vColor + '18' }]}>
            <Text style={[cs.returnTxt, { color: vColor }]}>{vm.minReturn}–{vm.maxReturn}%</Text>
          </View>
        </View>

        <View style={[cs.statsRow, { borderTopColor: colors.border }]}>
          {[
            { label: 'Pool Value', value: `R ${stokvel.totalSaved.toLocaleString('en-ZA')}`, color: colors.foreground },
            { label: 'Net Return (est.)', value: `R ${netReturn.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: '#16A34A' },
            { label: 'Your Share', value: `R ${perMember.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: '#16A34A' },
          ].map((stat) => (
            <View key={stat.label} style={cs.statCol}>
              <Text style={[cs.statVal, { color: stat.color }]}>{stat.value}</Text>
              <Text style={[cs.statLbl, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={cs.footRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="users" size={12} color={colors.mutedForeground} />
            <Text style={[cs.footTxt, { color: colors.mutedForeground }]}>{members} members</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[cs.footTxt, { color: vColor }]}>View Dashboard</Text>
            <Icon name="chevron-right" size={14} color={vColor} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const cs = StyleSheet.create({
  card:        { borderRadius: 16, padding: 16, gap: 12 },
  topRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:    { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  name:        { fontSize: 15, fontWeight: '700' },
  vehicle:     { fontSize: 11, marginTop: 2 },
  returnBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  returnTxt:   { fontSize: 11, fontWeight: '700' },
  statsRow:    { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  statCol:     { flex: 1, gap: 2 },
  statVal:     { fontSize: 14, fontWeight: '700' },
  statLbl:     { fontSize: 10 },
  footRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footTxt:     { fontSize: 11, fontWeight: '600' },
});

export default function PortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { stokvels } = useStokvel();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const investStokvels = stokvels.filter(s => s.type === 'investment');

  const portfolio = useMemo(() => {
    let totalValue = 0;
    let totalNetReturn = 0;
    let totalBankReturn = 0;
    let totalFees = 0;
    let totalPerMember = 0;
    const allocations: DonutSlice[] = [];

    investStokvels.forEach(s => {
      const cfg = s.investmentConfig;
      const vehicle = (cfg?.vehicle ?? 'money_market') as InvestmentVehicle;
      const vm = VEHICLE_META[vehicle];
      const midReturn = (vm.minReturn + vm.maxReturn) / 2;
      const members = s.members.length;

      const grossReturn = s.totalSaved * (midReturn / 100);
      const fee = grossReturn * ((cfg?.platformFeePercent ?? vm.platformFee) / 100);
      const net = grossReturn - fee;
      const bankEquiv = s.totalSaved * (BANK_RATE / 100);

      totalValue += s.totalSaved;
      totalNetReturn += net;
      totalBankReturn += bankEquiv;
      totalFees += fee;
      totalPerMember += net / members;

      const existingSlice = allocations.find(a => a.label === vm.label);
      if (existingSlice) {
        existingSlice.value += s.totalSaved;
      } else {
        allocations.push({
          label: vm.label,
          value: s.totalSaved,
          color: VEHICLE_COLORS[vehicle],
        });
      }
    });

    const extraGain = totalNetReturn - totalBankReturn;
    const weightedReturn = totalValue > 0
      ? investStokvels.reduce((acc, s) => {
          const vm = VEHICLE_META[(s.investmentConfig?.vehicle ?? 'money_market') as InvestmentVehicle];
          return acc + ((vm.minReturn + vm.maxReturn) / 2) * (s.totalSaved / totalValue);
        }, 0)
      : 0;

    return {
      totalValue, totalNetReturn, totalBankReturn, totalFees,
      totalPerMember, extraGain, weightedReturn, allocations,
    };
  }, [investStokvels]);

  const chartData = useMemo(() => {
    if (investStokvels.length === 0) return [];
    const totalMonthly = investStokvels.reduce((s, st) => s + st.contributionAmount * st.members.length, 0);
    const totalMembers = investStokvels.reduce((s, st) => s + st.members.length, 0);
    return generateMonthlyData(
      portfolio.totalValue,
      totalMonthly / totalMembers,
      totalMembers,
      portfolio.weightedReturn,
      11,
    );
  }, [investStokvels, portfolio]);

  const taxStatus = useMemo(() => {
    const perMember = portfolio.totalPerMember;
    const pct = Math.min(perMember / TAX_THRESHOLD, 1);
    const over = perMember > TAX_THRESHOLD;
    return { perMember, pct, over, taxable: Math.max(0, perMember - TAX_THRESHOLD) };
  }, [portfolio]);

  if (investStokvels.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Icon name="pie-chart" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 16 }}>No Investment Stokvels</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: 'center', marginTop: 8 }}>
          Join or create an investment stokvel to start building your portfolio.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.foreground, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 20 }}
          onPress={() => router.push('/(tabs)/discover')}
        >
          <Text style={{ color: colors.background, fontWeight: '700' }}>Discover Stokvels</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#0F172A', '#1E293B']} style={[s.hero, { paddingTop: topPad + 8 }]}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Icon name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Investment Portfolio</Text>
            <View style={{ width: 40 }} />
          </View>

          <Animated.View entering={FadeInDown.delay(0).springify()} style={s.heroContent}>
            <Text style={s.heroLabel}>Total Portfolio Value</Text>
            <Text style={s.heroBig}>R {portfolio.totalValue.toLocaleString('en-ZA')}</Text>

            <View style={s.heroStats}>
              {[
                { label: 'Net Returns', value: `R ${portfolio.totalNetReturn.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: '#4ADE80' },
                { label: 'vs Bank', value: `+R ${portfolio.extraGain.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: '#4ADE80' },
                { label: 'Avg Rate', value: `${portfolio.weightedReturn.toFixed(1)}% p.a.`, color: '#fff' },
              ].map((stat, i) => (
                <View key={stat.label} style={[s.heroStat, i > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.15)' }]}>
                  <Text style={[s.heroStatVal, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={s.heroStatLbl}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <View style={s.heroChips}>
            <View style={s.heroChip}>
              <Icon name="briefcase" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={s.heroChipTxt}>{investStokvels.length} stokvel{investStokvels.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={s.heroChip}>
              <Icon name="shield" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={s.heroChipTxt}>Fees: R {portfolio.totalFees.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.body}>

          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View style={[s.card, { backgroundColor: colors.card }]}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Portfolio Allocation</Text>
              <Text style={[s.cardSub, { color: colors.mutedForeground }]}>Distribution across investment vehicles</Text>
              <DonutChart data={portfolio.allocations} colors={colors} />
            </View>
          </Animated.View>

          {chartData.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <PerformanceChart data={chartData} colors={colors} />
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <View style={[s.card, { backgroundColor: colors.card }]}>
              <View style={s.taxHeaderRow}>
                <Text style={[s.cardTitle, { color: colors.foreground }]}>Tax Summary</Text>
                <View style={[s.taxBadge, { backgroundColor: taxStatus.over ? '#DC262618' : '#16A34A18' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: taxStatus.over ? '#DC2626' : '#16A34A' }}>
                    {taxStatus.over ? 'Declare to SARS' : 'Within Exemption'}
                  </Text>
                </View>
              </View>

              <View style={[s.taxGaugeTrack, { backgroundColor: colors.muted }]}>
                <View style={[s.taxGaugeFill, {
                  width: `${taxStatus.pct * 100}%`,
                  backgroundColor: taxStatus.over ? '#DC2626' : taxStatus.pct > 0.8 ? '#D97706' : '#16A34A',
                }]} />
              </View>
              <View style={s.taxRow}>
                <Text style={[s.taxLabel, { color: colors.mutedForeground }]}>Your est. interest</Text>
                <Text style={[s.taxVal, { color: colors.foreground }]}>
                  R {taxStatus.perMember.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={s.taxRow}>
                <Text style={[s.taxLabel, { color: colors.mutedForeground }]}>Tax-free limit</Text>
                <Text style={[s.taxVal, { color: '#16A34A' }]}>R {TAX_THRESHOLD.toLocaleString('en-ZA')}</Text>
              </View>
              {taxStatus.over && (
                <View style={[s.taxRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8 }]}>
                  <Text style={[s.taxLabel, { color: '#DC2626' }]}>Taxable amount</Text>
                  <Text style={[s.taxVal, { color: '#DC2626', fontWeight: '800' }]}>
                    R {taxStatus.taxable.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[s.taxBtn, { backgroundColor: colors.foreground }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (investStokvels.length > 0) {
                    router.push({ pathname: '/stokvel/tax', params: { id: investStokvels[0].id } });
                  }
                }}
              >
                <Icon name="file-text" size={16} color={colors.background} />
                <Text style={[s.taxBtnTxt, { color: colors.background }]}>View Full SARS Tax Report</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Your Investment Stokvels</Text>
          </Animated.View>
          {investStokvels.map(stokvel => (
            <InvestmentStokvelCard key={stokvel.id} stokvel={stokvel} colors={colors} router={router} />
          ))}

          <View style={[s.disclaimer, { backgroundColor: colors.muted }]}>
            <Icon name="info" size={13} color={colors.mutedForeground} />
            <Text style={[s.disclaimerTxt, { color: colors.mutedForeground }]}>
              All returns are estimates based on historical averages. Past performance does not guarantee future results. Not financial advice.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  hero:          { paddingHorizontal: 20, paddingBottom: 28, gap: 16 },
  headerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:       { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: '#fff' },
  heroContent:   { gap: 8, alignItems: 'center' },
  heroLabel:     { fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  heroBig:       { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  heroStats:     { flexDirection: 'row', width: '100%', marginTop: 4 },
  heroStat:      { flex: 1, alignItems: 'center', paddingHorizontal: 8, gap: 2 },
  heroStatVal:   { fontSize: 14, fontWeight: '800' },
  heroStatLbl:   { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  heroChips:     { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  heroChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroChipTxt:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  body:          { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  card:          { borderRadius: 16, padding: 16, gap: 12 },
  cardTitle:     { fontSize: 15, fontWeight: '700' },
  cardSub:       { fontSize: 12, marginTop: -6 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', marginTop: 4 },

  taxHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taxBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  taxGaugeTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  taxGaugeFill:  { height: 10, borderRadius: 5, minWidth: 4 },
  taxRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  taxLabel:      { fontSize: 12 },
  taxVal:        { fontSize: 13, fontWeight: '700' },
  taxBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, marginTop: 4 },
  taxBtnTxt:     { fontSize: 13, fontWeight: '700' },

  disclaimer:    { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, alignItems: 'flex-start' },
  disclaimerTxt: { flex: 1, fontSize: 11, lineHeight: 16 },
});
