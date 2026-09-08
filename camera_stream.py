import cv2
import time
import json
import threading
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

# Audio beep support for Windows
try:
    import winsound
    def play_beep(sound_type="success"):
        def _sound():
            try:
                if sound_type in ("alarm", "discrepancy"):
                    winsound.Beep(480, 160)
                    time.sleep(0.05)
                    winsound.Beep(360, 250)
                elif sound_type == "invalid":
                    winsound.Beep(320, 180)
                    time.sleep(0.04)
                    winsound.Beep(260, 260)
                elif sound_type == "duplicate":
                    winsound.Beep(750, 100)
                    time.sleep(0.06)
                    winsound.Beep(750, 120)
                else:  # success
                    winsound.Beep(1300, 140)
            except Exception:
                pass
        threading.Thread(target=_sound, daemon=True).start()
except ImportError:
    def play_beep(sound_type="success"):
        pass

# ─────────────────────────────────────────────────────────────
#  PoshanSetu QR Meal Authentication Engine (SIH 2026)
#  • Fast OpenCV QR Detector with HUD Viewfinder
#  • Anti-Fraud Verification against Morning Attendance Roster
#  • Rejection of Unregistered / Random Foreign QR Codes
#  • Duplicate Scan Prevention (No Double Dipping)
#  • Real-time Audio Beep & Visual Status Feedback
#  • Telemetry Sync API for Mobile Dashboard
# ─────────────────────────────────────────────────────────────

BANNER_H = 54
FOOTER_H = 40

# Colors (BGR)
C_GREEN     = (50, 220, 80)
C_RED       = (60, 60, 230)
C_GOLD      = (80, 190, 240)
C_CYAN      = (220, 200, 30)
C_WHITE     = (245, 245, 245)
C_DARK      = (18, 18, 18)
C_DARKBG    = (14, 20, 28)
C_BORDER    = (50, 70, 90)

# Student Database for Verification (Class 8C Roster)
STUDENT_REGISTRY = {
    "PS-8C-01": {"roll": "01", "name": "Naitik Baliyan",    "status": "PRESENT", "initials": "NB", "color": (44, 77, 0)},
    "PS-8C-02": {"roll": "02", "name": "Anshika Malik",     "status": "PRESENT", "initials": "AM", "color": (54, 128, 158)},
    "PS-8C-03": {"roll": "03", "name": "Shagun Jaggi",      "status": "PRESENT", "initials": "SJ", "color": (60, 107, 0)},
    "PS-8C-04": {"roll": "04", "name": "Aryan Choudhary",   "status": "PRESENT", "initials": "AC", "color": (61, 128, 21)},
    "PS-8C-05": {"roll": "05", "name": "Puneet Choudhary",  "status": "PRESENT", "initials": "PC", "color": (44, 77, 0)},
    "PS-8C-06": {"roll": "06", "name": "Omeshwar Goswami",  "status": "PRESENT", "initials": "OG", "color": (80, 160, 191)},
    "PS-8C-07": {"roll": "07", "name": "Priya Kumari",      "status": "ABSENT",  "initials": "PK", "color": (50, 70, 90)},
    "PS-8C-08": {"roll": "08", "name": "Rahul Gupta",       "status": "ABSENT",  "initials": "RG", "color": (50, 70, 90)},
    "PS-8C-09": {"roll": "09", "name": "Sneha Patel",       "status": "ABSENT",  "initials": "SP", "color": (50, 70, 90)},
    "PS-8C-10": {"roll": "10", "name": "Karan Singh",       "status": "ABSENT",  "initials": "KS", "color": (50, 70, 90)},
    "PS-8C-11": {"roll": "11", "name": "Ananya Rao",        "status": "ABSENT",  "initials": "AR", "color": (50, 70, 90)},
    "PS-8C-12": {"roll": "12", "name": "Mohit Joshi",       "status": "ABSENT",  "initials": "MJ", "color": (50, 70, 90)},
    "PS-8C-13": {"roll": "13", "name": "Divya Nair",        "status": "ABSENT",  "initials": "DN", "color": (50, 70, 90)},
    "PS-8C-14": {"roll": "14", "name": "Arjun Meena",       "status": "ABSENT",  "initials": "AM", "color": (50, 70, 90)},
    "PS-8C-15": {"roll": "15", "name": "Kavya Pillai",      "status": "ABSENT",  "initials": "KP", "color": (50, 70, 90)},
    "PS-8C-16": {"roll": "16", "name": "Vikas Maurya",      "status": "ABSENT",  "initials": "VM", "color": (50, 70, 90)},
    "PS-8C-17": {"roll": "17", "name": "Pooja Vishwakarma", "status": "ABSENT",  "initials": "PV", "color": (50, 70, 90)},
    "PS-8C-18": {"roll": "18", "name": "Rohan Sharma",      "status": "ABSENT",  "initials": "RS", "color": (12, 65, 194)},
    "PS-8C-19": {"roll": "19", "name": "Nisha Soni",        "status": "ABSENT",  "initials": "NS", "color": (50, 70, 90)},
    "PS-8C-20": {"roll": "20", "name": "Suresh Yadav",      "status": "ABSENT",  "initials": "SY", "color": (50, 70, 90)},
}

