import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

/* ─── Feature pill ───────────────────────────────────── */
function FeaturePill({ icon, text, delay }: { icon: any; text: string; delay: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()} style={pill.wrap}>
      <View style={pill.iconBox}>
        <Icon name={icon} size={13} color="rgba(255,255,255,0.9)" />
      </View>
      <Text style={pill.text}>{text}</Text>
    </Animated.View>
  );
}
const pill = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  iconBox: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  text:    { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500' },
});

/* ─── Orbit ring ─────────────────────────────────────── */
function OrbitRing({ size, opacity, delay }: { size: number; opacity: number; delay: number }) {
  return (
    <Animated.View
      entering={FadeIn.delay(delay)}
      style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: `rgba(255,255,255,${opacity})`, alignSelf: 'center' }}
    />
  );
}

/* ═══════════════════════════════════════════════════════
   WELCOME SCREEN
═══════════════════════════════════════════════════════ */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulse  = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2200 }),
        withTiming(1.0,  { duration: 2200 }),
      ),
      -1,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Subtle orbit rings */}
      <View style={styles.orbitContainer} pointerEvents="none">
        <OrbitRing size={220} opacity={0.06} delay={200} />
        <OrbitRing size={340} opacity={0.04} delay={400} />
        <OrbitRing size={460} opacity={0.03} delay={600} />
      </View>

      {/* ── Top section ── */}
      <View style={styles.topSection}>

        <Animated.View entering={FadeIn.delay(200)} style={pulseStyle}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Icon name="shield" size={34} color="#FFFFFF" />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.brandWrap}>
          <Text style={styles.brandName}>StockFair</Text>
          <View style={styles.tagRow}>
            <View style={styles.tagLine} />
            <Text style={styles.tagline}>Stokvel · Reimagined</Text>
            <View style={styles.tagLine} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(420).springify()} style={styles.headlineWrap}>
          <Text style={styles.headline}>Save Together.{'\n'}Grow Together.</Text>
          <Text style={styles.subHeadline}>South Africa's fairest stokvel platform —{'\n'}transparent, secure, and built for ubuntu.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(520)} style={styles.pillsRow}>
          <FeaturePill icon="shield"  text="FICA Compliant"  delay={580} />
          <FeaturePill icon="users"   text="11 Languages"    delay={660} />
          <FeaturePill icon="star"    text="Fair Score"      delay={740} />
        </Animated.View>
      </View>

      {/* ── Bottom CTA ── */}
      <Animated.View entering={FadeInUp.delay(580).springify()} style={[styles.ctaCard, { paddingBottom: insets.bottom + 32 }]}>

        <View style={styles.trustRow}>
          {['🇿🇦', '🤝', '🖤'].map((em, i) => (
            <Text key={i} style={styles.trustEmoji}>{em}</Text>
          ))}
          <Text style={styles.trustText}>Trusted by 12,000+ South Africans</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.87}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/auth/register'); }}
        >
          <View style={styles.primaryBtnInner}>
            <Text style={styles.primaryBtnText}>Create Free Account</Text>
            <Icon name="arrow-right" size={18} color="#000000" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.82}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/auth/login'); }}
        >
          <Text style={styles.secondaryBtnText}>Sign In to Existing Account</Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>By continuing you agree to StockFair's{'\n'}Terms of Service & Privacy Policy</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#000000' },
  orbitContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },

  topSection:     { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 48, gap: 0 },

  logoRing:       { width: 88, height: 88, borderRadius: 44, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  logoInner:      { width: 68, height: 68, borderRadius: 34, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },

  brandWrap:      { alignItems: 'center', marginBottom: 20 },
  brandName:      { fontSize: 40, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  tagRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  tagLine:        { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)', maxWidth: 36 },
  tagline:        { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '600', letterSpacing: 2.5, textTransform: 'uppercase' },

  headlineWrap:   { alignItems: 'center', marginBottom: 28 },
  headline:       { fontSize: 30, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', lineHeight: 38, letterSpacing: -0.5 },
  subHeadline:    { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 21, marginTop: 12 },

  pillsRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },

  ctaCard:        { backgroundColor: 'rgba(255,255,255,0.03)', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 28, paddingTop: 28, gap: 13 },

  trustRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 2 },
  trustEmoji:     { fontSize: 17 },
  trustText:      { fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: '500' },

  primaryBtn:     { borderRadius: 16 },
  primaryBtnInner:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, backgroundColor: '#FFFFFF', borderRadius: 16 },
  primaryBtnText: { fontSize: 17, fontWeight: '800', color: '#000000' },

  secondaryBtn:   { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  secondaryBtnText:{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  legalText:      { fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 17 },
});
