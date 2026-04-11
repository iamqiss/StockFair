import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  Platform, TextInput, Animated,
} from 'react-native';
import Icon from '@/components/Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Stokvel } from '@/context/StokvelContext';

type PaymentMethod = 'wallet' | 'eft';
type PayStep       = 'method' | 'confirm' | 'bank_details' | 'pin' | 'success';

interface Props {
  visible:     boolean;
  onClose:     () => void;
  stokvel:     Stokvel;
  colors:      any;
  userBalance: number;
  onConfirm:   (amount: number, method: PaymentMethod) => void;
}

const MAX_ATTEMPTS = 3;
const BANK_DETAILS = {
  bank:    'FNB — First National Bank',
  account: '62 8844 99001',
  type:    'Cheque Account',
  branch:  '250 655',
};

function PinDot({ filled, colors }: { filled: boolean; colors: any }) {
  return (
    <View style={[pinStyles.dot, {
      backgroundColor: filled ? colors.foreground : 'transparent',
      borderColor: filled ? colors.foreground : colors.border,
    }]} />
  );
}

function NumKey({ label, onPress, colors, danger }: { label: string; onPress: () => void; colors: any; danger?: boolean }) {
  return (
    <TouchableOpacity
      style={[pinStyles.key, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {label === 'del' ? (
        <Icon name="delete" size={22} color={danger ? '#DC2626' : colors.foreground} />
      ) : (
        <Text style={[pinStyles.keyTxt, { color: colors.foreground }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function PaymentModal({ visible, onClose, stokvel, colors, userBalance, onConfirm }: Props) {
  const [step,        setStep]        = useState<PayStep>('method');
  const [method,      setMethod]      = useState<PaymentMethod>('wallet');
  const [editAmount,  setEditAmount]  = useState(false);
  const [customAmt,   setCustomAmt]   = useState(stokvel.contributionAmount.toString());
  const [pin,         setPin]         = useState('');
  const [savedPin,    setSavedPin]    = useState('1234');
  const [attempts,    setAttempts]    = useState(0);
  const [pinError,    setPinError]    = useState('');
  const [refNum,      setRefNum]      = useState('');

  const shakeX    = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const amount = parseFloat(customAmt) || stokvel.contributionAmount;
  const hasFunds = userBalance >= amount;

  useEffect(() => {
    AsyncStorage.getItem('@stockfair_pin').then((p) => { if (p) setSavedPin(p); });
  }, []);

  useEffect(() => {
    if (step === 'success') {
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
    } else {
      checkScale.setValue(0);
    }
  }, [step]);

  function reset() {
    setStep('method'); setMethod('wallet'); setEditAmount(false);
    setCustomAmt(stokvel.contributionAmount.toString());
    setPin(''); setAttempts(0); setPinError('');
  }
  function handleClose() { reset(); onClose(); }

  function handleMethodNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (method === 'wallet') {
      setStep('confirm');
    } else {
      setStep('bank_details');
    }
  }

  function handleWalletConfirm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('pin');
  }

  function handleEFTConfirm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    finalise('eft');
  }

  function handlePinKey(k: string) {
    if (pin.length >= 4) return;
    Haptics.selectionAsync();
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => checkPin(next), 120);
    }
  }

  function handlePinDel() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin((p) => p.slice(0, -1));
    setPinError('');
  }

  function checkPin(entered: string) {
    if (entered === savedPin) {
      finalise('wallet');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const remaining = MAX_ATTEMPTS - attempts - 1;
      setAttempts((a) => a + 1);
      setPinError(remaining > 0 ? `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} left.` : 'Too many attempts. Please try again later.');
      setPin('');
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 6,  duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0,  duration: 40, useNativeDriver: true }),
      ]).start();
    }
  }

  function finalise(m: PaymentMethod) {
    const ref = `STK-${stokvel.id.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    setRefNum(ref);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(amount, m);
    setStep('success');
  }

  const progressPct = { method: 25, confirm: 50, bank_details: 50, pin: 75, success: 100 }[step];
  const accentColor = stokvel.color;

  /* ── Render ── */
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[pmS.root, { backgroundColor: colors.background }]}>

        {/* Header */}
        {step !== 'success' && (
          <View style={[pmS.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={step === 'method' ? handleClose : () => {
              if (step === 'confirm' || step === 'bank_details') setStep('method');
              else if (step === 'pin') setStep('confirm');
            }}>
              <Icon name={step === 'method' ? 'x' : 'arrow-left'} size={22} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[pmS.headerTitle, { color: colors.foreground }]}>
                {step === 'method' ? 'Contribute' : step === 'confirm' ? 'Confirm Payment' : step === 'bank_details' ? 'Bank Transfer' : 'Enter PIN'}
              </Text>
              <Text style={[pmS.headerSub, { color: colors.mutedForeground }]}>{stokvel.name}</Text>
            </View>
            <View style={[pmS.progressWrap, { backgroundColor: colors.muted }]}>
              <View style={[pmS.progressFill, { width: `${progressPct}%` as any, backgroundColor: accentColor }]} />
            </View>
          </View>
        )}

        <ScrollView contentContainerStyle={pmS.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── STEP 1: Method selection ── */}
          {step === 'method' && (
            <View style={pmS.section}>
              <Text style={[pmS.sectionLabel, { color: colors.mutedForeground }]}>PAYMENT METHOD</Text>

              {/* Amount display */}
              <View style={[pmS.amountCard, { backgroundColor: accentColor }]}>
                <Text style={pmS.amountCardLabel}>Amount due</Text>
                <Text style={pmS.amountCardValue}>R {stokvel.contributionAmount.toLocaleString('en-ZA')}</Text>
                <Text style={pmS.amountCardFreq}>{stokvel.frequency} contribution</Text>
              </View>

              {/* Method tiles */}
              {[
                {
                  val: 'wallet' as PaymentMethod,
                  icon: 'credit-card',
                  title: 'StockFair Wallet',
                  sub: `Balance: R ${userBalance.toLocaleString('en-ZA')}`,
                  badge: hasFunds ? { text: 'Available', color: '#16A34A' } : { text: 'Insufficient', color: '#DC2626' },
                },
                {
                  val: 'eft' as PaymentMethod,
                  icon: 'send',
                  title: 'EFT / Bank Transfer',
                  sub: 'Pay via internet banking',
                  badge: { text: 'Instant', color: '#D97706' },
                },
              ].map((opt) => {
                const active = method === opt.val;
                return (
                  <TouchableOpacity key={opt.val}
                    style={[pmS.methodTile, { backgroundColor: active ? accentColor + '12' : colors.card, borderColor: active ? accentColor : colors.border }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMethod(opt.val); }}
                  >
                    <View style={[pmS.methodIcon, { backgroundColor: active ? accentColor + '20' : colors.muted }]}>
                      <Icon name={opt.icon as any} size={20} color={active ? accentColor : colors.mutedForeground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[pmS.methodTitle, { color: active ? colors.foreground : colors.foreground }]}>{opt.title}</Text>
                      <Text style={[pmS.methodSub, { color: colors.mutedForeground }]}>{opt.sub}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[pmS.badgePill, { backgroundColor: opt.badge.color + '18' }]}>
                        <Text style={[pmS.badgeTxt, { color: opt.badge.color }]}>{opt.badge.text}</Text>
                      </View>
                      <View style={[pmS.radio, { borderColor: active ? accentColor : colors.border }]}>
                        {active && <View style={[pmS.radioDot, { backgroundColor: accentColor }]} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {method === 'wallet' && !hasFunds && (
                <View style={[pmS.warnBanner, { backgroundColor: '#DC262612', borderColor: '#DC262630' }]}>
                  <Icon name="alert-triangle" size={14} color="#DC2626" />
                  <Text style={[pmS.warnTxt, { color: '#DC2626' }]}>
                    Insufficient wallet balance. Top up your wallet or switch to EFT.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[pmS.cta, { backgroundColor: method === 'wallet' && !hasFunds ? colors.muted : accentColor }]}
                onPress={method === 'wallet' && !hasFunds ? undefined : handleMethodNext}
                disabled={method === 'wallet' && !hasFunds}
              >
                <Text style={[pmS.ctaTxt, { color: method === 'wallet' && !hasFunds ? colors.mutedForeground : '#fff' }]}>Continue</Text>
                <Icon name="arrow-right" size={17} color={method === 'wallet' && !hasFunds ? colors.mutedForeground : '#fff'} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2a: Wallet confirm ── */}
          {step === 'confirm' && (
            <View style={pmS.section}>
              <Text style={[pmS.sectionLabel, { color: colors.mutedForeground }]}>PAYMENT SUMMARY</Text>

              <View style={[pmS.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[pmS.summaryIconRow, { backgroundColor: accentColor }]}>
                  <Icon name="credit-card" size={28} color="#fff" />
                  <Text style={pmS.summaryCardTitle}>StockFair Wallet</Text>
                </View>
                <View style={pmS.summaryRows}>
                  {[
                    { label: 'Group',        value: stokvel.name },
                    { label: 'Type',         value: stokvel.type.charAt(0).toUpperCase() + stokvel.type.slice(1) },
                    { label: 'Amount',       value: `R ${amount.toLocaleString('en-ZA')}`,         color: accentColor },
                    { label: 'Wallet balance',value: `R ${userBalance.toLocaleString('en-ZA')}` },
                    { label: 'Balance after', value: `R ${(userBalance - amount).toLocaleString('en-ZA')}`, color: userBalance - amount < 500 ? '#D97706' : '#16A34A' },
                  ].map((row, i) => (
                    <View key={row.label} style={[pmS.summaryRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                      <Text style={[pmS.summaryLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                      <Text style={[pmS.summaryValue, { color: (row as any).color ?? colors.foreground }]}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[pmS.infoBanner, { backgroundColor: colors.muted }]}>
                <Icon name="lock" size={13} color={colors.mutedForeground} />
                <Text style={[pmS.infoTxt, { color: colors.mutedForeground }]}>
                  You'll be asked for your 4-digit PIN to confirm this payment.
                </Text>
              </View>

              <TouchableOpacity style={[pmS.cta, { backgroundColor: accentColor }]} onPress={handleWalletConfirm}>
                <Icon name="lock" size={17} color="#fff" />
                <Text style={[pmS.ctaTxt, { color: '#fff' }]}>Confirm with PIN</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2b: EFT bank details ── */}
          {step === 'bank_details' && (
            <View style={pmS.section}>
              <Text style={[pmS.sectionLabel, { color: colors.mutedForeground }]}>BANK TRANSFER DETAILS</Text>

              <View style={[pmS.bankCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={pmS.bankCardHeader}>
                  <Icon name="send" size={18} color={accentColor} />
                  <Text style={[pmS.bankCardTitle, { color: colors.foreground }]}>Transfer Details</Text>
                </View>
                {[
                  { label: 'Bank',            value: BANK_DETAILS.bank },
                  { label: 'Account Number',  value: BANK_DETAILS.account },
                  { label: 'Account Type',    value: BANK_DETAILS.type },
                  { label: 'Branch Code',     value: BANK_DETAILS.branch },
                  { label: 'Amount',          value: `R ${amount.toLocaleString('en-ZA')}`, bold: true, color: accentColor },
                  { label: 'Reference',       value: `${stokvel.name.split(' ')[0].toUpperCase()}-${(user => user ?? 'YOU')('YOU')}`, bold: true, color: colors.foreground },
                ].map((row, i) => (
                  <View key={row.label} style={[pmS.bankRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <Text style={[pmS.bankLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[pmS.bankValue, { color: (row as any).color ?? colors.foreground, fontWeight: (row as any).bold ? '700' : '500' }]}>{row.value}</Text>
                  </View>
                ))}
              </View>

              <View style={[pmS.warnBanner, { backgroundColor: '#D9770612', borderColor: '#D9770630' }]}>
                <Icon name="clock" size={14} color="#D97706" />
                <Text style={[pmS.warnTxt, { color: '#D97706' }]}>
                  EFT transfers may take 1–2 business days to reflect. Once you've sent the payment, tap below to mark it as submitted.
                </Text>
              </View>

              <TouchableOpacity style={[pmS.cta, { backgroundColor: accentColor }]} onPress={handleEFTConfirm}>
                <Icon name="check-circle" size={17} color="#fff" />
                <Text style={[pmS.ctaTxt, { color: '#fff' }]}>I've Sent the Transfer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: PIN entry ── */}
          {step === 'pin' && (
            <View style={pmS.section}>
              <Text style={[pmS.sectionLabel, { color: colors.mutedForeground }]}>CONFIRM WITH PIN</Text>
              <Text style={[pmS.pinAmount, { color: colors.foreground }]}>R {amount.toLocaleString('en-ZA')}</Text>
              <Text style={[pmS.pinSub, { color: colors.mutedForeground }]}>Enter your 4-digit PIN to authorise</Text>

              <Animated.View style={[pmS.dotsRow, { transform: [{ translateX: shakeX }] }]}>
                {[0,1,2,3].map((i) => <PinDot key={i} filled={pin.length > i} colors={colors} />)}
              </Animated.View>

              {!!pinError && (
                <Text style={[pmS.pinError, { color: '#DC2626' }]}>{pinError}</Text>
              )}

              <View style={pmS.keypad}>
                {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) => (
                  k === '' ? (
                    <View key={i} style={pinStyles.keyPlaceholder} />
                  ) : (
                    <NumKey key={i} label={k} onPress={k === 'del' ? handlePinDel : () => handlePinKey(k)} colors={colors} danger={k === 'del'} />
                  )
                ))}
              </View>

              <TouchableOpacity style={pmS.forgotPin}>
                <Text style={[pmS.forgotTxt, { color: colors.mutedForeground }]}>Forgot PIN? (default: 1234)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 4: Success ── */}
          {step === 'success' && (
            <View style={pmS.successWrap}>
              <Animated.View style={[pmS.successCheck, { backgroundColor: '#16A34A18', transform: [{ scale: checkScale }] }]}>
                <Icon name="check-circle" size={56} color="#16A34A" />
              </Animated.View>

              <Text style={[pmS.successTitle, { color: colors.foreground }]}>Payment Successful</Text>
              <Text style={[pmS.successSub, { color: colors.mutedForeground }]}>
                Your {stokvel.frequency} contribution to {stokvel.name} has been submitted.
              </Text>

              <View style={[pmS.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[pmS.receiptTitle, { color: colors.foreground }]}>Receipt</Text>
                {[
                  { label: 'Reference',  value: refNum },
                  { label: 'Group',      value: stokvel.name },
                  { label: 'Amount',     value: `R ${amount.toLocaleString('en-ZA')}`, color: '#16A34A' },
                  { label: 'Method',     value: method === 'wallet' ? 'StockFair Wallet' : 'EFT / Bank Transfer' },
                  { label: 'Status',     value: method === 'wallet' ? 'Confirmed' : 'Submitted', color: method === 'wallet' ? '#16A34A' : '#D97706' },
                  { label: 'Date',       value: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) },
                ].map((row, i) => (
                  <View key={row.label} style={[pmS.receiptRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <Text style={[pmS.receiptLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[pmS.receiptValue, { color: (row as any).color ?? colors.foreground }]}>{row.value}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[pmS.cta, { backgroundColor: '#16A34A', marginTop: 8 }]} onPress={handleClose}>
                <Icon name="check" size={17} color="#fff" />
                <Text style={[pmS.ctaTxt, { color: '#fff' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ─── Styles ──────────────────────────────────────────── */
const pmS = StyleSheet.create({
  root:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:   { fontSize: 18, fontWeight: '800' },
  headerSub:     { fontSize: 12, marginTop: 2 },
  progressWrap:  { height: 4, width: 60, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2 },
  body:          { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  section:       { gap: 16 },
  sectionLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  amountCard:    { borderRadius: 16, padding: 22, alignItems: 'center', gap: 4 },
  amountCardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  amountCardValue: { color: '#fff', fontSize: 40, fontWeight: '800' },
  amountCardFreq:  { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  methodTile:    { borderRadius: 16, borderWidth: 1.5, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIcon:    { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  methodTitle:   { fontSize: 15, fontWeight: '600' },
  methodSub:     { fontSize: 12, marginTop: 2 },
  badgePill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:      { fontSize: 10, fontWeight: '700' },
  radio:         { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot:      { width: 10, height: 10, borderRadius: 5 },

  warnBanner:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  warnTxt:       { flex: 1, fontSize: 12, lineHeight: 17 },
  infoBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  infoTxt:       { flex: 1, fontSize: 12, lineHeight: 17 },
  cta:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  ctaTxt:        { fontSize: 16, fontWeight: '700' },

  summaryCard:   { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  summaryIconRow:{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  summaryCardTitle:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  summaryRows:   {},
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 16 },
  summaryLabel:  { fontSize: 13 },
  summaryValue:  { fontSize: 13, fontWeight: '600' },

  bankCard:      { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  bankCardHeader:{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 4 },
  bankCardTitle: { fontSize: 15, fontWeight: '700' },
  bankRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14 },
  bankLabel:     { fontSize: 12 },
  bankValue:     { fontSize: 13 },

  pinAmount:     { fontSize: 40, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  pinSub:        { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  dotsRow:       { flexDirection: 'row', justifyContent: 'center', gap: 20, marginVertical: 16 },
  pinError:      { fontSize: 13, textAlign: 'center', marginTop: -8 },
  keypad:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 8 },
  forgotPin:     { alignItems: 'center', marginTop: 4 },
  forgotTxt:     { fontSize: 12 },

  successWrap:   { alignItems: 'center', paddingTop: 40, gap: 14 },
  successCheck:  { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  successTitle:  { fontSize: 26, fontWeight: '800' },
  successSub:    { fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20, marginTop: -4 },
  receiptCard:   { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginTop: 8 },
  receiptTitle:  { fontSize: 14, fontWeight: '700', padding: 14, paddingBottom: 10 },
  receiptRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14 },
  receiptLabel:  { fontSize: 12 },
  receiptValue:  { fontSize: 13, fontWeight: '600' },
});

const pinStyles = StyleSheet.create({
  dot:            { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  key:            { width: 84, height: 64, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  keyTxt:         { fontSize: 26, fontWeight: '400' },
  keyPlaceholder: { width: 84, height: 64 },
});
