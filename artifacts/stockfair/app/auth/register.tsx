import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import Icon from '@/components/Icon';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import {
  useAuth,
  sendOtp,
  verifyOtp,
  registerStep1,
  registerStep2,
  type StokvelTypePreference,
} from '@/context/AuthContext';

/* ─── Constants ──────────────────────────────────────────── */
const SA_LANGUAGES = [
  { code: 'zu', label: 'isiZulu' },
  { code: 'xh', label: 'isiXhosa' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'nso', label: 'Sepedi' },
  { code: 'en', label: 'English' },
  { code: 'tn', label: 'Setswana' },
  { code: 'st', label: 'Sesotho' },
  { code: 'ts', label: 'Xitsonga' },
  { code: 'ss', label: 'siSwati' },
  { code: 've', label: 'Tshivenda' },
  { code: 'nr', label: 'isiNdebele' },
];

const GENDERS = [
  { value: 'male',            label: 'Male' },
  { value: 'female',          label: 'Female' },
  { value: 'non_binary',      label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const STOKVEL_TYPES: { value: StokvelTypePreference; label: string; icon: string; desc: string }[] = [
  { value: 'rotation',   label: 'Rotation',   icon: 'refresh-cw',    desc: 'Savings & rotating payouts' },
  { value: 'burial',     label: 'Burial',     icon: 'heart',         desc: 'Funeral coverage & support' },
  { value: 'investment', label: 'Investment', icon: 'trending-up',   desc: 'Grow wealth together' },
  { value: 'grocery',    label: 'Grocery',    icon: 'shopping-cart', desc: 'Bulk buying power' },
  { value: 'social',     label: 'Social',     icon: 'users',         desc: 'Events & celebrations' },
];

// Step 2.5 is OTP — total visible steps shown in header = 4
const STEPS = ['Personal', 'Contact', 'Verify', 'Language', 'Preferences'];
const HEADER_STEPS = 4; // shown in dots (OTP shares step 2's dot)

/* ─── Shared components ──────────────────────────────────── */
function InputField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, error, icon, rightEl, returnKeyType, onSubmitEditing, inputRef, hint }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.row, focused && f.focused, error && f.errored]}>
        <View style={f.iconBox}>
          <Icon name={icon} size={15} color={error ? '#E53E3E' : focused ? '#0A0A0A' : '#9E9E9E'} />
        </View>
        <TextInput
          ref={inputRef}
          style={f.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C4C4C4"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'words'}
          autoCorrect={false}
          returnKeyType={returnKeyType ?? 'next'}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightEl}
      </View>
      {!!error && <Text style={f.error}>{error}</Text>}
      {!!hint && !error && <Text style={f.hint}>{hint}</Text>}
    </View>
  );
}

function SelectChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[f.chip, selected && f.chipSelected]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.75}
    >
      <Text style={[f.chipTxt, selected && f.chipTxtSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  const labels  = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const barClrs = ['#E0E0E0', '#E53E3E', '#9E9E9E', '#737373', '#16A34A'];
  if (!password) return null;
  return (
    <View style={f.strRow}>
      <View style={f.strBars}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[f.strBar, { backgroundColor: i <= score ? barClrs[score] : '#EBEBEB' }]} />
        ))}
      </View>
      <Text style={[f.strLabel, { color: barClrs[score] }]}>{labels[score]}</Text>
    </View>
  );
}

