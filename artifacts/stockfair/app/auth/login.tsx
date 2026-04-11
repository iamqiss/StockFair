import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/context/AuthContext';

/* ─── Field ──────────────────────────────────────────── */
function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, error, icon, rightElement, returnKeyType, onSubmitEditing, inputRef }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fld.wrap}>
      <Text style={fld.label}>{label}</Text>
      <View style={[fld.row, focused && fld.rowFocused, error && fld.rowError]}>
        <View style={fld.iconBox}><Icon name={icon} size={16} color={error ? '#E53E3E' : focused ? '#0A0A0A' : '#9E9E9E'} /></View>
        <TextInput
          ref={inputRef}
          style={fld.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C4C4C4"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          autoCorrect={false}
          returnKeyType={returnKeyType ?? 'next'}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightElement}
      </View>
      {!!error && <Text style={fld.error}>{error}</Text>}
    </View>
  );
}
const fld = StyleSheet.create({
  wrap:       { gap: 6 },
  label:      { fontSize: 11, fontWeight: '700', color: '#737373', letterSpacing: 0.6, textTransform: 'uppercase' },
  row:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', paddingHorizontal: 14, height: 54, gap: 10 },
  rowFocused: { borderColor: '#0A0A0A', backgroundColor: '#FFFFFF' },
  rowError:   { borderColor: '#E53E3E', backgroundColor: '#FFF5F5' },
  iconBox:    { width: 20, alignItems: 'center' },
  input:      { flex: 1, fontSize: 15, color: '#0A0A0A', paddingVertical: 0 },
  error:      { fontSize: 11, color: '#E53E3E', fontWeight: '500' },
});

/* ═══════════════════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════════════════ */
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const passRef = useRef<TextInput>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Please enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    setApiError('');
    if (!validate()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      setApiError(result.error ?? 'Login failed.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.root} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headerContent}>
            <View style={styles.logoMini}>
              <Icon name="shield" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Welcome back</Text>
            <Text style={styles.headerSub}>Sign in to your StockFair account</Text>
          </Animated.View>
        </View>

        {/* ── Form card ── */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>

          {!!apiError && (
            <View style={styles.apiError}>
              <Icon name="alert-circle" size={15} color="#E53E3E" />
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          )}

          <Field
            label="Email Address"
            value={email}
            onChangeText={(t: string) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })); setApiError(''); }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail"
            error={errors.email}
            returnKeyType="next"
            onSubmitEditing={() => passRef.current?.focus()}
          />

          <Field
            label="Password"
            value={password}
            onChangeText={(t: string) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); setApiError(''); }}
            placeholder="Your password"
            secureTextEntry={!showPass}
            icon="lock"
            error={errors.password}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            inputRef={passRef}
            rightElement={
              <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name={showPass ? 'eye-off' : 'eye'} size={16} color="#9E9E9E" />
              </TouchableOpacity>
            }
          />

          <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot your password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.87}>
            <View style={styles.primaryBtnInner}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                  <Icon name="arrow-right" size={18} color="#FFFFFF" />
                </>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>New to StockFair?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/auth/register')} activeOpacity={0.82}>
            <Text style={styles.secondaryBtnText}>Create a Free Account</Text>
          </TouchableOpacity>

          <View style={styles.trustRow}>
            <Icon name="shield" size={13} color="#16A34A" />
            <Text style={styles.trustText}>256-bit encrypted · FICA compliant · POPIA protected</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#F5F5F5' },
  header:         { backgroundColor: '#000000', paddingHorizontal: 24, paddingBottom: 32 },
  backBtn:        { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  headerContent:  { alignItems: 'center', gap: 8 },
  logoMini:       { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  headerTitle:    { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub:      { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },

  card:           { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -16, borderRadius: 20, padding: 24, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 5, marginBottom: 24 },

  apiError:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  apiErrorText:   { fontSize: 13, color: '#E53E3E', flex: 1, fontWeight: '500' },

  forgotRow:      { alignItems: 'flex-end', marginTop: -4 },
  forgotText:     { fontSize: 13, color: '#0A0A0A', fontWeight: '600' },

  primaryBtn:     { borderRadius: 14, marginTop: 4 },
  primaryBtnInner:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, backgroundColor: '#0A0A0A', borderRadius: 14 },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },

  dividerRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine:    { flex: 1, height: 1, backgroundColor: '#EBEBEB' },
  dividerText:    { fontSize: 12, color: '#9E9E9E', fontWeight: '500' },

  secondaryBtn:   { borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#F5F5F5' },
  secondaryBtnText:{ fontSize: 15, fontWeight: '700', color: '#0A0A0A' },

  trustRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 4 },
  trustText:      { fontSize: 11, color: '#9E9E9E' },
});
