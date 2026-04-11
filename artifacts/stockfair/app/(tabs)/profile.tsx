import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Switch,
  Dimensions,
  Share,
  Animated,
  Image,
  Alert,
} from 'react-native';
import Icon from '@/components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage, Language } from '@/context/LanguageContext';
import { LANGUAGE_NAMES } from '@/constants/i18n';
import { useAuth } from '@/context/AuthContext';
import { useStokvel } from '@/context/StokvelContext';

const KYC_STATUS_KEY = '@stockfair_kyc_status';
type KYCStatus = 'none' | 'submitted' | 'verified';

const LANGUAGES: Language[] = ['en', 'zu', 'xh', 'af', 'ns', 'st', 'tn', 've', 'ts', 'ss', 'nr'];

/* ─── Fair Score ─────────────────────────────────────── */
const FAIR_SCORE = 762;
const SCORE_FACTORS = [
  { label: 'Payment History',   weight: '40%', score: 95, icon: 'check-circle' as const, desc: 'On-time payment rate across all stokvels' },
  { label: 'Consistency',       weight: '25%', score: 88, icon: 'bar-chart-2'  as const, desc: 'Months without missing a contribution' },
  { label: 'Group Activity',    weight: '20%', score: 80, icon: 'users'        as const, desc: 'Active participation in stokvel groups' },
  { label: 'Member Tenure',     weight: '15%', score: 72, icon: 'clock'        as const, desc: 'Length of membership across stokvels' },
];

function getScoreTier(score: number): { label: string; color: string } {
  if (score >= 780) return { label: 'Excellent', color: '#16A34A' };
  if (score >= 720) return { label: 'Very Good', color: '#22C55E' };
  if (score >= 620) return { label: 'Good',       color: '#737373' };
  if (score >= 500) return { label: 'Fair',        color: '#9E9E9E' };
  return               { label: 'Poor',        color: '#E53E3E' };
}

