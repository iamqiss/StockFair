import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Platform,
} from 'react-native';
import Icon from '@/components/Icon';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useStokvel, VEHICLE_META, InvestmentVehicle } from '@/context/StokvelContext';
import { PerformanceChart } from '@/components/PerformanceChart';

const { width: SW } = Dimensions.get('window');
const BANK_RATE     = 5.0;    // % — benchmark
const TAX_THRESHOLD = 23800;  // ZAR — per individual per year

/* ─── Mini bar chart ──────────────────────────────────── */
function MiniBar({ value, max, color, label, amount, colors }: {
  value: number; max: number; color: string; label: string; amount: string; colors: any;
}) {
  const pct = Math.min(value / Math.max(max, 1), 1);
  return (
    <View style={bar.wrap}>
      <Text style={[bar.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[bar.track, { backgroundColor: colors.muted }]}>
        <View style={[bar.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[bar.amount, { color }]}>{amount}</Text>
    </View>
  );
}
const bar = StyleSheet.create({
  wrap:   { gap: 4 },
  label:  { fontSize: 11, fontWeight: '600' },
  track:  { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill:   { height: 8, borderRadius: 4 },
  amount: { fontSize: 12, fontWeight: '700' },
});

/* ─── Tax threshold gauge ─────────────────────────────── */
function TaxGauge({ earned, perMember, threshold, colors }: {
  earned: number; perMember: number; threshold: number; colors: any;
}) {
  const pct      = Math.min(perMember / threshold, 1);
  const over     = perMember > threshold;
  const barColor = over ? '#DC2626' : pct > 0.8 ? '#D97706' : '#16A34A';

  return (
    <View style={[tg.card, { backgroundColor: colors.card }]}>
      <View style={tg.headerRow}>
        <Text style={[tg.title, { color: colors.foreground }]}>SARS Tax Threshold</Text>
        <View style={[tg.badge, { backgroundColor: barColor + '18' }]}>
          <Text style={[tg.badgeTxt, { color: barColor }]}>
            {over ? 'Above limit ⚠️' : `${Math.round(pct * 100)}% used`}
          </Text>
        </View>
      </View>
      <View style={[tg.track, { backgroundColor: colors.muted }]}>
        <View style={[tg.fill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
        <View style={[tg.marker, { left: '100%' }]} />
      </View>
      <View style={tg.labelsRow}>
        <Text style={[tg.labLabel, { color: colors.mutedForeground }]}>R 0</Text>
        <Text style={[tg.labLabel, { color: colors.mutedForeground }]}>R {threshold.toLocaleString('en-ZA')} (tax-free limit)</Text>
      </View>
      <View style={[tg.threshRow, { borderTopColor: colors.border }]}>
        <View style={tg.threshCol}>
          <Text style={[tg.threshVal, { color: colors.foreground }]}>R {perMember.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</Text>
          <Text style={[tg.threshLbl, { color: colors.mutedForeground }]}>Your est. interest</Text>
        </View>
        <View style={tg.threshCol}>
          <Text style={[tg.threshVal, { color: '#16A34A' }]}>R {threshold.toLocaleString('en-ZA')}</Text>
          <Text style={[tg.threshLbl, { color: colors.mutedForeground }]}>Section 10(1)(i)</Text>
        </View>
        <View style={tg.threshCol}>
          <Text style={[tg.threshVal, { color: over ? '#DC2626' : colors.mutedForeground }]}>
            {over ? `R ${(perMember - threshold).toLocaleString('en-ZA', { maximumFractionDigits: 0 })} taxable` : 'Within limit'}
          </Text>
          <Text style={[tg.threshLbl, { color: colors.mutedForeground }]}>SARS status</Text>
        </View>
      </View>
      {over && (
        <View style={[tg.warning, { backgroundColor: '#DC262612', borderColor: '#DC262630' }]}>
          <Icon name="alert-circle" size={13} color="#DC2626" />
          <Text style={[tg.warningTxt, { color: '#DC2626' }]}>
            You'll need to declare R {(perMember - threshold).toLocaleString('en-ZA', { maximumFractionDigits: 0 })} on your ITR12. Download the Tax Report.
          </Text>
        </View>
      )}
    </View>
  );
}
const tg = StyleSheet.create({
  card:      { borderRadius: 16, padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:     { fontSize: 14, fontWeight: '700' },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeTxt:  { fontSize: 11, fontWeight: '700' },
  track:     { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill:      { height: 12, borderRadius: 6, minWidth: 4 },
  marker:    { position: 'absolute', top: -2, width: 2, height: 16, backgroundColor: '#0A0A0A', borderRadius: 1 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  labLabel:  { fontSize: 10 },
  threshRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  threshCol: { flex: 1, gap: 2 },
  threshVal: { fontSize: 13, fontWeight: '700' },
  threshLbl: { fontSize: 10 },
  warning:   { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  warningTxt:{ flex: 1, fontSize: 11.5, lineHeight: 16 },
});

/* ─── Projection Calculator ───────────────────────────── */
const HORIZONS: { label: string; months: number }[] = [
  { label: '6M',  months: 6  },
  { label: '1Y',  months: 12 },
  { label: '2Y',  months: 24 },
  { label: '3Y',  months: 36 },
  { label: '5Y',  months: 60 },
];

function ProjectionCalculator({ principal, monthly, members, midReturn, vehicle, platformFee, colors }: {
  principal: number; monthly: number; members: number; midReturn: number;
  vehicle: string; platformFee: number; colors: any;
}) {
  const [selectedIdx, setSelectedIdx] = useState(1);
  const horizon = HORIZONS[selectedIdx];

  const data = useMemo(() => {
    return HORIZONS.map((h) => {
      const months      = h.months;
      const newContribs = monthly * members * months;
      const poolEnd     = principal + newContribs;
      const annualRate  = midReturn / 100;
      const grossReturn = poolEnd * annualRate * (months / 12);
      const net         = grossReturn * (1 - platformFee / 100);
      const bankReturn  = poolEnd * (BANK_RATE / 100) * (months / 12);
      const perMember   = net / members;
      return { label: h.label, months, newContribs, poolEnd, net, bankReturn, perMember };
    });
  }, [principal, monthly, members, midReturn, platformFee]);

  const sel   = data[selectedIdx];
  const max   = Math.max(...data.map(d => d.net));

  return (
    <View style={[pc.card, { backgroundColor: colors.card }]}>
      <View style={pc.headerRow}>
        <Text style={[pc.title, { color: colors.foreground }]}>Growth Projector</Text>
        <View style={[pc.vehicleBadge, { backgroundColor: '#16A34A18' }]}>
          <Icon name="cpu" size={10} color="#16A34A" />
          <Text style={[pc.vehicleTxt, { color: '#16A34A' }]}>{vehicle}</Text>
        </View>
      </View>
      <Text style={[pc.sub, { color: colors.mutedForeground }]}>
        Estimated group returns at different time horizons. Fees deducted from returns only.
      </Text>

      {/* Time horizon selector */}
      <View style={[pc.horizonRow, { backgroundColor: colors.muted }]}>
        {HORIZONS.map((h, i) => {
          const active = i === selectedIdx;
          return (
            <TouchableOpacity key={h.label}
              style={[pc.horizonBtn, active && { backgroundColor: '#16A34A' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedIdx(i); }}
            >
              <Text style={[pc.horizonTxt, { color: active ? '#fff' : colors.mutedForeground }]}>{h.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Mini bar chart */}
      <View style={pc.chartRow}>
        {data.map((d, i) => {
          const active = i === selectedIdx;
          const h      = max > 0 ? (d.net / max) * 80 : 4;
          return (
            <TouchableOpacity key={d.label} style={pc.barWrap} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedIdx(i); }}>
              <Text style={[pc.barLabel, { color: active ? '#16A34A' : colors.mutedForeground }]}>
                {d.net > 0 ? `R${Math.round(d.net / 1000)}k` : ''}
              </Text>
              <View style={[pc.bar, { height: Math.max(h, 6), backgroundColor: active ? '#16A34A' : colors.muted }]} />
              <Text style={[pc.barTime, { color: active ? colors.foreground : colors.mutedForeground }]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected horizon details */}
      <View style={[pc.detailCard, { backgroundColor: colors.background }]}>
        <Text style={[pc.detailTitle, { color: colors.mutedForeground }]}>At {horizon.label} ({horizon.months} months)</Text>
        {[
          { label: 'New contributions',   value: `R ${sel.newContribs.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: colors.foreground },
          { label: 'Projected pool size', value: `R ${sel.poolEnd.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`,     color: colors.foreground },
          { label: 'Est. net returns',    value: `R ${sel.net.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`,         color: '#16A34A' },
          { label: 'vs bank equivalent',  value: `+R ${Math.max(0, sel.net - sel.bankReturn).toLocaleString('en-ZA', { maximumFractionDigits: 0 })} extra`, color: '#16A34A' },
          { label: 'Your share (est.)',   value: `R ${sel.perMember.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`,   color: '#16A34A', bold: true },
        ].map((row, i) => (
          <View key={row.label} style={[pc.detailRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Text style={[pc.detailLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
            <Text style={[pc.detailValue, { color: row.color, fontWeight: (row as any).bold ? '800' : '600' }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={[pc.disclaimer, { backgroundColor: '#D9770610', borderColor: '#D9770640' }]}>
        <Icon name="info" size={12} color="#D97706" />
        <Text style={[pc.disclaimerTxt, { color: '#D97706' }]}>
          Projections assume consistent monthly contributions at the same rate. Not financial advice.
        </Text>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card:        { borderRadius: 16, padding: 16, gap: 12 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:       { fontSize: 15, fontWeight: '700' },
  vehicleBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  vehicleTxt:  { fontSize: 11, fontWeight: '600' },
  sub:         { fontSize: 12, lineHeight: 17, marginTop: -4 },
  horizonRow:  { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 2 },
  horizonBtn:  { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  horizonTxt:  { fontSize: 12, fontWeight: '700' },
  chartRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 },
  barWrap:     { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar:         { width: '100%', borderRadius: 5, minHeight: 6 },
  barLabel:    { fontSize: 9, fontWeight: '700' },
  barTime:     { fontSize: 10, fontWeight: '600' },
  detailCard:  { borderRadius: 12, overflow: 'hidden' },
  detailTitle: { fontSize: 11, fontWeight: '600', padding: 10, paddingBottom: 6 },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 9 },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 13 },
  disclaimer:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  disclaimerTxt: { flex: 1, fontSize: 11, lineHeight: 15 },
});

/* ═══════════════════════════════════════════════════════
   MAIN INVEST SCREEN
═══════════════════════════════════════════════════════ */
export default function InvestScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { stokvels } = useStokvel();

  const stokvel = stokvels.find((s) => s.id === id);
  const topPad  = Platform.OS === 'web' ? 67 : insets.top;

  if (!stokvel || stokvel.type !== 'investment') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.mutedForeground }}>Not an investment stokvel.</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: colors.primary, marginTop: 8 }}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const cfg      = stokvel.investmentConfig;
  const vehicle  = (cfg?.vehicle ?? 'money_market') as InvestmentVehicle;
  const vm       = VEHICLE_META[vehicle];
  const midReturn = (vm.minReturn + vm.maxReturn) / 2;

  /* ── Calculations ── */
  const principal      = stokvel.totalSaved;
  const members        = stokvel.members.length;
  const monthly        = stokvel.contributionAmount;
  const annualContrib  = monthly * members * 12;

  const grossReturn    = principal * (midReturn / 100);
  const platformFee    = grossReturn * ((cfg?.platformFeePercent ?? vm.platformFee) / 100);
  const netReturn      = grossReturn - platformFee;
  const bankEquiv      = principal * (BANK_RATE / 100);
  const extraGain      = netReturn - bankEquiv;
  const perMemberEarned = netReturn / members;

  const monthsActive   = Math.max(1, Math.round(
    (new Date().getTime() - new Date(stokvel.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
  ));
  const earnedToDate   = grossReturn * (monthsActive / 12);
  const feeToDate      = earnedToDate * ((cfg?.platformFeePercent ?? vm.platformFee) / 100);
  const netToDate      = earnedToDate - feeToDate;
  const perMemberToDate= netToDate / members;

  const vehicleColor   = '#16A34A';

  const monthlyData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const pts: { month: string; value: number; bankValue: number }[] = [];
    const totalMonths = Math.max(Math.min(monthsActive, 12), 2);
    const monthlyContrib = monthly * members;
    let pool = Math.max(principal - monthlyContrib * totalMonths, monthlyContrib);
    let bank = pool;
    for (let i = 0; i < totalMonths; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (totalMonths - 1 - i));
      pool += monthlyContrib;
      pool *= 1 + midReturn / 100 / 12;
      bank += monthlyContrib;
      bank *= 1 + 5 / 100 / 12;
      pts.push({
        month: `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
        value: Math.round(pool),
        bankValue: Math.round(bank),
      });
    }
    return pts;
  }, [principal, monthly, members, midReturn, monthsActive]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <LinearGradient colors={['#16A34A', '#166534']} style={[s.hero, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Icon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={s.heroLabel}>{stokvel.name}</Text>
          <Text style={s.heroSub}>Investment Dashboard</Text>

          <View style={s.heroVehicle}>
            <Icon name={vm.icon as any} size={14} color="rgba(255,255,255,0.7)" />
            <Text style={s.heroVehicleTxt}>{vm.label}</Text>
            <View style={s.heroRateBadge}>
              <Text style={s.heroRateTxt}>{vm.minReturn}–{vm.maxReturn}% p.a.</Text>
            </View>
          </View>

          <View style={s.heroStats}>
            {[
              { label: 'Pool Value',     value: `R ${principal.toLocaleString('en-ZA')}` },
              { label: 'Est. Net Return',value: `R ${netReturn.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` },
              { label: 'vs Bank Savings',value: `+R ${extraGain.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` },
            ].map((h, i) => (
              <View key={h.label} style={[s.heroStat, i > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={s.heroStatVal}>{h.value}</Text>
                <Text style={s.heroStatLbl}>{h.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* ── Return vs Bank ── */}
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Annual Return vs Bank</Text>
            <Text style={[s.cardSub, { color: colors.mutedForeground }]}>Based on {vm.minReturn}–{vm.maxReturn}% p.a. vs {BANK_RATE}% bank savings</Text>
            <View style={s.barsSection}>
              <MiniBar value={netReturn} max={netReturn} color={vehicleColor} label={`${vm.label} (net)`}
                amount={`R ${netReturn.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`} colors={colors} />
              <MiniBar value={bankEquiv} max={netReturn} color={colors.mutedForeground} label="Bank savings"
                amount={`R ${bankEquiv.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`} colors={colors} />
            </View>
            <View style={[s.gainBox, { backgroundColor: '#16A34A0F', borderColor: '#16A34A30' }]}>
              <Icon name="trending-up" size={16} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={[s.gainTitle, { color: '#16A34A' }]}>
                  You earn R {extraGain.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} more than a bank account
                </Text>
                <Text style={[s.gainSub, { color: '#16A34A' + 'AA' }]}>
                  That's {((extraGain / Math.max(bankEquiv, 1)) * 100).toFixed(0)}% extra on top of bank interest
                </Text>
              </View>
            </View>
          </View>

          {/* ── Performance Timeline ── */}
          {monthlyData.length > 0 && (
            <PerformanceChart data={monthlyData} colors={colors} accentColor={vehicleColor} />
          )}

          {/* ── Earnings to date ── */}
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Earnings to Date</Text>
            <Text style={[s.cardSub, { color: colors.mutedForeground }]}>{monthsActive} months of activity · Tax year running</Text>
            <View style={s.earningsGrid}>
              {[
                { label: 'Gross interest',      value: `R ${earnedToDate.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: colors.foreground },
                { label: 'Platform fees paid',  value: `−R ${feeToDate.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`,   color: '#DC2626' },
                { label: 'Net to members',      value: `R ${netToDate.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`,    color: '#16A34A' },
                { label: 'Your share (est.)',   value: `R ${perMemberToDate.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: '#16A34A' },
              ].map((row, i) => (
                <View key={row.label} style={[s.earningsRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <Text style={[s.earningsLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[s.earningsValue, { color: row.color }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Tax threshold ── */}
          <TaxGauge
            earned={netToDate} perMember={perMemberToDate}
            threshold={TAX_THRESHOLD} colors={colors}
          />

          {/* ── Platform fee card ── */}
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <View style={s.feeHeaderRow}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Platform Fee</Text>
              <View style={[s.feeBadge, { backgroundColor: colors.muted }]}>
                <Text style={[s.feeBadgeTxt, { color: colors.mutedForeground }]}>{cfg?.platformFeePercent ?? vm.platformFee}% of returns</Text>
              </View>
            </View>
            <Text style={[s.cardSub, { color: colors.mutedForeground }]}>
              Fees only apply to returns, never your principal. Used to maintain the platform, compliance, and reporting.
            </Text>
            <View style={[s.feeBreakdown, { backgroundColor: colors.muted }]}>
              {[
                { icon: 'server',     label: 'Platform infrastructure', pct: 40 },
                { icon: 'shield',     label: 'FICA/FSCA compliance',   pct: 30 },
                { icon: 'file-text',  label: 'Tax reporting & audits', pct: 20 },
                { icon: 'headphones', label: 'Support & operations',   pct: 10 },
              ].map((row) => (
                <View key={row.label} style={s.feeBreakdownRow}>
                  <Icon name={row.icon as any} size={13} color={colors.mutedForeground} />
                  <Text style={[s.feeBreakdownLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[s.feeBreakdownPct, { color: colors.foreground }]}>{row.pct}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Members interest breakdown ── */}
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Members — Interest Split</Text>
            <Text style={[s.cardSub, { color: colors.mutedForeground }]}>Estimated annual net interest per member</Text>
            {stokvel.members.map((m, i) => {
              const memberShare = perMemberEarned;
              const overThreshold = memberShare > TAX_THRESHOLD;
              return (
                <View key={m.id} style={[s.memberRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <View style={[s.memberAvatar, { backgroundColor: m.id === 'me' ? vehicleColor : colors.muted }]}>
                    <Text style={[s.memberInitial, { color: m.id === 'me' ? '#fff' : colors.mutedForeground }]}>
                      {m.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[s.memberName, { color: colors.foreground }]}>{m.name}{m.id === 'me' ? ' (You)' : ''}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.memberInterest, { color: '#16A34A' }]}>R {memberShare.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</Text>
                    {overThreshold && <Text style={[s.memberTaxFlag, { color: '#DC2626' }]}>SARS declaration needed</Text>}
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Projection Calculator ── */}
          <ProjectionCalculator
            principal={principal}
            monthly={monthly}
            members={members}
            midReturn={midReturn}
            vehicle={vm.label}
            platformFee={cfg?.platformFeePercent ?? vm.platformFee}
            colors={colors}
          />

          {/* ── Tax report CTA ── */}
          <TouchableOpacity
            style={[s.taxReportBtn, { backgroundColor: colors.foreground }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: '/stokvel/tax', params: { id } }); }}
          >
            <Icon name="file-text" size={18} color={colors.background} />
            <View style={{ flex: 1 }}>
              <Text style={[s.taxReportTitle, { color: colors.background }]}>SARS Tax Report</Text>
              <Text style={[s.taxReportSub, { color: colors.background + 'AA' }]}>ITR12-ready · Per member · 2025/2026 tax year</Text>
            </View>
            <Icon name="download" size={18} color={colors.background} />
          </TouchableOpacity>

          {/* ── Disclaimers ── */}
          <View style={[s.disclaimer, { backgroundColor: colors.muted }]}>
            <Text style={[s.disclaimerTxt, { color: colors.mutedForeground }]}>
              ⚠️ Projections are estimates only and not guaranteed. Past performance does not guarantee future results. StockFair is not a registered financial services provider under the FSCA. Please consult a licensed financial advisor before making investment decisions.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────── */
const s = StyleSheet.create({
  hero:          { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  backBtn:       { width: 40, height: 40, justifyContent: 'center', marginBottom: 4 },
  heroLabel:     { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroSub:       { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: -6 },
  heroVehicle:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroVehicleTxt:{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  heroRateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  heroRateTxt:   { fontSize: 12, color: '#fff', fontWeight: '700' },
  heroStats:     { flexDirection: 'row' },
  heroStat:      { flex: 1, paddingHorizontal: 12, gap: 2 },
  heroStatVal:   { fontSize: 17, fontWeight: '800', color: '#fff' },
  heroStatLbl:   { fontSize: 10, color: 'rgba(255,255,255,0.6)' },

  body:          { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  card:          { borderRadius: 16, padding: 16, gap: 12 },
  cardTitle:     { fontSize: 15, fontWeight: '700' },
  cardSub:       { fontSize: 12, lineHeight: 17, marginTop: -4 },

  barsSection:   { gap: 12 },
  gainBox:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  gainTitle:     { fontSize: 13, fontWeight: '700' },
  gainSub:       { fontSize: 11, marginTop: 2 },

  earningsGrid:  { gap: 0 },
  earningsRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  earningsLabel: { fontSize: 13 },
  earningsValue: { fontSize: 15, fontWeight: '700' },

  feeHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feeBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  feeBadgeTxt:   { fontSize: 11, fontWeight: '600' },
  feeBreakdown:  { borderRadius: 12, padding: 12, gap: 10 },
  feeBreakdownRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  feeBreakdownLabel:{ flex: 1, fontSize: 12 },
  feeBreakdownPct:{ fontSize: 12, fontWeight: '700' },

  memberRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  memberAvatar:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  memberInitial: { fontSize: 12, fontWeight: '700' },
  memberName:    { flex: 1, fontSize: 13, fontWeight: '500' },
  memberInterest:{ fontSize: 14, fontWeight: '700' },
  memberTaxFlag: { fontSize: 10, marginTop: 2 },

  taxReportBtn:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16 },
  taxReportTitle:{ fontSize: 15, fontWeight: '700' },
  taxReportSub:  { fontSize: 11, marginTop: 2 },

  disclaimer:    { borderRadius: 12, padding: 14 },
  disclaimerTxt: { fontSize: 11, lineHeight: 16 },
});
