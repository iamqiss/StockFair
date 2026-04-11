import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  FlatList,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@/components/Icon';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useStokvel, Stokvel } from '@/context/StokvelContext';
import { useAuth } from '@/context/AuthContext';
import { StokvelCard } from '@/components/StokvelCard';
import { TransactionItem } from '@/components/TransactionItem';
import { MARKETPLACE_PRODUCTS } from '@/constants/marketplace';
import { MarketplaceCard } from '@/components/MarketplaceCard';
import { DepositModal } from '@/components/DepositModal';
import { WithdrawModal } from '@/components/WithdrawModal';

const HERO_HEIGHT = 380;

const isIOS = Platform.OS === 'ios';
const isWeb = Platform.OS === 'web';

/* ─── Activity Feed Types & Generator ────────────────── */
type FeedEventType = 'payment_due' | 'payout' | 'member_joined' | 'claim_update' | 'goal' | 'vote' | 'transaction';

interface FeedEvent {
  id:       string;
  type:     FeedEventType;
  title:    string;
  subtitle: string;
  time:     string;
  icon:     string;
  color:    string;
  urgent?:  boolean;
  groupId?: string;
  groupName?: string;
  action?:  string;
}

function generateFeed(stokvels: Stokvel[], colors: any): FeedEvent[] {
  const events: FeedEvent[] = [];
  const now = new Date();

  stokvels.forEach((s, i) => {
    const daysToNext = Math.round((new Date(s.nextPayout).getTime() - now.getTime()) / 86400000);

    // Contribution reminder
    if (daysToNext <= 7 && daysToNext >= 0) {
      events.push({
        id: `due-${s.id}`,
        type: 'payment_due',
        title: `Contribution due soon`,
        subtitle: `${s.name} · R ${s.contributionAmount.toLocaleString('en-ZA')} due in ${daysToNext} day${daysToNext !== 1 ? 's' : ''}`,
        time: daysToNext === 0 ? 'Due today' : `${daysToNext}d left`,
        icon: 'alert-circle',
        color: daysToNext === 0 ? '#DC2626' : '#D97706',
        urgent: daysToNext <= 2,
        groupId: s.id,
        groupName: s.name,
        action: 'Pay now',
      });
    }

    // Payout event (simulated — last payout was ~30 days ago)
    if (i === 0) {
      events.push({
        id: `payout-${s.id}`,
        type: 'payout',
        title: 'Payout received',
        subtitle: `${s.name} · R ${(s.contributionAmount * s.members.length).toLocaleString('en-ZA')} deposited to wallet`,
        time: 'Yesterday',
        icon: 'arrow-down-circle',
        color: '#16A34A',
        groupId: s.id,
        groupName: s.name,
      });
    }

    // New member event
    if (s.members.length >= 3 && i < 2) {
      const newMember = s.members[s.members.length - 1];
      events.push({
        id: `member-${s.id}`,
        type: 'member_joined',
        title: `${newMember.name} joined`,
        subtitle: `${s.name} · Now ${s.members.length} members`,
        time: `${2 + i} days ago`,
        icon: 'user-plus',
        color: colors.foreground,
        groupId: s.id,
        groupName: s.name,
      });
    }

    // Goal reached (for investment stokvels)
    if (s.type === 'investment' && s.totalSaved > 0) {
      events.push({
        id: `goal-${s.id}`,
        type: 'goal',
        title: 'Investment milestone',
        subtitle: `${s.name} crossed R ${s.totalSaved.toLocaleString('en-ZA')} — projected return updated`,
        time: '3 days ago',
        icon: 'trending-up',
        color: '#16A34A',
        groupId: s.id,
        groupName: s.name,
        action: 'View portfolio',
      });
    }

    // Burial claim update
    if (s.type === 'burial') {
      events.push({
        id: `claim-${s.id}`,
        type: 'claim_update',
        title: 'Claim policy updated',
        subtitle: `${s.name} · Member coverage terms revised by chairperson`,
        time: '5 days ago',
        icon: 'shield',
        color: colors.mutedForeground,
        groupId: s.id,
        groupName: s.name,
      });
    }

    // Vote (for social/grocery stokvels)
    if ((s.type === 'social' || s.type === 'grocery') && i === 0) {
      events.push({
        id: `vote-${s.id}`,
        type: 'vote',
        title: 'New vote opened',
        subtitle: `${s.name} · "Increase monthly contribution to R${s.contributionAmount + 50}?" — vote closes in 3 days`,
        time: '6 hours ago',
        icon: 'check-square',
        color: colors.foreground,
        groupId: s.id,
        groupName: s.name,
        action: 'Cast vote',
      });
    }
  });

  return events.sort((a, b) => (a.urgent ? -1 : b.urgent ? 1 : 0));
}

