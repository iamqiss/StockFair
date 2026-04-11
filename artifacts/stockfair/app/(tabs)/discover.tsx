import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Dimensions, Animated, Platform,
} from 'react-native';
import Icon from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 48;
const HERO_W = SW - 48;

/* ─── Data ──────────────────────────────────────────────── */
type FilterKey = 'for-you' | 'top-performers' | 'safest' | 'highest-grossing' | 'near-me';
type StokvelKind = 'rotation' | 'burial' | 'investment' | 'grocery' | 'social';

interface DiscoverGroup {
  id: string;
  name: string;
  kind: StokvelKind;
  location: string;
  distance: number;
  members: number;
  maxMembers: number;
  monthlyContrib: number;
  returnRate: number | null;
  fairScore: number;
  verified: boolean;
  ageLabel: string;
  totalPool: string;
  tags: FilterKey[];
  highlight: string;
  accentColor: string;
}

const ALL_GROUPS: DiscoverGroup[] = [
  {
    id: 'g1', name: 'Soweto Builders Circle',
    kind: 'rotation', location: 'Soweto, GP', distance: 1.2,
    members: 18, maxMembers: 24, monthlyContrib: 500,
    returnRate: null, fairScore: 742, verified: true,
    ageLabel: '3 yrs', totalPool: 'R 108,000',
    tags: ['for-you', 'near-me'],
    highlight: 'Top-rated in Soweto — zero missed payouts in 36 months',
    accentColor: '#16A34A',
  },
  {
    id: 'g2', name: 'JSE Growth Fund',
    kind: 'investment', location: 'Cape Town, WC', distance: 8.4,
    members: 12, maxMembers: 20, monthlyContrib: 2000,
    returnRate: 14.2, fairScore: 801, verified: true,
    ageLabel: '2 yrs', totalPool: 'R 576,000',
    tags: ['for-you', 'top-performers', 'highest-grossing'],
    highlight: '#1 JSE ETF stokvel on StockFair — 14.2% p.a. avg',
    accentColor: '#2563EB',
  },
  {
    id: 'g3', name: 'Cape Burial Society',
    kind: 'burial', location: 'Mitchells Plain, WC', distance: 12.1,
    members: 42, maxMembers: 50, monthlyContrib: 200,
    returnRate: null, fairScore: 818, verified: true,
    ageLabel: '8 yrs', totalPool: 'R 2.1M',
    tags: ['safest', 'top-performers'],
    highlight: 'Serving 42 families — R 50,000 burial cover',
    accentColor: '#7C3AED',
  },
  {
    id: 'g4', name: 'Durban Grocery Co-op',
    kind: 'grocery', location: 'Durban, KZN', distance: 456,
    members: 28, maxMembers: 30, monthlyContrib: 1200,
    returnRate: null, fairScore: 776, verified: true,
    ageLabel: '4 yrs', totalPool: 'R 840,000',
    tags: ['for-you', 'highest-grossing'],
    highlight: 'Members save 40% on monthly groceries on average',
    accentColor: '#D97706',
  },
  {
    id: 'g5', name: 'Ubuntu Social Club',
    kind: 'social', location: 'Pretoria, GP', distance: 28.9,
    members: 22, maxMembers: 30, monthlyContrib: 300,
    returnRate: null, fairScore: 695, verified: false,
    ageLabel: '1 yr', totalPool: 'R 79,200',
    tags: ['near-me', 'for-you'],
    highlight: '14 events hosted this year — weddings, graduations, umemulos',
    accentColor: '#EC4899',
  },
  {
    id: 'g6', name: 'Mzansi Property Fund',
    kind: 'investment', location: 'Johannesburg, GP', distance: 3.8,
    members: 8, maxMembers: 15, monthlyContrib: 5000,
    returnRate: 11.8, fairScore: 786, verified: true,
    ageLabel: '18 mo', totalPool: 'R 720,000',
    tags: ['top-performers', 'highest-grossing', 'near-me'],
    highlight: 'JSE-listed REIT portfolio — quarterly dividend payouts',
    accentColor: '#0891B2',
  },
  {
    id: 'g7', name: "Limpopo Savers' Alliance",
    kind: 'rotation', location: 'Polokwane, LP', distance: 290,
    members: 10, maxMembers: 12, monthlyContrib: 800,
    returnRate: null, fairScore: 822, verified: true,
    ageLabel: '5 yrs', totalPool: 'R 57,600',
    tags: ['safest'],
    highlight: 'Perfect payout record — highest Fair Score in Limpopo',
    accentColor: '#16A34A',
  },
  {
    id: 'g8', name: 'Money Market Masters',
    kind: 'investment', location: 'Online', distance: 0,
    members: 16, maxMembers: 25, monthlyContrib: 1500,
    returnRate: 9.4, fairScore: 761, verified: true,
    ageLabel: '2 yrs', totalPool: 'R 576,000',
    tags: ['safest', 'top-performers'],
    highlight: '100% capital protected — money market + call account mix',
    accentColor: '#059669',
  },
  {
    id: 'g9', name: 'Kasi Rotation Kings',
    kind: 'rotation', location: 'Khayelitsha, WC', distance: 6.2,
    members: 9, maxMembers: 12, monthlyContrib: 1000,
    returnRate: null, fairScore: 714, verified: false,
    ageLabel: '8 mo', totalPool: 'R 36,000',
    tags: ['near-me', 'for-you'],
    highlight: 'New group — 3 spots remaining, monthly payout R 12,000',
    accentColor: '#F59E0B',
  },
  {
    id: 'g10', name: 'Sandton Elite Investors',
    kind: 'investment', location: 'Sandton, GP', distance: 5.1,
    members: 20, maxMembers: 20, monthlyContrib: 10000,
    returnRate: 18.6, fairScore: 847, verified: true,
    ageLabel: '6 yrs', totalPool: 'R 7.2M',
    tags: ['highest-grossing', 'top-performers'],
    highlight: 'Highest-grossing investment stokvel — JSE + offshore ETFs',
    accentColor: '#DC2626',
  },
];

