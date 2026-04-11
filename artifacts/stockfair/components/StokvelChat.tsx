import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Stokvel, ChatMessage, VoteItem, VoteChoice, MOCK_CHAT } from '@/context/StokvelContext';
import { MARKETPLACE_PRODUCTS } from '@/constants/marketplace';
import { useColors } from '@/hooks/useColors';

const SCREEN_W     = Dimensions.get('window').width;
const MAX_BUBBLE_W = SCREEN_W * 0.74;

const WAVEFORM = [4,7,12,18,24,30,22,14,26,32,20,10,28,16,8,22,30,18,12,6,20,28,14,10,24,32,18,8,16,22];

const AVATAR_PALETTE = ['#E67E22','#27AE60','#3498DB','#9B59B6','#E74C3C','#1ABC9C','#F39C12','#2980B9'];
function avatarColor(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length];
}
function initials(name: string) {
  return name === 'You' ? 'ME' : name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(1, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const RETAILER_COLORS: Record<string, string> = {
  Shoprite: '#D7282F', 'Pick n Pay': '#1B3D79', Spar: '#007A2E',
  Checkers: '#00A79D', Woolworths: '#1A1A1A', Makro: '#E8690A',
};
const CATEGORY_ICONS: Record<string, string> = {
  staples: 'package', protein: 'heart', dairy: 'droplet', produce: 'feather',
  beverages: 'coffee', household: 'home', personal: 'user', snacks: 'star',
};
const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/* ── Member avatar ────────────────────────────────────── */
function MemberAvatar({ name, id, size = 32 }: { name: string; id: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(id), justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.34, fontWeight: '700' }}>{initials(name)}</Text>
    </View>
  );
}

/* ── Typing dots indicator ────────────────────────────── */
function TypingDots({ colors }: { colors: any }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.delay(300),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={[tS.bubble, { backgroundColor: colors.muted }]}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[tS.dot, { backgroundColor: colors.mutedForeground, opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]} />
      ))}
    </View>
  );
}
const tS = StyleSheet.create({
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, borderBottomLeftRadius: 4, alignSelf: 'flex-start' },
  dot:    { width: 7, height: 7, borderRadius: 4 },
});

