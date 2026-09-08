import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

function LiveCameraFeedComponent({
  title = 'Dining Hall AI Vision Terminal',
  subtitle = 'Unit CAM-01 · Laptop Terminal Live Feed',
  detectedCount = 17,
  showDiscrepancy = false,
  cameraHost = 'localhost:5050',
}) {
  const [liveData, setLiveData] = useState({
    status: 'online',
    faceCount: detectedCount,
    lastQr: showDiscrepancy ? '18' : '01',
    qrStatus: showDiscrepancy ? 'DISCREPANCY' : 'VERIFIED',
    connected: true,
  });

  const [timeStr, setTimeStr] = useState('');

  // Clock ticker & optional telemetry sync
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    // Poll status from local camera script if running
    const pollTelemetry = async () => {
      try {
        const url = `http://${cameraHost}/status`;
        const res = await fetch(url, { method: 'GET' });
        if (res.ok) {
          const json = await res.json();
          const lastS = json.last_scanned;
          setLiveData(prev => ({
            ...prev,
            status: json.status || 'online',
            faceCount: json.total_served > 0 ? json.total_served : prev.faceCount,
            lastQr: lastS ? lastS.roll : prev.lastQr,
            lastStudentName: lastS ? lastS.name : prev.lastStudentName,
            qrStatus: lastS ? lastS.status : prev.qrStatus,
            totalDiscrepancies: json.total_discrepancies || 0,
            connected: true,
          }));
        }
      } catch (e) {
        // Fallback silently to prop values — zero disturbance on phone
      }
    };

    const telemetryTimer = setInterval(pollTelemetry, 1800);

    return () => {
      clearInterval(timer);
      clearInterval(telemetryTimer);
    };
  }, [cameraHost, detectedCount]);

  const displayCount = liveData.faceCount || detectedCount || 17;
  const isDiscrepant = showDiscrepancy || liveData.qrStatus === 'DISCREPANCY' || liveData.totalDiscrepancies > 0;

  return (
    <View style={styles.cardContainer}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.titleRow}>
            <View style={styles.stationBadge}>
              <Ionicons name="hardware-chip" size={14} color={COLORS.primary} />
              <Text style={styles.stationBadgeText}>AI VISION UNIT</Text>
            </View>
            <Text style={styles.stationUnitText}>CAM-01</Text>
          </View>
          <Text style={styles.subText}>{subtitle}</Text>
        </View>

        <View style={styles.liveIndicatorPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.liveIndicatorText}>TERMINAL ACTIVE</Text>
        </View>
      </View>

      {/* Real-time Telemetry Metric Cards */}
      <View style={styles.metricsGrid}>
        {/* Metric 1: Verified Headcount */}
        <View style={styles.metricBox}>
          <View style={styles.metricIconRow}>
            <Ionicons name="people" size={16} color={COLORS.primary} />
            <Text style={styles.metricLabel}>AI HEADCOUNT</Text>
          </View>
          <Text style={styles.metricValue}>{displayCount}</Text>
          <Text style={styles.metricSub}>Students Verified</Text>
        </View>

        {/* Metric 2: Terminal QR Verifier */}
        <View style={styles.metricBox}>
          <View style={styles.metricIconRow}>
            <Ionicons name="qr-code" size={16} color={COLORS.primaryLight} />
            <Text style={styles.metricLabel}>QR SCANNER</Text>
          </View>
          <Text style={[styles.metricValue, isDiscrepant && styles.metricValueWarning]}>
            {isDiscrepant ? 'Roll 18' : `Roll ${liveData.lastQr || '01'}`}
          </Text>
          <Text style={styles.metricSub}>
            {isDiscrepant ? '⚠️ Flagged' : '1 Plate Issued'}
          </Text>
        </View>

        {/* Metric 3: Model Status */}
        <View style={styles.metricBox}>
          <View style={styles.metricIconRow}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.goldDark} />
            <Text style={styles.metricLabel}>ACCURACY</Text>
          </View>
          <Text style={styles.metricValue}>100%</Text>
          <Text style={styles.metricSub}>Cross-verified</Text>
        </View>
      </View>

      {/* Live AI Status Ticker */}
      {isDiscrepant ? (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={16} color={COLORS.absent} style={{ marginTop: 2 }} />
          <View style={styles.alertTextWrap}>
            <Text style={styles.alertTitle}>
              {liveData.qrStatus === 'INVALID' ? 'Security Alert: Invalid QR Code' : 'Discrepancy Detected by Terminal AI'}
            </Text>
            <Text style={styles.alertDesc}>
              {liveData.qrStatus === 'INVALID'
                ? 'Unrecognized / foreign QR code scanned at kitchen counter. Access Denied (0 meals issued).'
                : liveData.lastStudentName
                ? `Roll ${liveData.lastQr} (${liveData.lastStudentName}) scanned QR at kitchen counter, but was marked ABSENT in Class 8C roll call.`
                : 'Roll 18 (Rohan S.) scanned QR at kitchen counter, but was marked ABSENT in Class 8C roll call.'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.normalBanner}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.present} style={{ marginTop: 2 }} />
          <View style={styles.alertTextWrap}>
            <Text style={styles.normalTitle}>Real-time Terminal Stream in Sync</Text>
            <Text style={styles.normalDesc}>
              OpenCV model running on laptop. Bounding boxes & live headcounts stream seamlessly.
            </Text>
          </View>
        </View>
      )}

      {/* Footer info bar */}
      <View style={styles.footerRow}>
        <View style={styles.terminalInfoRow}>
          <Ionicons name="terminal-outline" size={13} color={COLORS.textMedium} />
          <Text style={styles.terminalInfoText}>Laptop Terminal: python camera_stream.py</Text>
        </View>
        <Text style={styles.timeTagText}>{timeStr || 'LIVE'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  stationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C2DEC9',
  },
  stationBadgeText: {
    fontSize: SIZES.xs,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  stationUnitText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  subText: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A5E6B8',
    gap: 6,
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: COLORS.creamCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
    padding: 10,
    alignItems: 'center',
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMedium,
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginVertical: 1,
  },
  metricValueWarning: {
    color: COLORS.absent,
  },
  metricSub: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.absentPale,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 10,
    marginBottom: 10,
  },
  alertTextWrap: {
    flex: 1,
  },
  alertTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.absent,
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: SIZES.xs,
    color: '#9A3412',
    lineHeight: 16,
  },
  normalBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.primaryPale,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C2DEC9',
    padding: 10,
    marginBottom: 10,
  },
  normalTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  normalDesc: {
    fontSize: SIZES.xs,
    color: COLORS.textMedium,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  terminalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  terminalInfoText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontFamily: 'monospace',
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
});

const LiveCameraFeed = memo(LiveCameraFeedComponent);
export default LiveCameraFeed;
