import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  TextInput, Platform, Animated, KeyboardAvoidingView,
} from 'react-native';
import Icon from '@/components/Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStokvel, type StokvelMember } from '@/context/StokvelContext';

type Step = 'recipient' | 'amount' | 'confirm' | 'pin' | 'success';
const MAX_ATTEMPTS = 3;

interface Props {
  visible: boolean;
  onClose: () => void;
  colors: any;
}

function PinDot({ filled, colors }: { filled: boolean; colors: any }) {
  return (
    <View style={[ps.dot, {
      backgroundColor: filled ? colors.foreground : 'transparent',
      borderColor: filled ? colors.foreground : colors.border,
    }]} />
  );
}

function NumKey({ label, onPress, colors, danger }: { label: string; onPress: () => void; colors: any; danger?: boolean }) {
  return (
    <TouchableOpacity
      style={[ps.key, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {label === 'del' ? (
        <Icon name="delete" size={22} color={danger ? '#DC2626' : colors.foreground} />
      ) : (
        <Text style={[ps.keyTxt, { color: colors.foreground }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function SendMoneyModal({ visible, onClose, colors }: Props) {
  const insets = useSafeAreaInsets();
  const { stokvels, userBalance, sendFunds } = useStokvel();
  const [step, setStep] = useState<Step>('recipient');
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<StokvelMember | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [reference, setReference] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const allMembers = useMemo(() => {
    const seen = new Set<string>();
    const list: (StokvelMember & { groupName: string })[] = [];
    stokvels.forEach(g => {
      g.members.forEach(m => {
        if (!seen.has(m.id) && m.id !== 'me') {
          seen.add(m.id);
          list.push({ ...m, groupName: g.name });
        }
      });
    });
    return list;
  }, [stokvels]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return allMembers;
    const q = search.toLowerCase();
    return allMembers.filter(m => m.name.toLowerCase().includes(q) || m.groupName.toLowerCase().includes(q));
  }, [allMembers, search]);

  const parsedAmount = parseFloat(amount) || 0;
  const hasFunds = parsedAmount > 0 && parsedAmount <= userBalance;

  const reset = () => {
    setStep('recipient');
    setSearch('');
    setSelectedMember(null);
    setAmount('');
    setNote('');
    setPin('');
    setAttempts(0);
    setReference('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handlePinPress = async (digit: string) => {
    if (digit === 'del') { setPin(p => p.slice(0, -1)); return; }
    const next = pin + digit;
    if (next.length > 4) return;
    setPin(next);
    if (next.length === 4) {
      const stored = await AsyncStorage.getItem('@stockfair_pin');
      const correct = stored || '1234';
      if (next === correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const ref = sendFunds(selectedMember!.name, selectedMember!.id, parsedAmount, note || undefined);
        setReference(ref);
        setStep('success');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAttempts(a => a + 1);
        setPin('');
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
        if (attempts + 1 >= MAX_ATTEMPTS) handleClose();
      }
    }
  };

  const stepTitle: Record<Step, string> = {
    recipient: 'Send to',
    amount: 'Enter Amount',
    confirm: 'Confirm Transfer',
    pin: 'Enter PIN',
    success: 'Transfer Complete',
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[st.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 20 : insets.top }]}>
          <View style={st.header}>
            <TouchableOpacity onPress={step === 'recipient' ? handleClose : () => {
              if (step === 'amount') setStep('recipient');
              else if (step === 'confirm') setStep('amount');
              else if (step === 'pin') setStep('confirm');
            }}>
              <Icon name={step === 'recipient' ? 'x' : 'arrow-left'} size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[st.headerTitle, { color: colors.foreground }]}>{stepTitle[step]}</Text>
            <View style={{ width: 22 }} />
          </View>

          {step === 'recipient' && (
            <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
              <View style={[st.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Icon name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[st.searchInput, { color: colors.foreground }]}
                  placeholder="Search members..."
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              {filteredMembers.length === 0 ? (
                <View style={st.emptyState}>
                  <Icon name="users" size={32} color={colors.mutedForeground} />
                  <Text style={[st.emptyTxt, { color: colors.mutedForeground }]}>No members found</Text>
                  <Text style={[st.emptySubTxt, { color: colors.mutedForeground }]}>Join a stokvel to send money to members</Text>
                </View>
              ) : (
                filteredMembers.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[st.memberRow, { borderColor: colors.border }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedMember(m);
                      setStep('amount');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[st.avatar, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[st.avatarTxt, { color: colors.primary }]}>
                        {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.memberName, { color: colors.foreground }]}>{m.name}</Text>
                      <Text style={[st.memberGroup, { color: colors.mutedForeground }]}>{m.groupName}</Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          {step === 'amount' && selectedMember && (
            <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
              <View style={[st.recipientBanner, { backgroundColor: colors.card }]}>
                <View style={[st.avatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[st.avatarTxt, { color: colors.primary }]}>
                    {selectedMember.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <Text style={[st.recipientName, { color: colors.foreground }]}>{selectedMember.name}</Text>
              </View>

              <Text style={[st.label, { color: colors.mutedForeground }]}>Amount</Text>
              <View style={[st.amountBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[st.currency, { color: colors.mutedForeground }]}>R</Text>
                <TextInput
                  style={[st.amountInput, { color: colors.foreground }]}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus
                />
              </View>

              <View style={st.quickAmounts}>
                {[100, 250, 500, 1000, 2000].map(a => (
                  <TouchableOpacity
                    key={a}
                    style={[st.quickChip, { backgroundColor: parsedAmount === a ? colors.foreground : colors.card, borderColor: colors.border }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAmount(a.toString()); }}
                  >
                    <Text style={[st.quickChipTxt, { color: parsedAmount === a ? colors.background : colors.foreground }]}>R{a.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[st.balanceRow, { backgroundColor: colors.card }]}>
                <Icon name="wallet" size={14} color={colors.mutedForeground} />
                <Text style={[st.balanceTxt, { color: colors.mutedForeground }]}>
                  Available: R {userBalance.toLocaleString()}
                </Text>
              </View>

              <Text style={[st.label, { color: colors.mutedForeground, marginTop: 16 }]}>Note (optional)</Text>
              <TextInput
                style={[st.noteInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="What's this for?"
                placeholderTextColor={colors.mutedForeground}
                value={note}
                onChangeText={setNote}
                multiline
              />

              <TouchableOpacity
                style={[st.primaryBtn, { backgroundColor: hasFunds ? colors.foreground : colors.muted }]}
                onPress={() => { if (hasFunds) setStep('confirm'); }}
                disabled={!hasFunds}
              >
                <Text style={[st.primaryBtnTxt, { color: hasFunds ? colors.background : colors.mutedForeground }]}>Continue</Text>
              </TouchableOpacity>

              {parsedAmount > userBalance && parsedAmount > 0 && (
                <Text style={st.errorTxt}>Insufficient wallet balance</Text>
              )}
            </ScrollView>
          )}

          {step === 'confirm' && selectedMember && (
            <View style={st.body}>
              <View style={[st.confirmCard, { backgroundColor: colors.card }]}>
                <View style={st.confirmCenter}>
                  <View style={[st.bigAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[st.bigAvatarTxt, { color: colors.primary }]}>
                      {selectedMember.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <Text style={[st.confirmName, { color: colors.foreground }]}>{selectedMember.name}</Text>
                </View>

                <View style={st.confirmAmount}>
                  <Text style={[st.confirmCurrency, { color: colors.mutedForeground }]}>R</Text>
                  <Text style={[st.confirmAmtNum, { color: colors.foreground }]}>{parsedAmount.toLocaleString()}</Text>
                </View>

                {note ? (
                  <View style={[st.notePreview, { backgroundColor: colors.background }]}>
                    <Icon name="message-circle" size={12} color={colors.mutedForeground} />
                    <Text style={[st.notePreviewTxt, { color: colors.mutedForeground }]}>{note}</Text>
                  </View>
                ) : null}

                {[
                  { label: 'From', value: 'StockFair Wallet' },
                  { label: 'To', value: selectedMember.name },
                  { label: 'Fee', value: 'R 0.00 (Free)' },
                ].map(row => (
                  <View key={row.label} style={[st.detailRow, { borderTopColor: colors.border }]}>
                    <Text style={[st.detailLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[st.detailValue, { color: colors.foreground }]}>{row.value}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[st.primaryBtn, { backgroundColor: colors.foreground }]}
                onPress={() => setStep('pin')}
              >
                <Icon name="lock" size={16} color={colors.background} />
                <Text style={[st.primaryBtnTxt, { color: colors.background }]}>Confirm & Pay</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'pin' && (
            <View style={st.body}>
              <Text style={[st.pinLabel, { color: colors.mutedForeground }]}>Enter your 4-digit PIN to authorise</Text>
              <Animated.View style={[st.dots, { transform: [{ translateX: shakeAnim }] }]}>
                {[0, 1, 2, 3].map(i => <PinDot key={i} filled={pin.length > i} colors={colors} />)}
              </Animated.View>
              {attempts > 0 && <Text style={st.errorTxt}>Incorrect PIN. {MAX_ATTEMPTS - attempts} attempt(s) left.</Text>}
              <View style={st.keypad}>
                {['1','2','3','4','5','6','7','8','9','','0','del'].map(k => (
                  k === '' ? <View key="blank" style={ps.key} /> :
                  <NumKey key={k} label={k} onPress={() => handlePinPress(k)} colors={colors} danger={k === 'del'} />
                ))}
              </View>
            </View>
          )}

          {step === 'success' && selectedMember && (
            <View style={[st.body, { alignItems: 'center', justifyContent: 'center' }]}>
              <View style={[st.successCircle, { backgroundColor: '#16A34A20' }]}>
                <Icon name="check-circle" size={48} color="#16A34A" />
              </View>
              <Text style={[st.successTitle, { color: colors.foreground }]}>Money Sent!</Text>
              <Text style={[st.successSub, { color: colors.mutedForeground }]}>
                R {parsedAmount.toLocaleString()} sent to {selectedMember.name}
              </Text>

              <View style={[st.receiptCard, { backgroundColor: colors.card }]}>
                {[
                  { label: 'Reference', value: reference },
                  { label: 'Amount', value: `R ${parsedAmount.toLocaleString()}` },
                  { label: 'To', value: selectedMember.name },
                  { label: 'Date', value: new Date().toLocaleDateString('en-ZA') },
                  { label: 'Fee', value: 'R 0.00' },
                ].map(row => (
                  <View key={row.label} style={[st.receiptRow, { borderTopColor: colors.border }]}>
                    <Text style={[st.receiptLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[st.receiptValue, { color: colors.foreground }]}>{row.value}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[st.primaryBtn, { backgroundColor: colors.foreground }]} onPress={handleClose}>
                <Text style={[st.primaryBtnTxt, { color: colors.background }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  container:      { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:    { fontSize: 17, fontWeight: '700' },
  body:           { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  searchBox:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  searchInput:    { flex: 1, fontSize: 15 },
  emptyState:     { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt:       { fontSize: 15, fontWeight: '600' },
  emptySubTxt:    { fontSize: 12 },
  memberRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar:         { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:      { fontSize: 14, fontWeight: '700' },
  memberName:     { fontSize: 14, fontWeight: '600' },
  memberGroup:    { fontSize: 11, marginTop: 2 },
  recipientBanner:{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 20 },
  recipientName:  { fontSize: 15, fontWeight: '700' },
  label:          { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  amountBox:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  currency:       { fontSize: 24, fontWeight: '700' },
  amountInput:    { flex: 1, fontSize: 32, fontWeight: '800' },
  quickAmounts:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  quickChip:      { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  quickChipTxt:   { fontSize: 13, fontWeight: '600' },
  balanceRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginTop: 14 },
  balanceTxt:     { fontSize: 12 },
  noteInput:      { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 20 },
  primaryBtnTxt:  { fontSize: 15, fontWeight: '700' },
  errorTxt:       { color: '#DC2626', fontSize: 12, textAlign: 'center', marginTop: 8 },
  confirmCard:    { borderRadius: 16, padding: 20, gap: 4 },
  confirmCenter:  { alignItems: 'center', gap: 8, marginBottom: 12 },
  bigAvatar:      { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  bigAvatarTxt:   { fontSize: 22, fontWeight: '800' },
  confirmName:    { fontSize: 16, fontWeight: '700' },
  confirmAmount:  { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 12 },
  confirmCurrency:{ fontSize: 18, fontWeight: '600' },
  confirmAmtNum:  { fontSize: 36, fontWeight: '800' },
  notePreview:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginBottom: 8 },
  notePreviewTxt: { flex: 1, fontSize: 12, fontStyle: 'italic' },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  detailLabel:    { fontSize: 13 },
  detailValue:    { fontSize: 13, fontWeight: '600' },
  pinLabel:       { textAlign: 'center', fontSize: 14, marginBottom: 24 },
  dots:           { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 },
  keypad:         { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 30 },
  successCircle:  { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle:   { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  successSub:     { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  receiptCard:    { width: '100%', borderRadius: 14, padding: 16, marginBottom: 8 },
  receiptRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  receiptLabel:   { fontSize: 12 },
  receiptValue:   { fontSize: 12, fontWeight: '600' },
});

const ps = StyleSheet.create({
  dot:    { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  key:    { width: 72, height: 52, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  keyTxt: { fontSize: 22, fontWeight: '600' },
});
