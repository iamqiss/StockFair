import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

const NOTIFICATIONS = [
  { id: '1', icon: 'dollar-sign', title: 'Contribution Due', desc: "Your R500 contribution to Mama's Kitchen Club is due in 3 days.", time: '2h ago', color: '#737373', read: false },
  { id: '2', icon: 'trending-up', title: 'Payout Processed', desc: 'Bongani Zulu received R5,000 from Ubuntu Savings Circle.', time: '1d ago', color: '#16A34A', read: false },
  { id: '3', icon: 'shopping-bag', title: 'Deal Alert', desc: 'New bulk deals from Shoprite: Up to 20% off on staples!', time: '2d ago', color: '#3A3A3A', read: true },
  { id: '4', icon: 'user-plus', title: 'New Member', desc: "Ayanda Mthembu joined Ubuntu Savings Circle.", time: '3d ago', color: '#1A1A1A', read: true },
  { id: '5', icon: 'check-circle', title: 'Payment Confirmed', desc: 'Your R200 contribution to Ntshingila Burial Society was received.', time: '5d ago', color: '#16A34A', read: true },
];

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{t('notifications')}</Text>
        <TouchableOpacity>
          <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {NOTIFICATIONS.map((n) => (
          <TouchableOpacity
            key={n.id}
            style={[
              styles.notif,
              { borderBottomColor: colors.border, backgroundColor: n.read ? colors.background : colors.primary + '08' },
            ]}
          >
            <View style={[styles.iconBg, { backgroundColor: n.color + '20' }]}>
              <Icon name={n.icon as string} size={20} color={n.color} />
            </View>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text style={[styles.notifTitle, { color: colors.foreground }]}>{n.title}</Text>
                {!n.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.notifDesc, { color: colors.mutedForeground }]}>{n.desc}</Text>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>{n.time}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold' },
  markAll: { fontSize: 13, fontWeight: '600' },
  notif: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  iconBg: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  notifDesc: { fontSize: 13, lineHeight: 18 },
  time: { fontSize: 11, marginTop: 2 },
});
