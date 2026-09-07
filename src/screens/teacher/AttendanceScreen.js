import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  TextInput,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { STUDENTS_BY_CLASS } from '../../data/mockData';
import { saveAttendanceRecord } from '../../services/supabaseService';

export default function AttendanceScreen({ route, navigation }) {
  const { classData, teacher, isOfflineMode } = route.params || {
    classData: { id: '8C', label: 'Class 8 - Section C', strength: 20 },
    teacher: { id: 'T101', name: 'Sunita Sharma' },
    isOfflineMode: false,
  };

  const rawStudents = STUDENTS_BY_CLASS[classData.id] || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [attendance, setAttendance] = useState({});
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Initialize attendance (default: all Present or load saved)
  useEffect(() => {
    const loadSavedOrInitial = async () => {
      try {
        const stored = await AsyncStorage.getItem('poshan_attendance_records');
        if (stored) {
          const records = JSON.parse(stored);
          const classRecord = records[classData.id];
          if (classRecord && classRecord.attendanceMap) {
            setAttendance(classRecord.attendanceMap);
            return;
          }
        }
        // Default initial state: all students marked Present for quick workflow
        const initialMap = {};
        rawStudents.forEach((s) => {
          initialMap[s.id] = 'P';
        });
        setAttendance(initialMap);
      } catch (err) {
        console.log('Error reading attendance', err);
      }
    };
    loadSavedOrInitial();
  }, [classData.id]);

  const toggleStatus = (studentId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const markAll = (status) => {
    const updated = {};
    rawStudents.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendance(updated);
  };

  const filteredStudents = rawStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.includes(searchQuery)
  );

  const presentCount = Object.values(attendance).filter((val) => val === 'P').length;
  const absentCount = rawStudents.length - presentCount;

  const handleSendToCoordinator = async () => {
    setSaving(true);
    const timestamp = new Date().toISOString();

    const record = {
      classId: classData.id,
      className: classData.label,
      totalStudents: rawStudents.length,
      presentCount,
      absentCount,
      expectedMeals: presentCount,
      recordedBy: teacher.name,
      teacherId: teacher.id,
      timestamp,
      synced: !isOfflineMode,
      attendanceMap: attendance,
    };

    try {
      const result = await saveAttendanceRecord(record);

      setSaving(false);
      setShowConfirmModal(false);

      const statusMsg = result.synced
        ? 'Attendance records have been synced to the Cloud & Meal Coordinator.'
        : 'Attendance records saved locally on device (pending cloud sync).';

      Alert.alert(
        result.synced ? 'Data Sent Successfully! 🚀' : 'Saved Locally 📱',
        `Class ${classData.label}: ${presentCount} Present, ${absentCount} Absent.\n\n${statusMsg}`,
        [
          {
            text: 'Stay on Screen',
            style: 'cancel',
          },
          {
            text: 'Return to Dashboard',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      setSaving(false);
      Alert.alert('Save Error', 'Could not save attendance records.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Top Header - Subtitle removed as requested */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerTitles}>
          <Text style={styles.headerClass}>{classData.label}</Text>
        </View>

        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>
            {isOfflineMode ? 'OFFLINE' : 'LIVE SYNC'}
          </Text>
        </View>
      </View>

      {/* Top Attendance Stats Bar (Enrolled, Present, Absent only - Meals to cook removed) */}
      <View style={styles.quotaBar}>
        <View style={styles.quotaCol}>
          <Text style={styles.quotaNum}>{rawStudents.length}</Text>
          <Text style={styles.quotaLabel}>ENROLLED</Text>
        </View>
        <View style={styles.quotaDivider} />
        <View style={styles.quotaCol}>
          <Text style={[styles.quotaNum, { color: COLORS.present }]}>{presentCount}</Text>
          <Text style={styles.quotaLabel}>PRESENT</Text>
        </View>
        <View style={styles.quotaDivider} />
        <View style={styles.quotaCol}>
          <Text style={[styles.quotaNum, { color: COLORS.absent }]}>{absentCount}</Text>
          <Text style={styles.quotaLabel}>ABSENT</Text>
        </View>
      </View>

      {/* Search & Batch Actions */}
      <View style={styles.controlsRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={COLORS.textMedium} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or roll no..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.batchBtn}
            onPress={() => markAll('P')}
            activeOpacity={0.7}
          >
            <Text style={styles.batchBtnText}>All Present</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.batchBtn, styles.batchBtnAbsent]}
            onPress={() => markAll('A')}
            activeOpacity={0.7}
          >
            <Text style={[styles.batchBtnText, { color: COLORS.absent }]}>All Absent</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Student List */}
      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isPresent = attendance[item.id] === 'P';

          return (
            <View style={[styles.studentCard, isPresent ? styles.cardPresent : styles.cardAbsent]}>
              <View style={styles.studentLeft}>
                <View style={[styles.rollCircle, isPresent ? styles.rollPresent : styles.rollAbsent]}>
                  <Text style={[styles.rollText, isPresent ? styles.rollTextP : styles.rollTextA]}>
                    {item.rollNo}
                  </Text>
                </View>

                <View style={styles.nameBlock}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <View style={styles.idChipRow}>
                    <Text style={styles.qrTag}>{item.qrCode}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.genderTag}>{item.gender === 'M' ? 'Boy' : 'Girl'}</Text>
                  </View>
                </View>
              </View>

              {/* Toggle Buttons: P / A */}
              <View style={styles.toggleGroup}>
                <TouchableOpacity
                  style={[styles.toggleBtn, isPresent ? styles.togglePActive : styles.toggleInactive]}
                  onPress={() => toggleStatus(item.id, 'P')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, isPresent ? styles.textActiveP : styles.textInactive]}>
                    P
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, !isPresent ? styles.toggleAActive : styles.toggleInactive]}
                  onPress={() => toggleStatus(item.id, 'A')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, !isPresent ? styles.textActiveA : styles.textInactive]}>
                    A
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom Floating Update Attendance Button */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomSummary}>
          <Text style={styles.bottomSummaryTitle}>
            Verified Present: <Text style={{ color: COLORS.present, fontWeight: '800' }}>{presentCount}</Text> / {rawStudents.length} Students
          </Text>
          <Text style={styles.bottomSummarySub}>
            Absent: {absentCount} • Tap Update to proceed
          </Text>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() => setShowConfirmModal(true)}
          activeOpacity={0.88}
        >
          <Ionicons name="checkmark-done-circle" size={18} color={COLORS.primaryDark} />
          <Text style={styles.submitBtnText}>Update Attendance</Text>
        </TouchableOpacity>
      </View>

      {/* Attendance Confirmation & Coordinator Dispatch Modal Dialog */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Badge & Heading */}
            <View style={styles.modalIconBadge}>
              <Ionicons name="clipboard" size={24} color={COLORS.primaryDark} />
            </View>
            <Text style={styles.modalTitle}>Update Attendance</Text>
            <Text style={styles.modalSubtitle}>{classData.label}</Text>

            {/* Attendance Summary Strip */}
            <View style={styles.modalStatsCard}>
              <View style={styles.modalStatCol}>
                <Text style={styles.modalStatNum}>{rawStudents.length}</Text>
                <Text style={styles.modalStatLabel}>ENROLLED</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStatCol}>
                <Text style={[styles.modalStatNum, { color: COLORS.present }]}>{presentCount}</Text>
                <Text style={styles.modalStatLabel}>PRESENT</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStatCol}>
                <Text style={[styles.modalStatNum, { color: COLORS.absent }]}>{absentCount}</Text>
                <Text style={styles.modalStatLabel}>ABSENT</Text>
              </View>
            </View>

            {/* Late Student Note */}
            <View style={styles.modalNoticeBox}>
              <Ionicons name="time-outline" size={18} color="#0D5A34" />
              <Text style={styles.modalNoticeText}>
                If any student appears late, tap <Text style={{ fontWeight: '800' }}>Edit</Text> to mark them as present before transmitting.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalBtnGroup}>
              <TouchableOpacity
                style={[styles.modalSendBtn, saving && styles.submitBtnDisabled]}
                onPress={handleSendToCoordinator}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.goldLight} />
                ) : (
                  <Ionicons name="paper-plane" size={16} color={COLORS.goldLight} />
                )}
                <Text style={styles.modalSendBtnText}>
                  {saving ? 'Transmitting...' : 'Send this data to the Meal Coordinator'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalEditBtn}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.7}
                disabled={saving}
              >
                <Ionicons name="create-outline" size={17} color={COLORS.textDark} />
                <Text style={styles.modalEditBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
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
  topHeader: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SIZES.paddingMd,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitles: {
    flex: 1,
  },
  headerClass: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  badgeWrap: {
    backgroundColor: 'rgba(191, 160, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: 'rgba(191, 160, 80, 0.4)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.goldLight,
    letterSpacing: 0.5,
  },
  quotaBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: SIZES.paddingMd,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quotaCol: {
    flex: 1,
    alignItems: 'center',
  },
  quotaDivider: {
    width: 1,
    height: 26,
    backgroundColor: COLORS.border,
  },
  quotaNum: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  quotaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  controlsRow: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingMd,
    paddingVertical: 10,
    gap: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  batchBtn: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  batchBtnAbsent: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  batchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.present,
  },
  listContent: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingMd,
    paddingBottom: 95,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1.5,
    ...SHADOWS.sm,
  },
  cardPresent: {
    borderColor: '#BBF7D0',
    backgroundColor: '#FAFDFB',
  },
  cardAbsent: {
    borderColor: '#FECACA',
    backgroundColor: '#FEFBFB',
  },
  studentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rollCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollPresent: {
    backgroundColor: COLORS.presentPale,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  rollAbsent: {
    backgroundColor: COLORS.absentPale,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rollText: {
    fontSize: 13,
    fontWeight: '800',
  },
  rollTextP: { color: COLORS.present },
  rollTextA: { color: COLORS.absent },
  nameBlock: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  idChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  qrTag: {
    fontSize: 10,
    color: COLORS.textLight,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dot: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  genderTag: {
    fontSize: 10,
    color: COLORS.textMedium,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: SIZES.radiusSm - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePActive: {
    backgroundColor: COLORS.present,
  },
  toggleAActive: {
    backgroundColor: COLORS.absent,
  },
  toggleInactive: {
    backgroundColor: 'transparent',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  textActiveP: {
    color: COLORS.white,
  },
  textActiveA: {
    color: COLORS.white,
  },
  textInactive: {
    color: COLORS.textMedium,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.paddingMd,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.lg,
  },
  bottomSummary: {
    flex: 1,
  },
  bottomSummaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  bottomSummarySub: {
    fontSize: 10,
    color: COLORS.textMedium,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: COLORS.gold,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  modalIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 77, 44, 0.15)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMedium,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  modalStatsCard: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatNum: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  modalStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  modalStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: COLORS.border,
  },
  modalNoticeBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: SIZES.radiusSm,
    padding: 10,
    gap: 8,
    marginBottom: 18,
  },
  modalNoticeText: {
    fontSize: 11,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
  },
  modalBtnGroup: {
    width: '100%',
    gap: 10,
  },
  modalSendBtn: {
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: SIZES.radiusMd,
    gap: 8,
    ...SHADOWS.sm,
  },
  modalSendBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldLight,
    textAlign: 'center',
  },
  modalEditBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: SIZES.radiusMd,
    gap: 6,
  },
  modalEditBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
});