const HERO_GROUPS = ALL_GROUPS.filter(g => ['g2', 'g3', 'g6'].includes(g.id));

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'for-you',         label: 'For You',        icon: 'star'       },
  { key: 'top-performers',  label: 'Top Performers', icon: 'trending-up' },
  { key: 'safest',          label: 'Safest',         icon: 'shield'     },
  { key: 'highest-grossing',label: 'Highest Grossing',icon: 'award'     },
  { key: 'near-me',         label: 'Near Me',        icon: 'map-pin'    },
];

const KIND_META: Record<StokvelKind, { icon: string; label: string }> = {
  rotation:   { icon: 'refresh-cw',    label: 'Rotation'   },
  burial:     { icon: 'heart',         label: 'Burial'     },
  investment: { icon: 'trending-up',   label: 'Investment' },
  grocery:    { icon: 'shopping-cart', label: 'Grocery'    },
  social:     { icon: 'users',         label: 'Social'     },
};

function fairScoreColor(score: number): string {
  if (score >= 800) return '#16A34A';
  if (score >= 740) return '#2563EB';
  if (score >= 680) return '#D97706';
  return '#DC2626';
}

function fairScoreLabel(score: number): string {
  if (score >= 800) return 'Excellent';
  if (score >= 740) return 'Good';
  if (score >= 680) return 'Fair';
  return 'Building';
}

