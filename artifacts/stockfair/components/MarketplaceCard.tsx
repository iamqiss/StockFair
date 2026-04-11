import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@/components/Icon';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useStokvel } from '@/context/StokvelContext';
import type { Stokvel } from '@/context/StokvelContext';

const { width: SCREEN_W } = Dimensions.get('window');

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  minOrder: number;
  retailer: string;
  retailerLogo?: string;
  category: string;
  discount?: number;
  featured?: boolean;
  savings?: number;
};

type Props = { product: Product; compact?: boolean; grid?: boolean };

const RETAILER_COLORS: Record<string, string> = {
  Shoprite:    '#D7282F',
  'Pick n Pay':'#1B3D79',
  Spar:        '#007A2E',
  Checkers:    '#00A79D',
  Woolworths:  '#1A1A1A',
};

const RETAILER_ICONS: Record<string, string> = {
  Shoprite: 'shopping-cart',
  'Pick n Pay': 'tag',
  Spar: 'package',
  Checkers: 'check-circle',
  Woolworths: 'star',
};

const CATEGORY_ICONS: Record<string, string> = {
  Groceries: 'shopping-cart',
  Staples: 'layers',
  Produce: 'feather',
  Meat: 'zap',
  Dairy: 'droplet',
  Beverages: 'coffee',
  Cleaning: 'home',
  'Personal Care': 'user',
  Oils: 'droplet',
  'Canned Goods': 'archive',
  'Meat & Poultry': 'zap',
  default: 'package',
};

function getMemberCount(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return 4 + (n % 19);
}

/* Plain-language unit label — strips technical phrasing */
function friendlyUnit(unit: string): string {
  return unit
    .replace(/\bx\b/gi, '×')
    .replace(/\bpack\b/gi, 'pack')
    .toLowerCase();
}

/* How many tiles to show before the "More" tile */
const TILE_OPTIONS = [1, 2, 3, 4, 5, 6];

