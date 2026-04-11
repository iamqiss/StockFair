import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from '@/components/Icon';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStokvel, type StokvelMember } from '@/context/StokvelContext';
import { useAuth } from '@/context/AuthContext';

type Step = 'recipient' | 'details' | 'confirm' | 'success';

interface Props {
  visible: boolean;
  onClose: () => void;
  colors: any;
}

export function RequestPaymentModal({ visible, onClose, colors }: Props) {
  const insets = useSafeAreaInsets();
  const { stokvels, addPaymentRequest } = useStokvel();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('recipient');
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<StokvelMember | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

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
    return allMembers.filter(m => m.name.toLowerCase().includes(q));
  }, [allMembers, search]);

  const parsedAmount = parseFloat(amount) || 0;

  const reset = () => {
    setStep('recipient');
    setSearch('');
    setSelectedMember(null);
    setAmount('');
    setNote('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSendRequest = () => {
    if (!selectedMember) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addPaymentRequest({
      fromName: user?.name || 'You',
      fromId: 'me',
      toName: selectedMember.name,
      toId: selectedMember.id,
      amount: parsedAmount,
      note: note || '',
    });
    setStep('success');
  };

  const stepTitle: Record<Step, string> = {
    recipient: 'Request From',
    details: 'Request Details',
    confirm: 'Confirm Request',
    success: 'Request Sent',
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[st.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 20 : insets.top }]}>
          <View style={st.header}>
            <TouchableOpacity onPress={step === 'recipient' ? handleClose : () => {
              if (step === 'details') setStep('recipient');
              else if (step === 'confirm') setStep('details');
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
                </View>
              ) : (
                filteredMembers.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[st.memberRow, { borderColor: colors.border }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedMember(m);
                      setStep('details');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[st.avatar, { backgroundColor: '#3B82F620' }]}>
                      <Text style={[st.avatarTxt, { color: '#3B82F6' }]}>
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

          {step === 'details' && selectedMember && (
            <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
              <View style={[st.recipientBanner, { backgroundColor: colors.card }]}>
                <View style={[st.avatar, { backgroundColor: '#3B82F620' }]}>
                  <Text style={[st.avatarTxt, { color: '#3B82F6' }]}>
                    {selectedMember.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View>
                  <Text style={[st.recipientName, { color: colors.foreground }]}>{selectedMember.name}</Text>
                  <Text style={[st.memberGroup, { color: colors.mutedForeground }]}>Requesting from</Text>
                </View>
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
                {[50, 100, 200, 500, 1000].map(a => (
                  <TouchableOpacity
                    key={a}
                    style={[st.quickChip, { backgroundColor: parsedAmount === a ? colors.foreground : colors.card, borderColor: colors.border }]}
                    onPress={() => setAmount(a.toString())}
                  >
                    <Text style={[st.quickChipTxt, { color: parsedAmount === a ? colors.background : colors.foreground }]}>R{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[st.label, { color: colors.mutedForeground, marginTop: 16 }]}>Reason</Text>
              <TextInput
                style={[st.noteInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Stokvel contribution, shared expense..."
                placeholderTextColor={colors.mutedForeground}
                value={note}
                onChangeText={setNote}
                multiline
              />

              <TouchableOpacity
                style={[st.primaryBtn, { backgroundColor: parsedAmount > 0 ? colors.foreground : colors.muted }]}
                onPress={() => { if (parsedAmount > 0) setStep('confirm'); }}
                disabled={parsedAmount <= 0}
              >
                <Text style={[st.primaryBtnTxt, { color: parsedAmount > 0 ? colors.background : colors.mutedForeground }]}>Review Request</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {step === 'confirm' && selectedMember && (
            <View style={st.body}>
              <View style={[st.confirmCard, { backgroundColor: colors.card }]}>
                <View style={st.confirmCenter}>
                  <View style={[st.bigAvatar, { backgroundColor: '#3B82F620' }]}>
                    <Icon name="arrow-down-circle" size={32} color="#3B82F6" />
                  </View>
                  <Text style={[st.confirmTitle, { color: colors.foreground }]}>Payment Request</Text>
                </View>

                <View style={st.confirmAmount}>
                  <Text style={[st.confirmCurrency, { color: colors.mutedForeground }]}>R</Text>
                  <Text style={[st.confirmAmtNum, { color: colors.foreground }]}>{parsedAmount.toLocaleString()}</Text>
                </View>

                {[
                  { label: 'From', value: selectedMember.name },
                  { label: 'Reason', value: note || 'No reason provided' },
                ].map(row => (
                  <View key={row.label} style={[st.detailRow, { borderTopColor: colors.border }]}>
                    <Text style={[st.detailLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[st.detailValue, { color: colors.foreground }]}>{row.value}</Text>
                  </View>
                ))}

                <View style={[st.infoBox, { backgroundColor: '#3B82F60F' }]}>
                  <Icon name="info" size={13} color="#3B82F6" />
                  <Text style={[st.infoTxt, { color: '#3B82F6' }]}>
                    {selectedMember.name} will receive a notification and can choose to pay or decline.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[st.primaryBtn, { backgroundColor: '#3B82F6' }]}
                onPress={handleSendRequest}
              >
                <Icon name="send" size={16} color="#fff" />
                <Text style={[st.primaryBtnTxt, { color: '#fff' }]}>Send Request</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'success' && selectedMember && (
            <View style={[st.body, { alignItems: 'center', justifyContent: 'center' }]}>
              <View style={[st.successCircle, { backgroundColor: '#3B82F620' }]}>
                <Icon name="check-circle" size={48} color="#3B82F6" />
              </View>
              <Text style={[st.successTitle, { color: colors.foreground }]}>Request Sent!</Text>
              <Text style={[st.successSub, { color: colors.mutedForeground }]}>
                You requested R {parsedAmount.toLocaleString()} from {selectedMember.name}
              </Text>
              <Text style={[st.successNote, { color: colors.mutedForeground }]}>
                They'll be notified and can pay directly from their wallet.
              </Text>

              <TouchableOpacity style={[st.primaryBtn, { backgroundColor: colors.foreground, width: '100%' }]} onPress={handleClose}>
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
  noteInput:      { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 20 },
  primaryBtnTxt:  { fontSize: 15, fontWeight: '700' },
  confirmCard:    { borderRadius: 16, padding: 20, gap: 4 },
  confirmCenter:  { alignItems: 'center', gap: 8, marginBottom: 12 },
  bigAvatar:      { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  confirmTitle:   { fontSize: 16, fontWeight: '700' },
  confirmAmount:  { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 12 },
  confirmCurrency:{ fontSize: 18, fontWeight: '600' },
  confirmAmtNum:  { fontSize: 36, fontWeight: '800' },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  detailLabel:    { fontSize: 13 },
  detailValue:    { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  infoBox:        { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, marginTop: 8, alignItems: 'flex-start' },
  infoTxt:        { flex: 1, fontSize: 12, lineHeight: 17 },
  successCircle:  { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle:   { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  successSub:     { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  successNote:    { fontSize: 12, textAlign: 'center', marginBottom: 24 },
});
