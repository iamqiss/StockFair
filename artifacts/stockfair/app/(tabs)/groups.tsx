import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Modal, TextInput, KeyboardAvoidingView, Dimensions,
  Share, Animated,
} from 'react-native';
import Icon from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import {
  useStokvel, StokvelType, Frequency,
  InvestmentVehicle, RiskProfile, VEHICLE_META,
} from '@/context/StokvelContext';
import { StokvelCard } from '@/components/StokvelCard';

const { width: SW } = Dimensions.get('window');

/* ─── Config ──────────────────────────────────────────── */
const TYPE_OPTIONS: { value: StokvelType; icon: string; label: string; desc: string; color: string }[] = [
  { value: 'rotation',   icon: 'refresh-cw',    label: 'Rotation',   desc: 'Rotating cash payouts',       color: '#1A1A1A' },
  { value: 'burial',     icon: 'heart',         label: 'Burial',     desc: 'Funeral cover & support',      color: '#3A3A3A' },
  { value: 'investment', icon: 'trending-up',   label: 'Investment', desc: 'Wealth building together',     color: '#16A34A' },
  { value: 'grocery',    icon: 'shopping-cart', label: 'Grocery',    desc: 'Bulk buying power',            color: '#2C2C2C' },
  { value: 'social',     icon: 'users',         label: 'Social',     desc: 'Events & celebrations',        color: '#4A4A4A' },
];

const RISK_META: Record<RiskProfile, { label: string; color: string }> = {
  low:    { label: 'Low Risk',    color: '#16A34A' },
  medium: { label: 'Medium Risk', color: '#D97706' },
  high:   { label: 'High Risk',   color: '#DC2626' },
};

const BANK_RATE = 5;

function generateInviteCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = (clean + 'AAA').slice(0, 3);
  const nums   = Math.floor(100 + Math.random() * 900).toString();
  return prefix + nums;
}

function fakeQrGrid(code: string): boolean[][] {
  return Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => {
      if ((r < 2 && c < 2) || (r < 2 && c >= 5) || (r >= 5 && c < 2)) return true;
      const idx = r * 7 + c;
      return (code.charCodeAt(idx % code.length) + r * 3 + c) % 3 !== 0;
    })
  );
}

/* ─── Helper UI ───────────────────────────────────────── */
function SLabel({ text, colors }: { text: string; colors: any }) {
  return <Text style={[ms.label, { color: colors.mutedForeground }]}>{text}</Text>;
}
function FieldInput({ value, onChange, placeholder, keyboardType, multiline, colors }: any) {
  return (
    <TextInput
      style={[ms.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }, multiline && { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
      value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground} keyboardType={keyboardType ?? 'default'}
      multiline={multiline}
    />
  );
}
function StepDots({ current, total, colors }: { current: number; total: number; colors: any }) {
  return (
    <View style={ms.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[ms.dot, {
          backgroundColor: i === current ? colors.primary : i < current ? colors.primary + '50' : colors.muted,
          width: i === current ? 20 : 8,
        }]} />
      ))}
    </View>
  );
}

