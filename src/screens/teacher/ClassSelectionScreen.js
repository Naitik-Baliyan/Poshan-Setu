import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { CLASSES_LIST, SCHOOL_INFO } from '../../data/mockData';

// Bilingual Motivational Quotes for Teachers & PM-POSHAN Mission
const POSHAN_QUOTES = [
  {
    hindi: 'एक शिक्षक का स्नेह और ज्ञान ही बच्चे के भविष्य की सबसे बड़ी शक्ति है।',
    english: "A teacher's care and wisdom are the greatest forces shaping a child's future.",
    author: 'गुरु-शिष्य परंपरा · Teacher Inspiration',
  },
  {
    hindi: 'शिक्षक केवल पाठ नहीं पढ़ाते, वे जीवन जीने का हौसला जगाते हैं।',
    english: 'Teachers do not just teach lessons; they awaken the courage to lead in life.',
    author: 'डॉ. सर्वपल्ली राधाकृष्णन · Dr. Radhakrishnan',
  },
  {
    hindi: 'आपकी कक्षा में बैठा हर बच्चा, कल के समर्थ और आत्मनिर्भर भारत का निर्माता है।',
    english: "Every child in your classroom is the architect of tomorrow's empowered India.",
    author: 'डॉ. ए.पी.जे. अब्दुल कलाम · APJ Abdul Kalam',
  },
  {
    hindi: 'सपनों को पंख देना और हौसलों को उड़ान — यही एक समर्पित शिक्षक की पहचान है।',
    english: 'Giving wings to young dreams and strength to soar — the mark of a devoted teacher.',
    author: 'राष्ट्र निर्माता · Nation Builders',
  },
  {
    hindi: 'उत्तम पोषण से स्वस्थ काया, और आपके मार्गदर्शन से प्रबुद्ध मन।',
    english: 'Nourishing meals build healthy bodies, your guidance builds enlightened minds.',
    author: 'शिक्षा एवं पोषण सेतु · PoshanSetu Mission',
  },
  {
    hindi: 'शिक्षा और पोषण की यह मशाल, आपके अथक समर्पण से ही प्रतिदिन रोशन है।',
    english: 'The beacon of learning and nourishment shines bright through your tireless dedication.',
    author: 'शिक्षक गौरव · Pride of Education',
  },
];

