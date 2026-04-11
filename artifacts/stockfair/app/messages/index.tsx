import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import Icon from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useStokvel, Stokvel, MOCK_CHAT } from '@/context/StokvelContext';

const TYPE_LABELS: Record<string, string> = {
  rotating: 'Rotating',
  burial:   'Burial',
  investment: 'Invest',
  grocery:  'Grocery',
  social:   'Social',
};
const TYPE_ICONS: Record<string, string> = {
  rotating:   'refresh-cw',
  burial:     'heart',
  investment: 'trending-up',
  grocery:    'shopping-cart',
  social:     'users',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d`;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function GroupAvatar({ stokvel, size = 52 }: { stokvel: Stokvel; size?: number }) {
  if (stokvel.photo) {
    return <Image source={{ uri: stokvel.photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: stokvel.color, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.3, fontWeight: '800' }}>
        {stokvel.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function GroupRow({ stokvel, onPress }: { stokvel: Stokvel; onPress: () => void }) {
  const colors   = useColors();
  const messages = MOCK_CHAT[stokvel.id] ?? [];
  const last     = messages[messages.length - 1];
  const unread   = messages.filter((m) => m.senderId !== 'me').length % 3;

  const preview = last
    ? last.type === 'vote'    ? '📋 Pre-order vote'
    : last.type === 'system'  ? `🔔 ${last.text}`
    : last.type === 'voice'   ? '🎤 Voice note'
    : last.type === 'product' ? '🛒 Product shared'
    : last.senderId === 'me'  ? `You: ${last.text}`
    : `${last.senderName.split(' ')[0]}: ${last.text}`
    : 'No messages yet';

  const timestamp = last ? timeAgo(last.timestamp) : '';
  const typeLabel = TYPE_LABELS[stokvel.type] ?? stokvel.type;
  const typeIcon  = TYPE_ICONS[stokvel.type] ?? 'users';

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <GroupAvatar stokvel={stokvel} />
        {unread > 0 && (
          <View style={[styles.onlineDot, { backgroundColor: '#16A34A', borderColor: colors.background }]} />
        )}
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <View style={styles.nameRow}>
            <Text style={[styles.groupName, { color: colors.foreground, fontWeight: unread > 0 ? '700' : '600' }]} numberOfLines={1}>
              {stokvel.name}
            </Text>
            <View style={[styles.typePill, { backgroundColor: stokvel.color + '18', borderColor: stokvel.color + '30' }]}>
              <Icon name={typeIcon} size={9} color={stokvel.color} />
              <Text style={[styles.typeText, { color: stokvel.color }]}>{typeLabel}</Text>
            </View>
          </View>
          <Text style={[styles.timestamp, { color: unread > 0 ? colors.foreground : colors.mutedForeground, fontWeight: unread > 0 ? '600' : '400' }]}>
            {timestamp}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[styles.preview, { color: unread > 0 ? colors.foreground : colors.mutedForeground, fontWeight: unread > 0 ? '600' : '400' }]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.foreground }]}>
              <Text style={[styles.badgeText, { color: colors.background }]}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* Active group story circles */
function ActiveStories({ stokvels, onPress }: { stokvels: Stokvel[]; onPress: (id: string) => void }) {
  const colors = useColors();
  const active = stokvels.filter((s) => (MOCK_CHAT[s.id] ?? []).length > 0).slice(0, 6);
  if (active.length === 0) return null;
  return (
    <View style={storyS.wrap}>
      <FlatList
        horizontal
        data={active}
        keyExtractor={(s) => s.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={storyS.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={storyS.item} onPress={() => onPress(item.id)}>
            <View style={[storyS.ring, { borderColor: item.color }]}>
              <GroupAvatar stokvel={item} size={46} />
            </View>
            <Text style={[storyS.label, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
const storyS = StyleSheet.create({
  wrap:  { borderBottomWidth: StyleSheet.hairlineWidth },
  list:  { paddingHorizontal: 16, paddingVertical: 12, gap: 16 },
  item:  { alignItems: 'center', gap: 5, width: 60 },
  ring:  { borderWidth: 2.5, borderRadius: 27, padding: 2 },
  label: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
});

export default function MessagesScreen() {
  const colors       = useColors();
  const safeInsets   = useSafeAreaInsets();
  const router       = useRouter();
  const { stokvels } = useStokvel();
  const [query, setQuery] = useState('');

  const topPadding = Platform.OS === 'web' ? 67 : safeInsets.top;

  const sorted = useMemo(() => {
    return [...stokvels].sort((a, b) => {
      const aMsg  = MOCK_CHAT[a.id] ?? [];
      const bMsg  = MOCK_CHAT[b.id] ?? [];
      const aLast = aMsg[aMsg.length - 1]?.timestamp ?? a.createdAt;
      const bLast = bMsg[bMsg.length - 1]?.timestamp ?? b.createdAt;
      return new Date(bLast).getTime() - new Date(aLast).getTime();
    });
  }, [stokvels]);

  const filtered = query.trim()
    ? sorted.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : sorted;

  const navigateToChat = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/messages/${id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Icon name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
        <TouchableOpacity style={styles.composeBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Icon name="edit" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchWrap, { backgroundColor: colors.muted }]}>
          <Icon name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon name="x-circle" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="message-circle" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Join a stokvel group to start chatting
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          ListHeaderComponent={
            query.trim() === '' ? (
              <ActiveStories stokvels={sorted} onPress={navigateToChat} />
            ) : null
          }
          renderItem={({ item }) => (
            <GroupRow stokvel={item} onPress={() => navigateToChat(item.id)} />
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="search" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, flex: 1, marginLeft: 4 },
  composeBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-end' },

  searchRow:   { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  avatarWrap:  { position: 'relative' },
  onlineDot:   { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowContent:  { flex: 1, gap: 5 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  nameRow:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  groupName:   { fontSize: 15, flexShrink: 1 },
  typePill:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  typeText:    { fontSize: 9, fontWeight: '700' },
  timestamp:   { fontSize: 11 },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview:     { fontSize: 13, flex: 1, marginRight: 8 },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText:   { fontSize: 11, fontWeight: '700' },

  empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 40, paddingTop: 60 },
  emptyTitle:  { fontSize: 18, fontWeight: '700' },
  emptyDesc:   { fontSize: 14, textAlign: 'center' },
});