const f = StyleSheet.create({
  wrap:           { gap: 6 },
  label:          { fontSize: 11, fontWeight: '700', color: '#737373', letterSpacing: 0.6, textTransform: 'uppercase' },
  row:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', paddingHorizontal: 14, height: 54, gap: 10 },
  focused:        { borderColor: '#0A0A0A', backgroundColor: '#FFFFFF' },
  errored:        { borderColor: '#E53E3E', backgroundColor: '#FFF5F5' },
  iconBox:        { width: 20, alignItems: 'center' },
  input:          { flex: 1, fontSize: 15, color: '#0A0A0A', paddingVertical: 0 },
  error:          { fontSize: 11, color: '#E53E3E', fontWeight: '500' },
  hint:           { fontSize: 11, color: '#9E9E9E' },
  chip:           { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#F5F5F5' },
  chipSelected:   { backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' },
  chipTxt:        { fontSize: 14, fontWeight: '600', color: '#737373' },
  chipTxtSelected:{ color: '#FFFFFF' },
  strRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strBars:        { flex: 1, flexDirection: 'row', gap: 4 },
  strBar:         { flex: 1, height: 3, borderRadius: 2 },
  strLabel:       { fontSize: 11, fontWeight: '700', width: 44 },
});

/* ─── Step header ────────────────────────────────────────── */
function StepHeader({ step, total, title, sub, insets }: {
  step: number; total: number; title: string; sub: string; insets: any;
}) {
  // OTP step (step 2) shares dot with step 1
  const dotStep = step >= 2 ? step - 1 : step;
  return (
    <View style={[hdr.bar, { paddingTop: insets.top + 16 }]}>
      <View style={hdr.topRow}>
        <View style={hdr.dotsRow}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={[hdr.dot, i < dotStep && hdr.dotDone, i === dotStep && hdr.dotActive]} />
          ))}
        </View>
        <Text style={hdr.stepCount}>{Math.min(dotStep + 1, total)} of {total}</Text>
      </View>
      <Text style={hdr.title}>{title}</Text>
      <Text style={hdr.sub}>{sub}</Text>
    </View>
  );
}
const hdr = StyleSheet.create({
  bar:       { backgroundColor: '#000000', paddingHorizontal: 24, paddingBottom: 28 },
  topRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  dotsRow:   { flexDirection: 'row', gap: 6 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotDone:   { backgroundColor: 'rgba(255,255,255,0.55)', width: 20 },
  dotActive: { backgroundColor: '#FFFFFF', width: 20 },
  stepCount: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  title:     { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  sub:       { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
});

/* ─── OTP input boxes ────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = Array.from({ length: 6 }, () => useRef<TextInput>(null));

  const handleChange = (text: string, idx: number) => {
    const digits = value.split('');
    digits[idx] = text.slice(-1);
    const next = digits.join('');
    onChange(next.padEnd(6, ' ').slice(0, 6).trimEnd());
    if (text && idx < 5) refs[idx + 1].current?.focus();
    if (!text && idx > 0) refs[idx - 1].current?.focus();
  };

  return (
    <View style={otp.row}>
      {Array.from({ length: 6 }, (_, i) => (
        <TextInput
          key={i}
          ref={refs[i]}
          style={[otp.box, value[i] && value[i] !== ' ' && otp.boxFilled]}
          value={value[i] && value[i] !== ' ' ? value[i] : ''}
          onChangeText={(t) => handleChange(t, i)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          selectTextOnFocus
        />
      ))}
    </View>
  );
}
const otp = StyleSheet.create({
  row:      { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  box:      { width: 48, height: 58, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#F5F5F5', fontSize: 22, fontWeight: '700', color: '#0A0A0A' },
  boxFilled:{ borderColor: '#0A0A0A', backgroundColor: '#FFFFFF' },
});

/* ─── Step components ────────────────────────────────────── */
function Step1Personal({ data, set, errors, clearErr }: any) {
  const lastRef = useRef<TextInput>(null);
  return (
    <View style={sc.card}>
      <View style={sc.nameRow}>
        <View style={{ flex: 1 }}>
          <InputField label="First Name" value={data.firstName}
            onChangeText={(v: string) => { set('firstName', v); clearErr('firstName'); }}
            placeholder="e.g. Neo" icon="user" error={errors.firstName}
            returnKeyType="next" onSubmitEditing={() => lastRef.current?.focus()} />
        </View>
        <View style={{ flex: 1 }}>
          <InputField label="Last Name" value={data.lastName}
            onChangeText={(v: string) => { set('lastName', v); clearErr('lastName'); }}
            placeholder="e.g. Qiss" icon="user" error={errors.lastName}
            inputRef={lastRef} returnKeyType="done" />
        </View>
      </View>
      <InputField label="Date of Birth" value={data.dob}
        onChangeText={(v: string) => { set('dob', v); clearErr('dob'); }}
        placeholder="DD/MM/YYYY" icon="calendar" keyboardType="numbers-and-punctuation"
        autoCapitalize="none" error={errors.dob}
        hint="As it appears on your official ID document" />
      <View style={sc.fieldGroup}>
        <Text style={sc.groupLabel}>GENDER</Text>
        <View style={sc.chipWrap}>
          {GENDERS.map((g) => (
            <SelectChip key={g.value} label={g.label} selected={data.gender === g.value}
              onPress={() => { set('gender', g.value); clearErr('gender'); }} />
          ))}
        </View>
        {!!errors.gender && <Text style={sc.errMsg}>{errors.gender}</Text>}
      </View>
    </View>
  );
}

function Step2Contact({ data, set, errors, clearErr }: any) {
  const phoneRef   = useRef<TextInput>(null);
  const passRef    = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  return (
    <View style={sc.card}>
      <InputField label="Email Address (optional)" value={data.email}
        onChangeText={(v: string) => { set('email', v); clearErr('email'); }}
        placeholder="you@example.com" icon="mail" keyboardType="email-address"
        autoCapitalize="none" error={errors.email}
        returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} />
      <InputField label="SA Mobile Number" value={data.phone}
        onChangeText={(v: string) => { set('phone', v); clearErr('phone'); }}
        placeholder="+27 82 555 0123" icon="phone" keyboardType="phone-pad"
        autoCapitalize="none" error={errors.phone}
        hint="Used for OTP verification and contributions"
        inputRef={phoneRef} returnKeyType="next" onSubmitEditing={() => passRef.current?.focus()} />
      <InputField label="Password" value={data.password}
        onChangeText={(v: string) => { set('password', v); clearErr('password'); }}
        placeholder="Min. 8 characters" icon="lock" secureTextEntry={!showPass}
        error={errors.password} inputRef={passRef} returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        rightEl={<TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name={showPass ? 'eye-off' : 'eye'} size={15} color="#9E9E9E" /></TouchableOpacity>} />
      <PasswordStrength password={data.password} />
      <InputField label="Confirm Password" value={data.confirm}
        onChangeText={(v: string) => { set('confirm', v); clearErr('confirm'); }}
        placeholder="Re-enter your password" icon="check-circle" secureTextEntry={!showConf}
        error={errors.confirm} inputRef={confirmRef} returnKeyType="done"
        rightEl={<TouchableOpacity onPress={() => setShowConf(!showConf)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name={showConf ? 'eye-off' : 'eye'} size={15} color="#9E9E9E" /></TouchableOpacity>} />
    </View>
  );
}

function Step2OTP({ phone, otpCode, setOtpCode, error, countdown, onResend, debugOtp }: any) {
  return (
    <View style={sc.card}>
      <Text style={sc.sectionNote}>
        We sent a 6-digit code to <Text style={{ fontWeight: '700', color: '#0A0A0A' }}>{phone}</Text> via SMS and WhatsApp.
      </Text>
      <OtpInput value={otpCode} onChange={setOtpCode} />
      {!!error && <Text style={[sc.errMsg, { textAlign: 'center' }]}>{error}</Text>}
      {!!debugOtp && (
        <View style={sc.debugBox}>
          <Text style={sc.debugTxt}>Dev OTP: <Text style={{ fontWeight: '800' }}>{debugOtp}</Text></Text>
        </View>
      )}
      <TouchableOpacity
        onPress={onResend}
        disabled={countdown > 0}
        style={{ alignItems: 'center', marginTop: 4 }}
      >
        <Text style={[sc.resendTxt, countdown > 0 && { color: '#C4C4C4' }]}>
          {countdown > 0 ? `Resend in ${countdown}s` : "Didn't receive it? Resend"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Step3Language({ data, set, errors, clearErr }: any) {
  return (
    <View style={sc.card}>
      <Text style={sc.sectionNote}>
        StockFair supports all 11 official languages. Choose your preferred language.
      </Text>
      <View style={sc.langGrid}>
        {SA_LANGUAGES.map((lang) => (
          <TouchableOpacity key={lang.code}
            style={[sc.langTile, data.language === lang.code && sc.langTileSelected]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set('language', lang.code); clearErr('language'); }}
            activeOpacity={0.75}>
            <Text style={[sc.langLabel, data.language === lang.code && sc.langLabelSelected]}>{lang.label}</Text>
            {data.language === lang.code && <Icon name="check" size={12} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>
      {!!errors.language && <Text style={sc.errMsg}>{errors.language}</Text>}
    </View>
  );
}

function Step4Preferences({ data, set, errors, clearErr, agreed, setAgreed, agreeError }: any) {
  const toggleType = (val: StokvelTypePreference) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current: StokvelTypePreference[] = data.stokvelPreferences ?? [];
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
    set('stokvelPreferences', next);
    clearErr('stokvelPreferences');
  };
  return (
    <View style={sc.card}>
      <Text style={sc.sectionNote}>Select the stokvel types you're interested in.</Text>
      <View style={sc.stokvelGrid}>
        {STOKVEL_TYPES.map((type) => {
          const active = (data.stokvelPreferences ?? []).includes(type.value);
          return (
            <TouchableOpacity key={type.value}
              style={[sc.stokvelTile, active && sc.stokvelTileActive]}
              onPress={() => toggleType(type.value)} activeOpacity={0.78}>
              <View style={[sc.stokvelIcon, active && sc.stokvelIconActive]}>
                <Icon name={type.icon} size={20} color={active ? '#fff' : '#737373'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[sc.stokvelLabel, active && sc.stokvelLabelActive]}>{type.label}</Text>
                <Text style={[sc.stokvelDesc, active && { color: 'rgba(255,255,255,0.65)' }]}>{type.desc}</Text>
              </View>
              {active && (
                <View style={sc.stokvelCheck}>
                  <Icon name="check" size={11} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {!!errors.stokvelPreferences && <Text style={sc.errMsg}>{errors.stokvelPreferences}</Text>}
      <TouchableOpacity style={sc.agreeRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
        <View style={[sc.checkbox, agreed && sc.checkboxDone]}>
          {agreed && <Icon name="check" size={12} color="#fff" />}
        </View>
        <Text style={sc.agreeText}>
          I agree to StockFair's <Text style={sc.agreeLink}>Terms of Service</Text>,{' '}
          <Text style={sc.agreeLink}>Privacy Policy</Text>, and{' '}
          <Text style={sc.agreeLink}>POPIA Notice</Text>
        </Text>
      </TouchableOpacity>
      {!!agreeError && <Text style={sc.errMsg}>{agreeError}</Text>}
    </View>
  );
}

const sc = StyleSheet.create({
  card:             { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -16, borderRadius: 20, padding: 24, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 5, marginBottom: 24 },
  nameRow:          { flexDirection: 'row', gap: 12 },
  groupLabel:       { fontSize: 11, fontWeight: '700', color: '#737373', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  fieldGroup:       { gap: 0 },
  chipWrap:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  errMsg:           { fontSize: 11, color: '#E53E3E', fontWeight: '500', marginTop: 4 },
  sectionNote:      { fontSize: 13, color: '#737373', lineHeight: 19 },
  langGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langTile:         { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#F5F5F5', flexDirection: 'row', alignItems: 'center', gap: 6 },
  langTileSelected: { backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' },
  langLabel:        { fontSize: 14, fontWeight: '600', color: '#737373' },
  langLabelSelected:{ color: '#FFFFFF' },
  stokvelGrid:      { gap: 10 },
  stokvelTile:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#F5F5F5', position: 'relative' },
  stokvelTileActive:{ backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' },
  stokvelIcon:      { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  stokvelIconActive:{ backgroundColor: 'rgba(255,255,255,0.15)' },
  stokvelLabel:     { fontSize: 15, fontWeight: '700', color: '#0A0A0A' },
  stokvelLabelActive:{ color: '#FFFFFF' },
  stokvelDesc:      { fontSize: 11, color: '#9E9E9E' },
  stokvelCheck:     { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  agreeRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  checkbox:         { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: '#C4C4C4', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkboxDone:     { backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' },
  agreeText:        { flex: 1, fontSize: 12.5, color: '#737373', lineHeight: 19 },
  agreeLink:        { color: '#0A0A0A', fontWeight: '700' },
  resendTxt:        { fontSize: 13, color: '#0A0A0A', fontWeight: '600' },
  debugBox:         { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  debugTxt:         { fontSize: 12, color: '#16A34A' },
});

/* ═══════════════════════════════════════════════════════════
   MAIN REGISTER SCREEN
════════════════════════════════════════════════════════════ */
export default function RegisterScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { register } = useAuth();

  // Steps: 0=Personal, 1=Contact, 2=OTP, 3=Language, 4=Preferences
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // OTP state
  const [otpCode,    setOtpCode]    = useState('');
  const [otpToken,   setOtpToken]   = useState('');
  const [debugOtp,   setDebugOtp]   = useState('');
  const [countdown,  setCountdown]  = useState(0);
  const [sessionKey, setSessionKey] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
  const [data, setDataRaw] = useState({
    firstName: '', lastName: '', dob: '', gender: '',
    email: '', phone: '', password: '', confirm: '',
    language: '', stokvelPreferences: [] as StokvelTypePreference[],
  });
  const set = (key: string, val: any) => setDataRaw((d) => ({ ...d, [key]: val }));

  const [errors, setErrors]       = useState<Record<string, string>>({});
  const clearErr = (k: string)    => setErrors((e) => ({ ...e, [k]: '' }));
  const [agreed, setAgreed]       = useState(false);
  const [agreeError, setAgreeError] = useState('');

  const stepMeta = [
    { title: 'Tell us about yourself', sub: 'Personal details for FICA compliance' },
    { title: 'Contact & security',     sub: 'How we reach you + secure your account' },
    { title: 'Verify your number',     sub: `Enter the code sent to ${data.phone}` },
    { title: 'Language preference',    sub: 'Set your preferred app language' },
    { title: 'Stokvel interests',      sub: 'Personalise your experience' },
  ];

  // Cleanup countdown on unmount
  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const startCountdown = (seconds: number) => {
    setCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!data.firstName.trim()) e.firstName = 'First name is required.';
      if (!data.lastName.trim())  e.lastName  = 'Last name is required.';
      if (!data.dob.trim())       e.dob       = 'Date of birth is required.';
      if (!data.gender)           e.gender    = 'Please select a gender option.';
    }
    if (step === 1) {
      if (data.email && !/\S+@\S+\.\S+/.test(data.email)) e.email = 'Enter a valid email address.';
      if (!data.phone.trim()) e.phone = 'Phone number is required.';
      else if (!/^(\+27|0)[6-8][0-9]{8}$/.test(data.phone.replace(/\s/g, '')))
        e.phone = 'Enter a valid SA mobile number.';
      if (!data.password)                e.password = 'Password is required.';
      else if (data.password.length < 8) e.password = 'Password must be at least 8 characters.';
      if (data.confirm !== data.password) e.confirm = 'Passwords do not match.';
    }
    if (step === 3) {
      if (!data.language) e.language = 'Please choose your preferred language.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Step 1 → Step 2: Call register/step1 ──────────────────────────────────
  const handleStep1Next = async () => {
    if (!validateStep()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    setLoading(true);
    setApiError('');
    const result = await registerStep1({
      first_name:    data.firstName.trim(),
      last_name:     data.lastName.trim(),
      date_of_birth: data.dob,
      gender:        data.gender,
    });
    setLoading(false);
    if (!result.ok) { setApiError(result.error); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    setSessionKey(result.data.session_key);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(1);
  };

  // ── Step 2 → OTP: Call register/step2 + send OTP ──────────────────────────
  const handleStep2Next = async () => {
    if (!validateStep()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    setLoading(true);
    setApiError('');

    // Normalise phone
    const phone = data.phone.replace(/\s/g, '').startsWith('0')
      ? `+27${data.phone.replace(/\s/g, '').slice(1)}`
      : data.phone.replace(/\s/g, '');

    // Step 2 API
    const step2 = await registerStep2({
      session_key:      sessionKey,
      phone,
      email:            data.email || undefined,
      password:         data.password,
      confirm_password: data.confirm,
    });

    if (!step2.ok) {
      setLoading(false);
      setApiError(step2.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Send OTP to verified phone
    const otpResult = await sendOtp(phone, 'register');
    setLoading(false);

    if (!otpResult.ok) {
      setApiError(otpResult.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    set('phone', phone); // store normalised phone
    startCountdown(otpResult.data.expires_in_seconds);
    if (otpResult.data.debug_otp) setDebugOtp(otpResult.data.debug_otp);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  // ── OTP → Step 3: Verify OTP ───────────────────────────────────────────────
  const handleOtpVerify = async () => {
    if (otpCode.replace(/\s/g, '').length < 6) {
      setErrors((e) => ({ ...e, otp: 'Enter the full 6-digit code.' }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    setApiError('');
    const result = await verifyOtp(data.phone, 'register', otpCode.replace(/\s/g, ''));
    setLoading(false);
    if (!result.ok) {
      setApiError(result.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setOtpToken(result.data.otp_token);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep(3);
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setApiError('');
    const result = await sendOtp(data.phone, 'register');
    if (!result.ok) { setApiError(result.error); return; }
    startCountdown(result.data.expires_in_seconds);
    if (result.data.debug_otp) setDebugOtp(result.data.debug_otp);
    setOtpCode('');
  };

  // ── Step 3 → Step 4 ────────────────────────────────────────────────────────
  const handleStep3Next = () => {
    if (!validateStep()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(4);
  };

  // ── Submit: Step 4 ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!agreed) {
      setAgreeError('You must accept the Terms & Conditions.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (data.stokvelPreferences.length === 0) {
      setErrors((e) => ({ ...e, stokvelPreferences: 'Select at least one stokvel type.' }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    setApiError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await register({
      firstName:          data.firstName,
      lastName:           data.lastName,
      email:              data.email || undefined,
      phone:              data.phone,
      password:           data.password,
      dob:                data.dob,
      gender:             data.gender,
      language:           data.language,
      stokvelPreferences: data.stokvelPreferences,
      otpToken,
      sessionKey,
    });

    setLoading(false);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      setApiError(result.error ?? 'Registration failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // ── Back ───────────────────────────────────────────────────────────────────
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0) { router.back(); return; }
    setStep((s) => s - 1);
  };

  // ── Next dispatcher ────────────────────────────────────────────────────────
  const handleNext = () => {
    setApiError('');
    if (step === 0) return handleStep1Next();
    if (step === 1) return handleStep2Next();
    if (step === 2) return handleOtpVerify();
    if (step === 3) return handleStep3Next();
  };

  const meta   = stepMeta[step];
  const isLast = step === 4;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F5F5F5' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ position: 'absolute', top: insets.top + 12, left: 16, zIndex: 10 }}>
        <TouchableOpacity style={top.backBtn} onPress={handleBack} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Icon name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <StepHeader step={step} total={HEADER_STEPS} title={meta.title} sub={meta.sub} insets={insets} />

        {!!apiError && (
          <View style={top.apiErr}>
            <Icon name="alert-circle" size={14} color="#E53E3E" />
            <Text style={top.apiErrTxt}>{apiError}</Text>
          </View>
        )}

        {step === 0 && (
          <Animated.View entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(180)}>
            <Step1Personal data={data} set={set} errors={errors} clearErr={clearErr} />
          </Animated.View>
        )}
        {step === 1 && (
          <Animated.View entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(180)}>
            <Step2Contact data={data} set={set} errors={errors} clearErr={clearErr} />
          </Animated.View>
        )}
        {step === 2 && (
          <Animated.View entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(180)}>
            <Step2OTP
              phone={data.phone}
              otpCode={otpCode}
              setOtpCode={setOtpCode}
              error={errors.otp}
              countdown={countdown}
              onResend={handleResendOtp}
              debugOtp={debugOtp}
            />
          </Animated.View>
        )}
        {step === 3 && (
          <Animated.View entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(180)}>
            <Step3Language data={data} set={set} errors={errors} clearErr={clearErr} />
          </Animated.View>
        )}
        {step === 4 && (
          <Animated.View entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(180)}>
            <Step4Preferences data={data} set={set} errors={errors} clearErr={clearErr}
              agreed={agreed} setAgreed={setAgreed} agreeError={agreeError} />
          </Animated.View>
        )}

        <View style={[top.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          {isLast ? (
            <TouchableOpacity style={top.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.87}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                <><Icon name="shield" size={17} color="#FFFFFF" /><Text style={top.submitTxt}>Create My Account</Text></>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={top.nextBtn} onPress={handleNext} disabled={loading} activeOpacity={0.87}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                <><Text style={top.nextTxt}>{step === 2 ? 'Verify Code' : 'Continue'}</Text><Icon name="arrow-right" size={17} color="#FFFFFF" /></>
              )}
            </TouchableOpacity>
          )}

          <View style={top.loginRow}>
            <Text style={top.loginPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/auth/login')}>
              <Text style={top.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
          <View style={top.trustRow}>
            <Icon name="shield" size={12} color="#16A34A" />
            <Text style={top.trustTxt}>256-bit encrypted · FICA compliant · POPIA protected</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const top = StyleSheet.create({
  backBtn:    { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  footer:     { paddingHorizontal: 20, gap: 14, paddingTop: 4 },
  nextBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, backgroundColor: '#0A0A0A', borderRadius: 14 },
  nextTxt:    { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  submitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, backgroundColor: '#0A0A0A', borderRadius: 14 },
  submitTxt:  { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  loginRow:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginPrompt:{ fontSize: 13, color: '#737373' },
  loginLink:  { fontSize: 13, fontWeight: '700', color: '#0A0A0A' },
  trustRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingBottom: 8 },
  trustTxt:   { fontSize: 11, color: '#9E9E9E' },
  apiErr:     { marginHorizontal: 20, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  apiErrTxt:  { fontSize: 13, color: '#E53E3E', flex: 1, fontWeight: '500' },
});
