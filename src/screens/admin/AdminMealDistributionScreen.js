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
import LiveCameraFeed from '../../components/LiveCameraFeed';

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
  const targetMealsParam = route?.params?.targetMeals;
  const attendanceRecordParam = route?.params?.attendanceRecord;

  const [liveRecord, setLiveRecord] = useState(attendanceRecordParam || null);
  const [mealsServed, setMealsServed] = useState(route?.params?.mealsServed || 0);
  const [servedRolls, setServedRolls] = useState([]);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [resolvedStudents, setResolvedStudents] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');
  const [cameraOnline, setCameraOnline] = useState(false);
  const [lastCamSync, setLastCamSync] = useState(null);

  const students = useMemo(() => STUDENTS_BY_CLASS['8C'] || [], []);
  const targetMeals = liveRecord?.presentCount ?? targetMealsParam ?? 0;

  const attMap = liveRecord?.attendanceMap || liveRecord?.attendance_map || {};
  const isSubmitted = Object.keys(attMap).some(k => !k.startsWith('_'));

  // Discrepancy list: dynamically populated from all students marked 'A' by teacher
  const FLAGGED_STUDENTS = useMemo(() => {
    if (!isSubmitted) return [];
    return students
      .filter((s) => attMap[s.id] === 'A')
      .map((s) => ({
        id: s.id,
        rollNo: s.rollNo,
        name: s.name,
        gender: s.gender,
        reason: s.rollNo === '18'
          ? 'Student marked ABSENT in classroom roll-call, but attempted meal claim'
          : 'Student marked ABSENT in classroom roll-call · Entitlement locked',
        confidence: '98% Variance Alert',
      }));
  }, [students, attMap, isSubmitted]);

  const activeFlagCount = FLAGGED_STUDENTS.filter((s) => !resolvedStudents[s.id]).length;

  const toggleStudentResolution = (id) => {
    setResolvedStudents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleIncrementMeal = () => {
    if (mealsServed < targetMeals) setMealsServed(prev => prev + 1);
  };

  const handleDecrementMeal = () => {
    if (mealsServed > 0) setMealsServed(prev => prev - 1);
  };

  // Sync with Supabase cloud
  const fetchCloudRecords = useCallback(async () => {
    try {
      const records = await fetchAttendanceRecords();
      const c8 = records?.['8C'];
      if (c8) {
        setLiveRecord(c8);
        const curMap = c8.attendanceMap || c8.attendance_map || {};
        if (Array.isArray(curMap._served_rolls)) {
          setServedRolls(Array.from(new Set(curMap._served_rolls)));
          setMealsServed(curMap._served_rolls.length);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchCloudRecords();
    const unsubRealtime = subscribeToRealtimeAttendance(fetchCloudRecords);

    const telemetryInterval = setInterval(async () => {
      const hosts = ['192.168.1.6:5050', 'localhost:5050'];
      for (const h of hosts) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const res = await fetch(`http://${h}/status`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            setCameraOnline(true);
            setLastCamSync(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
            if (data.served_rolls?.length > 0) {
              setServedRolls(prev => Array.from(new Set([...prev, ...data.served_rolls])));
            }
            if (typeof data.total_served === 'number' && data.total_served > 0) {
              setMealsServed(data.total_served);
            }
            break;
          }
        } catch (e) {
          setCameraOnline(false);
        }
      }
    }, 1500);

    return () => {
      if (unsubRealtime) unsubRealtime();
      clearInterval(telemetryInterval);
    };
  }, [fetchCloudRecords]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const isServed = servedRolls.includes(s.rollNo);
      const isAbsent = attMap[s.id] === 'A';
      const isFlagged = isAbsent;

      if (filterTab === 'SERVED' && !isServed) return false;
      if (filterTab === 'WAITING' && (isServed || isAbsent)) return false;
      if (filterTab === 'FLAGGED' && !isFlagged) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return s.name.toLowerCase().includes(q) || s.rollNo.includes(q) || s.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [students, searchQuery, filterTab, servedRolls, attMap]);

  const servingPercent = Math.min(100, (mealsServed / (targetMeals || 1)) * 100);
  const remaining = Math.max(0, targetMeals - mealsServed);

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
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          <Text style={styles.backBtnText}>Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.navTitleWrap}>
          <Text style={styles.navEyebrow}>DINING HALL TELEMETRY</Text>
          <Text style={styles.navTitleText}>Meal Distribution</Text>
        </View>

        <View style={[styles.statusPill, cameraOnline ? styles.statusPillLive : styles.statusPillCloud]}>
          <View style={[styles.statusDot, { backgroundColor: cameraOnline ? '#15803D' : '#D97706' }]} />
          <Text style={[styles.statusPillText, { color: cameraOnline ? '#15803D' : '#92400E' }]}>
            {cameraOnline ? 'LIVE' : 'CLOUD'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Section 1: Serving Operations ─────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>SERVING OPERATIONS</Text>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="restaurant" size={17} color={COLORS.goldDark} />
            <Text style={styles.sectionTitle}>Lunch Serving Progress</Text>
          </View>
          <Text style={styles.sectionSub}>Supervisor: Meena Devi · Dining Counter 1</Text>
        </View>

        <View style={styles.commandCard}>
          <View style={styles.commandTopRow}>
            <View style={styles.mealCountBlock}>
              <Text style={styles.mealCountNum}>{mealsServed}</Text>
              <Text style={styles.mealCountDenom}>/ {targetMeals}</Text>
              <Text style={styles.mealCountLabel}>MEALS SERVED</Text>
            </View>
            <View style={styles.mealStatsCol}>
              <View style={styles.mealStatRow}>
                <Ionicons name="hourglass-outline" size={13} color={COLORS.textMedium} />
                <Text style={styles.mealStatText}>{remaining} plates remaining</Text>
              </View>
              <View style={styles.mealStatRow}>
                <Ionicons name="people-outline" size={13} color={COLORS.textMedium} />
                <Text style={styles.mealStatText}>{targetMeals} eligible beneficiaries</Text>
              </View>
              {cameraOnline && lastCamSync && (
                <View style={styles.mealStatRow}>
                  <Ionicons name="camera-outline" size={13} color={COLORS.present} />
                  <Text style={[styles.mealStatText, { color: COLORS.present }]}>
                    CAM-01 synced {lastCamSync}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${servingPercent}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressPct}>{Math.round(servingPercent)}% complete</Text>
            <Text style={styles.progressRemain}>{remaining} left</Text>
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Manual Override</Text>
            <View style={styles.stepperGroup}>
              <TouchableOpacity style={styles.stepperBtn} onPress={handleDecrementMeal} activeOpacity={0.7}>
                <Ionicons name="remove" size={18} color={COLORS.textDark} />
              </TouchableOpacity>
              <Text style={styles.stepperVal}>{mealsServed}</Text>
              <TouchableOpacity style={[styles.stepperBtn, styles.stepperBtnPrimary]} onPress={handleIncrementMeal} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Section 2: Camera Feed ─────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>AI VISION TERMINAL</Text>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="videocam" size={17} color={COLORS.primaryDark} />
            <Text style={styles.sectionTitle}>Dining Hall CAM-01 Feed</Text>
          </View>
          <Text style={styles.sectionSub}>Laptop Webcam · QR Scanner · Real-time</Text>
        </View>

        <LiveCameraFeed
          cameraHost="192.168.1.6:5050"
          title="Dining Hall AI Vision Terminal"
          subtitle="Unit CAM-01 · Laptop Webcam & QR Scanner"
          detectedCount={targetMeals}
          showDiscrepancy={activeFlagCount > 0}
        />

        {/* ── Section 3: Discrepancy Audit ─────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>ENTITLEMENT AUDIT</Text>
          <View style={styles.sectionTitleRow}>
            <Ionicons
              name="shield-checkmark"
              size={17}
              color={activeFlagCount > 0 ? '#DC2626' : COLORS.present}
            />
            <Text style={styles.sectionTitle}>
              {activeFlagCount > 0 ? 'Attendance vs. Meal Variance' : 'Integrity Check'}
            </Text>
          </View>
        </View>

        <View style={[styles.auditCard, activeFlagCount > 0 ? styles.auditCardWarn : styles.auditCardClean]}>
          <View style={styles.auditTop}>
            <Ionicons
              name={activeFlagCount > 0 ? 'alert-circle' : 'checkmark-done-circle'}
              size={22}
              color={activeFlagCount > 0 ? '#DC2626' : COLORS.present}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.auditTitle}>
                {activeFlagCount > 0
                  ? `${activeFlagCount} student${activeFlagCount > 1 ? 's' : ''} flagged for variance`
                  : 'Zero Discrepancies · Complete Integrity'}
              </Text>
              <Text style={styles.auditSub}>
                {activeFlagCount > 0
                  ? 'Marked ABSENT in roll-call — meal entitlement locked by system'
                  : 'Every meal plate matches verified morning attendance perfectly.'}
              </Text>
            </View>
          </View>

          {activeFlagCount > 0 && (
            <TouchableOpacity
              style={styles.inspectBtn}
              onPress={() => setShowDiscrepancyModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="search-outline" size={14} color={COLORS.white} />
              <Text style={styles.inspectBtnText}>
                Inspect {activeFlagCount} Flagged Beneficiar{activeFlagCount > 1 ? 'ies' : 'y'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Section 4: Student Roster ──────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>BENEFICIARY VERIFICATION</Text>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="list" size={17} color={COLORS.primaryDark} />
            <Text style={styles.sectionTitle}>Meal Verification Feed</Text>
          </View>
          <Text style={styles.sectionSub}>Real-time authentication records from CAM-01</Text>
        </View>

        {/* Search & Tabs */}
        <View style={styles.filterCard}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={15} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search student by name, roll no, or ID..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.tabsRow}>
            {[
              { id: 'ALL', label: `All (${students.length})` },
              { id: 'SERVED', label: `Served (${servedRolls.length})` },
              { id: 'WAITING', label: `Waiting (${Math.max(0, targetMeals - servedRolls.length)})` },
              { id: 'FLAGGED', label: `Flagged (${activeFlagCount})` },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabPill, filterTab === tab.id && styles.tabPillActive]}
                onPress={() => setFilterTab(tab.id)}
              >
                <Text style={[styles.tabText, filterTab === tab.id && styles.tabTextActive]}>
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
              <Ionicons name="search" size={28} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>No students match this filter</Text>
            </View>
          ) : (
            filteredStudents.map((st) => {
              const isServed = servedRolls.includes(st.rollNo);
              const isAbsent = attMap[st.id] === 'A';

              return (
                <View
                  key={st.id}
                  style={[
                    styles.studentRow,
                    isAbsent && styles.studentRowFlagged,
                    isServed && !isAbsent && styles.studentRowServed,
                  ]}
                >
                  <View style={[styles.avatar, { backgroundColor: getAvatarColor(st.rollNo) }]}>
                    <Text style={styles.avatarText}>{getInitials(st.name)}</Text>
                  </View>

                  <View style={styles.infoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.studentName}>{st.name}</Text>
                      <View style={styles.rollTag}>
                        <Text style={styles.rollTagText}>Roll {st.rollNo}</Text>
                      </View>
                    </View>
                    <Text style={styles.idText}>
                      ID: {st.id} · Class 8C · {st.gender === 'M' ? 'Male' : 'Female'}
                    </Text>
                  </View>

                  {isAbsent ? (
                    <View style={[styles.statusBadge, styles.badgeRed]}>
                      <Ionicons name="alert-circle" size={11} color="#DC2626" />
                      <Text style={[styles.statusText, { color: '#DC2626' }]}>Flagged</Text>
                    </View>
                  ) : isServed ? (
                    <View style={[styles.statusBadge, styles.badgeGreen]}>
                      <Ionicons name="checkmark-circle" size={11} color="#15803D" />
                      <Text style={[styles.statusText, { color: '#15803D' }]}>Served</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, styles.badgeGrey]}>
                      <Ionicons name="time-outline" size={11} color={COLORS.textMedium} />
                      <Text style={[styles.statusText, { color: COLORS.textMedium }]}>In Queue</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 32 }} />
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
              <View>
                <Text style={styles.modalEyebrow}>ENTITLEMENT AUDIT REPORT</Text>
                <Text style={styles.modalTitle}>Flagged Beneficiaries</Text>
                <Text style={styles.modalSub}>Discrepancies detected at CAM-01 QR counter</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setShowDiscrepancyModal(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {FLAGGED_STUDENTS.map((st) => {
                const isResolved = !!resolvedStudents[st.id];
                return (
                  <View key={st.id} style={[styles.flaggedCard, isResolved && styles.flaggedResolved]}>
                    <View style={styles.flaggedTop}>
                      <View style={[styles.flaggedAvatar, isResolved && styles.flaggedAvatarResolved]}>
                        <Text style={[styles.flaggedAvatarText, isResolved && { color: '#15803D' }]}>{st.rollNo}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.flaggedName}>{st.name}</Text>
                        <Text style={styles.flaggedRoll}>Roll {st.rollNo} · ID: {st.id}</Text>
                      </View>
                      <View style={isResolved ? styles.badgeResolved : styles.badgeUnresolved}>
                        <Text style={isResolved ? styles.textResolved : styles.textUnresolved}>
                          {isResolved ? 'Resolved' : 'Variance'}
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
                        size={13}
                        color={isResolved ? COLORS.textDark : COLORS.white}
                      />
                      <Text style={[styles.resolveBtnText, isResolved && { color: COLORS.textDark }]}>
                        {isResolved ? 'Undo Resolution' : 'Mark Excused / Verified'}
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  navTitleWrap: { alignItems: 'center' },
  navEyebrow: { fontSize: 8.5, fontWeight: '800', color: COLORS.goldLight, letterSpacing: 0.8, marginBottom: 1 },
  navTitleText: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusPillLive: { backgroundColor: '#DCFCE7' },
  statusPillCloud: { backgroundColor: '#FEF3C7' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  content: { padding: SIZES.paddingMd, backgroundColor: COLORS.background },

  // Section Headers
  sectionHeader: { marginBottom: 10, marginTop: 8 },
  sectionEyebrow: { fontSize: 9.5, fontWeight: '800', color: COLORS.goldDark, letterSpacing: 0.8, marginBottom: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textDark },
  sectionSub: { fontSize: 11.5, fontWeight: '500', color: COLORS.textMedium, marginTop: 2 },
  // Command Card
  commandCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 18,
    ...SHADOWS.sm,
  },
  commandTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  mealCountBlock: { alignItems: 'flex-start' },
  mealCountNum: { fontSize: 40, fontWeight: '900', color: COLORS.primaryDark, lineHeight: 44, letterSpacing: -1 },
  mealCountDenom: { fontSize: 16, fontWeight: '700', color: COLORS.textMedium, marginTop: -4 },
  mealCountLabel: { fontSize: 9.5, fontWeight: '800', color: COLORS.goldDark, letterSpacing: 0.8, marginTop: 4 },
  mealStatsCol: { flex: 1, gap: 5, paddingTop: 4 },
  mealStatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealStatText: { fontSize: 12, fontWeight: '600', color: COLORS.textMedium },
  progressTrack: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  progressPct: { fontSize: 11, fontWeight: '700', color: COLORS.present },
  progressRemain: { fontSize: 11, fontWeight: '600', color: COLORS.textLight },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.divider },
  stepperLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMedium },
  stepperGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  stepperBtnPrimary: { backgroundColor: COLORS.primaryDark },
  stepperVal: { fontSize: 18, fontWeight: '900', color: COLORS.primaryDark, minWidth: 28, textAlign: 'center' },
  // Audit Card
  auditCard: { backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 18, ...SHADOWS.sm },
  auditCardWarn: { borderColor: '#FCA5A5', backgroundColor: '#FEF8F8' },
  auditCardClean: { borderColor: '#86EFAC', backgroundColor: '#F7FCF9' },
  auditTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  auditTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textDark },
  auditSub: { fontSize: 11.5, color: COLORS.textMedium, marginTop: 2, lineHeight: 16 },
  inspectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#DC2626', paddingVertical: 9, borderRadius: 8, marginTop: 12 },
  inspectBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.white },
  filterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 12, color: COLORS.textDark },
  tabsRow: { flexDirection: 'row', gap: 6 },
  tabPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.creamCard,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
  },
  tabPillActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark },
  tabText: { fontSize: 10, fontWeight: '700', color: COLORS.textMedium },
  tabTextActive: { color: COLORS.white },
  studentsList: { gap: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyStateText: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  studentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderLight, padding: 10, gap: 10, ...SHADOWS.sm },
  studentRowServed: { borderColor: '#86EFAC', backgroundColor: '#F7FCF9' },
  studentRowFlagged: { borderColor: '#FCA5A5', backgroundColor: '#FEF8F8' },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  infoCol: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  studentName: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  rollTag: { backgroundColor: COLORS.primaryPale, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#C2DEC9' },
  rollTagText: { fontSize: 10, fontWeight: '700', color: COLORS.primaryLight },
  idText: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeGreen: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  badgeRed: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  badgeGrey: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  statusText: { fontSize: 10, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    maxHeight: 520,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: 12 },
  modalEyebrow: { fontSize: 9, fontWeight: '800', color: COLORS.goldDark, letterSpacing: 0.8, marginBottom: 2 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textDark },
  modalSub: { fontSize: 11.5, color: COLORS.textLight, marginTop: 2 },
  modalCloseIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.creamCard, alignItems: 'center', justifyContent: 'center' },
  flaggedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  flaggedResolved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  flaggedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  flaggedAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  flaggedAvatarResolved: { backgroundColor: '#DCFCE7' },
  flaggedAvatarText: { fontSize: 12, fontWeight: '800', color: '#DC2626' },
  flaggedName: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  flaggedRoll: { fontSize: 10, color: COLORS.textMedium },
  badgeUnresolved: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textUnresolved: { fontSize: 10, fontWeight: '800', color: '#DC2626' },
  badgeResolved: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textResolved: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  flaggedReason: { fontSize: 11.5, color: '#7F1D1D', marginBottom: 8, lineHeight: 16 },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  resolveBtnUndo: { backgroundColor: '#E2E8F0' },
  resolveBtnText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  modalCloseBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.white },
});
