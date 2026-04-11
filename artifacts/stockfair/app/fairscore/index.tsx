import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Dimensions,
} from 'react-native';
import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedProps,
  withTiming, Easing, useDerivedValue,
} from 'react-native-reanimated';
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useStokvel } from '@/context/StokvelContext';

const { width: SW } = Dimensions.get('window');

const SCORE_MIN = 300;
const SCORE_MAX = 850;
const SCORE_RANGE = SCORE_MAX - SCORE_MIN;

const FACTORS = [
  {
    key: 'payment',
    label: 'Payment History',
    weight: 40,
    score: 95,
    icon: 'check-circle' as const,
    desc: 'On-time payment rate across all stokvels',
    tips: [
      'Pay your contributions before the due date',
      'Set up auto-pay to never miss a deadline',
      'A single missed payment can drop this by 15+ points',
    ],
    insight: 'You\'ve made 47 of 49 payments on time — top 12% of all members.',
  },
  {
    key: 'consistency',
    label: 'Consistency',
    weight: 25,
    score: 88,
    icon: 'bar-chart-2' as const,
    desc: 'Consecutive months without missing a contribution',
    tips: [
      'Keep your streak going — each month adds to your score',
      'Even partial payments count towards consistency',
      'Breaks in consistency take 3 months to recover from',
    ],
    insight: 'Current streak: 11 months. Your longest streak was 14 months.',
  },
  {
    key: 'activity',
    label: 'Group Activity',
    weight: 20,
    score: 80,
    icon: 'users' as const,
    desc: 'Active participation in stokvel groups',
    tips: [
      'Join more stokvels to increase this score',
      'Participate in group chats and votes',
      'Being an admin or treasurer gives bonus points',
    ],
    insight: 'Active in 5 groups. Members in 3+ groups average 22 points higher.',
  },
  {
    key: 'tenure',
    label: 'Member Tenure',
    weight: 15,
    score: 72,
    icon: 'clock' as const,
    desc: 'Length of membership on the platform',
    tips: [
      'This score increases naturally over time',
      'Members with 24+ months average 90+ here',
      'Early adopter bonus applies for the first 1000 users',
    ],
    insight: 'Member for 14 months. You\'ll reach the next tier at 18 months.',
  },
];

const TIERS = [
  { min: 780, max: 850, label: 'Excellent', color: '#16A34A', emoji: '🌟', unlocks: ['Priority payouts', 'Lower platform fees (0.3%)', 'Premium investment vehicles', 'Featured member badge', 'Admin tools for new groups'] },
  { min: 720, max: 779, label: 'Very Good', color: '#22C55E', emoji: '✅', unlocks: ['Standard investment stokvels', 'Create unlimited groups', 'Full marketplace access', 'Export tax reports'] },
  { min: 620, max: 719, label: 'Good', color: '#3B82F6', emoji: '👍', unlocks: ['Join investment stokvels', 'Create up to 5 groups', 'Marketplace discounts', 'Basic tax reporting'] },
  { min: 500, max: 619, label: 'Fair', color: '#D97706', emoji: '📊', unlocks: ['Join rotation & burial stokvels', 'Create up to 2 groups', 'Limited marketplace access'] },
  { min: 300, max: 499, label: 'Building', color: '#9CA3AF', emoji: '🔨', unlocks: ['Join existing stokvels only', 'Basic features', 'Score-building mode active'] },
];

function getScoreTier(score: number) {
  return TIERS.find(t => score >= t.min) ?? TIERS[TIERS.length - 1];
}

function generateScoreHistory(currentScore: number): { month: string; score: number }[] {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const points: { month: string; score: number }[] = [];
  const startScore = Math.max(SCORE_MIN, currentScore - 140);
  let s = startScore;
  for (let i = 0; i < 12; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (11 - i));
    if (i < 11) {
      const target = startScore + ((currentScore - startScore) * (i + 1)) / 12;
      const jitter = (Math.sin(i * 3.7) * 8);
      s = Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(target + jitter)));
    } else {
      s = currentScore;
    }
    points.push({ month: monthNames[d.getMonth()], score: s });
  }
  return points;
}