# Live sync from Supabase Cloud to update student status dynamically
def sync_attendance_from_cloud():
    while True:
        try:
            import urllib.request, json
            url = "https://cfwdgkxsybfgxlzazywy.supabase.co/rest/v1/attendance_records?id=eq.8C"
            headers = {
                'apikey': 'sb_publishable_n35XnEMidFODTwSNKeFYXQ_Yun9HALl',
                'Authorization': 'Bearer sb_publishable_n35XnEMidFODTwSNKeFYXQ_Yun9HALl',
            }
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=4) as resp:
                recs = json.loads(resp.read().decode())
                if recs:
                    att = recs[0].get('attendance_map') or {}
                    with state_lock:
                        for s_id, s_info in STUDENT_REGISTRY.items():
                            if s_id in att:
                                s_info["status"] = "PRESENT" if att[s_id] == "P" else "ABSENT"
        except Exception:
            pass
        time.sleep(4)

threading.Thread(target=sync_attendance_from_cloud, daemon=True).start()

# Shared State
app_state = {
    "served_students": set(),
    "last_scanned_student": None,
    "last_scan_status": "NONE",  # 'VERIFIED' | 'DISCREPANCY' | 'DUPLICATE' | 'INVALID'
    "last_scan_time": 0,
    "last_scan_is_discrepancy": False,
    "last_scan_is_invalid": False,
    "last_scan_is_duplicate": False,
    "total_served": 0,
    "total_discrepancies": 0,
    "latest_jpeg": None,
}
state_lock = threading.Lock()


def sync_to_supabase(roll, name, is_discrepancy, scan_status="VERIFIED"):
    def _worker():
        try:
            import urllib.request, json
            url = "https://cfwdgkxsybfgxlzazywy.supabase.co/rest/v1/attendance_records?id=eq.8C"
            headers = {
                'apikey': 'sb_publishable_n35XnEMidFODTwSNKeFYXQ_Yun9HALl',
                'Authorization': 'Bearer sb_publishable_n35XnEMidFODTwSNKeFYXQ_Yun9HALl',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=3) as resp:
                recs = json.loads(resp.read().decode())
                if recs:
                    rec = recs[0]
                    att = rec.get('attendance_map') or {}
                    with state_lock:
                        served_list = list(app_state["served_students"])
                    # Only valid served rolls count in _served_rolls
                    att["_served_rolls"] = served_list
                    att["_last_scan"] = {
                        "roll": roll,
                        "name": name,
                        "is_discrepancy": is_discrepancy,
                        "is_invalid": (scan_status == "INVALID"),
                        "is_duplicate": (scan_status == "DUPLICATE"),
                        "status": scan_status,
                        "timestamp": time.time()
                    }
                    body = json.dumps({
                        "attendance_map": att,
                        "timestamp": int(time.time() * 1000)
                    }).encode()
                    patch_req = urllib.request.Request(url, data=body, headers=headers, method='PATCH')
                    with urllib.request.urlopen(patch_req, timeout=3) as p_resp:
                        pass
        except Exception:
            pass
    threading.Thread(target=_worker, daemon=True).start()


def reset_supabase_served():
    def _worker():
        try:
            import urllib.request, json
            url = "https://cfwdgkxsybfgxlzazywy.supabase.co/rest/v1/attendance_records?id=eq.8C"
            headers = {
                'apikey': 'sb_publishable_n35XnEMidFODTwSNKeFYXQ_Yun9HALl',
                'Authorization': 'Bearer sb_publishable_n35XnEMidFODTwSNKeFYXQ_Yun9HALl',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=3) as resp:
                recs = json.loads(resp.read().decode())
                if recs:
                    rec = recs[0]
                    att = rec.get('attendance_map') or {}
                    att["_served_rolls"] = []
                    att["_last_scan"] = None
                    body = json.dumps({
                        "attendance_map": att,
                        "timestamp": int(time.time() * 1000)
                    }).encode()
                    patch_req = urllib.request.Request(url, data=body, headers=headers, method='PATCH')
                    with urllib.request.urlopen(patch_req, timeout=3) as p_resp:
                        pass
        except Exception:
            pass
    threading.Thread(target=_worker, daemon=True).start()


