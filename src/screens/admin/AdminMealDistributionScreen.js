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
  const [filterTab, setFilterTab] = useState('ALL');

  // Real-time camera telemetry state
  const [localServedRolls, setLocalServedRolls] = useState([]);
  const [lastScannedStudent, setLastScannedStudent] = useState(null);
  const [telemetryOnline, setTelemetryOnline] = useState(false);

  const students = useMemo(() => STUDENTS_BY_CLASS['8C'] || [], []);

  const attMap = liveRecord?.attendanceMap || liveRecord?.attendance_map || {};
  const isSubmitted = Object.keys(attMap).some(k => !k.startsWith('_'));

  const presentStudents = useMemo(() =>
    students.filter(s => attMap[s.id] === 'P'), [students, attMap]
  );
  const absentStudents = useMemo(() =>
    students.filter(s => attMap[s.id] === 'A'), [students, attMap]
  );

  // Set of served roll numbers merging Supabase cloud + local scanner
  const servedRolls = useMemo(() => {
    const set = new Set();
    const cloudRolls = attMap?._served_rolls || [];
    cloudRolls.forEach(r => {
      set.add(String(r).trim());
      set.add(String(r).padStart(2, '0'));
      const parsed = parseInt(r, 10);
      if (!isNaN(parsed)) set.add(String(parsed));
    });
    localServedRolls.forEach(r => {
      set.add(String(r).trim());
      set.add(String(r).padStart(2, '0'));
      const parsed = parseInt(r, 10);
      if (!isNaN(parsed)) set.add(String(parsed));
    });
    return set;
  }, [attMap, localServedRolls]);

  // Determine meal status for student: 'SERVED' | 'ELIGIBLE' | 'LOCKED' | 'PENDING'
  const getMealStatus = useCallback((student) => {
    const isAbsent = attMap[student.id] === 'A';
    if (isAbsent) return 'LOCKED';

    const isPresent = attMap[student.id] === 'P';
    const isServed = servedRolls.has(student.rollNo) ||
                     servedRolls.has(String(parseInt(student.rollNo, 10))) ||
                     servedRolls.has(student.id);

    if (isServed) return 'SERVED';
    if (isPresent) return 'ELIGIBLE';
    return 'PENDING';
  }, [attMap, servedRolls]);

  const mealsTakenCount = useMemo(() => {
    return presentStudents.filter(s => getMealStatus(s) === 'SERVED').length;
  }, [presentStudents, getMealStatus]);

  const pendingEligibleCount = Math.max(0, presentStudents.length - mealsTakenCount);

  // Absent students whose meal entitlement is locked
  const FLAGGED_STUDENTS = useMemo(() => {
    if (!isSubmitted) return [];
    return absentStudents.map(s => ({
      id: s.id,
      rollNo: s.rollNo,
      name: s.name,
      gender: s.gender,
      reason: 'Marked ABSENT in morning roll-call · Entitlement locked',
    }));
  }, [absentStudents, isSubmitted]);

  const activeFlagCount = FLAGGED_STUDENTS.filter(s => !resolvedStudents[s.id]).length;

  const toggleStudentResolution = (id) => {
    setResolvedStudents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Real-time sync with Supabase cloud
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
    const pollInterval = setInterval(fetchCloudRecords, 2500);

    // Fast local telemetry polling from camera scanner (port 5050)
    const telemetryInterval = setInterval(async () => {
      const hosts = ['192.168.1.6:5050', 'localhost:5050'];
      for (const h of hosts) {
        try {
          const res = await fetch(`http://${h}/status`, { method: 'GET' });
          if (res.ok) {
            const data = await res.json();
            setTelemetryOnline(true);
            if (Array.isArray(data.served_rolls)) {
              setLocalServedRolls(data.served_rolls);
            }
            if (data.last_scanned) {
              setLastScannedStudent(data.last_scanned);
            }
            break;
          }
        } catch (e) {
          setTelemetryOnline(false);
        }
      }
    }, 2000);

    return () => {
      if (unsubRealtime) unsubRealtime();
      clearInterval(pollInterval);
      clearInterval(telemetryInterval);
    };
  }, [fetchCloudRecords]);

  const filteredStudents = useMemo(() => {
    let base = students;
    if (filterTab === 'SERVED') {
      base = students.filter(s => getMealStatus(s) === 'SERVED');
    } else if (filterTab === 'ELIGIBLE') {
      base = students.filter(s => getMealStatus(s) === 'ELIGIBLE');
    } else if (filterTab === 'LOCKED') {
      base = students.filter(s => getMealStatus(s) === 'LOCKED');
    }

    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.rollNo.includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  }, [students, filterTab, searchQuery, getMealStatus]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Nav Header */}
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
          <Text style={styles.navTitleText}>Meal Distribution</Text>
          <Text style={styles.navSubText}>Class 8C · Mid-Day Meals</Text>
        </View>

        <View style={styles.udiseTag}>
          <Text style={styles.udiseTagText}>
            {telemetryOnline ? 'SCANNER LIVE' : (isSubmitted ? 'VERIFIED' : 'PENDING')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Meal Overview Banner */}
        <View style={styles.mealBanner}>
          <View style={styles.bannerHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.bannerClassName} numberOfLines={1}>Today's Lunch Roster</Text>
              <Text style={styles.bannerSchool} numberOfLines={1}>
                {mealsTakenCount > 0
                  ? `${mealsTakenCount} of ${presentStudents.length} meals served in real time`
                  : 'QR biometric authentication active'}
              </Text>
            </View>
            <View style={[styles.statusBadge, mealsTakenCount > 0 && styles.statusBadgeActive]}>
              <View style={[styles.liveDot, { backgroundColor: mealsTakenCount > 0 ? '#15803D' : '#0369A1' }]} />
              <Text style={[styles.statusBadgeText, { color: mealsTakenCount > 0 ? '#15803D' : '#0369A1' }]}>
                {mealsTakenCount > 0 ? `${mealsTakenCount} SERVED` : 'READY'}
              </Text>
            </View>
          </View>

          {/* 4-Metric Strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{students.length}</Text>
              <Text style={styles.statLabel}>ENROLLED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: '#15803D' }]}>
                {mealsTakenCount}
              </Text>
              <Text style={[styles.statLabel, { color: '#15803D' }]}>MEAL TAKEN</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: '#D97706' }]}>
                {pendingEligibleCount}
              </Text>
              <Text style={styles.statLabel}>PENDING</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: COLORS.absent }]}>
                {absentStudents.length}
              </Text>
              <Text style={styles.statLabel}>LOCKED</Text>
            </View>
          </View>

          {/* Live Scanner Activity / Integrity Banner */}
          {lastScannedStudent ? (
            <View style={styles.liveScanBanner}>
              <Ionicons
                name={lastScannedStudent.is_discrepancy ? "alert-circle" : "checkmark-circle"}
                size={14}
                color={lastScannedStudent.is_discrepancy ? "#DC2626" : "#15803D"}
              />
              <Text style={styles.liveScanText} numberOfLines={1}>
                {lastScannedStudent.is_discrepancy
                  ? `Flagged: Roll ${lastScannedStudent.roll} (${lastScannedStudent.name}) is absent!`
                  : `Just Verified: Roll ${lastScannedStudent.roll} (${lastScannedStudent.name}) · Meal Issued`}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.integrityRow}
              onPress={() => activeFlagCount > 0 && setShowDiscrepancyModal(true)}
              activeOpacity={activeFlagCount > 0 ? 0.7 : 1}
            >
              <Ionicons
                name={activeFlagCount > 0 ? "shield-checkmark" : "checkmark-circle"}
                size={14}
                color={activeFlagCount > 0 ? COLORS.goldDark : COLORS.present}
              />
              <Text style={styles.integrityText} numberOfLines={1}>
                {activeFlagCount > 0
                  ? `${activeFlagCount} absent students locked from lunch (Tap to review)`
                  : '100% Attendance Verified · Entitlements locked for absent students'}
              </Text>
              {activeFlagCount > 0 && (
                <Ionicons name="chevron-forward" size={13} color={COLORS.goldDark} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Search and Filters */}
        <View style={styles.controlsCard}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by student name, roll no, or ID..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMedium} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.filterPillsRow}>
            {[
              { key: 'ALL',      label: 'All',        count: students.length },
              { key: 'SERVED',   label: 'Meal Taken', count: mealsTakenCount },
              { key: 'ELIGIBLE', label: 'Eligible',   count: pendingEligibleCount },
              { key: 'LOCKED',   label: 'Locked',     count: absentStudents.length },
            ].map((tab) => {
              const active = filterTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setFilterTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {tab.label} ({tab.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Student Roster Cards */}
        <View style={styles.studentsList}>
          {filteredStudents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={36} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>
                {filterTab === 'SERVED' ? 'No meals verified yet today' : 'No students found'}
              </Text>
            </View>
          ) : (
            filteredStudents.map((st) => {
              const status = getMealStatus(st);
              const isServed = status === 'SERVED';
              const isEligible = status === 'ELIGIBLE';
              const isLocked = status === 'LOCKED';

              return (
                <View
                  key={st.id}
                  style={[
                    styles.studentCard,
                    isServed && styles.studentCardServed,
                    isLocked && styles.studentCardAbsent,
                  ]}
                >
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: isServed ? '#15803D' : getAvatarColor(st.rollNo) }]}>
                    {isServed ? (
                      <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    ) : (
                      <Text style={styles.avatarText}>{getInitials(st.name)}</Text>
                    )}
                  </View>

                  {/* Details */}
                  <View style={styles.infoWrap}>
                    <View style={styles.nameRow}>
                      <Text style={styles.studentName} numberOfLines={1}>{st.name}</Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaItem}>Roll: <Text style={styles.metaVal}>{st.rollNo}</Text></Text>
                      <Text style={styles.metaBullet}>•</Text>
                      <Text style={styles.metaItem}>Gender: <Text style={styles.metaVal}>{st.gender === 'M' ? 'Male' : 'Female'}</Text></Text>
                      <Text style={styles.metaBullet}>•</Text>
                      <Text style={styles.metaItem}>ID: <Text style={styles.metaVal}>{st.id}</Text></Text>
                    </View>
                  </View>

                  {/* Status Pill */}
                  {isServed ? (
                    <View style={[styles.statusPill, styles.pillServed]}>
                      <Ionicons name="checkmark-circle" size={12} color="#15803D" />
                      <Text style={[styles.statusPillText, styles.statusTextServed]}>Meal Taken</Text>
                    </View>
                  ) : isEligible ? (
                    <View style={[styles.statusPill, styles.pillEligible]}>
                      <Ionicons name="restaurant-outline" size={11} color="#0369A1" />
                      <Text style={[styles.statusPillText, styles.statusTextEligible]}>Eligible</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusPill, styles.pillAbsent]}>
                      <Ionicons name="lock-closed" size={11} color="#DC2626" />
                      <Text style={[styles.statusPillText, styles.statusTextAbsent]}>Locked</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 60 }} />
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
                <Text style={styles.modalTitle} numberOfLines={1}>Locked Absent Students</Text>
                <Text style={styles.modalSub} numberOfLines={1}>Excluded from lunch based on roll-call</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setShowDiscrepancyModal(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.textDark} />
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
                        {isResolved ? 'Re-lock Meal Entitlement' : 'Override / Mark Present for Lunch'}
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
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
    gap: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  navTitleWrap: {
    alignItems: 'center',
  },
  navTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  navSubText: {
    fontSize: 11,
    color: COLORS.goldLight,
  },
  udiseTag: {
    backgroundColor: 'rgba(191,160,80,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(191,160,80,0.4)',
  },
  udiseTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.goldLight,
  },
  content: {
    padding: SIZES.paddingMd,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  mealBanner: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  bannerClassName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  bannerSchool: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMedium,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.creamCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
    paddingVertical: 12,
    marginBottom: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMedium,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.divider,
  },
  integrityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  integrityText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
    flex: 1,
  },
  liveScanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  liveScanText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    flex: 1,
  },
  controlsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textDark,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.creamCard,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMedium,
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  studentsList: {
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  studentCardServed: {
    backgroundColor: '#FAFDFB',
    borderColor: '#86EFAC',
  },
  studentCardAbsent: {
    backgroundColor: '#FEF8F8',
    borderColor: '#FCA5A5',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
  infoWrap: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  metaItem: {
    fontSize: 11,
    color: COLORS.textMedium,
  },
  metaVal: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  metaBullet: {
    fontSize: 10,
    color: COLORS.border,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillServed: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusTextServed: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '800',
  },
  pillEligible: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  statusTextEligible: {
    color: '#0369A1',
    fontSize: 10.5,
    fontWeight: '800',
  },
  pillAbsent: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  statusTextAbsent: {
    color: '#DC2626',
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  modalSub: {
    fontSize: 11.5,
    color: COLORS.textLight,
    marginTop: 2,
  },
  modalCloseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.creamCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  flaggedAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flaggedAvatarResolved: {
    backgroundColor: '#DCFCE7',
  },
  flaggedAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  flaggedName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  flaggedRoll: {
    fontSize: 10,
    color: COLORS.textMedium,
  },
  badgeUnresolved: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textUnresolved: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  badgeResolved: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textResolved: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  flaggedReason: {
    fontSize: 11,
    color: '#7F1D1D',
    marginBottom: 8,
    lineHeight: 15,
  },
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
  resolveBtnUndo: {
    backgroundColor: '#E2E8F0',
  },
  resolveBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalCloseBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
});