/* ── Vote card ────────────────────────────────────────── */
function VoteCard({ vote, memberCount, myVote, onVote }: {
  vote: VoteItem; memberCount: number; myVote?: VoteChoice; onVote: (id: string, c: VoteChoice) => void;
}) {
  const colors   = useColors();
  const yesCount = Object.values(vote.votes).filter((v) => v === 'yes').length + (myVote === 'yes' ? 1 : 0);
  const noCount  = Object.values(vote.votes).filter((v) => v === 'no').length  + (myVote === 'no'  ? 1 : 0);
  const pct      = Math.round((yesCount / memberCount) * 100);
  const approved = yesCount >= vote.requiredVotes;
  const rejected = noCount  > (memberCount - vote.requiredVotes);
  const status   = approved ? 'approved' : rejected ? 'rejected' : 'pending';
  const hasVoted = !!myVote || !!vote.votes['me'];

  const sc = {
    approved: { bg: '#16A34A12', border: '#16A34A30', text: '#16A34A', icon: 'check-circle' as const },
    rejected: { bg: '#E53E3E12', border: '#E53E3E30', text: '#E53E3E', icon: 'x-circle' as const },
    pending:  { bg: colors.muted, border: colors.border, text: colors.mutedForeground, icon: 'clock' as const },
  }[status];

  const matchedProducts = (vote.itemIds ?? [])
    .map(id => MARKETPLACE_PRODUCTS.find(p => p.id === id))
    .filter(Boolean) as typeof MARKETPLACE_PRODUCTS;

  const qtys: Record<string, number> = { p1: 5, p2: 4, p3: 3, p4: 2 };

  return (
    <View style={[vS.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={vS.hdr}>
        <View style={[vS.hdrIcon, { backgroundColor: colors.primary }]}>
          <Icon name="shopping-cart" size={14} color={colors.primaryForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[vS.hdrTitle, { color: colors.foreground }]}>Pre-order Vote</Text>
          <Text style={[vS.hdrSub, { color: colors.mutedForeground }]}>{vote.retailer}</Text>
        </View>
        <View style={[vS.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Icon name={sc.icon} size={10} color={sc.text} />
          <Text style={[vS.statusTxt, { color: sc.text }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
        </View>
      </View>

      <Text style={[vS.product, { color: colors.foreground }]}>{vote.product}</Text>

      {/* Product visual tiles */}
      {matchedProducts.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={vS.productScroll} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {matchedProducts.map((p) => {
            const rColor = RETAILER_COLORS[p.retailer] ?? colors.primary;
            const icon   = CATEGORY_ICONS[p.category] ?? 'package';
            const qty    = qtys[p.id] ?? 1;
            return (
              <View key={p.id} style={[vS.productTile, { backgroundColor: rColor + '14', borderColor: rColor + '30' }]}>
                <View style={[vS.tileIcon, { backgroundColor: rColor + '22' }]}>
                  <Icon name={icon} size={15} color={rColor} />
                </View>
                <Text style={[vS.tileName, { color: colors.foreground }]} numberOfLines={2}>{p.name}</Text>
                <Text style={[vS.tileQty, { color: rColor }]}>×{qty}</Text>
                <Text style={[vS.tilePrice, { color: colors.mutedForeground }]}>R {p.price}</Text>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={[vS.desc, { color: colors.mutedForeground }]}>{vote.description}</Text>
      )}

      <Text style={[vS.price, { color: colors.foreground }]}>R {vote.totalPrice.toLocaleString('en-ZA')} total</Text>

      <View style={vS.progRow}>
        <Text style={[vS.progLbl, { color: colors.mutedForeground }]}>{yesCount}/{vote.requiredVotes} yes needed · {pct}%</Text>
        <Text style={[vS.progLbl, { color: colors.mutedForeground }]}>{noCount} no</Text>
      </View>
      <View style={[vS.track, { backgroundColor: colors.muted }]}>
        <View style={[vS.fill, { width: `${Math.max(pct, 2)}%` as any, backgroundColor: '#16A34A' }]} />
        <View style={[vS.reqMark, { left: `${Math.round((vote.requiredVotes / memberCount) * 100)}%` as any, backgroundColor: colors.foreground }]} />
      </View>

      <View style={vS.dotsRow}>
        {Array.from({ length: memberCount }, (_, i) => (
          <View key={i} style={[vS.dot, { backgroundColor: i < yesCount ? '#16A34A' : i < yesCount + noCount ? '#E53E3E' : colors.border }]} />
        ))}
      </View>

      {!hasVoted && status === 'pending' && (
        <View style={vS.btnRow}>
          <TouchableOpacity style={[vS.btn, { backgroundColor: '#E53E3E12', borderWidth: 1, borderColor: '#E53E3E30' }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onVote(vote.id, 'no'); }}>
            <Icon name="x" size={13} color="#E53E3E" />
            <Text style={[vS.btnTxt, { color: '#E53E3E' }]}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[vS.btn, { backgroundColor: colors.primary }]}
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onVote(vote.id, 'yes'); }}>
            <Icon name="check" size={13} color={colors.primaryForeground} />
            <Text style={[vS.btnTxt, { color: colors.primaryForeground }]}>Vote Yes</Text>
          </TouchableOpacity>
        </View>
      )}
      {hasVoted && status === 'pending' && (
        <View style={vS.votedRow}>
          <Icon name="check" size={11} color="#16A34A" />
          <Text style={[vS.votedTxt, { color: '#16A34A' }]}>Voted {myVote ?? vote.votes['me']} · {vote.requiredVotes - yesCount} more yes needed</Text>
        </View>
      )}
      {status === 'approved' && (
        <View style={[vS.resolvedBanner, { backgroundColor: '#16A34A12' }]}>
          <Icon name="package" size={12} color="#16A34A" />
          <Text style={[vS.resolvedTxt, { color: '#16A34A' }]}>Order placed with {vote.retailer} ✓</Text>
        </View>
      )}
    </View>
  );
}

const vS = StyleSheet.create({
  card:          { borderRadius: 16, padding: 14, width: MAX_BUBBLE_W, borderWidth: 1, gap: 6 },
  hdr:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hdrIcon:       { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  hdrTitle:      { fontSize: 12, fontWeight: '700' },
  hdrSub:        { fontSize: 10, marginTop: 1 },
  statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  statusTxt:     { fontSize: 9, fontWeight: '700' },
  product:       { fontSize: 14, fontWeight: '700' },
  desc:          { fontSize: 11, lineHeight: 15 },
  productScroll: { marginVertical: 2 },
  productTile:   { width: 88, borderRadius: 12, padding: 8, borderWidth: 1, gap: 4 },
  tileIcon:      { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tileName:      { fontSize: 10, fontWeight: '600', lineHeight: 13 },
  tileQty:       { fontSize: 13, fontWeight: '800' },
  tilePrice:     { fontSize: 9 },
  price:         { fontSize: 18, fontWeight: '800' },
  progRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  progLbl:       { fontSize: 10 },
  track:         { height: 5, borderRadius: 3, overflow: 'visible', position: 'relative' },
  fill:          { height: '100%', borderRadius: 3 },
  reqMark:       { position: 'absolute', top: -3, width: 2, height: 11, borderRadius: 1 },
  dotsRow:       { flexDirection: 'row', gap: 3, flexWrap: 'wrap' },
  dot:           { width: 9, height: 9, borderRadius: 5 },
  btnRow:        { flexDirection: 'row', gap: 8, marginTop: 2 },
  btn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10 },
  btnTxt:        { fontSize: 13, fontWeight: '700' },
  votedRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  votedTxt:      { fontSize: 11 },
  resolvedBanner:{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8 },
  resolvedTxt:   { fontSize: 11, fontWeight: '600' },
});

/* ── Voice note bubble ────────────────────────────────── */
function VoiceNoteBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  const colors    = useColors();
  const [playing, setPlaying] = useState(false);
  const dur = msg.voiceDuration ?? 10;
  const bubbleBg   = isMe ? colors.primary : colors.muted;
  const waveColor  = isMe ? (colors.primaryForeground + 'AA') : (colors.foreground + '88');
  const waveActive = isMe ? colors.primaryForeground : colors.foreground;
  const playBg     = isMe ? colors.primaryForeground : colors.foreground;
  const playIcon   = isMe ? colors.primary : colors.primaryForeground;
  return (
    <View style={[vNS.bubble, { backgroundColor: bubbleBg }, isMe ? vNS.bubbleMe : vNS.bubbleThem]}>
      <TouchableOpacity style={[vNS.playBtn, { backgroundColor: playBg }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPlaying((p) => !p); }}>
        <Icon name={playing ? 'pause' : 'play'} size={14} color={playIcon} />
      </TouchableOpacity>
      <View style={vNS.waveform}>
        {WAVEFORM.map((h, i) => {
          const active = playing && (i / WAVEFORM.length) < 0.35;
          return <View key={i} style={[vNS.bar, { height: h, backgroundColor: active ? waveActive : waveColor }]} />;
        })}
      </View>
      <Text style={[vNS.dur, { color: isMe ? colors.primaryForeground + 'BB' : colors.mutedForeground }]}>
        {fmtDuration(dur)}
      </Text>
    </View>
  );
}
const vNS = StyleSheet.create({
  bubble:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 20, maxWidth: MAX_BUBBLE_W },
  bubbleMe:  { borderBottomRightRadius: 4 },
  bubbleThem:{ borderBottomLeftRadius: 4 },
  playBtn:   { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  waveform:  { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  bar:       { width: 2.5, borderRadius: 2 },
  dur:       { fontSize: 11, fontWeight: '600', minWidth: 28, textAlign: 'right' },
});

/* ── Product card bubble ──────────────────────────────── */
function ProductCardBubble({ productId, isMe, colors }: { productId: string; isMe: boolean; colors: any }) {
  const product = MARKETPLACE_PRODUCTS.find(p => p.id === productId);
  if (!product) return null;
  const rColor = RETAILER_COLORS[product.retailer] ?? colors.primary;
  const icon   = CATEGORY_ICONS[product.category] ?? 'package';
  return (
    <View style={[pcS.card, { backgroundColor: isMe ? colors.primary : colors.muted, borderColor: isMe ? 'transparent' : colors.border }]}>
      <View style={[pcS.accent, { backgroundColor: rColor }]}>
        <Icon name={icon} size={18} color="#fff" />
        <Text style={pcS.accentRetailer}>{product.retailer}</Text>
      </View>
      <View style={pcS.body}>
        <Text style={[pcS.name, { color: isMe ? colors.primaryForeground : colors.foreground }]} numberOfLines={2}>{product.name}</Text>
        <Text style={[pcS.unit, { color: isMe ? colors.primaryForeground + 'AA' : colors.mutedForeground }]}>{product.unit}</Text>
        <Text style={[pcS.price, { color: isMe ? colors.primaryForeground : colors.foreground }]}>R {product.price.toLocaleString('en-ZA')}</Text>
      </View>
    </View>
  );
}
const pcS = StyleSheet.create({
  card:    { borderRadius: 14, overflow: 'hidden', width: MAX_BUBBLE_W * 0.85, borderWidth: 1 },
  accent:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  accentRetailer: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body:    { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  name:    { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  unit:    { fontSize: 11, marginTop: 1 },
  price:   { fontSize: 18, fontWeight: '800', marginTop: 4 },
});

/* ── Message bubble ───────────────────────────────────── */
function MessageBubble({ msg, prevSenderId, reaction, onLongPress }: {
  msg: ChatMessage; prevSenderId?: string;
  reaction?: string; onLongPress: (msg: ChatMessage) => void;
}) {
  const colors   = useColors();
  const isMe     = msg.senderId === 'me';
  const showName = !isMe && msg.senderId !== prevSenderId;

  if (msg.type === 'system') {
    return (
      <View style={bS.sysRow}>
        <View style={[bS.sysBadge, { backgroundColor: colors.muted }]}>
          <Text style={[bS.sysTxt, { color: colors.mutedForeground }]}>{msg.text}</Text>
        </View>
      </View>
    );
  }

  const renderContent = () => {
    if (msg.type === 'voice') return <VoiceNoteBubble msg={msg} isMe={isMe} />;
    if (msg.type === 'product' && msg.productId) return <ProductCardBubble productId={msg.productId} isMe={isMe} colors={colors} />;
    const bubbleBg  = isMe ? colors.primary : colors.muted;
    const textColor = isMe ? colors.primaryForeground : colors.foreground;
    return (
      <View style={[bS.bubble, { backgroundColor: bubbleBg }, isMe ? bS.bubbleMe : bS.bubbleThem]}>
        <Text style={[bS.msgTxt, { color: textColor }]}>{msg.text}</Text>
      </View>
    );
  };

  const ticks = isMe ? (
    <Text style={[bS.ticks, { color: '#16A34A' }]}>✓✓</Text>
  ) : null;

  return (
    <TouchableWithoutFeedback onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLongPress(msg); }}>
      <View style={[bS.row, isMe && bS.rowMe]}>
        {!isMe && (
          <View style={{ width: 32 }}>
            {showName && <MemberAvatar name={msg.senderName} id={msg.senderId} size={30} />}
          </View>
        )}
        <View style={{ maxWidth: MAX_BUBBLE_W, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
          {showName && (
            <Text style={[bS.senderName, { color: avatarColor(msg.senderId) }]}>{msg.senderName}</Text>
          )}
          {renderContent()}
          <View style={[bS.metaRow, isMe && { flexDirection: 'row-reverse' }]}>
            <Text style={[bS.timeTxt, { color: colors.mutedForeground }]}>{fmtTime(msg.timestamp)}</Text>
            {ticks}
          </View>
          {reaction && (
            <View style={[bS.reactionBubble, { backgroundColor: colors.card, borderColor: colors.border }, isMe && { alignSelf: 'flex-end' }]}>
              <Text style={bS.reactionEmoji}>{reaction}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const bS = StyleSheet.create({
  row:            { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, marginBottom: 2, gap: 6 },
  rowMe:          { flexDirection: 'row-reverse' },
  senderName:     { fontSize: 11, fontWeight: '700', marginBottom: 3, marginLeft: 2, marginRight: 2 },
  bubble:         { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18 },
  bubbleMe:       { borderBottomRightRadius: 4 },
  bubbleThem:     { borderBottomLeftRadius: 4 },
  msgTxt:         { fontSize: 15, lineHeight: 21 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, paddingHorizontal: 2 },
  timeTxt:        { fontSize: 10 },
  ticks:          { fontSize: 10, fontWeight: '700' },
  sysRow:         { alignItems: 'center', paddingVertical: 6 },
  sysBadge:       { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12 },
  sysTxt:         { fontSize: 11 },
  reactionBubble: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12, borderWidth: 1, marginTop: 3, alignSelf: 'flex-start' },
  reactionEmoji:  { fontSize: 14 },
});

/* ── Reaction picker overlay ──────────────────────────── */
function ReactionPicker({ visible, onClose, onPick, colors }: {
  visible: boolean; onClose: () => void; onPick: (emoji: string) => void; colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={rpS.overlay}>
          <TouchableWithoutFeedback>
            <View style={[rpS.pill, { backgroundColor: colors.card, shadowColor: colors.foreground }]}>
              {EMOJI_REACTIONS.map((emoji) => (
                <TouchableOpacity key={emoji} style={rpS.emojiBtn}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPick(emoji); }}>
                  <Text style={rpS.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
const rpS = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  pill:     { flexDirection: 'row', borderRadius: 32, paddingHorizontal: 8, paddingVertical: 10, gap: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  emojiBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22 },
  emoji:    { fontSize: 26 },
});

/* ── Chat header ──────────────────────────────────────── */
function ChatHeader({ stokvel, onClose, onMenu }: { stokvel: Stokvel; onClose: () => void; onMenu: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pt     = Platform.OS === 'web' ? 56 : insets.top;
  return (
    <View style={[hS.bar, { paddingTop: pt + 6, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity style={hS.iconBtn} onPress={onClose} hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}>
        <Icon name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>
      {stokvel.photo ? (
        <Image source={{ uri: stokvel.photo }} style={hS.groupPhoto} />
      ) : (
        <View style={[hS.groupPhoto, { backgroundColor: stokvel.color, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={hS.groupInitial}>{stokvel.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[hS.groupName, { color: colors.foreground }]} numberOfLines={1}>{stokvel.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={[hS.onlineDot, { backgroundColor: '#16A34A' }]} />
          <Text style={[hS.groupSub, { color: colors.mutedForeground }]}>{stokvel.members.length} members · active</Text>
        </View>
      </View>
      <TouchableOpacity style={hS.iconBtn} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
        <Icon name="phone" size={19} color={colors.foreground} />
      </TouchableOpacity>
      <TouchableOpacity style={hS.iconBtn} onPress={onMenu} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
        <Icon name="more-vertical" size={20} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}
const hS = StyleSheet.create({
  bar:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn:      { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  groupPhoto:   { width: 42, height: 42, borderRadius: 21 },
  groupInitial: { color: '#fff', fontSize: 14, fontWeight: '800' },
  groupName:    { fontSize: 15, fontWeight: '700' },
  groupSub:     { fontSize: 11, marginTop: 1 },
  onlineDot:    { width: 7, height: 7, borderRadius: 4 },
});

/* ── Header menu modal ────────────────────────────────── */
function HeaderMenu({ visible, onClose, stokvel, colors }: { visible: boolean; onClose: () => void; stokvel: Stokvel; colors: any }) {
  const items = [
    { icon: 'users' as const,       label: 'Group Members',     sub: `${stokvel.members.length} members` },
    { icon: 'search' as const,      label: 'Search in Chat',    sub: 'Find messages' },
    { icon: 'bell-off' as const,    label: 'Mute Notifications',sub: 'Silence this group' },
    { icon: 'trash-2' as const,     label: 'Clear Chat',        sub: 'Remove local messages', danger: true },
    { icon: 'log-out' as const,     label: 'Leave Group',       sub: 'Exit stokvel group', danger: true },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={mmS.overlay}>
          <TouchableWithoutFeedback>
            <View style={[mmS.sheet, { backgroundColor: colors.card }]}>
              <View style={[mmS.handle, { backgroundColor: colors.border }]} />
              <Text style={[mmS.title, { color: colors.foreground }]}>{stokvel.name}</Text>
              {items.map((item, idx) => (
                <TouchableOpacity key={item.label}
                  style={[mmS.row, idx < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}>
                  <View style={[mmS.iconWrap, { backgroundColor: item.danger ? '#E53E3E18' : colors.muted }]}>
                    <Icon name={item.icon} size={17} color={item.danger ? '#E53E3E' : colors.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[mmS.rowLabel, { color: item.danger ? '#E53E3E' : colors.foreground }]}>{item.label}</Text>
                    <Text style={[mmS.rowSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
const mmS = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 0, paddingBottom: 40 },
  handle:   { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:    { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub:   { fontSize: 11, marginTop: 1 },
});

/* ── Product picker modal ─────────────────────────────── */
function ProductPickerModal({ visible, onClose, onPick, colors }: {
  visible: boolean; onClose: () => void; onPick: (productId: string) => void; colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={ppS.overlay}>
          <TouchableWithoutFeedback>
            <View style={[ppS.sheet, { backgroundColor: colors.card }]}>
              <View style={[ppS.handle, { backgroundColor: colors.border }]} />
              <Text style={[ppS.title, { color: colors.foreground }]}>Share a Product</Text>
              <Text style={[ppS.sub, { color: colors.mutedForeground }]}>Pick a product to share with your group</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {MARKETPLACE_PRODUCTS.slice(0, 8).map((p) => {
                  const rColor = RETAILER_COLORS[p.retailer] ?? colors.primary;
                  const icon   = CATEGORY_ICONS[p.category] ?? 'package';
                  return (
                    <TouchableOpacity key={p.id}
                      style={[ppS.row, { borderBottomColor: colors.border }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPick(p.id); }}>
                      <View style={[ppS.iconWrap, { backgroundColor: rColor + '18' }]}>
                        <Icon name={icon} size={18} color={rColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[ppS.rowName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                        <Text style={[ppS.rowSub, { color: colors.mutedForeground }]}>{p.retailer} · {p.unit}</Text>
                      </View>
                      <Text style={[ppS.rowPrice, { color: colors.foreground }]}>R {p.price}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
const ppS = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  handle:   { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:    { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sub:      { fontSize: 13, marginBottom: 16 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowName:  { fontSize: 14, fontWeight: '600' },
  rowSub:   { fontSize: 11, marginTop: 2 },
  rowPrice: { fontSize: 15, fontWeight: '700' },
});

/* ── Chat input bar ───────────────────────────────────── */
function ChatInputBar({ onSend, onAttach }: { onSend: (text: string) => void; onAttach: () => void }) {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const pb       = Platform.OS === 'web' ? 16 : Math.max(insets.bottom, 8);
  const [text, setText] = useState('');
  const hasText  = text.trim().length > 0;

  const handleSend = () => {
    if (!hasText) return;
    onSend(text.trim());
    setText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[iS.bar, { paddingBottom: pb, backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <TouchableOpacity style={iS.sideBtn} onPress={onAttach} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
        <Icon name="plus-circle" size={24} color={colors.mutedForeground} />
      </TouchableOpacity>

      <View style={[iS.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <TouchableOpacity style={iS.emojiBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Icon name="smile" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TextInput
          style={[iS.input, { color: colors.foreground }]}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={colors.mutedForeground}
          multiline
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
      </View>

      <TouchableOpacity
        style={[iS.actionBtn, { backgroundColor: colors.primary }]}
        onPress={hasText ? handleSend : () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        activeOpacity={0.8}
      >
        <Icon name={hasText ? 'send' : 'mic'} size={18} color={colors.primaryForeground} />
      </TouchableOpacity>
    </View>
  );
}
const iS = StyleSheet.create({
  bar:       { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingTop: 10, gap: 6, borderTopWidth: StyleSheet.hairlineWidth },
  sideBtn:   { width: 36, height: 44, justifyContent: 'center', alignItems: 'center' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 22, borderWidth: 1, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 4, minHeight: 44 },
  emojiBtn:  { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  input:     { flex: 1, fontSize: 15, maxHeight: 110, paddingVertical: 0, paddingHorizontal: 4 },
  actionBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════════════════ */
export function StokvelChat({ stokvel, onClose, isDark }: {
  stokvel: Stokvel; onClose: () => void; isDark: boolean;
}) {
  const colors  = useColors();
  const [messages, setMessages]     = useState<ChatMessage[]>(() => MOCK_CHAT[stokvel.id] ?? []);
  const [myVotes, setMyVotes]       = useState<Record<string, VoteChoice>>({});
  const [reactions, setReactions]   = useState<Record<string, string>>({});
  const [showMenu, setShowMenu]     = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<ChatMessage | null>(null);
  const [typingName, setTypingName] = useState<string | null>(null);
  const flatRef    = useRef<FlatList>(null);
  const typingTimer= useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTypingBriefly = useCallback(() => {
    const names = stokvel.members.filter(m => m.id !== 'me').map(m => m.name.split(' ')[0]);
    const name  = names[Math.floor(Math.random() * names.length)] ?? 'Someone';
    setTypingName(name);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTypingName(null), 3200);
  }, [stokvel.members]);

  const handleSend = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: Date.now().toString(), senderId: 'me', senderName: 'You',
      type: 'text', text, timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    setTimeout(showTypingBriefly, 1200);
  }, [showTypingBriefly]);

  const handleSendProduct = useCallback((productId: string) => {
    setShowAttach(false);
    const msg: ChatMessage = {
      id: Date.now().toString(), senderId: 'me', senderName: 'You',
      type: 'product', productId, timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    setTimeout(showTypingBriefly, 1200);
  }, [showTypingBriefly]);

  const handleVote = useCallback((voteId: string, choice: VoteChoice) => {
    setMyVotes((prev) => ({ ...prev, [voteId]: choice }));
    setTimeout(() => handleSend(choice === 'yes' ? 'Voted YES on the pre-order 👍' : 'Voted NO 🚫'), 250);
  }, [handleSend]);

  const handleReaction = useCallback((emoji: string) => {
    if (!reactionTarget) return;
    setReactions((prev) => ({ ...prev, [reactionTarget.id]: emoji }));
    setReactionTarget(null);
  }, [reactionTarget]);

  const formatDate = (iso: string) => {
    const d = new Date(iso); const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  type ListItem =
    | { type: 'date'; key: string; label: string }
    | { type: 'msg';  key: string; msg: ChatMessage; prevSenderId?: string };

  const listItems: ListItem[] = [];
  let lastDate = '';
  messages.forEach((msg, i) => {
    const d = new Date(msg.timestamp).toDateString();
    if (d !== lastDate) { listItems.push({ type: 'date', key: `d-${d}`, label: formatDate(msg.timestamp) }); lastDate = d; }
    listItems.push({ type: 'msg', key: msg.id, msg, prevSenderId: messages[i - 1]?.senderId });
  });

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={cS.dateSepRow}>
          <View style={[cS.dateSepBadge, { backgroundColor: colors.muted }]}>
            <Text style={[cS.dateSepTxt, { color: colors.mutedForeground }]}>{item.label}</Text>
          </View>
        </View>
      );
    }
    const msg  = item.msg;
    const isMe = msg.senderId === 'me';
    if (msg.type === 'vote' && msg.vote) {
      return (
        <View style={[cS.voteRow, isMe && cS.voteRowMe]}>
          <View style={{ width: 32 }} />
          <VoteCard vote={msg.vote} memberCount={stokvel.members.length} myVote={myVotes[msg.vote.id]} onVote={handleVote} />
        </View>
      );
    }
    return (
      <MessageBubble
        msg={msg}
        prevSenderId={item.prevSenderId}
        reaction={reactions[msg.id]}
        onLongPress={setReactionTarget}
      />
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={[cS.container, { backgroundColor: colors.background }]}>
        <ChatHeader stokvel={stokvel} onClose={onClose} onMenu={() => setShowMenu(true)} />

        <FlatList
          ref={flatRef}
          data={listItems}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 20 }}
          onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={typingName ? (
            <View style={cS.typingRow}>
              <MemberAvatar name={typingName} id={typingName} size={28} />
              <View style={{ flex: 1 }}>
                <Text style={[cS.typingName, { color: colors.mutedForeground }]}>{typingName}</Text>
                <TypingDots colors={colors} />
              </View>
            </View>
          ) : null}
        />

        <ChatInputBar onSend={handleSend} onAttach={() => setShowAttach(true)} />

        <ReactionPicker
          visible={!!reactionTarget}
          onClose={() => setReactionTarget(null)}
          onPick={handleReaction}
          colors={colors}
        />
        <HeaderMenu visible={showMenu} onClose={() => setShowMenu(false)} stokvel={stokvel} colors={colors} />
        <ProductPickerModal visible={showAttach} onClose={() => setShowAttach(false)} onPick={handleSendProduct} colors={colors} />
      </View>
    </KeyboardAvoidingView>
  );
}

const cS = StyleSheet.create({
  container:    { flex: 1 },
  dateSepRow:   { alignItems: 'center', paddingVertical: 10 },
  dateSepBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  dateSepTxt:   { fontSize: 12, fontWeight: '500' },
  voteRow:      { paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', gap: 6 },
  voteRowMe:    { flexDirection: 'row-reverse' },
  typingRow:    { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  typingName:   { fontSize: 10, marginBottom: 4 },
});