def draw_hud_header(frame, w):
    cv2.rectangle(frame, (0, 0), (w, BANNER_H), C_DARKBG, -1)
    cv2.line(frame, (0, BANNER_H), (w, BANNER_H), C_BORDER, 1)

    # Title & Branding
    cv2.putText(frame, "PoshanSetu", (14, 34),
                cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 195, 255), 2)
    cv2.putText(frame, "QR MEAL COUNTER", (168, 34),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, C_GOLD, 1)

    # School center text
    cv2.putText(frame, "Model Sr. Sec. School  |  Class 8C Lunch Verification",
                (int(w * 0.32), 22), cv2.FONT_HERSHEY_SIMPLEX, 0.44, C_WHITE, 1)
    cv2.putText(frame, "Biometric & QR Anti-Leakage Authentication Counter",
                (int(w * 0.34), 42), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (150, 180, 160), 1)

    # Live Served Counter Badge
    with state_lock:
        served = app_state["total_served"]
        discrepancies = app_state["total_discrepancies"]

    badge_w = 210
    bx = w - badge_w - 12
    cv2.rectangle(frame, (bx, 8), (w - 12, 46), (20, 60, 30), -1)
    cv2.rectangle(frame, (bx, 8), (w - 12, 46), C_GREEN, 1)
    cv2.putText(frame, f"MEALS SERVED: {served:02d}", (bx + 12, 33),
                cv2.FONT_HERSHEY_SIMPLEX, 0.52, C_GREEN, 2)


def draw_hud_footer(frame, h, w):
    cv2.rectangle(frame, (0, h - FOOTER_H), (w, h), C_DARKBG, -1)
    cv2.line(frame, (0, h - FOOTER_H), (w, h - FOOTER_H), C_BORDER, 1)

    ts_str = time.strftime(" %Y-%m-%d  %H:%M:%S")
    cv2.putText(frame, ts_str, (10, h - 14),
                cv2.FONT_HERSHEY_SIMPLEX, 0.46, C_WHITE, 1)

    cv2.putText(frame, "[R] RESET COUNTERS   |   [Q] EXIT SCANNER",
                (int(w * 0.34), h - 14),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, (160, 180, 170), 1)

    cv2.putText(frame, "CAM-01 ACTIVE", (w - 130, h - 14),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, C_CYAN, 1)


