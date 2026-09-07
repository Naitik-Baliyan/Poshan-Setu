import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width * 0.72, 290);
const CARD_SPACING = 20;
const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;
const SIDE_INSET = (width - CARD_WIDTH) / 2;

const ROLES = [
  {
    id: 'teacher',
    title: 'Teacher',
    icon: 'school-outline',
    targetScreen: 'TeacherLogin',
  },
  {
    id: 'coordinator',
    title: 'Meal Coordinator',
    icon: 'restaurant-outline',
    targetScreen: 'CoordinatorLogin',
  },
  {
    id: 'admin',
    title: 'Administrator',
    icon: 'shield-checkmark-outline',
    targetScreen: 'AdminLogin',
  },
];

export default function SelectRoleScreen({ navigation }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  const scrollToIndex = (index) => {
    scrollRef.current?.scrollTo({
      x: index * SNAP_INTERVAL,
      animated: true,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.logoMedallion}>
          <Image
            source={require('../../assets/emblem.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.appTitle}>
          <Text style={styles.titlePoshan}>Poshan</Text>
          <Text style={styles.titleSetu}>Setu</Text>
        </Text>
        <Text style={styles.devanagariSubtitle}>पोषण सेतु</Text>
      </View>

      {/* Main Cream Area */}
      <View style={styles.container}>
        <View style={styles.titleWrapper}>
          <Text style={styles.sectionHeading}>Select Your Role</Text>
          <Text style={styles.sectionSubheading}>Swipe to choose your portal</Text>
        </View>

        {/* 3D Horizontal Native Animated Carousel */}
        <View style={styles.carouselContainer}>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="center"
            contentContainerStyle={styles.scrollContent}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            bounces={true}
            overScrollMode="never"
          >
            {ROLES.map((role, index) => {
              const inputRange = [
                (index - 1) * SNAP_INTERVAL,
                index * SNAP_INTERVAL,
                (index + 1) * SNAP_INTERVAL,
              ];

              // 3D Scale & Elevation
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.88, 1.04, 0.88],
                extrapolate: 'clamp',
              });

              // 3D Perspective Rotation
              const rotateY = scrollX.interpolate({
                inputRange,
                outputRange: ['18deg', '0deg', '-18deg'],
                extrapolate: 'clamp',
              });

              // Vertical 3D floating lift
              const translateY = scrollX.interpolate({
                inputRange,
                outputRange: [12, -8, 12],
                extrapolate: 'clamp',
              });

              // Opacity gradient for background cards
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.65, 1, 0.65],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={role.id}
                  style={[
                    styles.cardWrapper,
                    {
                      opacity,
                      transform: [
                        { perspective: 900 },
                        { scale },
                        { rotateY },
                        { translateY },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.roleCard3D}
                    onPress={() => navigation.navigate(role.targetScreen)}
                    activeOpacity={0.92}
                  >
                    {/* 3D Embossed Icon Medallion */}
                    <View style={styles.iconMedallion3D}>
                      <Ionicons
                        name={role.icon}
                        size={48}
                        color={COLORS.primaryDark}
                      />
                    </View>

                    {/* Gold Divider Bar */}
                    <View style={styles.goldDivider} />

                    {/* Role Title */}
                    <Text style={styles.roleTitle}>{role.title}</Text>

                    {/* 3D Tactile Action Button */}
                    <View style={styles.actionBtn3D}>
                      <Text style={styles.actionBtnText}>Select Role</Text>
                      <View style={styles.arrowBadge}>
                        <Ionicons
                          name="arrow-forward"
                          size={15}
                          color={COLORS.primaryDark}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
        </View>

        {/* Fluid 3D Pagination Indicator */}
        <View style={styles.paginationRow}>
          {ROLES.map((_, idx) => {
            const dotInputRange = [
              (idx - 1) * SNAP_INTERVAL,
              idx * SNAP_INTERVAL,
              (idx + 1) * SNAP_INTERVAL,
            ];

            const dotScaleX = scrollX.interpolate({
              inputRange: dotInputRange,
              outputRange: [1, 3.2, 1],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange: dotInputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });

            return (
              <TouchableOpacity
                key={idx}
                onPress={() => scrollToIndex(idx)}
                activeOpacity={0.7}
                style={styles.dotTouchArea}
              >
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      opacity: dotOpacity,
                      transform: [{ scaleX: dotScaleX }],
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  header: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: COLORS.gold,
  },
  logoMedallion: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.creamCard,
    borderWidth: 2.5,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  logoImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  appTitle: {
    fontSize: 24,
    letterSpacing: 0.8,
  },
  titlePoshan: {
    color: COLORS.white,
    fontWeight: '800',
  },
  titleSetu: {
    color: COLORS.gold,
    fontWeight: '800',
  },
  devanagariSubtitle: {
    fontSize: 12,
    color: COLORS.goldLight,
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  titleWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  sectionSubheading: {
    fontSize: 12,
    color: COLORS.textMedium,
    marginTop: 3,
  },
  carouselContainer: {
    height: 330,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: SIDE_INSET - CARD_SPACING / 2,
    alignItems: 'center',
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_SPACING / 2,
  },
  roleCard3D: {
    width: '100%',
    height: 300,
    backgroundColor: '#FFFDF9',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#E2D5BA',
    borderBottomWidth: 6,
    borderBottomColor: '#CBBBA0',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 18,
    shadowColor: '#002B19',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  iconMedallion3D: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F7F2E7',
    borderWidth: 3,
    borderColor: COLORS.gold,
    borderBottomWidth: 5,
    borderBottomColor: COLORS.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#002B19',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  goldDivider: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
    marginTop: 6,
    marginBottom: 2,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  actionBtn3D: {
    width: '100%',
    height: 50,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.primaryDark,
    borderBottomWidth: 4,
    borderBottomColor: '#002414',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#002B19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.4,
  },
  arrowBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  dotTouchArea: {
    padding: 6,
  },
  dot: {
    width: 9,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryDark,
  },
});