function ScoreArc({ score, size = 200, colors }: { score: number; size?: number; colors: any }) {
  const tier = getScoreTier(score);
  const pct = (score - SCORE_MIN) / SCORE_RANGE;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 20;
  const startAngle = 150;
  const endAngle = 390;
  const totalArc = endAngle - startAngle;
  const currentAngle = startAngle + totalArc * pct;

  function polarToCart(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(start: number, end: number) {
    const s = polarToCart(start);
    const e = polarToCart(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const needle = polarToCart(currentAngle);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size * 0.7}>
        <Defs>
          <SvgGrad id="arcGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#EF4444" />
            <Stop offset="25%" stopColor="#F59E0B" />
            <Stop offset="50%" stopColor="#EAB308" />
            <Stop offset="75%" stopColor="#22C55E" />
            <Stop offset="100%" stopColor="#16A34A" />
          </SvgGrad>
        </Defs>
        <Path d={describeArc(startAngle, endAngle)} fill="none"
          stroke={colors.muted} strokeWidth={14} strokeLinecap="round" />
        <Path d={describeArc(startAngle, Math.min(currentAngle, endAngle))} fill="none"
          stroke="url(#arcGrad)" strokeWidth={14} strokeLinecap="round" />
        <SvgCircle cx={needle.x} cy={needle.y} r={8} fill={tier.color} stroke="#fff" strokeWidth={3} />
      </Svg>
      <View style={{ position: 'absolute', top: size * 0.25, alignItems: 'center' }}>
        <Text style={{ fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -2 }}>{score}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <View style={{ backgroundColor: tier.color + '30', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: tier.color }}>{tier.label}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{SCORE_MIN} – {SCORE_MAX} range</Text>
      </View>
    </View>
  );
}

function MiniLineChart({ data, colors, height = 100 }: { data: { month: string; score: number }[]; colors: any; height?: number }) {
  if (!data || data.length < 2) return null;
  const padL = 4, padR = 4, padT = 16, padB = 24;
  const chartW = SW - 80;
  const chartH = height - padT - padB;
  const scores = data.map(d => d.score);
  const minS = Math.min(...scores) - 20;
  const maxS = Math.max(...scores) + 20;
  const range = maxS - minS || 1;

  const pts = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + chartH - ((d.score - minS) / range) * chartH,
  }));

  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
    path += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const fillPath = path +
    ` L ${pts[pts.length - 1].x} ${padT + chartH} L ${pts[0].x} ${padT + chartH} Z`;

  return (
    <View>
      <Svg width={chartW + padL + padR} height={height}>
        <Defs>
          <SvgGrad id="scoreFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#16A34A" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#16A34A" stopOpacity="0.02" />
          </SvgGrad>
        </Defs>
        <Path d={fillPath} fill="url(#scoreFill)" />
        <Path d={path} stroke="#16A34A" strokeWidth={2} fill="none" strokeLinecap="round" />
        {pts.map((pt, i) => (
          <SvgCircle key={i} cx={pt.x} cy={pt.y} r={i === pts.length - 1 ? 4 : 2.5}
            fill={i === pts.length - 1 ? '#16A34A' : colors.card}
            stroke="#16A34A" strokeWidth={i === pts.length - 1 ? 2 : 1} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: padL, marginTop: -4 }}>
        {data.filter((_, i) => i % 2 === 0 || i === data.length - 1).map((d, i) => (
          <Text key={i} style={{ fontSize: 9, color: colors.mutedForeground }}>{d.month}</Text>
        ))}
      </View>
    </View>
  );
}

