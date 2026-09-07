import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://cfwdgkxsybfgxlzazywy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n35XnEMidFODTwSNKeFYXQ_Yun9HALl';

const STORAGE_KEY = 'poshan_attendance_records';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates,return=representation',
};

function getNumericTimestamp(ts) {
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    if (!isNaN(parsed)) return parsed;
  }
  return Date.now();
}

/**
 * Save an attendance record locally AND push to Supabase Cloud
 */
export async function saveAttendanceRecord(record) {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const localRecords = stored ? JSON.parse(stored) : {};

    const classId = record.classId || record.id || '8C';
    const numTs = getNumericTimestamp(record.timestamp);

    const recordToSave = {
      ...record,
      classId,
      timestamp: numTs,
      synced: false,
    };
    localRecords[classId] = recordToSave;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localRecords));

    const payload = {
      id: classId,
      class_id: classId,
      class_name: record.className || '',
      total_students: Number(record.totalStudents) || 0,
      present_count: Number(record.presentCount) || 0,
      absent_count: Number(record.absentCount) || 0,
      expected_meals: Number(record.expectedMeals || record.presentCount) || 0,
      recorded_by: record.recordedBy || '',
      teacher_id: record.teacherId || '',
      timestamp: numTs,
      synced: true,
      attendance_map: record.attendanceMap || {},
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/attendance_records?on_conflict=id`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      recordToSave.synced = true;
      localRecords[classId] = recordToSave;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localRecords));
      return { success: true, synced: true };
    } else {
      const errText = await response.text();
      console.log('Supabase sync postponed (status):', response.status, errText);
      return { success: true, synced: false };
    }
  } catch (err) {
    console.log('Saved locally (network error):', err.message);
    return { success: true, synced: false };
  }
}

/**
 * Fetch all attendance records: merges Cloud data + local device data
 */
export async function fetchAttendanceRecords() {
  let localRecords = {};
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      localRecords = JSON.parse(stored);
    }
  } catch (e) {
    console.log('Local storage read error', e);
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/attendance_records?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const rows = await response.json();
      const cloudRecords = {};

      rows.forEach((row) => {
        cloudRecords[row.class_id] = {
          id: row.id,
          classId: row.class_id,
          className: row.class_name,
          totalStudents: row.total_students,
          presentCount: row.present_count,
          absentCount: row.absent_count,
          expectedMeals: row.expected_meals,
          recordedBy: row.recorded_by,
          teacherId: row.teacher_id,
          timestamp: Number(row.timestamp) || Date.now(),
          synced: true,
          attendanceMap: row.attendance_map,
        };
      });

      const merged = { ...localRecords, ...cloudRecords };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.log('Using local records (cloud fetch failed):', err.message);
  }

  return localRecords;
}

/**
 * Background auto-sync for any pending local records
 */
export async function syncPendingRecords() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const localRecords = JSON.parse(stored);
    let updated = false;

    for (const key of Object.keys(localRecords)) {
      const rec = localRecords[key];
      if (!rec.synced) {
        const classId = rec.classId || rec.id;
        const numTs = getNumericTimestamp(rec.timestamp);

        const payload = {
          id: classId,
          class_id: classId,
          class_name: rec.className || '',
          total_students: Number(rec.totalStudents) || 0,
          present_count: Number(rec.presentCount) || 0,
          absent_count: Number(rec.absentCount) || 0,
          expected_meals: Number(rec.expectedMeals || rec.presentCount) || 0,
          recorded_by: rec.recordedBy || '',
          teacher_id: rec.teacherId || '',
          timestamp: numTs,
          synced: true,
          attendance_map: rec.attendanceMap || {},
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance_records?on_conflict=id`, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          rec.synced = true;
          updated = true;
        }
      }
    }

    if (updated) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localRecords));
    }
  } catch (err) {
    console.log('Background sync error', err);
  }
}

/**
 * Sub-second WebSocket Realtime Connection for instant updates (<100ms)
 */
export function subscribeToRealtimeAttendance(onUpdate) {
  let ws = null;
  let isClosed = false;

  const connect = () => {
    if (isClosed) return;
    try {
      const wsUrl = `wss://cfwdgkxsybfgxlzazywy.supabase.co/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        const joinMsg = {
          topic: 'realtime:public:attendance_records',
          event: 'phx_join',
          payload: {
            config: {
              postgres_changes: [
                { event: '*', schema: 'public', table: 'attendance_records' }
              ]
            }
          },
          ref: '1'
        };
        ws.send(JSON.stringify(joinMsg));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'postgres_changes' || msg.event === 'INSERT' || msg.event === 'UPDATE' || msg.event === 'phx_reply') {
            onUpdate();
          }
        } catch (err) {}
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        if (!isClosed) {
          setTimeout(connect, 2000);
        }
      };
    } catch (e) {}
  };

  connect();

  return () => {
    isClosed = true;
    if (ws) {
      try { ws.close(); } catch (e) {}
    }
  };
}
