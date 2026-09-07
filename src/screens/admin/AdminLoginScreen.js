import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { ADMINISTRATORS, SCHOOL_INFO } from '../../data/mockData';

export default function AdminLoginScreen({ navigation }) {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setError('');
    const cleanId = adminId.trim().toUpperCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setError('Please enter your Admin ID and Password to continue.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const admin = ADMINISTRATORS.find(
        (a) => a.id.toUpperCase() === cleanId && (a.pin === cleanPass || a.password === cleanPass)
      );

      if (admin) {
        setLoading(false);
        navigation.replace('AdminDashboard', { admin });
      } else {
        setLoading(false);
        setError('Invalid Admin ID or Password. Please check and try again.');
      }
    }, 450);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top Nav Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('SelectRole')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            <Text style={styles.backBtnText}>Change Role</Text>
          </TouchableOpacity>

          <View style={styles.roleTag}>
            <Ionicons name="shield-checkmark" size={13} color={COLORS.gold} />
            <Text style={styles.roleTagText}>ADMIN PORTAL</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Dark Header Band */}
          <View style={styles.headerBand}>
            <Text style={styles.schoolName} numberOfLines={1}>
              {SCHOOL_INFO.name}
            </Text>
            <Text style={styles.schoolUdise}>{SCHOOL_INFO.udiseCode}</Text>

            {/* Admin Portal Badge */}
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.gold} />
              <Text style={styles.adminBadgeText}>Principal & Administrative Oversight Portal</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Welcome Heading */}
            <Text style={styles.welcomeText}>Welcome!</Text>
            <Text style={styles.signinLabel}>Administrator Sign In</Text>

            <View style={styles.divider} />

            {/* Admin ID Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Admin ID</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="card-outline"
                  size={18}
                  color={COLORS.primaryLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter the ID assigned to you"
                  placeholderTextColor={COLORS.textLight}
                  value={adminId}
                  onChangeText={(t) => { setAdminId(t); setError(''); }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                  underlineColorAndroid="transparent"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={COLORS.primaryLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  underlineColorAndroid="transparent"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={COLORS.textMedium}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={15} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.88}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.loginBtnText}>Verifying...</Text>
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Sign In</Text>
                  <View style={styles.loginArrow}>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.primaryDark} />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Audit Trail · Biometric Sync · Meal Distribution
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Nav Bar
  navBar: {
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.paddingMd,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(191,160,80,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: 'rgba(191,160,80,0.35)',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.goldLight,
    letterSpacing: 0.6,
  },

  // Scroll
  scrollContent: {
    flexGrow: 1,
  },

  // Header Band
  headerBand: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SIZES.paddingLg,
    paddingTop: 20,
    paddingBottom: 34,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.gold,
    alignItems: 'center',
  },
  schoolName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  schoolUdise: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
    letterSpacing: 0.4,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    backgroundColor: 'rgba(191, 160, 80, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: 'rgba(191, 160, 80, 0.3)',
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.goldLight,
    letterSpacing: 0.3,
  },

  // Form Card
  card: {
    backgroundColor: COLORS.creamCard,
    marginHorizontal: SIZES.paddingMd,
    marginTop: -16,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.paddingLg,
    borderWidth: 1.5,
    borderColor: COLORS.creamBorder,
    ...SHADOWS.md,
  },
  welcomeText: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  signinLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 18,
  },

  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    backgroundColor: '#FAFAF8',
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: SIZES.radiusSm,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '600',
    flex: 1,
  },

  // Sign In Button
  loginBtn: {
    backgroundColor: COLORS.gold,
    height: 52,
    borderRadius: SIZES.radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    ...SHADOWS.sm,
  },
  loginBtnDisabled: {
    opacity: 0.65,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.4,
  },
  loginArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,77,44,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMedium,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
