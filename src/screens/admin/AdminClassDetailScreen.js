import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { SCHOOL_INFO, STUDENTS_BY_CLASS } from '../../data/mockData';
import { fetchAttendanceRecords, subscribeToRealtimeAttendance } from '../../services/supabaseService';

const getInitials = (name) => {
  if (!name) return '--';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (roll) => {
  const colors = {
    '01': '#004D2C', // Emerald
    '02': '#9E8036', // Gold
    '03': '#006B3C', // Leaf Green
    '04': '#15803D', // Green
    '05': '#004D2C', // Emerald
    '06': '#BFA050', // Gold
    '18': '#DC2626', // Red
    '19': '#DC2626',
    '20': '#DC2626',
  };
  return colors[roll] || '#334155';
};

export default function AdminClassDetailScreen({ route, navigation }) {
  const { classInfo, attendanceRecord } = route.params || {
    classInfo: { id: '8C', label: 'Class 8 - Section C', strength: 20 },
    attendanceRecord: null,
  };

  const [liveRecord, setLiveRecord] = useState(attendanceRecord || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'PRESENT' | 'ABSENT'

  const students = useMemo(() => STUDENTS_BY_CLASS[classInfo.id] || [], [classInfo.id]);

  // Real-time synchronization
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const records = await fetchAttendanceRecords();
        if (records && records[classInfo.id]) {
          setLiveRecord(records[classInfo.id]);
        }
      } catch (e) {}
    };
    fetchLatest();
    const unsub = subscribeToRealtimeAttendance(fetchLatest);
    const interval = setInterval(fetchLatest, 3000);
    return () => {
      if (unsub) unsub();
      clearInterval(interval);
    };
  }, [classInfo.id]);

  // Attendance map from teacher record
  const attendanceMap = liveRecord?.attendanceMap || liveRecord?.attendance_map || {};
  const isSubmitted = Object.keys(attendanceMap).some(k => !k.startsWith('_'));

  const getAttendanceStatus = (student) => {
    if (attendanceMap[student.id]) {
      return attendanceMap[student.id] === 'P' ? 'PRESENT' : 'ABSENT';
    }
    return isSubmitted ? 'ABSENT' : 'AWAITING';
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const status = getAttendanceStatus(s);

      if (filterTab === 'PRESENT' && status !== 'PRESENT') return false;
      if (filterTab === 'ABSENT' && status !== 'ABSENT') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchRoll = s.rollNo.toLowerCase().includes(q);
        const matchId = s.id.toLowerCase().includes(q);
        return matchName || matchRoll || matchId;
      }
      return true;
    });
  }, [students, searchQuery, filterTab, attendanceMap]);

  const presentCount = students.filter(s => getAttendanceStatus(s) === 'PRESENT').length;
  const absentCount = students.length - presentCount;

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
          <Text style={styles.navTitleText}>{classInfo.label}</Text>
          <Text style={styles.navSubText}>Classroom Roster</Text>
        </View>

        <View style={styles.udiseTag}>
          <Text style={styles.udiseTagText}>CLASS {classInfo.id}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Class Overview Banner */}
        <View style={styles.classBanner}>
          <View style={styles.bannerHeader}>
            <View>
              <Text style={styles.bannerClassName}>{classInfo.label}</Text>
              <Text style={styles.bannerSchool}>{SCHOOL_INFO.name}</Text>
            </View>
            {isSubmitted ? (
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                <Text style={styles.statusBadgeText}>ATTENDANCE SUBMITTED</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <Ionicons name="time-outline" size={14} color="#B45309" />
                <Text style={[styles.statusBadgeText, { color: '#B45309' }]}>AWAITING ROLL-CALL</Text>
              </View>
            )}
          </View>

          <View style={styles.statsStrip}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{students.length}</Text>
              <Text style={styles.statLabel}>ENROLLED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: isSubmitted ? COLORS.present : COLORS.textSecondary }]}>
                {isSubmitted ? presentCount : 0}
              </Text>
              <Text style={styles.statLabel}>PRESENT</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: isSubmitted ? COLORS.absent : COLORS.textSecondary }]}>
                {isSubmitted ? absentCount : 0}
              </Text>
              <Text style={styles.statLabel}>ABSENT</Text>
            </View>
          </View>

          <View style={styles.teacherNoteRow}>
            <Ionicons name="person-outline" size={13} color={COLORS.textMedium} />
            <Text style={styles.teacherNoteText}>
              Class Teacher: <Text style={{ fontWeight: '700', color: COLORS.textDark }}>{liveRecord?.recordedBy || 'Sunita Sharma'}</Text>
              {isSubmitted ? ' · Submitted via Teacher Portal' : ' · Roll-Call Pending'}
            </Text>
          </View>
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
            {['ALL', 'PRESENT', 'ABSENT'].map((tab) => {
              const active = filterTab === tab;
              const count = tab === 'ALL'
                ? students.length
                : tab === 'PRESENT'
                ? (isSubmitted ? presentCount : 0)
                : (isSubmitted ? absentCount : 0);

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setFilterTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {tab} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Student Roster Cards */}
        <View style={styles.studentsList}>
          {filteredStudents.map((st) => {
            const status = getAttendanceStatus(st);
            const isTeam = ['01', '02', '03', '04', '05', '06'].includes(st.rollNo);

            return (
              <View
                key={st.id}
                style={[
                  styles.studentCard,
                  status === 'ABSENT' && styles.studentCardAbsent,
                ]}
              >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(st.rollNo) }]}>
                  <Text style={styles.avatarText}>{getInitials(st.name)}</Text>
                </View>

                {/* Details */}
                <View style={styles.infoWrap}>
                  <View style={styles.nameRow}>
                    <Text style={styles.studentName}>{st.name}</Text>
                    {isTeam && (
                      <View style={styles.teamTag}>
                        <Text style={styles.teamTagText}>
                          {st.rollNo === '01' ? 'LEADER' : 'TEAM'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaItem}>Roll: <Text style={styles.metaVal}>{st.rollNo}</Text></Text>
                    <Text style={styles.metaBullet}>•</Text>
                    <Text style={styles.metaItem}>Class: <Text style={styles.metaVal}>8C</Text></Text>
                    <Text style={styles.metaBullet}>•</Text>
                    <Text style={styles.metaItem}>ID: <Text style={styles.metaVal}>{st.id}</Text></Text>
                  </View>
                </View>

                {/* Status Pill */}
                <View style={[
                  styles.statusPill,
                  status === 'PRESENT' && styles.pillPresent,
                  status === 'ABSENT' && styles.pillAbsent,
                  status === 'AWAITING' && { backgroundColor: '#FEF3C7' },
                ]}>
                  <View style={[
                    styles.statusDot,
                    {
                      backgroundColor: status === 'PRESENT' ? COLORS.present : (status === 'ABSENT' ? COLORS.absent : '#D97706'),
                    },
                  ]} />
                  <Text style={[
                    styles.statusPillText,
                    {
                      color: status === 'PRESENT' ? COLORS.present : (status === 'ABSENT' ? COLORS.absent : '#B45309'),
                    },
                  ]}>
                    {status === 'PRESENT' ? 'Present' : (status === 'ABSENT' ? 'Absent' : 'Awaiting')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  classBanner: {
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
    fontSize: 10,
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
  teacherNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teacherNoteText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMedium,
  },
  controlsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
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
    fontSize: 13,
    color: COLORS.textDark,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textMedium,
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  studentsList: {
    gap: 8,
    paddingBottom: 24,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 12,
    gap: 12,
    ...SHADOWS.sm,
  },
  studentCardAbsent: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF8F8',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  infoWrap: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  teamTag: {
    backgroundColor: 'rgba(191,160,80,0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  teamTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.goldDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    fontSize: 11.5,
    fontWeight: '500',
    color: COLORS.textMedium,
  },
  metaVal: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  metaBullet: {
    fontSize: 10,
    color: '#94A3B8',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillPresent: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  pillAbsent: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