/* ═══════════════════════════════════════════════════════
   PRODUCT SHEET — full-screen tap experience
═══════════════════════════════════════════════════════ */
function ProductSheet({
  product,
  visible,
  onClose,
  colors,
}: {
  product: Product;
  visible: boolean;
  onClose: () => void;
  colors: any;
}) {
  const insets = useSafeAreaInsets();
  const { addItem, items, updateQuantity } = useCart();
  const { stokvels } = useStokvel();

  const [qty, setQty] = useState(1);
  const [showMore, setShowMore] = useState(false);
  /* 'detail' = main product view | 'pick-group' = group selector step */
  const [step, setStep] = useState<'detail' | 'pick-group'>('detail');

  const retailerColor  = RETAILER_COLORS[product.retailer] ?? '#333';
  const categoryIcon   = CATEGORY_ICONS[product.category] ?? CATEGORY_ICONS.default;
  const memberCount    = getMemberCount(product.id);
  const unit           = friendlyUnit(product.unit);
  const totalPrice     = product.price * qty;
  const totalSaved     = product.savings ? product.savings * qty : null;
  const cartItem       = items.find((i) => i.productId === product.id);

  /* Grocery groups the user belongs to */
  const groceryGroups  = stokvels.filter((s) => s.type === 'grocery');

  /* Reset state when sheet opens */
  useEffect(() => {
    if (visible) { setQty(1); setShowMore(false); setStep('detail'); }
  }, [visible]);

  /* ── Core add logic ────────────────────────────────── */
  const doAdd = (group?: Stokvel) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (cartItem) {
      updateQuantity(product.id, qty);
    } else {
      for (let i = 0; i < qty; i++) {
        addItem({
          productId:   product.id,
          name:        product.name,
          price:       product.price,
          unit:        product.unit,
          retailer:    product.retailer,
          stokvelId:   group?.id,
          stokvelName: group?.name,
        });
      }
    }
    onClose();
  };

  /* ── CTA tapped: decide whether to show group picker ── */
  const handleCTATap = () => {
    if (groceryGroups.length > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep('pick-group');
    } else {
      doAdd(groceryGroups[0]);
    }
  };

  const selectQty = (n: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQty(n);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[sheet.root, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>

        {/* ══════════════════════════════════════════════
            STEP: pick-group — choose which grocery group
        ══════════════════════════════════════════════ */}
        {step === 'pick-group' ? (
          <>
            {/* Header */}
            <View style={[sheet.pickerHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={sheet.pickerBack}
                onPress={() => setStep('detail')}
                activeOpacity={0.7}
              >
                <Icon name="arrow-left" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[sheet.pickerTitle, { color: colors.foreground }]}>Which group is this for?</Text>
                <Text style={[sheet.pickerSub, { color: colors.mutedForeground }]}>
                  {qty} {qty === 1 ? unit : unit + 's'} · R{totalPrice.toLocaleString('en-ZA')}
                </Text>
              </View>
            </View>

            {/* Group list */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
              {groceryGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[sheet.groupRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => doAdd(group)}
                  activeOpacity={0.82}
                >
                  {/* Colour dot */}
                  <View style={[sheet.groupDot, { backgroundColor: group.color }]}>
                    <Icon name="shopping-bag" size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[sheet.groupName, { color: colors.foreground }]}>{group.name}</Text>
                    <Text style={[sheet.groupMeta, { color: colors.mutedForeground }]}>
                      {group.members.length} member{group.members.length !== 1 ? 's' : ''} · R{group.contributionAmount.toLocaleString('en-ZA')}/month
                    </Text>
                  </View>
                  <View style={[sheet.groupSendBtn, { backgroundColor: colors.foreground }]}>
                    <Icon name="send" size={14} color={colors.background} />
                  </View>
                </TouchableOpacity>
              ))}

              {/* Cancel */}
              <TouchableOpacity
                style={[sheet.groupCancelBtn, { borderColor: colors.border }]}
                onPress={() => setStep('detail')}
              >
                <Text style={[sheet.groupCancelText, { color: colors.mutedForeground }]}>Go back</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        ) : (
        /* ══════════════════════════════════════════════
            STEP: detail — main product view
        ══════════════════════════════════════════════ */
          <>
            {/* ── Hero zone ────────────────────────── */}
            <LinearGradient
              colors={[retailerColor, retailerColor + 'BB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={sheet.hero}
            >
              <TouchableOpacity style={sheet.backBtn} onPress={onClose} activeOpacity={0.8}>
                <Icon name="chevron-down" size={18} color="#fff" />
              </TouchableOpacity>

              <View style={sheet.heroBadges}>
                {product.discount ? (
                  <View style={sheet.discountBadge}>
                    <Text style={sheet.discountBadgeText}>{product.discount}% OFF</Text>
                  </View>
                ) : null}
                {product.featured ? (
                  <View style={[sheet.discountBadge, { backgroundColor: '#fff' }]}>
                    <Icon name="star" size={9} color={retailerColor} />
                    <Text style={[sheet.discountBadgeText, { color: retailerColor }]}>Popular</Text>
                  </View>
                ) : null}
              </View>

              <View style={sheet.heroIconWrap}>
                <Icon name={categoryIcon} size={60} color="rgba(255,255,255,0.22)" />
              </View>

              <View style={sheet.retailerChip}>
                <Icon name={RETAILER_ICONS[product.retailer] ?? 'shopping-cart'} size={12} color="#fff" />
                <Text style={sheet.retailerChipText}>{product.retailer}</Text>
              </View>
            </LinearGradient>

            {/* ── Scrollable body ───────────────────── */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20 }}>

              <Text style={[sheet.name, { color: colors.foreground }]}>{product.name}</Text>
              <Text style={[sheet.desc, { color: colors.mutedForeground }]}>{product.description}</Text>

              <View style={sheet.priceRow}>
                <Text style={[sheet.price, { color: colors.foreground }]}>
                  R{product.price.toLocaleString('en-ZA')}
                </Text>
                <Text style={[sheet.priceUnit, { color: colors.mutedForeground }]}>
                  {' '}per {unit}
                </Text>
                {product.savings && qty === 1 ? (
                  <View style={sheet.savingsBubble}>
                    <Text style={sheet.savingsBubbleText}>Saves R{product.savings} vs store</Text>
                  </View>
                ) : null}
              </View>

              {/* Social proof */}
              <View style={[sheet.socialRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={sheet.socialAvatarStack}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[sheet.socialAvatar, { backgroundColor: retailerColor + (40 + i * 20).toString(16), borderColor: colors.background, marginLeft: i > 0 ? -8 : 0 }]}>
                      <Icon name="user" size={9} color={retailerColor} />
                    </View>
                  ))}
                </View>
                <Text style={[sheet.socialText, { color: colors.mutedForeground }]}>
                  {memberCount} group member{memberCount !== 1 ? 's' : ''} are looking at this
                </Text>
              </View>

              {/* ── Quantity picker ───────────────────── */}
              <View style={{ marginTop: 24 }}>
                <Text style={[sheet.pickLabel, { color: colors.foreground }]}>
                  How many for your group?
                </Text>
                <Text style={[sheet.pickSub, { color: colors.mutedForeground }]}>
                  Tap a number — each one is {unit}
                </Text>

                <View style={sheet.tileGrid}>
                  {TILE_OPTIONS.map((n) => {
                    const sel = qty === n && !showMore;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[sheet.tile, { backgroundColor: sel ? colors.foreground : colors.card, borderColor: sel ? colors.foreground : colors.border }]}
                        onPress={() => { setShowMore(false); selectQty(n); }}
                        activeOpacity={0.75}
                      >
                        <Text style={[sheet.tileNum, { color: sel ? colors.background : colors.foreground }]}>{n}</Text>
                        <Text style={[sheet.tileUnit, { color: sel ? colors.background + 'CC' : colors.mutedForeground }]} numberOfLines={1}>
                          {unit.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[sheet.tile, { backgroundColor: showMore ? colors.foreground : colors.card, borderColor: showMore ? colors.foreground : colors.border }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowMore(true); }}
                    activeOpacity={0.75}
                  >
                    <Icon name="more-horizontal" size={20} color={showMore ? colors.background : colors.mutedForeground} />
                    <Text style={[sheet.tileUnit, { color: showMore ? colors.background + 'CC' : colors.mutedForeground }]}>More</Text>
                  </TouchableOpacity>
                </View>

                {showMore && (
                  <View style={[sheet.customStepper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={[sheet.stepBtn, { backgroundColor: colors.muted }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQty((q) => Math.max(7, q - 1)); }}
                    >
                      <Icon name="minus" size={20} color={colors.foreground} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={[sheet.customStepNum, { color: colors.foreground }]}>{qty < 7 ? 7 : qty}</Text>
                      <Text style={[sheet.customStepUnit, { color: colors.mutedForeground }]}>{unit}</Text>
                    </View>
                    <TouchableOpacity
                      style={[sheet.stepBtn, { backgroundColor: colors.foreground }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQty((q) => (q < 7 ? 8 : q + 1)); }}
                    >
                      <Icon name="plus" size={20} color={colors.background} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* ── Running total ─────────────────────── */}
              <View style={[sheet.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[sheet.totalCardLabel, { color: colors.mutedForeground }]}>
                    {qty} {qty === 1 ? unit : unit + 's'} for your group
                  </Text>
                  {totalSaved ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <Icon name="tag" size={11} color="#16A34A" />
                      <Text style={[sheet.totalSavings, { color: '#16A34A' }]}>
                        Group saves R{totalSaved.toLocaleString('en-ZA')} vs store price
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[sheet.totalPrice, { color: colors.foreground }]}>
                  R{totalPrice.toLocaleString('en-ZA')}
                </Text>
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── Sticky CTA ───────────────────────────── */}
            <View style={[sheet.ctaBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[sheet.ctaBtn, { backgroundColor: cartItem ? '#16A34A' : colors.foreground }]}
                onPress={handleCTATap}
                activeOpacity={0.85}
              >
                <Icon
                  name={cartItem ? 'check-circle' : groceryGroups.length > 1 ? 'chevron-right' : 'users'}
                  size={20}
                  color={colors.background}
                />
                <Text style={[sheet.ctaBtnText, { color: colors.background }]}>
                  {cartItem
                    ? `Update — ${qty} ${qty === 1 ? unit : unit + 's'}`
                    : groceryGroups.length > 1
                      ? `Choose a group · R${totalPrice.toLocaleString('en-ZA')}`
                      : `Add to Group Order · R${totalPrice.toLocaleString('en-ZA')}`}
                </Text>
              </TouchableOpacity>
              <Text style={[sheet.ctaHint, { color: colors.mutedForeground }]}>
                {groceryGroups.length > 1
                  ? `You're in ${groceryGroups.length} grocery groups — pick which one`
                  : 'Your group members will see this before paying'}
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  root:             { flex: 1 },
  hero:             { height: 220, justifyContent: 'flex-end', alignItems: 'center', position: 'relative', paddingBottom: 20 },
  backBtn:          { position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  heroBadges:       { position: 'absolute', top: 16, right: 16, flexDirection: 'row', gap: 6 },
  discountBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E74C3C', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  discountBadgeText:{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  heroIconWrap:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  retailerChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.30)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  retailerChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  name:             { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, lineHeight: 28, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  desc:             { fontSize: 14, lineHeight: 20, marginTop: 5 },
  priceRow:         { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  price:            { fontSize: 30, fontWeight: '900', letterSpacing: -1, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', lineHeight: 34 },
  priceUnit:        { fontSize: 15, fontWeight: '400', marginBottom: 4 },
  savingsBubble:    { backgroundColor: '#16A34A18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 2 },
  savingsBubbleText:{ color: '#16A34A', fontSize: 11, fontWeight: '700' },

  socialRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 16 },
  socialAvatarStack:{ flexDirection: 'row' },
  socialAvatar:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  socialText:       { flex: 1, fontSize: 13, fontWeight: '500' },

  pickLabel:        { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  pickSub:          { fontSize: 13, marginTop: 4, marginBottom: 16 },

  tileGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile:             { width: (SCREEN_W - 44 - 50) / 4, aspectRatio: 0.9, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', gap: 4 },
  tileNum:          { fontSize: 26, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', lineHeight: 30 },
  tileUnit:         { fontSize: 10, fontWeight: '600', textAlign: 'center', paddingHorizontal: 2 },

  customStepper:    { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1.5, marginTop: 12, overflow: 'hidden', height: 70 },
  stepBtn:          { width: 64, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  customStepNum:    { fontSize: 32, fontWeight: '900', lineHeight: 36 },
  customStepUnit:   { fontSize: 11, marginTop: 2 },

  totalCard:        { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1.5, padding: 18, marginTop: 20 },
  totalCardLabel:   { fontSize: 14, fontWeight: '600' },
  totalSavings:     { fontSize: 12, fontWeight: '600' },
  totalPrice:       { fontSize: 28, fontWeight: '900', letterSpacing: -0.8, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },

  ctaBar:           { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 14, gap: 8 },
  ctaBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, borderRadius: 18 },
  ctaBtnText:       { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  ctaHint:          { fontSize: 11, textAlign: 'center' },

  /* Group picker */
  pickerHeader:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerBack:       { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  pickerTitle:      { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  pickerSub:        { fontSize: 13, marginTop: 2 },
  groupRow:         { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1.5 },
  groupDot:         { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  groupName:        { fontSize: 15, fontWeight: '700' },
  groupMeta:        { fontSize: 12, marginTop: 2 },
  groupSendBtn:     { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  groupCancelBtn:   { alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  groupCancelText:  { fontSize: 14, fontWeight: '600' },
});

/* ═══════════════════════════════════════════════════════
   GRID CARD — taps open the ProductSheet
═══════════════════════════════════════════════════════ */
export function MarketplaceGridCard({ product }: { product: Product }) {
  const colors = useColors();
  const { items } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);

  const cartItem      = items.find((i) => i.productId === product.id);
  const retailerColor = RETAILER_COLORS[product.retailer] ?? '#333';
  const categoryIcon  = CATEGORY_ICONS[product.category] ?? CATEGORY_ICONS.default;
  const memberCount   = getMemberCount(product.id);
  const cardW         = (SCREEN_W - 52) / 2;

  return (
    <>
      <TouchableOpacity
        style={[gridStyles.card, { backgroundColor: colors.card, width: cardW, shadowColor: retailerColor }]}
        activeOpacity={0.86}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheetOpen(true); }}
      >
        {/* Coloured hero zone */}
        <LinearGradient
          colors={[retailerColor + 'D8', retailerColor + '88']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={gridStyles.headerZone}
        >
          <Icon name={categoryIcon} size={32} color="rgba(255,255,255,0.25)" />

          {product.discount ? (
            <View style={gridStyles.discountBadge}>
              <Text style={gridStyles.discountText}>{product.discount}%</Text>
            </View>
          ) : null}

          {cartItem && (
            <View style={gridStyles.addedBadge}>
              <Icon name="check" size={9} color="#fff" />
              <Text style={gridStyles.addedBadgeText}>Added</Text>
            </View>
          )}

          <View style={gridStyles.membersRow}>
            <Icon name="users" size={9} color="rgba(255,255,255,0.85)" />
            <Text style={gridStyles.membersText}>{memberCount}</Text>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={gridStyles.content}>
          <Text style={[gridStyles.retailer, { color: retailerColor }]} numberOfLines={1}>
            {product.retailer}
          </Text>
          <Text style={[gridStyles.name, { color: colors.foreground }]} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={[gridStyles.price, { color: colors.foreground }]}>
            R{product.price.toLocaleString('en-ZA')}
          </Text>
          <Text style={[gridStyles.unit, { color: colors.mutedForeground }]}>
            per {friendlyUnit(product.unit)}
          </Text>

          {/* Tap-to-open hint */}
          <View style={[gridStyles.tapHint, { backgroundColor: cartItem ? '#16A34A' : retailerColor + '18' }]}>
            <Icon name={cartItem ? 'check-circle' : 'shopping-bag'} size={11} color={cartItem ? '#fff' : retailerColor} />
            <Text style={[gridStyles.tapHintText, { color: cartItem ? '#fff' : retailerColor }]}>
              {cartItem ? 'In group order' : 'Tap to pick'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <ProductSheet
        product={product}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        colors={colors}
      />
    </>
  );
}

const gridStyles = StyleSheet.create({
  card:         { borderRadius: 20, overflow: 'hidden', marginBottom: 12, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 3 },
  headerZone:   { height: 100, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  discountBadge:{ position: 'absolute', top: 7, left: 8, backgroundColor: '#E74C3C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  addedBadge:   { position: 'absolute', top: 7, right: 7, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#16A34A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  addedBadgeText:{ color: '#fff', fontSize: 9, fontWeight: '700' },
  membersRow:   { position: 'absolute', bottom: 6, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  membersText:  { color: 'rgba(255,255,255,0.92)', fontSize: 9, fontWeight: '600' },
  content:      { padding: 11, gap: 4 },
  retailer:     { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  name:         { fontSize: 13, fontWeight: '700', lineHeight: 17, minHeight: 34 },
  price:        { fontSize: 16, fontWeight: '900', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  unit:         { fontSize: 10 },
  tapHint:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, marginTop: 6 },
  tapHintText:  { fontSize: 11, fontWeight: '700' },
});

/* ═══════════════════════════════════════════════════════
   LIST CARD — taps open the ProductSheet
═══════════════════════════════════════════════════════ */
export function MarketplaceCard({ product, compact }: Props) {
  const colors        = useColors();
  const { addItem, items } = useCart();
  const { t }         = useLanguage();
  const [sheetOpen, setSheetOpen] = useState(false);

  const cartItem      = items.find((i) => i.productId === product.id);
  const retailerColor = RETAILER_COLORS[product.retailer] ?? '#333';
  const categoryIcon  = CATEGORY_ICONS[product.category] ?? CATEGORY_ICONS.default;
  const memberCount   = getMemberCount(product.id);

  if (compact) {
    /* Compact home-screen card */
    const retailerIcon = RETAILER_ICONS[product.retailer] ?? 'shopping-cart';
    const handlePreOrder = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      addItem({ productId: product.id, name: product.name, price: product.price, unit: product.unit, retailer: product.retailer });
    };
    return (
      <TouchableOpacity style={[compactStyles.card, { backgroundColor: colors.card, shadowColor: retailerColor }]} activeOpacity={0.86} onPress={handlePreOrder}>
        <LinearGradient colors={[retailerColor, retailerColor + 'BB']} style={compactStyles.swatch}>
          <Icon name={retailerIcon} size={18} color="#fff" />
        </LinearGradient>
        <View style={compactStyles.body}>
          <Text style={[compactStyles.retailer, { color: retailerColor }]}>{product.retailer}</Text>
          <Text style={[compactStyles.name, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text>
          <Text style={[compactStyles.price, { color: colors.foreground }]}>R{product.price.toLocaleString('en-ZA')}</Text>
          <Text style={[compactStyles.members, { color: colors.mutedForeground }]}>{memberCount} pre-ordering</Text>
        </View>
        <TouchableOpacity onPress={handlePreOrder} style={[compactStyles.orderBtn, { backgroundColor: cartItem ? '#16A34A18' : colors.muted }]}>
          <Icon name={cartItem ? 'check' : 'clock'} size={16} color={cartItem ? '#16A34A' : colors.foreground} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[fullStyles.card, { backgroundColor: colors.card, shadowColor: retailerColor }]}
        activeOpacity={0.86}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheetOpen(true); }}
      >
        {/* Image zone */}
        <LinearGradient
          colors={[retailerColor + 'E8', retailerColor + '60']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={fullStyles.imageZone}
        >
          <Icon name={categoryIcon} size={44} color="rgba(255,255,255,0.22)" />

          <View style={fullStyles.retailerChip}>
            <Icon name={RETAILER_ICONS[product.retailer] ?? 'shopping-cart'} size={11} color="#fff" />
            <Text style={fullStyles.retailerChipText}>{product.retailer}</Text>
          </View>

          {product.discount ? (
            <View style={fullStyles.discountBadge}><Text style={fullStyles.discountText}>{product.discount}% OFF</Text></View>
          ) : null}

          {product.featured ? (
            <View style={[fullStyles.featuredBadge, { backgroundColor: '#fff' }]}>
              <Icon name="star" size={9} color="#000" />
              <Text style={[fullStyles.featuredText, { color: '#000' }]}>Popular</Text>
            </View>
          ) : null}

          {cartItem && (
            <View style={[fullStyles.addedBadge]}>
              <Icon name="check-circle" size={12} color="#fff" />
              <Text style={fullStyles.addedBadgeText}>In group order</Text>
            </View>
          )}

          <View style={fullStyles.membersBadge}>
            <Icon name="users" size={11} color="rgba(255,255,255,0.9)" />
            <Text style={fullStyles.membersBadgeText}>{memberCount} looking</Text>
          </View>

          {/* "Tap to pick" nudge */}
          <View style={fullStyles.tapNudge}>
            <Icon name="arrow-up-right" size={11} color="rgba(255,255,255,0.75)" />
            <Text style={fullStyles.tapNudgeText}>Tap to pick</Text>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={fullStyles.content}>
          <Text style={[fullStyles.productName, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text>

          <View style={fullStyles.priceRow}>
            <Text style={[fullStyles.price, { color: colors.foreground }]}>R{product.price.toLocaleString('en-ZA')}</Text>
            <Text style={[fullStyles.priceUnit, { color: colors.mutedForeground }]}>per {friendlyUnit(product.unit)}</Text>
            {product.savings ? (
              <View style={[fullStyles.savingsBadge, { backgroundColor: '#27AE6018' }]}>
                <Text style={[fullStyles.savingsText, { color: '#27AE60' }]}>Saves R{product.savings}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      <ProductSheet
        product={product}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        colors={colors}
      />
    </>
  );
}

const compactStyles = StyleSheet.create({
  card:     { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginRight: 12, width: 210, overflow: 'hidden', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 3 },
  swatch:   { width: 56, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  body:     { flex: 1, paddingVertical: 12, paddingHorizontal: 10, gap: 2 },
  retailer: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  name:     { fontSize: 13, fontWeight: '600', lineHeight: 17 },
  price:    { fontSize: 14, fontWeight: '800', marginTop: 2 },
  members:  { fontSize: 10, marginTop: 1 },
  orderBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
});

const fullStyles = StyleSheet.create({
  card:            { borderRadius: 20, overflow: 'hidden', marginBottom: 14, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 3 },
  imageZone:       { height: 130, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  retailerChip:    { position: 'absolute', bottom: 10, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.30)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  retailerChipText:{ color: '#fff', fontSize: 11, fontWeight: '600' },
  discountBadge:   { position: 'absolute', top: 10, left: 12, backgroundColor: '#E74C3C', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  discountText:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  featuredBadge:   { position: 'absolute', top: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  featuredText:    { fontSize: 11, fontWeight: '700' },
  addedBadge:      { position: 'absolute', top: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#16A34A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  addedBadgeText:  { color: '#fff', fontSize: 10, fontWeight: '700' },
  membersBadge:    { position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.28)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  membersBadgeText:{ color: 'rgba(255,255,255,0.92)', fontSize: 10, fontWeight: '600' },
  tapNudge:        { position: 'absolute', top: 10, left: 12, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12 },
  tapNudgeText:    { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },
  content:         { padding: 14, gap: 6 },
  productName:     { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  priceRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  price:           { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  priceUnit:       { fontSize: 12 },
  savingsBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  savingsText:     { fontSize: 11, fontWeight: '700' },
});