function FairScoreCard({ colors }: { colors: any }) {
  const tier = getScoreTier(FAIR_SCORE);
  const pct = (FAIR_SCORE - 350) / 500;
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  return (
    <View style={[styles.fairCard, { backgroundColor: colors.card }]}>
      <TouchableOpacity style={styles.fairHeader} onPress={() => router.push('/fairscore')} activeOpacity={0.8}>
        <View>
          <Text style={[styles.fairTitle, { color: colors.foreground }]}>Fair Score</Text>
          <Text style={[styles.fairSub, { color: colors.mutedForeground }]}>Transparent trustworthiness rating</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.tierBadge, { backgroundColor: tier.color + '18', borderColor: tier.color + '40', borderWidth: 1 }]}>
            <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
      <View style={styles.fairScoreRow}>
        <Text style={[styles.fairScoreNum, { color: colors.foreground }]}>{FAIR_SCORE}</Text>
        <Text style={[styles.fairScoreMax, { color: colors.mutedForeground }]}>/850</Text>
      </View>
      <View style={styles.gaugeWrapper}>
        <LinearGradient
          colors={['#E74C3C', '#E67E22', '#FFBF00', '#27AE60', '#1DB954']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.gaugeBar}
        />
        <View style={[styles.gaugeMarker, { left: `${pct * 100}%` as any, borderColor: tier.color }]}>
          <View style={[styles.gaugeMarkerDot, { backgroundColor: tier.color }]} />
        </View>
        <View style={styles.gaugeLabels}>
          <Text style={[styles.gaugeRangeLabel, { color: colors.mutedForeground }]}>Poor</Text>
          <Text style={[styles.gaugeRangeLabel, { color: colors.mutedForeground }]}>Excellent</Text>
        </View>
      </View>
      <View style={[styles.factorsDivider, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.factorsToggle} onPress={() => setExpanded(!expanded)}>
          <Text style={[styles.factorsToggleText, { color: colors.mutedForeground }]}>Score breakdown</Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
        {expanded && (
          <View style={{ gap: 12, paddingTop: 4 }}>
            {SCORE_FACTORS.map((f) => {
              const fc = getScoreTier(350 + f.score * 5);
              return (
                <View key={f.label} style={styles.factorRow}>
                  <View style={[styles.factorIcon, { backgroundColor: fc.color + '18' }]}>
                    <Icon name={f.icon} size={14} color={fc.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.factorTopRow}>
                      <Text style={[styles.factorLabel, { color: colors.foreground }]}>{f.label}</Text>
                      <Text style={[styles.factorWeight, { color: colors.mutedForeground }]}>{f.weight}</Text>
                      <Text style={[styles.factorScore, { color: fc.color }]}>{f.score}/100</Text>
                    </View>
                    <Text style={[styles.factorDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
                    <View style={[styles.factorTrack, { backgroundColor: colors.muted }]}>
                      <View style={[styles.factorFill, { width: `${f.score}%` as any, backgroundColor: fc.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
            <View style={[styles.fairInfo, { backgroundColor: colors.muted }]}>
              <Icon name="info" size={13} color={colors.mutedForeground} />
              <Text style={[styles.fairInfoText, { color: colors.mutedForeground }]}>
                Score updates monthly. Paying on time is the fastest way to improve it.
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/* ─── Auto-pay Modal ─────────────────────────────────── */
function AutoPayModal({
  visible, onClose, enabled, setEnabled, day, setDay, colors,
}: {
  visible: boolean; onClose: () => void;
  enabled: boolean; setEnabled: (v: boolean) => void;
  day: number; setDay: (v: number) => void;
  colors: any;
}) {
  const paymentMethods = ['FNB Cheque ••• 4821', 'Standard Bank ••• 2340', 'Capitec ••• 9901'];
  const [selectedMethod, setSelectedMethod] = useState(0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.langModal, { backgroundColor: colors.background }]}>
        <View style={styles.langModalHeader}>
          <Text style={[styles.langModalTitle, { color: colors.foreground }]}>Auto-pay</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="x" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>
          Automatically deduct your stokvel contributions so you never miss a payment.
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Master toggle */}
          <View style={[autoStyles.toggleCard, { backgroundColor: colors.card, borderColor: enabled ? colors.primary + '60' : colors.border }]}>
            <View style={[autoStyles.toggleIcon, { backgroundColor: enabled ? colors.primary + '18' : colors.muted }]}>
              <Icon name="zap" size={20} color={enabled ? colors.primary : colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[autoStyles.toggleTitle, { color: colors.foreground }]}>Enable Auto-pay</Text>
              <Text style={[autoStyles.toggleSub, { color: colors.mutedForeground }]}>
                {enabled ? 'Contributions will deduct automatically' : 'Tap to enable automatic payments'}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEnabled(v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {enabled && (
            <>
              {/* Deduction day */}
              <Text style={[autoStyles.sectionHead, { color: colors.mutedForeground }]}>Deduction Day</Text>
              <View style={[autoStyles.dayCard, { backgroundColor: colors.card }]}>
                <Text style={[autoStyles.dayDesc, { color: colors.mutedForeground }]}>
                  Deduct on day <Text style={{ color: colors.foreground, fontWeight: '700' }}>{day}</Text> of each month
                </Text>
                <View style={autoStyles.dayGrid}>
                  {[1,5,10,15,20,25,28].map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[autoStyles.dayPill, {
                        backgroundColor: day === d ? colors.primary : colors.muted,
                        borderColor: day === d ? colors.primary : colors.border,
                      }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDay(d); }}
                    >
                      <Text style={[autoStyles.dayPillText, { color: day === d ? '#fff' : colors.mutedForeground }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={[autoStyles.warningRow, { backgroundColor: colors.muted }]}>
                  <Icon name="info" size={12} color={colors.mutedForeground} />
                  <Text style={[autoStyles.warningText, { color: colors.mutedForeground }]}>
                    Ensure sufficient funds by day {day} to avoid missed contributions
                  </Text>
                </View>
              </View>

              {/* Payment method */}
              <Text style={[autoStyles.sectionHead, { color: colors.mutedForeground }]}>Payment Method</Text>
              <View style={[autoStyles.methodCard, { backgroundColor: colors.card }]}>
                {paymentMethods.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    style={[autoStyles.methodRow, i < paymentMethods.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedMethod(i); }}
                  >
                    <View style={[autoStyles.methodIcon, { backgroundColor: colors.muted }]}>
                      <Icon name="credit-card" size={16} color={colors.foreground} />
                    </View>
                    <Text style={[autoStyles.methodLabel, { color: colors.foreground }]}>{m}</Text>
                    {selectedMethod === i
                      ? <Icon name="check-circle" size={18} color={colors.success} />
                      : <View style={[autoStyles.radioOuter, { borderColor: colors.border }]} />
                    }
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[autoStyles.addMethodBtn, { borderColor: colors.border }]}>
                  <Icon name="plus" size={16} color={colors.mutedForeground} />
                  <Text style={[autoStyles.addMethodText, { color: colors.mutedForeground }]}>Link new bank account</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); }}
        >
          <Text style={styles.confirmBtnText}>{enabled ? 'Save Auto-pay Settings' : 'Close'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const autoStyles = StyleSheet.create({
  toggleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 20 },
  toggleIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '600' },
  toggleSub: { fontSize: 12, marginTop: 2 },
  sectionHead: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  dayCard: { borderRadius: 14, padding: 16, marginBottom: 20, gap: 12 },
  dayDesc: { fontSize: 13 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  dayPillText: { fontSize: 13, fontWeight: '600' },
  warningRow: { flexDirection: 'row', gap: 7, padding: 10, borderRadius: 10, alignItems: 'flex-start' },
  warningText: { flex: 1, fontSize: 11, lineHeight: 15 },
  methodCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  methodRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  methodIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  methodLabel: { flex: 1, fontSize: 14 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  addMethodBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
  addMethodText: { fontSize: 13 },
});

/* ─── Notification Settings Modal ───────────────────── */
type NotifKey = 'contribution' | 'payout' | 'groupUpdates' | 'marketplace' | 'overdue' | 'newMember';

const NOTIF_ITEMS: { key: NotifKey; icon: string; label: string; desc: string }[] = [
  { key: 'contribution', icon: 'dollar-sign', label: 'Contribution Reminders',  desc: 'Remind me before my payment is due' },
  { key: 'payout',       icon: 'trending-up', label: 'Payout Alerts',           desc: 'Notify when my payout is ready' },
  { key: 'overdue',      icon: 'alert-circle', label: 'Overdue Warnings',       desc: 'Alert me if I have missed payments' },
  { key: 'groupUpdates', icon: 'users',        label: 'Group Activity',         desc: 'Updates from my stokvel groups' },
  { key: 'newMember',    icon: 'user-plus',    label: 'New Member Joined',      desc: 'When someone joins my stokvel' },
  { key: 'marketplace',  icon: 'tag',          label: 'Marketplace Deals',      desc: 'New bulk deals for my groups' },
];

const REMINDER_OPTIONS = ['1 day before', '3 days before', '5 days before', '1 week before'];

function NotifSettingsModal({
  visible, onClose, toggles, setToggles, reminderTiming, setReminderTiming, colors,
}: {
  visible: boolean; onClose: () => void;
  toggles: Record<NotifKey, boolean>; setToggles: (v: Record<NotifKey, boolean>) => void;
  reminderTiming: number; setReminderTiming: (v: number) => void;
  colors: any;
}) {
  const toggle = (key: NotifKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToggles({ ...toggles, [key]: !toggles[key] });
  };

  const enabledCount = Object.values(toggles).filter(Boolean).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.langModal, { backgroundColor: colors.background }]}>
        <View style={styles.langModalHeader}>
          <Text style={[styles.langModalTitle, { color: colors.foreground }]}>Notifications</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="x" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>
          {enabledCount} of {NOTIF_ITEMS.length} notifications enabled
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Contribution reminder timing */}
          {toggles.contribution && (
            <>
              <Text style={[autoStyles.sectionHead, { color: colors.mutedForeground }]}>Reminder Timing</Text>
              <View style={[notifStyles.timingCard, { backgroundColor: colors.card }]}>
                {REMINDER_OPTIONS.map((opt, i) => (
                  <TouchableOpacity
                    key={opt}
                    style={[notifStyles.timingRow, i < REMINDER_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReminderTiming(i); }}
                  >
                    <Text style={[notifStyles.timingLabel, { color: colors.foreground }]}>{opt}</Text>
                    {reminderTiming === i
                      ? <Icon name="check-circle" size={18} color={colors.success} />
                      : <View style={[notifStyles.radioOuter, { borderColor: colors.border }]} />
                    }
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* All notification types */}
          <Text style={[autoStyles.sectionHead, { color: colors.mutedForeground }]}>Notification Types</Text>
          <View style={[notifStyles.notifCard, { backgroundColor: colors.card }]}>
            {NOTIF_ITEMS.map((item, idx) => (
              <View
                key={item.key}
                style={[
                  notifStyles.notifRow,
                  idx < NOTIF_ITEMS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <View style={[notifStyles.notifIcon, { backgroundColor: toggles[item.key] ? colors.primary + '14' : colors.muted }]}>
                  <Icon name={item.icon} size={16} color={toggles[item.key] ? colors.primary : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[notifStyles.notifLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[notifStyles.notifDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                <Switch
                  value={toggles[item.key]}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                  style={{ transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] }}
                />
              </View>
            ))}
          </View>

          {/* Push notification permission note */}
          <View style={[notifStyles.permNote, { backgroundColor: colors.muted }]}>
            <Icon name="bell" size={13} color={colors.mutedForeground} />
            <Text style={[notifStyles.permNoteText, { color: colors.mutedForeground }]}>
              Make sure StockFair has notification permission in your device settings for alerts to appear.
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); }}
        >
          <Text style={styles.confirmBtnText}>Save Preferences</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const notifStyles = StyleSheet.create({
  timingCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  timingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  timingLabel: { fontSize: 14 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  notifCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  notifRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  notifIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  notifLabel: { fontSize: 14, fontWeight: '500' },
  notifDesc: { fontSize: 11, marginTop: 2 },
  permNote: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, marginBottom: 8, alignItems: 'flex-start' },
  permNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
});

/* ─── Persistence keys ──────────────────────────────────── */
const AUTOPAY_KEY  = '@stockfair_autopay';
const NOTIFS_KEY   = '@stockfair_notifs';
const BIOMETRIC_KEY= '@stockfair_biometric';
const PIN_KEY      = '@stockfair_pin';
const BANKING_KEY  = '@stockfair_banking_details';

/* ─── Change PIN Modal ──────────────────────────────────── */
type PinStep = 'current' | 'new' | 'confirm';

function PinPad({ value, onChange, colors }: { value: string; onChange: (v: string) => void; colors: any }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <View style={{ gap: 12 }}>
      {/* Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
        {[0,1,2,3].map((i) => (
          <View key={i} style={[pinS.dot, { backgroundColor: i < value.length ? colors.foreground : colors.border }]} />
        ))}
      </View>
      {/* Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {keys.map((k, i) => (
          k === '' ? <View key={i} style={pinS.keyEmpty} /> :
          <TouchableOpacity
            key={i}
            style={[pinS.key, { backgroundColor: k === '⌫' ? colors.muted : colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (k === '⌫') onChange(value.slice(0, -1));
              else if (value.length < 4) onChange(value + k);
            }}
            activeOpacity={0.7}
          >
            <Text style={[pinS.keyText, { color: colors.foreground }]}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const pinS = StyleSheet.create({
  dot:      { width: 16, height: 16, borderRadius: 8 },
  key:      { width: 80, height: 56, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  keyEmpty: { width: 80, height: 56 },
  keyText:  { fontSize: 22, fontWeight: '600' },
});

function ChangePINModal({ visible, onClose, colors }: { visible: boolean; onClose: () => void; colors: any }) {
  const insets = useSafeAreaInsets();
  const [step, setStep]       = useState<PinStep>('current');
  const [pin,  setPin]        = useState('');
  const [newPin, setNewPin]   = useState('');
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);
  const shakeAnim             = useRef(new Animated.Value(0)).current;

  useEffect(() => { if (!visible) { setStep('current'); setPin(''); setNewPin(''); setError(''); setDone(false); } }, [visible]);

  const shake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (pin.length < 4 && step === 'current') return;
    if (newPin.length < 4 && (step === 'new' || step === 'confirm')) return;

    const advance = async () => {
      if (step === 'current') {
        const stored = await AsyncStorage.getItem(PIN_KEY) ?? '1234';
        if (pin !== stored) { setError('Incorrect PIN. Try again.'); shake(); setPin(''); }
        else { setError(''); setStep('new'); setPin(''); }
      } else if (step === 'new') {
        setError(''); setStep('confirm'); setNewPin(pin); setPin('');
      } else {
        if (pin !== newPin) { setError('PINs don\'t match. Try again.'); shake(); setPin(''); }
        else {
          await AsyncStorage.setItem(PIN_KEY, pin);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setDone(true);
        }
      }
    };

    const timer = setTimeout(advance, 180);
    return () => clearTimeout(timer);
  }, [pin, newPin, step]);

  const stepLabel = { current: 'Enter Current PIN', new: 'Enter New PIN', confirm: 'Confirm New PIN' }[step];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.langModal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.langModalHeader}>
          <Text style={[styles.langModalTitle, { color: colors.foreground }]}>Change PIN</Text>
          <TouchableOpacity onPress={onClose}><Icon name="x" size={24} color={colors.foreground} /></TouchableOpacity>
        </View>

        {done ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <View style={[{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.foreground, justifyContent: 'center', alignItems: 'center' }]}>
              <Icon name="check" size={38} color={colors.background} />
            </View>
            <Text style={[styles.langModalTitle, { color: colors.foreground }]}>PIN Updated</Text>
            <Text style={[styles.langModalSub, { color: colors.mutedForeground, textAlign: 'center' }]}>Your new 4-digit PIN is active.</Text>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.foreground, marginTop: 8, alignSelf: 'stretch' }]} onPress={onClose}>
              <Text style={[styles.confirmBtnText, { color: colors.background }]}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', paddingTop: 32, gap: 8 }}>
              <Text style={[{ fontSize: 15, fontWeight: '600', color: colors.foreground }]}>{stepLabel}</Text>
              {error ? <Text style={{ color: '#DC2626', fontSize: 13 }}>{error}</Text> : null}
            </View>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <PinPad value={pin} onChange={setPin} colors={colors} />
            </Animated.View>
            <View />
          </View>
        )}
      </View>
    </Modal>
  );
}

/* ─── Linked Accounts Modal ─────────────────────────────── */
function LinkedAccountsModal({ visible, onClose, colors }: { visible: boolean; onClose: () => void; colors: any }) {
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(BANKING_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setAccounts([{ id: 'primary', ...parsed, isPrimary: true }]);
        } catch { setAccounts([]); }
      } else {
        setAccounts([]);
      }
    });
  }, [visible]);

  const handleRemove = async (id: string) => {
    setRemoving(id);
    await new Promise((r) => setTimeout(r, 600));
    if (id === 'primary') await AsyncStorage.removeItem(BANKING_KEY);
    setAccounts((a) => a.filter((acc) => acc.id !== id));
    setRemoving(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.langModal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.langModalHeader}>
          <Text style={[styles.langModalTitle, { color: colors.foreground }]}>Linked Accounts</Text>
          <TouchableOpacity onPress={onClose}><Icon name="x" size={24} color={colors.foreground} /></TouchableOpacity>
        </View>
        <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>
          Your bank accounts for deposits and withdrawals
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {accounts.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
              <Icon name="credit-card" size={40} color={colors.mutedForeground} />
              <Text style={[{ fontSize: 16, fontWeight: '600', color: colors.foreground }]}>No accounts linked</Text>
              <Text style={[{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center' }]}>
                Use Deposit to add your banking details
              </Text>
            </View>
          ) : (
            accounts.map((acc) => (
              <View key={acc.id} style={[linkedS.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[linkedS.icon, { backgroundColor: colors.muted }]}>
                  <Icon name="credit-card" size={22} color={colors.foreground} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[linkedS.bankName, { color: colors.foreground }]}>{acc.bank}</Text>
                    {acc.isPrimary && (
                      <View style={[linkedS.primaryBadge, { backgroundColor: colors.foreground + '14', borderColor: colors.border }]}>
                        <Text style={[linkedS.primaryBadgeText, { color: colors.foreground }]}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[linkedS.accountType, { color: colors.mutedForeground }]}>
                    {acc.accountType} · ···{acc.accountNumber?.slice(-4) ?? '????'}
                  </Text>
                  {acc.accountHolder && (
                    <Text style={[linkedS.holder, { color: colors.mutedForeground }]}>{acc.accountHolder}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[linkedS.removeBtn, { backgroundColor: '#DC262614', borderColor: '#DC262630' }]}
                  onPress={() => handleRemove(acc.id)}
                >
                  <Icon name={removing === acc.id ? 'loader' : 'trash-2'} size={14} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={[linkedS.infoBox, { backgroundColor: colors.muted }]}>
            <Icon name="shield" size={13} color={colors.mutedForeground} />
            <Text style={[linkedS.infoText, { color: colors.mutedForeground }]}>
              Account details are stored locally on your device and are never shared without your explicit consent.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const linkedS = StyleSheet.create({
  card:          { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  icon:          { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  bankName:      { fontSize: 15, fontWeight: '700' },
  accountType:   { fontSize: 12 },
  holder:        { fontSize: 11 },
  primaryBadge:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  primaryBadgeText:{ fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  removeBtn:     { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  infoBox:       { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, marginTop: 8 },
  infoText:      { flex: 1, fontSize: 11, lineHeight: 17 },
});

/* ─── Statements Modal ──────────────────────────────────── */
type StatRange = 'month' | '3months' | 'year' | 'all';
const RANGES: { key: StatRange; label: string }[] = [
  { key: 'month',   label: 'This Month' },
  { key: '3months', label: 'Last 3 Months' },
  { key: 'year',    label: 'This Year' },
  { key: 'all',     label: 'All Time' },
];

function StatementsModal({ visible, onClose, colors }: { visible: boolean; onClose: () => void; colors: any }) {
  const insets  = useSafeAreaInsets();
  const { transactions } = useStokvel();
  const { user } = useAuth();
  const [range, setRange] = useState<StatRange>('month');
  const [sharing, setSharing] = useState(false);

  const now  = new Date();
  const cutoff = range === 'month'
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : range === '3months'
    ? new Date(now.getFullYear(), now.getMonth() - 3, 1)
    : range === 'year'
    ? new Date(now.getFullYear(), 0, 1)
    : new Date(0);

  const filtered  = transactions.filter((tx) => new Date(tx.date) >= cutoff);
  const isCredit  = (tx: any) => tx.type === 'payout';
  const credits   = filtered.filter(isCredit).reduce((s, tx) => s + tx.amount, 0);
  const debits    = filtered.filter((tx) => !isCredit(tx)).reduce((s, tx) => s + tx.amount, 0);
  const net       = credits - debits;

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? '';

  const handleShare = async () => {
    setSharing(true);
    const lines = [
      `StockFair Statement — ${rangeLabel}`,
      `Account: ${user?.name ?? 'Member'}`,
      `Generated: ${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      ``,
      `SUMMARY`,
      `Total Credits:  R ${credits.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `Total Debits:   R ${debits.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `Net:            R ${net.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      ``,
      `TRANSACTIONS (${filtered.length})`,
      ...filtered.map((tx) => {
        const d = new Date(tx.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
        const sign = tx.type === 'payout' ? '+' : '-';
        return `${d}  ${sign}R ${tx.amount.toLocaleString('en-ZA')}  ${tx.description}`;
      }),
      ``,
      `StockFair · Boloka mmogo, gola mmogo`,
    ];
    try {
      await Share.share({ message: lines.join('\n'), title: `StockFair Statement — ${rangeLabel}` });
    } catch {}
    setSharing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.langModal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.langModalHeader}>
          <Text style={[styles.langModalTitle, { color: colors.foreground }]}>Statements</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={handleShare}
              style={[statS.shareBtn, { backgroundColor: colors.foreground }]}
            >
              <Icon name={sharing ? 'loader' : 'share'} size={15} color={colors.background} />
              <Text style={[statS.shareBtnText, { color: colors.background }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}><Icon name="x" size={24} color={colors.foreground} /></TouchableOpacity>
          </View>
        </View>

        {/* Range chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, marginBottom: 16 }}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[statS.rangeChip, { backgroundColor: range === r.key ? colors.foreground : colors.card, borderColor: range === r.key ? colors.foreground : colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRange(r.key); }}
            >
              <Text style={[statS.rangeChipText, { color: range === r.key ? colors.background : colors.foreground }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary */}
        <View style={[statS.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={statS.summaryRow}>
            <View style={statS.summaryItem}>
              <Text style={[statS.summaryLabel, { color: colors.mutedForeground }]}>Credits</Text>
              <Text style={[statS.summaryValue, { color: '#16A34A' }]}>+R {credits.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={[statS.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={statS.summaryItem}>
              <Text style={[statS.summaryLabel, { color: colors.mutedForeground }]}>Debits</Text>
              <Text style={[statS.summaryValue, { color: '#DC2626' }]}>-R {debits.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={[statS.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={statS.summaryItem}>
              <Text style={[statS.summaryLabel, { color: colors.mutedForeground }]}>Net</Text>
              <Text style={[statS.summaryValue, { color: colors.foreground }]}>R {net.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        {/* Transactions */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
              <Icon name="inbox" size={36} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontSize: 14 }]}>No transactions in this period</Text>
            </View>
          ) : (
            filtered.map((tx, i) => {
              const credit = tx.type === 'payout';
              return (
              <View key={tx.id} style={[statS.txRow, { borderBottomColor: colors.border, borderBottomWidth: i < filtered.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
                <View style={[statS.txIcon, { backgroundColor: credit ? '#16A34A14' : '#DC262614' }]}>
                  <Icon name={credit ? 'arrow-down-left' : 'arrow-up-right'} size={14} color={credit ? '#16A34A' : '#DC2626'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[statS.txDesc, { color: colors.foreground }]}>{tx.description}</Text>
                  <Text style={[statS.txDate, { color: colors.mutedForeground }]}>
                    {new Date(tx.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={[statS.txAmount, { color: credit ? '#16A34A' : '#DC2626' }]}>
                  {credit ? '+' : '-'}R {tx.amount.toLocaleString('en-ZA')}
                </Text>
              </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
const statS = StyleSheet.create({
  shareBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  shareBtnText:   { fontSize: 13, fontWeight: '700' },
  rangeChip:      { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  rangeChipText:  { fontSize: 13, fontWeight: '600' },
  summaryCard:    { borderRadius: 14, borderWidth: 1, marginBottom: 16, padding: 16 },
  summaryRow:     { flexDirection: 'row', alignItems: 'center' },
  summaryItem:    { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: { width: 1, height: 32 },
  summaryLabel:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  summaryValue:   { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  txRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  txIcon:         { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txDesc:         { fontSize: 14, fontWeight: '500' },
  txDate:         { fontSize: 11, marginTop: 1 },
  txAmount:       { fontSize: 14, fontWeight: '700' },
});

/* ─── Help Modal ────────────────────────────────────────── */
const FAQ_ITEMS = [
  { q: 'What is a stokvel?',                    a: 'A stokvel is a rotating savings and credit association (ROSCA) common in South Africa. Members contribute a fixed amount regularly, and the total pot is paid out to each member in turn.' },
  { q: 'How does the Fair Score work?',          a: 'Your Fair Score (350–850) reflects your payment reliability across all stokvels. Payment history makes up 40%, consistency 25%, group activity 20%, and member tenure 15%. It updates monthly.' },
  { q: 'Is my money safe?',                      a: 'StockFair does not hold your funds. All contributions are managed within your stokvel group. We provide the platform — the trust is built within your group, protected by the signed constitution.' },
  { q: 'What is FICA/CDD verification?',         a: 'FICA (Financial Intelligence Centre Act) requires us to verify your identity. You\'ll need your SA ID, a proof of address (not older than 3 months), and a selfie. This unlocks contributions over R5,000.' },
  { q: 'Can I leave a stokvel?',                 a: 'Yes, but stokvel withdrawals require 30 days\' written notice and carry a 5% early-exit fee to protect the remaining members, as stated in your signed constitution.' },
  { q: 'How do investment stokvels work?',       a: 'Investment stokvels pool contributions into a registered investment vehicle (Money Market, Property, or JSE Top 40 ETF). Returns are shared proportionally. StockFair charges a fee on returns only — never on principal.' },
  { q: 'What happens if a member doesn\'t pay?', a: 'Overdue members are flagged in the group and their Fair Score is impacted. Three consecutive missed payments trigger a vote to remove the member per the group constitution.' },
  { q: 'How do I contact support?',             a: 'Email us at support@stockfair.co.za or WhatsApp 0860 STOCKFAIR. We respond within 1 business day.' },
];

function HelpModal({ visible, onClose, colors }: { visible: boolean; onClose: () => void; colors: any }) {
  const insets = useSafeAreaInsets();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.langModal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.langModalHeader}>
          <Text style={[styles.langModalTitle, { color: colors.foreground }]}>Help & FAQs</Text>
          <TouchableOpacity onPress={onClose}><Icon name="x" size={24} color={colors.foreground} /></TouchableOpacity>
        </View>
        <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>Common questions about StockFair</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={[helpS.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {FAQ_ITEMS.map((item, i) => (
              <View key={i} style={[i < FAQ_ITEMS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                  style={helpS.faqRow}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOpenIdx(openIdx === i ? null : i); }}
                  activeOpacity={0.7}
                >
                  <Text style={[helpS.faqQ, { color: colors.foreground, flex: 1 }]}>{item.q}</Text>
                  <Icon name={openIdx === i ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
                {openIdx === i && (
                  <View style={[helpS.faqAnswer, { backgroundColor: colors.muted }]}>
                    <Text style={[helpS.faqA, { color: colors.mutedForeground }]}>{item.a}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Contact cards */}
          <Text style={[autoStyles.sectionHead, { color: colors.mutedForeground, marginTop: 20 }]}>Contact Support</Text>
          {[
            { icon: 'mail',      label: 'Email Support',   sub: 'support@stockfair.co.za',  color: colors.foreground },
            { icon: 'message-circle', label: 'WhatsApp',   sub: '0860 STOCKFAIR',           color: '#25D366' },
          ].map((c) => (
            <TouchableOpacity
              key={c.label}
              style={[helpS.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <View style={[helpS.contactIcon, { backgroundColor: c.color + '14' }]}>
                <Icon name={c.icon as any} size={20} color={c.color} />
              </View>
              <View>
                <Text style={[helpS.contactLabel, { color: colors.foreground }]}>{c.label}</Text>
                <Text style={[helpS.contactSub, { color: colors.mutedForeground }]}>{c.sub}</Text>
              </View>
              <Icon name="external-link" size={15} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ))}

          <View style={[linkedS.infoBox, { backgroundColor: colors.muted, marginTop: 12 }]}>
            <Icon name="info" size={13} color={colors.mutedForeground} />
            <Text style={[linkedS.infoText, { color: colors.mutedForeground }]}>
              Response time: 1 business day · Hours: Mon–Fri 08:00–17:00 SAST
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const helpS = StyleSheet.create({
  faqCard:     { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  faqRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  faqQ:        { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  faqAnswer:   { paddingHorizontal: 16, paddingBottom: 14, borderRadius: 0 },
  faqA:        { fontSize: 13, lineHeight: 20 },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  contactIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  contactLabel:{ fontSize: 14, fontWeight: '700' },
  contactSub:  { fontSize: 12, marginTop: 1 },
});

/* ─── Security Storage Keys ─────────────────────────────── */
const MFA_KEY   = '@stockfair_mfa';
const LOCKS_KEY = '@stockfair_feature_locks';
const FRAUD_KEY = '@stockfair_fraud_shield';

/* ─── PIN Gate Modal (for Feature Lock) ─────────────────── */
function PinGateModal({
  visible, onClose, onSuccess, colors,
}: { visible: boolean; onClose: () => void; onSuccess: () => void; colors: any }) {
  const insets   = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { if (!visible) { setPin(''); setError(''); } }, [visible]);

  useEffect(() => {
    if (pin.length < 4) return;
    const verify = async () => {
      const stored = await AsyncStorage.getItem(PIN_KEY) ?? '1234';
      if (pin === stored) { setPin(''); onSuccess(); }
      else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 6, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
        ]).start();
        setError('Wrong PIN'); setPin('');
      }
    };
    const t = setTimeout(verify, 150);
    return () => clearTimeout(t);
  }, [pin]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={gateS.overlay}>
        <View style={[gateS.sheet, { backgroundColor: colors.background }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[{ fontSize: 20, fontWeight: '700', color: colors.foreground }]}>PIN Required</Text>
            <TouchableOpacity onPress={onClose}><Icon name="x" size={22} color={colors.mutedForeground} /></TouchableOpacity>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 28 }}>This feature is protected. Enter your PIN to continue.</Text>
          {error ? <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{error}</Text> : null}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <PinPad value={pin} onChange={setPin} colors={colors} />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
const gateS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
});

/* ─── MFA Setup Modal ────────────────────────────────────── */
type MFAMethod = 'totp' | 'sms';
type MFAStep   = 'status' | 'choose' | 'setup' | 'verify' | 'success';
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

function MFASetupModal({
  visible, onClose, colors,
}: { visible: boolean; onClose: () => void; colors: any }) {
  const insets = useSafeAreaInsets();
  const [step,   setStep]   = useState<MFAStep>('status');
  const [method, setMethod] = useState<MFAMethod>('totp');
  const [smsPhone, setSmsPhone] = useState('');
  const [code,   setCode]   = useState('');
  const [error,  setError]  = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMethod,  setMfaMethod]  = useState<MFAMethod | null>(null);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(MFA_KEY).then((raw) => {
      if (raw) {
        try { const d = JSON.parse(raw); setMfaEnabled(d.enabled ?? false); setMfaMethod(d.method ?? null); } catch {}
      }
      setStep('status'); setCode(''); setError('');
    });
  }, [visible]);

  const handleVerify = async () => {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    const data = { enabled: true, method, phone: smsPhone, verified: true };
    await AsyncStorage.setItem(MFA_KEY, JSON.stringify(data));
    setMfaEnabled(true); setMfaMethod(method); setStep('success');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDisable = async () => {
    await AsyncStorage.setItem(MFA_KEY, JSON.stringify({ enabled: false }));
    setMfaEnabled(false); setMfaMethod(null); setStep('status');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.langModal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.langModalHeader}>
          <Text style={[styles.langModalTitle, { color: colors.foreground }]}>Multi-Factor Auth</Text>
          <TouchableOpacity onPress={onClose}><Icon name="x" size={24} color={colors.foreground} /></TouchableOpacity>
        </View>

        {/* STATUS VIEW */}
        {step === 'status' && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {mfaEnabled ? (
              <>
                <View style={[mfaS.statusCard, { backgroundColor: '#16A34A14', borderColor: '#16A34A40' }]}>
                  <Icon name="shield" size={28} color="#16A34A" />
                  <View style={{ flex: 1 }}>
                    <Text style={[mfaS.statusTitle, { color: '#16A34A' }]}>MFA is Active</Text>
                    <Text style={[mfaS.statusSub, { color: colors.mutedForeground }]}>
                      Method: {mfaMethod === 'totp' ? 'Authenticator App (TOTP)' : 'SMS One-Time Password'}
                    </Text>
                  </View>
                </View>
                <View style={[mfaS.infoBox, { backgroundColor: colors.muted }]}>
                  <Icon name="info" size={13} color={colors.mutedForeground} />
                  <Text style={[mfaS.infoText, { color: colors.mutedForeground }]}>
                    Every login will now require a verification code in addition to your PIN. This protects your account even if your PIN is compromised.
                  </Text>
                </View>
                <TouchableOpacity style={[mfaS.methodCard, { borderColor: '#DC262630', backgroundColor: '#DC262608' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep('choose'); }}>
                  <Icon name="refresh-cw" size={18} color="#DC2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={[mfaS.methodLabel, { color: '#DC2626' }]}>Change MFA Method</Text>
                    <Text style={[mfaS.methodSub, { color: colors.mutedForeground }]}>Switch to a different verification type</Text>
                  </View>
                  <Icon name="chevron-right" size={16} color="#DC2626" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logoutBtn, { borderColor: '#DC262640', marginTop: 16 }]}
                  onPress={handleDisable}
                >
                  <Icon name="shield-off" size={16} color="#DC2626" />
                  <Text style={[{ color: '#DC2626', fontWeight: '700', fontSize: 15 }]}>Disable MFA</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[mfaS.statusCard, { backgroundColor: '#D9770614', borderColor: '#D9770640' }]}>
                  <Icon name="shield-off" size={28} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={[mfaS.statusTitle, { color: '#D97706' }]}>MFA is Not Enabled</Text>
                    <Text style={[mfaS.statusSub, { color: colors.mutedForeground }]}>Add a second layer of security to protect your account.</Text>
                  </View>
                </View>
                <View style={[mfaS.infoBox, { backgroundColor: colors.muted }]}>
                  <Icon name="info" size={13} color={colors.mutedForeground} />
                  <Text style={[mfaS.infoText, { color: colors.mutedForeground }]}>
                    MFA adds a verification code step on login. Even if someone steals your PIN, they cannot access your account without your second factor.
                  </Text>
                </View>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.foreground, marginTop: 8 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep('choose'); }}>
                  <Text style={[styles.confirmBtnText, { color: colors.background }]}>Set Up MFA</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        )}

        {/* CHOOSE METHOD */}
        {step === 'choose' && (
          <View style={{ flex: 1 }}>
            <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>Choose your second factor</Text>
            {[
              { key: 'totp' as MFAMethod, icon: 'grid', label: 'Authenticator App', sub: 'Use Google Authenticator, Authy, or any TOTP app' },
              { key: 'sms'  as MFAMethod, icon: 'message-square', label: 'SMS Code', sub: 'Receive a one-time code via SMS to your number' },
            ].map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[mfaS.methodCard, {
                  borderColor: method === m.key ? colors.foreground : colors.border,
                  backgroundColor: method === m.key ? colors.foreground + '08' : colors.card,
                }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMethod(m.key); }}
              >
                <View style={[mfaS.methodIcon, { backgroundColor: method === m.key ? colors.foreground + '14' : colors.muted }]}>
                  <Icon name={m.icon as any} size={20} color={method === m.key ? colors.foreground : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[mfaS.methodLabel, { color: colors.foreground }]}>{m.label}</Text>
                  <Text style={[mfaS.methodSub, { color: colors.mutedForeground }]}>{m.sub}</Text>
                </View>
                {method === m.key
                  ? <Icon name="check-circle" size={20} color={colors.foreground} />
                  : <View style={[pinS.dot, { width: 20, height: 20, backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.border }]} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.foreground, marginTop: 'auto' as any }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep('setup'); }}>
              <Text style={[styles.confirmBtnText, { color: colors.background }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SETUP */}
        {step === 'setup' && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {method === 'totp' ? (
              <>
                <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>Open your authenticator app and scan the QR code, or enter the setup key manually.</Text>
                {/* Simulated QR placeholder */}
                <View style={[mfaS.qrBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={[mfaS.qrInner, { backgroundColor: colors.foreground }]}>
                    <Text style={[{ color: colors.background, fontSize: 11, fontWeight: '700', letterSpacing: 1 }]}>QR CODE</Text>
                    <Text style={[{ color: colors.background, fontSize: 9, opacity: 0.6, marginTop: 4 }]}>stockfair.co.za</Text>
                  </View>
                </View>
                <Text style={[mfaS.secretLabel, { color: colors.mutedForeground }]}>Or enter this setup key manually:</Text>
                <View style={[mfaS.secretBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[mfaS.secretText, { color: colors.foreground }]}>
                    {TOTP_SECRET.match(/.{1,4}/g)?.join(' ')}
                  </Text>
                </View>
                <View style={[linkedS.infoBox, { backgroundColor: colors.muted, marginTop: 12 }]}>
                  <Icon name="info" size={13} color={colors.mutedForeground} />
                  <Text style={[linkedS.infoText, { color: colors.mutedForeground }]}>
                    This key is unique to your account. Do not share it with anyone. Store it safely — you'll need it if you change devices.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>We'll send a one-time code to your phone number each time you log in.</Text>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>Phone Number</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                    value={smsPhone}
                    onChangeText={setSmsPhone}
                    placeholder="+27 81 234 5678"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.foreground, marginTop: 24 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep('verify'); }}
            >
              <Text style={[styles.confirmBtnText, { color: colors.background }]}>
                {method === 'totp' ? "I\u2019ve Scanned \u2014 Next" : 'Send Code'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* VERIFY */}
        {step === 'verify' && (
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View>
              <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>
                {method === 'totp'
                  ? 'Enter the 6-digit code shown in your authenticator app.'
                  : `Enter the code sent to ${smsPhone || 'your phone'}.`}
              </Text>
              {error ? <Text style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{error}</Text> : null}
              <TextInput
                style={[mfaS.codeInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: error ? '#DC2626' : colors.border }]}
                value={code}
                onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder="000000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                maxLength={6}
                textAlign="center"
              />
              <Text style={[{ color: colors.mutedForeground, fontSize: 12, marginTop: 8 }]}>
                Demo: enter any 6 digits to verify
              </Text>
            </View>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.foreground }]} onPress={handleVerify}>
              <Text style={[styles.confirmBtnText, { color: colors.background }]}>Verify & Activate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <View style={[{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#16A34A', justifyContent: 'center', alignItems: 'center' }]}>
              <Icon name="shield" size={38} color="#fff" />
            </View>
            <Text style={[styles.langModalTitle, { color: colors.foreground, textAlign: 'center' }]}>MFA Activated</Text>
            <Text style={[styles.langModalSub, { color: colors.mutedForeground, textAlign: 'center' }]}>
              Your account is now protected with {method === 'totp' ? 'an authenticator app' : 'SMS verification'}.
            </Text>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.foreground, alignSelf: 'stretch', marginTop: 8 }]} onPress={onClose}>
              <Text style={[styles.confirmBtnText, { color: colors.background }]}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
const mfaS = StyleSheet.create({
  statusCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  statusTitle: { fontSize: 15, fontWeight: '700' },
  statusSub:   { fontSize: 12, marginTop: 2 },
  infoBox:     { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, marginBottom: 16 },
  infoText:    { flex: 1, fontSize: 12, lineHeight: 18 },
  methodCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1.5, marginBottom: 12 },
  methodIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  methodLabel: { fontSize: 15, fontWeight: '700' },
  methodSub:   { fontSize: 12, marginTop: 2 },
  qrBox:       { borderRadius: 18, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 16 },
  qrInner:     { width: 160, height: 160, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  secretLabel: { fontSize: 12, marginBottom: 8 },
  secretBox:   { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center', marginBottom: 4 },
  secretText:  { fontSize: 18, fontWeight: '700', letterSpacing: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  codeInput:   { borderRadius: 14, borderWidth: 1.5, paddingVertical: 16, fontSize: 32, fontWeight: '700', letterSpacing: 10, marginTop: 8 },
});

/* ─── Feature Lock Modal ─────────────────────────────────── */
export type FeatureLockKey = 'withdraw' | 'payments' | 'statements' | 'linkedAccounts' | 'invest';

const LOCKABLE: { key: FeatureLockKey; icon: string; label: string; desc: string }[] = [
  { key: 'withdraw',       icon: 'arrow-up-circle', label: 'Withdraw Funds',      desc: 'Require PIN before any withdrawal' },
  { key: 'payments',       icon: 'dollar-sign',     label: 'Stokvel Payments',    desc: 'Require PIN before making contributions' },
  { key: 'statements',     icon: 'file-text',       label: 'View Statements',     desc: 'Require PIN to access transaction history' },
  { key: 'linkedAccounts', icon: 'credit-card',     label: 'Linked Accounts',     desc: 'Require PIN to view or manage bank accounts' },
  { key: 'invest',         icon: 'trending-up',     label: 'Investment Actions',  desc: 'Require PIN for buy/sell/withdraw in invest stokvels' },
];

function FeatureLockModal({
  visible, onClose, locks, setLocks, colors,
}: {
  visible: boolean; onClose: () => void;
  locks: Record<FeatureLockKey, boolean>;
  setLocks: (v: Record<FeatureLockKey, boolean>) => Promise<void>;
  colors: any;
}) {
  const insets = useSafeAreaInsets();
  const lockedCount = Object.values(locks).filter(Boolean).length;

  const toggle = async (key: FeatureLockKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setLocks({ ...locks, [key]: !locks[key] });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.langModal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.langModalHeader}>
          <Text style={[styles.langModalTitle, { color: colors.foreground }]}>Feature Lock</Text>
          <TouchableOpacity onPress={onClose}><Icon name="x" size={24} color={colors.foreground} /></TouchableOpacity>
        </View>
        <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>
          {lockedCount === 0 ? 'No features are PIN-protected.' : `${lockedCount} feature${lockedCount > 1 ? 's' : ''} require your PIN before access.`}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
            {LOCKABLE.map((f, i) => (
              <View
                key={f.key}
                style={[styles.menuItem, i < LOCKABLE.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              >
                <View style={[styles.menuIcon, { backgroundColor: locks[f.key] ? colors.foreground + '14' : colors.muted }]}>
                  <Icon name={f.icon} size={17} color={locks[f.key] ? colors.foreground : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{f.label}</Text>
                  <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{f.desc}</Text>
                </View>
                <Switch
                  value={locks[f.key]}
                  onValueChange={() => toggle(f.key)}
                  trackColor={{ false: colors.border, true: colors.foreground }}
                  thumbColor="#fff"
                  style={{ transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] }}
                />
              </View>
            ))}
          </View>

          <View style={[mfaS.infoBox, { backgroundColor: colors.muted, marginTop: 16 }]}>
            <Icon name="lock" size={13} color={colors.mutedForeground} />
            <Text style={[mfaS.infoText, { color: colors.mutedForeground }]}>
              Locked features will prompt for your 4-digit PIN before opening. Change PIN always requires your current PIN regardless of this setting.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ─── Fraud Shield Modal ─────────────────────────────────── */
export type FraudKey = 'behavioral' | 'simSwap' | 'jailbreak' | 'geofencing';

const FRAUD_FEATURES: {
  key: FraudKey;
  icon: string;
  title: string;
  color: string;
  desc: string;
  transparency: string;
  badge: string;
  warn?: string;
}[] = [
  {
    key: 'behavioral',
    icon: 'activity',
    title: 'Behavioral Analytics',
    color: '#16A34A',
    desc: 'Learns your normal usage patterns (typical hours, navigation flow, session length) and alerts when activity looks suspicious — like a transaction at 3am when you never transact at night.',
    transparency: 'Collects: usage timing, navigation sequences, session duration. No content, messages, or location.',
    badge: 'Pattern monitoring',
  },
  {
    key: 'simSwap',
    icon: 'smartphone',
    title: 'SIM Swap Detection',
    color: '#2563EB',
    desc: 'Monitors for signals that your phone number has been ported to a new SIM card — the most common step in telecom fraud that enables OTP hijacking.',
    transparency: 'Collects: phone number verification status only. No call or message content.',
    badge: 'Telecom checks',
  },
  {
    key: 'jailbreak',
    icon: 'shield-off',
    title: 'Jailbreak & Root Detection',
    color: '#D97706',
    desc: 'Checks whether your device has been modified in ways that bypass OS security (jailbreaking on iOS, rooting on Android). Compromised devices are prime targets for credential-stealing malware.',
    transparency: 'Collects: device integrity signals only. No personal data, files, or activity.',
    badge: 'Device integrity',
  },
  {
    key: 'geofencing',
    icon: 'map-pin',
    title: 'Geofencing & Velocity Checks',
    color: '#7C3AED',
    desc: 'Flags transactions from unexpected locations or physically impossible movement — e.g., your account appearing in Cape Town and Johannesburg within minutes of each other.',
    transparency: 'Collects: approximate location (city-level, not GPS-precise), transaction timestamps.',
    badge: 'Location-aware',
    warn: 'Requires approximate location permission',
  },
];

function FraudShieldModal({
  visible, onClose, shield, setShield, colors,
}: {
  visible: boolean; onClose: () => void;
  shield: Record<FraudKey, boolean>;
  setShield: (v: Record<FraudKey, boolean>) => Promise<void>;
  colors: any;
}) {
  const insets     = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<FraudKey | null>(null);
  const activeCount = Object.values(shield).filter(Boolean).length;

  const toggle = async (key: FraudKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setShield({ ...shield, [key]: !shield[key] });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.langModal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.langModalHeader}>
          <Text style={[styles.langModalTitle, { color: colors.foreground }]}>Fraud Shield</Text>
          <TouchableOpacity onPress={onClose}><Icon name="x" size={24} color={colors.foreground} /></TouchableOpacity>
        </View>
        <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>
          {activeCount === 0
            ? 'No fraud protections are active. All features are opt-in.'
            : `${activeCount} of ${FRAUD_FEATURES.length} fraud protections active.`}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {FRAUD_FEATURES.map((f) => {
            const on = shield[f.key];
            return (
              <View key={f.key} style={[fraudS.card, { backgroundColor: colors.card, borderColor: on ? f.color + '40' : colors.border }]}>
                {/* Header row */}
                <View style={fraudS.cardHeader}>
                  <View style={[fraudS.iconBox, { backgroundColor: on ? f.color + '18' : colors.muted }]}>
                    <Icon name={f.icon} size={20} color={on ? f.color : colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[fraudS.cardTitle, { color: colors.foreground }]}>{f.title}</Text>
                    {on && (
                      <View style={[fraudS.activeBadge, { backgroundColor: f.color + '18', borderColor: f.color + '40' }]}>
                        <View style={[fraudS.activeDot, { backgroundColor: f.color }]} />
                        <Text style={[fraudS.activeBadgeText, { color: f.color }]}>Active · {f.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Switch
                    value={on}
                    onValueChange={() => toggle(f.key)}
                    trackColor={{ false: colors.border, true: f.color }}
                    thumbColor="#fff"
                    style={{ transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] }}
                  />
                </View>

                {/* Description (always visible) */}
                <Text style={[fraudS.cardDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>

                {/* Data transparency — expandable */}
                <TouchableOpacity
                  style={[fraudS.transparencyRow, { borderTopColor: colors.border }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpanded(expanded === f.key ? null : f.key); }}
                >
                  <Icon name="eye" size={12} color={colors.mutedForeground} />
                  <Text style={[fraudS.transparencyLabel, { color: colors.mutedForeground }]}>Data transparency</Text>
                  <Icon name={expanded === f.key ? 'chevron-up' : 'chevron-down'} size={12} color={colors.mutedForeground} />
                </TouchableOpacity>

                {expanded === f.key && (
                  <View style={[fraudS.transparencyBox, { backgroundColor: colors.muted }]}>
                    <Text style={[fraudS.transparencyText, { color: colors.mutedForeground }]}>{f.transparency}</Text>
                    {f.warn && (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' }}>
                        <Icon name="alert-triangle" size={11} color="#D97706" />
                        <Text style={[fraudS.transparencyText, { color: '#D97706' }]}>{f.warn}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Consent note */}
          <View style={[fraudS.consentBox, { backgroundColor: colors.muted }]}>
            <Icon name="user-check" size={14} color={colors.mutedForeground} />
            <Text style={[fraudS.consentText, { color: colors.mutedForeground }]}>
              All fraud detection features are opt-in. Disabling any feature removes its monitoring immediately. StockFair does not sell or share your data with third parties.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const fraudS = StyleSheet.create({
  card:             { borderRadius: 18, borderWidth: 1.5, marginBottom: 14, overflow: 'hidden' },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10 },
  iconBox:          { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  cardTitle:        { fontSize: 14, fontWeight: '700' },
  activeBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  activeDot:        { width: 6, height: 6, borderRadius: 3 },
  activeBadgeText:  { fontSize: 10, fontWeight: '700' },
  cardDesc:         { fontSize: 12, lineHeight: 18, paddingHorizontal: 16, paddingBottom: 12 },
  transparencyRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
  transparencyLabel:{ flex: 1, fontSize: 11, fontWeight: '600' },
  transparencyBox:  { padding: 12, paddingHorizontal: 16 },
  transparencyText: { fontSize: 11, lineHeight: 17 },
  consentBox:       { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, marginTop: 4, alignItems: 'flex-start' },
  consentText:      { flex: 1, fontSize: 11, lineHeight: 17 },
});

/* ═══════════════════════════════════════════════════════
   MAIN PROFILE SCREEN
═══════════════════════════════════════════════════════ */
export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { isDark, themeMode, setThemeMode, toggleTheme, palette, setPalette } = useTheme();

  /* Auth */
  const { user, logout, updateProfile } = useAuth();

  /* KYC status */
  const [kycStatus, setKycStatus] = useState<KYCStatus>('none');
  useEffect(() => {
    AsyncStorage.getItem(KYC_STATUS_KEY).then((v) => {
      if (v === 'submitted' || v === 'verified') setKycStatus(v);
    });
  }, []);

  /* Profile photo */
  const PROFILE_PHOTO_KEY = '@stockfair_profile_photo';
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_PHOTO_KEY).then((v) => { if (v) setProfilePhoto(v); });
  }, []);
  const handlePickProfilePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow access to photos to set a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setProfilePhoto(uri);
        await AsyncStorage.setItem(PROFILE_PHOTO_KEY, uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
  };

  /* UI state */
  const [showLanguagePicker, setShowLanguagePicker]     = useState(false);
  const [showEditProfile,    setShowEditProfile]         = useState(false);
  const [showAutoPay,        setShowAutoPay]             = useState(false);
  const [showNotifSettings,  setShowNotifSettings]       = useState(false);
  const [showChangePIN,      setShowChangePIN]           = useState(false);
  const [showLinkedAccounts, setShowLinkedAccounts]      = useState(false);
  const [showStatements,     setShowStatements]          = useState(false);
  const [showHelp,           setShowHelp]                = useState(false);
  /* Security modals */
  const [showMFA,         setShowMFA]         = useState(false);
  const [showFeatureLock, setShowFeatureLock] = useState(false);
  const [showFraudShield, setShowFraudShield] = useState(false);
  const [showPinGate,     setShowPinGate]     = useState(false);
  const pendingActionRef  = useRef<(() => void) | null>(null);

  /* Feature Locks */
  const defaultLocks: Record<FeatureLockKey, boolean> = { withdraw: false, payments: false, statements: false, linkedAccounts: false, invest: false };
  const [featureLocks, setFeatureLocksRaw] = useState<Record<FeatureLockKey, boolean>>(defaultLocks);
  const setFeatureLocks = async (v: Record<FeatureLockKey, boolean>) => {
    setFeatureLocksRaw(v);
    await AsyncStorage.setItem(LOCKS_KEY, JSON.stringify(v));
  };

  /* Fraud Shield */
  const defaultShield: Record<FraudKey, boolean> = { behavioral: false, simSwap: false, jailbreak: false, geofencing: false };
  const [fraudShield, setFraudShieldRaw] = useState<Record<FraudKey, boolean>>(defaultShield);
  const setFraudShield = async (v: Record<FraudKey, boolean>) => {
    setFraudShieldRaw(v);
    await AsyncStorage.setItem(FRAUD_KEY, JSON.stringify(v));
  };

  /* MFA display state */
  const [mfaActive,  setMfaActive]  = useState(false);
  const [mfaMethod,  setMfaMethodD] = useState<MFAMethod | null>(null);

  /* Load security settings on mount */
  useEffect(() => {
    AsyncStorage.multiGet([MFA_KEY, LOCKS_KEY, FRAUD_KEY]).then(([[, mfa], [, locks], [, fraud]]) => {
      if (mfa)   try { const d = JSON.parse(mfa);   setMfaActive(d.enabled ?? false); setMfaMethodD(d.method ?? null); } catch {}
      if (locks) try { setFeatureLocksRaw({ ...defaultLocks, ...JSON.parse(locks) }); } catch {}
      if (fraud) try { setFraudShieldRaw({ ...defaultShield, ...JSON.parse(fraud) }); } catch {}
    });
  }, []);

  /* Re-sync MFA display when modal closes */
  const handleMFAClose = async () => {
    setShowMFA(false);
    const raw = await AsyncStorage.getItem(MFA_KEY);
    if (raw) try { const d = JSON.parse(raw); setMfaActive(d.enabled ?? false); setMfaMethodD(d.method ?? null); } catch {}
  };

  /* Feature-lock gate — call this instead of directly opening sensitive features */
  const openWithLock = (featureKey: FeatureLockKey, openFn: () => void) => {
    if (featureLocks[featureKey]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      pendingActionRef.current = openFn;
      setShowPinGate(true);
    } else {
      openFn();
    }
  };

  const fraudActiveCount = Object.values(fraudShield).filter(Boolean).length;
  const lockedCount      = Object.values(featureLocks).filter(Boolean).length;

  /* Profile — driven by auth user */
  const [displayName, setDisplayName] = useState(user?.name ?? 'My Profile');
  const [phone,       setPhone]       = useState(user?.phone ?? '');
  /* sync if auth user changes */
  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.phone) setPhone(user.phone);
  }, [user?.name, user?.phone]);

  /* Auto-pay — persisted */
  const [autoPayEnabled, setAutoPayEnabledRaw] = useState(false);
  const [autoPayDay,     setAutoPayDayRaw]     = useState(1);

  const setAutoPayEnabled = async (v: boolean) => {
    setAutoPayEnabledRaw(v);
    const cur = await AsyncStorage.getItem(AUTOPAY_KEY);
    const obj = cur ? JSON.parse(cur) : {};
    await AsyncStorage.setItem(AUTOPAY_KEY, JSON.stringify({ ...obj, enabled: v }));
  };
  const setAutoPayDay = async (d: number) => {
    setAutoPayDayRaw(d);
    const cur = await AsyncStorage.getItem(AUTOPAY_KEY);
    const obj = cur ? JSON.parse(cur) : {};
    await AsyncStorage.setItem(AUTOPAY_KEY, JSON.stringify({ ...obj, day: d }));
  };

  /* Notifications — persisted */
  const defaultNotifToggles: Record<NotifKey, boolean> = {
    contribution: true, payout: true, overdue: true,
    groupUpdates: false, newMember: false, marketplace: false,
  };
  const [notifToggles,   setNotifTogglesRaw]   = useState<Record<NotifKey, boolean>>(defaultNotifToggles);
  const [reminderTiming, setReminderTimingRaw] = useState(1);

  const setNotifToggles = async (v: Record<NotifKey, boolean>) => {
    setNotifTogglesRaw(v);
    await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify({ toggles: v, timing: reminderTiming }));
  };
  const setReminderTiming = async (v: number) => {
    setReminderTimingRaw(v);
    await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify({ toggles: notifToggles, timing: v }));
  };

  /* Biometric — persisted */
  const [biometricOn, setBiometricOnRaw] = useState(false);
  const setBiometricOn = async (v: boolean) => {
    setBiometricOnRaw(v);
    await AsyncStorage.setItem(BIOMETRIC_KEY, JSON.stringify(v));
  };

  /* Load persisted settings on mount */
  useEffect(() => {
    AsyncStorage.multiGet([AUTOPAY_KEY, NOTIFS_KEY, BIOMETRIC_KEY]).then(([[, ap], [, notifs], [, bio]]) => {
      if (ap)    try { const { enabled, day } = JSON.parse(ap);   if (typeof enabled === 'boolean') setAutoPayEnabledRaw(enabled); if (typeof day === 'number') setAutoPayDayRaw(day); } catch {}
      if (notifs) try { const { toggles, timing } = JSON.parse(notifs); if (toggles) setNotifTogglesRaw({ ...defaultNotifToggles, ...toggles }); if (typeof timing === 'number') setReminderTimingRaw(timing); } catch {}
      if (bio)   try { setBiometricOnRaw(JSON.parse(bio)); } catch {}
    });
  }, []);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;
  const notifCount = Object.values(notifToggles).filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + bottomPadding }} showsVerticalScrollIndicator={false}>

        {/* ── Header ───────────────────────────────────────── */}
        <LinearGradient
          colors={
            palette === 'forge'
              ? (isDark ? ['#1E160C', '#2C2016'] : ['#FBF7F1', '#F2E9DC'])
              : palette === 'bloom'
              ? (isDark ? ['#12102A', '#1E1A3C'] : ['#F0EBF8', '#E8DFF4'])
              : isDark ? ['#111420', '#1C2038'] : ['#F5F0E8', '#EDE7DC']
          }
          style={[styles.header, { paddingTop: topPadding + 16 }]}
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickProfilePhoto} activeOpacity={0.8} style={{ position: 'relative' }}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={[styles.avatar, { borderRadius: 40 }]} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: '#2C2C2C' }]}>
                  <Text style={[styles.avatarLetter, { color: '#FFFFFF' }]}>{displayName.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Icon name="camera" size={11} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.phone}>{phone}</Text>
              <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(22,163,74,0.18)' }]}>
                <Icon name="check-circle" size={12} color={colors.success} />
                <Text style={[styles.verifiedText, { color: colors.success }]}>Verified</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 }]}
              onPress={() => setShowEditProfile(true)}
            >
              <Icon name="edit-2" size={15} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={[styles.statsRow, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            {[
              { num: '3',    label: t('groups') },
              { num: 'R 37k', label: t('savings') },
              { num: '18',   label: 'Months' },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{s.num}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          <TouchableOpacity
            style={styles.quickToggle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const palettes: ('obsidian' | 'forge' | 'bloom')[] = ['obsidian', 'forge', 'bloom'];
              const next = palettes[(palettes.indexOf(palette) + 1) % palettes.length];
              setPalette(next);
            }}
          >
            <Icon
              name={palette === 'forge' ? 'zap' : palette === 'bloom' ? 'feather' : isDark ? 'sun' : 'moon'}
              size={14} color={colors.mutedForeground}
            />
            <Text style={[styles.quickToggleText, { color: colors.mutedForeground }]}>
              {palette === 'obsidian'
                ? (isDark ? 'Obsidian Dark' : 'Obsidian Light')
                : palette === 'forge'
                ? (isDark ? 'Forge Dark' : 'Forge Light')
                : (isDark ? 'Bloom Dark' : 'Bloom Light')}
            </Text>
            <Icon name="chevron-right" size={12} color={colors.mutedForeground} />
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Identity Verification (CDD/KYC) ─────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          {kycStatus === 'none' && (
            <TouchableOpacity
              style={[kycStyles.banner, { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.10)' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/kyc'); }}
              activeOpacity={0.86}
            >
              <View style={kycStyles.bannerLeft}>
                <View style={[kycStyles.bannerIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                  <Icon name="shield-off" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={kycStyles.bannerTitleRow}>
                    <Text style={kycStyles.bannerTitle}>Identity Not Verified</Text>
                    <View style={kycStyles.requiredPill}><Text style={kycStyles.requiredText}>FICA Required</Text></View>
                  </View>
                  <Text style={kycStyles.bannerSub}>Complete CDD to unlock full access — contributions over R5,000 and group creation require verification.</Text>
                  <View style={kycStyles.stepsRow}>
                    {['Identity', 'Address', 'Selfie'].map((step, i) => (
                      <View key={step} style={kycStyles.stepDot}>
                        <View style={[kycStyles.stepDotCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                          <Text style={kycStyles.stepDotNum}>{i + 1}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              <View style={kycStyles.bannerCTA}>
                <Text style={kycStyles.bannerCTAText}>Verify Now</Text>
                <Icon name="arrow-right" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}

          {kycStatus === 'submitted' && (
            <View style={[kycStyles.banner, { backgroundColor: '#1A3A5C', borderColor: '#3498DB40' }]}>
              <View style={kycStyles.bannerLeft}>
                <View style={[kycStyles.bannerIcon, { backgroundColor: '#3498DB20' }]}>
                  <Icon name="clock" size={22} color="#3498DB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[kycStyles.bannerTitle, { color: '#3498DB' }]}>Verification Under Review</Text>
                  <Text style={kycStyles.bannerSub}>Your documents are being reviewed. Expected within 1–2 business days.</Text>
                </View>
              </View>
            </View>
          )}

          {/* verified — card intentionally hidden; access is silently unlocked */}
        </View>

        {/* ── Fair Score ───────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Fair Score</Text>
          <FairScoreCard colors={colors} />
        </View>

        {/* ── Appearance ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Appearance</Text>

          {/* ── Palette swatches ── */}
          <View style={themePickerStyles.grid}>

            {/* Obsidian */}
            <TouchableOpacity
              style={[themePickerStyles.swatch, palette === 'obsidian' && themePickerStyles.swatchActive, { overflow: 'hidden', borderColor: palette === 'obsidian' ? colors.primary : colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPalette('obsidian'); }}
              activeOpacity={0.85}
            >
              <View style={[themePickerStyles.preview, { backgroundColor: '#F5F0E8' }]}>
                <View style={[themePickerStyles.previewCard, { backgroundColor: '#FFFFFF', margin: 6, borderRadius: 6 }]}>
                  <View style={{ flex: 1, padding: 6, gap: 4 }}>
                    <View style={[themePickerStyles.previewBar, { backgroundColor: '#1A160E', width: '55%' }]} />
                    <View style={[themePickerStyles.previewBar, { backgroundColor: '#8A7E70', width: '80%' }]} />
                    <View style={[themePickerStyles.previewBar, { backgroundColor: '#8A7E70', width: '40%' }]} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4, padding: 6, paddingTop: 0 }}>
                    <View style={[themePickerStyles.previewBtn, { backgroundColor: '#1A160E' }]} />
                    <View style={[themePickerStyles.previewBtn, { backgroundColor: '#E6DDD1' }]} />
                  </View>
                </View>
              </View>
              <View style={themePickerStyles.label}>
                <View style={themePickerStyles.labelRow}>
                  <View style={[themePickerStyles.dot, { backgroundColor: '#1A160E' }]} />
                  <Text style={[themePickerStyles.name, { color: colors.foreground }]}>Obsidian</Text>
                  {palette === 'obsidian' && <Icon name="check-circle" size={14} color={colors.success} />}
                </View>
                <Text style={[themePickerStyles.sub, { color: colors.mutedForeground }]}>Light & dark · monochrome</Text>
              </View>
            </TouchableOpacity>

            {/* Forge */}
            <TouchableOpacity
              style={[themePickerStyles.swatch, palette === 'forge' && themePickerStyles.swatchActive, { overflow: 'hidden', borderColor: palette === 'forge' ? '#D4863C' : colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPalette('forge'); }}
              activeOpacity={0.85}
            >
              <View style={[themePickerStyles.preview, { backgroundColor: '#1E160C' }]}>
                <View style={[themePickerStyles.previewCard, { backgroundColor: '#2C2016', margin: 6, borderRadius: 6 }]}>
                  <View style={{ flex: 1, padding: 6, gap: 4 }}>
                    <View style={[themePickerStyles.previewBar, { backgroundColor: '#D4863C', width: '55%' }]} />
                    <View style={[themePickerStyles.previewBar, { backgroundColor: '#8A7260', width: '80%' }]} />
                    <View style={[themePickerStyles.previewBar, { backgroundColor: '#8A7260', width: '40%' }]} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4, padding: 6, paddingTop: 0 }}>
                    <View style={[themePickerStyles.previewBtn, { backgroundColor: '#D4863C' }]} />
                    <View style={[themePickerStyles.previewBtn, { backgroundColor: '#3E2E1E' }]} />
                  </View>
                </View>
              </View>
              <View style={themePickerStyles.label}>
                <View style={themePickerStyles.labelRow}>
                  <View style={[themePickerStyles.dot, { backgroundColor: '#D4863C' }]} />
                  <Text style={[themePickerStyles.name, { color: colors.foreground }]}>Forge</Text>
                  {palette === 'forge' && <Icon name="check-circle" size={14} color="#D4863C" />}
                </View>
                <Text style={[themePickerStyles.sub, { color: colors.mutedForeground }]}>Light & dark · amber gold</Text>
              </View>
            </TouchableOpacity>

            {/* Bloom */}
            <TouchableOpacity
              style={[themePickerStyles.swatch, palette === 'bloom' && themePickerStyles.swatchActive, { overflow: 'hidden', borderColor: palette === 'bloom' ? '#C040E0' : colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPalette('bloom'); }}
              activeOpacity={0.85}
            >
              <View style={[themePickerStyles.preview, { backgroundColor: '#12102A' }]}>
                <View style={[themePickerStyles.previewCard, { backgroundColor: '#1E1A3C', margin: 6, borderRadius: 6 }]}>
                  <View style={{ flex: 1, padding: 6, gap: 4 }}>
                    <View style={[themePickerStyles.previewBar, { backgroundColor: '#C040E0', width: '55%' }]} />
                    <View style={[themePickerStyles.previewBar, { backgroundColor: '#7A60A0', width: '80%' }]} />
                    <View style={[themePickerStyles.previewBar, { backgroundColor: '#7A60A0', width: '40%' }]} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4, padding: 6, paddingTop: 0 }}>
                    <View style={[themePickerStyles.previewBtn, { backgroundColor: '#C040E0' }]} />
                    <View style={[themePickerStyles.previewBtn, { backgroundColor: '#2E2854' }]} />
                  </View>
                </View>
              </View>
              <View style={themePickerStyles.label}>
                <View style={themePickerStyles.labelRow}>
                  <View style={[themePickerStyles.dot, { backgroundColor: '#C040E0' }]} />
                  <Text style={[themePickerStyles.name, { color: colors.foreground }]}>Bloom</Text>
                  {palette === 'bloom' && <Icon name="check-circle" size={14} color="#C040E0" />}
                </View>
                <Text style={[themePickerStyles.sub, { color: colors.mutedForeground }]}>Light & dark · fuchsia</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Light/Dark brightness toggle — all palettes */}
          <View style={[styles.menuCard, { backgroundColor: colors.card, marginTop: 10 }]}>
            {(['system', 'light', 'dark'] as const).map((mode, idx) => (
              <TouchableOpacity
                key={mode}
                style={[styles.menuItem, idx < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setThemeMode(mode); }}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
                  <Icon name={mode === 'dark' ? 'moon' : mode === 'light' ? 'sun' : 'smartphone'} size={17} color={colors.foreground} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>
                  {mode === 'system' ? 'Follow System' : mode === 'light' ? 'Light Mode' : 'Dark Mode'}
                </Text>
                {themeMode === mode && <Icon name="check" size={17} color={colors.success} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Language ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('language')}</Text>
          <TouchableOpacity
            style={[styles.menuCard, { backgroundColor: colors.card }, styles.menuItem]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowLanguagePicker(true); }}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
              <Icon name="globe" size={17} color={colors.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>{t('language')}</Text>
              <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{LANGUAGE_NAMES[language]}</Text>
            </View>
            <Icon name="chevron-right" size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* ── Account ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card }]}>

            {/* Notifications — opens granular settings */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowNotifSettings(true); }}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
                <Icon name="bell" size={17} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{t('notifications')}</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{notifCount} of {NOTIF_ITEMS.length} alerts enabled</Text>
              </View>
              <View style={[styles.badgePill, { backgroundColor: colors.primary + '14' }]}>
                <Text style={[styles.badgePillText, { color: colors.primary }]}>{notifCount}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Auto-pay */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAutoPay(true); }}
            >
              <View style={[styles.menuIcon, { backgroundColor: autoPayEnabled ? colors.primary + '14' : colors.muted }]}>
                <Icon name="zap" size={17} color={autoPayEnabled ? colors.primary : colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>Auto-pay Contributions</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>
                  {autoPayEnabled ? `Deducts on day ${autoPayDay} of each month` : 'Set up automatic payments'}
                </Text>
              </View>
              {autoPayEnabled && (
                <View style={[styles.badgePill, { backgroundColor: '#27AE6020' }]}>
                  <Text style={[styles.badgePillText, { color: '#27AE60' }]}>Active</Text>
                </View>
              )}
              <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Biometric */}
            <View style={[styles.menuItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
                <Icon name="shield" size={17} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>Biometric Login</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>Face ID / Fingerprint</Text>
              </View>
              <Switch
                value={biometricOn}
                onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBiometricOn(v); }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {([
              { icon: 'lock',        label: 'Change PIN',       sub: 'Update your 4-digit security PIN',   onPress: () => setShowChangePIN(true) },
              { icon: 'credit-card', label: 'Linked Accounts',  sub: 'View and manage bank accounts',      onPress: () => openWithLock('linkedAccounts', () => setShowLinkedAccounts(true)) },
              { icon: 'file-text',   label: 'Statements',       sub: 'View and share transaction history', onPress: () => openWithLock('statements', () => setShowStatements(true)) },
              { icon: 'help-circle', label: t('help'),          sub: 'FAQs, support and contact us',       onPress: () => setShowHelp(true) },
            ] as const).map((item, idx, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, idx < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); item.onPress(); }}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
                  <Icon name={item.icon as any} size={17} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Security ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Security</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card }]}>

            {/* MFA */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowMFA(true); }}
            >
              <View style={[styles.menuIcon, { backgroundColor: mfaActive ? '#16A34A14' : colors.muted }]}>
                <Icon name="shield" size={17} color={mfaActive ? '#16A34A' : colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>Multi-Factor Auth</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>
                  {mfaActive
                    ? `Active · ${mfaMethod === 'totp' ? 'Authenticator App' : 'SMS OTP'}`
                    : 'Not enabled — tap to set up'}
                </Text>
              </View>
              {mfaActive
                ? <View style={[styles.badgePill, { backgroundColor: '#16A34A18' }]}><Text style={[styles.badgePillText, { color: '#16A34A' }]}>ON</Text></View>
                : <View style={[styles.badgePill, { backgroundColor: '#D9770618' }]}><Text style={[styles.badgePillText, { color: '#D97706' }]}>OFF</Text></View>}
              <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Feature Lock */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFeatureLock(true); }}
            >
              <View style={[styles.menuIcon, { backgroundColor: lockedCount > 0 ? colors.foreground + '14' : colors.muted }]}>
                <Icon name="lock" size={17} color={lockedCount > 0 ? colors.foreground : colors.mutedForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>Feature Lock</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>
                  {lockedCount === 0 ? 'No features are PIN-protected' : `${lockedCount} feature${lockedCount > 1 ? 's' : ''} require your PIN`}
                </Text>
              </View>
              {lockedCount > 0 && (
                <View style={[styles.badgePill, { backgroundColor: colors.foreground + '14' }]}>
                  <Text style={[styles.badgePillText, { color: colors.foreground }]}>{lockedCount}</Text>
                </View>
              )}
              <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Fraud Shield */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFraudShield(true); }}
            >
              <View style={[styles.menuIcon, { backgroundColor: fraudActiveCount > 0 ? '#16A34A14' : colors.muted }]}>
                <Icon name="activity" size={17} color={fraudActiveCount > 0 ? '#16A34A' : colors.mutedForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>Fraud Shield</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>
                  {fraudActiveCount === 0
                    ? 'Behavioural, SIM, device & geo protection'
                    : `${fraudActiveCount} of ${FRAUD_FEATURES.length} protections active`}
                </Text>
              </View>
              {fraudActiveCount > 0 && (
                <View style={[styles.badgePill, { backgroundColor: '#16A34A18' }]}>
                  <Text style={[styles.badgePillText, { color: '#16A34A' }]}>{fraudActiveCount}</Text>
                </View>
              )}
              <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Achievements ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Achievements</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
            {[
              { icon: 'star',  label: 'Consistent Saver',   desc: '6 months streak',    color: colors.foreground },
              { icon: 'users', label: 'Community Builder',  desc: 'Founded 2 stokvels', color: colors.mutedForeground },
              { icon: 'award', label: 'Top Contributor',    desc: 'R 37k total saved',  color: colors.success },
            ].map((a, i, arr) => (
              <View key={a.label} style={[styles.menuItem, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <View style={[styles.menuIcon, { backgroundColor: a.color + '20', width: 44, height: 44, borderRadius: 12 }]}>
                  <Icon name={a.icon as any} size={20} color={a.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{a.label}</Text>
                  <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{a.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Logout ───────────────────────────────────────── */}
        <View style={[styles.section, { paddingBottom: 8 }]}>
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.destructive + '40' }]}
            onPress={async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await logout();
              router.replace('/auth/welcome');
            }}
          >
            <Icon name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.logoutText, { color: colors.destructive }]}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Language Picker ──────────────────────────────── */}
      <Modal visible={showLanguagePicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.langModal, { backgroundColor: colors.background }]}>
          <View style={styles.langModalHeader}>
            <Text style={[styles.langModalTitle, { color: colors.foreground }]}>{t('language')}</Text>
            <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
              <Icon name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.langModalSub, { color: colors.mutedForeground }]}>
            All 11 official South African languages
          </Text>
          <ScrollView>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langOption, { borderBottomColor: colors.border }, language === lang && { backgroundColor: colors.muted }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLanguage(lang); setShowLanguagePicker(false); }}
              >
                <View style={styles.langOptionLeft}>
                  <Text style={[styles.langCode, { color: colors.mutedForeground }]}>{lang.toUpperCase()}</Text>
                  <Text style={[styles.langName, { color: colors.foreground }]}>{LANGUAGE_NAMES[lang]}</Text>
                </View>
                {language === lang && <Icon name="check" size={20} color={colors.success} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Edit Profile ─────────────────────────────────── */}
      <Modal visible={showEditProfile} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.langModal, { backgroundColor: colors.background }]}>
          <View style={styles.langModalHeader}>
            <Text style={[styles.langModalTitle, { color: colors.foreground }]}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setShowEditProfile(false)}>
              <Icon name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.editAvatarWrapper}>
            <View style={[styles.avatar, { backgroundColor: '#2C2C2C', width: 80, height: 80, borderRadius: 40 }]}>
              <Text style={[styles.avatarLetter, { color: '#FFFFFF', fontSize: 32 }]}>{displayName.charAt(0)}</Text>
            </View>
            <TouchableOpacity style={[styles.editAvatarBtn, { backgroundColor: '#000000' }]}>
              <Icon name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{ gap: 16, marginTop: 24 }}>
            {[
              { label: 'Full Name',     value: displayName, setter: setDisplayName },
              { label: 'Phone Number',  value: phone,       setter: setPhone },
            ].map((field) => (
              <View key={field.label}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={field.value}
                  onChangeText={field.setter}
                />
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 32 }]}
            onPress={async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await updateProfile({ name: displayName, phone });
              setShowEditProfile(false);
            }}
          >
            <Text style={styles.confirmBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Auto-pay Modal ───────────────────────────────── */}
      <AutoPayModal
        visible={showAutoPay}
        onClose={() => setShowAutoPay(false)}
        enabled={autoPayEnabled}
        setEnabled={setAutoPayEnabled}
        day={autoPayDay}
        setDay={setAutoPayDay}
        colors={colors}
      />

      {/* ── Notification Settings Modal ──────────────────── */}
      <NotifSettingsModal
        visible={showNotifSettings}
        onClose={() => setShowNotifSettings(false)}
        toggles={notifToggles}
        setToggles={setNotifToggles}
        reminderTiming={reminderTiming}
        setReminderTiming={setReminderTiming}
        colors={colors}
      />

      {/* ── Change PIN ───────────────────────────────────── */}
      <ChangePINModal
        visible={showChangePIN}
        onClose={() => setShowChangePIN(false)}
        colors={colors}
      />

      {/* ── Linked Accounts ──────────────────────────────── */}
      <LinkedAccountsModal
        visible={showLinkedAccounts}
        onClose={() => setShowLinkedAccounts(false)}
        colors={colors}
      />

      {/* ── Statements ───────────────────────────────────── */}
      <StatementsModal
        visible={showStatements}
        onClose={() => setShowStatements(false)}
        colors={colors}
      />

      {/* ── Help ─────────────────────────────────────────── */}
      <HelpModal
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        colors={colors}
      />

      {/* ── MFA Setup ────────────────────────────────────── */}
      <MFASetupModal
        visible={showMFA}
        onClose={handleMFAClose}
        colors={colors}
      />

      {/* ── Feature Lock ─────────────────────────────────── */}
      <FeatureLockModal
        visible={showFeatureLock}
        onClose={() => setShowFeatureLock(false)}
        locks={featureLocks}
        setLocks={setFeatureLocks}
        colors={colors}
      />

      {/* ── Fraud Shield ─────────────────────────────────── */}
      <FraudShieldModal
        visible={showFraudShield}
        onClose={() => setShowFraudShield(false)}
        shield={fraudShield}
        setShield={setFraudShield}
        colors={colors}
      />

      {/* ── PIN Gate (Feature Lock guard) ────────────────── */}
      <PinGateModal
        visible={showPinGate}
        onClose={() => { setShowPinGate(false); pendingActionRef.current = null; }}
        onSuccess={() => {
          setShowPinGate(false);
          pendingActionRef.current?.();
          pendingActionRef.current = null;
        }}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 30, fontWeight: '700' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  name: { color: '#fff', fontSize: 19, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  phone: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 6, alignSelf: 'flex-start' },
  verifiedText: { fontSize: 11, fontWeight: '600' },
  editBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', borderRadius: 14, paddingVertical: 14 },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontSize: 18, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },
  quickToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  quickToggleText: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 },

  fairCard: { borderRadius: 18, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  fairHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fairTitle: { fontSize: 16, fontWeight: '700' },
  fairSub: { fontSize: 11, marginTop: 2 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tierLabel: { fontSize: 12, fontWeight: '700' },
  fairScoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginVertical: 12 },
  fairScoreNum: { fontSize: 52, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', lineHeight: 56 },
  fairScoreMax: { fontSize: 18, fontWeight: '500', marginBottom: 6 },
  gaugeWrapper: { marginBottom: 4, position: 'relative' },
  gaugeBar: { height: 10, borderRadius: 5 },
  gaugeMarker: { position: 'absolute', top: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', borderWidth: 3, justifyContent: 'center', alignItems: 'center', transform: [{ translateX: -10 }], shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
  gaugeMarkerDot: { width: 6, height: 6, borderRadius: 3 },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  gaugeRangeLabel: { fontSize: 10 },
  factorsDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 12 },
  factorsToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  factorsToggleText: { fontSize: 13, fontWeight: '500' },
  factorRow: { flexDirection: 'row', gap: 10 },
  factorIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  factorTopRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factorLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  factorWeight: { fontSize: 10 },
  factorScore: { fontSize: 12, fontWeight: '700' },
  factorDesc: { fontSize: 10, marginTop: 2, marginBottom: 5 },
  factorTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  factorFill: { height: '100%', borderRadius: 2 },
  fairInfo: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, marginTop: 4 },
  fairInfoText: { flex: 1, fontSize: 11, lineHeight: 15 },

  menuCard: { borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '500' },
  menuSub: { fontSize: 11, marginTop: 1 },
  badgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgePillText: { fontSize: 11, fontWeight: '700' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  logoutText: { fontSize: 15, fontWeight: '600' },

  langModal: { flex: 1, padding: 24 },
  langModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  langModalTitle: { fontSize: 22, fontWeight: '700' },
  langModalSub: { fontSize: 13, marginBottom: 20 },
  langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1 },
  langOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  langCode: { fontSize: 12, fontWeight: '600', width: 30 },
  langName: { fontSize: 16, fontWeight: '500' },

  editAvatarWrapper: { alignItems: 'center', marginTop: 16, position: 'relative' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: '35%', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  confirmBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const kycStyles = StyleSheet.create({
  banner:       { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12, overflow: 'hidden' },
  bannerLeft:   { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  bannerIcon:   { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  bannerTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  bannerTitle:  { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  bannerSub:    { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 17 },
  requiredPill: { backgroundColor: '#E53E3E', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  requiredText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  stepsRow:     { flexDirection: 'row', gap: 6, marginTop: 10 },
  stepDot:      { alignItems: 'center', gap: 3 },
  stepDotCircle:{ width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepDotNum:   { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  bannerCTA:    { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  bannerCTAText:{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});

const themePickerStyles = StyleSheet.create({
  grid:        { flexDirection: 'row', gap: 10 },
  swatch:      { flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent', overflow: 'hidden' },
  swatchActive:{ elevation: 6 },
  preview:     { height: 88 },
  previewCard: { flex: 1, flexDirection: 'column', justifyContent: 'space-between' },
  previewBar:  { height: 5, borderRadius: 3 },
  previewBtn:  { flex: 1, height: 16, borderRadius: 5 },
  label:       { padding: 10, gap: 3 },
  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:         { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: 'transparent' },
  name:        { flex: 1, fontSize: 12, fontWeight: '700' },
  sub:         { fontSize: 10 },
});
