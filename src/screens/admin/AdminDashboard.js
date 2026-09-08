import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { SCHOOL_INFO, CLASSES_LIST } from '../../data/mockData';
import { fetchAttendanceRecords, subscribeToRealtimeAttendance } from '../../services/supabaseService';
import { generateDailyAuditPDF } from '../../services/pdfService';

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [servedRolls, setServedRolls] = useState([]);

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
      if (attMap?._served_rolls && Array.isArray(attMap._served_rolls)) {
        const validRolls = attMap._served_rolls.filter(r => {
          const s = String(r).trim();
          return s.length <= 10 && !s.includes('http') && !s.includes('://') && s !== 'INVALID';
        });
        setMealsServed(validRolls.length);
        setServedRolls(validRolls);
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

  const handleDownloadReport = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      await generateDailyAuditPDF({
        attendanceRecords,
        servedRolls,
        adminInfo: admin,
      });
    } catch (err) {
      console.log('PDF error', err);
      Alert.alert(
        'Export Failed',
        'Could not generate the PDF. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGeneratingPDF(false);
    }
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
        <View style={styles.topBarTitleCol}>
          <View style={styles.titleRow}>
            <Ionicons name="shield-checkmark" size={15} color={COLORS.gold} />
            <Text style={styles.appName}>PoshanSetu</Text>
            <View style={styles.auditPill}>
              <Text style={styles.auditPillText}>ADMIN</Text>
            </View>
          </View>
          <Text style={styles.schoolSub} numberOfLines={1}>{SCHOOL_INFO.name}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.goldLight} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeInfoCol}>
              <Text style={styles.adminName} numberOfLines={1}>{admin.name}</Text>
              <Text style={styles.adminMeta} numberOfLines={1}>School Principal · {SCHOOL_INFO.name}</Text>
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
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionEyebrow}>ATTENDANCE</Text>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="analytics" size={16} color={COLORS.primaryDark} />
              <Text style={styles.sectionTitle} numberOfLines={1}>School Overview</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchRecords} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={12} color={COLORS.primaryLight} />
            <Text style={styles.refreshText}>{lastRefreshed ? lastRefreshed.split(' ')[0] : 'Sync'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.statsStrip}>
            <View style={styles.statCol}>
              <Text style={styles.statNum}>{totalReportedEnrolled}</Text>
              <Text style={styles.statLabel}>Enrolled</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: hasAnySubmission ? COLORS.present : COLORS.textMedium }]}>
                {hasAnySubmission ? totalReportedPresent : '--'}
              </Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: hasAnySubmission ? COLORS.absent : COLORS.textMedium }]}>
                {hasAnySubmission ? totalReportedAbsent : '--'}
              </Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: '#0369A1' }]}>{classesSubmitted}/{CLASSES_LIST.length}</Text>
              <Text style={styles.statLabel}>Submitted</Text>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* SECTION 2: REGISTERED CLASSROOMS & ROSTER                 */}
        {/* ========================================================= */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionEyebrow}>CLASSROOM ROSTERS</Text>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="school" size={16} color={COLORS.primaryDark} />
              <Text style={styles.sectionTitle}>Registered Classes</Text>
            </View>
          </View>
        </View>

        {CLASSES_LIST.map((cls) => {
          const rec = attendanceRecords[cls.id];
          const attMap = rec?.attendanceMap || rec?.attendance_map || {};
          const hasRecord = !!rec && typeof rec.presentCount === 'number' && Object.keys(attMap).some(k => !k.startsWith('_'));
          const presentCnt = hasRecord ? rec.presentCount : 0;
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
                <View style={styles.classCardTopLeft}>
                  <View style={styles.classBadge}>
                    <Ionicons name="school-outline" size={15} color={COLORS.primaryDark} />
                    <Text style={styles.classBadgeText}>{cls.label}</Text>
                  </View>
                  <Text style={styles.classMetaSub} numberOfLines={1}>Grade {cls.grade} · {cls.strength} Enrolled</Text>
                </View>

                {hasRecord ? (
                  <View style={styles.submittedPill}>
                    <Ionicons name="checkmark-circle" size={11} color="#15803D" />
                    <Text style={styles.submittedPillText}>Submitted</Text>
                  </View>
                ) : (
                  <View style={[styles.submittedPill, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                    <Ionicons name="time-outline" size={11} color="#B45309" />
                    <Text style={[styles.submittedPillText, { color: '#B45309' }]}>Pending</Text>
                  </View>
                )}
              </View>

              <View style={styles.classStatsRow}>
                <View style={styles.classStatItem}>
                  <Text style={styles.classStatNum}>
                    {hasRecord ? `${presentCnt} / ${cls.strength}` : `0 / ${cls.strength}`}
                  </Text>
                  <Text style={styles.classStatLabel}>PRESENT</Text>
                </View>
                <View style={styles.classStatDivider} />
                <View style={styles.classStatItem}>
                  <Text style={[styles.classStatNum, { color: hasRecord ? COLORS.present : COLORS.textMedium }]}>
                    {hasRecord ? `${attRate}%` : '--'}
                  </Text>
                  <Text style={styles.classStatLabel}>TURNOUT</Text>
                </View>
                <View style={styles.classStatDivider} />
                <View style={styles.classStatItem}>
                  <Text style={styles.classStatNumTeacher} numberOfLines={1}>S. Sharma</Text>
                  <Text style={styles.classStatLabel}>TEACHER</Text>
                </View>
              </View>

              <View style={styles.classCardFooter}>
                <Text style={styles.viewStudentsText}>View Class Roster</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ========================================================= */}
        {/* SECTION 3: TODAY'S MID-DAY MEAL DISTRIBUTION ACTION CARD  */}
        {/* ========================================================= */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionEyebrow}>MID-DAY MEAL</Text>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="restaurant" size={16} color={COLORS.goldDark} />
              <Text style={styles.sectionTitle} numberOfLines={1}>Meal Distribution</Text>
            </View>
          </View>
          <View style={styles.liveCounterBadge}>
            <View style={[styles.liveGreenDot, mealsServed > 0 && { backgroundColor: '#15803D' }]} />
            <Text style={styles.liveCounterBadgeText}>
              {mealsServed > 0 ? `${mealsServed} SERVED` : (telemetryOnline ? 'SCANNER ACTIVE' : 'SYNCED')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.mealActionCard}
          onPress={() => navigation.navigate('AdminMealDistribution', {
            targetMeals: targetMeals,
            attendanceRecord: attendanceRecords['8C'],
            mealsServed: mealsServed,
          })}
          activeOpacity={0.88}
        >
          <View style={styles.mealCardHeader}>
            <View style={styles.mealIconCircle}>
              <Ionicons name="restaurant" size={22} color={COLORS.goldDark} />
            </View>
            <View style={styles.mealInfoCol}>
              <Text style={styles.mealCardTitle} numberOfLines={1}>Today's Lunch Roster</Text>
              <Text style={styles.mealCardSub} numberOfLines={1}>
                {mealsServed > 0
                  ? `${mealsServed} of ${targetMeals || 20} meals verified & taken`
                  : `Class 8C · ${targetMeals || 20} students eligible for lunch`}
              </Text>
            </View>
            <View style={styles.mealPillBadge}>
              <Text style={styles.mealPillNum}>{mealsServed}</Text>
              <Text style={styles.mealPillTotal}>/ {targetMeals || 20} TAKEN</Text>
            </View>
          </View>

          {/* Real-time progress bar */}
          <View style={styles.mealProgressWrap}>
            <View style={styles.mealProgressTrack}>
              <View
                style={[
                  styles.mealProgressFill,
                  { width: `${Math.min(100, Math.round((mealsServed / Math.max(1, targetMeals || 20)) * 100))}%` },
                ]}
              />
            </View>
            <View style={styles.mealProgressLabels}>
              <Text style={styles.mealProgressPct}>
                {Math.min(100, Math.round((mealsServed / Math.max(1, targetMeals || 20)) * 100))}% Verified
              </Text>
              <Text style={styles.mealProgressRemain}>
                {Math.max(0, (targetMeals || 20) - mealsServed)} Pending
              </Text>
            </View>
          </View>

          <View style={styles.openMealScreenBtn}>
            <Text style={styles.openMealScreenBtnText}>View Real-Time Lunch List</Text>
            <Ionicons name="arrow-forward" size={15} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* ========================================================= */}
        {/* SECTION 4: DAILY AUDIT REPORT DOWNLOAD                   */}
        {/* ========================================================= */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionEyebrow}>COMPLIANCE</Text>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="document-text" size={16} color={COLORS.primaryDark} />
              <Text style={styles.sectionTitle} numberOfLines={1}>Daily Audit Report</Text>
            </View>
          </View>
        </View>

        <View style={styles.auditReportCard}>
          <View style={styles.auditReportTop}>
            <View style={styles.auditIconWrap}>
              <Ionicons name="document-text-outline" size={26} color={COLORS.primaryDark} />
            </View>
            <View style={styles.auditReportInfo}>
              <Text style={styles.auditReportTitle}>PM-POSHAN Compliance Report</Text>
              <Text style={styles.auditReportSub}>
                Attendance · Meals Distributed · Discrepancies
              </Text>
            </View>
          </View>

          <View style={styles.auditStatsRow}>
            <View style={styles.auditStat}>
              <Text style={[styles.auditStatVal, { color: COLORS.primary }]}>{totalReportedPresent}</Text>
              <Text style={styles.auditStatLabel}>Present</Text>
            </View>
            <View style={styles.auditStatDivider} />
            <View style={styles.auditStat}>
              <Text style={[styles.auditStatVal, { color: COLORS.goldDark }]}>{mealsServed}</Text>
              <Text style={styles.auditStatLabel}>Meals</Text>
            </View>
            <View style={styles.auditStatDivider} />
            <View style={styles.auditStat}>
              <Text style={[styles.auditStatVal, { color: COLORS.present }]}>
                {mealsServed === 0 ? '--' : Math.min(100, Math.round((mealsServed / Math.max(1, totalReportedPresent)) * 100)) + '%'}
              </Text>
              <Text style={styles.auditStatLabel}>Coverage</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.downloadBtn, isGeneratingPDF && styles.downloadBtnDisabled]}
            onPress={handleDownloadReport}
            activeOpacity={0.82}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text style={styles.downloadBtnText}>Generating PDF…</Text>
              </>
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={COLORS.white} />
                <Text style={styles.downloadBtnText}>Download Daily Report (PDF)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
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
  topBarTitleCol: {
    flex: 1,
    marginRight: 10,
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
    color: 'rgba(255,255,255,0.7)',
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
    paddingBottom: 70,
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
  welcomeInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  adminName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: -0.3,
  },
  adminMeta: {
    fontSize: 11.5,
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
    marginBottom: 8,
    marginTop: 12,
  },
  sectionHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  sectionEyebrow: {
    fontSize: 9,
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
    fontSize: 16,
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
    paddingHorizontal: 8,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.creamCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.textMedium,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.divider,
  },
  classCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  classCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  classCardTopLeft: {
    flex: 1,
    marginRight: 8,
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  classBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  classMetaSub: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMedium,
    marginTop: 1,
  },
  submittedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  submittedPillText: {
    fontSize: 10,
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
    paddingVertical: 8,
    marginBottom: 10,
  },
  classStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  classStatNum: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  classStatNumTeacher: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  classStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMedium,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  classStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.divider,
  },
  classCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  viewStudentsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  liveCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A5E6B8',
  },
  liveGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  liveCounterBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  mealActionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    padding: 12,
    ...SHADOWS.sm,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  mealIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.goldPale,
    borderWidth: 1,
    borderColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfoCol: {
    flex: 1,
    marginRight: 6,
  },
  mealCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  mealCardSub: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMedium,
    marginTop: 1,
  },
  mealPillBadge: {
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C2DEC9',
    minWidth: 54,
  },
  mealPillNum: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.primary,
  },
  mealPillTotal: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.primaryLight,
  },
  mealProgressWrap: {
    marginBottom: 10,
  },
  mealProgressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  mealProgressFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 3,
  },
  mealProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealProgressPct: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.present,
  },
  mealProgressRemain: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
  openMealScreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 11,
    borderRadius: SIZES.radiusSm,
    ...SHADOWS.sm,
  },
  openMealScreenBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.2,
  },

  // ── Audit Report Card ──────────────────────────────────
  auditReportCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
    marginHorizontal: SIZES.paddingMd,
    marginBottom: 12,
    padding: SIZES.paddingMd,
    ...SHADOWS.sm,
  },
  auditReportTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  auditIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  auditReportInfo: {
    flex: 1,
  },
  auditReportTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  auditReportSub: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontWeight: '500',
  },
  auditStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: 10,
    marginBottom: 14,
  },
  auditStat: {
    flex: 1,
    alignItems: 'center',
  },
  auditStatVal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  auditStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  auditStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.borderLight,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 14,
    borderRadius: SIZES.radiusSm,
    ...SHADOWS.sm,
  },
  downloadBtnDisabled: {
    backgroundColor: COLORS.textMedium,
    opacity: 0.7,
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});

