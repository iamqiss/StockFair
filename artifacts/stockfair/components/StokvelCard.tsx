import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';
import { Stokvel, VEHICLE_META } from '@/context/StokvelContext';
import { useLanguage } from '@/context/LanguageContext';

type Props = { stokvel: Stokvel; index?: number };

const TYPE_FEATHER: Record<string, string> = {
  rotation:   'refresh-cw',
  burial:     'heart',
  investment: 'trending-up',
  grocery:    'shopping-cart',
  social:     'users',
};

function lightenHex(hex: string, amount = 40): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 86400000));
}

/* ─── Context strip per stokvel type ─────────────────── */
function ContextStrip({ stokvel, accentColor }: { stokvel: Stokvel; accentColor: string }) {
  const colors = useColors();

  let left  = { icon: 'info' as string, text: '' };
  let right = { icon: 'info' as string, text: '' };
  let urgent = false;

  const days = daysUntil(stokvel.nextPayout);

  if (stokvel.type === 'rotation') {
    const nextMemberIdx = stokvel.currentPosition % stokvel.members.length;
    const nextMember = stokvel.members[nextMemberIdx];
    const isMe = nextMember?.id === 'me';
    urgent = isMe && days < 30;
    left  = { icon: 'calendar', text: isMe ? `You receive in ${days}d` : `${nextMember?.name?.split(' ')[0] ?? 'Next'} in ${days}d` };
    right = { icon: 'users',    text: `Position #${stokvel.currentPosition} of ${stokvel.members.length}` };
  } else if (stokvel.type === 'burial') {
    const coverage = stokvel.contributionAmount * 10;
    left  = { icon: 'shield',  text: `Cover: R ${coverage.toLocaleString('en-ZA')}` };
    right = { icon: 'users',   text: `${stokvel.members.length} protected` };
  } else if (stokvel.type === 'investment') {
    const cfg = stokvel.investmentConfig;
    const vm  = cfg ? VEHICLE_META[cfg.vehicle] : null;
    const ret = vm ? `${vm.minReturn}–${vm.maxReturn}% est.` : 'Managed';
    left  = { icon: 'trending-up', text: ret };
    right = { icon: 'cpu',         text: vm?.label.split(' ')[0] ?? 'Fund' };
  } else if (stokvel.type === 'grocery') {
    const dateLabel = new Date(stokvel.nextPayout).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    const yesVotes  = Math.min(stokvel.members.length - 1, 4);
    left  = { icon: 'shopping-cart', text: `Order: ${dateLabel}` };
    right = { icon: 'check-circle',  text: `${yesVotes}/${stokvel.members.length} voted` };
  } else {
    const dateLabel = new Date(stokvel.nextPayout).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    left  = { icon: 'calendar', text: `Event: ${dateLabel}` };
    right = { icon: 'users',    text: `${stokvel.members.length} members` };
  }

  const pillBg    = urgent ? accentColor + '18' : colors.muted;
  const pillColor = urgent ? accentColor        : colors.mutedForeground;

  return (
    <View style={[cs.strip, { borderTopColor: colors.border }]}>
      <View style={[cs.pill, { backgroundColor: pillBg }]}>
        <Icon name={left.icon} size={11} color={pillColor} />
        <Text style={[cs.pillText, { color: pillColor }]} numberOfLines={1}>{left.text}</Text>
      </View>
      <View style={[cs.divider, { backgroundColor: colors.border }]} />
      <View style={[cs.pill, { backgroundColor: colors.muted }]}>
        <Icon name={right.icon} size={11} color={colors.mutedForeground} />
        <Text style={[cs.pillText, { color: colors.mutedForeground }]} numberOfLines={1}>{right.text}</Text>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  strip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '600', flex: 1 },
  divider:  { width: StyleSheet.hairlineWidth, height: 18 },
});

/* ─── Overdue warning badge ───────────────────────────── */
function OverdueBadge({ stokvel }: { stokvel: Stokvel }) {
  const overdueCount = stokvel.members.filter((m, i) => {
    if (m.id === 'me') return false;
    const seed = m.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return (seed + i * 7) % 10 >= 8;
  }).length;

  if (overdueCount === 0) return null;
  return (
    <View style={ob.badge}>
      <Icon name="alert-circle" size={9} color="#fff" />
      <Text style={ob.text}>{overdueCount} overdue</Text>
    </View>
  );
}
const ob = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#DC2626', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  text:  { color: '#fff', fontSize: 10, fontWeight: '700' },
});

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export function StokvelCard({ stokvel, index = 0 }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();

  const progress = Math.min(stokvel.currentPosition / Math.max(stokvel.members.length, 1), 1);
  const progressPct = Math.round(progress * 100);
  const nextDate = new Date(stokvel.nextPayout).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  });

  const typeLabel: Record<string, string> = {
    rotation:   t('rotation'),
    burial:     t('burial'),
    investment: t('investment'),
    grocery:    t('grocery'),
    social:     t('social'),
  };

  const lighter = lightenHex(stokvel.color, 38);

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify()} style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => router.push({ pathname: '/stokvel/[id]', params: { id: stokvel.id } })}
        activeOpacity={0.88}
      >
        {/* ── Gradient header ── */}
        <LinearGradient
          colors={[stokvel.color, lighter]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.header}
        >
          {stokvel.photo ? (
            <Image source={{ uri: stokvel.photo }} style={styles.groupPhoto} />
          ) : (
            <View style={styles.iconCircle}>
              <Icon name={TYPE_FEATHER[stokvel.type] ?? 'users'} size={22} color={stokvel.color} />
            </View>
          )}

          <View style={styles.headerText}>
            <Text style={styles.cardName} numberOfLines={1}>{stokvel.name}</Text>
            <Text style={styles.cardType}>{typeLabel[stokvel.type]}</Text>
          </View>

          <View style={styles.badgesCol}>
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activeLabel}>{t('active')}</Text>
            </View>
            <OverdueBadge stokvel={stokvel} />
          </View>
        </LinearGradient>

        {/* ── Stats row ── */}
        <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>
              R {stokvel.totalSaved.toLocaleString('en-ZA')}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{t('totalSavings')}</Text>
          </View>
          <View style={[styles.statSep, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>
              {stokvel.members.length}/{stokvel.maxMembers}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{t('members')}</Text>
          </View>
          <View style={[styles.statSep, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>
              R {stokvel.contributionAmount.toLocaleString('en-ZA')}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{t('monthly')}</Text>
          </View>
        </View>

        {/* ── Context strip (type-specific) ── */}
        <ContextStrip stokvel={stokvel} accentColor={stokvel.color} />

        {/* ── Progress + footer ── */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.progressArea}>
            <View style={styles.progressMeta}>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                {t('payout')}: {nextDate}
              </Text>
              <Text style={[styles.progressPct, { color: stokvel.color }]}>
                {progressPct}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <LinearGradient
                colors={[stokvel.color, lighter]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.max(progressPct, 4)}%` as any }]}
              />
            </View>
          </View>
          <View style={styles.viewMore}>
            <Text style={[styles.viewMoreText, { color: stokvel.color }]}>View</Text>
            <Icon name="chevron-right" size={15} color={stokvel.color} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 4,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.90)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  headerText: { flex: 1 },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  cardType: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.80)',
    marginTop: 2,
    fontWeight: '500',
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  activeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },

  statsRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statLbl: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '500',
  },
  statSep: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  progressArea: {
    flex: 1,
    gap: 7,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
