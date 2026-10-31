const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding College Event Management System (CEMS) database...');

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@123', salt);
  const approverPassword = await bcrypt.hash('Approver@123', salt);
  const organizerPassword = await bcrypt.hash('Organizer@123', salt);
  const studentPassword = await bcrypt.hash('Student@123', salt);

  // 1. Clean existing records in cems schema (in reverse dependency order)
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.certificateTemplate.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.registration.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.organizerAssignment.deleteMany({});
  await prisma.organizingBody.deleteMany({});
  await prisma.ieeeMembership.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleaned old records.');

  // 2. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Ramesh Kumar (Admin)',
      email: 'admin@cems.edu',
      passwordHash: adminPassword,
      rollNo: 'ADM-001',
      department: 'Dean Office',
      year: 'Faculty',
      phone: '9876543210',
      role: 'ADMIN',
      isActive: true,
      isEmailVerified: true
    }
  });

  const approver = await prisma.user.create({
    data: {
      name: 'Prof. Ananya Sen (Approver)',
      email: 'approver@cems.edu',
      passwordHash: approverPassword,
      rollNo: 'FAC-102',
      department: 'Computer Science & Engineering',
      year: 'Faculty',
      phone: '9876543211',
      role: 'APPROVER',
      isActive: true,
      isEmailVerified: true
    }
  });

  const organizer = await prisma.user.create({
    data: {
      name: 'Vikramaditya Rao (Organizer)',
      email: 'organizer@cems.edu',
      passwordHash: organizerPassword,
      rollNo: '21CS089',
      department: 'Computer Science & Engineering',
      year: 'Final Year',
      phone: '9876543212',
      role: 'ORGANIZER',
      isActive: true,
      isEmailVerified: true
    }
  });

  const ieeeStudent = await prisma.user.create({
    data: {
      name: 'Rohan Sharma (IEEE Member)',
      email: 'ieee.student@cems.edu',
      passwordHash: studentPassword,
      rollNo: '22IT045',
      department: 'Information Technology',
      year: 'Third Year',
      phone: '9876543213',
      role: 'STUDENT',
      isActive: true,
      isEmailVerified: true
    }
  });

  const pendingStudent = await prisma.user.create({
    data: {
      name: 'Pooja Hegde (IEEE Pending)',
      email: 'pending.student@cems.edu',
      passwordHash: studentPassword,
      rollNo: '23EC034',
      department: 'Electronics & Communication',
      year: 'Second Year',
      phone: '9876543214',
      role: 'STUDENT',
      isActive: true,
      isEmailVerified: true
    }
  });

  const expiredStudent = await prisma.user.create({
    data: {
      name: 'Karan Mehra (IEEE Expired)',
      email: 'expired.student@cems.edu',
      passwordHash: studentPassword,
      rollNo: '21ME078',
      department: 'Mechanical Engineering',
      year: 'Final Year',
      phone: '9876543215',
      role: 'STUDENT',
      isActive: true,
      isEmailVerified: true
    }
  });

  const generalStudent = await prisma.user.create({
    data: {
      name: 'Sneha Patel (Student)',
      email: 'student@cems.edu',
      passwordHash: studentPassword,
      rollNo: '23CS112',
      department: 'Computer Science & Engineering',
      year: 'Second Year',
      phone: '9876543216',
      role: 'STUDENT',
      isActive: true,
      isEmailVerified: true
    }
  });

  console.log('Created Users.');

  // 3. Create IEEE Memberships
  // Rohan Sharma: Verified & Active (Valid for 1 year)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  await prisma.ieeeMembership.create({
    data: {
      userId: ieeeStudent.id,
      membershipNumber: 'IEEE-98765432',
      grade: 'Student Member',
      expiryDate: oneYearFromNow,
      status: 'VERIFIED',
      verifiedById: admin.id
    }
  });

  // Pooja Hegde: Pending Verification
  await prisma.ieeeMembership.create({
    data: {
      userId: pendingStudent.id,
      membershipNumber: 'IEEE-11223344',
      grade: 'Student Member',
      expiryDate: oneYearFromNow,
      status: 'PENDING'
    }
  });

  // Karan Mehra: Expired
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30); // 30 days ago

  await prisma.ieeeMembership.create({
    data: {
      userId: expiredStudent.id,
      membershipNumber: 'IEEE-55667788',
      grade: 'Graduate Student Member',
      expiryDate: pastDate,
      status: 'VERIFIED',
      verifiedById: admin.id
    }
  });

  console.log('Created IEEE Memberships.');

  // 4. Create Organizing Bodies
  const ieeeBody = await prisma.organizingBody.create({
    data: {
      name: 'IEEE Student Branch',
      type: 'IEEE',
      description: 'Official student branch under IEEE Region 10, hosting technical workshops, hackathons and symposia.',
      logoUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80'
    }
  });

  const csBody = await prisma.organizingBody.create({
    data: {
      name: 'Computer Science Society',
      type: 'GENERAL',
      description: 'Departmental developer and competitive programming community.',
      logoUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80'
    }
  });

  const cultBody = await prisma.organizingBody.create({
    data: {
      name: 'Literary & Cultural Club',
      type: 'GENERAL',
      description: 'Campus creative arts, debate society, and cultural fest organizer.',
      logoUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
    }
  });

  // 5. Assign Organizers
  await prisma.organizerAssignment.create({
    data: {
      userId: organizer.id,
      organizingBodyId: ieeeBody.id
    }
  });

  await prisma.organizerAssignment.create({
    data: {
      userId: organizer.id,
      organizingBodyId: csBody.id
    }
  });

  console.log('Created Organizing Bodies and Assignments.');

  // 6. Create Events
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeekStart = new Date();
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 1);

  const inTwoWeeksStart = new Date();
  inTwoWeeksStart.setDate(inTwoWeeksStart.getDate() + 14);
  const inTwoWeeksEnd = new Date(inTwoWeeksStart);
  inTwoWeeksEnd.setDate(inTwoWeeksEnd.getDate() + 2);

  const pastEventStart = new Date();
  pastEventStart.setDate(pastEventStart.getDate() - 10);
  const pastEventEnd = new Date(pastEventStart);
  pastEventEnd.setDate(pastEventEnd.getDate() + 1);

  // Event 1: Web Dev Workshop (IEEE, Paid: Std Rs 300, IEEE Rs 200)
  const event1 = await prisma.event.create({
    data: {
      organizingBodyId: ieeeBody.id,
      title: 'Full-Stack Web Dev & Cloud Architecture Workshop',
      description: 'A hands-on intensive workshop diving into microservices, Next.js, Docker, and scalable cloud deployment. Participants will build a production-grade app from scratch.',
      category: 'Workshop',
      startDateTime: nextWeekStart,
      endDateTime: nextWeekEnd,
      venue: 'Seminar Hall 3, Tech Block',
      mode: 'HYBRID',
      bannerUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
      eligibility: 'All Engineering & Technology Students',
      registrationDeadline: tomorrow,
      contactName: 'Vikramaditya Rao',
      contactEmail: 'organizer@cems.edu',
      contactPhone: '9876543212',
      seatLimit: 50,
      seatsConfirmed: 2,
      isFree: false,
      standardFee: 300,
      ieeeFee: 200, // Validated: strictly less than standardFee
      status: 'PUBLISHED',
      refundPolicy: 'Cancellations allowed up to 24 hours prior to registration deadline.',
      customFields: [
        { name: 'githubUrl', label: 'GitHub Profile URL', type: 'text', required: true },
        { name: 'tshirtSize', label: 'T-Shirt Size', type: 'select', options: ['S', 'M', 'L', 'XL'], required: false }
      ],
      isTeamEvent: false,
      requiresApproval: true,
      requiresAttendanceForCert: true,
      certificateTypes: ['PARTICIPATION', 'WINNER', 'VOLUNTEER'],
      createdById: organizer.id
    }
  });

  // Event 2: Hackathon (IEEE, Team Event, Paid: Std Rs 500, IEEE Rs 350)
  const event2 = await prisma.event.create({
    data: {
      organizingBodyId: ieeeBody.id,
      title: 'National Level AI & GenAI 36-Hour Hackathon 2026',
      description: 'Compete with the top developer teams to build real-world AI applications. Cash prizes, investor connect, and internship offers for winners.',
      category: 'Hackathon',
      startDateTime: inTwoWeeksStart,
      endDateTime: inTwoWeeksEnd,
      venue: 'Central Innovation Lab & Online Discord',
      mode: 'HYBRID',
      bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      eligibility: 'Open to all undergraduate students',
      registrationDeadline: nextWeekStart,
      contactName: 'Vikramaditya Rao',
      contactEmail: 'organizer@cems.edu',
      contactPhone: '9876543212',
      seatLimit: 80,
      seatsConfirmed: 0,
      isFree: false,
      standardFee: 500,
      ieeeFee: 350,
      status: 'PUBLISHED',
      refundPolicy: 'Full refund if event is rescheduled or cancelled.',
      customFields: [
        { name: 'teamName', label: 'Team Name', type: 'text', required: true },
        { name: 'projectTrack', label: 'Preferred Track', type: 'select', options: ['Agentic AI', 'Healthcare AI', 'EdTech', 'FinTech'], required: true }
      ],
      isTeamEvent: true,
      minTeamSize: 2,
      maxTeamSize: 4,
      requiresApproval: true,
      requiresAttendanceForCert: true,
      certificateTypes: ['PARTICIPATION', 'WINNER', 'RUNNER_UP', 'SPEAKER'],
      createdById: organizer.id
    }
  });

  // Event 3: Cultural Fest Quiz (General, Paid: Rs 100 uniform)
  const event3 = await prisma.event.create({
    data: {
      organizingBodyId: cultBody.id,
      title: 'Annual Cultural Fest Quiz 2026',
      description: 'Test your trivia knowledge across cinema, history, literature, pop culture and general science.',
      category: 'Cultural Fest',
      startDateTime: nextWeekStart,
      endDateTime: nextWeekStart,
      venue: 'Main Auditorium',
      mode: 'OFFLINE',
      bannerUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
      eligibility: 'All college students',
      registrationDeadline: tomorrow,
      contactName: 'Cultural Secretary',
      contactEmail: 'cult@cems.edu',
      contactPhone: '9876543219',
      seatLimit: 40,
      seatsConfirmed: 1,
      isFree: false,
      standardFee: 100,
      ieeeFee: 0, // General body - no IEEE discount applies
      status: 'PUBLISHED',
      refundPolicy: 'No refunds within 48 hours of event.',
      customFields: [],
      isTeamEvent: false,
      requiresApproval: true,
      requiresAttendanceForCert: true,
      certificateTypes: ['PARTICIPATION', 'WINNER'],
      createdById: organizer.id
    }
  });

  // Event 4: Cybersecurity Seminar (General, FREE)
  const event4 = await prisma.event.create({
    data: {
      organizingBodyId: csBody.id,
      title: 'Cybersecurity & Ethical Hacking Hands-on Masterclass',
      description: 'Learn ethical penetration testing, modern web vulnerabilities (OWASP Top 10), and zero-trust security foundations from industry red-teamers.',
      category: 'Seminar',
      startDateTime: nextWeekStart,
      endDateTime: nextWeekStart,
      venue: 'Auditorium Hall B',
      mode: 'OFFLINE',
      bannerUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
      eligibility: 'All students',
      registrationDeadline: tomorrow,
      contactName: 'Vikramaditya Rao',
      contactEmail: 'organizer@cems.edu',
      contactPhone: '9876543212',
      seatLimit: 60,
      seatsConfirmed: 0,
      isFree: true,
      standardFee: 0,
      ieeeFee: 0,
      status: 'PUBLISHED',
      refundPolicy: 'Free event, registration confirmation immediate.',
      customFields: [],
      isTeamEvent: false,
      requiresApproval: true,
      requiresAttendanceForCert: true,
      certificateTypes: ['PARTICIPATION'],
      createdById: organizer.id
    }
  });

  // Event 5: Proposal Pending Approval (for Approver review testing)
  const event5 = await prisma.event.create({
    data: {
      organizingBodyId: ieeeBody.id,
      title: 'Quantum Computing & Algorithms Symposium',
      description: 'Deep dive into Qubits, superposition, Grover and Shor algorithms with IBM Qiskit simulator experiments.',
      category: 'Seminar',
      startDateTime: inTwoWeeksStart,
      endDateTime: inTwoWeeksEnd,
      venue: 'Virtual Teams Call',
      mode: 'ONLINE',
      bannerUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
      eligibility: 'All students & researchers',
      registrationDeadline: inTwoWeeksStart,
      contactName: 'Vikramaditya Rao',
      contactEmail: 'organizer@cems.edu',
      contactPhone: '9876543212',
      seatLimit: 120,
      seatsConfirmed: 0,
      isFree: false,
      standardFee: 250,
      ieeeFee: 150,
      status: 'PENDING_APPROVAL',
      refundPolicy: 'Full refund on cancellation.',
      customFields: [],
      isTeamEvent: false,
      requiresApproval: true,
      requiresAttendanceForCert: true,
      certificateTypes: ['PARTICIPATION', 'SPEAKER'],
      createdById: organizer.id
    }
  });

  // Event 6: Past Completed Event (for Attendance & Certificate testing)
  const event6 = await prisma.event.create({
    data: {
      organizingBodyId: ieeeBody.id,
      title: 'Robotics & Embedded Systems Hands-on Bootcamp',
      description: 'Build micro-controller projects with ESP32, sensor fusion, and real-time telemetry streaming.',
      category: 'Workshop',
      startDateTime: pastEventStart,
      endDateTime: pastEventEnd,
      venue: 'Robotics Lab 1',
      mode: 'OFFLINE',
      bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
      eligibility: 'Engineering Students',
      registrationDeadline: pastEventStart,
      contactName: 'Vikramaditya Rao',
      contactEmail: 'organizer@cems.edu',
      contactPhone: '9876543212',
      seatLimit: 30,
      seatsConfirmed: 2,
      isFree: false,
      standardFee: 300,
      ieeeFee: 200,
      status: 'COMPLETED',
      refundPolicy: 'Standard event refund policy.',
      customFields: [],
      isTeamEvent: false,
      requiresApproval: true,
      requiresAttendanceForCert: true,
      certificateTypes: ['PARTICIPATION', 'WINNER'],
      createdById: organizer.id
    }
  });

  console.log('Created Events.');

  // 7. Seed Sample Registrations
  // Reg 1: Rohan Sharma (IEEE) for Event 1 (IEEE fee applied: Rs 200)
  const reg1 = await prisma.registration.create({
    data: {
      eventId: event1.id,
      userId: ieeeStudent.id,
      feeApplied: 200,
      feeType: 'IEEE',
      status: 'CONFIRMED',
      ticketCode: 'TKT-WEB-001',
      qrCode: 'CEMS:TKT-WEB-001:' + event1.id + ':' + ieeeStudent.id,
      customAnswers: { githubUrl: 'https://github.com/rohansharma', tshirtSize: 'L' },
      attended: false
    }
  });

  // Reg 2: Sneha Patel (General Student) for Event 1 (Standard fee applied: Rs 300)
  const reg2 = await prisma.registration.create({
    data: {
      eventId: event1.id,
      userId: generalStudent.id,
      feeApplied: 300,
      feeType: 'STANDARD',
      status: 'CONFIRMED',
      ticketCode: 'TKT-WEB-002',
      qrCode: 'CEMS:TKT-WEB-002:' + event1.id + ':' + generalStudent.id,
      customAnswers: { githubUrl: 'https://github.com/snehapatel', tshirtSize: 'M' },
      attended: false
    }
  });

  // Reg 3: General student for Event 3 Cultural Quiz (Standard Rs 100)
  const reg3 = await prisma.registration.create({
    data: {
      eventId: event3.id,
      userId: generalStudent.id,
      feeApplied: 100,
      feeType: 'STANDARD',
      status: 'CONFIRMED',
      ticketCode: 'TKT-QUIZ-001',
      qrCode: 'CEMS:TKT-QUIZ-001:' + event3.id + ':' + generalStudent.id,
      customAnswers: {},
      attended: false
    }
  });

  // Reg 4 & 5: Completed Event Registrations with Attendance marked
  const reg4 = await prisma.registration.create({
    data: {
      eventId: event6.id,
      userId: ieeeStudent.id,
      feeApplied: 200,
      feeType: 'IEEE',
      status: 'CONFIRMED',
      ticketCode: 'TKT-ROBO-001',
      qrCode: 'CEMS:TKT-ROBO-001:' + event6.id + ':' + ieeeStudent.id,
      customAnswers: {},
      attended: true
    }
  });

  const reg5 = await prisma.registration.create({
    data: {
      eventId: event6.id,
      userId: generalStudent.id,
      feeApplied: 300,
      feeType: 'STANDARD',
      status: 'CONFIRMED',
      ticketCode: 'TKT-ROBO-002',
      qrCode: 'CEMS:TKT-ROBO-002:' + event6.id + ':' + generalStudent.id,
      customAnswers: {},
      attended: true
    }
  });

  // Attendance Records for Event 6
  const event6DateStr = pastEventStart.toISOString().split('T')[0];
  await prisma.attendance.create({
    data: {
      registrationId: reg4.id,
      eventId: event6.id,
      date: event6DateStr,
      markedById: organizer.id,
      method: 'QR_SCAN'
    }
  });

  await prisma.attendance.create({
    data: {
      registrationId: reg5.id,
      eventId: event6.id,
      date: event6DateStr,
      markedById: organizer.id,
      method: 'MANUAL'
    }
  });

  // 8. Certificate Template for Event 6
  const certTemplate = await prisma.certificateTemplate.create({
    data: {
      eventId: event6.id,
      name: 'Default IEEE Technical Certificate',
      signatories: [
        { name: 'Dr. Ramesh Kumar', title: 'Dean of Student Affairs', role: 'Institutional Head' },
        { name: 'Prof. Ananya Sen', title: 'Branch Counselor, IEEE', role: 'Faculty Coordinator' }
      ],
      layoutConfig: { theme: 'classic-navy', border: 'gold-double' }
    }
  });

  // 9. Issued Certificate for Rohan Sharma
  const certId = 'CERT-CEMS-ROBO-948102';
  await prisma.certificate.create({
    data: {
      certificateId: certId,
      registrationId: reg4.id,
      eventId: event6.id,
      userId: ieeeStudent.id,
      recipientName: ieeeStudent.name,
      eventTitle: event6.title,
      type: 'PARTICIPATION',
      templateId: certTemplate.id,
      status: 'VALID',
      qrCode: 'http://localhost:3000/verify-certificate/' + certId
    }
  });

  // 10. Notifications
  await prisma.notification.create({
    data: {
      userId: ieeeStudent.id,
      title: 'Registration Confirmed',
      message: 'You have been successfully registered for Full-Stack Web Dev & Cloud Architecture Workshop! Your ticket is available.',
      type: 'REGISTRATION',
      link: '/dashboard/registrations'
    }
  });

  await prisma.notification.create({
    data: {
      userId: ieeeStudent.id,
      title: 'Certificate Issued',
      message: 'Your certificate for Robotics & Embedded Systems Hands-on Bootcamp is ready for download.',
      type: 'CERTIFICATE',
      link: '/dashboard/certificates'
    }
  });

  // 11. Sample Audit Logs
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      action: 'IEEE_MEMBERSHIP_VERIFIED',
      entity: 'IeeeMembership',
      entityId: ieeeStudent.id,
      newValue: { membershipNumber: 'IEEE-98765432', status: 'VERIFIED' }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: approver.id,
      actorName: approver.name,
      actorRole: approver.role,
      action: 'EVENT_PUBLISHED',
      entity: 'Event',
      entityId: event1.id,
      newValue: { title: event1.title, status: 'PUBLISHED' }
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

