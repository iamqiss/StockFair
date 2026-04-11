import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  TextInput, Platform, Animated,
} from 'react-native';
import Icon from '@/components/Icon';
import * as Haptics from 'expo-haptics';
import { Stokvel } from '@/context/StokvelContext';

type Relationship = 'self' | 'spouse' | 'parent' | 'child' | 'sibling' | 'extended';
type ClaimStep    = 'incident' | 'documents' | 'review' | 'success';

const RELATIONSHIP_OPTIONS: { value: Relationship; label: string; icon: string; coverage: number }[] = [
  { value: 'self',     label: 'Self',              icon: 'user',       coverage: 1.0  },
  { value: 'spouse',   label: 'Spouse / Partner',  icon: 'heart',      coverage: 1.0  },
  { value: 'parent',   label: 'Parent',            icon: 'users',      coverage: 0.75 },
  { value: 'child',    label: 'Child (under 21)',   icon: 'smile',      coverage: 0.5  },
  { value: 'sibling',  label: 'Sibling',           icon: 'git-merge',  coverage: 0.5  },
  { value: 'extended', label: 'Extended Family',   icon: 'globe',      coverage: 0.25 },
];

const REQUIRED_DOCS: { key: string; label: string; desc: string; required: boolean }[] = [
  { key: 'death_cert',  label: 'Death Certificate',        desc: 'Original or certified copy',            required: true  },
  { key: 'id_deceased', label: 'ID of Deceased',           desc: 'SA ID document or passport',            required: true  },
  { key: 'id_claimant', label: 'Your ID Document',         desc: 'Valid SA ID or passport',               required: true  },
  { key: 'parlor_quote',label: 'Funeral Parlor Quote',     desc: 'From a registered South African parlor', required: true  },
  { key: 'affidavit',   label: 'Sworn Affidavit',          desc: 'Commissioner of Oaths stamp required',  required: false },
  { key: 'burial_order',label: 'Burial Order (if obtained)', desc: 'From Department of Home Affairs',     required: false },
];

function generateClaimRef(): string {
  return `CLM-${Date.now().toString().slice(-8)}`;
}

interface Props {
  visible:   boolean;
  onClose:   () => void;
  stokvel:   Stokvel;
  colors:    any;
  onSubmit?: (claimRef: string) => void;
}

