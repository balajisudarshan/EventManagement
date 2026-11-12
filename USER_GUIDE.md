# College Event Management System (CEMS) — User Guide

Welcome to **CEMS**! This guide explains how to use every part of the platform in plain, simple steps — no technical background needed.

---

## Quick Overview: Who Uses CEMS?

There are **5 types of users** in CEMS:

1. **Normal Student (Standard User)** — Browses events, registers, gets QR entry passes, and downloads certificates.
2. **IEEE Member** — Everything a student can do, plus **automatic discounted pricing** on events hosted by IEEE chapters.
3. **Event Organizer** — Creates event proposals, takes attendance via QR scanner, designs certificate templates, and issues certificates.
4. **Faculty Approver** — Reviews event proposals submitted by organizers and approves or requests revisions before students can see them.
5. **System Administrator (Admin)** — Manages users, promotes students to IEEE Members / Organizers / Approvers / Admins, creates clubs/chapters, and views college-wide statistics.

---

## Navigation Basics (For Everyone)

- **Left Sidebar**: Lists all pages you have access to (*Browse Events*, *My Tickets*, *My Certificates*, *IEEE Membership*, and any Organizer/Approver/Admin portals). On mobile phones, tap the **Menu icon (☰)** at the top left to open it.
- **Top Bar**: Shows the page you are currently on, plus:
  - **Notification Bell (🔔)**: Opens your in-app messages (ticket confirmations, promotions, new certificates, event announcements).
  - **Sun / Moon Icon (☀️ / 🌙)**: Switches between **Clean White Light Mode** and **Pure Black Dark Mode**.
  - **Your Name**: Opens your **Profile & Password Settings** or **Sign Out**.

---

## Part 1: Guide for Students & Participants

### 1. Creating an Account & Signing In
1. Click **Sign In** at the bottom of the left sidebar (or top-right corner).
2. If you are new, click **Register** and enter your **Full Name**, **College Email**, **Password**, **Roll Number**, **Department**, and **Academic Year**.
3. Your account is active right away — no email confirmation link required.

---

### 2. Finding & Registering for Events
1. Open **Browse Events** from the left sidebar.
2. Use the **Search box**, **Category tabs** (*Workshop*, *Hackathon*, *Seminar*, *Cultural Fest*, *Technical Fest*), **Organizing Body filter**, **All Fees filter**, or **IEEE Only** button to narrow down events.
3. **Click on any event card** (its banner photo, title, or **Register** button) to open the event's dedicated details page.
4. On the event page, you can see:
   - Full schedule, venue, and organizer contact details.
   - How many seats are left.
   - **Your exact fee** (if you are a Verified IEEE Member, your discounted rate is highlighted automatically).
