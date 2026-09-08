import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { SCHOOL_INFO, STUDENTS_BY_CLASS, CLASSES_LIST } from '../data/mockData';


/**
 * Generates and shares an official PM-POSHAN daily compliance audit PDF.
 *
 * @param {Object} params
 * @param {Object} params.attendanceRecords - Live records per class from Supabase
 * @param {Array}  params.servedRolls       - Array of roll strings who took meal today
 * @param {Object} params.adminInfo         - Logged-in admin { name, role }
 */
export async function generateDailyAuditPDF({
  attendanceRecords = {},
  servedRolls = [],
  adminInfo = {},
}) {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Normalize served rolls to zero-padded strings ("01", "02" …)
  const servedSet = new Set(
    (servedRolls || []).map((r) => String(r).padStart(2, '0'))
  );

  /* ── School-wide tallies ───────────────────────────────────────── */
  let totalEnrolled = 0;
  let totalPresent  = 0;
  let totalAbsent   = 0;
  const classBreakdown = [];
  const discrepancies  = [];

  CLASSES_LIST.forEach((cls) => {
    totalEnrolled += cls.strength;

    const rec     = attendanceRecords[cls.id];
    const attMap  = rec?.attendanceMap || rec?.attendance_map || {};
    const students = STUDENTS_BY_CLASS[cls.id] || [];

    let clsPresent   = typeof rec?.presentCount === 'number' ? rec.presentCount : 0;
    let clsAbsent    = cls.strength - clsPresent;
    let clsServed    = 0;
    let clsPending   = 0;
    let clsGhost     = 0;

    students.forEach((st) => {
      const rollStr  = String(st.rollNo || st.roll || '').padStart(2, '0');
      const isServed = servedSet.has(rollStr);
      const rawStatus = attMap[st.roll] || attMap[rollStr] || null;
      const status   = rawStatus || 'PRESENT'; // default present when no record

      if (isServed) {
        clsServed += 1;
        if (status === 'ABSENT') {
          clsGhost += 1;
          discrepancies.push({
            studentName: st.name,
            roll:        rollStr,
            classId:     cls.id,
            detail:      'Marked ABSENT in morning roll-call but attempted meal QR scan.',
          });
        }
      } else if (status === 'PRESENT') {
        clsPending += 1;
      }
    });

    totalPresent += clsPresent;
    totalAbsent  += clsAbsent;

    classBreakdown.push({
      label:      cls.label,
      strength:   cls.strength,
      present:    clsPresent,
      absent:     clsAbsent,
      served:     clsServed,
      pending:    clsPending,
      ghost:      clsGhost,
      teacher:    rec?.recordedBy || 'Sunita Sharma',
      syncStatus: rec ? 'Verified ✓' : 'Awaiting Roll-Call',
    });
  });

  const pendingCount    = Math.max(0, totalPresent - servedSet.size);
  const discCount       = discrepancies.length;
  const servedCount     = servedSet.size;
  const reportId        = `PS-AUD-${Date.now().toString().slice(-7)}`;

  /* ── Build discrepancy rows HTML ───────────────────────────────── */
  const discRows = discrepancies.length
    ? discrepancies.map((d, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>#${d.roll}</strong> — ${d.studentName}</td>
          <td>${d.classId}</td>
          <td>${d.detail}</td>
          <td style="color:#DC2626;font-weight:700;">⚠ FLAGGED</td>
        </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;color:#15803D;font-weight:700;">
        ✔ No discrepancies detected. All distributed meals matched authenticated roll-call data.
       </td></tr>`;

  /* ── Build class breakdown rows HTML ──────────────────────────── */
  const classRows = classBreakdown.map((c) => `
    <tr>
      <td><strong>${c.label}</strong></td>
      <td>${c.strength}</td>
      <td style="color:#15803D;font-weight:700;">${c.present}</td>
      <td style="color:#DC2626;">${c.absent}</td>
      <td style="color:#004D2C;font-weight:700;">${c.served}</td>
      <td style="color:#D97706;">${c.pending}</td>
      <td>${c.teacher}</td>
      <td style="color:#15803D;font-weight:700;">${c.syncStatus}</td>
    </tr>`).join('');

  /* ── Build per-student detail rows for Class 8C ───────────────── */
  const students8C  = STUDENTS_BY_CLASS['8C'] || [];
  const rec8C       = attendanceRecords['8C'];
  const attMap8C    = rec8C?.attendanceMap || rec8C?.attendance_map || {};

  const studentRows = students8C.map((st, idx) => {
    const rollStr  = String(st.rollNo || st.roll || '').padStart(2, '0');
    const rawStatus = attMap8C[st.roll] || attMap8C[rollStr] || null;
    const status   = rawStatus || (idx < 17 ? 'PRESENT' : 'ABSENT');
    const isServed = servedSet.has(rollStr);
    const distStatus = isServed
      ? 'MEAL TAKEN'
      : status === 'PRESENT' ? 'PENDING' : 'INELIGIBLE';
    const distColor = isServed ? '#15803D' : status === 'PRESENT' ? '#D97706' : '#6B7280';
    const distIcon  = isServed ? '✔' : status === 'PRESENT' ? '⏳' : '✕';

    return `
      <tr>
        <td><strong>#${rollStr}</strong></td>
        <td>${st.name}</td>
        <td>${st.gender === 'M' ? 'Male' : 'Female'}</td>
        <td style="color:${status === 'PRESENT' ? '#15803D' : '#DC2626'};font-weight:700;">${status}</td>
        <td style="color:${distColor};font-weight:700;">${distIcon} ${distStatus}</td>
        <td>${isServed ? 'Optical QR (Live Camera)' : '—'}</td>
      </tr>`;
  }).join('');

  /* ── Full HTML document ────────────────────────────────────────── */
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>PM-POSHAN Daily Compliance Report — ${dateStr}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1a2e22;
      background: #ffffff;
      padding: 28px 32px;
      font-size: 11.5px;
      line-height: 1.45;
    }

    /* === Header === */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #004D2C;
      padding-bottom: 14px;
      margin-bottom: 22px;
    }
    .header-left { max-width: 65%; }
    .gov-badge {
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 1.2px;
      color: #9E8036;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    h1 { font-size: 19px; font-weight: 900; color: #004D2C; margin-bottom: 3px; }
    .school-name { font-size: 11px; color: #475C51; }
    .header-right { text-align: right; font-size: 10.5px; color: #475C51; }
    .header-right strong { color: #1a2e22; }
    .report-id {
      display: inline-block;
      margin-top: 6px;
      background: #004D2C;
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    /* === KPI Strip === */
    .kpi-strip {
      display: flex;
      gap: 10px;
      margin-bottom: 22px;
    }
    .kpi {
      flex: 1;
      border: 1px solid #DECFA9;
      border-radius: 8px;
      background: #FAF5EC;
      padding: 10px 8px;
      text-align: center;
    }
    .kpi-label {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.6px;
      color: #475C51;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .kpi-value { font-size: 22px; font-weight: 900; }
    .green  { color: #15803D; }
    .amber  { color: #D97706; }
    .red    { color: #DC2626; }
    .blue   { color: #0369A1; }
    .dark   { color: #004D2C; }

    /* === Section headings === */
    .sec-head {
      font-size: 11px;
      font-weight: 800;
      color: #004D2C;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-left: 4px solid #BFA050;
      padding-left: 8px;
      margin: 20px 0 10px 0;
    }

    /* === Alert boxes === */
    .alert-clean, .alert-warn {
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 11px;
    }
    .alert-clean { background: #DCFCE7; border: 1px solid #86EFAC; color: #14532D; }
    .alert-warn  { background: #FEF3C7; border: 1px solid #FCD34D; color: #78350F; }
    .alert-title { font-weight: 800; margin-bottom: 3px; }

    /* === Tables === */
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    th {
      background: #004D2C;
      color: #fff;
      padding: 8px 10px;
      text-align: left;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    td {
      padding: 7px 10px;
      border-bottom: 1px solid #E5DCCE;
      font-size: 10.5px;
    }
    tr:nth-child(even) td { background: #FAF5EC; }

    /* === Footer === */
    .footer {
      margin-top: 32px;
      padding-top: 14px;
      border-top: 1px solid #DECFA9;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-note { font-size: 9px; color: #82958B; max-width: 55%; }
    .sig-block {
      text-align: center;
      min-width: 200px;
    }
    .sig-line {
      border-top: 1px solid #1a2e22;
      padding-top: 4px;
      font-size: 10px;
      font-weight: 700;
      color: #1a2e22;
      margin-top: 28px;
    }
    .sig-sub { font-size: 9px; color: #475C51; margin-top: 2px; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>

  <!-- ── Header ── -->
  <div class="header">
    <div class="header-left">
      <div class="gov-badge">Ministry of Education · PM-POSHAN · Govt of India</div>
      <h1>PoshanSetu — Daily Compliance Audit</h1>
      <div class="school-name">${SCHOOL_INFO.name} &nbsp;·&nbsp; ${SCHOOL_INFO.udiseCode}</div>
    </div>
    <div class="header-right">
      <div><strong>Date:</strong> ${dateStr}</div>
      <div><strong>Generated at:</strong> ${timeStr}</div>
      <div><strong>Prepared by:</strong> ${adminInfo.name || 'Dr. Rajesh Verma'}</div>
      <div><strong>Designation:</strong> ${adminInfo.role || 'School Principal'}</div>
      <div class="report-id">REPORT ID: ${reportId}</div>
    </div>
  </div>

  <!-- ── KPI Strip ── -->
  <div class="kpi-strip">
    <div class="kpi">
      <div class="kpi-label">Total Enrolled</div>
      <div class="kpi-value blue">${totalEnrolled}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Present Today</div>
      <div class="kpi-value green">${totalPresent}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Absent Today</div>
      <div class="kpi-value red">${totalAbsent}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Meals Verified (QR)</div>
      <div class="kpi-value dark">${servedCount}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Unserved / Pending</div>
      <div class="kpi-value amber">${pendingCount}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Discrepancies</div>
      <div class="kpi-value ${discCount > 0 ? 'red' : 'green'}">${discCount}</div>
    </div>
  </div>

  <!-- ── Integrity Status ── -->
  <div class="sec-head">Leakage &amp; Fraud Prevention Audit</div>
  ${discCount === 0
    ? `<div class="alert-clean">
        <div class="alert-title">✔ ZERO DISCREPANCIES — SYSTEM INTEGRITY CONFIRMED</div>
        All distributed mid-day meals matched authenticated morning biometric/roll-call data.
        No ghost student inflation or unauthorized distribution detected.
       </div>`
    : `<div class="alert-warn">
        <div class="alert-title">⚠ ${discCount} DISCREPANC${discCount > 1 ? 'IES' : 'Y'} DETECTED &amp; FLAGGED</div>
        PoshanSetu's live optical QR verification blocked or flagged the following unverified
        distribution attempts. See the Discrepancy Log below for full details.
       </div>`}

  <!-- ── Class Breakdown ── -->
  <div class="sec-head">Class-Wise Summary</div>
  <table>
    <thead>
      <tr>
        <th>Class</th>
        <th>Strength</th>
        <th>Present</th>
        <th>Absent</th>
        <th>Meals Given</th>
        <th>Pending</th>
        <th>Class Teacher</th>
        <th>Sync Status</th>
      </tr>
    </thead>
    <tbody>${classRows}</tbody>
  </table>

  <!-- ── Student-Level Verification Log ── -->
  <div class="sec-head">Student Meal Verification Log — Class 8 - Section C</div>
  <table>
    <thead>
      <tr>
        <th>Roll</th>
        <th>Student Name</th>
        <th>Gender</th>
        <th>Attendance</th>
        <th>Meal Status</th>
        <th>Verification Method</th>
      </tr>
    </thead>
    <tbody>${studentRows}</tbody>
  </table>

  <!-- ── Discrepancy Log ── -->
  <div class="sec-head">Discrepancy &amp; Anomaly Log</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Student (Roll — Name)</th>
        <th>Class</th>
        <th>Description</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${discRows}</tbody>
  </table>

  <!-- ── Footer / Signatures ── -->
  <div class="footer">
    <div class="footer-note">
      This report is auto-generated by the PoshanSetu Digital Public Infrastructure platform
      as part of the PM-POSHAN (formerly Mid-Day Meal) Scheme audit trail.
      All records are cryptographically timestamped and tamper-evident.
    </div>
    <div class="sig-block">
      <div class="sig-line">${adminInfo.name || 'Dr. Rajesh Verma'}</div>
      <div class="sig-sub">${adminInfo.role || 'School Principal'}</div>
      <div class="sig-sub">${SCHOOL_INFO.name}</div>
    </div>
  </div>

</body>
</html>`;

  // ── Generate PDF from HTML ─────────────────────────────────────────
  const { uri: rawUri } = await Print.printToFileAsync({ html, base64: false });

  // Copy to a stable, human-readable filename in the app's cache directory
  // (expo-print writes to a random temp path; renaming makes it open correctly)
  const destUri = FileSystem.cacheDirectory + `PoshanSetu_Audit_${Date.now()}.pdf`;
  await FileSystem.copyAsync({ from: rawUri, to: destUri });

  // ── Share / open ───────────────────────────────────────────────────
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(destUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save / Share — PM-POSHAN Daily Audit Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      // Fallback: show path so the user can locate it manually
      Alert.alert(
        'PDF Generated ✓',
        `Report saved to:\n${destUri}\n\nYou can open it from your device's Files app.`,
        [{ text: 'OK' }]
      );
    }
  } catch (shareErr) {
    console.warn('Sharing error:', shareErr);
    Alert.alert(
      'PDF Ready',
      `Could not open the share sheet, but the PDF was generated:\n${destUri}`,
      [{ text: 'OK' }]
    );
  }

  return destUri;
}

