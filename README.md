# 🍱 PoshanSetu

> **Smart India Hackathon 2024 — Mid-Day Meal (PM-POSHAN) Monitoring System**

PoshanSetu is a real-time attendance and mid-day meal distribution monitoring platform built for government schools under the **PM-POSHAN (Mid-Day Meal) scheme**. It eliminates ghost beneficiaries, prevents meal fraud, and gives school administrators live visibility into attendance and meal serving — all through QR codes, a webcam AI scanner, and a mobile app.

---

## 🚀 Features

### 👩‍🏫 Teacher Portal
- Secure PIN-based login
- One-tap biometric roll-call submission
- Live sync to Supabase cloud in real time

### 🍽️ Coordinator Portal
- Mid-day meal distribution tracking
- QR code scan verification at the serving counter

### 🏫 Admin Portal (Principal)
- School attendance overview (Enrolled / Present / Absent)
- Per-class roster with attendance rate
- Live meal distribution monitor linked to laptop camera
- Discrepancy detection — flags absent students attempting meal claims

### 📷 AI Camera Terminal (camera_stream.py)
- Laptop webcam + QR code scanner
- Streams live feed to the mobile app over Wi-Fi
- Detects and flags absent students at the meal counter in real time
- REST API (/status, /stream) for the mobile app to poll

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo) |
| Navigation | React Navigation 6 |
| Cloud DB | Supabase (PostgreSQL + Realtime) |
| Camera AI | Python · Flask · OpenCV · pyzbar |
| QR Generation | Python · qrcode |
| State | React hooks + AsyncStorage |

---

## 📁 Project Structure

`
PoshanSetu/
├── src/
│   ├── screens/
│   │   ├── admin/
│   │   ├── teacher/
│   │   ├── coordinator/
│   │   └── shared/
│   ├── components/
│   ├── services/
│   ├── data/
│   └── constants/
├── camera_stream.py
├── generate_qrs.py
├── student_qr_cards.html
├── App.js
└── app.json
`

---

## ⚙️ Setup

### Mobile App
`ash
npm install
npx expo start
`

### Camera AI Terminal
`ash
pip install flask flask-cors opencv-python pyzbar
python camera_stream.py
`

### Generate QR Codes
`ash
pip install qrcode pillow
python generate_qrs.py
`

---

## 👥 Team — Class 8C

| Roll | Name |
|---|---|
| 01 | Naitik Baliyan |
| 02 | Anshika Malik |
| 03 | Shagun Jaggi |
| 04 | Aryan Choudhary |
| 05 | Puneet Choudhary |
| 06 | Omeshwar Goswami |

---

## 🏆 SIH 2024

Preventing ghost beneficiaries and ensuring transparent mid-day meal distribution in government schools.

## 📄 License

MIT
