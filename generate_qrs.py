import os
import base64
import qrcode
from PIL import Image, ImageDraw, ImageFont

# Directory for QR files
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'qr_codes')
os.makedirs(OUTPUT_DIR, exist_ok=True)

STUDENTS = [
    {
        "roll": "01",
        "id": "PS-8C-01",
        "qr_payload": "QR-PS-8C-01",
        "name": "Naitik Baliyan",
        "gender": "M",
        "initials": "NB",
        "color": "#004D2C",  # Emerald
        "type": "team",
        "role_desc": "Team Leader · Present in Class 8C",
        "status": "PRESENT"
    },
    {
        "roll": "02",
        "id": "PS-8C-02",
        "qr_payload": "QR-PS-8C-02",
        "name": "Anshika Malik",
        "gender": "F",
        "initials": "AM",
        "color": "#9E8036",  # Gold
        "type": "team",
        "role_desc": "Team Member · Present in Class 8C",
        "status": "PRESENT"
    },
    {
        "roll": "03",
        "id": "PS-8C-03",
        "qr_payload": "QR-PS-8C-03",
        "name": "Shagun Jaggi",
        "gender": "F",
        "initials": "SJ",
        "color": "#006B3C",  # Leaf Green
        "type": "team",
        "role_desc": "Team Member · Present in Class 8C",
        "status": "PRESENT"
    },
    {
        "roll": "04",
        "id": "PS-8C-04",
        "qr_payload": "QR-PS-8C-04",
        "name": "Aryan Choudhary",
        "gender": "M",
        "initials": "AC",
        "color": "#15803D",  # Green
        "type": "team",
        "role_desc": "Team Member · Present in Class 8C",
        "status": "PRESENT"
    },
    {
        "roll": "05",
        "id": "PS-8C-05",
        "qr_payload": "QR-PS-8C-05",
        "name": "Puneet Choudhary",
        "gender": "M",
        "initials": "PC",
        "color": "#004D2C",  # Emerald
        "type": "team",
        "role_desc": "Team Member · Present in Class 8C",
        "status": "PRESENT"
    },
    {
        "roll": "06",
        "id": "PS-8C-06",
        "qr_payload": "QR-PS-8C-06",
        "name": "Omeshwar Goswami",
        "gender": "M",
        "initials": "OG",
        "color": "#BFA050",  # Gold
        "type": "team",
        "role_desc": "Team Member · Present in Class 8C",
        "status": "PRESENT"
    },
    {
        "roll": "18",
        "id": "PS-8C-18",
        "qr_payload": "QR-PS-8C-18",
        "name": "Rohan Sharma",
        "gender": "M",
        "initials": "RS",
        "color": "#C2410C",  # Crimson Red
        "type": "discrepancy",
        "role_desc": "⚠️ DEMO DISCREPANCY CARD · MARKED ABSENT IN ATTENDANCE",
        "status": "ABSENT"
    }
]

generated_images = {}

print("[*] Generating 7 High-Contrast Student QR Codes...")

for s in STUDENTS:
    # Generate high quality QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=4,
    )
    qr.add_data(s["qr_payload"])
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    
    # Save standalone QR image
    safe_name = s["name"].lower().replace(' ', '_')
    filename = f"roll_{s['roll']}_{safe_name}.png"
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath, format="PNG")
    
    # Also get base64 string for embedding into HTML
    with open(filepath, "rb") as f:
        b64 = base64.b64encode(f.read()).decode('utf-8')
        generated_images[s["roll"]] = {
            "b64": b64,
            "filename": filename,
            "filepath": filepath
        }
    
    print(f" [OK] Created QR for Roll {s['roll']} ({s['name']}): {filename}")

# Generate interactive HTML dashboard
html_path = os.path.join(os.path.dirname(__file__), 'student_qr_cards.html')

