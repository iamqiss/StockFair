import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type Step = 'email' | 'code' | 'newPassword' | 'done';

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
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
          returnKeyType={returnKeyType ?? 'done'}
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

/* ─── OTP boxes ─────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs   = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleChange = (text: string, idx: number) => {
    const clean  = text.replace(/[^0-9]/g, '');
    const arr    = digits.map((d) => (d === ' ' ? '' : d));
    arr[idx]     = clean.slice(-1);
    onChange(arr.join(''));
    if (clean && idx < 5) refs[idx + 1].current?.focus();
  };
  const handleKey = (key: string, idx: number) => {
    if (key === 'Backspace' && !digits[idx]?.trim() && idx > 0) refs[idx - 1].current?.focus();
  };

  return (
    <View style={otp.row}>
      {refs.map((ref, i) => (
        <TextInput
          key={i} ref={ref}
          style={[otp.box, digits[i]?.trim() && otp.boxFilled]}
          value={digits[i]?.trim() ?? ''}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={({ nativeEvent: { key } }) => handleKey(key, i)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}
const otp = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box:       { width: 46, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#F5F5F5', textAlign: 'center', fontSize: 22, fontWeight: '700', color: '#0A0A0A' },
  boxFilled: { borderColor: '#0A0A0A', backgroundColor: '#FFFFFF' },
});

/* ═══════════════════════════════════════════════════════
   FORGOT PASSWORD SCREEN
═══════════════════════════════════════════════════════ */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step,        setStep]        = useState<Step>('email');
  const [email,       setEmail]       = useState('');
  const [code,        setCode]        = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  const stepMeta: Record<Step, { icon: any; title: string; sub: string }> = {
    email:       { icon: 'mail',          title: 'Forgot Password',  sub: "Enter your registered email and we'll send a reset code" },
    code:        { icon: 'message-square', title: 'Enter Code',      sub: `We sent a 6-digit code to ${email}` },
    newPassword: { icon: 'lock',          title: 'New Password',     sub: 'Choose a strong new password for your account' },
    done:        { icon: 'check-circle',  title: 'Password Reset!',  sub: 'Your password has been updated. You can sign in now.' },
  };
  const meta = stepMeta[step];

  const handleEmailSubmit = () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setErrors({ email: 'Please enter a valid email address.' }); return; }
    setErrors({}); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => { setLoading(false); setStep('code'); }, 1200);
  };

  const handleCodeSubmit = () => {
    if (code.replace(/[^0-9]/g, '').length < 6) { setErrors({ code: 'Please enter the full 6-digit code.' }); return; }
    setErrors({}); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => { setLoading(false); setStep('newPassword'); }, 900);
  };

  const handlePasswordSubmit = () => {
    if (!newPass || newPass.length < 8) { setErrors({ newPass: 'Password must be at least 8 characters.' }); return; }
    setErrors({}); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => { setLoading(false); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setStep('done'); }, 1000);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.root} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { if (step === 'done') router.replace('/auth/login'); else router.back(); }}>
            <Icon name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Animated.View key={step} entering={FadeInDown.delay(100).springify()} style={styles.headerContent}>
            <View style={[styles.iconRing, step === 'done' && styles.iconRingSuccess]}>
              <Icon name={meta.icon} size={26} color={step === 'done' ? '#16A34A' : '#FFFFFF'} />
            </View>
            <Text style={styles.headerTitle}>{meta.title}</Text>
            <Text style={styles.headerSub}>{meta.sub}</Text>
          </Animated.View>

          {step !== 'done' && (
            <View style={styles.dotsRow}>
              {(['email', 'code', 'newPassword'] as Step[]).map((s, i) => (
                <View
                  key={s}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        s === step || (step === 'newPassword' && i < 2) || (step === 'code' && i < 1)
                          ? '#FFFFFF'
                          : 'rgba(255,255,255,0.22)',
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Card ── */}
        <Animated.View key={step + '_card'} entering={FadeInDown.delay(200).springify()} style={styles.card}>

          {step === 'email' && (
            <>
              <Field label="Email Address" value={email} onChangeText={(t: string) => { setEmail(t); setErrors({}); }} placeholder="you@example.com" keyboardType="email-address" icon="mail" error={errors.email} returnKeyType="done" onSubmitEditing={handleEmailSubmit} />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleEmailSubmit} disabled={loading} activeOpacity={0.87}>
                <View style={styles.primaryBtnInner}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryBtnText}>Send Reset Code</Text><Icon name="send" size={16} color="#FFFFFF" /></>}
                </View>
              </TouchableOpacity>
            </>
          )}

          {step === 'code' && (
            <>
              <Text style={styles.otpHint}>Enter the 6-digit code. For this demo, any 6 digits work.</Text>
              <OtpInput value={code} onChange={setCode} />
              {!!errors.code && <Text style={fld.error}>{errors.code}</Text>}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCodeSubmit} disabled={loading} activeOpacity={0.87}>
                <View style={styles.primaryBtnInner}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryBtnText}>Verify Code</Text><Icon name="check" size={16} color="#FFFFFF" /></>}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resendBtn} onPress={handleEmailSubmit}>
                <Text style={styles.resendText}>Didn't receive it? <Text style={{ fontWeight: '700', color: '#0A0A0A' }}>Resend</Text></Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <Field
                label="New Password" value={newPass} onChangeText={(t: string) => { setNewPass(t); setErrors({}); }} placeholder="Min. 8 characters" secureTextEntry={!showNewPass} icon="lock" error={errors.newPass} returnKeyType="done" onSubmitEditing={handlePasswordSubmit}
                rightElement={<TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Icon name={showNewPass ? 'eye-off' : 'eye'} size={16} color="#9E9E9E" /></TouchableOpacity>}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handlePasswordSubmit} disabled={loading} activeOpacity={0.87}>
                <View style={styles.primaryBtnInner}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryBtnText}>Reset Password</Text><Icon name="check-circle" size={16} color="#FFFFFF" /></>}
                </View>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <Animated.View entering={FadeIn.delay(100)} style={{ gap: 16, alignItems: 'center' }}>
              <View style={styles.successCircle}>
                <Icon name="check" size={36} color="#16A34A" />
              </View>
              <Text style={styles.successText}>Your password has been successfully reset. You can now sign in with your new password.</Text>
              <TouchableOpacity style={[styles.primaryBtn, { width: '100%' }]} onPress={() => router.replace('/auth/login')} activeOpacity={0.87}>
                <View style={styles.primaryBtnInner}>
                  <Text style={styles.primaryBtnText}>Sign In Now</Text>
                  <Icon name="arrow-right" size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#F5F5F5' },
  header:         { backgroundColor: '#000000', paddingHorizontal: 24, paddingBottom: 28 },
  backBtn:        { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  headerContent:  { alignItems: 'center', gap: 8, marginBottom: 16 },
  iconRing:       { width: 66, height: 66, borderRadius: 33, backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center', marginBottom: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  iconRingSuccess:{ backgroundColor: 'rgba(22,163,74,0.12)', borderColor: 'rgba(22,163,74,0.30)' },
  headerTitle:    { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub:      { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', paddingHorizontal: 16 },
  dotsRow:        { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot:            { width: 8, height: 8, borderRadius: 4 },

  card:           { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -16, borderRadius: 20, padding: 24, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 5, marginBottom: 24 },

  otpHint:        { fontSize: 13, color: '#737373', textAlign: 'center' },

  primaryBtn:     { borderRadius: 14, width: '100%' },
  primaryBtnInner:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, backgroundColor: '#0A0A0A', borderRadius: 14 },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },

  resendBtn:      { alignItems: 'center', paddingVertical: 4 },
  resendText:     { fontSize: 13, color: '#737373' },

  successCircle:  { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(22,163,74,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(22,163,74,0.25)' },
  successText:    { fontSize: 14, color: '#737373', textAlign: 'center', lineHeight: 21 },
});
