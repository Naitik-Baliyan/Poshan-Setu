import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { STUDENTS_BY_CLASS } from '../../data/mockData';
import { fetchAttendanceRecords, subscribeToRealtimeAttendance } from '../../services/supabaseService';

const getInitials = (name) => {
  if (!name) return '--';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const AVATAR_PALETTE = [
  '#004D2C', '#006B3C', '#9E8036', '#BFA050',
  '#15803D', '#0369A1', '#7C3AED', '#B45309',
  '#1D4ED8', '#065F46', '#9D174D', '#374151',
];
const getAvatarColor = (rollNo) => {
  const idx = (parseInt(rollNo, 10) - 1) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[Math.max(0, idx)];
};

export default function AdminMealDistributionScreen({ route, navigation }) {
  const attendanceRecordParam = route?.params?.attendanceRecord;

  const [liveRecord, setLiveRecord] = useState(attendanceRecordParam || null);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [resolvedStudents, setResolvedStudents] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('PRESENT');

  const students = useMemo(() => STUDENTS_BY_CLASS['8C'] || [], []);

  const attMap = liveRecord?.attendanceMap || liveRecord?.attendance_map || {};
  const isSubmitted = Object.keys(attMap).some(k => !k.startsWith('_'));

  const presentStudents = useMemo(() =>
    students.filter(s => attMap[s.id] === 'P'), [students, attMap]
  );
  const absentStudents = useMemo(() =>
    students.filter(s => attMap[s.id] === 'A'), [students, attMap]
  );

  const eligibleCount = isSubmitted ? presentStudents.length : (liveRecord?.presentCount ?? 0);

  // Absent students whose meal entitlement is locked by system
  const FLAGGED_STUDENTS = useMemo(() => {
    if (!isSubmitted) return [];
    return absentStudents.map(s => ({
      id: s.id,
      rollNo: s.rollNo,
      name: s.name,
      gender: s.gender,
      reason: 'Marked ABSENT in morning roll-call · Meal entitlement locked by system',
    }));
  }, [absentStudents, isSubmitted]);

  const activeFlagCount = FLAGGED_STUDENTS.filter(s => !resolvedStudents[s.id]).length;

  const toggleStudentResolution = (id) => {
    setResolvedStudents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Sync with Supabase cloud
  const fetchCloudRecords = useCallback(async () => {
    try {
      const records = await fetchAttendanceRecords();
      const c8 = records?.['8C'];
      if (c8) setLiveRecord(c8);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchCloudRecords();
    const unsubRealtime = subscribeToRealtimeAttendance(fetchCloudRecords);
    const pollInterval = setInterval(fetchCloudRecords, 4000);
    return () => {
      if (unsubRealtime) unsubRealtime();
      clearInterval(pollInterval);
    };
  }, [fetchCloudRecords]);

  const filteredStudents = useMemo(() => {
    let base = students;
    if (filterTab === 'PRESENT') base = presentStudents;
    else if (filterTab === 'ABSENT') base = absentStudents;

    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.rollNo.includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  }, [students, presentStudents, absentStudents, searchQuery, filterTab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color={COLORS.white} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.navTitleWrap}>
          <Text style={styles.navTitleText} numberOfLines={1}>Lunch Distribution</Text>
          <Text style={styles.navEyebrow}>CLASS 8C · MDM SCHEME</Text>
        </View>

        <View style={[styles.statusPill, isSubmitted ? styles.statusPillLive : styles.statusPillPending]}>
          <View style={[styles.statusDot, { backgroundColor: isSubmitted ? '#15803D' : '#D97706' }]} />
          <Text style={[styles.statusPillText, { color: isSubmitted ? '#15803D' : '#92400E' }]}>
            {isSubmitted ? 'SYNCED' : 'PENDING'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Summary Card ─────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="restaurant" size={20} color={COLORS.goldDark} />
            </View>
            <View style={styles.summaryInfoCol}>
              <Text style={styles.summaryEyebrow}>ATTENDANCE ALLOCATION</Text>
              <Text style={styles.summaryTitle} numberOfLines={1}>Meal Beneficiaries</Text>
              <Text style={styles.summarySub} numberOfLines={1}>Class 8C · Verified morning roll-call</Text>
            </View>
            <View style={styles.summaryCountBadge}>
              <Text style={styles.summaryCountNum}>{eligibleCount}</Text>
              <Text style={styles.summaryCountLabel}>ELIGIBLE</Text>
            </View>
          </View>

          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatBox}>
              <Text style={[styles.summaryStatNum, { color: COLORS.present }]}>{presentStudents.length}</Text>
              <Text style={styles.summaryStatLabel}>Present</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatBox}>
              <Text style={[styles.summaryStatNum, { color: COLORS.absent }]}>{absentStudents.length}</Text>
              <Text style={styles.summaryStatLabel}>Locked</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatBox}>
              <Text style={styles.summaryStatNum}>{students.length}</Text>
              <Text style={styles.summaryStatLabel}>Enrolled</Text>
            </View>
          </View>

          {isSubmitted ? (
            <View style={styles.verifiedBanner}>
              <Ionicons name="shield-checkmark" size={13} color={COLORS.present} />
              <Text style={styles.verifiedText} numberOfLines={1}>
                Entitlement active · Only present students receive lunch
              </Text>
            </View>
          ) : (
            <View style={styles.noDataBanner}>
              <Ionicons name="hourglass-outline" size={13} color={COLORS.goldDark} />
              <Text style={styles.noDataText} numberOfLines={1}>
                Awaiting morning roll-call submission from Class Teacher
              </Text>
            </View>
          )}
        </View>

        {/* ── Discrepancy & Entitlement Audit ─────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>INTEGRITY CHECK</Text>
          <View style={styles.sectionTitleRow}>
            <Ionicons
              name="shield-checkmark"
              size={15}
              color={activeFlagCount > 0 ? '#DC2626' : COLORS.present}
            />
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {activeFlagCount > 0 ? 'Entitlement Lockdown Active' : 'Integrity Check Passed'}
            </Text>
          </View>
        </View>

        <View style={[styles.auditCard, activeFlagCount > 0 ? styles.auditCardWarn : styles.auditCardClean]}>
          <View style={styles.auditTop}>
            <Ionicons
              name={activeFlagCount > 0 ? 'alert-circle' : 'checkmark-done-circle'}
              size={20}
              color={activeFlagCount > 0 ? '#DC2626' : COLORS.present}
            />
            <View style={styles.auditInfoCol}>
              <Text style={styles.auditTitle} numberOfLines={1}>
                {activeFlagCount > 0
                  ? `${activeFlagCount} absent student${activeFlagCount > 1 ? 's' : ''} locked`
                  : 'Zero Discrepancies · Verified'}
              </Text>
              <Text style={styles.auditSub} numberOfLines={2}>
                {activeFlagCount > 0
                  ? 'Meal entitlement automatically locked for absent students to prevent leakages.'
                  : 'Every meal plate matches verified morning roll-call attendance.'}
              </Text>
            </View>
          </View>

          {activeFlagCount > 0 && (
            <TouchableOpacity
              style={styles.inspectBtn}
              onPress={() => setShowDiscrepancyModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="search-outline" size={13} color={COLORS.white} />
              <Text style={styles.inspectBtnText}>
                Review {activeFlagCount} Locked Student{activeFlagCount > 1 ? 's' : ''}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Today's Lunch List ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>ROSTER</Text>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="people" size={15} color={COLORS.primaryDark} />
            <Text style={styles.sectionTitle} numberOfLines={1}>Students Having Lunch Today</Text>
          </View>
        </View>

        {/* Search & Tabs */}
        <View style={styles.filterCard}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={14} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, roll no, or ID..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={14} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.tabsRow}>
            {[
              { id: 'PRESENT', label: `Eligible (${presentStudents.length})` },
              { id: 'ABSENT',  label: `Locked (${absentStudents.length})` },
              { id: 'ALL',     label: `All (${students.length})` },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabPill, filterTab === tab.id && styles.tabPillActive]}
                onPress={() => setFilterTab(tab.id)}
              >
                <Text style={[styles.tabText, filterTab === tab.id && styles.tabTextActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Students List */}
        <View style={styles.studentsList}>
          {filteredStudents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={32} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>
                {filterTab === 'ABSENT' ? 'No absent students today' : 'No students found'}
              </Text>
            </View>
          ) : (
            filteredStudents.map((st) => {
              const isAbsent = attMap[st.id] === 'A';
              const isPresent = attMap[st.id] === 'P';

              return (
                <View
                  key={st.id}
                  style={[
                    styles.studentRow,
                    isAbsent && styles.studentRowAbsent,
                    isPresent && styles.studentRowPresent,
                  ]}
                >
                  <View style={[styles.avatar, { backgroundColor: getAvatarColor(st.rollNo) }]}>
                    <Text style={styles.avatarText}>{getInitials(st.name)}</Text>
                  </View>

                  <View style={styles.infoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.studentName} numberOfLines={1}>{st.name}</Text>
                      <View style={styles.rollTag}>
                        <Text style={styles.rollTagText}>#{st.rollNo}</Text>
                      </View>
                    </View>
                    <Text style={styles.idText} numberOfLines={1}>
                      {st.id} · {st.gender === 'M' ? 'Male' : 'Female'}
                    </Text>
                  </View>

                  {isPresent ? (
                    <View style={[styles.statusBadge, styles.badgeGreen]}>
                      <Ionicons name="checkmark-circle" size={11} color="#15803D" />
                      <Text style={[styles.statusText, { color: '#15803D' }]}>Eligible</Text>
                    </View>
                  ) : isAbsent ? (
                    <View style={[styles.statusBadge, styles.badgeRed]}>
                      <Ionicons name="close-circle" size={11} color="#DC2626" />
                      <Text style={[styles.statusText, { color: '#DC2626' }]}>Locked</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, styles.badgeGrey]}>
                      <Ionicons name="remove-circle-outline" size={11} color={COLORS.textMedium} />
                      <Text style={[styles.statusText, { color: COLORS.textMedium }]}>Pending</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 70 }} />
      </ScrollView>

      {/* Discrepancy Modal */}
      <Modal
        visible={showDiscrepancyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDiscrepancyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.modalEyebrow}>AUDIT REVIEW</Text>
                <Text style={styles.modalTitle} numberOfLines={1}>Locked Students</Text>
                <Text style={styles.modalSub} numberOfLines={1}>Excluded from lunch based on roll-call</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setShowDiscrepancyModal(false)}
              >
                <Ionicons name="close" size={18} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {FLAGGED_STUDENTS.map((st) => {
                const isResolved = !!resolvedStudents[st.id];
                return (
                  <View key={st.id} style={[styles.flaggedCard, isResolved && styles.flaggedResolved]}>
                    <View style={styles.flaggedTop}>
                      <View style={[styles.flaggedAvatar, isResolved && styles.flaggedAvatarResolved]}>
                        <Text style={[styles.flaggedAvatarText, isResolved && { color: '#15803D' }]}>{st.rollNo}</Text>
                      </View>
                      <View style={{ flex: 1, marginRight: 6 }}>
                        <Text style={styles.flaggedName} numberOfLines={1}>{st.name}</Text>
                        <Text style={styles.flaggedRoll} numberOfLines={1}>Roll {st.rollNo} · {st.id}</Text>
                      </View>
                      <View style={isResolved ? styles.badgeResolved : styles.badgeUnresolved}>
                        <Text style={isResolved ? styles.textResolved : styles.textUnresolved}>
                          {isResolved ? 'Overridden' : 'Locked'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.flaggedReason}>{st.reason}</Text>
                    <TouchableOpacity
                      style={[styles.resolveBtn, isResolved && styles.resolveBtnUndo]}
                      onPress={() => toggleStudentResolution(st.id)}
                    >
                      <Ionicons
                        name={isResolved ? 'arrow-undo' : 'checkmark-circle-outline'}
                        size={12}
                        color={isResolved ? COLORS.textDark : COLORS.white}
                      />
                      <Text style={[styles.resolveBtnText, isResolved && { color: COLORS.textDark }]}>
                        {isResolved ? 'Re-lock Meal Entitlement' : 'Override / Mark Present'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowDiscrepancyModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close Audit Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primaryDark },

  // Nav Bar
  navBar: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SIZES.paddingMd,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 4,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  navTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  navTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  navEyebrow: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.goldLight,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillLive: { backgroundColor: '#DCFCE7' },
  statusPillPending: { backgroundColor: '#FEF3C7' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusPillText: { fontSize: 9.5, fontWeight: '800' },
  content: {
    padding: SIZES.paddingMd,
    paddingBottom: 70,
    backgroundColor: COLORS.background,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    padding: 12,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  summaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.goldPale,
    borderWidth: 1,
    borderColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfoCol: {
    flex: 1,
    marginRight: 6,
  },
  summaryEyebrow: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 0.6,
  },
  summaryTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  summarySub: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMedium,
    marginTop: 1,
  },
  summaryCountBadge: {
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C2DEC9',
    minWidth: 54,
  },
  summaryCountNum: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  summaryCountLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.primaryLight,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  summaryStatBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStatNum: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  summaryStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMedium,
    marginTop: 1,
  },
  summaryStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.borderLight,
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  verifiedText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  noDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noDataText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },

  // Section Headers
  sectionHeader: { marginBottom: 8, marginTop: 4 },
  sectionEyebrow: { fontSize: 9, fontWeight: '800', color: COLORS.goldDark, letterSpacing: 0.8, marginBottom: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark },

  // Audit Card
  auditCard: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12, ...SHADOWS.sm },
  auditCardWarn: { borderColor: '#FCA5A5', backgroundColor: '#FEF8F8' },
  auditCardClean: { borderColor: '#86EFAC', backgroundColor: '#F7FCF9' },
  auditTop: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  auditInfoCol: { flex: 1 },
  auditTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textDark },
  auditSub: { fontSize: 11, color: COLORS.textMedium, marginTop: 2, lineHeight: 15 },
  inspectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#DC2626', paddingVertical: 8, borderRadius: 6, marginTop: 10 },
  inspectBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.white },

  // Filter Card
  filterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 34,
    gap: 6,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 12, color: COLORS.textDark, padding: 0 },
  tabsRow: { flexDirection: 'row', gap: 6 },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.creamCard,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
  },
  tabPillActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark },
  tabText: { fontSize: 10.5, fontWeight: '700', color: COLORS.textMedium },
  tabTextActive: { color: COLORS.white },

  // Students List
  studentsList: { gap: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyStateText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 10,
    gap: 8,
    ...SHADOWS.sm,
  },
  studentRowPresent: { borderColor: '#86EFAC', backgroundColor: '#FAFDFB' },
  studentRowAbsent: { borderColor: '#FCA5A5', backgroundColor: '#FEF8F8' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800', color: COLORS.white },
  infoCol: { flex: 1, marginRight: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  studentName: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, flexShrink: 1 },
  rollTag: { backgroundColor: COLORS.primaryPale, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#C2DEC9' },
  rollTagText: { fontSize: 9.5, fontWeight: '800', color: COLORS.primaryLight },
  idText: { fontSize: 10, color: COLORS.textLight, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeGreen: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  badgeRed: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  badgeGrey: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  statusText: { fontSize: 10, fontWeight: '700' },

  // Discrepancy Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    maxHeight: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 10,
  },
  modalEyebrow: { fontSize: 8.5, fontWeight: '800', color: COLORS.goldDark, letterSpacing: 0.8, marginBottom: 1 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  modalSub: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  modalCloseIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.creamCard, alignItems: 'center', justifyContent: 'center' },
  flaggedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  flaggedResolved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  flaggedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  flaggedAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  flaggedAvatarResolved: { backgroundColor: '#DCFCE7' },
  flaggedAvatarText: { fontSize: 11, fontWeight: '800', color: '#DC2626' },
  flaggedName: { fontSize: 12.5, fontWeight: '700', color: COLORS.textDark },
  flaggedRoll: { fontSize: 9.5, color: COLORS.textMedium },
  badgeUnresolved: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textUnresolved: { fontSize: 9, fontWeight: '800', color: '#DC2626' },
  badgeResolved: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textResolved: { fontSize: 9, fontWeight: '800', color: '#15803D' },
  flaggedReason: { fontSize: 11, color: '#7F1D1D', marginBottom: 6, lineHeight: 15 },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  resolveBtnUndo: { backgroundColor: '#E2E8F0' },
  resolveBtnText: { fontSize: 9.5, fontWeight: '700', color: COLORS.white },
  modalCloseBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseBtnText: { fontSize: 12.5, fontWeight: '800', color: COLORS.white },
});