export default function ClassSelectionScreen({ route, navigation }) {
  const teacher = route.params?.teacher || {
    id: 'T101',
    name: 'Sunita Sharma',
    role: 'Senior Teacher',
    assignedClasses: ['8C'],
  };

  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Auto cycle quotes every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % POSHAN_QUOTES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleNextQuote = () => {
    setQuoteIdx((prev) => (prev + 1) % POSHAN_QUOTES.length);
  };

  // Load existing records from local AsyncStorage
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const stored = await AsyncStorage.getItem('poshan_attendance_records');
        if (stored) {
          setAttendanceRecords(JSON.parse(stored));
        }
      } catch (err) {
        console.log('AsyncStorage read err', err);
      }
    };
    fetchStatus();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const assignedClasses = CLASSES_LIST.filter(
    (cls) => !teacher.assignedClasses || teacher.assignedClasses.includes(cls.id)
  );

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Day-based timetable — 7 lectures from 08:00 to 02:30, 1-hr interval (11:30–12:30), no gaps
  const WEEKLY_SCHEDULE = {
    1: [ // Monday
      { period: 'Period 1', time: '08:00–08:50', subject: 'Mathematics',       class: '8C',  room: 'Room 12' },
      { period: 'Period 2', time: '08:50–09:40', subject: 'Science',           class: '7A',  room: 'Lab 2'   },
      { period: 'Period 3', time: '09:40–10:35', subject: 'English',           class: '6B',  room: 'Room 09' },
      { period: 'Period 4', time: '10:35–11:30', subject: 'Hindi',             class: '8A',  room: 'Room 07' },
      { period: 'Interval', time: '11:30–12:30', subject: 'Mid-Day Meal Duty', class: 'All', room: 'Canteen', isInterval: true },
      { period: 'Period 5', time: '12:30–01:10', subject: 'Social Studies',    class: '8C',  room: 'Room 12' },
      { period: 'Period 6', time: '01:10–01:50', subject: 'Mathematics',       class: '7B',  room: 'Room 10' },
      { period: 'Period 7', time: '01:50–02:30', subject: 'Activity & Sports', class: '6A',  room: 'Ground'  },
    ],
    2: [ // Tuesday
      { period: 'Period 1', time: '08:00–08:50', subject: 'English',           class: '8C',  room: 'Room 12' },
      { period: 'Period 2', time: '08:50–09:40', subject: 'Mathematics',       class: '7B',  room: 'Room 10' },
      { period: 'Period 3', time: '09:40–10:35', subject: 'Hindi',             class: '6A',  room: 'Room 07' },
      { period: 'Period 4', time: '10:35–11:30', subject: 'Science',           class: '8B',  room: 'Lab 2'   },
      { period: 'Interval', time: '11:30–12:30', subject: 'Mid-Day Meal Duty', class: 'All', room: 'Canteen', isInterval: true },
      { period: 'Period 5', time: '12:30–01:10', subject: 'Computer Science',  class: '8C',  room: 'Lab 1'   },
      { period: 'Period 6', time: '01:10–01:50', subject: 'Social Studies',    class: '7A',  room: 'Room 09' },
      { period: 'Period 7', time: '01:50–02:30', subject: 'Environmental St.', class: '6B',  room: 'Room 10' },
    ],
    3: [ // Wednesday
      { period: 'Period 1', time: '08:00–08:50', subject: 'Science',           class: '8C',  room: 'Lab 2'   },
      { period: 'Period 2', time: '08:50–09:40', subject: 'Hindi',             class: '7A',  room: 'Room 07' },
      { period: 'Period 3', time: '09:40–10:35', subject: 'Mathematics',       class: '6B',  room: 'Room 10' },
      { period: 'Period 4', time: '10:35–11:30', subject: 'English',           class: '8A',  room: 'Room 12' },
      { period: 'Interval', time: '11:30–12:30', subject: 'Mid-Day Meal Duty', class: 'All', room: 'Canteen', isInterval: true },
      { period: 'Period 5', time: '12:30–01:10', subject: 'Art & Craft',       class: '8C',  room: 'Room 05' },
      { period: 'Period 6', time: '01:10–01:50', subject: 'Science',           class: '7B',  room: 'Lab 2'   },
      { period: 'Period 7', time: '01:50–02:30', subject: 'Library Session',   class: '6A',  room: 'Library' },
    ],
    4: [ // Thursday
      { period: 'Period 1', time: '08:00–08:50', subject: 'Social Studies',    class: '8C',  room: 'Room 12' },
      { period: 'Period 2', time: '08:50–09:40', subject: 'English',           class: '7B',  room: 'Room 09' },
      { period: 'Period 3', time: '09:40–10:35', subject: 'Science',           class: '6A',  room: 'Lab 2'   },
      { period: 'Period 4', time: '10:35–11:30', subject: 'Hindi',             class: '8B',  room: 'Room 07' },
      { period: 'Interval', time: '11:30–12:30', subject: 'Mid-Day Meal Duty', class: 'All', room: 'Canteen', isInterval: true },
      { period: 'Period 5', time: '12:30–01:10', subject: 'Mathematics',       class: '8C',  room: 'Room 12' },
      { period: 'Period 6', time: '01:10–01:50', subject: 'Mathematics',       class: '7A',  room: 'Room 10' },
      { period: 'Period 7', time: '01:50–02:30', subject: 'General Knowledge', class: '6B',  room: 'Room 09' },
    ],
    5: [ // Friday
      { period: 'Period 1', time: '08:00–08:50', subject: 'Computer Science',  class: '8C',  room: 'Lab 1'   },
      { period: 'Period 2', time: '08:50–09:40', subject: 'Mathematics',       class: '6B',  room: 'Room 10' },
      { period: 'Period 3', time: '09:40–10:35', subject: 'English',           class: '7A',  room: 'Room 09' },
      { period: 'Period 4', time: '10:35–11:30', subject: 'Social Studies',    class: '8A',  room: 'Room 12' },
      { period: 'Interval', time: '11:30–12:30', subject: 'Mid-Day Meal Duty', class: 'All', room: 'Canteen', isInterval: true },
      { period: 'Period 5', time: '12:30–01:10', subject: 'Science',           class: '8C',  room: 'Lab 2'   },
      { period: 'Period 6', time: '01:10–01:50', subject: 'Computer Science',  class: '7B',  room: 'Lab 1'   },
      { period: 'Period 7', time: '01:50–02:30', subject: 'Moral Sci. & Yoga', class: '6A',  room: 'Room 07' },
    ],
    6: [ // Saturday
      { period: 'Period 1', time: '08:00–08:50', subject: 'Hindi',             class: '8C',  room: 'Room 07' },
      { period: 'Period 2', time: '08:50–09:40', subject: 'Art & Craft',       class: '7B',  room: 'Room 05' },
      { period: 'Period 3', time: '09:40–10:35', subject: 'Social Studies',    class: '6A',  room: 'Room 12' },
      { period: 'Period 4', time: '10:35–11:30', subject: 'Mathematics',       class: '8B',  room: 'Room 10' },
      { period: 'Interval', time: '11:30–12:30', subject: 'Mid-Day Meal Duty', class: 'All', room: 'Canteen', isInterval: true },
      { period: 'Period 5', time: '12:30–01:10', subject: 'Sports & Games',    class: '8C',  room: 'Ground'  },
      { period: 'Period 6', time: '01:10–01:50', subject: 'Science',           class: '7A',  room: 'Lab 2'   },
      { period: 'Period 7', time: '01:50–02:30', subject: 'Music & Culture',   class: '6B',  room: 'Hall'    },
    ],
  };

  const dayOfWeek = new Date().getDay();
  const todaySchedule = WEEKLY_SCHEDULE[dayOfWeek] || WEEKLY_SCHEDULE[1] || [];

  // Total expected meals from marked classes
  let totalPresentCount = 0;
  let markedClassesCount = 0;

  assignedClasses.forEach((cls) => {
    const rec = attendanceRecords[cls.id];
    if (rec && rec.presentCount !== undefined) {
      totalPresentCount += rec.presentCount;
      markedClassesCount += 1;
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.gold} />
            <Text style={styles.appName}>PoshanSetu</Text>
          </View>
          <Text style={styles.schoolSub}>{SCHOOL_INFO.name}</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => navigation.replace('SelectRole')}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.goldLight} />
        </TouchableOpacity>
      </View>


      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Teacher Welcome Header */}
        <View style={styles.teacherHeader}>
          <Text style={styles.dateText}>{todayStr}</Text>
          <Text style={styles.teacherGreeting}>Welcome Back,</Text>
          <Text style={styles.teacherName}>{teacher.name}</Text>
        </View>

        {/* Today's Schedule Card Button */}
        <View style={styles.scheduleSection}>
          <TouchableOpacity
            style={[styles.scheduleCardBtn, isScheduleOpen && styles.scheduleCardBtnOpen]}
            onPress={() => setIsScheduleOpen((prev) => !prev)}
            activeOpacity={0.85}
          >
            <View style={styles.scheduleCardHeaderLeft}>
              <View style={styles.scheduleCalendarBadge}>
                <Ionicons name="calendar-outline" size={22} color={COLORS.primaryDark} />
                <Text style={styles.scheduleCalendarBadgeSub}>SCHEDULE</Text>
              </View>

              <View style={styles.scheduleDetails}>
                <Text style={styles.scheduleTitleText}>Today's Schedule</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={12} color={COLORS.textMedium} />
                  <Text style={styles.metaText}>7 Lectures · 08:00 to 02:30</Text>
                </View>

                <View style={styles.scheduleSubTagRow}>
                  <View style={styles.badge8CTag}>
                    <Text style={styles.badge8CTagText}>Class 8C First</Text>
                  </View>
                  <View style={isScheduleOpen ? styles.statusPillOpen : styles.statusPillClosed}>
                    <Ionicons
                      name={isScheduleOpen ? 'chevron-up' : 'eye-outline'}
                      size={11}
                      color={isScheduleOpen ? COLORS.primaryDark : COLORS.goldDark}
                    />
                    <Text style={isScheduleOpen ? styles.statusOpenText : styles.statusClosedText}>
                      {isScheduleOpen ? 'Collapse' : 'View Timetable'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.arrowWrap}>
              <Ionicons
                name={isScheduleOpen ? 'chevron-up' : 'chevron-forward'}
                size={20}
                color={COLORS.goldDark}
              />
            </View>
          </TouchableOpacity>

          {/* Timetable content revealed when expanded */}
          {isScheduleOpen && (
            <View style={styles.scheduleExpandedContainer}>
              {todaySchedule.length === 0 ? (
                <View style={styles.noSchoolCard}>
                  <Ionicons name="sunny-outline" size={20} color={COLORS.goldDark} />
                  <Text style={styles.noSchoolText}>No classes scheduled today. Enjoy your day!</Text>
                </View>
              ) : (
                <View style={styles.scheduleList}>
                  {todaySchedule.map((slot, idx) => {
                    const isMeal = slot.subject === 'Mid-Day Meal Duty' || slot.isInterval;
                    const is8C = slot.class === '8C';
                    return (
                      <View key={idx}>
                        <View style={[styles.scheduleRow, isMeal && styles.scheduleRowMeal]}>
                          {/* Left: Period name & Time */}
                          <View style={styles.scheduleTimeCol}>
                            <Text style={[styles.schedulePeriodText, isMeal && styles.schedulePeriodMealText]}>
                              {slot.period}
                            </Text>
                            <Text style={styles.scheduleTimeText}>{slot.time}</Text>
                          </View>

                          <View style={styles.scheduleRowDividerVertical} />

                          {/* Right: Subject, Class badge, Location & Tags */}
                          <View style={styles.scheduleInfoCol}>
                            <View style={styles.slotMainRow}>
                              <Text
                                style={[styles.scheduleSubject, isMeal && styles.scheduleSubjectMeal]}
                                numberOfLines={1}
                              >
                                {slot.subject}
                              </Text>
                              <View
                                style={[
                                  styles.classBadge,
                                  is8C && styles.classBadge8C,
                                  isMeal && styles.classBadgeMeal,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.classBadgeText,
                                    is8C && styles.classBadgeText8C,
                                    isMeal && styles.classBadgeTextMeal,
                                  ]}
                                >
                                  {isMeal ? 'ALL' : slot.class}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.slotSubRow}>
                              <View style={styles.roomLocationTag}>
                                <Ionicons name="location-outline" size={11} color={COLORS.textLight} />
                                <Text style={styles.scheduleRoom}>{slot.room}</Text>
                              </View>
                              {isMeal ? (
                                <View style={styles.intervalMiniPill}>
                                  <Text style={styles.intervalMiniPillText}>1 Hr Meal Break</Text>
                                </View>
                              ) : is8C ? (
                                <View style={styles.assignedMiniPill}>
                                  <Text style={styles.assignedMiniPillText}>Assigned Class</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </View>
                        {idx < todaySchedule.length - 1 && <View style={styles.scheduleRowDivider} />}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section Title */}
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>Assigned Classrooms</Text>
            <Text style={styles.sectionSub}>Mark daily attendance & meal counts</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>
              {assignedClasses.length} {assignedClasses.length === 1 ? 'Class' : 'Classes'}
            </Text>
          </View>
        </View>

        {/* Classes List */}
        {assignedClasses.map((item) => {
          const rec = attendanceRecords[item.id];
          const isDone = !!rec;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.classCard, isDone && styles.classCardDone]}
              onPress={() =>
                navigation.navigate('Attendance', {
                  classData: item,
                  teacher,
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.classCardLeft}>
                <View style={[styles.gradeBadge, isDone ? styles.gradeBadgeDone : styles.gradeBadgePending]}>
                  <Text style={[styles.gradeBadgeText, isDone ? styles.gradeTextDone : styles.gradeTextPending]}>
                    {item.grade}
                  </Text>
                  <Text style={[styles.sectionBadgeText, isDone ? styles.secTextDone : styles.secTextPending]}>
                    Sec {item.section}
                  </Text>
                </View>

                <View style={styles.classDetails}>
                  <Text style={styles.classLabel}>{item.label}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="people-outline" size={12} color={COLORS.textMedium} />
                    <Text style={styles.metaText}>{item.strength} Registered</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Ionicons name="time-outline" size={12} color={COLORS.textMedium} />
                    <Text style={styles.metaText}>{item.allocatedTime}</Text>
                  </View>

                  {/* Status Badging */}
                  {isDone ? (
                    <View style={styles.statusPillDone}>
                      <Ionicons name="checkmark-circle" size={12} color={COLORS.present} />
                      <Text style={styles.statusDoneText}>
                        Marked: {rec.presentCount} Present ({rec.synced ? 'Synced' : 'Saved Locally'})
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.statusPillPending}>
                      <Ionicons name="time" size={12} color={COLORS.warning} />
                      <Text style={styles.statusPendingText}>Attendance Required</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.arrowWrap}>
                <Ionicons
                  name={isDone ? 'create-outline' : 'chevron-forward'}
                  size={20}
                  color={isDone ? COLORS.primaryLight : COLORS.goldDark}
                />
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Interactive Bilingual Quotes Footer */}
        <TouchableOpacity
          style={styles.quoteFooterCard}
          onPress={handleNextQuote}
          activeOpacity={0.82}
        >
          <View style={styles.quoteTopRow}>
            <View style={styles.quoteBadge}>
              <Ionicons name="sparkles" size={13} color={COLORS.goldDark} />
              <Text style={styles.quoteBadgeText}>TEACHER INSPIRATION · शिक्षक प्रेरणा</Text>
            </View>
            <View style={styles.quoteShuffleBtn}>
              <Ionicons name="shuffle-outline" size={12} color={COLORS.goldDark} />
              <Text style={styles.quoteShuffleText}>Tap to change</Text>
            </View>
          </View>

          {/* Hindi Quote */}
          <Text style={styles.quoteHindiText}>
            "{POSHAN_QUOTES[quoteIdx].hindi}"
          </Text>

          {/* English Quote */}
          <Text style={styles.quoteEnglishText}>
            "{POSHAN_QUOTES[quoteIdx].english}"
          </Text>

          {/* Bottom Bar: Indicators + Author */}
          <View style={styles.quoteBottomRow}>
            <View style={styles.quoteIndicatorRow}>
              {POSHAN_QUOTES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.quoteDot,
                    i === quoteIdx && styles.quoteDotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.quoteAuthor}>
              {POSHAN_QUOTES[quoteIdx].author}
            </Text>
          </View>
        </TouchableOpacity>
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
  schoolSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: SIZES.radiusSm,
  },
  content: {
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMd,
    paddingBottom: 24,
  },
  teacherHeader: {
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 14,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMedium,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  teacherGreeting: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMedium,
    textAlign: 'center',
    lineHeight: 18,
  },
  teacherName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 28,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  sectionTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 22,
  },
  sectionSub: {
    fontSize: 11,
    color: COLORS.textMedium,
    marginTop: 1,
    lineHeight: 15,
  },
  countPill: {
    backgroundColor: COLORS.goldPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: 'rgba(191, 160, 80, 0.35)',
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.goldDark,
  },
  classCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  classCardDone: {
    borderColor: '#86EFAC',
    backgroundColor: '#F7FEFA',
  },
  classCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gradeBadge: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeBadgePending: {
    backgroundColor: COLORS.primaryPale,
    borderWidth: 1,
    borderColor: 'rgba(0, 77, 44, 0.2)',
  },
  gradeBadgeDone: {
    backgroundColor: COLORS.presentPale,
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.3)',
  },
  gradeBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  gradeTextPending: { color: COLORS.primaryDark },
  secTextPending: { color: COLORS.primaryLight },
  gradeTextDone: { color: COLORS.present },
  secTextDone: { color: COLORS.present },
  classDetails: {
    flex: 1,
    paddingRight: 4,
  },
  classLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textMedium,
    lineHeight: 15,
  },
  metaDot: {
    fontSize: 11,
    color: COLORS.textLight,
    marginHorizontal: 2,
  },
  statusPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: COLORS.offlineBg,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: SIZES.radiusFull,
  },
  statusPendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning,
    lineHeight: 14,
  },
  statusPillDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: COLORS.syncedBg,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: SIZES.radiusFull,
  },
  statusDoneText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.present,
    lineHeight: 14,
  },
  arrowWrap: {
    paddingLeft: 6,
  },
  // ---- Schedule styles ----
  scheduleSection: {
    marginBottom: 14,
  },
  scheduleCardBtn: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  scheduleCardBtnOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 1,
    borderColor: COLORS.gold,
  },
  scheduleCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scheduleCalendarBadge: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.goldPale,
    borderWidth: 1,
    borderColor: 'rgba(191, 160, 80, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleCalendarBadgeSub: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.goldDark,
    marginTop: 1,
    letterSpacing: 0.5,
  },
  scheduleDetails: {
    flex: 1,
    paddingRight: 4,
  },
  scheduleTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 20,
  },
  scheduleSubTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  badge8CTag: {
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: 'rgba(0, 77, 44, 0.2)',
  },
  badge8CTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.primaryDark,
    lineHeight: 13,
  },
  statusPillClosed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.goldPale,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: 'rgba(191, 160, 80, 0.35)',
  },
  statusClosedText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.goldDark,
    lineHeight: 13,
  },
  statusPillOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: 'rgba(0, 77, 44, 0.25)',
  },
  statusOpenText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.primaryDark,
    lineHeight: 13,
  },
  scheduleExpandedContainer: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: SIZES.radiusMd,
    borderBottomRightRadius: SIZES.radiusMd,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: COLORS.gold,
    padding: 8,
    ...SHADOWS.sm,
  },
  scheduleList: {
    overflow: 'hidden',
  },
  noSchoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.goldPale,
    borderRadius: SIZES.radiusMd,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,160,80,0.3)',
  },
  noSchoolText: {
    fontSize: 13,
    color: COLORS.textMedium,
    fontWeight: '600',
    flex: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: SIZES.radiusSm,
  },
  scheduleRowMeal: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: 'rgba(191, 160, 80, 0.35)',
    paddingHorizontal: 6,
  },
  scheduleTimeCol: {
    width: 76,
  },
  schedulePeriodText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    lineHeight: 13,
  },
  schedulePeriodMealText: {
    color: COLORS.goldDark,
  },
  scheduleTimeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: COLORS.textMedium,
    marginTop: 1,
    lineHeight: 13,
  },
  scheduleRowDividerVertical: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 8,
  },
  scheduleInfoCol: {
    flex: 1,
  },
  slotMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleSubject: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1,
    marginRight: 6,
    lineHeight: 16,
  },
  scheduleSubjectMeal: {
    color: COLORS.goldDark,
  },
  classBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classBadge8C: {
    backgroundColor: COLORS.primaryPale,
    borderColor: 'rgba(0, 77, 44, 0.3)',
  },
  classBadgeMeal: {
    backgroundColor: COLORS.goldPale,
    borderColor: 'rgba(191, 160, 80, 0.4)',
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textDark,
    lineHeight: 13,
  },
  classBadgeText8C: {
    color: COLORS.primaryDark,
  },
  classBadgeTextMeal: {
    color: COLORS.goldDark,
  },
  slotSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  roomLocationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  scheduleRoom: {
    fontSize: 10.5,
    color: COLORS.textLight,
    lineHeight: 14,
  },
  assignedMiniPill: {
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: SIZES.radiusFull,
  },
  assignedMiniPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: COLORS.primaryDark,
    lineHeight: 11,
  },
  intervalMiniPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: 'rgba(191, 160, 80, 0.3)',
  },
  intervalMiniPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: COLORS.goldDark,
    lineHeight: 11,
  },
  scheduleRowDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 1,
  },
  // ---- Quote Footer Styles ----
  quoteFooterCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginTop: 14,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  quoteTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quoteBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 0.5,
  },
  quoteShuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.goldPale,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
  },
  quoteShuffleText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.goldDark,
  },
  quoteHindiText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primaryDark,
    lineHeight: 18,
    marginTop: 6,
  },
  quoteEnglishText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMedium,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 2,
  },
  quoteBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  quoteIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginRight: 4,
  },
  quoteDotActive: {
    width: 12,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },
  quoteAuthor: {
    fontSize: 9.5,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});
