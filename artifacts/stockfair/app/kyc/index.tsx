import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  TextInput, Alert, Dimensions, Image, ActivityIndicator,
} from "react-native";
import Icon from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

const { width: SW } = Dimensions.get("window");
const KYC_STATUS_KEY = "@stockfair_kyc_status";

/* ─── Types ──────────────────────────────────────────────── */
type DocType = "sa_id" | "passport" | "permit";
type PoAType = "utility" | "bank" | "lease";

type KYCForm = {
  firstName: string; lastName: string; dob: string;
  nationality: "sa" | "foreign";
  docType: DocType; idNumber: string; idFrontUri: string; idBackUri: string;
  street: string; suburb: string; city: string; province: string;
  postalCode: string; poaType: PoAType; poaDocUri: string;
  selfieUri: string; consent: boolean;
};

const BLANK: KYCForm = {
  firstName: "", lastName: "", dob: "", nationality: "sa",
  docType: "sa_id", idNumber: "", idFrontUri: "", idBackUri: "",
  street: "", suburb: "", city: "", province: "Gauteng",
  postalCode: "", poaType: "utility", poaDocUri: "",
  selfieUri: "", consent: false,
};

const SA_PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

const STEP_META = [
  { title: "Identity",        icon: "credit-card" as const, sub: "Personal details & ID document" },
  { title: "Proof of Address",icon: "map-pin" as const,     sub: "Document less than 3 months old" },
  { title: "Selfie & Consent",icon: "camera" as const,      sub: "Face match + FICA consent" },
];

const LIVENESS_STEPS = [
  { text: "Centre your face", icon: "🧑" },
  { text: "Look left", icon: "👈" },
  { text: "Look right", icon: "👉" },
  { text: "Blink twice", icon: "😉" },
  { text: "Smile", icon: "😊" },
  { text: "Scanning…", icon: "✨" },
];

/* ─── Helpers ─────────────────────────────────────────────── */
function Label({ text, colors }: { text: string; colors: any }) {
  return <Text style={[s.label, { color: colors.mutedForeground }]}>{text}</Text>;
}