/* ══════════════════════════════════════════════════════
   CREATION WIZARD — full multi-step
══════════════════════════════════════════════════════ */
function CreateModal({ visible, onClose, onDone, colors }: {
  visible: boolean; onClose: () => void;
  onDone: (data: any) => string;
  colors: any;
}) {
  const router = useRouter();
  const [step, setStep]                 = useState(0);
  const [showSuccess, setShowSuccess]   = useState(false);
  const [createdId, setCreatedId]       = useState('');
  const [inviteCode, setInviteCode]     = useState('');
  const [codeCopied, setCodeCopied]     = useState(false);

  /* Step 0 */
  const [name, setName]   = useState('');
  const [type, setType]   = useState<StokvelType>('rotation');
  const [desc, setDesc]   = useState('');

  /* Step 1 */
  const [amount,   setAmount]   = useState('');
  const [maxMem,   setMaxMem]   = useState('10');
  const [freq,     setFreq]     = useState<Frequency>('monthly');

  /* Step 2 — Rules (non-invest) */
  const [penaltyPct,       setPenaltyPct]       = useState(5);
  const [graceDays,        setGraceDays]        = useState(3);
  const [maxLatePayments,  setMaxLatePayments]  = useState(3);

  /* Step 2 — Investment vehicle */
  const [vehicle, setVehicle] = useState<InvestmentVehicle>('money_market');
  const [risk,    setRisk]    = useState<RiskProfile>('low');

  /* Step 3 — Fees/Tax ack (invest only) */
  const [feeAck, setFeeAck] = useState(false);
  const [taxAck, setTaxAck] = useState(false);

  /* Constitution step */
  const [constAck, setConstAck] = useState(false);

  /* Derived */
  const isInvestment = type === 'investment';
  const vm = VEHICLE_META[vehicle];
  const monthly = parseFloat(amount) || 0;
  const members = parseInt(maxMem) || 10;
  const pool    = monthly * members;
  const midReturn   = (vm.minReturn + vm.maxReturn) / 2;
  const estReturn   = pool * 12 * (midReturn / 100);
  const platformFee = estReturn * (vm.platformFee / 100);
  const net         = estReturn - platformFee;
  const bankEquiv   = pool * 12 * (BANK_RATE / 100);
  const gain        = net - bankEquiv;

  /* Steps: non-invest 4 steps | invest 5 steps */
  const totalSteps = isInvestment ? 5 : 4;
  const stepTitles = isInvestment
    ? ['Group Identity', 'Contributions', 'Investment Vehicle', 'Fees & Tax', 'Constitution']
    : ['Group Identity', 'Contributions', 'Group Rules',        'Constitution'];

  /* Constitution rule step index */
  const rulesStep       = isInvestment ? -1 : 2;
  const vehicleStep     = isInvestment ? 2  : -1;
  const feeStep         = isInvestment ? 3  : -1;
  const constitutionStep = isInvestment ? 4  : 3;

  /* Success animation */
  const checkScale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (showSuccess) {
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
    } else {
      checkScale.setValue(0);
    }
  }, [showSuccess]);

  function reset() {
    setStep(0); setShowSuccess(false); setCreatedId(''); setInviteCode('');
    setName(''); setType('rotation'); setDesc(''); setAmount('');
    setMaxMem('10'); setFreq('monthly'); setPenaltyPct(5); setGraceDays(3);
    setMaxLatePayments(3); setVehicle('money_market'); setRisk('low');
    setFeeAck(false); setTaxAck(false); setConstAck(false); setCodeCopied(false);
  }
  function handleClose() { reset(); onClose(); }
  function handleNext()  { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep((s) => s + 1); }
  function handleBack()  {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0) { handleClose(); return; }
    setStep((s) => s - 1);
  }

  function handleCreate() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const code = generateInviteCode(name);
    const typeInfo = TYPE_OPTIONS.find(t => t.value === type)!;
    const id = onDone({
      name, type, contributionAmount: parseFloat(amount), frequency: freq,
      maxMembers: parseInt(maxMem) || 10,
      color: typeInfo.color, icon: typeInfo.icon,
      investmentConfig: isInvestment ? {
        vehicle, riskProfile: risk,
        targetReturnPercent: (vm.minReturn + vm.maxReturn) / 2,
        platformFeePercent: vm.platformFee,
      } : undefined,
    });
    setCreatedId(id);
    setInviteCode(code);
    setShowSuccess(true);
  }

  function handleCopyCode() {
    Share.share({ message: `Join my stokvel "${name}" on StockFair!\n\nInvite Code: ${inviteCode}\n\nDownload: https://stockfair.app` });
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  function handleViewGroup() {
    handleClose();
    router.push(`/stokvel/${createdId}`);
  }

  /* Validation */
  const canNext0 = name.trim().length >= 2;
  const canNext1 = !!amount && parseFloat(amount) > 0 && (!isInvestment || parseFloat(amount) >= vm.minContrib);
  const canNext2 = true;
  const canNext3 = isInvestment ? (feeAck && taxAck) : true;
  const canCreate = constAck;

  const canNextForStep: Record<number, boolean> = {
    0: canNext0,
    1: canNext1,
    2: canNext2,
    3: canNext3,
    4: canCreate,
  };

  const canProceed = step < constitutionStep ? (canNextForStep[step] ?? true) : canCreate;

  /* Constitution text generation */
  const constitutionText = [
    `STOKVEL CONSTITUTION`,
    `Group Name: ${name || '—'}`,
    `Type: ${TYPE_OPTIONS.find(t => t.value === type)?.label}`,
    `Contribution: R ${amount || '0'} ${freq}`,
    `Maximum Members: ${maxMem}`,
    ...(isInvestment ? [
      `Investment Vehicle: ${vm.label}`,
      `Target Return: ${vm.minReturn}–${vm.maxReturn}% p.a.`,
      `Platform Fee: ${vm.platformFee}% of returns only`,
    ] : [
      `Late Penalty: ${penaltyPct}% of contribution`,
      `Grace Period: ${graceDays} day${graceDays > 1 ? 's' : ''} after due date`,
      `Max Late Payments Before Review: ${maxLatePayments}`,
    ]),
    ``,
    `OBLIGATIONS`,
    `1. All members must contribute the agreed amount by the due date each ${freq === 'weekly' ? 'week' : freq === 'biweekly' ? 'fortnight' : 'month'}.`,
    `2. Late contributions attract a ${isInvestment ? '5%' : penaltyPct + '%'} penalty after the grace period.`,
    `3. Members must notify the chairperson of any payment difficulty within 24 hours of the due date.`,
    `4. Disputes must first be resolved within the group before escalation.`,
    ``,
    `PAYOUT`,
    `5. Payouts are issued according to the agreed rotation schedule.`,
    `6. A member forfeit their payout position if they miss more than ${isInvestment ? 3 : maxLatePayments} payment${maxLatePayments === 1 ? '' : 's'}.`,
    `7. The group may vote to remove a non-contributing member by two-thirds majority.`,
    ``,
    `GOVERNANCE`,
    `8. Decisions require a two-thirds majority vote of active members.`,
    `9. The chairperson manages contributions, payouts, and dispute resolution.`,
    `10. This constitution may be amended only with unanimous member consent.`,
    ``,
    `NASASA-aligned. All members must sign before participating.`,
  ].join('\n');

  const qrGrid = fakeQrGrid(inviteCode || 'AAAA00');

  /* ── Render success ── */
  if (showSuccess) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[ms.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>

          <Animated.View style={[sS.checkWrap, { backgroundColor: '#16A34A18', transform: [{ scale: checkScale }] }]}>
            <Icon name="check-circle" size={56} color="#16A34A" />
          </Animated.View>

          <Text style={[sS.successTitle, { color: colors.foreground }]}>Group is Live!</Text>
          <Text style={[sS.successSub, { color: colors.mutedForeground }]}>
            {name} has been created. Share the invite code with your people.
          </Text>

          {/* Invite code box */}
          <View style={[sS.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[sS.codeLabel, { color: colors.mutedForeground }]}>INVITE CODE</Text>
            <Text style={[sS.codeValue, { color: colors.foreground, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }]}>
              {inviteCode.slice(0, 3)} {inviteCode.slice(3)}
            </Text>
            <Text style={[sS.codeHint, { color: colors.mutedForeground }]}>Share this 6-digit code to invite members</Text>
          </View>

          {/* Decorative QR */}
          <View style={[sS.qrWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={sS.qrInner}>
              {qrGrid.map((row, r) => (
                <View key={r} style={sS.qrRow}>
                  {row.map((filled, c) => (
                    <View key={c} style={[sS.qrCell, { backgroundColor: filled ? colors.foreground : 'transparent' }]} />
                  ))}
                </View>
              ))}
            </View>
            <Text style={[sS.qrLabel, { color: colors.mutedForeground }]}>Scan to join</Text>
          </View>

          {/* Action buttons */}
          <View style={sS.btnCol}>
            <TouchableOpacity style={[sS.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleCopyCode}>
              <Icon name={codeCopied ? 'check' : 'share-2'} size={17} color={colors.primaryForeground} />
              <Text style={[sS.primaryBtnTxt, { color: colors.primaryForeground }]}>
                {codeCopied ? 'Link Copied!' : 'Share Invite Link'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[sS.secondaryBtn, { borderColor: colors.border }]} onPress={handleViewGroup}>
              <Icon name="arrow-right-circle" size={17} color={colors.foreground} />
              <Text style={[sS.secondaryBtnTxt, { color: colors.foreground }]}>Open Group</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClose}>
              <Text style={[sS.skipTxt, { color: colors.mutedForeground }]}>Do this later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  /* ── Render wizard ── */
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[ms.root, { backgroundColor: colors.background }]}>

          {/* Header */}
          <View style={[ms.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleBack} style={ms.backBtn}>
              <Icon name={step === 0 ? 'x' : 'arrow-left'} size={22} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[ms.headerTitle, { color: colors.foreground }]}>Create Stokvel</Text>
              <Text style={[ms.headerSub, { color: colors.mutedForeground }]}>{stepTitles[step]}</Text>
            </View>
            <StepDots current={step} total={totalSteps} colors={colors} />
          </View>

          <ScrollView contentContainerStyle={ms.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── STEP 0: Name + Type ───────────────────────── */}
            {step === 0 && (
              <View style={ms.section}>
                <SLabel text="GROUP NAME" colors={colors} />
                <FieldInput value={name} onChange={setName} placeholder="e.g. Vuka Savings Circle" colors={colors} />

                <SLabel text="SHORT DESCRIPTION (optional)" colors={colors} />
                <FieldInput value={desc} onChange={setDesc} placeholder="What is this group for?" multiline colors={colors} />

                <SLabel text="STOKVEL TYPE" colors={colors} />
                <View style={ms.typeGrid}>
                  {TYPE_OPTIONS.map((opt) => {
                    const active = type === opt.value;
                    return (
                      <TouchableOpacity key={opt.value}
                        style={[ms.typeTile, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setType(opt.value); }}
                      >
                        <View style={[ms.typeTileIcon, { backgroundColor: active ? 'rgba(255,255,255,0.15)' : colors.muted }]}>
                          <Icon name={opt.icon} size={18} color={active ? colors.primaryForeground : colors.mutedForeground} />
                        </View>
                        <Text style={[ms.typeTileLabel, { color: active ? colors.primaryForeground : colors.foreground }]}>{opt.label}</Text>
                        <Text style={[ms.typeTileDesc, { color: active ? colors.primaryForeground + 'AA' : colors.mutedForeground }]}>{opt.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {isInvestment && (
                  <View style={[ms.infoBanner, { backgroundColor: '#16A34A12', borderColor: '#16A34A30' }]}>
                    <Icon name="trending-up" size={14} color="#16A34A" />
                    <Text style={[ms.infoBannerTxt, { color: '#16A34A' }]}>
                      Investment stokvels offer Money Market, Property, and JSE ETF options — all beating standard bank rates.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── STEP 1: Contributions ─────────────────────── */}
            {step === 1 && (
              <View style={ms.section}>
                <View style={ms.twoCol}>
                  <View style={{ flex: 1 }}>
                    <SLabel text="CONTRIBUTION (R)" colors={colors} />
                    <FieldInput value={amount} onChange={setAmount} placeholder="1 000" keyboardType="numeric" colors={colors} />
                    {isInvestment && parseFloat(amount) > 0 && parseFloat(amount) < vm.minContrib && (
                      <Text style={[ms.fieldNote, { color: '#DC2626' }]}>Min R {vm.minContrib} for {vm.label}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <SLabel text="MAX MEMBERS" colors={colors} />
                    <FieldInput value={maxMem} onChange={setMaxMem} placeholder="10" keyboardType="numeric" colors={colors} />
                  </View>
                </View>

                <SLabel text="FREQUENCY" colors={colors} />
                <View style={ms.freqRow}>
                  {(['weekly', 'biweekly', 'monthly'] as Frequency[]).map((f) => (
                    <TouchableOpacity key={f}
                      style={[ms.freqBtn, { backgroundColor: freq === f ? colors.primary : colors.card, borderColor: freq === f ? colors.primary : colors.border }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFreq(f); }}
                    >
                      <Text style={[ms.freqTxt, { color: freq === f ? colors.primaryForeground : colors.mutedForeground }]}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {!!amount && parseFloat(amount) > 0 && (
                  <View style={[ms.poolCard, { backgroundColor: colors.card }]}>
                    <Text style={[ms.poolTitle, { color: colors.foreground }]}>Pool Summary</Text>
                    {[
                      { icon: 'users',    label: `${freq.charAt(0).toUpperCase() + freq.slice(1)} pool`,  value: `R ${pool.toLocaleString('en-ZA')}` },
                      { icon: 'calendar', label: 'Annual pool',                                            value: `R ${(pool * 12).toLocaleString('en-ZA')}` },
                      { icon: 'user',     label: 'Your contribution',                                      value: `R ${monthly.toLocaleString('en-ZA')} / ${freq === 'weekly' ? 'wk' : freq === 'biweekly' ? '2wks' : 'mo'}` },
                    ].map((row) => (
                      <View key={row.label} style={[ms.poolRow, { borderTopColor: colors.border }]}>
                        <Icon name={row.icon as any} size={14} color={colors.mutedForeground} />
                        <Text style={[ms.poolLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                        <Text style={[ms.poolValue, { color: colors.foreground }]}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── STEP 2: Group Rules (non-invest) ─────────── */}
            {step === rulesStep && (
              <View style={ms.section}>
                <Text style={[ms.stepDesc, { color: colors.mutedForeground }]}>
                  Set clear, enforceable rules. These will be written into your group constitution.
                </Text>

                <SLabel text="LATE PAYMENT PENALTY" colors={colors} />
                <View style={ms.optRow}>
                  {[3, 5, 10].map((p) => (
                    <TouchableOpacity key={p}
                      style={[ms.optBtn, { backgroundColor: penaltyPct === p ? colors.primary : colors.card, borderColor: penaltyPct === p ? colors.primary : colors.border }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPenaltyPct(p); }}
                    >
                      <Text style={[ms.optBtnTxt, { color: penaltyPct === p ? colors.primaryForeground : colors.foreground }]}>{p}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[ms.ruleNote, { color: colors.mutedForeground }]}>
                  {penaltyPct}% of R {amount || '0'} = R {((parseFloat(amount) || 0) * penaltyPct / 100).toFixed(2)} penalty per late payment
                </Text>

                <SLabel text="GRACE PERIOD" colors={colors} />
                <View style={ms.optRow}>
                  {[1, 3, 7].map((d) => (
                    <TouchableOpacity key={d}
                      style={[ms.optBtn, { backgroundColor: graceDays === d ? colors.primary : colors.card, borderColor: graceDays === d ? colors.primary : colors.border }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGraceDays(d); }}
                    >
                      <Text style={[ms.optBtnTxt, { color: graceDays === d ? colors.primaryForeground : colors.foreground }]}>{d}d</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[ms.ruleNote, { color: colors.mutedForeground }]}>
                  Members have {graceDays} day{graceDays > 1 ? 's' : ''} after the due date before penalty applies
                </Text>

                <SLabel text="MAX LATE PAYMENTS BEFORE REVIEW" colors={colors} />
                <View style={ms.optRow}>
                  {[2, 3, 5].map((n) => (
                    <TouchableOpacity key={n}
                      style={[ms.optBtn, { backgroundColor: maxLatePayments === n ? colors.primary : colors.card, borderColor: maxLatePayments === n ? colors.primary : colors.border }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMaxLatePayments(n); }}
                    >
                      <Text style={[ms.optBtnTxt, { color: maxLatePayments === n ? colors.primaryForeground : colors.foreground }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[ms.ruleNote, { color: colors.mutedForeground }]}>
                  After {maxLatePayments} missed payments, the group may vote to remove the member
                </Text>

                <View style={[ms.rulesPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={ms.rulesPreviewRow}>
                    <Icon name="shield" size={14} color="#16A34A" />
                    <Text style={[ms.rulesPreviewTxt, { color: colors.foreground }]}>Rule Summary</Text>
                  </View>
                  {[
                    `${penaltyPct}% penalty after ${graceDays}-day grace period`,
                    `Members removed after ${maxLatePayments} missed payments`,
                    `All rule changes require unanimous member consent`,
                    `NASASA-aligned governance structure`,
                  ].map((rule, i) => (
                    <View key={i} style={[ms.rulesPreviewItem, { borderTopColor: colors.border }]}>
                      <Icon name="check" size={12} color="#16A34A" />
                      <Text style={[ms.rulesPreviewItemTxt, { color: colors.mutedForeground }]}>{rule}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── STEP 2 (invest): Vehicle ──────────────────── */}
            {step === vehicleStep && (
              <View style={ms.section}>
                <Text style={[ms.stepDesc, { color: colors.mutedForeground }]}>
                  Choose how your pooled contributions are invested. All beat standard bank savings (~{BANK_RATE}% p.a.).
                </Text>
                {(Object.keys(VEHICLE_META) as InvestmentVehicle[]).map((v) => {
                  const meta = VEHICLE_META[v];
                  const active = vehicle === v;
                  const riskClr = RISK_META[meta.riskLevel].color;
                  return (
                    <TouchableOpacity key={v}
                      style={[ms.vehicleTile, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVehicle(v); setRisk(meta.riskLevel); }}
                    >
                      <View style={ms.vehicleTop}>
                        <View style={[ms.vehicleIconWrap, { backgroundColor: active ? 'rgba(255,255,255,0.15)' : colors.muted }]}>
                          <Icon name={meta.icon as any} size={20} color={active ? colors.primaryForeground : colors.mutedForeground} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[ms.vehicleLabel, { color: active ? colors.primaryForeground : colors.foreground }]}>{meta.label}</Text>
                          <View style={[ms.riskBadge, { backgroundColor: active ? 'rgba(255,255,255,0.15)' : riskClr + '18' }]}>
                            <Text style={[ms.riskTxt, { color: active ? colors.primaryForeground : riskClr }]}>{RISK_META[meta.riskLevel].label}</Text>
                          </View>
                        </View>
                        <View style={ms.returnBadge}>
                          <Text style={[ms.returnRange, { color: active ? colors.primaryForeground : '#16A34A' }]}>{meta.minReturn}–{meta.maxReturn}%</Text>
                          <Text style={[ms.returnLabel, { color: active ? colors.primaryForeground + '80' : colors.mutedForeground }]}>p.a.</Text>
                        </View>
                      </View>
                      <Text style={[ms.vehicleDesc, { color: active ? colors.primaryForeground + 'CC' : colors.mutedForeground }]}>{meta.description}</Text>
                      <View style={[ms.vsBank, { borderTopColor: active ? 'rgba(255,255,255,0.15)' : colors.border }]}>
                        <Text style={[ms.vsBankTxt, { color: active ? colors.primaryForeground + '80' : colors.mutedForeground }]}>
                          vs bank: +{meta.minReturn - BANK_RATE}% to +{meta.maxReturn - BANK_RATE}% extra return per year
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={[ms.feePreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Icon name="info" size={14} color={colors.mutedForeground} />
                  <Text style={[ms.feePreviewTxt, { color: colors.mutedForeground }]}>
                    Platform fee: <Text style={{ color: colors.foreground, fontWeight: '700' }}>{vm.platformFee}% of returns only</Text> — never from your principal.
                  </Text>
                </View>
              </View>
            )}

            {/* ── STEP 3 (invest): Fees & Tax ──────────────── */}
            {step === feeStep && (
              <View style={ms.section}>
                <View style={[ms.projCard, { backgroundColor: colors.primary }]}>
                  <Text style={[ms.projTitle, { color: colors.primaryForeground }]}>Annual Projection</Text>
                  <Text style={[ms.projVehicle, { color: colors.primaryForeground + '80' }]}>{vm.label} · {vm.minReturn}–{vm.maxReturn}% p.a.</Text>
                  <View style={ms.projNumbers}>
                    {[
                      { label: 'Contributions', value: `R ${(pool * 12).toLocaleString('en-ZA')}`, color: colors.primaryForeground },
                      { label: 'Est. Net Returns', value: `+R ${net.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: '#86EFAC' },
                      { label: 'vs Bank', value: `+R ${gain.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: '#86EFAC' },
                    ].map((n, i) => (
                      <React.Fragment key={n.label}>
                        {i > 0 && <View style={[ms.projDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />}
                        <View style={ms.projNum}>
                          <Text style={[ms.projValue, { color: n.color }]}>{n.value}</Text>
                          <Text style={[ms.projNumLabel, { color: colors.primaryForeground + '70' }]}>{n.label}</Text>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>
                </View>

                <View style={[ms.breakdownCard, { backgroundColor: colors.card }]}>
                  <Text style={[ms.breakdownTitle, { color: colors.foreground }]}>Platform Fee Breakdown</Text>
                  {[
                    { label: 'Gross returns (est.)',    value: `R ${estReturn.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`,    color: colors.foreground },
                    { label: `Fee (${vm.platformFee}% of returns)`, value: `−R ${platformFee.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`, color: '#DC2626' },
                    { label: 'Net to members',          value: `R ${net.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`,          color: '#16A34A' },
                  ].map((row, i) => (
                    <View key={row.label} style={[ms.breakdownRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                      <Text style={[ms.breakdownLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                      <Text style={[ms.breakdownValue, { color: row.color }]}>{row.value}</Text>
                    </View>
                  ))}
                </View>

                <View style={[ms.taxCard, { backgroundColor: '#D9770615', borderColor: '#D9770630' }]}>
                  <View style={ms.taxHeader}>
                    <Icon name="alert-triangle" size={16} color="#D97706" />
                    <Text style={[ms.taxTitle, { color: '#D97706' }]}>SARS Tax Notice</Text>
                  </View>
                  <Text style={[ms.taxBody, { color: colors.foreground }]}>
                    Individuals receive a <Text style={{ fontWeight: '700' }}>R23,800 interest exemption</Text> per year (Section 10(1)(i)).
                  </Text>
                  <Text style={[ms.taxBody, { color: colors.mutedForeground, marginTop: 6 }]}>
                    Interest above R23,800 must be declared on your ITR12. StockFair generates a SARS-ready tax report.
                  </Text>
                </View>

                {[
                  { key: 'fee', ack: feeAck, set: setFeeAck, text: 'I understand the platform fee and agree fees are deducted from returns only.' },
                  { key: 'tax', ack: taxAck, set: setTaxAck, text: 'I understand that interest income above R23,800 must be declared to SARS.' },
                ].map((item) => (
                  <TouchableOpacity key={item.key} style={ms.ackRow}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); item.set(!item.ack); }}>
                    <View style={[ms.ackBox, { backgroundColor: item.ack ? colors.primary : colors.muted, borderColor: item.ack ? colors.primary : colors.border }]}>
                      {item.ack && <Icon name="check" size={12} color={colors.primaryForeground} />}
                    </View>
                    <Text style={[ms.ackTxt, { color: colors.mutedForeground }]}>{item.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── FINAL STEP: Constitution ──────────────────── */}
            {step === constitutionStep && (
              <View style={ms.section}>
                <Text style={[ms.stepDesc, { color: colors.mutedForeground }]}>
                  Review your group constitution. All members will be asked to sign this when they join.
                </Text>

                <View style={[ms.constCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={ms.constHeader}>
                    <View style={[ms.constIconWrap, { backgroundColor: colors.primary }]}>
                      <Icon name="file-text" size={16} color={colors.primaryForeground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[ms.constTitle, { color: colors.foreground }]}>{name || 'Your Group'} Constitution</Text>
                      <Text style={[ms.constSub, { color: colors.mutedForeground }]}>NASASA-aligned · Auto-generated</Text>
                    </View>
                  </View>
                  <ScrollView style={ms.constScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    <Text style={[ms.constText, { color: colors.mutedForeground }]}>{constitutionText}</Text>
                  </ScrollView>
                </View>

                <TouchableOpacity style={ms.ackRow}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConstAck(!constAck); }}>
                  <View style={[ms.ackBox, { backgroundColor: constAck ? colors.primary : colors.muted, borderColor: constAck ? colors.primary : colors.border }]}>
                    {constAck && <Icon name="check" size={12} color={colors.primaryForeground} />}
                  </View>
                  <Text style={[ms.ackTxt, { color: colors.mutedForeground }]}>
                    I have read and agree to this constitution. I understand my obligations as group founder.
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>

          {/* Footer */}
          <View style={[ms.footer, { paddingBottom: Platform.OS === 'ios' ? 34 : 16, borderTopColor: colors.border, backgroundColor: colors.background }]}>
            {step === constitutionStep ? (
              <TouchableOpacity
                style={[ms.createBtn, { backgroundColor: canCreate ? colors.primary : colors.muted }]}
                onPress={canCreate ? handleCreate : undefined}
                disabled={!canCreate}
              >
                <Icon name="check-circle" size={17} color={canCreate ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[ms.createBtnTxt, { color: canCreate ? colors.primaryForeground : colors.mutedForeground }]}>Create Stokvel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[ms.nextBtn, { backgroundColor: canProceed ? colors.primary : colors.muted }]}
                onPress={canProceed ? handleNext : undefined}
                disabled={!canProceed}
              >
                <Text style={[ms.nextBtnTxt, { color: canProceed ? colors.primaryForeground : colors.mutedForeground }]}>Continue</Text>
                <Icon name="arrow-right" size={16} color={canProceed ? colors.primaryForeground : colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════
   JOIN WITH CODE MODAL
══════════════════════════════════════════════════════ */
function JoinModal({ visible, onClose, colors }: { visible: boolean; onClose: () => void; colors: any }) {
  const [code, setCode]         = useState('');
  const [phase, setPhase]       = useState<'input' | 'found' | 'sent'>('input');
  const [searching, setSearching] = useState(false);

  const MOCK_GROUP = { name: "Bongani's Savings Circle", type: 'rotation', contribution: 'R 1,000/mo', members: 7, maxMembers: 10 };

  function handleSearch() {
    if (code.replace(/\s/g, '').length < 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearching(true);
    setTimeout(() => { setSearching(false); setPhase('found'); }, 1200);
  }

  function handleJoin() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase('sent');
  }

  function handleClose() {
    setCode(''); setPhase('input'); setSearching(false); onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[jS.root, { backgroundColor: colors.background }]}>
        <View style={[jS.header, { borderBottomColor: colors.border }]}>
          <Text style={[jS.title, { color: colors.foreground }]}>Join a Stokvel</Text>
          <TouchableOpacity onPress={handleClose}>
            <Icon name="x" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={jS.body}>
          {phase === 'input' && (
            <>
              <Text style={[jS.sub, { color: colors.mutedForeground }]}>
                Enter the 6-character invite code shared by your group founder.
              </Text>
              <TextInput
                style={[jS.codeInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: searching ? colors.primary : colors.border, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }]}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase().slice(0, 7))}
                placeholder="e.g.  VUK 847"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                style={[jS.searchBtn, { backgroundColor: code.replace(/\s/g, '').length >= 6 ? colors.primary : colors.muted }]}
                onPress={handleSearch}
                disabled={code.replace(/\s/g, '').length < 6 || searching}
              >
                <Icon name={searching ? 'loader' : 'search'} size={17} color={code.replace(/\s/g, '').length >= 6 ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[jS.searchBtnTxt, { color: code.replace(/\s/g, '').length >= 6 ? colors.primaryForeground : colors.mutedForeground }]}>
                  {searching ? 'Searching…' : 'Find Group'}
                </Text>
              </TouchableOpacity>

              <View style={[jS.hint, { backgroundColor: colors.muted }]}>
                <Icon name="info" size={13} color={colors.mutedForeground} />
                <Text style={[jS.hintTxt, { color: colors.mutedForeground }]}>
                  Ask the group founder to share their invite code with you via WhatsApp or SMS.
                </Text>
              </View>
            </>
          )}

          {phase === 'found' && (
            <>
              <View style={[jS.foundCard, { backgroundColor: colors.card, borderColor: '#16A34A30' }]}>
                <View style={[jS.foundIcon, { backgroundColor: '#16A34A18' }]}>
                  <Icon name="users" size={22} color="#16A34A" />
                </View>
                <Text style={[jS.foundName, { color: colors.foreground }]}>{MOCK_GROUP.name}</Text>
                {[
                  { label: 'Type',         value: MOCK_GROUP.type.charAt(0).toUpperCase() + MOCK_GROUP.type.slice(1) },
                  { label: 'Contribution', value: MOCK_GROUP.contribution },
                  { label: 'Members',      value: `${MOCK_GROUP.members}/${MOCK_GROUP.maxMembers} spots filled` },
                ].map((row) => (
                  <View key={row.label} style={[jS.foundRow, { borderTopColor: colors.border }]}>
                    <Text style={[jS.foundLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[jS.foundValue, { color: colors.foreground }]}>{row.value}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[jS.searchBtn, { backgroundColor: colors.primary }]} onPress={handleJoin}>
                <Icon name="user-plus" size={17} color={colors.primaryForeground} />
                <Text style={[jS.searchBtnTxt, { color: colors.primaryForeground }]}>Request to Join</Text>
              </TouchableOpacity>
              <TouchableOpacity style={jS.backLink} onPress={() => setPhase('input')}>
                <Text style={[jS.backLinkTxt, { color: colors.mutedForeground }]}>Wrong code? Try again</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === 'sent' && (
            <View style={jS.sentWrap}>
              <View style={[jS.sentIcon, { backgroundColor: '#16A34A18' }]}>
                <Icon name="check-circle" size={48} color="#16A34A" />
              </View>
              <Text style={[jS.sentTitle, { color: colors.foreground }]}>Request Sent!</Text>
              <Text style={[jS.sentSub, { color: colors.mutedForeground }]}>
                Your request to join {MOCK_GROUP.name} has been sent to the group founder. You'll be notified once accepted.
              </Text>
              <TouchableOpacity style={[jS.searchBtn, { backgroundColor: colors.primary, marginTop: 24 }]} onPress={handleClose}>
                <Text style={[jS.searchBtnTxt, { color: colors.primaryForeground }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN GROUPS SCREEN
══════════════════════════════════════════════════════ */
export default function GroupsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { t }   = useLanguage();
  const { stokvels, addStokvel } = useStokvel();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin,   setShowJoin]   = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : 0;

  const handleCreate = (data: any): string => {
    return addStokvel({
      name: data.name, type: data.type,
      contributionAmount: data.contributionAmount, frequency: data.frequency,
      members: [{ id: 'me', name: 'You', position: 1, totalPaid: 0 }],
      maxMembers: data.maxMembers,
      currentPosition: 1,
      nextPayout: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      totalSaved: 0,
      color: data.color, icon: data.icon,
      investmentConfig: data.investmentConfig,
    });
  };

  const totalSaved    = stokvels.reduce((s, g) => s + g.totalSaved, 0);
  const totalMembers  = stokvels.reduce((s, g) => s + g.members.length, 0);
  const nextPayout    = stokvels.length
    ? new Date(stokvels.reduce((e, g) => new Date(g.nextPayout) < new Date(e) ? g.nextPayout : e, stokvels[0].nextPayout))
        .toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
    : '—';

  const investmentStokvels = stokvels.filter((s) => s.type === 'investment');

  const daysUntil = (d: string) => {
    const now = new Date(); now.setHours(0,0,0,0);
    const target = new Date(d); target.setHours(0,0,0,0);
    return Math.max(0, Math.round((target.getTime() - now.getTime()) / 86400000));
  };
  const sortedStokvels = [...stokvels].sort((a, b) => daysUntil(a.nextPayout) - daysUntil(b.nextPayout));

  const monthlyObligation = stokvels.reduce((s, g) => s + g.contributionAmount, 0);
  const invEstReturn = investmentStokvels.reduce((s, g) => {
    const cfg = g.investmentConfig;
    const vm  = cfg ? VEHICLE_META[cfg.vehicle] : null;
    return s + (vm ? Math.round(g.totalSaved * ((vm.minReturn + vm.maxReturn) / 2 / 100)) : 0);
  }, 0);
  const nextUrgent     = sortedStokvels[0];
  const nextUrgentDays = nextUrgent ? daysUntil(nextUrgent.nextPayout) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[gs.container, { paddingTop: topPad + 16, paddingBottom: 100 + botPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={gs.header}>
          <View>
            <Text style={[gs.title, { color: colors.foreground }]}>{t('myGroups')}</Text>
            <Text style={[gs.subtitle, { color: colors.mutedForeground }]}>
              {stokvels.length} active {stokvels.length === 1 ? 'stokvel' : 'stokvels'}
            </Text>
          </View>
          <TouchableOpacity
            style={[gs.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowCreate(true); }}
          >
            <Icon name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={gs.statsRow}>
          {[
            { label: t('totalSavings'), value: `R ${totalSaved.toLocaleString('en-ZA')}` },
            { label: t('members'),      value: `${totalMembers}` },
            { label: t('nextPayout'),   value: nextPayout, accent: true },
          ].map((s) => (
            <View key={s.label} style={[gs.statCard, { backgroundColor: colors.card }]}>
              <Text style={[gs.statValue, { color: s.accent ? '#16A34A' : colors.foreground }]}>{s.value}</Text>
              <Text style={[gs.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Smart Insight */}
        {stokvels.length > 0 && (
          <View style={[gs.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={gs.insightRow}>
              <View style={[gs.insightIcon, { backgroundColor: colors.muted }]}>
                <Icon name="zap" size={14} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[gs.insightTitle, { color: colors.foreground }]}>Monthly commitment</Text>
                <Text style={[gs.insightValue, { color: colors.foreground }]}>R {monthlyObligation.toLocaleString('en-ZA')} across {stokvels.length} groups</Text>
              </View>
            </View>
            {nextUrgentDays !== null && nextUrgentDays <= 30 && (
              <View style={[gs.insightRow, gs.insightRowBorder, { borderTopColor: colors.border }]}>
                <View style={[gs.insightIcon, { backgroundColor: nextUrgentDays <= 7 ? '#DC262618' : colors.muted }]}>
                  <Icon name="clock" size={14} color={nextUrgentDays <= 7 ? '#DC2626' : colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[gs.insightTitle, { color: nextUrgentDays <= 7 ? '#DC2626' : colors.foreground }]}>
                    {nextUrgentDays <= 7 ? 'Urgent' : 'Upcoming'}
                  </Text>
                  <Text style={[gs.insightValue, { color: colors.foreground }]}>
                    {nextUrgent!.name} · {nextUrgentDays === 0 ? 'today' : `in ${nextUrgentDays} days`}
                  </Text>
                </View>
              </View>
            )}
            {invEstReturn > 0 && (
              <View style={[gs.insightRow, gs.insightRowBorder, { borderTopColor: colors.border }]}>
                <View style={[gs.insightIcon, { backgroundColor: '#16A34A18' }]}>
                  <Icon name="trending-up" size={14} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[gs.insightTitle, { color: '#16A34A' }]}>Est. investment return</Text>
                  <Text style={[gs.insightValue, { color: colors.foreground }]}>~R {invEstReturn.toLocaleString('en-ZA')} this year</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Groups list */}
        {stokvels.length === 0 ? (
          <View style={gs.emptyState}>
            <Icon name="users" size={48} color={colors.mutedForeground} />
            <Text style={[gs.emptyTitle, { color: colors.foreground }]}>{t('noGroups')}</Text>
            <Text style={[gs.emptyDesc, { color: colors.mutedForeground }]}>{t('createFirst')}</Text>
            <TouchableOpacity style={[gs.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowCreate(true)}>
              <Text style={[gs.emptyBtnText, { color: colors.primaryForeground }]}>{t('createGroup')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sortedStokvels.map((s, i) => <StokvelCard key={s.id} stokvel={s} index={i} />)
        )}

        {/* Join / Create row */}
        <View style={gs.actionRow}>
          <TouchableOpacity
            style={[gs.actionCard, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowJoin(true); }}
          >
            <View style={[gs.actionIcon, { backgroundColor: colors.muted }]}>
              <Icon name="link" size={18} color={colors.foreground} />
            </View>
            <Text style={[gs.actionTitle, { color: colors.foreground }]}>Join with Code</Text>
            <Text style={[gs.actionDesc, { color: colors.mutedForeground }]}>Enter an invite code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[gs.actionCard, { backgroundColor: colors.primary, borderColor: 'transparent', flex: 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowCreate(true); }}
          >
            <View style={[gs.actionIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Icon name="plus-circle" size={18} color={colors.primaryForeground} />
            </View>
            <Text style={[gs.actionTitle, { color: colors.primaryForeground }]}>Create Group</Text>
            <Text style={[gs.actionDesc, { color: colors.primaryForeground + 'AA' }]}>Start a new stokvel</Text>
          </TouchableOpacity>
        </View>

        {/* ── Discover Teaser ── */}
        const router = useRouter();
        
        <TouchableOpacity
          style={[gs.discoverBanner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/discover'); }}
          activeOpacity={0.82}
        >
          <View style={[gs.discoverIcon, { backgroundColor: colors.primary + '20' }]}>
            <Icon name="compass" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[gs.discoverTitle, { color: colors.foreground }]}>Discover Stokvels</Text>
            <Text style={[gs.discoverSub, { color: colors.mutedForeground }]}>Browse For You, Near Me, Top Performers & more</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

      </ScrollView>

      <CreateModal visible={showCreate} onClose={() => setShowCreate(false)} onDone={handleCreate} colors={colors} />
      <JoinModal   visible={showJoin}   onClose={() => setShowJoin(false)}   colors={colors} />
    </View>
  );
}

const dS_unused = null; // DiscoverSection moved to discover.tsx tab

const dS = StyleSheet.create({
  codeBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  codeBtnTxt:   { fontSize: 12, fontWeight: '600' },
  loadMore:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
});

/* ─── Styles ──────────────────────────────────────────── */
const ms = StyleSheet.create({
  root:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:        { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle:    { fontSize: 18, fontWeight: '800' },
  headerSub:      { fontSize: 12, marginTop: 2 },
  dotsRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:            { height: 8, borderRadius: 4 },
  body:           { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  section:        { gap: 14 },
  label:          { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  input:          { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  fieldNote:      { fontSize: 11, marginTop: 4 },
  stepDesc:       { fontSize: 14, lineHeight: 20 },
  twoCol:         { flexDirection: 'row', gap: 12 },
  typeGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeTile:       { width: (SW - 56) / 2, borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 6 },
  typeTileIcon:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  typeTileLabel:  { fontSize: 14, fontWeight: '700' },
  typeTileDesc:   { fontSize: 11, lineHeight: 14 },
  infoBanner:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoBannerTxt:  { flex: 1, fontSize: 12, lineHeight: 17 },
  freqRow:        { flexDirection: 'row', gap: 10 },
  freqBtn:        { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  freqTxt:        { fontSize: 13, fontWeight: '600' },
  poolCard:       { borderRadius: 14, padding: 14, gap: 0 },
  poolTitle:      { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  poolRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  poolLabel:      { flex: 1, fontSize: 12 },
  poolValue:      { fontSize: 13, fontWeight: '600' },
  optRow:         { flexDirection: 'row', gap: 10 },
  optBtn:         { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  optBtnTxt:      { fontSize: 15, fontWeight: '700' },
  ruleNote:       { fontSize: 11, marginTop: -6 },
  rulesPreview:   { borderRadius: 14, padding: 14, gap: 0, borderWidth: 1 },
  rulesPreviewRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  rulesPreviewTxt:{ fontSize: 13, fontWeight: '700' },
  rulesPreviewItem:{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  rulesPreviewItemTxt:{ flex: 1, fontSize: 12, lineHeight: 17 },
  vehicleTile:    { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10 },
  vehicleTop:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vehicleIconWrap:{ width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  vehicleLabel:   { fontSize: 15, fontWeight: '700' },
  riskBadge:      { flexDirection: 'row', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 4 },
  riskTxt:        { fontSize: 10, fontWeight: '700' },
  returnBadge:    { alignItems: 'flex-end' },
  returnRange:    { fontSize: 18, fontWeight: '800' },
  returnLabel:    { fontSize: 10 },
  vehicleDesc:    { fontSize: 12, lineHeight: 17 },
  vsBank:         { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  vsBankTxt:      { fontSize: 11 },
  feePreview:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  feePreviewTxt:  { flex: 1, fontSize: 12, lineHeight: 17 },
  projCard:       { borderRadius: 16, padding: 18, gap: 8 },
  projTitle:      { fontSize: 16, fontWeight: '700' },
  projVehicle:    { fontSize: 12 },
  projNumbers:    { flexDirection: 'row', marginTop: 4 },
  projNum:        { flex: 1, alignItems: 'center', gap: 3 },
  projDivider:    { width: 1, marginVertical: 4 },
  projValue:      { fontSize: 14, fontWeight: '800' },
  projNumLabel:   { fontSize: 9, textAlign: 'center' },
  breakdownCard:  { borderRadius: 14, padding: 14 },
  breakdownTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  breakdownRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  breakdownLabel: { fontSize: 12 },
  breakdownValue: { fontSize: 13, fontWeight: '700' },
  taxCard:        { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  taxHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taxTitle:       { fontSize: 14, fontWeight: '700' },
  taxBody:        { fontSize: 13, lineHeight: 19 },
  ackRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ackBox:         { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  ackTxt:         { flex: 1, fontSize: 13, lineHeight: 19 },
  constCard:      { borderRadius: 16, padding: 16, borderWidth: 1 },
  constHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  constIconWrap:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  constTitle:     { fontSize: 14, fontWeight: '700' },
  constSub:       { fontSize: 11, marginTop: 2 },
  constScroll:    { maxHeight: 220 },
  constText:      { fontSize: 11, lineHeight: 18, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  footer:         { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  nextBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 13 },
  nextBtnTxt:     { fontSize: 16, fontWeight: '700' },
  createBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 13 },
  createBtnTxt:   { fontSize: 16, fontWeight: '700' },
});

const sS = StyleSheet.create({
  checkWrap:     { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle:  { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  successSub:    { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28, paddingHorizontal: 12 },
  codeCard:      { width: '100%', borderRadius: 18, padding: 20, borderWidth: 1, alignItems: 'center', gap: 6, marginBottom: 20 },
  codeLabel:     { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  codeValue:     { fontSize: 36, fontWeight: '800', letterSpacing: 6 },
  codeHint:      { fontSize: 11 },
  qrWrap:        { borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'center', gap: 10, marginBottom: 28 },
  qrInner:       { gap: 3 },
  qrRow:         { flexDirection: 'row', gap: 3 },
  qrCell:        { width: 14, height: 14, borderRadius: 3 },
  qrLabel:       { fontSize: 10 },
  btnCol:        { width: '100%', gap: 12 },
  primaryBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  primaryBtnTxt: { fontSize: 16, fontWeight: '700' },
  secondaryBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5 },
  secondaryBtnTxt:{ fontSize: 16, fontWeight: '600' },
  skipTxt:       { textAlign: 'center', fontSize: 14, paddingVertical: 4 },
});

const jS = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title:        { fontSize: 20, fontWeight: '800' },
  body:         { padding: 20, gap: 16 },
  sub:          { fontSize: 14, lineHeight: 21 },
  codeInput:    { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 16, fontSize: 28, letterSpacing: 6, textAlign: 'center' },
  searchBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 13 },
  searchBtnTxt: { fontSize: 16, fontWeight: '700' },
  hint:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12 },
  hintTxt:      { flex: 1, fontSize: 12, lineHeight: 17 },
  foundCard:    { borderRadius: 16, padding: 16, borderWidth: 1, gap: 0, alignItems: 'center' },
  foundIcon:    { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  foundName:    { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  foundRow:     { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  foundLabel:   { fontSize: 12 },
  foundValue:   { fontSize: 13, fontWeight: '600' },
  backLink:     { alignItems: 'center', paddingVertical: 4 },
  backLinkTxt:  { fontSize: 13 },
  sentWrap:     { alignItems: 'center', paddingTop: 40 },
  sentIcon:     { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  sentTitle:    { fontSize: 24, fontWeight: '800', marginBottom: 10 },
  sentSub:      { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});

const gs = StyleSheet.create({
  container:      { paddingHorizontal: 20, gap: 16 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:          { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle:       { fontSize: 13, marginTop: 2 },
  addBtn:         { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statsRow:       { flexDirection: 'row', gap: 10 },
  statCard:       { flex: 1, borderRadius: 14, padding: 14, gap: 3 },
  statValue:      { fontSize: 17, fontWeight: '800' },
  statLabel:      { fontSize: 10 },
  insightCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  insightRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  insightRowBorder:{ borderTopWidth: StyleSheet.hairlineWidth },
  insightIcon:    { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  insightTitle:   { fontSize: 11, fontWeight: '700' },
  insightValue:   { fontSize: 13, marginTop: 2 },
  emptyState:     { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle:     { fontSize: 20, fontWeight: '700' },
  emptyDesc:      { fontSize: 14, textAlign: 'center' },
  emptyBtn:       { paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, marginTop: 4 },
  emptyBtnText:   { fontSize: 15, fontWeight: '700' },
  actionRow:      { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionCard:     { borderRadius: 16, padding: 16, gap: 6, borderWidth: 1 },
  actionIcon:     { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  actionTitle:    { fontSize: 14, fontWeight: '700' },
  actionDesc:     { fontSize: 11 },
  discoverBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, marginTop: 24, marginBottom: 12, padding: 18, borderRadius: 18, borderWidth: 1 },
  discoverIcon:   { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  discoverTitle:  { fontSize: 15, fontWeight: '700' },
  discoverSub:    { fontSize: 12, marginTop: 2 },
});
