# EESA Buzzer & Quiz Platform ⚡🎓

A real-time, mobile-first live quiz and buzzer platform designed for college symposiums, technical festivals, and academic competitions. Conducted by the **Electronics Engineering Students Association (EESA)**, Department of EXTC, Prof. Ram Meghe Institute of Technology & Research (PRMIT&R), Badnera.

Students participate directly from their mobile web browser by scanning a QR code or entering the event code—**no app installation required**.

---

## 🌟 Key Features

- **⚡ Sub-Millisecond Authoritative Buzzer Engine**: Atomic first-touch detection on the server guarantees fair, race-condition-free buzzer locks across concurrent student taps.
- **📱 Mobile-First Student Experience**: Clean, responsive mobile web app with instant tactile buzzer feedback, vibration, and real-time score updates.
- **📺 1080p Public Projector Display (`/display/:eventCode`)**: High-contrast, auditorium-optimized view for stage screens with live synchronized timers and top contenders.
- **🛠️ Host Live Control Desk (`/admin/events/:id/host`)**: Authoritative controls for event kickoff, buzzer activation, manual score overrides, and grading (+points / -penalty).
- **📊 Question Bank & Event Wizard**: 7-step guided event creation with customizable rounds, time limits, and multiple-choice questions.
- **🏆 Live Podium & CSV Standings**: Instant rankings, medal showcases, auditable score logs, and one-click CSV export for certificates.
- **🎨 MITRA Academic UI/UX**: Clean light design system (`#F8FAFC` background, pure white cards, royal blue accents) replacing dark gaming templates.

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: React (Vite), TailwindCSS, Socket.IO Client, Lucide React, Canvas-Confetti, QRCode.react
- **Backend**: Node.js, Express.js, Socket.IO (WebSockets)
- **Database**: MongoDB with Mongoose (Cloud Atlas or embedded in-memory fallback)
- **Authentication**: JWT & bcrypt password hashing for Admin/Host access

---

## 🚀 Quick Start (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/datirswapnil2006/EESA-Buzzer.git
cd EESA-Buzzer
```

### 2. Configure Backend Server
```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/eesa_quiz
JWT_SECRET=eesa_super_secret_jwt_key_2026
ADMIN_EMAIL=your admin email
ADMIN_PASSWORD= your password admin
```

Start the backend:
```bash
npm run dev
```
> *Note: If no local or remote MongoDB is reachable, the server automatically starts an embedded in-memory MongoDB fallback and pre-seeds event `EESA26` and admin credentials.*

### 3. Configure Frontend Client
In a new terminal:
```bash
cd client
npm install
npm run dev
```

Open your browser at **`http://localhost:5173/`**.

---

## 🔑 Default Credentials & Demo Event

- **Admin Login**: `http://localhost:5173/login`
  - **Email**: `admin@eesa.org`
  - **Password**: `admin123`
- **Default Event Code**: `EESA26`
- **Student Join URL**: `http://localhost:5173/join` or `http://localhost:5173/join/EESA26`
- **Projector Display URL**: `http://localhost:5173/display/EESA26`

---

## 🌐 Deployment Guide (Render + Vercel)

### Backend on Render
1. Create a **New Web Service** linked to your GitHub repository.
2. Set **Root Directory** to `server`.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node server.js`
5. Add Environment Variables:
   - `PORT`: `5000`
   - `MONGODB_URI`: `<your_mongodb_connection_string>`
   - `JWT_SECRET`: `<secure_random_string>`
   - `ADMIN_EMAIL`: `admin@eesa.org`
   - `ADMIN_PASSWORD`: `admin123`

### Frontend on Vercel
1. Import repository on **Vercel**.
2. Set **Root Directory** to `client`.
3. Set **Framework Preset** to `Vite`.
4. Add Environment Variables:
   - `VITE_API_URL`: `https://<your-render-backend-url>.onrender.com`
   - `VITE_SOCKET_URL`: `https://<your-render-backend-url>.onrender.com`
5. Deploy!

---

## 🏛️ Organization & Credits

- **Organized by**: Electronics Engineering Students Association (EESA)
- **Institution**: Department of Electronics & Telecommunication Engineering (EXTC), Prof. Ram Meghe Institute of Technology & Research (PRMIT&R), Badnera, Amravati.
- **Affiliation**: Vidarbha Youth Welfare Society (VYWS), Amravati.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