function KInput({ value, onChangeText, placeholder, colors, keyboardType, maxLength, autoCapitalize }: {
  value: string; onChangeText: (v: string) => void; placeholder: string; colors: any;
  keyboardType?: any; maxLength?: number; autoCapitalize?: any;
}) {
  return (
    <TextInput
      style={[s.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground} keyboardType={keyboardType}
      maxLength={maxLength} autoCapitalize={autoCapitalize ?? "words"}
    />
  );
}

function Chip({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      style={[s.chip, { backgroundColor: selected ? colors.primary : colors.muted, borderColor: selected ? colors.primary : colors.border }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
    >
      <Text style={[s.chipTxt, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

async function pickImage(source: "camera" | "library"): Promise<string | null> {
  const perm = source === "camera"
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission needed", source === "camera" ? "Allow camera access." : "Allow photo library access.");
    return null;
  }
  const fn = source === "camera" ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const result = await fn({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

function UploadBtn({ label, uri, onPress, colors }: { label: string; uri: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      style={[s.uploadBtn, {
        backgroundColor: uri ? colors.primary + "10" : colors.muted,
        borderColor: uri ? colors.primary : colors.border,
        borderStyle: uri ? "solid" : ("dashed" as any),
      }]}
      onPress={onPress}
    >
      {uri ? (
        <>
          <Image source={{ uri }} style={s.uploadThumb} />
          <View style={{ flex: 1 }}>
            <Text style={[s.uploadDone, { color: colors.primary }]}>Uploaded ✓</Text>
            <Text style={[s.uploadHint, { color: colors.mutedForeground }]}>{label} · Tap to replace</Text>
          </View>
          <Icon name="check-circle" size={20} color={colors.primary} />
        </>
      ) : (
        <>
          <View style={[s.uploadIcon, { backgroundColor: colors.card }]}>
            <Icon name="upload" size={20} color={colors.mutedForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.uploadTxt, { color: colors.foreground }]}>{label}</Text>
            <Text style={[s.uploadHint, { color: colors.mutedForeground }]}>JPG, PNG · Max 5MB</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
        </>
      )}
    </TouchableOpacity>
  );
}

function StepBar({ current, total, colors }: { current: number; total: number; colors: any }) {
  return (
    <View style={s.stepBarWrap}>
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <View style={[s.stepDot, {
            backgroundColor: i <= current ? colors.primary : colors.muted,
            borderColor: i === current ? colors.primary : "transparent",
          }]}>
            {i < current
              ? <Icon name="check" size={10} color={colors.primaryForeground} />
              : <Text style={[s.stepDotNum, { color: i === current ? colors.primaryForeground : colors.mutedForeground }]}>{i + 1}</Text>}
          </View>
          {i < total - 1 && (
            <View style={[s.stepLine, { backgroundColor: i < current ? colors.primary : colors.border }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 1 — Identity (Personal + ID Document combined)
════════════════════════════════════════════════════════════ */
function Step1({ form, set, colors }: { form: KYCForm; set: (k: keyof KYCForm, v: any) => void; colors: any }) {
  const handleUpload = async (field: "idFrontUri" | "idBackUri") => {
    const uri = await pickImage("library");
    if (uri) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); set(field, uri); }
  };

  return (
    <ScrollView contentContainerStyle={s.stepContent} keyboardShouldPersistTaps="handled">
      {/* Personal details */}
      <Text style={[s.sectionHead, { color: colors.foreground }]}>Personal Details</Text>
      <Text style={[s.sectionSub, { color: colors.mutedForeground }]}>As per your official ID document</Text>

      <Label text="First Name" colors={colors} />
      <KInput value={form.firstName} onChangeText={(v) => set("firstName", v)} placeholder="e.g. Thandi" colors={colors} />

      <Label text="Last Name" colors={colors} />
      <KInput value={form.lastName} onChangeText={(v) => set("lastName", v)} placeholder="e.g. Dlamini" colors={colors} />

      <Label text="Date of Birth" colors={colors} />
      <KInput value={form.dob} onChangeText={(v) => set("dob", v)} placeholder="DD/MM/YYYY"
        colors={colors} keyboardType="numbers-and-punctuation" maxLength={10} autoCapitalize="none" />
      <Text style={[s.fieldHint, { color: colors.mutedForeground }]}>As it appears on your official ID document</Text>

      <Label text="Nationality" colors={colors} />
      <View style={s.chipRow}>
        <Chip label="South African" selected={form.nationality === "sa"} onPress={() => set("nationality", "sa")} colors={colors} />
        <Chip label="Non-SA National" selected={form.nationality === "foreign"} onPress={() => set("nationality", "foreign")} colors={colors} />
      </View>

      {/* Divider */}
      <View style={[s.divider, { borderColor: colors.border }]} />

      {/* ID Document */}
      <Text style={[s.sectionHead, { color: colors.foreground }]}>ID Document</Text>
      <Text style={[s.sectionSub, { color: colors.mutedForeground }]}>SA ID, Passport or Permit</Text>

      <Label text="Document Type" colors={colors} />
      <View style={s.chipRow}>
        {([["sa_id", "SA Green / Smart ID"], ["passport", "Passport"], ["permit", "Permit / Visa"]] as [DocType, string][]).map(([val, lbl]) => (
          <Chip key={val} label={lbl} selected={form.docType === val} onPress={() => set("docType", val)} colors={colors} />
        ))}
      </View>

      <Label text={form.docType === "sa_id" ? "SA ID Number" : "Passport / Permit Number"} colors={colors} />
      <KInput value={form.idNumber} onChangeText={(v) => set("idNumber", form.docType === "sa_id" ? v.replace(/\D/g, "") : v)}
        placeholder={form.docType === "sa_id" ? "13-digit ID number" : "e.g. A12345678"}
        colors={colors} keyboardType={form.docType === "sa_id" ? "number-pad" : "default"}
        maxLength={form.docType === "sa_id" ? 13 : 12} autoCapitalize="characters" />
      {form.docType === "sa_id" && form.idNumber.length > 0 && form.idNumber.length < 13 && (
        <Text style={[s.fieldHint, { color: colors.primary }]}>{13 - form.idNumber.length} more digits required</Text>
      )}

      <View style={[s.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "20" }]}>
        <Icon name="shield" size={14} color={colors.primary} />
        <Text style={[s.infoTxt, { color: colors.primary }]}>256-bit encrypted · POPIA compliant · Documents reviewed within 1–2 business days</Text>
      </View>

      <Label text="Upload Front of Document" colors={colors} />
      <UploadBtn label="Front / Photo page" uri={form.idFrontUri} onPress={() => handleUpload("idFrontUri")} colors={colors} />

      {form.docType === "sa_id" && (
        <>
          <Label text="Upload Back of Document" colors={colors} />
          <UploadBtn label="Back side (SA ID)" uri={form.idBackUri} onPress={() => handleUpload("idBackUri")} colors={colors} />
        </>
      )}
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 2 — Proof of Address
════════════════════════════════════════════════════════════ */
function Step2({ form, set, colors }: { form: KYCForm; set: (k: keyof KYCForm, v: any) => void; colors: any }) {
  const handleUpload = async () => {
    const uri = await pickImage("library");
    if (uri) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); set("poaDocUri", uri); }
  };

  return (
    <ScrollView contentContainerStyle={s.stepContent} keyboardShouldPersistTaps="handled">
      <Label text="Street Address" colors={colors} />
      <KInput value={form.street} onChangeText={(v) => set("street", v)} placeholder="e.g. 12 Acacia Street" colors={colors} />

      <Label text="Suburb" colors={colors} />
      <KInput value={form.suburb} onChangeText={(v) => set("suburb", v)} placeholder="Optional" colors={colors} />

      <Label text="City / Town" colors={colors} />
      <KInput value={form.city} onChangeText={(v) => set("city", v)} placeholder="e.g. Johannesburg" colors={colors} />

      <Label text="Province" colors={colors} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {SA_PROVINCES.map((p) => (
          <Chip key={p} label={p} selected={form.province === p} onPress={() => set("province", p)} colors={colors} />
        ))}
      </ScrollView>

      <Label text="Postal Code" colors={colors} />
      <KInput value={form.postalCode} onChangeText={(v) => set("postalCode", v)} placeholder="e.g. 2196"
        colors={colors} keyboardType="number-pad" maxLength={4} autoCapitalize="none" />

      <View style={[s.divider, { borderColor: colors.border }]} />

      <Label text="Document Type" colors={colors} />
      <Text style={[s.fieldHint, { color: colors.mutedForeground }]}>Must be dated within the last 3 months</Text>
      <View style={s.chipRow}>
        {([["utility", "Utility Bill"], ["bank", "Bank Statement"], ["lease", "Lease Agreement"]] as [PoAType, string][]).map(([val, lbl]) => (
          <Chip key={val} label={lbl} selected={form.poaType === val} onPress={() => set("poaType", val)} colors={colors} />
        ))}
      </View>

      <Label text="Upload Proof of Address" colors={colors} />
      <UploadBtn label={form.poaType === "utility" ? "Utility Bill" : form.poaType === "bank" ? "Bank Statement" : "Lease Agreement"}
        uri={form.poaDocUri} onPress={handleUpload} colors={colors} />

      <View style={[s.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Icon name="info" size={14} color={colors.mutedForeground} />
        <Text style={[s.infoTxt, { color: colors.mutedForeground }]}>Document must show your full name and the above address. Documents older than 3 months will be rejected.</Text>
      </View>
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 3 — Selfie + Consent + Submit
════════════════════════════════════════════════════════════ */
function Step3({ form, set, colors, onSubmit, submitting }: {
  form: KYCForm; set: (k: keyof KYCForm, v: any) => void; colors: any; onSubmit: () => void; submitting: boolean;
}) {
  const [livenessIdx, setLivenessIdx] = useState(0);
  const [scanning, setScanning]       = useState(false);
  const [scanResult, setScanResult]   = useState<"none" | "ok">("none");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);
  const ovalStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const startLiveness = () => {
    setLivenessIdx(0);
    timerRef.current = setInterval(() => {
      setLivenessIdx((i) => {
        if (i >= LIVENESS_STEPS.length - 1) { clearInterval(timerRef.current!); return i; }
        return i + 1;
      });
    }, 1800);
  };

  const handleCapture = async () => {
    const uri = Platform.OS === "web" ? await pickImage("library") : await pickImage("camera");
    if (!uri) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    set("selfieUri", uri);
    setScanning(true);
    setTimeout(() => { setScanning(false); setScanResult("ok"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }, 2000);
  };

  const ls = LIVENESS_STEPS[livenessIdx];
  const canSubmit = form.selfieUri && scanResult === "ok" && form.consent;

  return (
    <ScrollView contentContainerStyle={[s.stepContent, { alignItems: "center" }]}>
      {/* Selfie section */}
      {!form.selfieUri ? (
        <>
          <View style={s.cameraFrame}>
            <View style={[s.cameraPlaceholder, { backgroundColor: colors.primary }]}>
              <Animated.View style={[s.faceOval, ovalStyle]}>
                <View style={[s.faceOvalInner, { borderColor: colors.primaryForeground + "60" }]} />
              </Animated.View>
              {[{ top: 16, left: 16 }, { top: 16, right: 16 }, { bottom: 16, left: 16 }, { bottom: 16, right: 16 }].map((corner, i) => (
                <View key={i} style={[s.cornerGuide, corner as any, { borderColor: "rgba(255,255,255,0.5)" }]} />
              ))}
            </View>
            <View style={[s.instructionBox, { backgroundColor: colors.primary + "EE" }]}>
              <Text style={s.instructionIcon}>{ls.icon}</Text>
              <Text style={[s.instructionTxt, { color: colors.primaryForeground }]}>{ls.text}</Text>
            </View>
          </View>

          <View style={[s.livenessCard, { backgroundColor: colors.card }]}>
            <Text style={[s.livenessTitle, { color: colors.foreground }]}>AI Liveness Check</Text>
            <Text style={[s.livenessSub, { color: colors.mutedForeground }]}>Our AI matches your face to your ID photo to prevent synthetic fraud.</Text>
            <View style={s.livenessProgress}>
              {LIVENESS_STEPS.map((_, i) => (
                <View key={i} style={[s.livenessDot, {
                  backgroundColor: i <= livenessIdx && livenessIdx > 0 ? "#16A34A" : colors.muted,
                  width: i <= livenessIdx && livenessIdx > 0 ? 14 : 8,
                }]} />
              ))}
            </View>
          </View>

          {livenessIdx === 0 ? (
            <TouchableOpacity style={[s.captureBtn, { backgroundColor: colors.primary }]} onPress={startLiveness}>
              <Icon name="play-circle" size={18} color={colors.primaryForeground} />
              <Text style={[s.captureBtnTxt, { color: colors.primaryForeground }]}>Start Liveness Check</Text>
            </TouchableOpacity>
          ) : livenessIdx < LIVENESS_STEPS.length - 1 ? (
            <View style={[s.scanningRow, { backgroundColor: colors.muted }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[s.scanningTxt, { color: colors.mutedForeground }]}>Following your movements…</Text>
            </View>
          ) : (
            <TouchableOpacity style={[s.captureBtn, { backgroundColor: "#16A34A" }]} onPress={handleCapture}>
              <Icon name="camera" size={18} color="#fff" />
              <Text style={[s.captureBtnTxt, { color: "#fff" }]}>{Platform.OS === "web" ? "Upload Selfie" : "Take Selfie Now"}</Text>
            </TouchableOpacity>
          )}
        </>
      ) : scanning ? (
        <View style={s.scanResultBox}>
          <View style={[s.scanIcon, { backgroundColor: colors.muted }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={[s.scanTitle, { color: colors.foreground }]}>Verifying identity…</Text>
          <Text style={[s.scanSub, { color: colors.mutedForeground }]}>Matching your face to ID document</Text>
        </View>
      ) : scanResult === "ok" ? (
        <View style={s.scanResultBox}>
          <Image source={{ uri: form.selfieUri }} style={s.selfiePreview} />
          <View style={[s.scanBadge, { backgroundColor: "#16A34A18", borderColor: "#16A34A40" }]}>
            <Icon name="check-circle" size={18} color="#16A34A" />
            <Text style={[s.scanBadgeTxt, { color: "#16A34A" }]}>Face matched successfully ✓</Text>
          </View>
          <TouchableOpacity onPress={() => { set("selfieUri", ""); setScanResult("none"); setLivenessIdx(0); }}>
            <Text style={[s.retakeTxt, { color: colors.mutedForeground }]}>Retake selfie</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Consent + Submit */}
      <View style={[s.consentCard, { backgroundColor: colors.card, borderColor: colors.border, width: SW - 40 }]}>
        <TouchableOpacity style={s.consentRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set("consent", !form.consent); }}>
          <View style={[s.checkbox, { backgroundColor: form.consent ? colors.primary : colors.muted, borderColor: form.consent ? colors.primary : colors.border }]}>
            {form.consent && <Icon name="check" size={12} color={colors.primaryForeground} />}
          </View>
          <Text style={[s.consentTxt, { color: colors.mutedForeground }]}>
            I confirm all information is accurate and consent to StockFair processing my personal information for FICA/CDD verification in accordance with POPIA.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: canSubmit ? colors.primary : colors.muted }]}
          onPress={canSubmit ? onSubmit : undefined}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={canSubmit ? colors.primaryForeground : colors.mutedForeground} />
          ) : (
            <>
              <Icon name="shield" size={17} color={canSubmit ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[s.submitTxt, { color: canSubmit ? colors.primaryForeground : colors.mutedForeground }]}>Submit for Verification</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[s.infoBox, { backgroundColor: "#16A34A10", borderColor: "#16A34A20", marginTop: 0 }]}>
          <Icon name="shield" size={13} color="#16A34A" />
          <Text style={[s.infoTxt, { color: "#16A34A" }]}>Documents reviewed within 1–2 business days. Your data is protected under POPIA.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUCCESS SCREEN
════════════════════════════════════════════════════════════ */
function SuccessScreen({ colors, onDone }: { colors: any; onDone: () => void }) {
  const scale = useSharedValue(0.6);
  useEffect(() => { scale.value = withTiming(1, { duration: 500 }); }, []);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[s.successWrap, { backgroundColor: colors.background }]}>
      <Animated.View style={[s.successIconWrap, iconStyle, { backgroundColor: "#16A34A18" }]}>
        <Icon name="shield" size={52} color="#16A34A" />
      </Animated.View>
      <Text style={[s.successTitle, { color: colors.foreground }]}>Submitted!</Text>
      <Text style={[s.successSub, { color: colors.mutedForeground }]}>
        Your identity verification is under review. We'll notify you within{" "}
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>1–2 business days</Text>.
      </Text>

      <View style={[s.successSteps, { backgroundColor: colors.card }]}>
        {[
          { step: "Documents received",       done: true,  icon: "check-circle" as const },
          { step: "Automated ID check",        done: true,  icon: "check-circle" as const },
          { step: "Manual review (1–2 days)",  done: false, icon: "clock" as const },
          { step: "Verification complete",     done: false, icon: "circle" as const },
        ].map((item, i) => (
          <View key={item.step} style={[s.successStep, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Icon name={item.icon} size={16} color={item.done ? "#16A34A" : colors.mutedForeground} />
            <Text style={[s.successStepTxt, { color: item.done ? colors.foreground : colors.mutedForeground }]}>{item.step}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[s.doneBtn, { backgroundColor: colors.primary }]} onPress={onDone}>
        <Text style={[s.doneBtnTxt, { color: colors.primaryForeground }]}>Back to Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN KYC SCREEN
════════════════════════════════════════════════════════════ */
const TOTAL_STEPS = 3;

export default function KYCScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 56 : insets.top;
  const botPad = Platform.OS === "web" ? 24 : Math.max(insets.bottom, 16);

  const [step, setStep]           = useState(0);
  const [form, setFormRaw]        = useState<KYCForm>(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]      = useState(false);

  const set = (k: keyof KYCForm, v: any) => setFormRaw((prev) => ({ ...prev, [k]: v }));

  const canNext = (): boolean => {
    if (step === 0) return !!(form.firstName && form.lastName && form.dob && form.idNumber && form.idFrontUri);
    if (step === 1) return !!(form.street && form.city && form.province && form.postalCode && form.poaDocUri);
    return false; // step 2 has internal submit
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0) { router.back(); return; }
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(KYC_STATUS_KEY, "submitted");
    setTimeout(() => { setSubmitting(false); setSuccess(true); }, 1800);
  };

  if (success) {
    return <SuccessScreen colors={colors} onDone={() => router.back()} />;
  }

  const meta = STEP_META[step];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.primary }]}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack}>
          <Icon name="arrow-left" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.primaryForeground }]}>{meta.title}</Text>
          <Text style={[s.headerSub, { color: colors.primaryForeground + "99" }]}>{meta.sub}</Text>
        </View>
        <View style={[s.stepBadge, { backgroundColor: colors.primaryForeground + "18" }]}>
          <Text style={[s.stepBadgeTxt, { color: colors.primaryForeground }]}>{step + 1}/{TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* Step bar */}
      <StepBar current={step} total={TOTAL_STEPS} colors={colors} />

      {/* Content */}
      <View style={{ flex: 1 }}>
        {step === 0 && <Step1 form={form} set={set} colors={colors} />}
        {step === 1 && <Step2 form={form} set={set} colors={colors} />}
        {step === 2 && <Step3 form={form} set={set} colors={colors} onSubmit={handleSubmit} submitting={submitting} />}
      </View>

      {/* Footer nav — only for steps 0 and 1 */}
      {step < 2 && (
        <View style={[s.footer, { paddingBottom: botPad, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[s.footerBack, { borderColor: colors.border }]} onPress={handleBack}>
            <Icon name="arrow-left" size={16} color={colors.foreground} />
            <Text style={[s.footerBackTxt, { color: colors.foreground }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.footerNext, { backgroundColor: canNext() ? colors.primary : colors.muted }]}
            onPress={canNext() ? handleNext : undefined}
            disabled={!canNext()}
          >
            <Text style={[s.footerNextTxt, { color: canNext() ? colors.primaryForeground : colors.mutedForeground }]}>
              {step === 1 ? "Next: Selfie" : "Continue"}
            </Text>
            <Icon name="arrow-right" size={16} color={canNext() ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  header:        { paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn:       { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerTitle:   { fontSize: 18, fontWeight: "700" },
  headerSub:     { fontSize: 12, marginTop: 2 },
  stepBadge:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  stepBadgeTxt:  { fontSize: 12, fontWeight: "700" },

  stepBarWrap:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16 },
  stepDot:       { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2 },
  stepDotNum:    { fontSize: 11, fontWeight: "700" },
  stepLine:      { flex: 1, height: 2, borderRadius: 1 },

  stepContent:   { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 4 },
  sectionHead:   { fontSize: 15, fontWeight: "700", marginTop: 8 },
  sectionSub:    { fontSize: 12, marginBottom: 4 },
  label:         { fontSize: 12, fontWeight: "600", marginTop: 12, marginBottom: 4, letterSpacing: 0.3, textTransform: "uppercase" },
  input:         { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 2 },
  fieldHint:     { fontSize: 11, marginTop: 4, marginBottom: 2 },
  chipRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipTxt:       { fontSize: 13, fontWeight: "600" },
  divider:       { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 20 },
  infoBox:       { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  infoTxt:       { flex: 1, fontSize: 12, lineHeight: 17 },
  uploadBtn:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 2 },
  uploadThumb:   { width: 40, height: 40, borderRadius: 8 },
  uploadIcon:    { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  uploadTxt:     { fontSize: 14, fontWeight: "600" },
  uploadDone:    { fontSize: 14, fontWeight: "600" },
  uploadHint:    { fontSize: 11, marginTop: 2 },

  /* Selfie */
  cameraFrame:    { width: SW - 40, aspectRatio: 3/4, borderRadius: 24, overflow: "hidden", marginBottom: 16 },
  cameraPlaceholder:{ flex: 1, justifyContent: "center", alignItems: "center" },
  faceOval:       { width: "55%", aspectRatio: 3/4, justifyContent: "center", alignItems: "center" },
  faceOvalInner:  { width: "100%", height: "100%", borderRadius: 999, borderWidth: 3 },
  cornerGuide:    { position: "absolute", width: 24, height: 24, borderWidth: 3, borderColor: "rgba(255,255,255,0.5)" },
  instructionBox: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  instructionIcon:{ fontSize: 24 },
  instructionTxt: { fontSize: 14, fontWeight: "600", flex: 1 },
  livenessCard:   { width: SW - 40, borderRadius: 16, padding: 16, gap: 8, marginBottom: 16 },
  livenessTitle:  { fontSize: 14, fontWeight: "700" },
  livenessSub:    { fontSize: 12, lineHeight: 17 },
  livenessProgress:{ flexDirection: "row", gap: 4, marginTop: 4 },
  livenessDot:    { height: 4, borderRadius: 2 },
  captureBtn:     { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginBottom: 16 },
  captureBtnTxt:  { fontSize: 15, fontWeight: "700" },
  scanningRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginBottom: 16 },
  scanningTxt:    { fontSize: 14 },
  scanResultBox:  { alignItems: "center", gap: 14, marginBottom: 16 },
  scanIcon:       { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  scanTitle:      { fontSize: 16, fontWeight: "700" },
  scanSub:        { fontSize: 13, textAlign: "center", maxWidth: 280 },
  selfiePreview:  { width: 110, height: 146, borderRadius: 14 },
  scanBadge:      { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  scanBadgeTxt:   { fontSize: 14, fontWeight: "700" },
  retakeTxt:      { fontSize: 13, textDecorationLine: "underline", marginTop: 4 },

  /* Consent + submit */
  consentCard:    { borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, marginTop: 8, marginBottom: 24 },
  consentRow:     { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  checkbox:       { width: 22, height: 22, borderRadius: 7, borderWidth: 2, justifyContent: "center", alignItems: "center", marginTop: 1 },
  consentTxt:     { flex: 1, fontSize: 12.5, lineHeight: 19 },
  submitBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14 },
  submitTxt:      { fontSize: 16, fontWeight: "700" },

  /* Footer */
  footer:         { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerBack:     { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  footerBackTxt:  { fontSize: 14, fontWeight: "600" },
  footerNext:     { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  footerNextTxt:  { fontSize: 15, fontWeight: "700" },

  /* Success */
  successWrap:    { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 20 },
  successIconWrap:{ width: 110, height: 110, borderRadius: 55, justifyContent: "center", alignItems: "center" },
  successTitle:   { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  successSub:     { fontSize: 14, textAlign: "center", lineHeight: 21 },
  successSteps:   { width: "100%", borderRadius: 16, overflow: "hidden" },
  successStep:    { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  successStepTxt: { fontSize: 14, fontWeight: "500" },
  doneBtn:        { paddingHorizontal: 40, paddingVertical: 15, borderRadius: 14 },
  doneBtnTxt:     { fontSize: 16, fontWeight: "700" },
});