function distanceLabel(km: number): string {
  if (km === 0) return 'Online';
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  if (km < 100) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/* ─── Hero Card ─────────────────────────────────────────── */
function HeroCard({ g, colors }: { g: DiscoverGroup; colors: any }) {
  const [requested, setRequested] = useState(false);
  const pct = g.members / g.maxMembers;
  const meta = KIND_META[g.kind];

  return (
    <View style={[hS.card, { width: HERO_W, backgroundColor: g.accentColor + '18', borderColor: g.accentColor + '40' }]}>
      {/* Top row */}
      <View style={hS.topRow}>
        <View style={[hS.iconWrap, { backgroundColor: g.accentColor + '22' }]}>
          <Icon name={meta.icon} size={22} color={g.accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[hS.name, { color: colors.foreground }]} numberOfLines={1}>{g.name}</Text>
            {g.verified && (
              <View style={[hS.verified, { backgroundColor: g.accentColor + '20' }]}>
                <Icon name="check-circle" size={11} color={g.accentColor} />
                <Text style={[hS.verifiedTxt, { color: g.accentColor }]}>Verified</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Icon name="map-pin" size={10} color={colors.mutedForeground} />
            <Text style={[hS.location, { color: colors.mutedForeground }]}>{g.location}</Text>
            <Text style={[hS.location, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[hS.location, { color: colors.mutedForeground }]}>{distanceLabel(g.distance)}</Text>
          </View>
        </View>
        <View style={[hS.scoreWrap, { backgroundColor: fairScoreColor(g.fairScore) + '18' }]}>
          <Text style={[hS.scoreVal, { color: fairScoreColor(g.fairScore) }]}>{g.fairScore}</Text>
          <Text style={[hS.scoreLbl, { color: fairScoreColor(g.fairScore) }]}>{fairScoreLabel(g.fairScore)}</Text>
        </View>
      </View>

      {/* Highlight */}
      <Text style={[hS.highlight, { color: colors.foreground }]}>{g.highlight}</Text>

      {/* Stats row */}
      <View style={[hS.statsRow, { borderColor: g.accentColor + '25' }]}>
        <View style={hS.stat}>
          <Text style={[hS.statVal, { color: colors.foreground }]}>R {g.monthlyContrib.toLocaleString()}</Text>
          <Text style={[hS.statLbl, { color: colors.mutedForeground }]}>/ month</Text>
        </View>
        <View style={[hS.statDivider, { backgroundColor: g.accentColor + '30' }]} />
        <View style={hS.stat}>
          <Text style={[hS.statVal, { color: colors.foreground }]}>{g.totalPool}</Text>
          <Text style={[hS.statLbl, { color: colors.mutedForeground }]}>pool size</Text>
        </View>
        {g.returnRate !== null && (
          <>
            <View style={[hS.statDivider, { backgroundColor: g.accentColor + '30' }]} />
            <View style={hS.stat}>
              <Text style={[hS.statVal, { color: g.accentColor }]}>{g.returnRate}% p.a.</Text>
              <Text style={[hS.statLbl, { color: colors.mutedForeground }]}>avg return</Text>
            </View>
          </>
        )}
      </View>

      {/* Member bar */}
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={[hS.statLbl, { color: colors.mutedForeground }]}>{g.members} of {g.maxMembers} members</Text>
          <Text style={[hS.statLbl, { color: g.maxMembers - g.members <= 3 ? '#DC2626' : colors.mutedForeground }]}>
            {g.maxMembers - g.members} spot{g.maxMembers - g.members !== 1 ? 's' : ''} left
          </Text>
        </View>
        <View style={[hS.barBg, { backgroundColor: g.accentColor + '20' }]}>
          <View style={[hS.barFill, { backgroundColor: g.accentColor, width: `${pct * 100}%` as any }]} />
        </View>
      </View>

      {/* Action */}
      <TouchableOpacity
        style={[hS.joinBtn, { backgroundColor: requested ? colors.muted : g.accentColor }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setRequested(r => !r); }}
        activeOpacity={0.82}
      >
        <Icon
          name={requested ? 'check' : 'user-plus'}
          size={16}
          color={requested ? colors.mutedForeground : '#FFFFFF'}
        />
        <Text style={[hS.joinBtnTxt, { color: requested ? colors.mutedForeground : '#FFFFFF' }]}>
          {requested ? 'Request Sent' : 'Request to Join'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── List Card ─────────────────────────────────────────── */
function ListCard({ g, colors }: { g: DiscoverGroup; colors: any }) {
  const [requested, setRequested] = useState(false);
  const pct = g.members / g.maxMembers;
  const meta = KIND_META[g.kind];
  const spotsLeft = g.maxMembers - g.members;

  return (
    <View style={[lS.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={lS.header}>
        <View style={[lS.iconWrap, { backgroundColor: g.accentColor + '18' }]}>
          <Icon name={meta.icon} size={20} color={g.accentColor} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={[lS.name, { color: colors.foreground }]} numberOfLines={1}>{g.name}</Text>
            {g.verified && <Icon name="check-circle" size={13} color={g.accentColor} />}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="map-pin" size={10} color={colors.mutedForeground} />
            <Text style={[lS.sub, { color: colors.mutedForeground }]}>{g.location}</Text>
            <Text style={[lS.sub, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[lS.sub, { color: colors.mutedForeground }]}>{distanceLabel(g.distance)}</Text>
          </View>
        </View>
        {/* Fair Score pill */}
        <View style={[lS.scorePill, { backgroundColor: fairScoreColor(g.fairScore) + '15' }]}>
          <Text style={[lS.scoreNum, { color: fairScoreColor(g.fairScore) }]}>{g.fairScore}</Text>
        </View>
      </View>

      {/* Highlight */}
      <Text style={[lS.highlight, { color: colors.mutedForeground }]} numberOfLines={2}>{g.highlight}</Text>

      {/* Key stats */}
      <View style={[lS.statsRow, { borderColor: colors.border }]}>
        <View style={lS.stat}>
          <Text style={[lS.statVal, { color: colors.foreground }]}>R {g.monthlyContrib.toLocaleString()}</Text>
          <Text style={[lS.statLbl, { color: colors.mutedForeground }]}>per month</Text>
        </View>
        <View style={[lS.statDiv, { backgroundColor: colors.border }]} />
        <View style={lS.stat}>
          <Text style={[lS.statVal, { color: colors.foreground }]}>{g.members}/{g.maxMembers}</Text>
          <Text style={[lS.statLbl, { color: colors.mutedForeground }]}>members</Text>
        </View>
        <View style={[lS.statDiv, { backgroundColor: colors.border }]} />
        <View style={lS.stat}>
          {g.returnRate !== null
            ? <Text style={[lS.statVal, { color: g.accentColor }]}>{g.returnRate}%</Text>
            : <Text style={[lS.statVal, { color: colors.foreground }]}>{g.ageLabel}</Text>}
          <Text style={[lS.statLbl, { color: colors.mutedForeground }]}>
            {g.returnRate !== null ? 'avg return' : 'established'}
          </Text>
        </View>
      </View>

      {/* Capacity bar */}
      <View style={[lS.barBg, { backgroundColor: colors.muted }]}>
        <View style={[lS.barFill, { backgroundColor: g.accentColor, width: `${pct * 100}%` as any }]} />
      </View>

      {/* Footer */}
      <View style={lS.footer}>
        <View style={[lS.kindBadge, { backgroundColor: g.accentColor + '15', borderColor: g.accentColor + '30' }]}>
          <Text style={[lS.kindTxt, { color: g.accentColor }]}>{meta.label}</Text>
        </View>
        {spotsLeft <= 3 && spotsLeft > 0 && (
          <View style={[lS.urgentBadge, { backgroundColor: '#DC262618', borderColor: '#DC262630' }]}>
            <Icon name="alert-circle" size={10} color="#DC2626" />
            <Text style={[lS.urgentTxt, { color: '#DC2626' }]}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</Text>
          </View>
        )}
        {spotsLeft === 0 && (
          <View style={[lS.urgentBadge, { backgroundColor: colors.muted }]}>
            <Text style={[lS.urgentTxt, { color: colors.mutedForeground }]}>Full — waitlist</Text>
          </View>
        )}
        <TouchableOpacity
          style={[lS.joinBtn, { backgroundColor: requested ? colors.muted : g.accentColor }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setRequested(r => !r); }}
          activeOpacity={0.82}
        >
          <Icon name={requested ? 'check' : 'user-plus'} size={13} color={requested ? colors.mutedForeground : '#FFFFFF'} />
          <Text style={[lS.joinBtnTxt, { color: requested ? colors.mutedForeground : '#FFFFFF' }]}>
            {requested ? 'Requested' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════
   DISCOVER SCREEN
══════════════════════════════════════════════════════════ */
export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<FilterKey>('for-you');
  const [search, setSearch] = useState('');
  const heroScrollRef = useRef<ScrollView>(null);
  const [heroPage, setHeroPage] = useState(0);

  const topPadding = Platform.OS === 'web' ? 20 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 100 : insets.bottom + 90;

  const filtered = ALL_GROUPS.filter(g => {
    const matchFilter = g.tags.includes(activeFilter);
    const matchSearch = search.trim() === '' || g.name.toLowerCase().includes(search.toLowerCase()) || g.location.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={[s.header, { paddingTop: topPadding + 16 }]}>
          <View>
            <Text style={[s.title, { color: colors.foreground }]}>Discover</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <Icon name="map-pin" size={11} color={colors.primary} />
              <Text style={[s.location, { color: colors.mutedForeground }]}>Johannesburg, GP · 10 km radius</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[s.filterBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Icon name="sliders" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* ── Search ──────────────────────────────────────── */}
        <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[s.searchInput, { color: colors.foreground }]}
            placeholder="Search stokvels by name or area…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="x" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Hero Carousel ────────────────────────────────── */}
        <View style={s.heroSection}>
          <View style={s.sectionHeaderRow}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Featured</Text>
            <View style={s.dotRow}>
              {HERO_GROUPS.map((_, i) => (
                <View key={i} style={[s.heroDot, {
                  backgroundColor: i === heroPage ? colors.primary : colors.border,
                  width: i === heroPage ? 16 : 6,
                }]} />
              ))}
            </View>
          </View>
          <ScrollView
            ref={heroScrollRef}
            horizontal
            pagingEnabled={false}
            snapToInterval={HERO_W + 12}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (HERO_W + 12));
              setHeroPage(Math.min(idx, HERO_GROUPS.length - 1));
            }}
          >
            {HERO_GROUPS.map(g => <HeroCard key={g.id} g={g} colors={colors} />)}
          </ScrollView>
        </View>

        {/* ── Filter Chips ─────────────────────────────────── */}
        <View style={s.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
            {FILTERS.map(f => {
              const active = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[s.chip, {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveFilter(f.key); }}
                  activeOpacity={0.8}
                >
                  <Icon name={f.icon} size={13} color={active ? colors.primaryForeground : colors.mutedForeground} />
                  <Text style={[s.chipTxt, { color: active ? colors.primaryForeground : colors.foreground }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Filter description ───────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14, marginTop: 4 }}>
          <Text style={[s.filterDesc, { color: colors.mutedForeground }]}>
            {activeFilter === 'for-you' && '✦ Personalised picks based on your location, contribution range, and stokvel history'}
            {activeFilter === 'top-performers' && '✦ Stokvels with Fair Score above 750 or verified return rates above 9% p.a.'}
            {activeFilter === 'safest' && '✦ Longest track records, perfect payout history, and low-risk investment vehicles'}
            {activeFilter === 'highest-grossing' && '✦ Biggest collective pools and highest documented returns across all types'}
            {activeFilter === 'near-me' && '✦ Active stokvels within your selected radius — Johannesburg, GP'}
          </Text>
        </View>

        {/* ── Results ──────────────────────────────────────── */}
        <View style={s.results}>
          {filtered.length === 0 ? (
            <View style={[s.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Icon name="search" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No stokvels found</Text>
              <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Try a different filter or search term</Text>
            </View>
          ) : (
            filtered.map(g => <ListCard key={g.id} g={g} colors={colors} />)
          )}
        </View>

        {/* ── Bottom CTA ───────────────────────────────────── */}
        <View style={[s.ctaCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.ctaTitle, { color: colors.foreground }]}>Can't find the right fit?</Text>
            <Text style={[s.ctaSub, { color: colors.mutedForeground }]}>Start your own stokvel in under 3 minutes</Text>
          </View>
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(tabs)/groups'); }}
            activeOpacity={0.85}
          >
            <Icon name="plus" size={16} color={colors.primaryForeground} />
            <Text style={[s.ctaBtnTxt, { color: colors.primaryForeground }]}>Create</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Hero card styles ──────────────────────────────────── */
const hS = StyleSheet.create({
  card:       { borderRadius: 20, borderWidth: 1, padding: 18, gap: 14 },
  topRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap:   { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  name:       { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, flexShrink: 1 },
  verified:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  verifiedTxt:{ fontSize: 10, fontWeight: '700' },
  location:   { fontSize: 11 },
  scoreWrap:  { alignItems: 'center', padding: 8, borderRadius: 12, minWidth: 56 },
  scoreVal:   { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  scoreLbl:   { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  highlight:  { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  statsRow:   { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12 },
  stat:       { flex: 1, alignItems: 'center', gap: 2 },
  statVal:    { fontSize: 14, fontWeight: '700' },
  statLbl:    { fontSize: 10 },
  statDivider:{ width: 1 },
  barBg:      { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill:    { height: 5, borderRadius: 3 },
  joinBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 13 },
  joinBtnTxt: { fontSize: 14, fontWeight: '700' },
});

/* ─── List card styles ──────────────────────────────────── */
const lS = StyleSheet.create({
  card:       { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12, marginHorizontal: 20, marginBottom: 12 },
  header:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap:   { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  name:       { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, flex: 1 },
  sub:        { fontSize: 11 },
  scorePill:  { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  scoreNum:   { fontSize: 13, fontWeight: '800' },
  highlight:  { fontSize: 12, lineHeight: 17 },
  statsRow:   { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  stat:       { flex: 1, alignItems: 'center', gap: 2 },
  statVal:    { fontSize: 13, fontWeight: '700' },
  statLbl:    { fontSize: 10 },
  statDiv:    { width: StyleSheet.hairlineWidth, marginVertical: 4 },
  barBg:      { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill:    { height: 4, borderRadius: 2 },
  footer:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kindBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  kindTxt:    { fontSize: 10, fontWeight: '700' },
  urgentBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  urgentTxt:  { fontSize: 10, fontWeight: '600' },
  joinBtn:    { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  joinBtnTxt: { fontSize: 12, fontWeight: '700' },
});

/* ─── Screen styles ─────────────────────────────────────── */
const s = StyleSheet.create({
  root:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  title:         { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  location:      { fontSize: 12 },
  filterBtn:     { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginTop: 6 },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1 },
  searchInput:   { flex: 1, fontSize: 14 },
  heroSection:   { marginBottom: 20, gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  sectionTitle:  { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  dotRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroDot:       { height: 6, borderRadius: 3 },
  filtersSection:{ marginBottom: 6 },
  filtersRow:    { paddingHorizontal: 20, gap: 8 },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1 },
  chipTxt:       { fontSize: 13, fontWeight: '600' },
  filterDesc:    { fontSize: 12, lineHeight: 17 },
  results:       { gap: 0 },
  empty:         { margin: 20, borderRadius: 18, borderWidth: 1, padding: 40, alignItems: 'center', gap: 10 },
  emptyTitle:    { fontSize: 17, fontWeight: '700' },
  emptySub:      { fontSize: 13, textAlign: 'center' },
  ctaCard:       { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 18, gap: 12, marginTop: 8, marginBottom: 20 },
  ctaTitle:      { fontSize: 14, fontWeight: '700' },
  ctaSub:        { fontSize: 12, marginTop: 2 },
  ctaBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 },
  ctaBtnTxt:     { fontSize: 13, fontWeight: '700' },
});