type TimeGroup = { label: string; items: FeedEvent[] };

function ActivityFeedSection({ stokvels, colors, t, onNavigate }: {
  stokvels: Stokvel[];
  colors:   any;
  t:        (k: string) => string;
  onNavigate: (groupId: string, type: FeedEventType) => void;
}) {
  const events = useMemo(() => generateFeed(stokvels, colors), [stokvels]);
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) return null;

  const urgent   = events.filter(e => e.urgent);
  const rest     = events.filter(e => !e.urgent);
  const shown    = expanded ? rest : rest.slice(0, 3);

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Activity</Text>
        <TouchableOpacity onPress={() => setExpanded(p => !p)}>
          <Text style={[styles.viewAll, { color: colors.foreground }]}>{expanded ? 'Show less' : 'See all'}</Text>
        </TouchableOpacity>
      </View>

      {/* Urgent items banner */}
      {urgent.length > 0 && urgent.map((ev) => (
        <TouchableOpacity key={ev.id}
          style={[aS.urgentCard, { backgroundColor: ev.color + '12', borderColor: ev.color + '40' }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); if (ev.groupId) onNavigate(ev.groupId, ev.type); }}
          activeOpacity={0.82}
        >
          <View style={[aS.urgentIcon, { backgroundColor: ev.color + '20' }]}>
            <Icon name={ev.icon} size={18} color={ev.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[aS.urgentTitle, { color: ev.color }]}>{ev.title}</Text>
            <Text style={[aS.urgentSub, { color: colors.mutedForeground }]}>{ev.subtitle}</Text>
          </View>
          {ev.action && (
            <View style={[aS.urgentAction, { backgroundColor: ev.color }]}>
              <Text style={aS.urgentActionTxt}>{ev.action}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      {/* Feed list */}
      <View style={[aS.feedCard, { backgroundColor: colors.card }]}>
        {shown.map((ev, i) => (
          <TouchableOpacity key={ev.id}
            style={[aS.feedItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (ev.groupId) onNavigate(ev.groupId, ev.type); }}
            activeOpacity={0.82}
          >
            <View style={[aS.feedIcon, { backgroundColor: ev.color + '18' }]}>
              <Icon name={ev.icon} size={15} color={ev.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[aS.feedTitle, { color: colors.foreground }]} numberOfLines={1}>{ev.title}</Text>
              <Text style={[aS.feedSub, { color: colors.mutedForeground }]} numberOfLines={2}>{ev.subtitle}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[aS.feedTime, { color: colors.mutedForeground }]}>{ev.time}</Text>
              {ev.action && (
                <View style={[aS.feedActionBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[aS.feedActionTxt, { color: colors.foreground }]}>{ev.action}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const aS = StyleSheet.create({
  urgentCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  urgentIcon:       { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  urgentTitle:      { fontSize: 14, fontWeight: '700' },
  urgentSub:        { fontSize: 12, marginTop: 2, lineHeight: 16 },
  urgentAction:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  urgentActionTxt:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  feedCard:         { borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  feedItem:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  feedIcon:         { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  feedTitle:        { fontSize: 13, fontWeight: '600' },
  feedSub:          { fontSize: 11, marginTop: 2, lineHeight: 15 },
  feedTime:         { fontSize: 10 },
  feedActionBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  feedActionTxt:    { fontSize: 10, fontWeight: '600' },
});

/* ─── Fair Score card ─────────────────────────────────── */
function FairScoreCard({ stokvels, colors, onPress }: { stokvels: Stokvel[]; colors: any; onPress: () => void }) {
  const score = useMemo(() => {
    if (stokvels.length === 0) return 0;
    const base = 580;
    const bonus = stokvels.length * 28 + stokvels.reduce((s, g) => s + g.members.length, 0) * 4;
    return Math.min(850, base + bonus);
  }, [stokvels]);

  const band  = score >= 750 ? 'Excellent' : score >= 680 ? 'Good' : score >= 620 ? 'Fair' : 'Building';
  const color = score >= 750 ? '#16A34A'   : score >= 680 ? '#16A34A' : score >= 620 ? '#D97706' : colors.mutedForeground;
  const pct   = ((score - 300) / (850 - 300)) * 100;

  return (
    <TouchableOpacity
      style={[aS2.card, { backgroundColor: colors.card }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.84}
    >
      <View style={{ flex: 1 }}>
        <Text style={[aS2.eyebrow, { color: colors.mutedForeground }]}>FAIR SCORE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={[aS2.score, { color: color }]}>{score}</Text>
          <View style={[aS2.band, { backgroundColor: color + '18' }]}>
            <Text style={[aS2.bandTxt, { color }]}>{band}</Text>
          </View>
        </View>
        <View style={[aS2.track, { backgroundColor: colors.muted }]}>
          <View style={[aS2.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
        <Text style={[aS2.hint, { color: colors.mutedForeground }]}>Based on contribution history & group activity</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}
const aS2 = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  score:   { fontSize: 34, fontWeight: '800' },
  band:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  bandTxt: { fontSize: 11, fontWeight: '700' },
  track:   { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8, marginBottom: 4 },
  fill:    { height: 6, borderRadius: 3 },
  hint:    { fontSize: 10, lineHeight: 14 },
});

function StatPill({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillValue, { color }]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { stokvels, transactions, totalSavings, userBalance } = useStokvel();
  const { user } = useAuth();

  const displayFirstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';
  const avatarLetter     = (user?.name ?? 'S').charAt(0).toUpperCase();

  const recentTx = transactions.slice(0, 3);
  const featuredProducts = MARKETPLACE_PRODUCTS.filter((p) => p.featured);
  const topPadding = isWeb ? 60 : insets.top;

  function handleFeedNavigate(groupId: string, type: FeedEventType) {
    if (type === 'goal') {
      router.push({ pathname: '/stokvel/invest', params: { id: groupId } });
    } else {
      router.push({ pathname: '/stokvel/[id]', params: { id: groupId } });
    }
  }

  const nextPayoutDate = stokvels.length
    ? new Date(
        stokvels.reduce(
          (earliest, g) =>
            new Date(g.nextPayout) < new Date(earliest) ? g.nextPayout : earliest,
          stokvels[0].nextPayout,
        ),
      ).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
    : '—';

  const totalMembers = stokvels.reduce((s, g) => s + g.members.length, 0);
  const [showDeposit, setShowDeposit]   = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Balance Section ── */}
      <ImageBackground
        source={require('../../assets/images/community_hero.png')}
        style={styles.heroContainer}
        resizeMode="cover"
      >
        {/* Gradient overlay — bottom-heavy so numbers stay legible */}
        <LinearGradient
          colors={['rgba(0,29,60,0.35)', 'rgba(0,29,60,0.72)', 'rgba(0,29,60,0.97)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Header row */}
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={[styles.headerRow, { paddingTop: topPadding + 12 }]}
        >
          <View>
            <Text style={styles.greeting}>{t('welcome')} back</Text>
            <Text style={styles.userName}>{displayFirstName}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.glassBtn}
              onPress={() => router.push('/notifications')}
            >
              <Icon name="bell" size={18} color="#FFFFFF" />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.glassBtn}
              onPress={() => router.push('/messages')}
            >
              <Icon name="message-circle" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Balance hero */}
        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          style={styles.balanceHero}
        >
          <Text style={styles.balanceEyebrow}>{t('totalSavings')}</Text>
          <Text style={styles.balanceBig}>
            R {totalSavings.toLocaleString('en-ZA')}
          </Text>

          {/* Stat pills row */}
          <View style={styles.pillRow}>
            <StatPill
              value={`R ${userBalance.toLocaleString('en-ZA')}`}
              label={t('balance')}
              color="#FFFFFF"
            />
            <View style={styles.pillDivider} />
            <StatPill
              value={`${stokvels.length}`}
              label={t('groups')}
              color="#FFFFFF"
            />
            <View style={styles.pillDivider} />
            <StatPill
              value={nextPayoutDate}
              label={t('nextPayout')}
              color="#FFFFFF"
            />
          </View>

          {/* Dual CTA row */}
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.ctaPrimaryWrap}
              onPress={() => router.push('/(tabs)/groups')}
              activeOpacity={0.85}
            >
              <View style={[styles.ctaPrimary, { backgroundColor: '#FFFFFF' }]}>
                <Icon name="plus-circle" size={15} color="#000000" />
                <Text style={[styles.ctaPrimaryText, { color: '#000000' }]}>{t('contributeNow')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => router.push('/(tabs)/transactions')}
              activeOpacity={0.85}
            >
              <Icon name="clock" size={15} color="rgba(255,255,255,0.85)" />
              <Text style={styles.ctaSecondaryText}>History</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ImageBackground>

      {/* ── Deposit / Withdraw — floating card ── */}
      <Animated.View
        entering={FadeInDown.delay(160).springify()}
        style={[styles.actionCard, { shadowColor: colors.foreground }]}
      >
        {/* Deposit */}
        <TouchableOpacity
          style={[styles.depositBtn, { backgroundColor: colors.foreground }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowDeposit(true);
          }}
          activeOpacity={0.88}
        >
          <View style={[styles.actionBtnIcon, { backgroundColor: colors.background + '20' }]}>
            <Icon name="arrow-down-circle" size={22} color={colors.background} />
          </View>
          <View style={styles.actionBtnText}>
            <Text style={[styles.actionBtnLabel, { color: colors.background }]}>Deposit</Text>
            <Text style={[styles.actionBtnSub,   { color: colors.background + 'AA' }]}>Add funds to wallet</Text>
          </View>
          <Icon name="arrow-right" size={18} color={colors.background + '80'} />
        </TouchableOpacity>

        {/* Divider */}
        <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

        {/* Withdraw */}
        <TouchableOpacity
          style={[styles.withdrawBtn, { backgroundColor: colors.card }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowWithdraw(true);
          }}
          activeOpacity={0.88}
        >
          <View style={[styles.actionBtnIcon, { backgroundColor: colors.muted }]}>
            <Icon name="arrow-up-circle" size={22} color={colors.foreground} />
          </View>
          <View style={styles.actionBtnText}>
            <Text style={[styles.actionBtnLabel, { color: colors.foreground }]}>Withdraw</Text>
            <Text style={[styles.actionBtnSub,   { color: colors.mutedForeground }]}>Balance or stokvel funds</Text>
          </View>
          <Icon name="arrow-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </Animated.View>

      <DepositModal  visible={showDeposit}  onClose={() => setShowDeposit(false)} />
      <WithdrawModal visible={showWithdraw} onClose={() => setShowWithdraw(false)} />

      {/* ── Investment Portfolio Card ── */}
      {stokvels.some(s => s.type === 'investment') && (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <TouchableOpacity
            style={[styles.portfolioCard, { backgroundColor: colors.card }]}
            activeOpacity={0.85}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/portfolio'); }}
          >
            <LinearGradient
              colors={['#0F172A', '#1E3A5F']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.portfolioGradient}
            >
              <View style={styles.portfolioTop}>
                <View style={styles.portfolioIconWrap}>
                  <Icon name="trending-up" size={18} color="#4ADE80" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.portfolioTitle}>Investment Portfolio</Text>
                  <Text style={styles.portfolioSub}>
                    {stokvels.filter(s => s.type === 'investment').length} active investment stokvel{stokvels.filter(s => s.type === 'investment').length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color="rgba(255,255,255,0.5)" />
              </View>
              <View style={styles.portfolioStats}>
                <View style={styles.portfolioStatCol}>
                  <Text style={styles.portfolioStatVal}>
                    R {stokvels.filter(s => s.type === 'investment').reduce((sum, s) => sum + s.totalSaved, 0).toLocaleString('en-ZA')}
                  </Text>
                  <Text style={styles.portfolioStatLbl}>Total Invested</Text>
                </View>
                <View style={[styles.portfolioStatCol, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' }]}>
                  <Text style={[styles.portfolioStatVal, { color: '#4ADE80' }]}>
                    View Returns
                  </Text>
                  <Text style={styles.portfolioStatLbl}>Dashboard &amp; Tax Reports</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── My Stokvels ── */}
      {stokvels.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title={t('myGroups')}
            onViewAll={() => router.push('/(tabs)/groups')}
            showViewAll={stokvels.length > 2}
            colors={colors}
            t={t}
          />
          {stokvels.slice(0, 2).map((s, i) => (
            <StokvelCard key={s.id} stokvel={s} index={i} />
          ))}
        </View>
      )}

      {/* ── Featured Deals ── */}
      {featuredProducts.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title={t('bulkDeals')}
            onViewAll={() => router.push('/(tabs)/marketplace')}
            showViewAll={featuredProducts.length > 4}
            colors={colors}
            t={t}
          />
          <FlatList
            horizontal
            data={featuredProducts}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => <MarketplaceCard product={item} compact />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 4 }}
            scrollEnabled
          />
        </View>
      )}

      {/* ── Fair Score ── */}
      {stokvels.length > 0 && (
        <View style={[styles.section, { paddingBottom: 0 }]}>
          <FairScoreCard
            stokvels={stokvels}
            colors={colors}
            onPress={() => router.push('/fairscore')}
          />
        </View>
      )}

      {/* ── Activity Feed ── */}
      {stokvels.length > 0 && (
        <ActivityFeedSection
          stokvels={stokvels}
          colors={colors}
          t={t}
          onNavigate={handleFeedNavigate}
        />
      )}

      {/* ── Recent Transactions ── */}
      {recentTx.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title={t('recentActivity')}
            onViewAll={() => router.push('/(tabs)/transactions')}
            showViewAll={transactions.length > 3}
            colors={colors}
            t={t}
          />
          <View style={[styles.txCard, { backgroundColor: colors.card }]}>
            {recentTx.map((tx, i) => (
              <View key={tx.id}>
                <TransactionItem transaction={tx} />
                {i < recentTx.length - 1 && (
                  <View style={[styles.txDivider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function SectionHeader({
  title,
  onViewAll,
  showViewAll = true,
  colors,
  t,
}: {
  title: string;
  onViewAll: () => void;
  showViewAll?: boolean;
  colors: ReturnType<typeof useColors>;
  t: (k: string) => string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {showViewAll && (
        <TouchableOpacity onPress={onViewAll}>
          <Text style={[styles.viewAll, { color: colors.foreground }]}>{t('viewAll')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Hero */
  heroContainer: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  greeting: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: isIOS ? 'System' : 'sans-serif',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53E3E',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  /* Balance Hero */
  balanceHero: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  balanceEyebrow: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceBig: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontFamily: isIOS ? 'System' : 'sans-serif',
    marginBottom: 18,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: 20,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
  },
  statPillValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statPillLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 1,
    letterSpacing: 0.3,
  },
  pillDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 2,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  ctaPrimaryWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  ctaPrimaryText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  ctaSecondaryText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  /* Deposit / Withdraw floating card */
  actionCard: {
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 22,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
    marginBottom: 8,
    zIndex: 10,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
  },
  actionBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    flex: 1,
    gap: 2,
  },
  actionBtnLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  actionBtnSub: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* Sections */
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: isIOS ? 'System' : 'sans-serif',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* Transactions */
  txCard: {
    borderRadius: 18,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  txDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },

  /* Portfolio Card */
  portfolioCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  portfolioGradient: {
    padding: 18,
    gap: 14,
  },
  portfolioTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  portfolioIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(74,222,128,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  portfolioSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  portfolioStats: {
    flexDirection: 'row',
  },
  portfolioStatCol: {
    flex: 1,
    paddingHorizontal: 4,
    gap: 2,
  },
  portfolioStatVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  portfolioStatLbl: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
  },
});