def draw_viewfinder(frame, h, w, is_scanning=False):
    # Center targeting box
    box_size = 260
    cx, cy = w // 2, (h // 2) - 10
    x1, y1 = cx - box_size // 2, cy - box_size // 2
    x2, y2 = cx + box_size // 2, cy + box_size // 2

    # Corner tick length
    t = 28
    col = C_CYAN if not is_scanning else C_GREEN

    # Draw corners
    for px, py, dx, dy in [(x1, y1, 1, 1), (x2, y1, -1, 1),
                           (x1, y2, 1, -1), (x2, y2, -1, -1)]:
        cv2.line(frame, (px, py), (px + dx * t, py), col, 3)
        cv2.line(frame, (px, py), (px, py + dy * t), col, 3)

    # Aim hint text
    hint = "HOLD STUDENT QR CODE HERE TO AUTHENTICATE"
    (tw, _), _ = cv2.getTextSize(hint, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
    cv2.putText(frame, hint, (cx - tw // 2, y1 - 12),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 220, 210), 1)


def draw_confirmation_card(frame, h, w, student, scan_status="VERIFIED"):
    card_h = 114
    card_y1 = h - FOOTER_H - card_h - 10
    card_y2 = h - FOOTER_H - 10
    card_x1 = 20
    card_x2 = w - 20

    is_invalid = (scan_status == "INVALID")
    is_discrepancy = (scan_status == "DISCREPANCY")
    is_duplicate = (scan_status == "DUPLICATE")

    if is_invalid:
        col = (40, 40, 230)       # Bright Crimson Red
        bg_col = (12, 12, 32)
    elif is_discrepancy:
        col = C_RED               # Red
        bg_col = (15, 15, 34)
    elif is_duplicate:
        col = (30, 180, 240)      # Amber / Gold
        bg_col = (14, 25, 36)
    else:
        col = C_GREEN             # Emerald Green
        bg_col = (15, 30, 20)

    # Card background & border
    cv2.rectangle(frame, (card_x1, card_y1), (card_x2, card_y2), bg_col, -1)
    cv2.rectangle(frame, (card_x1, card_y1), (card_x2, card_y2), col, 2)

    # Avatar Badge Circle
    av_cx = card_x1 + 55
    av_cy = (card_y1 + card_y2) // 2
    cv2.circle(frame, (av_cx, av_cy), 36, student.get("color", col), -1)
    cv2.circle(frame, (av_cx, av_cy), 36, col, 2)
    inits = student.get("initials", "--")
    (iw, ih), _ = cv2.getTextSize(inits, cv2.FONT_HERSHEY_DUPLEX, 0.85, 2)
    cv2.putText(frame, inits, (av_cx - iw // 2, av_cy + ih // 2),
                cv2.FONT_HERSHEY_DUPLEX, 0.85, C_WHITE, 2)

    # Header and sub-details
    if is_invalid:
        title_str = "REJECTED: UNRECOGNIZED QR CODE"
        raw_p = student.get('raw_payload', 'Unknown')
        meta_str = f"Payload: {raw_p}   |   NOT IN STUDENT DATABASE   |   {time.strftime('%I:%M:%S %p')}"
        status_msg = "SECURITY ALERT: ACCESS DENIED - NOT A REGISTERED POSHANSETU QR"
    elif is_duplicate:
        title_str = f"Roll {student['roll']}  -  {student['name']}"
        meta_str = f"Class 8C   |   UID: {student.get('id', 'PS-8C-' + student['roll'])}   |   Time: {time.strftime('%I:%M:%S %p')}"
        status_msg = "WARNING: DUPLICATE ATTEMPT! MEAL ALREADY ISSUED TO THIS STUDENT"
    elif is_discrepancy:
        title_str = f"Roll {student['roll']}  -  {student['name']}"
        meta_str = f"Class 8C   |   UID: {student.get('id', 'PS-8C-' + student['roll'])}   |   Time: {time.strftime('%I:%M:%S %p')}"
        status_msg = "ALARM: DISCREPANCY FLAGGED! STUDENT MARKED ABSENT IN ATTENDANCE"
    else:
        title_str = f"Roll {student['roll']}  -  {student['name']}"
        meta_str = f"Class 8C   |   UID: {student.get('id', 'PS-8C-' + student['roll'])}   |   Time: {time.strftime('%I:%M:%S %p')}"
        status_msg = "AUTHENTICATED: ATTENDANCE MATCHED  -  1 MEAL PLATE AUTHORIZED"

    cv2.putText(frame, title_str, (card_x1 + 110, card_y1 + 34),
                cv2.FONT_HERSHEY_SIMPLEX, 0.70, C_WHITE, 2)
    cv2.putText(frame, meta_str, (card_x1 + 110, card_y1 + 62),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, (180, 190, 185), 1)
    cv2.putText(frame, status_msg, (card_x1 + 110, card_y1 + 94),
                cv2.FONT_HERSHEY_SIMPLEX, 0.48, col, 2)


# ── HTTP Server for Mobile App Live Telemetry ─────────────────
class StatusHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/status'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()

            with state_lock:
                last_s = app_state["last_scanned_student"]
                last_status = app_state.get("last_scan_status", "NONE")
                served = app_state["total_served"]
                discrepancies = app_state["total_discrepancies"]
                served_list = list(app_state["served_students"])
                is_disc = app_state.get("last_scan_is_discrepancy", False)
                is_inv = app_state.get("last_scan_is_invalid", False)
                is_dup = app_state.get("last_scan_is_duplicate", False)

            resp = {
                "status": "online",
                "unit": "CAM-01",
                "total_served": served,
                "total_discrepancies": discrepancies,
                "served_rolls": served_list,
                "last_scanned": {
                    "roll": last_s["roll"] if last_s else "--",
                    "name": last_s["name"] if last_s else "--",
                    "status": last_status,
                    "is_discrepancy": is_disc,
                    "is_invalid": is_inv,
                    "is_duplicate": is_dup,
                } if last_s else None,
                "timestamp": time.time(),
            }
            self.wfile.write(json.dumps(resp).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, fmt, *args):
        return


def start_http_server(port=5050):
    try:
        server = HTTPServer(('0.0.0.0', port), StatusHandler)
        server.serve_forever()
    except Exception as e:
        print(f"[!] HTTP Server error: {e}")


# ── Main Video Processing Loop ────────────────────────────────
def main():
    print("=" * 68)
    print("        POSHANSETU REAL-TIME QR MEAL AUTHENTICATION ENGINE       ")
    print("=" * 68)
    print(" [1] Starting Background App Telemetry Server on http://localhost:5050")
    http_thread = threading.Thread(target=start_http_server, args=(5050,), daemon=True)
    http_thread.start()

    print(" [2] Initializing Laptop Webcam...")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print(" [!] Camera 0 not found, trying index 1...")
        cap = cv2.VideoCapture(1)

    if not cap.isOpened():
        print(" [ERROR] Could not open any camera. Please connect your webcam.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 960)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 540)
    cap.set(cv2.CAP_PROP_FPS, 30)

    qr_detector = cv2.QRCodeDetector()

    window_name = "PoshanSetu QR Meal Counter [CAM-01]  -  Press Q to Exit"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 960, 540)

    print(" [3] Roster Preloaded: 6 Team Members (Rolls 01-06) + 1 Discrepancy Card (Roll 18)")
    print("=" * 68)
    print(" [READY] AIM A STUDENT QR CODE AT YOUR WEBCAM.")
    print("         Press 'r' in window to reset counts.")
    print("         Press 'q' in window to exit.")
    print("=" * 68 + "\n")

    last_scanned_data = None
    last_scan_timestamp = 0
    COOLDOWN_SECONDS = 2.8

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.03)
                continue

            h, w = frame.shape[:2]
            now = time.time()

            # QR Code Detection
            data, pts, _ = qr_detector.detectAndDecode(frame)

            if data and data != "":
                # Check cooldown to prevent rapid duplicate beeps
                if data != last_scanned_data or (now - last_scan_timestamp > COOLDOWN_SECONDS):
                    last_scanned_data = data
                    last_scan_timestamp = now

                    # Parse roll number from payload (e.g. "QR-PS-8C-01" -> "PS-8C-01")
                    raw_payload = data.strip()
                    clean_id = raw_payload.replace("QR-", "")
                    student = STUDENT_REGISTRY.get(clean_id)
                    if not student and not clean_id.startswith("PS-"):
                        student = STUDENT_REGISTRY.get(f"PS-{clean_id}")

                    # Case 1: UNRECOGNIZED / INVALID QR CODE (Not in registry)
                    if not student:
                        scan_status = "INVALID"
                        display_student = {
                            "roll": "??",
                            "name": "Unregistered / Unknown QR",
                            "raw_payload": raw_payload[:26] + ("..." if len(raw_payload) > 26 else ""),
                            "status": "INVALID",
                            "initials": "✕",
                            "color": (20, 20, 180),
                        }

                        with state_lock:
                            app_state["last_scanned_student"] = display_student
                            app_state["last_scan_status"] = scan_status
                            app_state["last_scan_time"] = now
                            app_state["last_scan_is_discrepancy"] = True
                            app_state["last_scan_is_invalid"] = True
                            app_state["last_scan_is_duplicate"] = False
                            app_state["total_discrepancies"] += 1

                        play_beep(sound_type="invalid")
                        time_str = time.strftime("%H:%M:%S")
                        print(f"[{time_str}] ⛔ [REJECTED - UNREGISTERED QR] Scanned: '{raw_payload[:32]}' -> NOT in PoshanSetu Student Registry! Meal denied.")
                        sync_to_supabase("INVALID", "Unregistered QR", is_discrepancy=True, scan_status="INVALID")

                    else:
                        # Recognized Student
                        roll_str = student["roll"]
                        display_student = dict(student)
                        display_student["id"] = clean_id if clean_id.startswith("PS-") else f"PS-8C-{roll_str}"

                        if student.get("status") == "ABSENT":
                            # Case 2: ABSENT STUDENT (DISCREPANCY)
                            scan_status = "DISCREPANCY"

                            with state_lock:
                                app_state["last_scanned_student"] = display_student
                                app_state["last_scan_status"] = scan_status
                                app_state["last_scan_time"] = now
                                app_state["last_scan_is_discrepancy"] = True
                                app_state["last_scan_is_invalid"] = False
                                app_state["last_scan_is_duplicate"] = False
                                app_state["total_discrepancies"] += 1

                            play_beep(sound_type="alarm")
                            time_str = time.strftime("%H:%M:%S")
                            print(f"[{time_str}] 🚨 [DISCREPANCY DETECTED] Roll {roll_str} ({student['name']}) -> FLAGGED: Marked ABSENT in Class 8C roll call! Meal locked.")
                            sync_to_supabase(roll_str, student['name'], is_discrepancy=True, scan_status="DISCREPANCY")

                        elif roll_str in app_state["served_students"]:
                            # Case 3: DUPLICATE SCAN (ALREADY SERVED)
                            scan_status = "DUPLICATE"

                            with state_lock:
                                app_state["last_scanned_student"] = display_student
                                app_state["last_scan_status"] = scan_status
                                app_state["last_scan_time"] = now
                                app_state["last_scan_is_discrepancy"] = False
                                app_state["last_scan_is_invalid"] = False
                                app_state["last_scan_is_duplicate"] = True

                            play_beep(sound_type="duplicate")
                            time_str = time.strftime("%H:%M:%S")
                            print(f"[{time_str}] ⚠️ [DUPLICATE MEAL ATTEMPT] Roll {roll_str} ({student['name']}) -> Meal ALREADY served earlier today! Second plate denied.")
                            sync_to_supabase(roll_str, student['name'], is_discrepancy=False, scan_status="DUPLICATE")

                        else:
                            # Case 4: PRESENT & FIRST TIME (AUTHORIZED MEAL)
                            scan_status = "VERIFIED"

                            with state_lock:
                                app_state["served_students"].add(roll_str)
                                app_state["total_served"] = len(app_state["served_students"])
                                app_state["last_scanned_student"] = display_student
                                app_state["last_scan_status"] = scan_status
                                app_state["last_scan_time"] = now
                                app_state["last_scan_is_discrepancy"] = False
                                app_state["last_scan_is_invalid"] = False
                                app_state["last_scan_is_duplicate"] = False

                            play_beep(sound_type="success")
                            time_str = time.strftime("%H:%M:%S")
                            print(f"[{time_str}] ✅ [MEAL AUTHORIZED] Roll {roll_str} ({student['name']}) -> Verified Present. Plate #{app_state['total_served']} issued.")
                            sync_to_supabase(roll_str, student['name'], is_discrepancy=False, scan_status="VERIFIED")

            # Draw Viewfinder
            draw_viewfinder(frame, h, w, is_scanning=(data != ""))

            # Draw QR Polygons if found
            if pts is not None and len(pts) > 0:
                try:
                    import numpy as np
                    pts_int = pts.astype(int)[0]
                    with state_lock:
                        last_st = app_state.get("last_scan_status", "NONE")
                    if last_st in ("DISCREPANCY", "INVALID"):
                        poly_col = C_RED
                    elif last_st == "DUPLICATE":
                        poly_col = (30, 180, 240)
                    else:
                        poly_col = C_GREEN
                    for j in range(len(pts_int)):
                        p1 = tuple(pts_int[j])
                        p2 = tuple(pts_int[(j + 1) % len(pts_int)])
                        cv2.line(frame, p1, p2, poly_col, 3)
                except Exception:
                    pass

            # Display confirmation card for 3.5 seconds after a scan
            with state_lock:
                last_s = app_state["last_scanned_student"]
                last_t = app_state["last_scan_time"]
                last_st = app_state.get("last_scan_status", "NONE")

            if last_s and (now - last_t < 3.5):
                draw_confirmation_card(frame, h, w, last_s, last_st)

            # Draw HUD Overlays
            draw_hud_header(frame, w)
            draw_hud_footer(frame, h, w)

            # Show window
            cv2.imshow(window_name, frame)

            # Key handler
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                print("\n[INFO] Exiting PoshanSetu QR Engine...")
                break
            elif key == ord('r'):
                with state_lock:
                    app_state["served_students"].clear()
                    app_state["total_served"] = 0
                    app_state["total_discrepancies"] = 0
                    app_state["last_scanned_student"] = None
                    app_state["last_scan_status"] = "NONE"
                reset_supabase_served()
                print("\n[INFO] Served counters have been RESET to 0 (synced to cloud).")

    except KeyboardInterrupt:
        print("\n[INFO] Stopped by user.")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("[✓] Camera closed cleanly.")


if __name__ == '__main__':
    main()
