import React, { useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Share,
} from 'react-native';
import Icon from '@/components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

/* ─── Helpers ─────────────────────────────────────────── */
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function today() {
  return new Date().toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function frequencyLabel(f: string) {
  if (f === 'weekly')   return 'Week';
  if (f === 'biweekly') return 'Two Weeks';
  return 'Month';
}

/* ─── Section component ───────────────────────────────── */
function Section({ num, title, children, accent }: {
  num: string; title: string; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <View style={[sec.wrap, accent && sec.wrapAccent]}>
      <View style={sec.headRow}>
        <View style={[sec.numBadge, accent && sec.numBadgeAccent]}>
          <Text style={sec.numText}>{num}</Text>
        </View>
        <Text style={[sec.title, accent && sec.titleAccent]}>{title}</Text>
        {accent && (
          <View style={sec.accentPill}>
            <Icon name="shield" size={10} color="#0A0A0A" />
            <Text style={sec.accentPillText}>Key Section</Text>
          </View>
        )}
      </View>
      <View style={sec.body}>{children}</View>
    </View>
  );
}

function Clause({ text }: { text: string }) {
  return (
    <View style={sec.clauseRow}>
      <Text style={sec.bullet}>•</Text>
      <Text style={sec.clauseText}>{text}</Text>
    </View>
  );
}

function Bold({ label, value }: { label: string; value: string }) {
  return (
    <View style={sec.clauseRow}>
      <Text style={[sec.clauseText, { fontWeight: '700', color: '#0A0A0A' }]}>{label}: </Text>
      <Text style={sec.clauseText}>{value}</Text>
    </View>
  );
}

function InfoBox({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={sec.infoBox}>
      <Icon name={icon} size={13} color="#0A0A0A" />
      <Text style={sec.infoText}>{text}</Text>
    </View>
  );
}

const sec = StyleSheet.create({
  wrap:          { marginBottom: 24 },
  wrapAccent:    { backgroundColor: '#F8F9FA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 24 },
  headRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  numBadge:      { width: 30, height: 30, borderRadius: 15, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  numBadgeAccent:{ backgroundColor: '#0A0A0A' },
  numText:       { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  title:         { fontSize: 15, fontWeight: '800', color: '#0A0A0A', flex: 1 },
  titleAccent:   { color: '#0A0A0A' },
  accentPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8E8E8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  accentPillText:{ fontSize: 9, fontWeight: '700', color: '#0A0A0A', letterSpacing: 0.3 },
  body:          { gap: 8, paddingLeft: 4 },
  clauseRow:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet:        { fontSize: 14, color: '#737373', lineHeight: 22, width: 10 },
  clauseText:    { fontSize: 13.5, color: '#3A3A3A', lineHeight: 21, flex: 1 },
  infoBox:       { flexDirection: 'row', gap: 8, backgroundColor: '#EFEFEF', borderRadius: 10, padding: 12, alignItems: 'flex-start', marginTop: 4 },
  infoText:      { fontSize: 12, color: '#3A3A3A', lineHeight: 18, flex: 1 },
});

/* ─── Role card ───────────────────────────────────────── */
function RoleCard({ icon, role, duty }: { icon: any; role: string; duty: string }) {
  return (
    <View style={roleS.card}>
      <View style={roleS.iconBox}><Icon name={icon} size={16} color="#0A0A0A" /></View>
      <View style={{ flex: 1 }}>
        <Text style={roleS.role}>{role}</Text>
        <Text style={roleS.duty}>{duty}</Text>
      </View>
    </View>
  );
}
const roleS = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F4F6F8', borderRadius: 12, padding: 12, marginBottom: 8 },
  iconBox: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  role:    { fontSize: 13, fontWeight: '700', color: '#0A0A0A', marginBottom: 2 },
  duty:    { fontSize: 12, color: '#5D6D7E', lineHeight: 18 },
});

/* ─── Type-specific Section 8 ────────────────────────── */
function TypeSpecificSection({
  groupType, contributionAmount, maxMembers,
  investmentVehicleLabel, investmentVehicleDesc,
  platformFeePercent, targetReturnMin, targetReturnMax,
}: {
  groupType: string; contributionAmount: number; maxMembers?: number;
  investmentVehicleLabel?: string; investmentVehicleDesc?: string;
  platformFeePercent?: number; targetReturnMin?: number; targetReturnMax?: number;
}) {
  if (groupType === 'investment') {
    const feeStr   = platformFeePercent != null ? `${platformFeePercent}%` : '0.5–1.0%';
    const retStr   = (targetReturnMin != null && targetReturnMax != null)
      ? `${targetReturnMin}–${targetReturnMax}% per annum`
      : '7–15% per annum';
    const vehicle  = investmentVehicleLabel ?? 'Investment Fund';
    const vDesc    = investmentVehicleDesc ?? 'Pooled investment managed by StockFair.';

    return (
      <Section num="8" title="Investment Disclosures & Regulatory Compliance" accent>
        <Bold label="Investment Vehicle" value={vehicle} />
        <Clause text={vDesc} />
        <Clause text={`Target return range: ${retStr} (mid-point estimate used for projections). Returns are not guaranteed and depend on market conditions.`} />
        <Bold label="Platform Fee" value={`${feeStr} of net returns only — never charged on contributions or principal`} />
        <Clause text="Members acknowledge that stokvel investment clubs are not regulated by the Financial Sector Conduct Authority (FSCA). StockFair provides a technology platform only and does not constitute a Collective Investment Scheme under the CISCA." />
        <InfoBox icon="alert-triangle" text="Interest income is subject to South African Income Tax. Each member is individually responsible for declaring interest income exceeding R23,800 per annum to SARS under Section 10(1)(i) of the Income Tax Act. StockFair generates tax certificates for each member." />
        <Clause text="The investment vehicle and risk profile may only be changed by a two-thirds majority vote with 30 days' written notice. The mandate is locked for a minimum of 12 months from the date this constitution is signed." />
        <Clause text="No member may instruct withdrawals from the investment vehicle without co-approval of at least two office bearers (Multi-Sig Rule). Early withdrawals are subject to the group's exit policy as outlined in Section 6." />
      </Section>
    );
  }

  if (groupType === 'burial') {
    const coverage   = contributionAmount * 10;
    const pool       = contributionAmount * (maxMembers ?? 10);
    return (
      <Section num="8" title="Funeral Coverage, Beneficiaries & Claims" accent>
        <Bold label="Estimated Coverage per Member" value={`R ${coverage.toLocaleString('en-ZA')} (10× monthly contribution, reviewed annually)`} />
        <Clause text="Each member must register a designated beneficiary within 30 days of joining by completing the Beneficiary Form in the StockFair app. A member may update their beneficiary at any time with written notice to the Secretary." />
        <Clause text="A waiting period of 3 months applies to new members from the date of joining. No claims will be processed for members who have not completed the waiting period." />
        <Clause text="Claims must be submitted by the registered beneficiary within 30 days of the member's death. Required documents: certified death certificate, deceased member's SA ID, and beneficiary's SA ID." />
        <Clause text="All claim payouts require co-approval from the Chairperson and Treasurer within the StockFair platform (Multi-Sig Rule). Claim payouts will be processed within 5 business days of document verification." />
        <InfoBox icon="shield" text={`The group maintains a minimum claims reserve of 20% of the total fund (currently R ${Math.round(pool * 0.2).toLocaleString('en-ZA')} based on current pool). No payout may reduce reserves below this floor without a two-thirds member vote.`} />
        <Clause text="Members with three or more consecutive missed contributions forfeit coverage until arrears are settled in full." />
        <Clause text="Social bereavement support (attending funerals, providing moral support) is encouraged as a community obligation and recorded in the StockFair Chat as part of group history." />
      </Section>
    );
  }

  if (groupType === 'grocery') {
    return (
      <Section num="8" title="Bulk Order Governance & Collection Policy" accent>
        <Clause text="A bulk order proposal is only valid and placed once a two-thirds majority of active members vote YES within the StockFair Vote feature. The voting window is open for 7 days from proposal creation." />
        <Clause text="Once an order is approved, no additions or removals are permitted. Late votes are not accepted after the voting window closes." />
        <Clause text="Each approved member receives a unique, one-time collection code via the StockFair app. Codes are valid for 7 days from the designated pickup date." />
        <Clause text="A member who does not collect within the 7-day window forfeits their allocation for that cycle. Uncollected items are donated to a local charity or redistributed as voted by the group." />
        <InfoBox icon="package" text="Members must bring their collection code AND a valid SA ID to collect. No code, no collection — this protects every member's share." />
        <Clause text="In the event of a retailer error, shortage, or quality dispute, the group Treasurer must log a formal complaint via the StockFair platform within 48 hours. Refunds are returned to the group pool within 5 business days." />
        <Clause text="Members may propose new products by posting to the group chat. A product is added to the next vote if it receives a simple majority reaction (thumbs up) in chat." />
      </Section>
    );
  }

  if (groupType === 'social') {
    return (
      <Section num="8" title="Social Events, RSVP & Events Fund" accent>
        <Clause text="The group maintains an Events Fund, funded by an agreed percentage of monthly contributions (as set by majority vote). The Events Fund is managed separately from the main pool in the StockFair ledger." />
        <Clause text="All events must be proposed at least 30 days in advance and approved by a simple majority RSVP. The Chairperson publishes event details, RSVP deadline, and estimated cost-per-member in the group chat." />
        <Clause text="Event deposits paid to venues or suppliers are non-refundable once the group vote has passed. Members who cancel after payment are liable for their share of any non-recoverable costs." />
        <Clause text="Members who RSVP 'Yes' but do not attend without 48 hours' notice are liable for their full share of the event cost, deducted from their next contribution." />
        <InfoBox icon="calendar" text="A post-event financial report (costs, attendees, surplus/deficit) must be shared with all members within 7 days of each event. Surplus funds roll into the next event budget." />
        <Clause text="The group Treasurer authorises all event-related expenditures. Expenditures above 50% of the Events Fund in a single transaction require co-approval from the Chairperson." />
      </Section>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
interface Props {
  visible: boolean;
  groupName: string;
  groupType: string;
  contributionAmount: number;
  maxMembers?: number;
  frequency: string;
  memberName?: string;
  signedDate?: string;
  /* Investment-specific */
  investmentVehicleLabel?: string;
  investmentVehicleDesc?: string;
  platformFeePercent?: number;
  targetReturnMin?: number;
  targetReturnMax?: number;
  onAccept: () => void;
  onDecline: () => void;
  readOnly?: boolean;
}

export function ConstitutionModal({
  visible,
  groupName,
  groupType,
  contributionAmount,
  maxMembers = 10,
  frequency,
  memberName = 'Member',
  signedDate,
  investmentVehicleLabel,
  investmentVehicleDesc,
  platformFeePercent,
  targetReturnMin,
  targetReturnMax,
  onAccept,
  onDecline,
  readOnly = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(readOnly);
  const [signing, setSigning] = useState(false);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const reached = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
    if (reached && !scrolledToBottom) setScrolledToBottom(true);
  }, [scrolledToBottom]);

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSigning(true);
    setTimeout(() => { setSigning(false); onAccept(); }, 600);
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const lines = [
        `GROUP CONSTITUTION`,
        `${groupName} — ${cap(groupType)} Stokvel`,
        `NASASA Aligned · FICA · POPIA · ECTA Compliant`,
        ``,
        `Member: ${memberName}`,
        `Signed: ${signedDate ?? today()}`,
        `Contribution: R ${contributionAmount.toLocaleString('en-ZA')} per ${frequencyLabel(frequency).toLowerCase()}`,
        ``,
        `This constitution was digitally signed via StockFair.`,
        `Electronic signature valid under ECTA Act 25 of 2002.`,
        ``,
        `Generated by StockFair · https://stockfair.app`,
      ];
      await Share.share({ message: lines.join('\n'), title: `${groupName} Constitution` });
    } catch {}
  };

  const freqLabel  = frequencyLabel(frequency);
  const dateStr    = today();
  const typeLabel  = cap(groupType);

  /* Treasurer duty — type specific */
  const treasurerDuty: Record<string, string> = {
    grocery:    'Oversees the StockFair ledger, tracks contributions, authorises bulk grocery pre-orders, and manages fund withdrawals with co-approval.',
    burial:     'Oversees the StockFair ledger, tracks contributions, processes funeral claim payouts with Chairperson co-approval, and maintains the claims reserve.',
    investment: 'Oversees the StockFair ledger, tracks contributions, monitors investment portfolio performance, and authorises withdrawals from the investment vehicle.',
    rotation:   'Oversees the StockFair ledger, tracks contributions, and coordinates rotational payout disbursements per the agreed schedule.',
    social:     'Oversees the StockFair ledger, tracks contributions, maintains the Events Fund, and authorises all event-related expenditures.',
  };
  const tDuty = treasurerDuty[groupType] ?? treasurerDuty.rotation;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent presentationStyle="fullScreen">
      <View style={[styles.root, { paddingTop: insets.top }]}>

        {/* ── Header ── */}
        <LinearGradient colors={['#000000', '#111111']} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onDecline} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="x" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.sealIcon}>
              <Icon name="file-text" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Group Constitution</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{groupName}</Text>
            </View>
          </View>
          {readOnly ? (
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="share" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.nasasaBadge}>
              <Text style={styles.nasasaText}>NASASA</Text>
              <Text style={styles.nasasaText}>Aligned</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Scroll hint banner ── */}
        {!scrolledToBottom && !readOnly && (
          <View style={styles.scrollHint}>
            <Icon name="arrow-down" size={13} color="#FFFFFF" />
            <Text style={styles.scrollHintText}>Scroll to the bottom to unlock your digital signature</Text>
          </View>
        )}

        {/* ── Signed banner (read-only) ── */}
        {readOnly && (
          <View style={styles.signedBanner}>
            <Icon name="check-circle" size={14} color="#16A34A" />
            <Text style={styles.signedBannerText}>
              Signed on {signedDate ?? dateStr} — legally valid under ECTA Act 25 of 2002
            </Text>
          </View>
        )}

        {/* ── Constitution body ── */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollBody}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover */}
          <View style={styles.cover}>
            <View style={styles.coverSeal}>
              <Icon name="shield" size={28} color="#0A0A0A" />
            </View>
            <Text style={styles.coverTitle}>{groupName}</Text>
            <Text style={styles.coverSub}>{typeLabel} Stokvel Constitution</Text>
            <View style={styles.coverMeta}>
              <Text style={styles.coverMetaText}>NASASA Standards · FICA Regulations · POPIA Act · ECTA Act</Text>
            </View>
            {readOnly && (
              <View style={styles.coverSignedRow}>
                <Icon name="edit-3" size={12} color="#16A34A" />
                <Text style={styles.coverSignedText}>Digitally signed by {memberName} on {signedDate ?? dateStr}</Text>
              </View>
            )}
          </View>

          {/* ── 1. Name & Objective ── */}
          <Section num="1" title="Name and Objective">
            <Bold label="Name" value={`The name of the group shall be "${groupName}".`} />
            <Clause text={`Objective: To pool funds collectively for the ${
              groupType === 'grocery'    ? 'purchase of bulk groceries and provision of a lump-sum payout' :
              groupType === 'burial'     ? 'provision of dignified funeral coverage and mutual support to members and their families' :
              groupType === 'investment' ? 'collective investment, wealth-building, and long-term financial growth' :
              groupType === 'social'     ? 'facilitation of social events, celebrations, and community bonding' :
                                          'rotational payout and mutual savings'
            } to members for personal development and mutual support.`} />
            <Clause text="This group is formed voluntarily under the laws of the Republic of South Africa and shall operate in accordance with the Financial Intelligence Centre Act (FICA) and the Protection of Personal Information Act (POPIA)." />
          </Section>

          {/* ── 2. Membership ── */}
          <Section num="2" title="Membership & Verification">
            <Clause text="Membership is voluntary and limited to individuals aged 18 years and older." />
            <Clause text="Every member must be verified on the StockFair app with a valid South African ID, Passport, or Permit and proof of residence (FICA compliant KYC/CDD process)." />
            <Clause text="New members may only join by invitation or a majority vote of existing members, subject to KYC verification being completed." />
            <Clause text={`The maximum number of members is ${maxMembers} and may only be changed by a two-thirds majority vote.`} />
            <Clause text="Membership is non-transferable. No member may cede their position to another person without a formal group vote." />
          </Section>

          {/* ── 3. Management ── */}
          <Section num="3" title="Management (Executive Committee)">
            <Text style={[sec.clauseText, { marginBottom: 8 }]}>To ensure accountability, the group shall elect three office bearers:</Text>
            <RoleCard icon="user-check"    role="Chairperson" duty="Leads meetings, resolves disputes, and oversees the group's general direction and governance." />
            <RoleCard icon="message-circle" role="Secretary"  duty="Manages all communications via StockFair Chat and keeps records of all group decisions and minutes." />
            <RoleCard icon="dollar-sign"   role="Treasurer"   duty={tDuty} />
            <Clause text="Office bearers are elected annually by a simple majority vote and may be removed by a two-thirds majority for misconduct." />
            <Clause text="No single office bearer may authorise any withdrawal without the co-approval of at least one other office bearer (Multi-Sig Rule)." />
          </Section>

          {/* ── 4. Contributions & Payouts ── */}
          <Section num="4" title="Contributions & Payouts">
            <Bold label="Contribution Amount" value={`R ${contributionAmount.toLocaleString('en-ZA')} per ${freqLabel.toLowerCase()}.`} />
            <Clause text={`Deadline: All funds must be deposited into the StockFair group wallet by the agreed date of each ${freqLabel.toLowerCase()}.`} />
            {groupType === 'grocery' && (
              <Clause text="Bulk deals will be selected via the Market feature. A pre-order is only valid once the minimum group quantity is met and a two-thirds majority vote is recorded in the group chat." />
            )}
            <Clause text={`Payouts: ${
              groupType === 'rotation'   ? 'Rotational payouts follow the schedule in the Payouts tab. Each member receives a lump sum in their assigned turn.' :
              groupType === 'investment' ? 'Returns are distributed to members at the end of each investment cycle, net of the platform fee, per the earnings split shown in the Invest tab.' :
              groupType === 'burial'     ? 'Funeral claim payouts are disbursed within 5 business days of verified claim approval by the Executive Committee.' :
                                          'Any group payout shall be approved by the Executive Committee and recorded in the real-time ledger.'
            }`} />
            <Clause text="All contribution amount changes require a two-thirds majority vote and 30 days' notice to all members via StockFair Chat." />
          </Section>

          {/* ── 5. Transparency ── */}
          <Section num="5" title="Transparency & Financials">
            <Clause text="All transactions are recorded in the app's real-time ledger, accessible to all members at any time." />
            <Clause text="The group's funds are held securely within the StockFair payment ecosystem, subject to regulatory oversight." />
            <Bold label="Multi-Sig Rule" value="Any withdrawal of group funds requires digital approval from at least two office bearers within the StockFair platform." />
            <Clause text="An annual financial statement is generated automatically and shared with all members. Members may request an interim statement at any time." />
            <Clause text="The group's Fair Score, contribution history, and vote records are permanently stored and immutable on the platform." />
          </Section>

          {/* ── 6. Code of Conduct ── */}
          <Section num="6" title="Code of Conduct & Defaults">
            <Clause text="Late Payment: A fine of 5% of the contribution applies to any payment made after the deadline. Fines are recorded in the ledger." />
            <Clause text="Grace Period: Members have 3 days after the due date to pay without incurring a fine." />
            <Clause text="Leaving the Group: A member must give 30 days' written notice via StockFair Chat. They receive their individual balance minus any outstanding fines or commitments." />
            <Clause text="Misconduct: Any member acting against the group's interests (fraud, dishonesty, consistent non-payment) may be expelled by a two-thirds majority vote. Their remaining balance is returned after deductions." />
            <Clause text="Dispute Resolution: All disputes are first mediated by the Chairperson. If unresolved, members may escalate to NASASA or the relevant financial ombudsman." />
          </Section>

          {/* ── 7. Adoption ── */}
          <Section num="7" title="Adoption & Electronic Signature">
            <Clause text={`By tapping "I Accept & Sign Digitally", I acknowledge that I have read, understood, and agree to be bound by this constitution.`} />
            <Clause text="This electronic signature carries the same legal weight as a handwritten signature under the Electronic Communications and Transactions Act (ECTA), Act 25 of 2002." />
            <Clause text="This constitution may only be amended with a two-thirds majority vote of all active members, with 14 days' written notice." />
          </Section>

          {/* ── 8. Type-specific clauses ── */}
          <TypeSpecificSection
            groupType={groupType}
            contributionAmount={contributionAmount}
            maxMembers={maxMembers}
            investmentVehicleLabel={investmentVehicleLabel}
            investmentVehicleDesc={investmentVehicleDesc}
            platformFeePercent={platformFeePercent}
            targetReturnMin={targetReturnMin}
            targetReturnMax={targetReturnMax}
          />

          {/* ── Signature area ── */}
          <View style={styles.signatureArea}>
            <View style={styles.sigDivider} />
            <Text style={styles.sigLabel}>Digital Signature</Text>

            <View style={styles.sigRow}>
              <View style={styles.sigField}>
                <Text style={styles.sigFieldLabel}>MEMBER NAME</Text>
                <Text style={styles.sigFieldValue}>{memberName}</Text>
              </View>
              <View style={styles.sigField}>
                <Text style={styles.sigFieldLabel}>DATE SIGNED</Text>
                <Text style={styles.sigFieldValue}>{signedDate ?? (readOnly ? dateStr : '— pending —')}</Text>
              </View>
            </View>

            <View style={styles.sigRow}>
              <View style={[styles.sigField, { flex: 1 }]}>
                <Text style={styles.sigFieldLabel}>GROUP NAME</Text>
                <Text style={styles.sigFieldValue}>{groupName}</Text>
              </View>
              <View style={[styles.sigField, { flex: 1 }]}>
                <Text style={styles.sigFieldLabel}>CONSTITUTION TYPE</Text>
                <Text style={styles.sigFieldValue}>{typeLabel} Stokvel</Text>
              </View>
            </View>

            <View style={styles.ficaRow}>
              {['FICA', 'POPIA', 'ECTA', 'NASASA'].map((tag) => (
                <View key={tag} style={styles.ficaTag}>
                  <Text style={styles.ficaTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Footer action (signing) ── */}
        {!readOnly && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            {!scrolledToBottom ? (
              <View style={styles.footerLocked}>
                <Icon name="lock" size={15} color="#A9A9A9" />
                <Text style={styles.footerLockedText}>Read the full constitution to unlock your signature</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.acceptBtn, signing && { opacity: 0.8 }]}
                onPress={handleAccept}
                disabled={signing}
                activeOpacity={0.85}
              >
                <View style={styles.acceptGrad}>
                  <Icon name={signing ? 'check' : 'edit-3'} size={18} color="#FFFFFF" />
                  <Text style={styles.acceptText}>
                    {signing ? 'Signing…' : 'I Accept & Sign Digitally'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onDecline} style={styles.declineBtn}>
              <Text style={styles.declineText}>Decline — Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Footer (read-only) ── */}
        {readOnly && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.readOnlySignedBadge}>
              <Icon name="check-circle" size={16} color="#16A34A" />
              <Text style={styles.readOnlySignedText}>You have digitally signed this constitution</Text>
            </View>
            <View style={styles.readOnlyBtnRow}>
              <TouchableOpacity onPress={handleShare} style={styles.shareOutlineBtn}>
                <Icon name="share" size={16} color="#0A0A0A" />
                <Text style={styles.shareOutlineBtnText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onDecline} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

/* ─── Styles ──────────────────────────────────────────── */
const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#F8F9FA' },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn:          { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerCenter:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sealIcon:         { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.10)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:      { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerSub:        { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  nasasaBadge:      { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  nasasaText:       { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, lineHeight: 13 },
  shareBtn:         { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },

  scrollHint:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0A0A0A', paddingHorizontal: 16, paddingVertical: 9 },
  scrollHintText:   { color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1 },

  signedBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#16A34A12', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#16A34A30' },
  signedBannerText: { fontSize: 12, color: '#16A34A', flex: 1 },

  scrollBody:       { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  cover:            { alignItems: 'center', marginBottom: 32, paddingVertical: 24, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0', gap: 8 },
  coverSeal:        { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E0E0E0', marginBottom: 4 },
  coverTitle:       { fontSize: 22, fontWeight: '800', color: '#0A0A0A', textAlign: 'center' },
  coverSub:         { fontSize: 14, color: '#5D6D7E', fontWeight: '500' },
  coverMeta:        { backgroundColor: '#F4F6F8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, marginTop: 4 },
  coverMetaText:    { fontSize: 10, color: '#7F8C8D', textAlign: 'center', letterSpacing: 0.3 },
  coverSignedRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  coverSignedText:  { fontSize: 11, color: '#16A34A', fontWeight: '600' },

  signatureArea:    { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', padding: 20, gap: 14 },
  sigDivider:       { height: 2, backgroundColor: '#0A0A0A', marginBottom: 4 },
  sigLabel:         { fontSize: 12, fontWeight: '800', color: '#0A0A0A', letterSpacing: 1.5, textAlign: 'center' },
  sigRow:           { flexDirection: 'row', gap: 14 },
  sigField:         { flex: 1, borderBottomWidth: 1.5, borderBottomColor: 'rgba(0,0,0,0.15)', paddingBottom: 8 },
  sigFieldLabel:    { fontSize: 9, fontWeight: '700', color: '#95A5A6', letterSpacing: 1, marginBottom: 4 },
  sigFieldValue:    { fontSize: 14, fontWeight: '600', color: '#0A0A0A' },
  ficaRow:          { flexDirection: 'row', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 4 },
  ficaTag:          { backgroundColor: '#F0F0F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  ficaTagText:      { fontSize: 10, fontWeight: '700', color: '#0A0A0A', letterSpacing: 0.3 },

  footer:             { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E0E0', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8 },
  footerLocked:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F4F6F8', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14 },
  footerLockedText:   { fontSize: 13, color: '#7F8C8D', flex: 1 },
  acceptBtn:          { borderRadius: 16, overflow: 'hidden' },
  acceptGrad:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, backgroundColor: '#0A0A0A', borderRadius: 16 },
  acceptText:         { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  declineBtn:         { alignItems: 'center', paddingVertical: 6 },
  declineText:        { fontSize: 13, color: '#95A5A6' },

  readOnlySignedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#16A34A12', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  readOnlySignedText: { fontSize: 13, color: '#16A34A', fontWeight: '600', flex: 1 },
  readOnlyBtnRow:     { flexDirection: 'row', gap: 10 },
  shareOutlineBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, borderColor: '#0A0A0A', paddingVertical: 13 },
  shareOutlineBtnText:{ fontSize: 15, fontWeight: '700', color: '#0A0A0A' },
  closeBtn:           { flex: 2, backgroundColor: '#0A0A0A', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeBtnText:       { color: '#fff', fontSize: 15, fontWeight: '700' },
});
