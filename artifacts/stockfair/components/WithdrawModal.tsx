import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
} from 'react-native';
import Icon from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useStokvel, Stokvel } from '@/context/StokvelContext';

/* ─── Constants ─────────────────────────────────────────── */
const BANKING_KEY = '@stockfair_banking_details';

const EARLY_WITHDRAWAL_PENALTY = 0.05; // 5% of amount withdrawn from stokvel
const NOTICE_DAYS              = 30;

type Source = 'balance' | string; // string = stokvel id
type Step   = 'source' | 'amount' | 'notice' | 'confirm' | 'success';

/* ─── Source tile ───────────────────────────────────────── */
function SourceTile({
  selected, onPress, icon, title, subtitle, value, accent, warn, colors,
}: {
  selected: boolean; onPress: () => void; icon: any; title: string; subtitle: string;
  value: string; accent?: boolean; warn?: boolean; colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        ws.sourceTile,
        {
          backgroundColor: selected ? colors.foreground : colors.card,
          borderColor: selected ? colors.foreground : warn ? '#DC262630' : colors.border,
        },
      ]}
    >
      <View style={[ws.sourceTileIcon, { backgroundColor: selected ? colors.background + '20' : colors.muted }]}>
        <Icon name={icon} size={18} color={selected ? colors.background : accent ? '#16A34A' : colors.foreground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ws.sourceTileTitle, { color: selected ? colors.background : colors.foreground }]}>{title}</Text>
        <Text style={[ws.sourceTileSub, { color: selected ? colors.background + 'AA' : colors.mutedForeground }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[ws.sourceTileValue, { color: selected ? colors.background : accent ? '#16A34A' : colors.foreground }]}>{value}</Text>
        {warn && !selected && (
          <View style={ws.warnBadge}>
            <Text style={ws.warnBadgeText}>30-day notice</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export function WithdrawModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { stokvels, userBalance, withdrawFunds } = useStokvel();

  const [step, setStep]         = useState<Step>('source');
  const [source, setSource]     = useState<Source>('balance');
  const [amount, setAmount]     = useState('');
  const [reason, setReason]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [bankName, setBankName] = useState('');
  const successScale            = useRef(new Animated.Value(0)).current;

  const isBalanceSource = source === 'balance';
  const selectedStokvel = isBalanceSource ? null : stokvels.find((s) => s.id === source) ?? null;
  const parsedAmount    = parseFloat(amount.replace(/[^0-9.]/g, ''));
  const penalty         = !isBalanceSource && !isNaN(parsedAmount) ? parsedAmount * EARLY_WITHDRAWAL_PENALTY : 0;
  const netAmount       = !isNaN(parsedAmount) ? parsedAmount - penalty : 0;

  const maxAmount = isBalanceSource ? userBalance : (selectedStokvel?.totalSaved ?? 0) / selectedStokvel?.members.length ?? 0;
  const canNextAmount = !isNaN(parsedAmount) && parsedAmount >= 50 && parsedAmount <= maxAmount;

  useEffect(() => {
    if (!visible) return;
    setStep('source');
    setAmount('');
    setReason('');
    setSource('balance');
    Animated.timing(successScale, { toValue: 0, duration: 0, useNativeDriver: true }).start();
    AsyncStorage.getItem(BANKING_KEY).then((raw) => {
      if (raw) { try { setBankName(JSON.parse(raw).bank); } catch {} }
    });
  }, [visible]);

  const handleAmountNext = () => {
    if (!canNextAmount) return;
    if (!isBalanceSource) {
      setStep('notice');
    } else {
      setStep('confirm');
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    withdrawFunds?.(parsedAmount);
    setLoading(false);
    setStep('success');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  };

  const handleClose = () => {
    Animated.timing(successScale, { toValue: 0, duration: 0, useNativeDriver: true }).start();
    onClose();
  };

  const stepTitle = {
    source:  'Choose Source',
    amount:  'Enter Amount',
    notice:  '30-Day Notice',
    confirm: 'Review Withdrawal',
    success: '',
  }[step];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[ws.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>

          {/* Header */}
          {step !== 'success' && (
            <View style={[ws.header, { borderBottomColor: colors.border }]}>
              <View style={[ws.headerIcon, { backgroundColor: colors.foreground }]}>
                <Icon name="arrow-up-circle" size={20} color={colors.background} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ws.headerTitle, { color: colors.foreground }]}>Withdraw</Text>
                <Text style={[ws.headerSub, { color: colors.mutedForeground }]}>{stepTitle}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={[ws.closeBtn, { backgroundColor: colors.muted }]}>
                <Icon name="x" size={16} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          )}

          {step === 'success' ? (
            /* ── Success ── */
            <View style={ws.successContainer}>
              <Animated.View style={[ws.successCircle, { backgroundColor: colors.foreground, transform: [{ scale: successScale }] }]}>
                <Icon name="check" size={40} color={colors.background} />
              </Animated.View>
              <Text style={[ws.successTitle, { color: colors.foreground }]}>
                {isBalanceSource ? 'Withdrawal Submitted' : 'Notice Lodged'}
              </Text>
              <Text style={[ws.successSub, { color: colors.mutedForeground }]}>
                {isBalanceSource
                  ? `R ${netAmount.toLocaleString('en-ZA')} will be transferred to${bankName ? ` ${bankName}` : ' your bank account'} within 1–3 business days.`
                  : `Your 30-day withdrawal notice for ${selectedStokvel?.name} has been registered. Funds of R ${netAmount.toLocaleString('en-ZA')} (after 5% early-exit fee) will be released on ${new Date(Date.now() + NOTICE_DAYS * 86400000).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                }
              </Text>
              {!isBalanceSource && (
                <View style={[ws.noticeReminder, { backgroundColor: '#DC262610', borderColor: '#DC262630' }]}>
                  <Icon name="clock" size={14} color="#DC2626" />
                  <Text style={[ws.noticeReminderText, { color: '#DC2626' }]}>
                    Other members have been notified. Your contributions remain due during the notice period.
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[ws.primaryBtn, { backgroundColor: colors.foreground, marginTop: 28, alignSelf: 'stretch' }]}
                onPress={handleClose}
              >
                <Text style={[ws.primaryBtnText, { color: colors.background }]}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={ws.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Step: Source ── */}
              {step === 'source' && (
                <>
                  <Text style={[ws.sectionLabel, { color: colors.mutedForeground }]}>Available Balance</Text>
                  <SourceTile
                    selected={source === 'balance'}
                    onPress={() => setSource('balance')}
                    icon="zap"
                    title="StockFair Wallet"
                    subtitle="Instant transfer to your bank"
                    value={`R ${userBalance.toLocaleString('en-ZA')}`}
                    accent
                    colors={colors}
                  />

                  {stokvels.length > 0 && (
                    <>
                      <Text style={[ws.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>Stokvel Funds</Text>
                      <View style={[ws.stokvelWarning, { backgroundColor: '#D9770610', borderColor: '#D9770630' }]}>
                        <Icon name="alert-triangle" size={13} color="#D97706" />
                        <Text style={[ws.stokvelWarningText, { color: '#D97706' }]}>
                          Stokvel withdrawals require 30 days' written notice and carry a 5% early-exit fee to protect other members as per the signed constitution.
                        </Text>
                      </View>
                      {stokvels.map((s) => {
                        const myShare = Math.round(s.totalSaved / s.members.length);
                        return (
                          <SourceTile
                            key={s.id}
                            selected={source === s.id}
                            onPress={() => setSource(s.id)}
                            icon="users"
                            title={s.name}
                            subtitle={`${s.members.length} members · ${s.type}`}
                            value={`R ${myShare.toLocaleString('en-ZA')}`}
                            warn
                            colors={colors}
                          />
                        );
                      })}
                    </>
                  )}

                  <TouchableOpacity
                    style={[ws.primaryBtn, { backgroundColor: colors.foreground, marginTop: 24 }]}
                    onPress={() => setStep('amount')}
                  >
                    <Text style={[ws.primaryBtnText, { color: colors.background }]}>Continue</Text>
                    <Icon name="arrow-right" size={16} color={colors.background} />
                  </TouchableOpacity>
                </>
              )}

              {/* ── Step: Amount ── */}
              {step === 'amount' && (
                <>
                  {/* Source badge */}
                  <View style={[ws.sourceBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Icon name={isBalanceSource ? 'zap' : 'users'} size={14} color={colors.foreground} />
                    <Text style={[ws.sourceBadgeText, { color: colors.foreground }]}>
                      {isBalanceSource ? `StockFair Wallet — R ${userBalance.toLocaleString('en-ZA')} available` : `${selectedStokvel?.name ?? 'Stokvel'} — 30-day notice applies`}
                    </Text>
                  </View>

                  <View style={[ws.amountBox, { borderColor: colors.foreground }]}>
                    <Text style={[ws.amountPrefix, { color: colors.mutedForeground }]}>R</Text>
                    <TextInput
                      style={[ws.amountInput, { color: colors.foreground }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.muted}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                  </View>

                  <Text style={[ws.amountHint, { color: colors.mutedForeground }]}>
                    Max R {maxAmount.toLocaleString('en-ZA')} · Minimum R50
                  </Text>

                  {/* Quick amounts */}
                  <View style={ws.quickAmounts}>
                    {['500', '1 000', '2 500'].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[ws.quickChip, { borderColor: colors.border, backgroundColor: amount === v.replace(' ', '') ? colors.foreground : colors.card }]}
                        onPress={() => setAmount(v.replace(' ', ''))}
                      >
                        <Text style={[ws.quickChipText, { color: amount === v.replace(' ', '') ? colors.background : colors.foreground }]}>
                          R{v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[ws.quickChip, { borderColor: colors.border, backgroundColor: amount === String(Math.floor(maxAmount)) ? colors.foreground : colors.card }]}
                      onPress={() => setAmount(String(Math.floor(maxAmount)))}
                    >
                      <Text style={[ws.quickChipText, { color: amount === String(Math.floor(maxAmount)) ? colors.background : colors.foreground }]}>All</Text>
                    </TouchableOpacity>
                  </View>

                  {!isBalanceSource && !isNaN(parsedAmount) && parsedAmount > 0 && (
                    <View style={[ws.penaltyBox, { backgroundColor: '#DC262610', borderColor: '#DC262630' }]}>
                      <View style={ws.penaltyRow}>
                        <Text style={[ws.penaltyLabel, { color: '#DC2626' }]}>Withdrawal amount</Text>
                        <Text style={[ws.penaltyValue, { color: '#DC2626' }]}>R {parsedAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text>
                      </View>
                      <View style={ws.penaltyRow}>
                        <Text style={[ws.penaltyLabel, { color: '#DC2626' }]}>Early-exit fee (5%)</Text>
                        <Text style={[ws.penaltyValue, { color: '#DC2626' }]}>− R {penalty.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text>
                      </View>
                      <View style={[ws.penaltyDivider, { backgroundColor: '#DC262640' }]} />
                      <View style={ws.penaltyRow}>
                        <Text style={[ws.penaltyLabel, { color: '#DC2626', fontWeight: '800' }]}>You receive</Text>
                        <Text style={[ws.penaltyValue, { color: '#DC2626', fontWeight: '800', fontSize: 16 }]}>R {netAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text>
                      </View>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[ws.secondaryBtn, { borderColor: colors.border, flex: 1 }]}
                      onPress={() => setStep('source')}
                    >
                      <Text style={[ws.secondaryBtnText, { color: colors.foreground }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[ws.primaryBtn, { backgroundColor: canNextAmount ? colors.foreground : colors.muted, flex: 2 }]}
                      onPress={handleAmountNext}
                      activeOpacity={canNextAmount ? 0.85 : 1}
                    >
                      <Text style={[ws.primaryBtnText, { color: canNextAmount ? colors.background : colors.mutedForeground }]}>
                        {isBalanceSource ? 'Review' : 'See Notice Terms'}
                      </Text>
                      <Icon name="arrow-right" size={16} color={canNextAmount ? colors.background : colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* ── Step: 30-day notice ── */}
              {step === 'notice' && (
                <>
                  <View style={[ws.noticeHero, { borderColor: '#D97706' }]}>
                    <View style={[ws.noticeIconWrap, { backgroundColor: '#D9770618' }]}>
                      <Icon name="clock" size={28} color="#D97706" />
                    </View>
                    <Text style={[ws.noticeTitle, { color: colors.foreground }]}>30-Day Notice Required</Text>
                    <Text style={[ws.noticeSub, { color: colors.mutedForeground }]}>
                      As per the {selectedStokvel?.name} constitution you signed, withdrawing stokvel funds requires 30 days' written notice to protect all members.
                    </Text>
                  </View>

                  <View style={[ws.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ConfirmRow label="Stokvel" value={selectedStokvel?.name ?? '—'} colors={colors} />
                    <ConfirmRow label="Requested amount" value={`R ${parsedAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} colors={colors} />
                    <ConfirmRow label="Early-exit fee (5%)" value={`− R ${penalty.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} colors={colors} warn />
                    <ConfirmRow label="Net payout" value={`R ${netAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} colors={colors} large />
                    <ConfirmRow
                      label="Earliest release date"
                      value={new Date(Date.now() + NOTICE_DAYS * 86400000).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      colors={colors}
                    />
                  </View>

                  <Text style={[ws.sectionLabel, { color: colors.mutedForeground }]}>Reason for withdrawal</Text>
                  <TextInput
                    style={[ws.reasonInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="e.g. Personal emergency, medical expenses…"
                    placeholderTextColor={colors.mutedForeground}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={3}
                  />

                  <View style={[ws.constitutionNote, { backgroundColor: colors.muted }]}>
                    <Icon name="file-text" size={13} color={colors.mutedForeground} />
                    <Text style={[ws.constitutionNoteText, { color: colors.mutedForeground }]}>
                      By proceeding, you confirm this notice to all {selectedStokvel?.members.length} members. Your contributions remain due during the notice period. Defaulting forfeits your position.
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <TouchableOpacity
                      style={[ws.secondaryBtn, { borderColor: colors.border, flex: 1 }]}
                      onPress={() => setStep('amount')}
                    >
                      <Text style={[ws.secondaryBtnText, { color: colors.foreground }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[ws.primaryBtn, { backgroundColor: colors.foreground, flex: 2 }]}
                      onPress={() => setStep('confirm')}
                    >
                      <Text style={[ws.primaryBtnText, { color: colors.background }]}>Lodge Notice</Text>
                      <Icon name="arrow-right" size={16} color={colors.background} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* ── Step: Confirm ── */}
              {step === 'confirm' && (
                <>
                  <View style={[ws.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ConfirmRow label="From" value={isBalanceSource ? 'StockFair Wallet' : (selectedStokvel?.name ?? '—')} colors={colors} />
                    <ConfirmRow label="To" value={bankName ? `${bankName} (your account)` : 'Your bank account'} colors={colors} />
                    <ConfirmRow label="Amount" value={`R ${parsedAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} colors={colors} />
                    {penalty > 0 && <ConfirmRow label="Early-exit fee" value={`− R ${penalty.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} colors={colors} warn />}
                    <ConfirmRow label="You receive" value={`R ${netAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} colors={colors} large />
                    <ConfirmRow label="Arrives" value={isBalanceSource ? '1–3 business days' : '30 days from today'} colors={colors} />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[ws.secondaryBtn, { borderColor: colors.border, flex: 1 }]}
                      onPress={() => setStep(isBalanceSource ? 'amount' : 'notice')}
                    >
                      <Text style={[ws.secondaryBtnText, { color: colors.foreground }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[ws.primaryBtn, { backgroundColor: colors.foreground, flex: 2 }]}
                      onPress={handleConfirm}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.background} size="small" />
                      ) : (
                        <>
                          <Text style={[ws.primaryBtnText, { color: colors.background }]}>
                            {isBalanceSource ? 'Confirm Withdrawal' : 'Confirm & Notify Members'}
                          </Text>
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

function ConfirmRow({ label, value, colors, warn, large }: { label: string; value: string; colors: any; warn?: boolean; large?: boolean }) {
  return (
    <View style={[ws.confirmRow, { borderBottomColor: colors.border }]}>
      <Text style={[ws.confirmLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[ws.confirmValue, { color: warn ? '#DC2626' : colors.foreground, fontSize: large ? 17 : 14, fontWeight: large ? '800' : '600' }]}>
        {value}
      </Text>
    </View>
  );
}

const ws = StyleSheet.create({
  sheet:             { flex: 1 },
  header:            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerIcon:        { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle:       { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  headerSub:         { fontSize: 12, marginTop: 1 },
  closeBtn:          { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  body:              { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  sectionLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  sourceTile:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 10 },
  sourceTileIcon:    { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  sourceTileTitle:   { fontSize: 14, fontWeight: '700' },
  sourceTileSub:     { fontSize: 12, marginTop: 1 },
  sourceTileValue:   { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  warnBadge:         { backgroundColor: '#DC262618', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  warnBadgeText:     { fontSize: 9, fontWeight: '700', color: '#DC2626', letterSpacing: 0.2 },
  stokvelWarning:    { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  stokvelWarningText:{ flex: 1, fontSize: 11, lineHeight: 17, color: '#D97706' },
  sourceBadge:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 20 },
  sourceBadgeText:   { fontSize: 13, fontWeight: '600', flex: 1 },
  amountBox:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 2, paddingBottom: 8, marginBottom: 8 },
  amountPrefix:      { fontSize: 32, fontWeight: '800' },
  amountInput:       { flex: 1, fontSize: 52, fontWeight: '800', letterSpacing: -2 },
  amountHint:        { fontSize: 12, marginBottom: 20 },
  quickAmounts:      { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  quickChip:         { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  quickChipText:     { fontSize: 13, fontWeight: '700' },
  penaltyBox:        { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8, gap: 6 },
  penaltyRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  penaltyLabel:      { fontSize: 13 },
  penaltyValue:      { fontSize: 13, fontWeight: '700' },
  penaltyDivider:    { height: 1, marginVertical: 4 },
  noticeHero:        { alignItems: 'center', padding: 24, borderRadius: 20, borderWidth: 1.5, marginBottom: 20, borderStyle: 'dashed' },
  noticeIconWrap:    { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  noticeTitle:       { fontSize: 18, fontWeight: '800', letterSpacing: -0.4, marginBottom: 8, textAlign: 'center' },
  noticeSub:         { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  confirmCard:       { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  confirmRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  confirmLabel:      { fontSize: 13 },
  confirmValue:      { fontSize: 14, fontWeight: '600' },
  reasonInput:       { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  constitutionNote:  { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 12 },
  constitutionNoteText:{ flex: 1, fontSize: 11, lineHeight: 17 },
  primaryBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16, marginBottom: 12 },
  primaryBtnText:    { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  secondaryBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5, marginBottom: 12 },
  secondaryBtnText:  { fontSize: 15, fontWeight: '700' },
  noticeReminder:    { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 16, marginBottom: 8 },
  noticeReminderText:{ flex: 1, fontSize: 12, lineHeight: 18 },
  successContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingTop: 20 },
  successCircle:     { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle:      { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 12 },
  successSub:        { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 16 },
});
