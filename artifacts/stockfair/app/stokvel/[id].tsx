import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Dimensions,
  Share,
  Image,
} from 'react-native';
import Icon from '@/components/Icon';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useStokvel, StokvelMember, Stokvel, VEHICLE_META } from '@/context/StokvelContext';
import { useCart, CartItem } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ConstitutionModal } from '@/components/ConstitutionModal';
import { PaymentModal } from '@/components/PaymentModal';
import { BurialClaimModal } from '@/components/BurialClaimModal';

const { width: SCREEN_W } = Dimensions.get('window');

/* ─── Types ──────────────────────────────────────────── */
type MemberStatus = 'paid' | 'pending' | 'overdue';
type TabKey       = 'members' | 'rules' | 'history' | 'cart' | 'invest';

/* ─── Helpers ─────────────────────────────────────────── */
function getMemberStatus(member: StokvelMember, idx: number): MemberStatus {
  if (member.id === 'me') return 'paid';
  const seed = member.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (seed + idx * 7) % 10;
  return r < 5 ? 'paid' : r < 8 ? 'pending' : 'overdue';
}

function generateCollectionCode(stokvel: Stokvel, member: StokvelMember) {
  const prefix = stokvel.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  const pos    = member.position.toString().padStart(2, '0');
  const suffix = (member.id + stokvel.id).replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase();
  return `${prefix}${pos}-${suffix}`;
}

const MOCK_GROCERY_CART: CartItem[] = [
  { id: 'g1', productId: 'p1', name: '10kg White Maize Meal',       price: 89,  unit: '10kg bag',    quantity: 5, retailer: 'Shoprite' },
  { id: 'g2', productId: 'p2', name: 'Sunflower Cooking Oil 5L',    price: 119, unit: '5L bottle',   quantity: 4, retailer: 'Shoprite' },
  { id: 'g3', productId: 'p3', name: 'Long Grain White Rice 10kg',  price: 149, unit: '10kg bag',    quantity: 3, retailer: 'Shoprite' },
  { id: 'g4', productId: 'p4', name: 'Sugar 10kg',                  price: 139, unit: '10kg bag',    quantity: 2, retailer: 'Spar'     },
];

const STATUS_CONFIG: Record<MemberStatus, { color: string; bg: string; icon: string; label: string }> = {
  paid:    { color: '#27AE60', bg: '#27AE6018', icon: 'check-circle', label: 'Paid' },
  pending: { color: '#737373', bg: '#73737318', icon: 'clock',        label: 'Pending' },
  overdue: { color: '#E74C3C', bg: '#E74C3C18', icon: 'alert-circle', label: 'Overdue' },
};

