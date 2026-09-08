import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { CLASSES_LIST, SCHOOL_INFO } from '../../data/mockData';
import { fetchAttendanceRecords, subscribeToRealtimeAttendance } from '../../services/supabaseService';
import LiveCameraFeed from '../../components/LiveCameraFeed';

// Per-student meal ingredient ratios (grams) — PM-POSHAN norms
const MEAL_NORMS = {
  rice:   100,  // g per student
  dal:     30,  // g per student
  sabzi:   50,  // g per student
  oil:      5,  // g per student
};

// Buffer percentage added on top of present count.
// Accounts for: food spillage by children + students who appear only at meal time
// (a well-documented ground reality in Indian govt schools under PM-POSHAN)
const MEAL_BUFFER_PERCENT = 15;

// Utility: format grams into readable quantity
const formatQty = (grams) => {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${grams} g`;
};

export default function CoordinatorDashboard({ route, navigation }) {
  const coordinator = route.params?.coordinator || {
    id: 'C101',
    name: 'Meena Devi',
    role: 'Meal Coordinator & Kitchen Supervisor',
  };

  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const fetchRecords = async () => {
    try {
      const records = await fetchAttendanceRecords();
      setAttendanceRecords(records || {});
      setLastRefreshed(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.log('Error fetching records', err);
    }
  };

  useEffect(() => {
    fetchRecords();
    const unsubscribeFocus = navigation.addListener('focus', fetchRecords);

    // 1. Ultra-fast WebSockets (<100ms instant push sync)
    const unsubscribeRealtime = subscribeToRealtimeAttendance(fetchRecords);

    // 2. 15-second background polling fallback (avoids screen thrashing)
    const pollInterval = setInterval(fetchRecords, 15000);

    return () => {
      unsubscribeFocus();
      if (unsubscribeRealtime) unsubscribeRealtime();
      clearInterval(pollInterval);
    };
  }, [navigation]);

  // Aggregate totals across all classes
  let totalEnrolled = 0;
  let totalPresent = 0;
  let classesReceived = 0;

  CLASSES_LIST.forEach((cls) => {
    totalEnrolled += cls.strength;
    const rec = attendanceRecords[cls.id];
    const attMap = rec?.attendanceMap || rec?.attendance_map || {};
    const hasMap = Object.keys(attMap).some(k => !k.startsWith('_'));
    if (rec && typeof rec.presentCount === 'number' && rec.presentCount > 0 && hasMap) {
      totalPresent += rec.presentCount;
      classesReceived += 1;
    }
  });

  const totalAbsent = totalEnrolled - totalPresent;
  const allReceived = classesReceived === CLASSES_LIST.length;

  // Meal count = present + 15% buffer (spillage + unregistered late arrivals)
  const bufferCount = Math.ceil(totalPresent * MEAL_BUFFER_PERCENT / 100);
  const adjustedMealCount = totalPresent + bufferCount;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of the Coordinator Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => navigation.replace('SelectRole') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="restaurant" size={15} color={COLORS.gold} />
            <Text style={styles.appName}>PoshanSetu</Text>
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
          <Text style={styles.dateText}>{todayStr}</Text>
          <Text style={styles.greeting}>Welcome Back,</Text>
          <Text style={styles.coordinatorName}>{coordinator.name}</Text>
        </View>

        {/* Overall Summary Stats Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCardHeader}>
            <View style={styles.summaryBadge}>
              <Ionicons name="stats-chart" size={13} color={COLORS.goldDark} />
              <Text style={styles.summaryBadgeText}>TODAY'S OVERVIEW</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchRecords} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={15} color={COLORS.primaryLight} />
              {lastRefreshed ? (
                <Text style={styles.refreshText}>{lastRefreshed}</Text>
              ) : null}
            </TouchableOpacity>
          </View>

          <View style={styles.statsStrip}>
            <View style={styles.statCol}>
              <Text style={styles.statNum}>{totalEnrolled}</Text>
              <Text style={styles.statLabel}>ENROLLED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: COLORS.present }]}>{totalPresent}</Text>
              <Text style={styles.statLabel}>PRESENT</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: COLORS.absent }]}>{totalAbsent}</Text>
              <Text style={styles.statLabel}>ABSENT</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: COLORS.goldDark }]}>{adjustedMealCount}</Text>
              <Text style={styles.statLabel}>MEALS (+15%)</Text>
            </View>
          </View>

          {/* Readiness Status Banner */}
          <View style={[styles.readinessBanner, allReceived ? styles.readyBanner : styles.pendingBanner]}>
            <Ionicons
              name={allReceived ? 'checkmark-circle' : 'time'}
              size={15}
              color={allReceived ? COLORS.present : COLORS.warning}
            />
            <Text style={[styles.readinessText, allReceived ? styles.readyText : styles.pendingText]}>
              {allReceived
                ? `All ${CLASSES_LIST.length} class${CLASSES_LIST.length > 1 ? 'es' : ''} submitted — Kitchen is ready to start`
                : `${classesReceived} of ${CLASSES_LIST.length} class${CLASSES_LIST.length > 1 ? 'es' : ''} received — Awaiting remaining data`}
            </Text>
          </View>
        </View>

        {/* Class Attendance Reports */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Class Attendance Reports</Text>
          <Text style={styles.sectionSub}>Submitted by teachers</Text>
        </View>

        {CLASSES_LIST.map((cls) => {
          const rec = attendanceRecords[cls.id];
          const received = !!rec;
          return (
            <View key={cls.id} style={[styles.classCard, received ? styles.classCardReceived : styles.classCardPending]}>
              {/* Class Badge + Details */}
              <View style={styles.classCardLeft}>
                <View style={[styles.classBadge, received ? styles.classBadgeReceived : styles.classBadgePending]}>
                  <Text style={[styles.classBadgeGrade, received ? styles.gradeReceived : styles.gradePending]}>
                    {cls.grade}
                  </Text>
                  <Text style={[styles.classBadgeSec, received ? styles.secReceived : styles.secPending]}>
                    Sec {cls.section}
                  </Text>
                </View>

                <View style={styles.classDetails}>
                  <Text style={styles.classLabel}>{cls.label}</Text>

                  {received ? (
                    <>
                      <View style={styles.metaRow}>
                        <Ionicons name="people" size={12} color={COLORS.present} />
                        <Text style={styles.metaTextPresent}>{rec.presentCount} Present</Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Ionicons name="close-circle" size={12} color={COLORS.absent} />
                        <Text style={styles.metaTextAbsent}>{rec.absentCount} Absent</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Ionicons name="person-outline" size={11} color={COLORS.textLight} />
                        <Text style={styles.metaTextSub}>By {rec.recordedBy}</Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Ionicons name="time-outline" size={11} color={COLORS.textLight} />
                        <Text style={styles.metaTextSub}>
                          {new Date(rec.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <View style={styles.receivedPill}>
                        <Ionicons name="checkmark-circle" size={11} color={COLORS.present} />
                        <Text style={styles.receivedPillText}>Data Received</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.metaRow}>
                        <Ionicons name="people-outline" size={12} color={COLORS.textMedium} />
                        <Text style={styles.metaTextSub}>{cls.strength} Enrolled</Text>
                      </View>
                      <View style={styles.awaitingPill}>
                        <Ionicons name="time" size={11} color={COLORS.warning} />
                        <Text style={styles.awaitingPillText}>Awaiting Teacher Submission</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>

              {/* Right Status Icon */}
              <Ionicons
                name={received ? 'cloud-done-outline' : 'cloud-upload-outline'}
                size={22}
                color={received ? COLORS.present : COLORS.textLight}
              />
            </View>
          );
        })}

        {/* Meal Preparation Targets */}
        {totalPresent > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Meal Preparation Targets</Text>
              <Text style={styles.sectionSub}>Calculated for today's kitchen preparation</Text>
            </View>

            <View style={styles.mealCard}>
              <View style={styles.mealCardHeader}>
                <View style={styles.mealHeaderInfo}>
                  <View style={styles.mealBadge}>
                    <Ionicons name="flame" size={13} color={COLORS.goldDark} />
                    <Text style={styles.mealBadgeText}>TODAY'S KITCHEN QUOTA</Text>
                  </View>
                  <Text style={styles.mealHeaderBreakdown}>
                    {totalPresent} present + {bufferCount} contingency buffer ({MEAL_BUFFER_PERCENT}%)
                  </Text>
                </View>
                <View style={styles.mealHeroBadge}>
                  <Text style={styles.mealHeroNum}>{adjustedMealCount}</Text>
                  <Text style={styles.mealHeroUnit}>MEALS</Text>
                </View>
              </View>

              <View style={styles.ingredientGrid}>
                {[
                  { name: 'Rice',  icon: 'leaf',       grams: MEAL_NORMS.rice  * adjustedMealCount },
                  { name: 'Dal',   icon: 'ellipse',    grams: MEAL_NORMS.dal   * adjustedMealCount },
                  { name: 'Sabzi', icon: 'nutrition',  grams: MEAL_NORMS.sabzi * adjustedMealCount },
                  { name: 'Oil',   icon: 'water',      grams: MEAL_NORMS.oil   * adjustedMealCount },
                ].map((item, idx) => (
                  <View key={idx} style={styles.ingredientItem}>
                    <View style={styles.ingredientIconWrap}>
                      <Ionicons name={item.icon} size={18} color={COLORS.primaryDark} />
                    </View>
                    <Text style={styles.ingredientQty}>{formatQty(item.grams)}</Text>
                    <Text style={styles.ingredientName}>{item.name}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.mealNormNote}>
                <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.goldDark} />
                <Text style={styles.mealNormText}>
                  PM-POSHAN norms per child with{' '}
                  <Text style={{ fontWeight: '800' }}>15% buffer</Text> added for spillage & late meal-time arrivals.
                </Text>
              </View>
            </View>

            {/* Live Dining Hall CCTV & Serving Queue */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AI Vision Terminal & Serving Queue</Text>
              <Text style={styles.sectionSub}>Live Telemetry from Unit CAM-01 (Laptop AI Engine)</Text>
            </View>
            <LiveCameraFeed
              cameraHost="192.168.1.6:5050"
              title="Kitchen Serving Window AI Unit"
              subtitle="Real-time Queue & Plate Monitoring"
              detectedCount={totalPresent > 0 ? totalPresent : 17}
            />
          </>
        )}

        {/* Empty State when nothing received yet */}
        {totalPresent === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="hourglass-outline" size={30} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Data Received Yet</Text>
            <Text style={styles.emptySub}>
              Meal targets will appear here once teachers submit their class attendance.
            </Text>
          </View>
        )}

        {/* Footer spacer */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },

  // Top Bar
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
  schoolSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: SIZES.radiusSm,
  },

  // Scroll content
  content: {
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMd,
    paddingBottom: 24,
  },

  // Welcome Header
  welcomeHeader: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 14,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMedium,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  coordinatorName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    marginTop: 2,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  refreshText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  statLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.borderLight,
  },
  readinessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  readyBanner: { backgroundColor: COLORS.syncedBg },
  pendingBanner: { backgroundColor: COLORS.offlineBg },
  readinessText: { fontSize: 11, fontWeight: '600', flex: 1, lineHeight: 16 },
  readyText: { color: COLORS.present },
  pendingText: { color: '#92400E' },

  // Section Headers
  sectionHeader: {
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  sectionSub: {
    fontSize: 11,
    color: COLORS.textMedium,
    marginTop: 1,
  },

  // Class Cards
  classCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  classCardReceived: {
    borderColor: '#86EFAC',
    backgroundColor: '#F7FEFA',
  },
  classCardPending: {
    borderColor: COLORS.border,
  },
  classCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  classBadge: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classBadgeReceived: {
    backgroundColor: COLORS.presentPale,
    borderWidth: 1,
    borderColor: 'rgba(21,128,61,0.3)',
  },
  classBadgePending: {
    backgroundColor: COLORS.primaryPale,
    borderWidth: 1,
    borderColor: 'rgba(0,77,44,0.2)',
  },
  classBadgeGrade: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  classBadgeSec: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  gradeReceived: { color: COLORS.present },
  secReceived: { color: COLORS.present },
  gradePending: { color: COLORS.primaryDark },
  secPending: { color: COLORS.primaryLight },
  classDetails: { flex: 1, paddingRight: 4 },
  classLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metaTextPresent: { fontSize: 11, color: COLORS.present, fontWeight: '700' },
  metaTextAbsent: { fontSize: 11, color: COLORS.absent, fontWeight: '700' },
  metaTextSub: { fontSize: 10.5, color: COLORS.textMedium },
  metaDot: { fontSize: 10, color: COLORS.textLight },
  receivedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.syncedBg,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: SIZES.radiusFull,
    marginTop: 4,
  },
  receivedPillText: { fontSize: 10, fontWeight: '700', color: COLORS.present },
  awaitingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.offlineBg,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: SIZES.radiusFull,
    marginTop: 4,
  },
  awaitingPillText: { fontSize: 10, fontWeight: '700', color: COLORS.warning },

  // Meal Preparation Card
  mealCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5,
    borderColor: 'rgba(191,160,80,0.4)',
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: COLORS.goldPale,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,160,80,0.3)',
  },
  mealHeaderInfo: {
    flex: 1,
    paddingRight: 10,
  },
  mealHeaderBreakdown: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '600',
    marginTop: 3,
  },
  mealHeroBadge: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealHeroNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.gold,
    lineHeight: 20,
  },
  mealHeroUnit: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.6,
  },
  mealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mealBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 0.5,
  },
  ingredientGrid: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  ingredientItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  ingredientIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,77,44,0.15)',
  },
  ingredientQty: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  ingredientName: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
  mealNormNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.goldPale,
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,160,80,0.3)',
  },
  mealNormText: {
    fontSize: 10,
    color: COLORS.goldDark,
    fontWeight: '600',
    flex: 1,
  },

  // Empty State
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 14,
    gap: 8,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textMedium,
    textAlign: 'center',
    lineHeight: 18,
  },
});
