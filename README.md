# College Event Management System (CEMS)

> Compliant with IEEE Std 830 / ISO/IEC/IEEE 29148 Software Requirements Specification (SRS v1.0).

CEMS is a full-stack, enterprise-grade web application for college campuses, departmental societies, and professional chapters (such as IEEE). It provides event publishing, role-based governance, atomic race-condition safe registration, QR-code based ticket generation, attendance tracking (with camera scanning and duplicate scan detection), verifiable digital certificates, in-app notifications, and comprehensive analytics.

---

## 🛠 Technology Stack

- **Frontend**: Next.js 14 (JavaScript & JSX only, React 18, Tailwind CSS, Lucide Icons, pure black dark mode `#000000` / clean white light mode).
- **Backend**: Node.js & Express.js (JavaScript only, RESTful APIs, JWT authentication, Helmet, Morgan, PDFKit, QRCode, Multer).
- **Database & ORM**: Neon PostgreSQL with Prisma ORM (v6.4.1), hosted in an isolated `cems` schema.
- **Storage**: Cloudinary for banner images and certificate assets (with graceful inline fallback if credentials are omitted).
- **Testing**: Node.js Test Runner with Supertest.

---

## 👥 User Roles & Demo Credentials

The database is pre-seeded with test accounts across all roles:

| Role | Email | Password | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@cems.edu` | `Admin@123` | Institutional analytics, user governance, organizing bodies, IEEE bulk CSV verify, system audit logs |
| **Faculty Approver** | `approver@cems.edu` | `Approver@123` | Proposal review queue, approve/publish or reject events with remarks |
| **Event Organizer** | `organizer@cems.edu` | `Organizer@123` | Create events, camera QR attendance check-in, bulk CSV attendance, bulk certificate issuance, export rosters, broadcast announcements |
| **IEEE Student** | `ieee.student@cems.edu` | `Student@123` | Verified & active IEEE member; automatically receives IEEE discount pricing on IEEE events |
| **General Student** | `student@cems.edu` | `Student@123` | Register for events, view/download QR tickets (PDF), submit IEEE membership, view/download certificates |
| **Pending IEEE** | `pending.student@cems.edu` | `Student@123` | Student with membership pending verification |
| **Expired IEEE** | `expired.student@cems.edu` | `Student@123` | Student with expired membership (standard rate applies per SRS) |

> 💡 **Quick Login**: The `/login` page includes 1-click test credential buttons to instantly sign in as any of these roles.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)
- Access to Neon PostgreSQL database (connection string configured in `backend/.env`)

---

### 2. Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
# Copy .env.example to .env and configure your DATABASE_URL
cp .env.example .env

# 3. Synchronize schema with Neon PostgreSQL
npx prisma db push

# 4. Seed sample data (users, events, registrations, templates, audit logs)
npm run seed

# 5. Run automated test suite
npm test

# 6. Start the backend server
npm start
# Server will run on http://localhost:5000 (Health check: http://localhost:5000/api/health)
```

---

### 3. Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
# Copy .env.example to .env.local
cp .env.example .env.local

# 3. Build production bundle (or run dev)
npm run build
npm start
# Frontend will be live on http://localhost:3000
```

---

## 📋 Key Modules & Features

### 1. Event Discovery & Filtering (`/`)
- Real-time search by keyword, title, venue, or topic.
- Multi-filter controls: Category (Workshop, Hackathon, Seminar, Cultural Fest, Technical Fest), Organizing Body, Fee (Free/Paid), and IEEE-only toggle.
- Remaining seat counters and live fee indicators showing user-specific discounted pricing.

### 2. Atomic Registration & Waitlist Engine (`/events/[id]`)
- **Race-Condition Safe**: Capacity checks and seat allocation run via atomic database conditional updates (`UPDATE ... WHERE seatsConfirmed < seatLimit`).
- **Instant Confirmation**: Registrations confirm immediately upon seat allocation without payment gateway dependency.
- **Waitlist Support**: When full, students can join the waitlist and are automatically promoted when a confirmed registration is cancelled.
- **Dynamic Fee Engine**: Enforces $IEEE\_fee < Standard\_fee$ for IEEE events. Automatically applies member discount for verified, unexpired IEEE members.

### 3. Entry Passes & QR Tickets (`/dashboard/registrations`)
- Each confirmed registration generates a unique ticket code and high-resolution QR code.
- Downloadable official PDF entry ticket with security watermark and event details.

### 4. Attendance Station (`/organizer/attendance/[eventId]`)
- **Camera Scanner**: Integrated webcam QR code scanner.
- **Duplicate Scan Detection (FR-9.4)**: Detects if a ticket was already scanned and alerts with previous timestamp.
- **Manual Check-In & Bulk CSV**: Toggle attendance per student or paste a list of roll numbers/ticket codes.

### 5. Certificate Issuance & Public Verification
- **Rule-based Issuance (FR-10.2)**: Configurable rule ensures certificates are only issued to students with confirmed attendance.
- **Bulk Issuance (`/organizer/certificates/[eventId]`)**: Generates verifiable PDF certificates with unique IDs and QR codes.
- **Revocation & Re-issuance (FR-10.8)**: Organizers can revoke certificates with audit logging; revoked certificates explicitly show invalid.
- **Public Verification (`/verify-certificate/[id]`)**: Anyone can verify certificate validity without signing in.

### 6. Administration & Governance (`/admin`)
- Institution-wide metrics (total events, students, registrations, fee volume).
- User governance (activate/deactivate accounts, change roles).
- Organizing bodies management (assign coordinators, create General/IEEE bodies).
- Bulk IEEE CSV verification tool.
- Tamper-evident system audit log timeline.

---

## 🔒 Security & Concurrency
- Salted bcrypt hashing (10 salt rounds).
- Stateless JWT authentication with role authorization middleware.
- Row-level database atomic locks preventing overbooking under high concurrency.
- Zero-leakage `.env.example` templates.