export function BurialClaimModal({ visible, onClose, stokvel, colors, onSubmit }: Props) {
  const [step,         setStep]         = useState<ClaimStep>('incident');
  const [relationship, setRelationship] = useState<Relationship>('spouse');
  const [dateOfDeath,  setDateOfDeath]  = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [docChecked,   setDocChecked]   = useState<Record<string, boolean>>({});
  const [claimRef,     setClaimRef]     = useState('');
  const [addNotes,     setAddNotes]     = useState('');

  const checkScale  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === 'success') {
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, bounciness: 12 }).start();
    } else {
      checkScale.setValue(0);
    }
  }, [step]);

  function reset() {
    setStep('incident'); setRelationship('spouse'); setDateOfDeath('');
    setDeceasedName(''); setDocChecked({}); setClaimRef(''); setAddNotes('');
  }

  function handleClose() { reset(); onClose(); }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const order: ClaimStep[] = ['incident', 'documents', 'review', 'success'];
    const idx = order.indexOf(step);
    setStep(order[idx + 1]);
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const order: ClaimStep[] = ['incident', 'documents', 'review', 'success'];
    const idx = order.indexOf(step);
    if (idx === 0) { handleClose(); return; }
    setStep(order[idx - 1]);
  }

  function handleSubmit() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ref = generateClaimRef();
    setClaimRef(ref);
    onSubmit?.(ref);
    setStep('success');
  }

  const rel          = RELATIONSHIP_OPTIONS.find(r => r.value === relationship)!;
  const coverage     = stokvel.contributionAmount * 10;
  const claimAmount  = Math.round(coverage * rel.coverage);
  const requiredDone = REQUIRED_DOCS.filter(d => d.required).every(d => docChecked[d.key]);
  const stepIndex    = { incident: 0, documents: 1, review: 2, success: 3 }[step];
  const stepTitles   = ['Incident Details', 'Supporting Documents', 'Review & Submit', 'Claim Filed'];
  const progressPct  = [33, 66, 90, 100][stepIndex];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[bS.root, { backgroundColor: colors.background }]}>

        {/* Header */}
        {step !== 'success' && (
          <View style={[bS.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleBack}>
              <Icon name={step === 'incident' ? 'x' : 'arrow-left'} size={22} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[bS.headerTitle, { color: colors.foreground }]}>File Burial Claim</Text>
              <Text style={[bS.headerSub, { color: colors.mutedForeground }]}>{stepTitles[stepIndex]}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={[bS.progressWrap, { backgroundColor: colors.muted }]}>
                <View style={[bS.progressFill, { width: `${progressPct}%` as any, backgroundColor: '#3A3A3A' }]} />
              </View>
              <Text style={[bS.stepCount, { color: colors.mutedForeground }]}>{stepIndex + 1} / 3</Text>
            </View>
          </View>
        )}

        <ScrollView contentContainerStyle={bS.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── STEP 1: Incident Details ── */}
          {step === 'incident' && (
            <View style={bS.section}>
              {/* Coverage overview */}
              <View style={[bS.coverCard, { backgroundColor: '#3A3A3A' }]}>
                <Icon name="shield" size={24} color="#fff" style={{ marginBottom: 8 }} />
                <Text style={bS.coverTitle}>Your Coverage</Text>
                <Text style={bS.coverAmount}>R {coverage.toLocaleString('en-ZA')}</Text>
                <Text style={bS.coverSub}>{stokvel.name} · Burial Society</Text>
              </View>

              <Text style={[bS.sectionLabel, { color: colors.mutedForeground }]}>RELATIONSHIP TO DECEASED</Text>
              <View style={bS.relGrid}>
                {RELATIONSHIP_OPTIONS.map((opt) => {
                  const active = relationship === opt.value;
                  return (
                    <TouchableOpacity key={opt.value}
                      style={[bS.relTile, { backgroundColor: active ? '#3A3A3A' : colors.card, borderColor: active ? '#3A3A3A' : colors.border }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRelationship(opt.value); }}
                    >
                      <Icon name={opt.icon} size={16} color={active ? '#fff' : colors.mutedForeground} />
                      <Text style={[bS.relLabel, { color: active ? '#fff' : colors.foreground }]}>{opt.label}</Text>
                      <Text style={[bS.relCoverage, { color: active ? 'rgba(255,255,255,0.6)' : colors.mutedForeground }]}>
                        {Math.round(opt.coverage * 100)}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dynamic coverage based on relationship */}
              <View style={[bS.claimAmtCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[bS.claimAmtLabel, { color: colors.mutedForeground }]}>Claimable amount</Text>
                  <Text style={[bS.claimAmtValue, { color: colors.foreground }]}>R {claimAmount.toLocaleString('en-ZA')}</Text>
                  <Text style={[bS.claimAmtNote, { color: colors.mutedForeground }]}>
                    {Math.round(rel.coverage * 100)}% of R {coverage.toLocaleString('en-ZA')} cover
                  </Text>
                </View>
                <View style={[bS.relBadge, { backgroundColor: '#3A3A3A' }]}>
                  <Icon name={rel.icon} size={16} color="#fff" />
                  <Text style={bS.relBadgeTxt}>{rel.label}</Text>
                </View>
              </View>

              <Text style={[bS.sectionLabel, { color: colors.mutedForeground }]}>DECEASED DETAILS</Text>

              <View style={bS.fieldGroup}>
                <Text style={[bS.fieldLabel, { color: colors.mutedForeground }]}>Full Name of Deceased</Text>
                <TextInput
                  style={[bS.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={deceasedName} onChangeText={setDeceasedName}
                  placeholder="First and last name"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <View style={bS.fieldGroup}>
                <Text style={[bS.fieldLabel, { color: colors.mutedForeground }]}>Date of Passing</Text>
                <TextInput
                  style={[bS.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={dateOfDeath} onChangeText={setDateOfDeath}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
              </View>

              <View style={[bS.noticeBanner, { backgroundColor: '#3A3A3A15', borderColor: '#3A3A3A30' }]}>
                <Icon name="info" size={13} color={colors.mutedForeground} />
                <Text style={[bS.noticeTxt, { color: colors.mutedForeground }]}>
                  Claims must be filed within 30 days of the date of passing. Late claims require a signed declaration from the group chairperson.
                </Text>
              </View>

              <TouchableOpacity
                style={[bS.cta, { backgroundColor: deceasedName.trim() && dateOfDeath.length >= 8 ? '#3A3A3A' : colors.muted }]}
                onPress={deceasedName.trim() && dateOfDeath.length >= 8 ? handleNext : undefined}
                disabled={!(deceasedName.trim() && dateOfDeath.length >= 8)}
              >
                <Text style={[bS.ctaTxt, { color: deceasedName.trim() && dateOfDeath.length >= 8 ? '#fff' : colors.mutedForeground }]}>Continue to Documents</Text>
                <Icon name="arrow-right" size={17} color={deceasedName.trim() && dateOfDeath.length >= 8 ? '#fff' : colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: Documents ── */}
          {step === 'documents' && (
            <View style={bS.section}>
              <Text style={[bS.stepIntro, { color: colors.mutedForeground }]}>
                Tick off each document as you gather it. Required documents must be submitted before processing begins.
              </Text>

              {REQUIRED_DOCS.map((doc) => {
                const checked = docChecked[doc.key];
                return (
                  <TouchableOpacity key={doc.key}
                    style={[bS.docTile, { backgroundColor: checked ? '#16A34A08' : colors.card, borderColor: checked ? '#16A34A40' : colors.border }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDocChecked((prev) => ({ ...prev, [doc.key]: !prev[doc.key] }));
                    }}
                  >
                    <View style={[bS.docCheck, { backgroundColor: checked ? '#16A34A' : colors.muted, borderColor: checked ? '#16A34A' : colors.border }]}>
                      {checked && <Icon name="check" size={13} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={bS.docTitleRow}>
                        <Text style={[bS.docTitle, { color: colors.foreground }]}>{doc.label}</Text>
                        {doc.required && (
                          <View style={[bS.reqBadge, { backgroundColor: '#DC262618' }]}>
                            <Text style={[bS.reqBadgeTxt, { color: '#DC2626' }]}>Required</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[bS.docDesc, { color: colors.mutedForeground }]}>{doc.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Upload hint */}
              <View style={[bS.uploadHint, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Icon name="upload-cloud" size={18} color={colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={[bS.uploadHintTitle, { color: colors.foreground }]}>Document Upload</Text>
                  <Text style={[bS.uploadHintDesc, { color: colors.mutedForeground }]}>
                    Physical documents can be dropped off at any StockFair partner branch. Digital uploads coming soon.
                  </Text>
                </View>
              </View>

              {!requiredDone && (
                <View style={[bS.noticeBanner, { backgroundColor: '#D9770612', borderColor: '#D9770630' }]}>
                  <Icon name="alert-triangle" size={13} color="#D97706" />
                  <Text style={[bS.noticeTxt, { color: '#D97706' }]}>
                    Tick all required documents before proceeding. You can still submit and bring them within 14 days.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[bS.cta, { backgroundColor: '#3A3A3A' }]}
                onPress={handleNext}
              >
                <Text style={[bS.ctaTxt, { color: '#fff' }]}>
                  {requiredDone ? 'Review Claim' : 'Continue (submit docs later)'}
                </Text>
                <Icon name="arrow-right" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 'review' && (
            <View style={bS.section}>
              <Text style={[bS.stepIntro, { color: colors.mutedForeground }]}>
                Please review your claim details carefully before submitting.
              </Text>

              {/* Claim summary card */}
              <View style={[bS.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[bS.reviewHeader, { backgroundColor: '#3A3A3A' }]}>
                  <Icon name="file-text" size={20} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={bS.reviewHeaderTitle}>Burial Claim</Text>
                    <Text style={bS.reviewHeaderSub}>{stokvel.name}</Text>
                  </View>
                  <Text style={bS.reviewHeaderAmt}>R {claimAmount.toLocaleString('en-ZA')}</Text>
                </View>
                {[
                  { label: 'Claimant',       value: 'You (Member)' },
                  { label: 'Deceased',        value: deceasedName || '—' },
                  { label: 'Relationship',    value: rel.label },
                  { label: 'Date of Passing', value: dateOfDeath || '—' },
                  { label: 'Coverage Rate',   value: `${Math.round(rel.coverage * 100)}%` },
                  { label: 'Claim Amount',    value: `R ${claimAmount.toLocaleString('en-ZA')}`, bold: true, color: colors.foreground },
                  { label: 'Docs Submitted',  value: `${Object.values(docChecked).filter(Boolean).length} / ${REQUIRED_DOCS.length}` },
                ].map((row, i) => (
                  <View key={row.label} style={[bS.reviewRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <Text style={[bS.reviewLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[bS.reviewValue, { color: (row as any).color ?? colors.foreground, fontWeight: (row as any).bold ? '700' : '500' }]}>{row.value}</Text>
                  </View>
                ))}
              </View>

              {/* Additional notes */}
              <View style={bS.fieldGroup}>
                <Text style={[bS.fieldLabel, { color: colors.mutedForeground }]}>Additional Notes (optional)</Text>
                <TextInput
                  style={[bS.input, bS.textArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={addNotes} onChangeText={setAddNotes}
                  placeholder="Any special circumstances or requests..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                />
              </View>

              {/* Processing timeline */}
              <View style={[bS.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[bS.timelineTitle, { color: colors.foreground }]}>Processing Timeline</Text>
                {[
                  { icon: 'file-text',  label: 'Claim submitted',        time: 'Immediately',   done: true  },
                  { icon: 'search',     label: 'Document verification',   time: '2–3 business days', done: false },
                  { icon: 'check-circle',label: 'Approval decision',       time: '5–7 business days', done: false },
                  { icon: 'dollar-sign',label: 'Payment disbursed',        time: '24h after approval', done: false },
                ].map((item, i) => (
                  <View key={i} style={bS.timelineRow}>
                    <View style={[bS.timelineIcon, { backgroundColor: item.done ? '#16A34A18' : colors.muted }]}>
                      <Icon name={item.icon as any} size={13} color={item.done ? '#16A34A' : colors.mutedForeground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[bS.timelineLabel, { color: colors.foreground }]}>{item.label}</Text>
                      <Text style={[bS.timelineTime, { color: colors.mutedForeground }]}>{item.time}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[bS.cta, { backgroundColor: '#3A3A3A' }]} onPress={handleSubmit}>
                <Icon name="send" size={17} color="#fff" />
                <Text style={[bS.ctaTxt, { color: '#fff' }]}>Submit Claim</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 4: Success ── */}
          {step === 'success' && (
            <View style={bS.successWrap}>
              <Animated.View style={[bS.successIcon, { backgroundColor: '#16A34A18', transform: [{ scale: checkScale }] }]}>
                <Icon name="check-circle" size={56} color="#16A34A" />
              </Animated.View>

              <Text style={[bS.successTitle, { color: colors.foreground }]}>Claim Filed</Text>
              <Text style={[bS.successSub, { color: colors.mutedForeground }]}>
                Your burial claim for {deceasedName} has been submitted. The group chairperson and StockFair team will review your claim within 2–3 business days.
              </Text>

              <View style={[bS.refCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[bS.refLabel, { color: colors.mutedForeground }]}>CLAIM REFERENCE</Text>
                <Text style={[bS.refValue, { color: colors.foreground, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }]}>{claimRef}</Text>
                <Text style={[bS.refHint, { color: colors.mutedForeground }]}>Keep this reference for follow-up queries</Text>
              </View>

              {/* Claim summary */}
              <View style={[bS.successSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {[
                  { label: 'Claim Amount',     value: `R ${claimAmount.toLocaleString('en-ZA')}`,  color: '#16A34A' },
                  { label: 'Processing Time',  value: '5–7 business days' },
                  { label: 'Status',           value: 'Under Review',   color: '#D97706' },
                  { label: 'Notification',     value: 'SMS + In-app' },
                ].map((row, i) => (
                  <View key={row.label} style={[bS.reviewRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <Text style={[bS.reviewLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[bS.reviewValue, { color: (row as any).color ?? colors.foreground }]}>{row.value}</Text>
                  </View>
                ))}
              </View>

              <View style={[bS.noticeBanner, { backgroundColor: '#16A34A10', borderColor: '#16A34A30', marginTop: -4 }]}>
                <Icon name="phone" size={13} color="#16A34A" />
                <Text style={[bS.noticeTxt, { color: '#16A34A' }]}>
                  StockFair Support: 0800 786 2547 (toll-free) · Mon–Fri 8am–5pm
                </Text>
              </View>

              <TouchableOpacity style={[bS.cta, { backgroundColor: '#16A34A', marginTop: 8 }]} onPress={handleClose}>
                <Icon name="check" size={17} color="#fff" />
                <Text style={[bS.ctaTxt, { color: '#fff' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ─── Styles ──────────────────────────────────────────── */
const bS = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:  { fontSize: 18, fontWeight: '800' },
  headerSub:    { fontSize: 12, marginTop: 2 },
  progressWrap: { height: 4, width: 60, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  stepCount:    { fontSize: 10 },
  body:         { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  section:      { gap: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  stepIntro:    { fontSize: 14, lineHeight: 21 },

  coverCard:    { borderRadius: 18, padding: 24, alignItems: 'center' },
  coverTitle:   { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  coverAmount:  { color: '#fff', fontSize: 38, fontWeight: '800', marginVertical: 4 },
  coverSub:     { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  relGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  relTile:      { width: '48%', borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 6, alignItems: 'flex-start' },
  relLabel:     { fontSize: 13, fontWeight: '600' },
  relCoverage:  { fontSize: 11 },

  claimAmtCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  claimAmtLabel:{ fontSize: 11, fontWeight: '600' },
  claimAmtValue:{ fontSize: 28, fontWeight: '800', marginVertical: 2 },
  claimAmtNote: { fontSize: 11 },
  relBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
  relBadgeTxt:  { color: '#fff', fontSize: 11, fontWeight: '600' },

  fieldGroup:   { gap: 8 },
  fieldLabel:   { fontSize: 11, fontWeight: '600' },
  input:        { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  textArea:     { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  noticeBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  noticeTxt:    { flex: 1, fontSize: 12, lineHeight: 17 },
  cta:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  ctaTxt:       { fontSize: 16, fontWeight: '700' },

  docTile:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  docCheck:     { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  docTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  docTitle:     { fontSize: 14, fontWeight: '600' },
  reqBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  reqBadgeTxt:  { fontSize: 9, fontWeight: '700' },
  docDesc:      { fontSize: 11, lineHeight: 16 },
  uploadHint:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  uploadHintTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  uploadHintDesc:  { fontSize: 11, lineHeight: 17 },

  reviewCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  reviewHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  reviewHeaderTitle: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
  reviewHeaderSub:   { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  reviewHeaderAmt:   { color: '#fff', fontSize: 20, fontWeight: '800' },
  reviewRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14 },
  reviewLabel:   { fontSize: 12 },
  reviewValue:   { fontSize: 13, fontWeight: '500' },

  timelineCard:  { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  timelineTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  timelineRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineIcon:  { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  timelineLabel: { fontSize: 13 },
  timelineTime:  { fontSize: 11, marginTop: 1 },

  successWrap:   { alignItems: 'center', paddingTop: 32, gap: 14 },
  successIcon:   { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  successTitle:  { fontSize: 28, fontWeight: '800' },
  successSub:    { fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: 16 },
  refCard:       { width: '100%', borderRadius: 16, borderWidth: 1, padding: 18, alignItems: 'center', gap: 6 },
  refLabel:      { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  refValue:      { fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  refHint:       { fontSize: 11 },
  successSummary:{ width: '100%', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
});