export default function FairScoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { stokvels } = useStokvel();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const fairScore = useMemo(() => {
    if (stokvels.length === 0) return 580;
    const base = 580;
    const bonus = stokvels.length * 28 + stokvels.reduce((s, g) => s + g.members.length, 0) * 4;
    return Math.min(SCORE_MAX, Math.max(SCORE_MIN, base + bonus));
  }, [stokvels]);

  const tier = getScoreTier(fairScore);
  const scoreHistory = useMemo(() => generateScoreHistory(fairScore), [fairScore]);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  const nextTier = TIERS.find(t => t.min > fairScore);
  const pointsToNext = nextTier ? nextTier.min - fairScore : 0;
  const tierProgressPct = nextTier
    ? Math.min(100, Math.max(0, ((fairScore - tier.min) / (nextTier.min - tier.min)) * 100))
    : 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={[s.hero, { paddingTop: topPad + 8 }]}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Icon name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Fair Score</Text>
            <TouchableOpacity style={s.infoBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Icon name="info" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          <ScoreArc score={fairScore} colors={colors} />

          {nextTier && (
            <View style={s.nextTierRow}>
              <Text style={s.nextTierTxt}>
                {pointsToNext} points to {nextTier.label}
              </Text>
              <View style={[s.nextTierTrack, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <View style={[s.nextTierFill, {
                  width: `${tierProgressPct}%`,
                  backgroundColor: tier.color
                }]} />
              </View>
            </View>
          )}
        </LinearGradient>

        <View style={s.body}>

          <Animated.View entering={FadeInDown.delay(0).springify()}>
            <View style={[s.card, { backgroundColor: colors.card }]}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Score History</Text>
              <Text style={[s.cardSub, { color: colors.mutedForeground }]}>Your Fair Score over the last 12 months</Text>
              <View style={s.historyStats}>
                {[
                  { label: 'Started at', value: `${scoreHistory[0].score}`, color: colors.mutedForeground },
                  { label: 'Current', value: `${fairScore}`, color: tier.color },
                  { label: 'Growth', value: `+${fairScore - scoreHistory[0].score}`, color: '#16A34A' },
                ].map(stat => (
                  <View key={stat.label} style={s.historyStatCol}>
                    <Text style={[s.historyStatVal, { color: stat.color }]}>{stat.value}</Text>
                    <Text style={[s.historyStatLbl, { color: colors.mutedForeground }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>
              <MiniLineChart data={scoreHistory} colors={colors} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View style={[s.card, { backgroundColor: colors.card }]}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>How Your Score is Calculated</Text>
              <Text style={[s.cardSub, { color: colors.mutedForeground }]}>
                Four factors determine your Fair Score. Tap each to see details and tips.
              </Text>

              {FACTORS.map((f, i) => {
                const fTier = getScoreTier(SCORE_MIN + (f.score / 100) * SCORE_RANGE);
                const isExpanded = expandedFactor === f.key;
                return (
                  <Animated.View key={f.key} entering={FadeInDown.delay(150 + i * 50).springify()}>
                    <TouchableOpacity
                      style={[s.factorCard, { backgroundColor: colors.background, borderColor: isExpanded ? fTier.color + '40' : colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setExpandedFactor(isExpanded ? null : f.key);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={s.factorHeader}>
                        <View style={[s.factorIcon, { backgroundColor: fTier.color + '18' }]}>
                          <Icon name={f.icon} size={16} color={fTier.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={s.factorTitleRow}>
                            <Text style={[s.factorLabel, { color: colors.foreground }]}>{f.label}</Text>
                            <Text style={[s.factorWeight, { color: colors.mutedForeground }]}>{f.weight}%</Text>
                          </View>
                          <Text style={[s.factorDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[s.factorScore, { color: fTier.color }]}>{f.score}</Text>
                          <Text style={{ fontSize: 9, color: colors.mutedForeground }}>/100</Text>
                        </View>
                      </View>

                      <View style={[s.factorTrack, { backgroundColor: colors.muted }]}>
                        <View style={[s.factorFill, { width: `${f.score}%`, backgroundColor: fTier.color }]} />
                      </View>

                      {isExpanded && (
                        <View style={s.factorExpanded}>
                          <View style={[s.insightBox, { backgroundColor: fTier.color + '0F', borderColor: fTier.color + '30' }]}>
                            <Icon name="activity" size={13} color={fTier.color} />
                            <Text style={[s.insightTxt, { color: fTier.color }]}>{f.insight}</Text>
                          </View>

                          <Text style={[s.tipsTitle, { color: colors.foreground }]}>How to improve</Text>
                          {f.tips.map((tip, ti) => (
                            <View key={ti} style={s.tipRow}>
                              <View style={[s.tipDot, { backgroundColor: fTier.color }]} />
                              <Text style={[s.tipTxt, { color: colors.mutedForeground }]}>{tip}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <View style={[s.card, { backgroundColor: colors.card }]}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>What Your Score Unlocks</Text>
              <Text style={[s.cardSub, { color: colors.mutedForeground }]}>
                Higher scores unlock more features and better rates
              </Text>

              {TIERS.map((t, i) => {
                const isCurrent = fairScore >= t.min && fairScore <= t.max;
                const isLocked = fairScore < t.min;
                return (
                  <View key={t.label} style={[
                    s.tierCard,
                    { backgroundColor: isCurrent ? t.color + '0C' : colors.background, borderColor: isCurrent ? t.color + '40' : colors.border },
                  ]}>
                    <View style={s.tierHeader}>
                      <View style={[s.tierIconWrap, { backgroundColor: t.color + '18' }]}>
                        {isLocked ? (
                          <Icon name="lock" size={16} color={t.color} />
                        ) : (
                          <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.tierLabel, { color: isLocked ? colors.mutedForeground : colors.foreground }]}>{t.label}</Text>
                        <Text style={[s.tierRange, { color: colors.mutedForeground }]}>{t.min}–{t.max} points</Text>
                      </View>
                      {isCurrent && (
                        <View style={[s.currentBadge, { backgroundColor: t.color }]}>
                          <Text style={s.currentBadgeTxt}>You're Here</Text>
                        </View>
                      )}
                      {isLocked && (
                        <View style={[s.lockedBadge, { backgroundColor: colors.muted }]}>
                          <Icon name="lock" size={10} color={colors.mutedForeground} />
                          <Text style={[s.lockedBadgeTxt, { color: colors.mutedForeground }]}>Locked</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.unlocksList}>
                      {t.unlocks.map((u, ui) => (
                        <View key={ui} style={s.unlockRow}>
                          <Icon
                            name={isLocked ? 'lock' : 'check-circle'}
                            size={12}
                            color={isLocked ? colors.mutedForeground : t.color}
                          />
                          <Text style={[s.unlockTxt, { color: isLocked ? colors.mutedForeground : colors.foreground }]}>{u}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <View style={[s.card, { backgroundColor: colors.card }]}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Platform Comparison</Text>
              <Text style={[s.cardSub, { color: colors.mutedForeground }]}>How you compare to other StockFair members</Text>

              {[
                { label: 'Your Score', value: fairScore, color: tier.color, pct: ((fairScore - SCORE_MIN) / SCORE_RANGE) },
                { label: 'Platform Average', value: 648, color: '#3B82F6', pct: ((648 - SCORE_MIN) / SCORE_RANGE) },
                { label: 'Top 10%', value: 790, color: '#16A34A', pct: ((790 - SCORE_MIN) / SCORE_RANGE) },
              ].map(item => (
                <View key={item.label} style={s.compareRow}>
                  <View style={s.compareLeft}>
                    <Text style={[s.compareLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                    <Text style={[s.compareVal, { color: item.color }]}>{item.value}</Text>
                  </View>
                  <View style={[s.compareTrack, { backgroundColor: colors.muted }]}>
                    <View style={[s.compareFill, { width: `${item.pct * 100}%`, backgroundColor: item.color }]} />
                  </View>
                </View>
              ))}

              <View style={[s.percentileBox, { backgroundColor: '#16A34A0F', borderColor: '#16A34A30' }]}>
                <Icon name="trending-up" size={16} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={[s.percentileTitle, { color: '#16A34A' }]}>
                    You're in the top {Math.round((1 - (fairScore - SCORE_MIN) / SCORE_RANGE) * 100 + 5)}% of members
                  </Text>
                  <Text style={[s.percentileSub, { color: '#16A34A' + 'AA' }]}>
                    {fairScore - 648} points above the platform average
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <View style={[s.card, { backgroundColor: colors.card }]}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Quick Actions to Boost Your Score</Text>
              {[
                { icon: 'credit-card', label: 'Make a contribution', desc: '+5–8 points per on-time payment', action: '/(tabs)/groups', color: '#16A34A' },
                { icon: 'users', label: 'Join another stokvel', desc: '+15–28 points for active participation', action: '/(tabs)/discover', color: '#3B82F6' },
                { icon: 'shield', label: 'Complete KYC verification', desc: '+20 points one-time bonus', action: '/kyc', color: '#F59E0B' },
                { icon: 'sliders', label: 'Enable auto-pay', desc: 'Prevents missed payments', action: '/(tabs)/profile', color: '#8B5CF6' },
              ].map((item, i) => (
                <TouchableOpacity key={item.label}
                  style={[s.actionRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(item.action as any); }}
                  activeOpacity={0.8}
                >
                  <View style={[s.actionIcon, { backgroundColor: item.color + '18' }]}>
                    <Icon name={item.icon as any} size={16} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.actionLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[s.actionDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <View style={[s.faqCard, { backgroundColor: colors.muted }]}>
            <Icon name="info" size={14} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[s.faqTitle, { color: colors.foreground }]}>About Fair Score</Text>
              <Text style={[s.faqTxt, { color: colors.mutedForeground }]}>
                Your Fair Score updates at the start of each month based on your activity from the previous month. It is transparent, algorithmic, and cannot be manually adjusted. All members start at 580 and build from there.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  hero:          { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  headerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:       { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: '#fff' },
  infoBtn:       { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  nextTierRow:   { alignItems: 'center', gap: 6, marginTop: -4 },
  nextTierTxt:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  nextTierTrack: { width: '60%', height: 4, borderRadius: 2, overflow: 'hidden' },
  nextTierFill:  { height: 4, borderRadius: 2, minWidth: 4 },

  body:          { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  card:          { borderRadius: 16, padding: 16, gap: 12 },
  cardTitle:     { fontSize: 15, fontWeight: '700' },
  cardSub:       { fontSize: 12, marginTop: -6 },

  historyStats:    { flexDirection: 'row' },
  historyStatCol:  { flex: 1, gap: 2 },
  historyStatVal:  { fontSize: 18, fontWeight: '800' },
  historyStatLbl:  { fontSize: 10 },

  factorCard:    { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  factorHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  factorIcon:    { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  factorTitleRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  factorLabel:   { fontSize: 14, fontWeight: '700' },
  factorWeight:  { fontSize: 11, fontWeight: '600' },
  factorDesc:    { fontSize: 11, marginTop: 2 },
  factorScore:   { fontSize: 20, fontWeight: '800' },
  factorTrack:   { height: 6, borderRadius: 3, overflow: 'hidden' },
  factorFill:    { height: 6, borderRadius: 3 },
  factorExpanded:{ gap: 10, paddingTop: 4 },

  insightBox:    { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  insightTxt:    { flex: 1, fontSize: 12, lineHeight: 17 },
  tipsTitle:     { fontSize: 12, fontWeight: '700' },
  tipRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot:        { width: 5, height: 5, borderRadius: 3, marginTop: 5 },
  tipTxt:        { flex: 1, fontSize: 12, lineHeight: 17 },

  tierCard:      { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  tierHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tierIconWrap:  { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tierLabel:     { fontSize: 14, fontWeight: '700' },
  tierRange:     { fontSize: 11, marginTop: 1 },
  currentBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  currentBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },
  lockedBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  lockedBadgeTxt:{ fontSize: 10, fontWeight: '600' },
  unlocksList:   { gap: 6, paddingLeft: 4 },
  unlockRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unlockTxt:     { fontSize: 12 },

  compareRow:    { gap: 6 },
  compareLeft:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compareLabel:  { fontSize: 12 },
  compareVal:    { fontSize: 14, fontWeight: '700' },
  compareTrack:  { height: 8, borderRadius: 4, overflow: 'hidden' },
  compareFill:   { height: 8, borderRadius: 4 },
  percentileBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  percentileTitle: { fontSize: 13, fontWeight: '700' },
  percentileSub: { fontSize: 11, marginTop: 2 },

  actionRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  actionIcon:    { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionLabel:   { fontSize: 13, fontWeight: '600' },
  actionDesc:    { fontSize: 11, marginTop: 2 },

  faqCard:       { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, alignItems: 'flex-start' },
  faqTitle:      { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  faqTxt:        { fontSize: 11, lineHeight: 16 },
});
