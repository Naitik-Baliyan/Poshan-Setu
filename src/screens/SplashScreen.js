import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 2. Gold line draws across
      Animated.timing(lineWidth, {
        toValue: 120,
        duration: 400,
        useNativeDriver: false,
      }),

      // 3. App name fades in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),

      // 4. Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),

      // 5. Hold for a moment
      Animated.delay(900),

      // 6. Fade out the whole screen
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#004D2C" />

      {/* Background top curve */}
      <View style={styles.topCurve} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../../assets/emblem.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Gold divider line */}
      <Animated.View style={[styles.divider, { width: lineWidth }]} />

      {/* App name */}
      <Animated.Text style={[styles.appName, { opacity: textOpacity }]}>
        <Text style={styles.appNamePoshan}>Poshan</Text>
        <Text style={styles.appNameSetu}>Setu</Text>
      </Animated.Text>

      {/* Devanagari */}
      <Animated.Text style={[styles.devanagari, { opacity: taglineOpacity }]}>
        पोषण सेतु
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Bridging Attendance to Nutrition
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#004D2C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  topCurve: {
    position: 'absolute',
    top: -height * 0.15,
    width: width * 1.5,
    height: height * 0.45,
    borderRadius: width * 0.75,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  logoWrapper: {
    width: 146,
    height: 146,
    borderRadius: 73,
    backgroundColor: '#FFFFFF',
    borderWidth: 3.5,
    borderColor: '#BFA050',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
    marginBottom: 24,
  },

  logo: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },

  divider: {
    height: 2,
    backgroundColor: '#BFA050',
    borderRadius: 2,
    marginBottom: 16,
  },

  appName: {
    fontSize: 36,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  appNamePoshan: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  appNameSetu: {
    color: '#BFA050',
    fontWeight: '700',
  },

  devanagari: {
    fontSize: 16,
    color: 'rgba(191,160,80,0.85)',
    fontWeight: '400',
    marginBottom: 10,
    letterSpacing: 1,
  },

  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
    letterSpacing: 0.3,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