5. Fill out any extra questions (or **Team Name** if it's a team event) and click **Confirm Registration**.
   - If seats are available, your seat is reserved immediately and your **QR Ticket** pops up.
   - If the event is full, click **Join Waitlist** — if another student cancels later, CEMS automatically promotes you and notifies you!

---

### 3. Viewing Your Tickets & Cancelling
1. Click **My Tickets** in the left sidebar.
2. Click **QR Ticket** on any confirmed registration to show your entry QR code at the event gate, or click the **Download icon** to save a PDF copy.
3. If you can no longer attend before the deadline, click the **Trash icon** to cancel and free up your seat.

---

### 4. Getting IEEE Member Discounts
1. Click **IEEE Membership** in the left sidebar.
2. Enter your **IEEE Membership Number**, select your **Member Grade**, pick your **Expiry Date**, and click **Submit for Verification**.
3. Once an Admin or Coordinator verifies your membership (or promotes you directly), your discounted IEEE pricing applies automatically across all IEEE events until your expiry date.

---

### 5. Viewing & Downloading Your Certificates
1. Click **My Certificates** in the left sidebar.
2. Every certificate issued to your account or your registered college email automatically appears here.
3. For each certificate, you can:
   - Click **Preview** to see the full visual certificate design on screen.
   - Click **PDF** to download a printable PDF file (complete with QR code, signature, and Certificate ID).
   - Click **Verify** to open the shareable public verification link for resumes or LinkedIn.

---

## Part 2: Guide for Event Organizers

*(If you are a club coordinator or event lead, ask an Admin to promote your account to **Organizer** and assign your club/chapter.)*

### 1. Proposing a New Event
1. Click **New Event Proposal** in the left sidebar.
2. Enter the event title, description, category, dates, venue, mode (*Offline* / *Online* / *Hybrid*), registration deadline, and upload a banner photo.
3. Set the **Maximum Seat Limit** and **Fees** (Free or Paid — for IEEE chapters, set an IEEE fee lower than the Standard fee).
4. Optionally enable **Team Event** settings or add **Custom Questions** for registrants.
5. Submit for faculty approval. Once an Approver approves it, the event goes live in **Browse Events**.

---

### 2. Managing Events & Announcements
1. Click **Organizer Hub** in the left sidebar to see all events for your chapters/clubs.
2. For each event, you can monitor live counts (**Confirmed Seats**, **Attended**, **Certs Issued**) and use quick buttons:
   - **Export CSV**: Download the complete spreadsheet of registered participants.
   - **Broadcast**: Send an instant in-app announcement to all confirmed participants (e.g., room change or instructions).
   - **Close Reg** / **Cancel Event**: Close signups early or cancel the event (automatically notifies all registrants).

---

### 3. Taking Attendance on Event Day
1. From **Organizer Hub**, click **Attendance Scanner** on your event.
2. Use your laptop or phone camera to scan participants' **QR Tickets**, OR type/paste their ticket code manually.
   - **Duplicate Protection**: If someone tries to scan the same ticket twice on the same day, the system warns you immediately.
3. You can also mark attendance manually from the participant roster or upload a bulk CSV of ticket codes/emails.

---

### 4. Designing Certificate Templates (Template Studio)
1. Click **Cert Templates** in the left sidebar, then click **Create Template** (or click **Edit** on an existing template).
2. In the **Left Panel**:
   - Enter a **Template Name** (for example: *Hackathon Winner 2026*).
   - Optionally link it to a specific event, or leave it **Global** to reuse anytime.
   - Choose **Landscape** (horizontal) or **Portrait** (vertical).
   - **Upload Signature**: Under **Signature & Certificate ID**, click **Upload Signature** and choose your PNG or JPG signature image. It will immediately appear on the certificate canvas!
   - **Certificate ID**: A `Certificate ID: {{certificateId}}` field is included at the bottom by default. You can also click **+ Add Certificate ID to Canvas** anytime to add or reposition it.
   - **Dynamic Fields**: Add extra custom placeholders (like `{{track}}` or `{{position}}`) if you want custom info filled per recipient.
3. In the **Center Canvas**:
   - Drag, resize, or rotate any element.
   - Use the top toolbar to add **Text**, **Images/Logos**, **Signatures**, **QR Codes**, **Shapes**, **Lines**, or change the **Background Color / Background Image**.
   - Click any element to customize its font, size, color, or alignment on the right panel.
4. Click **Save Template** in the top-right corner when finished.

---

### 5. Issuing Certificates (Two Easy Ways)

#### Option A: Bulk Issue for an Event
1. Go to **Organizer Hub** and click **Certificate Hub** on your event.
2. Select your **Certificate Template** (or use the default layout) and **Certificate Type** (*Participation*, *Winner*, *Runner-up*, *Volunteer*, *Speaker*).
3. Optionally upload an **Authorized Signature** right there if your template didn't already include one.
4. By default, certificates are issued only to participants marked **Attended** (check *Override attendance rule* only if you want to issue to everyone confirmed).
5. Click **Generate Certificates in Bulk**. Every participant immediately receives a notification and sees their certificate in **My Certificates**.

#### Option B: Direct Issuance to Any Student or CSV List
1. Click **Issue Certificates** in the left sidebar.
2. Choose your **Certificate Template**, **Certificate Type**, and optionally upload an **Authorized Signature** & **Signatory Name**.
3. Add recipients using any of these methods:
   - **Search Registered Student**: Type a student's name, email, or roll number in the search box and click **+ Add** — it fills in their Name & Email automatically.
   - **Type Manually**: Click **+ Add Row** and enter Name, Email, and any template fields.
   - **Bulk CSV Import**: Click **CSV Template** to download a starter file, fill it in Excel/Sheets, and click **Import CSV**.
4. Click **Issue Certificates**.
   - Any certificate issued to a student's registered email **automatically lands on that student's "My Certificates" page** (even if they sign up later with that email!).
5. Switch to the **Issued Registry** tab on the same page anytime to **Preview**, download **PDF**, open **Verify**, or **Revoke / Reinstate** any certificate.

---

## Part 3: Guide for Faculty Approvers

1. Click **Faculty Approvals** in the left sidebar.
2. Review pending event proposals submitted by organizers (description, dates, seat capacity, standard vs. IEEE fee).
3. Click **Approve & Publish** to make the event visible to students, OR click **Request Revision** and enter feedback remarks to send it back to the organizer.

---

## Part 4: Guide for System Administrators (Admins)

Click **System Admin** in the left sidebar to access five management tabs:

### 1. Analytics
View live campus-wide numbers: total registered users, events, confirmed registrations, verified IEEE members, certificates issued, and event breakdown by category.

### 2. User Governance (Promoting Users & Managing Tiers)
Here you can search users, filter by **Role** or **IEEE Tier**, and promote any user effortlessly:
- **1-Click `+ IEEE` Button**: On any non-IEEE user row, click **`+ IEEE`** to immediately promote them from a Normal User to a **Verified IEEE Member** (with automatic IEEE ID and 1-year validity).
- **Full Promotion Window (`PROMOTE` Button)**:
  1. Click **`PROMOTE`** on any user's row.
  2. Pick one of the **Quick Promotion Presets** at the top:
     - **Normal User** (Standard student without IEEE status)
     - **IEEE Member** (Verified IEEE discounts enabled)
     - **Organizer** (Can host events & issue certificates — optionally assign an Organizing Body right below!)
     - **Approver** (Faculty proposal reviewer)
     - **System Admin** (Full admin access)
  3. Optionally customize their **IEEE Number** or **Expiry Date**, then click **Confirm Promotion**.
  4. The user immediately receives an in-app notification of their new access level.
- **Disable / Enable**: Temporarily suspend or reactivate any account without deleting its history.

### 3. Organizing Bodies
Create new campus clubs, departments, or IEEE chapters (flagged **General** or **IEEE**) and assign Organizers to manage them.

### 4. IEEE Approvals
Review pending IEEE membership card submissions from students, or click **Bulk CSV** to verify an entire list of IEEE members at once.

### 5. System Audit Logs
Inspect a searchable, tamper-resistant record of important admin and organizer actions (user promotions, role changes, fee edits, event cancellations, and certificate revocations).

---

## Part 5: Public Certificate Verification (No Login Needed)

Anyone — employers, universities, faculty, or students — can verify a certificate's authenticity without creating an account:

1. Scan the **QR code** printed on any certificate, OR click **Verify Credential** in the left sidebar.
2. Enter the **Certificate ID** (for example: `CERT-CEMS-2026-XXXXXX`) and click **Verify**.
3. The verification page displays:
   - Status banner (**Authentic & Valid**, **Expired**, or **Revoked** with reason).
   - Recipient name, event/program title, organizing body, issue date, and unique **Integrity Hash**.
   - **Live Visual Preview** of the actual certificate (including signature and Certificate ID) plus a **Download PDF** button.

