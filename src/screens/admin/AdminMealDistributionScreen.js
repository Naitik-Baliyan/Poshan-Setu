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
          <Text style={styles.udiseTagText}>CLASS 8C</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Meal Overview Banner */}
        <View style={styles.mealBanner}>
          <View style={styles.bannerHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.bannerClassName} numberOfLines={1}>Today's Lunch Roster</Text>
              <Text style={styles.bannerSchool} numberOfLines={1}>Auto-calculated from morning attendance</Text>
            </View>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#15803D" />
              <Text style={styles.statusBadgeText}>ATTENDANCE SYNCED</Text>
            </View>
          </View>

          <View style={styles.statsStrip}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{students.length}</Text>
              <Text style={styles.statLabel}>ENROLLED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: COLORS.present }]}>
                {isSubmitted ? presentStudents.length : 0}
              </Text>
              <Text style={styles.statLabel}>LUNCH ELIGIBLE</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: COLORS.absent }]}>
                {isSubmitted ? absentStudents.length : 0}
              </Text>
              <Text style={styles.statLabel}>LOCKED (ABSENT)</Text>
            </View>
          </View>

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
              { key: 'PRESENT', label: 'Eligible', count: isSubmitted ? presentStudents.length : 0 },
              { key: 'ABSENT',  label: 'Locked',   count: isSubmitted ? absentStudents.length : 0 },
              { key: 'ALL',     label: 'All',      count: students.length },
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
              <Ionicons name="people-outline" size={36} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>No students found</Text>
            </View>
          ) : (
            filteredStudents.map((st) => {
              const isPresent = attMap[st.id] === 'P';
              const isAbsent = attMap[st.id] === 'A';

              return (
                <View
                  key={st.id}
                  style={[
                    styles.studentCard,
                    isAbsent && styles.studentCardAbsent,
                  ]}
                >
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: getAvatarColor(st.rollNo) }]}>
                    <Text style={styles.avatarText}>{getInitials(st.name)}</Text>
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
                  <View style={[
                    styles.statusPill,
                    isPresent && styles.pillPresent,
                    isAbsent && styles.pillAbsent,
                    !isPresent && !isAbsent && styles.pillAwaiting,
                  ]}>
                    <View style={[
                      styles.statusDot,
                      {
                        backgroundColor: isPresent ? COLORS.present : (isAbsent ? COLORS.absent : '#D97706'),
                      },
                    ]} />
                    <Text style={[
                      styles.statusPillText,
                      {
                        color: isPresent ? COLORS.present : (isAbsent ? COLORS.absent : '#B45309'),
                      },
                    ]}>
                      {isPresent ? 'Eligible' : (isAbsent ? 'Locked' : 'Pending')}
                    </Text>
                  </View>
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
    fontSize: 10,
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
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
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
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMedium,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 26,
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
    gap: 8,
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
    fontSize: 11,
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
  pillPresent: {
    backgroundColor: '#DCFCE7',
  },
  pillAbsent: {
    backgroundColor: '#FEE2E2',
  },
  pillAwaiting: {
    backgroundColor: '#FEF3C7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
