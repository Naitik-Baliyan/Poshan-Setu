import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { SCHOOL_INFO, CLASSES_LIST } from '../../data/mockData';
import { fetchAttendanceRecords, subscribeToRealtimeAttendance } from '../../services/supabaseService';

export default function AdminDashboard({ route, navigation }) {
  const admin = route.params?.admin || {
    id: 'ADM01',
    name: 'Dr. Rajesh Verma',
    role: 'School Principal',
  };

  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [mealsServed, setMealsServed] = useState(0);
  const [telemetryOnline, setTelemetryOnline] = useState(false);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const records = await fetchAttendanceRecords();
      setAttendanceRecords(records || {});
      setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Sync meal count from cloud
      const c8 = records?.['8C'];
      const attMap = c8?.attendanceMap || c8?.attendance_map;
      if (attMap?._served_rolls) {
        setMealsServed(attMap._served_rolls.length);
      }
    } catch (err) {
      console.log('Admin fetch error', err);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    const unsubscribeFocus = navigation.addListener('focus', fetchRecords);
    const unsubscribeRealtime = subscribeToRealtimeAttendance(fetchRecords);
    const pollInterval = setInterval(fetchRecords, 3000);

    // Light status check from laptop scanner
    const statusInterval = setInterval(async () => {
      const hosts = ['192.168.1.6:5050', 'localhost:5050'];
      for (const h of hosts) {
        try {
          const res = await fetch(`http://${h}/status`);
          if (res.ok) {
            const data = await res.json();
            setTelemetryOnline(true);
            if (typeof data.total_served === 'number') {
              setMealsServed(data.total_served);
            }
            break;
          }
        } catch (e) {
          setTelemetryOnline(false);
        }
      }
    }, 3000);

    return () => {
      unsubscribeFocus();
      if (unsubscribeRealtime) unsubscribeRealtime();
      clearInterval(pollInterval);
      clearInterval(statusInterval);
    };
  }, [navigation, fetchRecords]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of the Administrator Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => navigation.replace('SelectRole') },
      ]
    );
  };

  // Compute school stats strictly from real-time records
  let totalReportedEnrolled = 0;
  let totalReportedPresent = 0;
  let totalReportedAbsent = 0;
  let hasAnySubmission = false;

  CLASSES_LIST.forEach((cls) => {
    totalReportedEnrolled += cls.strength;
    const rec = attendanceRecords[cls.id];
    const attMap = rec?.attendanceMap || rec?.attendance_map || {};
    const hasMap = Object.keys(attMap).some(k => !k.startsWith('_'));
    if (rec && typeof rec.presentCount === 'number' && hasMap) {
      hasAnySubmission = true;
      totalReportedPresent += rec.presentCount;
      totalReportedAbsent += typeof rec.absentCount === 'number'
        ? rec.absentCount
        : Math.max(0, cls.strength - rec.presentCount);
    }
  });

  const classesSubmitted = CLASSES_LIST.filter((cls) => {
    const r = attendanceRecords[cls.id];
    const attMap = r?.attendanceMap || r?.attendance_map || {};
    return r && typeof r.presentCount === 'number' && Object.keys(attMap).some(k => !k.startsWith('_'));
  }).length;

  const targetMeals = totalReportedPresent;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="shield-checkmark" size={15} color={COLORS.gold} />
            <Text style={styles.appName}>PoshanSetu</Text>
            <View style={styles.auditPill}>
              <Text style={styles.auditPillText}>PRINCIPAL AUDIT</Text>
            </View>
          </View>
          <Text style={styles.schoolSub}>{SCHOOL_INFO.name}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.goldLight} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View style={styles.welcomeRow}>
            <View>
              <Text style={styles.adminName}>{admin.name}</Text>
              <Text style={styles.adminMeta}>School Principal · {SCHOOL_INFO.name}</Text>
            </View>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={11} color={COLORS.goldDark} />
              <Text style={styles.dateText}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* SECTION 1: SCHOOL ATTENDANCE OVERVIEW                     */}
        {/* ========================================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>DAILY HEADCOUNT AUDIT</Text>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="analytics" size={17} color={COLORS.primaryDark} />
              <Text style={styles.sectionTitle}>School Attendance Overview</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchRecords} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={13} color={COLORS.primaryLight} />
            <Text style={styles.refreshText}>{lastRefreshed ? lastRefreshed.split(' ')[0] : 'Live Sync'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.statsStrip}>
            <View style={styles.statCol}>
              <Text style={styles.statNum}>{totalReportedEnrolled}</Text>
              <Text style={styles.statLabel}>ENROLLED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: hasAnySubmission ? COLORS.present : COLORS.textMedium }]}>
                {hasAnySubmission ? totalReportedPresent : '--'}
              </Text>
              <Text style={styles.statLabel}>PRESENT</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: hasAnySubmission ? COLORS.absent : COLORS.textMedium }]}>
                {hasAnySubmission ? totalReportedAbsent : '--'}
              </Text>
              <Text style={styles.statLabel}>ABSENT</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: '#0369A1' }]}>{classesSubmitted}/{CLASSES_LIST.length}</Text>
              <Text style={styles.statLabel}>CLASSES</Text>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* SECTION 2: REGISTERED CLASSROOMS & ROSTER                 */}
        {/* ========================================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>CLASSROOM ROSTERS</Text>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="school" size={17} color={COLORS.primaryDark} />
              <Text style={styles.sectionTitle}>Registered Classes</Text>
            </View>
          </View>
        </View>

        {CLASSES_LIST.map((cls) => {
          const rec = attendanceRecords[cls.id];
          const attMap = rec?.attendanceMap || rec?.attendance_map || {};
          const hasRecord = !!rec && typeof rec.presentCount === 'number' && Object.keys(attMap).some(k => !k.startsWith('_'));
          const presentCnt = hasRecord ? rec.presentCount : 0;
          const absentCnt = hasRecord ? (rec.absentCount ?? Math.max(0, cls.strength - presentCnt)) : 0;
          const attRate = hasRecord && cls.strength > 0 ? Math.round((presentCnt / cls.strength) * 100) : null;

          return (
            <TouchableOpacity
              key={cls.id}
              style={styles.classCard}
              onPress={() => navigation.navigate('AdminClassDetail', {
                classInfo: cls,
                attendanceRecord: rec,
              })}
              activeOpacity={0.85}
            >
              <View style={styles.classCardTop}>
                <View>
                  <View style={styles.classBadge}>
                    <Ionicons name="school-outline" size={16} color={COLORS.primaryDark} />
                    <Text style={styles.classBadgeText}>{cls.label}</Text>
                  </View>
                  <Text style={styles.classMetaSub}>Room 104 · Grade {cls.grade} · {cls.strength} Enrolled</Text>
                </View>

                {hasRecord ? (
                  <View style={styles.submittedPill}>
                    <Ionicons name="checkmark-circle" size={12} color="#15803D" />
                    <Text style={styles.submittedPillText}>Roll-Call Submitted</Text>
                  </View>
                ) : (
                  <View style={[styles.submittedPill, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                    <Ionicons name="time-outline" size={12} color="#B45309" />
                    <Text style={[styles.submittedPillText, { color: '#B45309' }]}>Awaiting Roll-Call</Text>
                  </View>
                )}
              </View>

              <View style={styles.classStatsRow}>
                <View style={styles.classStatItem}>
                  <Text style={styles.classStatNum}>
                    {hasRecord ? `${presentCnt} / ${cls.strength}` : `0 / ${cls.strength}`}
                  </Text>
                  <Text style={styles.classStatLabel}>STUDENTS PRESENT</Text>
                </View>
                <View style={styles.classStatDivider} />
                <View style={styles.classStatItem}>
                  <Text style={[styles.classStatNum, { color: hasRecord ? COLORS.present : COLORS.textMedium }]}>
                    {hasRecord ? `${attRate}%` : '--'}
                  </Text>
                  <Text style={styles.classStatLabel}>DAILY TURNOUT</Text>
                </View>
                <View style={styles.classStatDivider} />
                <View style={styles.classStatItem}>
                  <Text style={styles.classStatNumTeacher}>Sunita Sharma</Text>
                  <Text style={styles.classStatLabel}>CLASS TEACHER</Text>
                </View>
              </View>

              <View style={styles.classCardFooter}>
                <Text style={styles.viewStudentsText}>View Student Roster</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ========================================================= */}
        {/* SECTION 3: TODAY'S MID-DAY MEAL DISTRIBUTION ACTION CARD  */}
        {/* ========================================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>LUNCH ALLOCATION</Text>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="restaurant" size={17} color={COLORS.goldDark} />
              <Text style={styles.sectionTitle}>Today's Mid-Day Meal Distribution</Text>
            </View>
          </View>
          <View style={styles.liveCounterBadge}>
            <View style={styles.liveGreenDot} />
            <Text style={styles.liveCounterBadgeText}>ATTENDANCE SYNCED</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.mealActionCard}
          onPress={() => navigation.navigate('AdminMealDistribution', {
            targetMeals: targetMeals,
            attendanceRecord: attendanceRecords['8C'],
          })}
          activeOpacity={0.88}
        >
          <View style={styles.mealCardHeader}>
            <View style={styles.mealIconCircle}>
              <Ionicons name="restaurant" size={24} color={COLORS.goldDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mealCardTitle}>Today's Lunch Beneficiaries</Text>
              <Text style={styles.mealCardSub}>Class 8C · Verified from morning attendance</Text>
            </View>
            <View style={styles.mealPillBadge}>
              <Text style={styles.mealPillNum}>{targetMeals}</Text>
              <Text style={styles.mealPillTotal}>STUDENTS ELIGIBLE</Text>
            </View>
          </View>

          <View style={styles.openMealScreenBtn}>
            <Text style={styles.openMealScreenBtnText}>View Today's Lunch List</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  topBar: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SIZES.paddingMd,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  auditPill: {
    backgroundColor: 'rgba(191,160,80,0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,160,80,0.4)',
  },
  auditPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.goldLight,
  },
  schoolSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SIZES.paddingMd,
    backgroundColor: COLORS.background,
  },
  welcomeHeader: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: -0.3,
  },
  adminMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMedium,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.goldPale,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.goldDark,
    letterSpacing: 0.4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 10,
  },
  sectionEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: COLORS.textMedium,
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.creamCard,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
  },
  refreshText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.creamCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
    paddingVertical: 14,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMedium,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.divider,
  },
  classCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  classCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  classBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  classMetaSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textMedium,
    marginTop: 2,
  },
  submittedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  submittedPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  classStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: 10,
    marginBottom: 12,
  },
  classStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  classStatNum: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  classStatNumTeacher: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  classStatLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.textMedium,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  classStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.divider,
  },
  classCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  viewStudentsText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primary,
  },
  liveCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A5E6B8',
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveCounterBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  mealActionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    padding: 16,
    ...SHADOWS.md,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  mealIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.goldPale,
    borderWidth: 1,
    borderColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  mealCardSub: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMedium,
    marginTop: 2,
  },
  mealPillBadge: {
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C2DEC9',
  },
  mealPillNum: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },
  mealPillTotal: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.primaryLight,
  },
  openMealScreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 14,
    borderRadius: SIZES.radiusSm,
    marginTop: 2,
    ...SHADOWS.sm,
  },
  openMealScreenBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
