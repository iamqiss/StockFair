import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
} from 'react-native';
import Icon from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useStokvel } from '@/context/StokvelContext';

/* ─── Constants ─────────────────────────────────────────── */
const BANKING_KEY = '@stockfair_banking_details';

const SA_BANKS = [
  'Absa Bank', 'Capitec Bank', 'Discovery Bank', 'FNB',
  'Investec', 'Nedbank', 'Standard Bank', 'TymeBank', 'African Bank',
];

const ACCOUNT_TYPES = ['Cheque / Current', 'Savings', 'Transmission'];

type BankingDetails = {
  bank: string;
  accountNumber: string;
  accountType: string;
  branchCode: string;
  accountHolder: string;
};

type Step = 'check' | 'banking' | 'amount' | 'confirm' | 'success';

/* ─── Step indicator ─────────────────────────────────────── */
function StepDots({ current, total, colors }: { current: number; total: number; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === current ? colors.foreground : colors.border,
          }}
        />
      ))}
    </View>
  );
}

/* ─── Bank picker row ────────────────────────────────────── */
function Picker({ label, options, value, onChange, colors }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; colors: any;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[ds.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TouchableOpacity
        style={[ds.input, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={[ds.inputText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {value || `Select ${label}`}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
      {open && (
        <View style={[ds.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[ds.pickerOption, { borderBottomColor: colors.border }]}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text style={[ds.pickerOptionText, { color: colors.foreground }]}>{opt}</Text>
              {value === opt && <Icon name="check" size={14} color={colors.foreground} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export function DepositModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { depositFunds } = useStokvel();

  const [step, setStep]           = useState<Step>('check');
  const [loading, setLoading]     = useState(false);
  const [banking, setBanking]     = useState<BankingDetails>({ bank: '', accountNumber: '', accountType: '', branchCode: '', accountHolder: '' });
  const [amount, setAmount]       = useState('');
  const [ref, setRef]             = useState('');
  const successScale              = useRef(new Animated.Value(0)).current;

  /* Reload banking details every time modal opens */
  useEffect(() => {
    if (!visible) return;
    setStep('check');
    setAmount('');
    setRef('');
    setLoading(true);
    AsyncStorage.getItem(BANKING_KEY).then((raw) => {
      if (raw) {
        try { setBanking(JSON.parse(raw)); } catch {}
        setStep('amount');
      } else {
        setStep('banking');
      }
      setLoading(false);
    });
  }, [visible]);

  const saveBanking = async () => {
    if (!banking.bank || !banking.accountNumber || !banking.accountType || !banking.branchCode || !banking.accountHolder) return;
    await AsyncStorage.setItem(BANKING_KEY, JSON.stringify(banking));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('amount');
  };

  const confirmDeposit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const num = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (num > 0) depositFunds?.(num);
    setLoading(false);
    setStep('success');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  };

  const canNextBanking = banking.bank && banking.accountNumber.length >= 8 && banking.accountType && banking.branchCode.length >= 4 && banking.accountHolder.length >= 3;
  const parsedAmount   = parseFloat(amount.replace(/[^0-9.]/g, ''));
  const canNextAmount  = !isNaN(parsedAmount) && parsedAmount >= 50;

  const totalSteps = step === 'banking' || step === 'amount' || step === 'confirm' ? (banking.accountNumber ? 2 : 3) : 0;

  const handleClose = () => {
    Animated.timing(successScale, { toValue: 0, duration: 0, useNativeDriver: true }).start();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[ds.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>

          {/* Header */}
          <View style={[ds.header, { borderBottomColor: colors.border }]}>
            <View style={[ds.headerIcon, { backgroundColor: colors.foreground }]}>
              <Icon name="arrow-down-circle" size={20} color={colors.background} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ds.headerTitle, { color: colors.foreground }]}>Deposit Funds</Text>
              {step === 'banking' && <Text style={[ds.headerSub, { color: colors.mutedForeground }]}>Save your banking details once</Text>}
              {step === 'amount' && <Text style={[ds.headerSub, { color: colors.mutedForeground }]}>How much would you like to add?</Text>}
              {step === 'confirm' && <Text style={[ds.headerSub, { color: colors.mutedForeground }]}>Review your deposit</Text>}
            </View>
            <TouchableOpacity onPress={handleClose} style={[ds.closeBtn, { backgroundColor: colors.muted }]}>
              <Icon name="x" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {loading && step === 'check' ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={colors.foreground} />
            </View>
          ) : step === 'success' ? (
            /* ── Success screen ── */
            <View style={ds.successContainer}>
              <Animated.View style={[ds.successCircle, { backgroundColor: colors.foreground, transform: [{ scale: successScale }] }]}>
                <Icon name="check" size={40} color={colors.background} />
              </Animated.View>
              <Text style={[ds.successTitle, { color: colors.foreground }]}>Deposit Initiated</Text>
              <Text style={[ds.successSub, { color: colors.mutedForeground }]}>
                R {parsedAmount.toLocaleString('en-ZA')} will reflect in your StockFair wallet within 1–3 business days once received from {banking.bank}.
              </Text>
              <View style={[ds.successRef, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[ds.successRefLabel, { color: colors.mutedForeground }]}>Reference</Text>
                <Text style={[ds.successRefValue, { color: colors.foreground }]}>SF-{Date.now().toString().slice(-8)}</Text>
              </View>
              <TouchableOpacity
                style={[ds.primaryBtn, { backgroundColor: colors.foreground, marginTop: 24 }]}
                onPress={handleClose}
              >
                <Text style={[ds.primaryBtnText, { color: colors.background }]}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={ds.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Step dots */}
              {totalSteps > 1 && (
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <StepDots
                    current={step === 'banking' ? 0 : step === 'amount' ? (banking.bank ? 0 : 1) : (banking.bank ? 1 : 2)}
                    total={totalSteps}
                    colors={colors}
                  />
                </View>
              )}

              {/* ── Step: Banking details ── */}
              {step === 'banking' && (
                <>
                  <View style={[ds.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Icon name="shield" size={15} color={colors.mutedForeground} />
                    <Text style={[ds.infoText, { color: colors.mutedForeground }]}>
                      Your banking details are stored securely on this device. StockFair never charges your account directly — you initiate the EFT.
                    </Text>
                  </View>

                  <Text style={[ds.fieldLabel, { color: colors.mutedForeground }]}>Account Holder Name</Text>
                  <TextInput
                    style={[ds.input, ds.inputText, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="Full name as on bank account"
                    placeholderTextColor={colors.mutedForeground}
                    value={banking.accountHolder}
                    onChangeText={(v) => setBanking((b) => ({ ...b, accountHolder: v }))}
                    autoCapitalize="words"
                  />

                  <Picker label="Bank" options={SA_BANKS} value={banking.bank} onChange={(v) => setBanking((b) => ({ ...b, bank: v }))} colors={colors} />
                  <Picker label="Account Type" options={ACCOUNT_TYPES} value={banking.accountType} onChange={(v) => setBanking((b) => ({ ...b, accountType: v }))} colors={colors} />

                  <Text style={[ds.fieldLabel, { color: colors.mutedForeground }]}>Account Number</Text>
                  <TextInput
                    style={[ds.input, ds.inputText, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="e.g. 1234567890"
                    placeholderTextColor={colors.mutedForeground}
                    value={banking.accountNumber}
                    onChangeText={(v) => setBanking((b) => ({ ...b, accountNumber: v.replace(/\D/g, '') }))}
                    keyboardType="number-pad"
                    maxLength={16}
                  />

                  <Text style={[ds.fieldLabel, { color: colors.mutedForeground }]}>Branch Code</Text>
                  <TextInput
                    style={[ds.input, ds.inputText, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="e.g. 632005"
                    placeholderTextColor={colors.mutedForeground}
                    value={banking.branchCode}
                    onChangeText={(v) => setBanking((b) => ({ ...b, branchCode: v.replace(/\D/g, '') }))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  <TouchableOpacity
                    style={[ds.primaryBtn, { backgroundColor: canNextBanking ? colors.foreground : colors.muted, marginTop: 8 }]}
                    onPress={canNextBanking ? saveBanking : undefined}
                    activeOpacity={canNextBanking ? 0.85 : 1}
                  >
                    <Text style={[ds.primaryBtnText, { color: canNextBanking ? colors.background : colors.mutedForeground }]}>
                      Save & Continue
                    </Text>
                    <Icon name="arrow-right" size={16} color={canNextBanking ? colors.background : colors.mutedForeground} />
                  </TouchableOpacity>
                </>
              )}

              {/* ── Step: Amount ── */}
              {step === 'amount' && (
                <>
                  {/* Saved bank badge */}
                  <View style={[ds.bankBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[ds.bankBadgeIcon, { backgroundColor: colors.muted }]}>
                      <Icon name="credit-card" size={14} color={colors.foreground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[ds.bankBadgeName, { color: colors.foreground }]}>{banking.bank}</Text>
                      <Text style={[ds.bankBadgeSub, { color: colors.mutedForeground }]}>
                        {banking.accountType} · ···{banking.accountNumber.slice(-4)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setStep('banking')}>
                      <Text style={[{ color: colors.foreground, fontSize: 12, fontWeight: '600' }]}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Big amount input */}
                  <View style={[ds.amountBox, { borderColor: colors.border }]}>
                    <Text style={[ds.amountPrefix, { color: colors.mutedForeground }]}>R</Text>
                    <TextInput
                      style={[ds.amountInput, { color: colors.foreground }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.muted}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                  </View>
                  <Text style={[ds.amountHint, { color: colors.mutedForeground }]}>Minimum deposit R50</Text>

                  {/* Quick amount chips */}
                  <View style={ds.quickAmounts}>
                    {['500', '1 000', '2 500', '5 000'].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[ds.quickChip, { borderColor: colors.border, backgroundColor: amount === v.replace(' ', '') ? colors.foreground : colors.card }]}
                        onPress={() => setAmount(v.replace(' ', ''))}
                      >
                        <Text style={[ds.quickChipText, { color: amount === v.replace(' ', '') ? colors.background : colors.foreground }]}>
                          R{v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[ds.fieldLabel, { color: colors.mutedForeground, marginTop: 8 }]}>Payment reference (optional)</Text>
                  <TextInput
                    style={[ds.input, ds.inputText, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="e.g. Savings contribution"
                    placeholderTextColor={colors.mutedForeground}
                    value={ref}
                    onChangeText={setRef}
                  />

                  <TouchableOpacity
                    style={[ds.primaryBtn, { backgroundColor: canNextAmount ? colors.foreground : colors.muted }]}
                    onPress={canNextAmount ? () => setStep('confirm') : undefined}
                    activeOpacity={canNextAmount ? 0.85 : 1}
                  >
                    <Text style={[ds.primaryBtnText, { color: canNextAmount ? colors.background : colors.mutedForeground }]}>
                      Review Deposit
                    </Text>
                    <Icon name="arrow-right" size={16} color={canNextAmount ? colors.background : colors.mutedForeground} />
                  </TouchableOpacity>
                </>
              )}

              {/* ── Step: Confirm ── */}
              {step === 'confirm' && (
                <>
                  <View style={[ds.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Row label="From" value={`${banking.bank} ···${banking.accountNumber.slice(-4)}`} colors={colors} />
                    <Row label="Account type" value={banking.accountType} colors={colors} />
                    <Row label="To" value="StockFair Wallet" colors={colors} accent />
                    <Row label="Amount" value={`R ${parsedAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} colors={colors} large />
                    {ref ? <Row label="Reference" value={ref} colors={colors} /> : null}
                    <Row label="Arrives" value="1–3 business days" colors={colors} />
                  </View>

                  <View style={[ds.infoBox, { backgroundColor: colors.muted, borderColor: colors.border, marginTop: 0, marginBottom: 20 }]}>
                    <Icon name="info" size={14} color={colors.mutedForeground} />
                    <Text style={[ds.infoText, { color: colors.mutedForeground }]}>
                      Make an EFT to the StockFair trust account using your ID number as reference. Funds reflect once payment is confirmed.
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[ds.secondaryBtn, { borderColor: colors.border, flex: 1 }]}
                      onPress={() => setStep('amount')}
                    >
                      <Text style={[ds.secondaryBtnText, { color: colors.foreground }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[ds.primaryBtn, { backgroundColor: colors.foreground, flex: 2 }]}
                      onPress={confirmDeposit}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.background} size="small" />
                      ) : (
                        <>
                          <Text style={[ds.primaryBtnText, { color: colors.background }]}>Confirm Deposit</Text>
                          <Icon name="check" size={16} color={colors.background} />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({ label, value, colors, accent, large }: { label: string; value: string; colors: any; accent?: boolean; large?: boolean }) {
  return (
    <View style={[ds.confirmRow, { borderBottomColor: colors.border }]}>
      <Text style={[ds.confirmLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[ds.confirmValue, { color: accent ? '#16A34A' : colors.foreground, fontSize: large ? 18 : 14, fontWeight: large ? '800' : '600' }]}>
        {value}
      </Text>
    </View>
  );
}

const ds = StyleSheet.create({
  sheet:         { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerIcon:    { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  headerSub:     { fontSize: 12, marginTop: 1 },
  closeBtn:      { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  body:          { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  fieldLabel:    { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  input:         { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  inputText:     { fontSize: 15, fontWeight: '500' },
  pickerDropdown:{ borderRadius: 12, borderWidth: 1, marginTop: -12, marginBottom: 16, overflow: 'hidden' },
  pickerOption:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerOptionText: { fontSize: 15 },
  infoBox:       { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20, alignItems: 'flex-start' },
  infoText:      { flex: 1, fontSize: 12, lineHeight: 18 },
  bankBadge:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 24 },
  bankBadgeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  bankBadgeName: { fontSize: 14, fontWeight: '700' },
  bankBadgeSub:  { fontSize: 12, marginTop: 1 },
  amountBox:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 2, paddingBottom: 8, marginBottom: 8 },
  amountPrefix:  { fontSize: 32, fontWeight: '800' },
  amountInput:   { flex: 1, fontSize: 52, fontWeight: '800', letterSpacing: -2 },
  amountHint:    { fontSize: 12, marginBottom: 20 },
  quickAmounts:  { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  quickChip:     { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontWeight: '700' },
  primaryBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16, marginBottom: 12 },
  primaryBtnText:{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  secondaryBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5, marginBottom: 12 },
  secondaryBtnText:{ fontSize: 15, fontWeight: '700' },
  confirmCard:   { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  confirmRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  confirmLabel:  { fontSize: 13 },
  confirmValue:  { fontSize: 14, fontWeight: '600' },
  successContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingTop: 20 },
  successCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle:  { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 12 },
  successSub:    { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  successRef:    { borderRadius: 12, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', alignSelf: 'stretch' },
  successRefLabel:{ fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  successRefValue:{ fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
});