cards_html = ""
for s in STUDENTS:
    b64 = generated_images[s["roll"]]["b64"]
    is_fake = s["type"] == "discrepancy"
    badge_bg = "#FEF2F2" if is_fake else "#EBF4EF"
    badge_border = "#FCA5A5" if is_fake else "#C2DEC9"
    badge_color = "#DC2626" if is_fake else "#15803D"
    badge_text = "🚨 DISCREPANCY TEST (ABSENT)" if is_fake else "✅ VERIFIED TEAM MEMBER"

    cards_html += f"""
    <div class="card {'fake-card' if is_fake else ''}" onclick="showModal('{s['roll']}', '{s['name']}', '{s['id']}', '{s['status']}', '{s['role_desc']}', '{b64}', {str(is_fake).lower()})">
      <div class="card-header">
        <div class="avatar" style="background-color: {s['color']};">{s['initials']}</div>
        <div class="header-text">
          <div class="student-name">{s['name']}</div>
          <div class="student-id">Roll No: <strong>{s['roll']}</strong> &bull; ID: {s['id']}</div>
        </div>
        <div class="status-pill" style="background:{badge_bg}; border-color:{badge_border}; color:{badge_color};">
          {badge_text}
        </div>
      </div>

      <div class="qr-container">
        <img src="data:image/png;base64,{b64}" alt="QR Code" class="qr-img"/>
        <div class="scan-prompt">Click card to enlarge for scanning</div>
      </div>

      <div class="card-footer">
        <div class="school-info">Class 8C &bull; Model Sr. Sec. School</div>
        <div class="payload-tag">Payload: {s['qr_payload']}</div>
      </div>
    </div>
    """

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PoshanSetu — Student QR Identification Cards (SIH 2026)</title>
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }}
    body {{
      background-color: #F4EDE4;
      color: #12231A;
      padding: 24px 16px;
      min-height: 100vh;
    }}
    .container {{
      max-width: 1100px;
      margin: 0 auto;
    }}
    header {{
      background: #00361F;
      color: white;
      padding: 24px 28px;
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.12);
      border-bottom: 4px solid #BFA050;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }}
    .header-left h1 {{
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .header-left h1 span.gold {{
      color: #D8BC6B;
    }}
    .header-left p {{
      color: #A3C9B4;
      font-size: 14px;
      margin-top: 4px;
    }}
    .instruction-badge {{
      background: rgba(191,160,80,0.15);
      border: 1px solid rgba(191,160,80,0.4);
      padding: 10px 16px;
      border-radius: 10px;
      color: #FBF7ED;
      font-size: 13px;
      max-width: 380px;
      line-height: 1.4;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }}
    .card {{
      background: #FFFFFF;
      border-radius: 14px;
      border: 1.5px solid #DECFA9;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}
    .card:hover {{
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.12);
      border-color: #004D2C;
    }}
    .card.fake-card {{
      border-color: #FCA5A5;
      background: #FFFDFD;
    }}
    .card.fake-card:hover {{
      border-color: #DC2626;
      box-shadow: 0 8px 20px rgba(220,38,38,0.15);
    }}
    .card-header {{
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }}
    .avatar {{
      width: 46px;
      height: 46px;
      border-radius: 23px;
      color: white;
      font-weight: 800;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }}
    .header-text {{
      flex: 1;
    }}
    .student-name {{
      font-size: 17px;
      font-weight: 700;
      color: #12231A;
    }}
    .student-id {{
      font-size: 12px;
      color: #6B7280;
      margin-top: 2px;
    }}
    .status-pill {{
      font-size: 10px;
      font-weight: 800;
      padding: 4px 8px;
      border-radius: 20px;
      border-width: 1px;
      border-style: solid;
      letter-spacing: 0.4px;
      white-space: nowrap;
    }}
    .qr-container {{
      background: #FAFAF8;
      border: 1px dashed #D1D5DB;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
      margin-bottom: 14px;
    }}
    .qr-img {{
      width: 180px;
      height: 180px;
      display: block;
      margin: 0 auto;
    }}
    .scan-prompt {{
      font-size: 11px;
      color: #9CA3AF;
      margin-top: 8px;
      font-weight: 500;
    }}
    .card-footer {{
      border-top: 1px solid #E5DCCE;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .school-info {{
      font-size: 11px;
      font-weight: 600;
      color: #475C51;
    }}
    .payload-tag {{
      font-size: 11px;
      font-family: monospace;
      color: #6B7280;
      background: #F3F4F6;
      padding: 2px 6px;
      border-radius: 4px;
    }}

    /* Fullscreen Modal */
    .modal-overlay {{
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.85);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }}
    .modal-content {{
      background: white;
      padding: 30px;
      border-radius: 20px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      position: relative;
    }}
    .modal-qr {{
      width: 270px;
      height: 270px;
      margin: 16px auto;
      display: block;
    }}
    .modal-name {{
      font-size: 22px;
      font-weight: 800;
      color: #00361F;
    }}
    .modal-id {{
      font-size: 14px;
      color: #4B5563;
      margin-top: 4px;
    }}
    .modal-status-badge {{
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      margin-top: 10px;
    }}
    .close-btn {{
      position: absolute;
      top: 16px;
      right: 18px;
      background: #E5E7EB;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 16px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      color: #374151;
    }}
    .instructions-footer {{
      margin-top: 30px;
      text-align: center;
      color: #6B7280;
      font-size: 13px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-left">
        <h1>Poshan<span class="gold">Setu</span> &bull; Student QR Cards</h1>
        <p>Smart India Hackathon 2026 &bull; Model Senior Secondary School (Class 8C)</p>
      </div>
      <div class="instruction-badge">
        💡 <strong>Demo Instructions:</strong> Click any card to pop up a large QR code. Point it directly at your laptop webcam to simulate instant biometric/QR meal verification!
      </div>
    </header>

    <div class="grid">
      {cards_html}
    </div>

    <div class="instructions-footer">
      Files saved in: <code>PoshanSetu/qr_codes/</code> &bull; All 7 QR codes are self-contained and work offline without internet.
    </div>
  </div>

  <!-- Modal for scanning -->
  <div class="modal-overlay" id="modalOverlay" onclick="closeModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="close-btn" onclick="closeModal()">&times;</button>
      <div class="modal-name" id="modalName">Student Name</div>
      <div class="modal-id" id="modalId">Roll 01 &bull; Class 8C</div>
      <div class="modal-status-badge" id="modalBadge">Status</div>
      <img src="" alt="QR" class="modal-qr" id="modalQr"/>
      <p style="font-size: 12px; color: #6B7280;">Hold this QR in front of the laptop camera to authenticate.</p>
    </div>
  </div>

  <script>
    function showModal(roll, name, id, status, roleDesc, b64, isFake) {{
      document.getElementById('modalName').innerText = name;
      document.getElementById('modalId').innerText = 'Roll ' + roll + ' • ' + id + ' • Class 8C';
      document.getElementById('modalQr').src = 'data:image/png;base64,' + b64;
      
      const badge = document.getElementById('modalBadge');
      if (isFake) {{
        badge.innerText = '🚨 FAKE / ABSENT IN ATTENDANCE (DEMO DISCREPANCY)';
        badge.style.background = '#FEF2F2';
        badge.style.color = '#DC2626';
        badge.style.border = '1px solid #FCA5A5';
      }} else {{
        badge.innerText = '✅ VERIFIED STUDENT (PRESENT IN ATTENDANCE)';
        badge.style.background = '#DCFCE7';
        badge.style.color = '#15803D';
        badge.style.border = '1px solid #86EFAC';
      }}
      document.getElementById('modalOverlay').style.display = 'flex';
    }}

    function closeModal(event) {{
      document.getElementById('modalOverlay').style.display = 'none';
    }}

    document.addEventListener('keydown', function(e) {{
      if (e.key === 'Escape') closeModal();
    }});
  </script>
</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"\n[OK] Generated Interactive HTML Dashboard: {html_path}")
print(f"[OK] Saved all 7 QR PNG files to: {OUTPUT_DIR}")
print("[OK] Done!")