/* ─── Section card ─────────────────────────────────────── */
function SectionCard({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionCardTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

/* ─── Collection code card ─────────────────────────────── */
function CollectionCodeCard({ code, isYou, member, colors, accentColor }: {
  code: string; isYou: boolean; member: StokvelMember; colors: any; accentColor: string;
}) {
  return (
    <View style={[ccStyles.card, { backgroundColor: isYou ? accentColor + '12' : colors.muted, borderColor: isYou ? accentColor + '40' : colors.border, borderWidth: 1 }]}>
      <View style={ccStyles.row}>
        <View style={[ccStyles.pos, { backgroundColor: isYou ? accentColor : accentColor + '20' }]}>
          <Text style={[ccStyles.posText, { color: isYou ? '#fff' : accentColor }]}>#{member.position}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ccStyles.name, { color: colors.foreground }]}>{member.name}{isYou ? ' (You)' : ''}</Text>
          <Text style={[ccStyles.store, { color: colors.mutedForeground }]}>Collect from nearest Shoprite</Text>
        </View>
      </View>
      {isYou ? (
        <View style={[ccStyles.codeBox, { backgroundColor: colors.card, borderColor: accentColor + '30', borderWidth: 1 }]}>
          <Text style={[ccStyles.codeText, { color: accentColor }]}>{code}</Text>
          <Text style={[ccStyles.codeHint, { color: colors.mutedForeground }]}>Show at store counter with your ID</Text>
        </View>
      ) : (
        <View style={[ccStyles.codeBoxMuted, { backgroundColor: colors.muted }]}>
          <Text style={[ccStyles.codeMuted, { color: colors.mutedForeground }]}>••••••••</Text>
          <Text style={[ccStyles.codeHint, { color: colors.mutedForeground }]}>Unique code sent to member</Text>
        </View>
      )}
    </View>
  );
}

const ccStyles = StyleSheet.create({
  card:       { borderRadius: 14, padding: 12, marginBottom: 10, gap: 10 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pos:        { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  posText:    { fontSize: 12, fontWeight: '700' },
  name:       { fontSize: 14, fontWeight: '600' },
  store:      { fontSize: 11, marginTop: 2 },
  codeBox:    { borderRadius: 10, padding: 14, alignItems: 'center', gap: 4 },
  codeText:   { fontSize: 26, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', letterSpacing: 3 },
  codeBoxMuted:{ borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  codeMuted:  { fontSize: 20, letterSpacing: 4 },
  codeHint:   { fontSize: 10, textAlign: 'center' },
});

/* ─── Group Cart tab ───────────────────────────────────── */
function GroupCartTab({ stokvel, liveItems, colors }: { stokvel: Stokvel; liveItems: CartItem[]; colors: any }) {
  const displayItems  = liveItems.length > 0 ? liveItems : MOCK_GROCERY_CART;
  const orderTotal    = displayItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const pool          = stokvel.contributionAmount * stokvel.members.length;
  const memberCount   = stokvel.members.length;
  const perMember     = Math.round(orderTotal / memberCount);
  const leftover      = pool - orderTotal;
  const primaryRetailer = displayItems[0]?.retailer ?? 'Shoprite';

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 14 }} scrollEnabled={false}>
      {liveItems.length === 0 && (
        <View style={[cartStyles.infoBanner, { backgroundColor: stokvel.color + '15', borderColor: stokvel.color + '30' }]}>
          <Icon name="info" size={14} color={stokvel.color} />
          <Text style={[cartStyles.infoText, { color: stokvel.color }]}>Sample order · Add from Marketplace to update</Text>
        </View>
      )}

      <SectionCard title="Group Pre-Orders" colors={colors}>
        {displayItems.map((item, i) => (
          <View key={item.id} style={[cartStyles.itemRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <View style={[cartStyles.itemIcon, { backgroundColor: stokvel.color + '15' }]}>
              <Icon name="package" size={16} color={stokvel.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[cartStyles.itemName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[cartStyles.itemSub, { color: colors.mutedForeground }]}>{item.retailer} · {item.unit}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[cartStyles.itemTotal, { color: colors.foreground }]}>R {(item.price * item.quantity).toLocaleString('en-ZA')}</Text>
              <Text style={[cartStyles.itemQty, { color: colors.mutedForeground }]}>×{item.quantity}</Text>
            </View>
          </View>
        ))}
        <View style={[cartStyles.grandRow, { borderTopColor: colors.border, backgroundColor: colors.muted }]}>
          <Text style={[cartStyles.grandLabel, { color: colors.foreground }]}>Group Order Total</Text>
          <Text style={[cartStyles.grandAmt, { color: colors.foreground }]}>R {orderTotal.toLocaleString('en-ZA')}</Text>
        </View>
      </SectionCard>

      <View style={[cartStyles.splitCard, { backgroundColor: colors.card }]}>
        <Text style={[cartStyles.splitTitle, { color: colors.foreground }]}>Contribution Split</Text>
        {[
          { icon: 'users',          label: 'Group pool',   value: `R ${pool.toLocaleString('en-ZA')}`,      note: `${memberCount} × R ${stokvel.contributionAmount}`, color: colors.foreground   },
          { icon: 'shopping-cart',  label: 'Group order',  value: `R ${orderTotal.toLocaleString('en-ZA')}`,  note: `${displayItems.length} items`,                   color: stokvel.color },
          { icon: 'user',           label: 'Per member',   value: `R ${perMember.toLocaleString('en-ZA')}`,   note: 'worth of groceries',                              color: '#27AE60'     },
        ].map((row, i) => (
          <View key={row.label} style={[cartStyles.splitRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <View style={[cartStyles.splitIcon, { backgroundColor: row.color + '18' }]}><Icon name={row.icon as any} size={15} color={row.color} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[cartStyles.splitLabel, { color: colors.foreground }]}>{row.label}</Text>
              <Text style={[cartStyles.splitNote, { color: colors.mutedForeground }]}>{row.note}</Text>
            </View>
            <Text style={[cartStyles.splitValue, { color: row.color }]}>{row.value}</Text>
          </View>
        ))}
        {leftover !== 0 && (
          <View style={[cartStyles.leftoverBox, { backgroundColor: leftover > 0 ? '#27AE6012' : '#E74C3C12', borderColor: leftover > 0 ? '#27AE6030' : '#E74C3C30' }]}>
            <Icon name={leftover > 0 ? 'trending-up' : 'alert-triangle'} size={14} color={leftover > 0 ? '#27AE60' : '#E74C3C'} />
            <View style={{ flex: 1 }}>
              <Text style={[cartStyles.leftoverTitle, { color: leftover > 0 ? '#27AE60' : '#E74C3C' }]}>
                {leftover > 0 ? `R ${leftover.toLocaleString('en-ZA')} leftover` : `R ${Math.abs(leftover).toLocaleString('en-ZA')} shortfall`}
              </Text>
              <Text style={[cartStyles.leftoverDesc, { color: colors.mutedForeground }]}>
                {leftover > 0 ? `R ${Math.floor(leftover / memberCount)} per member returned to savings` : 'Top up contributions before order deadline'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={[cartStyles.pickupCard, { backgroundColor: stokvel.color + '12', borderColor: stokvel.color + '30', borderWidth: 1 }]}>
        <View style={cartStyles.pickupHeader}>
          <View style={[cartStyles.pickupIcon, { backgroundColor: stokvel.color }]}><Icon name="map-pin" size={15} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[cartStyles.pickupTitle, { color: colors.foreground }]}>Pickup Location</Text>
            <Text style={[cartStyles.pickupRetailer, { color: stokvel.color }]}>{primaryRetailer} — Nearest Branch</Text>
          </View>
          <View style={[cartStyles.pickupDate, { backgroundColor: stokvel.color }]}><Text style={cartStyles.pickupDateText}>01 May</Text></View>
        </View>
        <Text style={[cartStyles.pickupDesc, { color: colors.mutedForeground }]}>Show your collection code + SA ID at the {primaryRetailer} counter.</Text>
      </View>

      <Text style={[cartStyles.codesSectionTitle, { color: colors.foreground }]}>Collection Codes</Text>
      {stokvel.members.map((member) => (
        <CollectionCodeCard key={member.id} code={generateCollectionCode(stokvel, member)} isYou={member.id === 'me'} member={member} colors={colors} accentColor={stokvel.color} />
      ))}
      <Text style={[cartStyles.codesFootnote, { color: colors.mutedForeground }]}>Codes are valid 7 days after collection date. Each code can only be used once.</Text>
    </ScrollView>
  );
}

const cartStyles = StyleSheet.create({
  infoBanner:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoText:      { flex: 1, fontSize: 12, lineHeight: 17 },
  itemRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  itemIcon:      { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  itemName:      { fontSize: 13, fontWeight: '500' },
  itemSub:       { fontSize: 10, marginTop: 2 },
  itemTotal:     { fontSize: 13, fontWeight: '700' },
  itemQty:       { fontSize: 10, marginTop: 1 },
  grandRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: 12, borderRadius: 10, borderTopWidth: StyleSheet.hairlineWidth },
  grandLabel:    { fontSize: 13, fontWeight: '600' },
  grandAmt:      { fontSize: 18, fontWeight: '800' },
  splitCard:     { borderRadius: 16, padding: 16, gap: 0 },
  splitTitle:    { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  splitRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  splitIcon:     { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  splitLabel:    { fontSize: 13, fontWeight: '500' },
  splitNote:     { fontSize: 10, marginTop: 2 },
  splitValue:    { fontSize: 15, fontWeight: '800' },
  leftoverBox:   { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 10, alignItems: 'flex-start' },
  leftoverTitle: { fontSize: 13, fontWeight: '700' },
  leftoverDesc:  { fontSize: 11, marginTop: 2, lineHeight: 15 },
  pickupCard:    { borderRadius: 14, padding: 14, gap: 12 },
  pickupHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickupIcon:    { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  pickupTitle:   { fontSize: 14, fontWeight: '600' },
  pickupRetailer:{ fontSize: 12, marginTop: 2, fontWeight: '700' },
  pickupDate:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  pickupDateText:{ color: '#fff', fontSize: 11, fontWeight: '700' },
  pickupDesc:    { fontSize: 12, lineHeight: 17 },
  codesSectionTitle:{ fontSize: 16, fontWeight: '700', marginTop: 4 },
  codesFootnote: { fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
});

/* ─── Smart Context Banner ─────────────────────────────── */
function GroupContextBanner({ stokvel, colors }: { stokvel: Stokvel; colors: any }) {
  const daysUntil = (dateStr: string) => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const t2  = new Date(dateStr); t2.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((t2.getTime() - now.getTime()) / 86400000));
  };
  const days = daysUntil(stokvel.nextPayout);
  const nextDate = new Date(stokvel.nextPayout).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });

  let items: { icon: string; label: string; value: string; accent?: boolean }[] = [];

  if (stokvel.type === 'rotation') {
    const nextMemberIdx = stokvel.currentPosition % stokvel.members.length;
    const nextMember    = stokvel.members[nextMemberIdx];
    const isMe          = nextMember?.id === 'me';
    const payoutAmt     = `R ${(stokvel.contributionAmount * stokvel.members.length).toLocaleString('en-ZA')}`;
    items = [
      { icon: isMe ? 'gift' : 'calendar', label: isMe ? 'Your payout' : `${nextMember?.name?.split(' ')[0] ?? 'Next'} receives`, value: isMe ? `${payoutAmt} in ${days} days` : `${payoutAmt} on ${nextDate}`, accent: isMe },
      { icon: 'list',        label: 'Your position',    value: `#${stokvel.members.find(m => m.id === 'me')?.position ?? '—'} of ${stokvel.members.length}` },
      { icon: 'trending-up', label: 'On-time rate',     value: '92%' },
    ];
  } else if (stokvel.type === 'burial') {
    const coverage = stokvel.contributionAmount * 10;
    items = [
      { icon: 'shield',      label: 'Your coverage',    value: `R ${coverage.toLocaleString('en-ZA')}`, accent: true },
      { icon: 'users',       label: 'Members covered',  value: `${stokvel.members.length} active` },
      { icon: 'check-circle',label: 'Status',           value: 'Active & protected' },
    ];
  } else if (stokvel.type === 'investment') {
    const cfg = stokvel.investmentConfig;
    const vm  = cfg ? VEHICLE_META[cfg.vehicle] : null;
    const estAnnual = vm
      ? Math.round(stokvel.totalSaved * ((vm.minReturn + vm.maxReturn) / 2 / 100))
      : 0;
    items = [
      { icon: 'trending-up', label: 'Est. return p.a.',  value: vm ? `${vm.minReturn}–${vm.maxReturn}%` : '—', accent: true },
      { icon: 'cpu',         label: 'Vehicle',            value: vm?.label ?? 'Managed fund' },
      { icon: 'dollar-sign', label: 'Est. annual gain',   value: `R ${estAnnual.toLocaleString('en-ZA')}` },
    ];
  } else if (stokvel.type === 'grocery') {
    const yesVotes = Math.min(stokvel.members.length - 1, 4);
    const needed   = Math.ceil(stokvel.members.length * 0.67);
    const approved = yesVotes >= needed;
    items = [
      { icon: 'shopping-cart', label: 'Next order',      value: nextDate, accent: !approved },
      { icon: 'check-circle',  label: 'Vote status',      value: approved ? `${yesVotes}/${stokvel.members.length} — Approved ✓` : `${yesVotes}/${needed} needed` },
      { icon: 'package',       label: 'Items in cart',    value: '4 items' },
    ];
  } else {
    items = [
      { icon: 'calendar', label: 'Next event',           value: nextDate },
      { icon: 'users',    label: 'Members',              value: `${stokvel.members.length} of ${stokvel.maxMembers}` },
      { icon: 'star',     label: 'Events this year',     value: '3 planned' },
    ];
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 10 }}
    >
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            bannerS.chip,
            {
              backgroundColor: item.accent ? stokvel.color + '14' : colors.card,
              borderColor:     item.accent ? stokvel.color + '40' : colors.border,
            },
          ]}
        >
          <View style={[bannerS.iconBox, { backgroundColor: item.accent ? stokvel.color + '20' : colors.muted }]}>
            <Icon name={item.icon} size={13} color={item.accent ? stokvel.color : colors.mutedForeground} />
          </View>
          <View style={{ gap: 1 }}>
            <Text style={[bannerS.label, { color: colors.mutedForeground }]}>{item.label}</Text>
            <Text style={[bannerS.value, { color: item.accent ? stokvel.color : colors.foreground }]}>{item.value}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
const bannerS = StyleSheet.create({
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  iconBox: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  label:   { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
  value:   { fontSize: 13, fontWeight: '700' },
});

/* ════════════════════════════════════════════════════════
   MAIN SCREEN
════════════════════════════════════════════════════════ */
export default function StokvelDetailScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const router    = useRouter();
  const { t }     = useLanguage();
  const { user }  = useAuth();
  const { stokvels, addTransaction, removeStokvel, updateStokvelPhoto, userBalance } = useStokvel();
  const { items: cartItems } = useCart();

  const stokvel = stokvels.find((s) => s.id === id);
  const [showContribute, setShowContribute] = useState(false);
  const [showClaim,      setShowClaim]      = useState(false);
  const [activeTab, setActiveTab]           = useState<TabKey>('members');

  /* ── Constitution signing ───────────────────────────── */
  const constitutionKey = `@stockfair_constitution_${id}`;
  const [constitutionSigned, setConstitutionSigned]       = useState<boolean | null>(null);
  const [constitutionSignedDate, setConstitutionSignedDate] = useState<string | undefined>(undefined);
  const [showConstitutionReadOnly, setShowConstitutionReadOnly] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(constitutionKey).then((val) => {
      if (val) {
        setConstitutionSigned(true);
        try {
          setConstitutionSignedDate(
            new Date(val).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
          );
        } catch { setConstitutionSignedDate(undefined); }
      } else {
        setConstitutionSigned(false);
      }
    });
  }, [constitutionKey]);

  const handleConstitutionAccept = async () => {
    const iso = new Date().toISOString();
    await AsyncStorage.setItem(constitutionKey, iso);
    setConstitutionSigned(true);
    setConstitutionSignedDate(
      new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
    );
  };

  const handleConstitutionDecline = () => {
    if (!constitutionSigned) router.back();
    else setShowConstitutionReadOnly(false);
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  if (!stokvel) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Stokvel not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── Photo picker ───────────────────────────────────── */
  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow access to photos to set a group picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        updateStokvelPhoto(stokvel.id, result.assets[0].uri);
      }
    } catch {}
  };

  /* ── Share invite link ──────────────────────────────── */
  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message:
          `Join our stokvel "${stokvel.name}" on StockFair 🤝\n\n` +
          `Contribute R ${stokvel.contributionAmount.toLocaleString('en-ZA')} ${stokvel.frequency} and save together.\n\n` +
          `Join here: stockfair://join/${stokvel.id}\n\n` +
          `Download StockFair: https://stockfair.app`,
        title: `Invite to ${stokvel.name}`,
      });
    } catch {}
  };

  /* ── Derived state ──────────────────────────────────── */
  const isGrocery    = stokvel.type === 'grocery';
  const isInvestment = stokvel.type === 'investment';
  const tabs: { key: TabKey; label: string; icon: string; nav?: boolean }[] = [
    { key: 'members', label: 'Members',    icon: 'users' },
    { key: 'rules',   label: 'Rules',      icon: 'file-text' },
    { key: 'history', label: 'History',    icon: 'clock' },
    ...(isGrocery    ? [{ key: 'cart'   as TabKey, label: 'Group Cart', icon: 'shopping-cart' as string }] : []),
    ...(isInvestment ? [{ key: 'invest' as TabKey, label: 'Invest',     icon: 'trending-up'   as string, nav: true }] : []),
  ];

  const nextDate   = new Date(stokvel.nextPayout).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  const potTarget  = stokvel.contributionAmount * stokvel.members.length;
  const potProgress= Math.min(stokvel.totalSaved / Math.max(potTarget, 1), 1);
  const paid    = stokvel.members.filter((m, i) => getMemberStatus(m, i) === 'paid').length;
  const pending = stokvel.members.filter((m, i) => getMemberStatus(m, i) === 'pending').length;
  const overdue = stokvel.members.filter((m, i) => getMemberStatus(m, i) === 'overdue').length;
  const months  = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const bars    = [0.85, 1.0, 0.92, 1.0, 1.0, 0.78];

  const handleContribute = (amt: number, method: 'wallet' | 'eft') => {
    addTransaction({
      stokvelId: stokvel.id, stokvelName: stokvel.name,
      type: 'contribution', amount: amt,
      date: new Date().toISOString(),
      description: `${stokvel.frequency.charAt(0).toUpperCase() + stokvel.frequency.slice(1)} contribution · ${method === 'wallet' ? 'Wallet' : 'EFT'}`,
      status: method === 'wallet' ? 'paid' : 'pending',
    });
    setShowContribute(false);
  };

  const handleDelete = () => {
    Alert.alert('Leave Stokvel', `Are you sure you want to leave ${stokvel.name}?`, [
      { text: t('cancel'), style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => { removeStokvel(stokvel.id); router.back(); } },
    ]);
  };

  /* ─────────────────────────────────────────────────── */
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero ───────────────────────────────────── */}
        <LinearGradient colors={[stokvel.color, stokvel.color + 'BB']} style={[styles.hero, { paddingTop: topPadding + 8 }]}>
          {/* Back + share row */}
          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Icon name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.heroIconBtn} onPress={handleShare}>
              <Icon name="user-plus" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroIconBtn}>
              <Icon name="more-vertical" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Title row with group photo */}
          <View style={styles.heroTitleRow}>
            {/* Tappable group photo / icon */}
            <TouchableOpacity style={styles.heroPhotoWrap} onPress={handlePickPhoto} activeOpacity={0.8}>
              {stokvel.photo ? (
                <Image source={{ uri: stokvel.photo }} style={styles.heroPhoto} />
              ) : (
                <View style={[styles.heroPhotoDefault, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <Icon name={stokvel.icon as any} size={22} color="#fff" />
                </View>
              )}
              <View style={styles.heroPhotoCamBtn}>
                <Icon name="camera" size={9} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{stokvel.name}</Text>
              <Text style={styles.heroType}>{t(stokvel.type as any)} · {t(stokvel.frequency as any)}</Text>
            </View>

            {isGrocery && (
              <View style={styles.groceryBadge}>
                <Icon name="shopping-cart" size={12} color="#fff" />
                <Text style={styles.groceryBadgeText}>Grocery</Text>
              </View>
            )}
          </View>

          {/* Stats row */}
          <View style={styles.heroStats}>
            {[
              { val: `R ${stokvel.totalSaved.toLocaleString('en-ZA')}`, lbl: t('totalSavings') },
              { val: `${stokvel.members.length}/${stokvel.maxMembers}`,  lbl: t('members') },
              { val: `R ${stokvel.contributionAmount}`,                  lbl: t('monthlyContribution') },
            ].map((s, i) => (
              <React.Fragment key={s.lbl}>
                {i > 0 && <View style={styles.heroStatDiv} />}
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{s.val}</Text>
                  <Text style={styles.heroStatLabel}>{s.lbl}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>

        {/* ── Status bar ─────────────────────────────── */}
        <View style={[styles.statusBar, { backgroundColor: colors.card }]}>
          {[{ label: 'Paid', count: paid, color: '#16A34A' }, { label: 'Pending', count: pending, color: '#737373' }, { label: 'Overdue', count: overdue, color: '#E53E3E' }].map((s) => (
            <View key={s.label} style={styles.statusCell}>
              <Text style={[styles.statusCount, { color: s.color }]}>{s.count}</Text>
              <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Group Pot ──────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={[styles.potCard, { backgroundColor: colors.card }]}>
            <View style={styles.potHeader}>
              <View>
                <Text style={[styles.potTitle, { color: colors.foreground }]}>Group Pot</Text>
                <Text style={[styles.potSub, { color: colors.mutedForeground }]}>R {stokvel.totalSaved.toLocaleString('en-ZA')} of R {potTarget.toLocaleString('en-ZA')} target</Text>
              </View>
              <View style={[styles.potPct, { backgroundColor: stokvel.color + '18' }]}>
                <Text style={[styles.potPctText, { color: stokvel.color }]}>{Math.round(potProgress * 100)}%</Text>
              </View>
            </View>
            <View style={[styles.potTrack, { backgroundColor: colors.muted }]}>
              <LinearGradient colors={[stokvel.color, stokvel.color + 'AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.potFill, { width: `${Math.max(potProgress * 100, 3)}%` as any }]} />
            </View>
            <View style={styles.potFooter}>
              <Icon name="calendar" size={13} color={colors.mutedForeground} />
              <Text style={[styles.potPayoutLabel, { color: colors.foreground }]}>
                Next payout: <Text style={{ color: colors.foreground, fontWeight: '700' }}>{nextDate}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* ── Actions ────────────────────────────────── */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionPrimary, { backgroundColor: stokvel.color }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowContribute(true); }}>
            <Icon name="plus-circle" size={18} color="#fff" />
            <Text style={styles.actionPrimaryText}>{t('contributeNow')}</Text>
          </TouchableOpacity>
          {stokvel.type === 'burial' && (
            <TouchableOpacity
              style={[styles.actionSecondary, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowClaim(true); }}
            >
              <Icon name="file-text" size={18} color={colors.foreground} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionSecondary, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={handleShare}>
            <Icon name="user-plus" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionSecondary, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/messages/${stokvel.id}`); }}>
            <Icon name="message-circle" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* ── Context Banner ─────────────────────────── */}
        <GroupContextBanner stokvel={stokvel} colors={colors} />

        {/* ── Tabs ───────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} style={{ marginBottom: 4 }}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, { backgroundColor: activeTab === tab.key ? stokvel.color : colors.card, borderColor: activeTab === tab.key ? stokvel.color : colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (tab.nav) { router.push({ pathname: '/stokvel/invest', params: { id: stokvel.id } }); return; }
                setActiveTab(tab.key);
              }}
            >
              <Icon name={tab.icon} size={13} color={activeTab === tab.key ? '#fff' : colors.mutedForeground} />
              <Text style={[styles.tabChipLabel, { color: activeTab === tab.key ? '#fff' : colors.mutedForeground }]}>{tab.label}</Text>
              {tab.nav && <Icon name="external-link" size={11} color={activeTab === tab.key ? '#fff' : colors.mutedForeground} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── MEMBERS ────────────────────────────────── */}
        {activeTab === 'members' && (
          <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
            <View style={[styles.membersCard, { backgroundColor: colors.card }]}>
              {stokvel.members.map((member, idx) => {
                const isYou  = member.id === 'me';
                const status = getMemberStatus(member, idx);
                const sc     = STATUS_CONFIG[status];
                const amtDue = stokvel.contributionAmount;
                const amtPaid= status === 'paid' ? amtDue : status === 'pending' ? Math.round(amtDue * 0.5) : 0;
                const isNext = member.position === (stokvel.currentPosition % stokvel.members.length) + 1;
                return (
                  <View key={member.id} style={[styles.memberRow, idx < stokvel.members.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <View style={[styles.memberPos, { backgroundColor: isNext ? stokvel.color : stokvel.color + '20' }]}>
                      <Text style={[styles.memberPosText, { color: isNext ? '#fff' : stokvel.color }]}>#{member.position}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.memberNameRow}>
                        <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}{isYou ? ' (You)' : ''}</Text>
                        {isNext && <View style={[styles.nextPill, { backgroundColor: stokvel.color + '20' }]}><Text style={[styles.nextPillText, { color: stokvel.color }]}>Next</Text></View>}
                      </View>
                      <Text style={[styles.memberAmount, { color: colors.mutedForeground }]}>R {amtPaid.toLocaleString('en-ZA')} of R {amtDue.toLocaleString('en-ZA')} paid</Text>
                      <View style={[styles.miniTrack, { backgroundColor: colors.muted }]}>
                        <View style={[styles.miniFill, { width: `${amtPaid / amtDue * 100}%` as any, backgroundColor: sc.color }]} />
                      </View>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                      <Icon name={sc.icon} size={12} color={sc.color} />
                      <Text style={[styles.statusPillText, { color: sc.color }]}>{sc.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── RULES ──────────────────────────────────── */}
        {activeTab === 'rules' && (
          <View style={{ paddingHorizontal: 20, marginTop: 12, gap: 12 }}>

            {/* Constitution card */}
            <TouchableOpacity
              style={[constitutionCardStyles.card, { backgroundColor: colors.card, borderColor: constitutionSigned ? '#27AE6030' : stokvel.color + '40' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowConstitutionReadOnly(true); }}
              activeOpacity={0.82}
            >
              <View style={[constitutionCardStyles.iconWrap, { backgroundColor: constitutionSigned ? '#27AE6018' : stokvel.color + '18' }]}>
                <Icon name={constitutionSigned ? 'shield' : 'file-text'} size={20} color={constitutionSigned ? '#27AE60' : stokvel.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[constitutionCardStyles.title, { color: colors.foreground }]}>Group Constitution</Text>
                <Text style={[constitutionCardStyles.sub, { color: colors.mutedForeground }]}>
                  {constitutionSigned ? 'Signed · Tap to view your signed constitution' : 'NASASA-aligned · Must be signed to participate'}
                </Text>
              </View>
              <View style={[constitutionCardStyles.badge, { backgroundColor: constitutionSigned ? '#27AE6018' : '#E74C3C18' }]}>
                <Icon name={constitutionSigned ? 'check-circle' : 'alert-circle'} size={13} color={constitutionSigned ? '#27AE60' : '#E74C3C'} />
                <Text style={[constitutionCardStyles.badgeText, { color: constitutionSigned ? '#27AE60' : '#E74C3C' }]}>
                  {constitutionSigned ? 'Signed' : 'Required'}
                </Text>
              </View>
            </TouchableOpacity>

            <SectionCard title="Contribution Rules" colors={colors}>
              {[
                { icon: 'calendar',    label: 'Frequency',         value: stokvel.frequency.charAt(0).toUpperCase() + stokvel.frequency.slice(1) },
                { icon: 'dollar-sign', label: 'Amount per period', value: `R ${stokvel.contributionAmount.toLocaleString('en-ZA')}` },
                { icon: 'users',       label: 'Max members',       value: `${stokvel.maxMembers} members` },
                { icon: 'alert-circle',label: 'Late penalty',      value: '5% of contribution' },
                { icon: 'clock',       label: 'Grace period',      value: '3 days after due date' },
              ].map((rule, i) => (
                <View key={rule.label} style={[styles.ruleRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <View style={[styles.ruleIcon, { backgroundColor: stokvel.color + '15' }]}><Icon name={rule.icon as any} size={15} color={stokvel.color} /></View>
                  <Text style={[styles.ruleLabel, { color: colors.mutedForeground }]}>{rule.label}</Text>
                  <Text style={[styles.ruleValue, { color: colors.foreground }]}>{rule.value}</Text>
                </View>
              ))}
            </SectionCard>
            <SectionCard title="Payout Order" colors={colors}>
              {stokvel.members.map((m, i) => (
                <View key={m.id} style={[styles.payoutRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <Text style={[styles.payoutPos, { color: stokvel.color }]}>#{m.position}</Text>
                  <Text style={[styles.payoutName, { color: colors.foreground }]}>{m.name}</Text>
                  {m.id === 'me' && <View style={[styles.youBadge, { backgroundColor: stokvel.color }]}><Text style={styles.youBadgeText}>You</Text></View>}
                </View>
              ))}
            </SectionCard>
          </View>
        )}

        {/* ── HISTORY ────────────────────────────────── */}
        {activeTab === 'history' && (
          <View style={{ paddingHorizontal: 20, marginTop: 12, gap: 12 }}>
            <SectionCard title="Your Contribution History" colors={colors}>
              <View style={styles.historyChart}>
                {months.map((month, i) => (
                  <View key={month} style={styles.historyBarCol}>
                    <Text style={[styles.historyBarPct, { color: bars[i] >= 1 ? colors.success : colors.mutedForeground }]}>{bars[i] >= 1 ? '✓' : `${Math.round(bars[i] * 100)}%`}</Text>
                    <View style={[styles.historyBarTrack, { backgroundColor: colors.muted }]}>
                      <View style={[styles.historyBarFill, { height: `${bars[i] * 100}%` as any, backgroundColor: bars[i] >= 1 ? colors.success : colors.muted }]} />
                    </View>
                    <Text style={[styles.historyMonth, { color: colors.mutedForeground }]}>{month}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.historySummary, { color: colors.mutedForeground }]}>5/6 months paid in full · On-time rate: 92%</Text>
            </SectionCard>
            <SectionCard title="Recent Transactions" colors={colors}>
              {[
                { date: 'Apr 1, 2026', amount: stokvel.contributionAmount, status: 'paid' as MemberStatus },
                { date: 'Mar 1, 2026', amount: stokvel.contributionAmount, status: 'paid' as MemberStatus },
                { date: 'Feb 1, 2026', amount: stokvel.contributionAmount, status: 'paid' as MemberStatus },
                { date: 'Jan 1, 2026', amount: Math.round(stokvel.contributionAmount * 0.78), status: 'pending' as MemberStatus },
              ].map((tx, i) => {
                const sc = STATUS_CONFIG[tx.status];
                return (
                  <View key={i} style={[styles.txRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <View style={[styles.txIcon, { backgroundColor: sc.bg }]}><Icon name={sc.icon} size={15} color={sc.color} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txDesc, { color: colors.foreground }]}>Monthly Contribution</Text>
                      <Text style={[styles.txDate, { color: colors.mutedForeground }]}>{tx.date}</Text>
                    </View>
                    <Text style={[styles.txAmt, { color: colors.foreground }]}>R {tx.amount.toLocaleString('en-ZA')}</Text>
                  </View>
                );
              })}
            </SectionCard>
          </View>
        )}

        {/* ── GROUP CART (grocery only) ───────────────── */}
        {activeTab === 'cart' && isGrocery && (
          <GroupCartTab stokvel={stokvel} liveItems={cartItems} colors={colors} />
        )}

        {/* ── Danger zone ────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: 24, paddingBottom: 8 }}>
          <TouchableOpacity style={[styles.dangerBtn, { borderColor: colors.destructive + '40' }]} onPress={handleDelete}>
            <Icon name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.dangerText, { color: colors.destructive }]}>Leave Stokvel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Burial claim modal ─────────────────────────── */}
      {stokvel.type === 'burial' && (
        <BurialClaimModal
          visible={showClaim}
          onClose={() => setShowClaim(false)}
          stokvel={stokvel}
          colors={colors}
        />
      )}

      {/* ── Payment modal ──────────────────────────────── */}
      <PaymentModal
        visible={showContribute}
        onClose={() => setShowContribute(false)}
        stokvel={stokvel}
        colors={colors}
        userBalance={userBalance}
        onConfirm={handleContribute}
      />

      {/* ── Constitution modal (blocking until signed) ── */}
      <ConstitutionModal
        visible={constitutionSigned === false}
        groupName={stokvel.name}
        groupType={stokvel.type}
        contributionAmount={stokvel.contributionAmount}
        frequency={stokvel.frequency}
        memberName="Thandi Dlamini"
        onAccept={handleConstitutionAccept}
        onDecline={handleConstitutionDecline}
        readOnly={false}
      />

      {/* ── Constitution modal (read-only view) ─────── */}
      <ConstitutionModal
        visible={showConstitutionReadOnly}
        groupName={stokvel.name}
        groupType={stokvel.type}
        contributionAmount={stokvel.contributionAmount}
        frequency={stokvel.frequency}
        memberName="Thandi Dlamini"
        onAccept={handleConstitutionAccept}
        onDecline={handleConstitutionDecline}
        readOnly={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero:        { paddingHorizontal: 20, paddingBottom: 28, gap: 6 },
  heroTopRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  heroIconBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 19, marginLeft: 6 },
  heroTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  heroPhotoWrap:{ position: 'relative' },
  heroPhoto:   { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  heroPhotoDefault:{ width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  heroPhotoCamBtn: { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  heroName:    { color: '#fff', fontSize: 22, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  heroType:    { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  groceryBadge:{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  groceryBadgeText:{ color: '#fff', fontSize: 11, fontWeight: '700' },
  heroStats:   { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 14, paddingVertical: 14 },
  heroStat:    { flex: 1, alignItems: 'center', gap: 3 },
  heroStatValue:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  heroStatLabel:{ color: 'rgba(255,255,255,0.65)', fontSize: 10 },
  heroStatDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  statusBar:   { flexDirection: 'row', marginHorizontal: 20, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingVertical: 12 },
  statusCell:  { flex: 1, alignItems: 'center', gap: 2 },
  statusCount: { fontSize: 20, fontWeight: '800' },
  statusLabel: { fontSize: 10, fontWeight: '500' },

  potCard:     { borderRadius: 16, padding: 16, gap: 10 },
  potHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  potTitle:    { fontSize: 15, fontWeight: '700' },
  potSub:      { fontSize: 12, marginTop: 2 },
  potPct:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  potPctText:  { fontSize: 13, fontWeight: '700' },
  potTrack:    { height: 6, borderRadius: 3, overflow: 'hidden' },
  potFill:     { height: '100%', borderRadius: 3 },
  potFooter:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  potPayoutLabel:{ fontSize: 12 },

  actions:     { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginVertical: 18 },
  actionPrimary:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14 },
  actionPrimaryText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  actionSecondary:{ width: 48, height: 48, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  tabChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabChipLabel: { fontSize: 13, fontWeight: '600' },

  membersCard:  { borderRadius: 16, overflow: 'hidden' },
  memberRow:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  memberPos:    { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  memberPosText:{ fontSize: 12, fontWeight: '700' },
  memberNameRow:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName:   { fontSize: 14, fontWeight: '600' },
  memberAmount: { fontSize: 11, marginTop: 2 },
  miniTrack:    { height: 3, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  miniFill:     { height: '100%', borderRadius: 2 },
  nextPill:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  nextPillText: { fontSize: 10, fontWeight: '700' },
  statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusPillText:{ fontSize: 11, fontWeight: '600' },

  sectionCard:  { borderRadius: 16, padding: 16 },
  sectionCardTitle:{ fontSize: 15, fontWeight: '700', marginBottom: 12 },

  ruleRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  ruleIcon:     { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  ruleLabel:    { flex: 1, fontSize: 13 },
  ruleValue:    { fontSize: 13, fontWeight: '600' },

  payoutRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  payoutPos:    { fontSize: 13, fontWeight: '700', width: 28 },
  payoutName:   { flex: 1, fontSize: 14 },
  youBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  youBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  historyChart:  { flexDirection: 'row', justifyContent: 'space-between', height: 90, marginBottom: 10 },
  historyBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  historyBarPct: { fontSize: 9, fontWeight: '700' },
  historyBarTrack:{ flex: 1, width: 18, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  historyBarFill: { width: '100%', borderRadius: 4 },
  historyMonth:  { fontSize: 9 },
  historySummary:{ fontSize: 11, textAlign: 'center', marginTop: 4 },

  txRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  txIcon:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txDesc:  { fontSize: 13, fontWeight: '500' },
  txDate:  { fontSize: 11, marginTop: 2 },
  txAmt:   { fontSize: 14, fontWeight: '700' },

  dangerBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  dangerText:   { fontSize: 14, fontWeight: '600' },

  modal:        { flex: 1, padding: 24 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 22, fontWeight: '700' },
  modalDesc:    { fontSize: 14, marginBottom: 24 },
  amountInput:  { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 16, gap: 8, marginBottom: 24 },
  currencyPrefix:{ fontSize: 28, fontWeight: '700' },
  amountText:   { fontSize: 36, fontWeight: '700', flex: 1 },
  confirmBtn:   { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  confirmBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
  notFound:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
});

const constitutionCardStyles = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 14 },
  iconWrap:  { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  sub:       { fontSize: 11, lineHeight: 16 },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
