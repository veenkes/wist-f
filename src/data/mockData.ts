export interface Student {
  id: string;
  name: string;
  surname: string;
  grade: number;
  className: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  address?: string;
  idPassport?: string;
  parents: Parent[];
  status: 'active' | 'graduated' | 'suspended' | 'debt';
  academicStatus: 'excellent' | 'good' | 'average' | 'needs-improvement';
  enrollmentDate: string;
  avatar?: string;
  balance: number;
  initialBalance?: number;
  totalPaid: number;
  totalOwed: number;
  attendance: number; // percentage
  gpa?: number;
  documents?: string[];
  notes?: string;
}

export interface Parent {
  name: string;
  email: string;
  phone: string;
  relationship: string;
}

export interface Transaction {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  amount: number;
  currency: string;
  paymentMethod: 'Bank Transfer' | 'Card' | 'E-wallet' | 'Cash';
  paymentSource: 'Payme' | 'Uzum Bank' | 'Company Transfer' | 'Cash' | 'Manual';
  purpose: string;
  date: string;
  status: 'Paid' | 'Pending' | 'Refunded' | 'Verified' | 'Failed';
  receiptId?: string;
  verificationStatus?: 'Pending' | 'Verified' | 'Failed';
  verifiedBy?: string;
  verifiedAt?: string;
  transactionId?: string;
}

export interface Expense {
  id: string;
  category: 'Salaries' | 'Office/Equipment' | 'Software/Subscriptions' | 'Marketing' | 'Transportation' | 'Facilities' | 'Supplies' | 'Events' | 'Other';
  payee: string;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Card' | 'Check';
  project?: string;
  attachments?: string[];
  description: string;
  receiptUrl?: string;
}

export interface Event {
  id: string;
  title: string;
  type: 'Meeting' | 'Sports' | 'Academic' | 'Social' | 'Administrative' | 'Training' | 'Celebration' | 'Announcement';
  date: string;
  time: string;
  endTime?: string;
  location: string;
  locationType: 'Online' | 'Offline' | 'Hybrid';
  description: string;
  audience: string;
  attendees?: number;
  organizer: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Canceled';
  category: string;
  attachments?: string[];
  assignedTo?: string[]; // IDs of groups, students, or staff
  notifications?: {
    id: string;
    sentAt: string;
    sentBy: string;
    recipients: string;
    type: 'in-app' | 'email' | 'push';
    message: string;
  }[];
  reminderSet?: boolean;
  color?: string;
}

export interface Debtor {
  id: string;
  studentName: string;
  parentName: string;
  amount: number;
  daysOverdue: number;
  lastPayment: string;
}

// Mock Data
export const mockStudents: Student[] = [
  {
    id: 'STU001',
    name: 'Aruzhan',
    surname: 'Karimova',
    grade: 8,
    className: '8-A',
    dateOfBirth: '2012-05-14',
    phone: '+998901234567',
    email: 'aruzhan.k@student.wist.uz',
    address: 'Tashkent, Mirzo Ulugbek District',
    idPassport: 'AA1234567',
    status: 'active',
    academicStatus: 'excellent',
    enrollmentDate: '2020-09-01',
    balance: 0,
    totalPaid: 18000000,
    totalOwed: 0,
    attendance: 96,
    gpa: 4.7,
    documents: ['birth-certificate.pdf', 'medical-records.pdf'],
    parents: [
      { name: 'Gulnara Karimova', email: 'gulnara@example.com', phone: '+998901234567', relationship: 'Mother' },
      { name: 'Rustam Karimov', email: 'rustam@example.com', phone: '+998901234568', relationship: 'Father' }
    ]
  },
  {
    id: 'STU002',
    name: 'Murod',
    surname: 'Ismoilov',
    grade: 5,
    className: '5-B',
    dateOfBirth: '2015-02-03',
    phone: '+998901234568',
    email: 'murod.i@student.wist.uz',
    address: 'Tashkent, Yunusabad District',
    idPassport: 'AB2345678',
    status: 'active',
    academicStatus: 'good',
    enrollmentDate: '2021-09-01',
    balance: 0,
    totalPaid: 12000000,
    totalOwed: 0,
    attendance: 92,
    gpa: 4.2,
    documents: ['birth-certificate.pdf'],
    parents: [
      { name: 'Nodira Ismoilova', email: 'nodira@example.com', phone: '+998901234569', relationship: 'Mother' },
      { name: 'Jasur Ismoilov', email: 'jasur@example.com', phone: '+998901234570', relationship: 'Father' }
    ]
  },
  {
    id: 'STU003',
    name: 'Lola',
    surname: 'Tursunova',
    grade: 10,
    className: '10-A',
    dateOfBirth: '2009-11-21',
    phone: '+998901234569',
    email: 'lola.t@student.wist.uz',
    address: 'Tashkent, Chilanzar District',
    idPassport: 'AC3456789',
    status: 'debt',
    academicStatus: 'average',
    enrollmentDate: '2019-09-01',
    balance: -1500000,
    totalPaid: 22500000,
    totalOwed: 1500000,
    attendance: 85,
    gpa: 3.5,
    documents: ['birth-certificate.pdf', 'transfer-docs.pdf'],
    parents: [
      { name: 'Malika Tursunova', email: 'malika@example.com', phone: '+998901234571', relationship: 'Mother' },
      { name: 'Bobur Tursunov', email: 'bobur@example.com', phone: '+998901234572', relationship: 'Father' }
    ]
  },
  {
    id: 'STU004',
    name: 'Bekzod',
    surname: 'Rasulov',
    grade: 2,
    className: '2-A',
    dateOfBirth: '2018-07-07',
    phone: '+998901234570',
    email: 'bekzod.r@student.wist.uz',
    address: 'Tashkent, Sergeli District',
    idPassport: 'AD4567890',
    status: 'active',
    academicStatus: 'good',
    enrollmentDate: '2022-09-01',
    balance: 0,
    totalPaid: 6000000,
    totalOwed: 0,
    attendance: 98,
    gpa: 4.5,
    documents: ['birth-certificate.pdf', 'vaccination-records.pdf'],
    parents: [
      { name: 'Zarina Rasulova', email: 'zarina@example.com', phone: '+998901234573', relationship: 'Mother' },
      { name: 'Aziz Rasulov', email: 'aziz@example.com', phone: '+998901234574', relationship: 'Father' }
    ]
  },
  {
    id: 'STU005',
    name: 'Dilnoza',
    surname: 'Akhmedova',
    grade: 7,
    className: '7-B',
    dateOfBirth: '2013-08-30',
    phone: '+998901234571',
    email: 'dilnoza.a@student.wist.uz',
    address: 'Tashkent, Yakkasaray District',
    idPassport: 'AE5678901',
    status: 'active',
    academicStatus: 'excellent',
    enrollmentDate: '2020-09-01',
    balance: 0,
    totalPaid: 15000000,
    totalOwed: 0,
    attendance: 94,
    gpa: 4.8,
    documents: ['birth-certificate.pdf', 'medical-records.pdf', 'achievements.pdf'],
    parents: [
      { name: 'Shoira Akhmedova', email: 'shoira@example.com', phone: '+998901234575', relationship: 'Mother' },
      { name: 'Farrux Akhmedov', email: 'farrux@example.com', phone: '+998901234576', relationship: 'Father' }
    ]
  },
  {
    id: 'STU006',
    name: 'Azamat',
    surname: 'Nazarov',
    grade: 11,
    className: '11-A',
    dateOfBirth: '2008-03-15',
    phone: '+998901234577',
    email: 'azamat.n@student.wist.uz',
    address: 'Tashkent, Shaykhontohur District',
    idPassport: 'AF6789012',
    status: 'active',
    academicStatus: 'excellent',
    enrollmentDate: '2018-09-01',
    balance: 0,
    totalPaid: 27000000,
    totalOwed: 0,
    attendance: 97,
    gpa: 4.9,
    parents: [
      { name: 'Kamila Nazarova', email: 'kamila@example.com', phone: '+998901234578', relationship: 'Mother' }
    ]
  },
  {
    id: 'STU007',
    name: 'Shahzoda',
    surname: 'Usmanova',
    grade: 3,
    className: '3-B',
    dateOfBirth: '2017-12-20',
    phone: '+998901234579',
    email: 'shahzoda.u@student.wist.uz',
    address: 'Tashkent, Almazar District',
    idPassport: 'AG7890123',
    status: 'active',
    academicStatus: 'good',
    enrollmentDate: '2023-09-01',
    balance: 0,
    totalPaid: 4500000,
    totalOwed: 0,
    attendance: 91,
    gpa: 4.3,
    parents: [
      { name: 'Dilbar Usmanova', email: 'dilbar@example.com', phone: '+998901234580', relationship: 'Mother' },
      { name: 'Timur Usmanov', email: 'timur@example.com', phone: '+998901234581', relationship: 'Father' }
    ]
  },
  {
    id: 'STU008',
    name: 'Jasur',
    surname: 'Abdullayev',
    grade: 9,
    className: '9-A',
    dateOfBirth: '2011-06-18',
    phone: '+998901234582',
    email: 'jasur.a@student.wist.uz',
    address: 'Tashkent, Mirabad District',
    idPassport: 'AH8901234',
    status: 'suspended',
    academicStatus: 'needs-improvement',
    enrollmentDate: '2019-09-01',
    balance: -3000000,
    totalPaid: 18000000,
    totalOwed: 3000000,
    attendance: 72,
    gpa: 2.8,
    parents: [
      { name: 'Sevara Abdullayeva', email: 'sevara@example.com', phone: '+998901234583', relationship: 'Mother' }
    ]
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: 'TXN001',
    studentId: '1',
    studentName: 'Aruzhan Karimova',
    parentName: 'Gulnara Karimova',
    amount: 1500000,
    currency: 'UZS',
    paymentMethod: 'Bank Transfer',
    paymentSource: 'Company Transfer',
    purpose: 'Monthly Tuition - October',
    date: '2024-11-10',
    status: 'Verified',
    verificationStatus: 'Verified',
    verifiedBy: 'Admin User',
    verifiedAt: '2024-11-10T10:30:00',
    receiptId: 'RCP001',
    transactionId: 'CT-20241110-001'
  },
  {
    id: 'TXN002',
    studentId: '2',
    studentName: 'Murod Ismoilov',
    parentName: 'Nodira Ismoilova',
    amount: 1500000,
    currency: 'UZS',
    paymentMethod: 'E-wallet',
    paymentSource: 'Payme',
    purpose: 'Monthly Tuition - November',
    date: '2024-11-09',
    status: 'Paid',
    receiptId: 'RCP002',
    transactionId: 'PY-20241109-4567'
  },
  {
    id: 'TXN003',
    studentId: '3',
    studentName: 'Lola Tursunova',
    parentName: 'Malika Tursunova',
    amount: 1500000,
    currency: 'UZS',
    paymentMethod: 'E-wallet',
    paymentSource: 'Uzum Bank',
    purpose: 'Monthly Tuition - November',
    date: '2024-11-08',
    status: 'Paid',
    receiptId: 'RCP003',
    transactionId: 'UZ-20241108-8901'
  },
  {
    id: 'TXN004',
    studentId: '1',
    studentName: 'Aruzhan Karimova',
    parentName: 'Rustam Karimov',
    amount: 500000,
    currency: 'UZS',
    paymentMethod: 'Cash',
    paymentSource: 'Cash',
    purpose: 'Sports Day Fee',
    date: '2024-11-07',
    status: 'Paid',
    receiptId: 'RCP004',
    transactionId: 'CASH-20241107-001'
  },
  {
    id: 'TXN005',
    studentId: '4',
    studentName: 'Bekzod Rasulov',
    parentName: 'Zarina Rasulova',
    amount: 1500000,
    currency: 'UZS',
    paymentMethod: 'Bank Transfer',
    paymentSource: 'Company Transfer',
    purpose: 'Monthly Tuition - November',
    date: '2024-11-06',
    status: 'Pending',
    verificationStatus: 'Pending',
    transactionId: 'CT-20241106-002'
  },
  {
    id: 'TXN006',
    studentId: '5',
    studentName: 'Dilnoza Akhmedova',
    parentName: 'Shoira Akhmedova',
    amount: 200000,
    currency: 'UZS',
    paymentMethod: 'Card',
    paymentSource: 'Payme',
    purpose: 'Library Fine',
    date: '2024-11-05',
    status: 'Refunded',
    receiptId: 'RCP005',
    transactionId: 'PY-20241105-1234'
  },
  {
    id: 'TXN007',
    studentId: '2',
    studentName: 'Murod Ismoilov',
    parentName: 'Jasur Ismoilov',
    amount: 800000,
    currency: 'UZS',
    paymentMethod: 'E-wallet',
    paymentSource: 'Uzum Bank',
    purpose: 'Extracurricular Activities',
    date: '2024-11-04',
    status: 'Paid',
    receiptId: 'RCP006',
    transactionId: 'UZ-20241104-5678'
  },
  {
    id: 'TXN008',
    studentId: '3',
    studentName: 'Lola Tursunova',
    parentName: 'Bobur Tursunov',
    amount: 1500000,
    currency: 'UZS',
    paymentMethod: 'Bank Transfer',
    paymentSource: 'Company Transfer',
    purpose: 'Monthly Tuition - October',
    date: '2024-10-28',
    status: 'Failed',
    verificationStatus: 'Failed',
    transactionId: 'CT-20241028-003'
  },
  {
    id: 'TXN009',
    studentId: '4',
    studentName: 'Bekzod Rasulov',
    parentName: 'Aziz Rasulov',
    amount: 600000,
    currency: 'UZS',
    paymentMethod: 'Cash',
    paymentSource: 'Manual',
    purpose: 'Uniform Purchase',
    date: '2024-11-03',
    status: 'Paid',
    receiptId: 'RCP007',
    transactionId: 'MAN-20241103-001'
  },
  {
    id: 'TXN010',
    studentId: '5',
    studentName: 'Dilnoza Akhmedova',
    parentName: 'Farrux Akhmedov',
    amount: 1500000,
    currency: 'UZS',
    paymentMethod: 'E-wallet',
    paymentSource: 'Payme',
    purpose: 'Monthly Tuition - November',
    date: '2024-11-02',
    status: 'Paid',
    receiptId: 'RCP008',
    transactionId: 'PY-20241102-7890'
  },
  {
    id: 'TXN011',
    studentId: '1',
    studentName: 'Aruzhan Karimova',
    parentName: 'Gulnara Karimova',
    amount: 300000,
    currency: 'UZS',
    paymentMethod: 'E-wallet',
    paymentSource: 'Uzum Bank',
    purpose: 'Lab Materials',
    date: '2024-11-01',
    status: 'Paid',
    receiptId: 'RCP009',
    transactionId: 'UZ-20241101-3456'
  },
  {
    id: 'TXN012',
    studentId: '2',
    studentName: 'Murod Ismoilov',
    parentName: 'Nodira Ismoilova',
    amount: 1500000,
    currency: 'UZS',
    paymentMethod: 'Bank Transfer',
    paymentSource: 'Company Transfer',
    purpose: 'Monthly Tuition - October',
    date: '2024-10-25',
    status: 'Pending',
    verificationStatus: 'Pending',
    transactionId: 'CT-20241025-004'
  },
  {
    id: 'TXN013',
    studentId: '3',
    studentName: 'Lola Tursunova',
    parentName: 'Malika Tursunova',
    amount: 450000,
    currency: 'UZS',
    paymentMethod: 'Cash',
    paymentSource: 'Cash',
    purpose: 'Field Trip Fee',
    date: '2024-10-30',
    status: 'Paid',
    receiptId: 'RCP010',
    transactionId: 'CASH-20241030-002'
  },
  {
    id: 'TXN014',
    studentId: '4',
    studentName: 'Bekzod Rasulov',
    parentName: 'Zarina Rasulova',
    amount: 250000,
    currency: 'UZS',
    paymentMethod: 'E-wallet',
    paymentSource: 'Payme',
    purpose: 'Lunch Program',
    date: '2024-10-29',
    status: 'Paid',
    receiptId: 'RCP011',
    transactionId: 'PY-20241029-1122'
  },
  {
    id: 'TXN015',
    studentId: '5',
    studentName: 'Dilnoza Akhmedova',
    parentName: 'Shoira Akhmedova',
    amount: 1200000,
    currency: 'UZS',
    paymentMethod: 'E-wallet',
    paymentSource: 'Uzum Bank',
    purpose: 'Art Supplies',
    date: '2024-10-27',
    status: 'Paid',
    receiptId: 'RCP012',
    transactionId: 'UZ-20241027-6789'
  }
];

export const mockExpenses: Expense[] = [
  {
    id: 'EXP001',
    category: 'Facilities',
    payee: 'Tashkent Property Management',
    amount: 50000000,
    date: '2024-11-01',
    paymentMethod: 'Bank Transfer',
    project: 'Monthly Rent',
    description: 'School building monthly rent payment',
    attachments: ['invoice-001.pdf']
  },
  {
    id: 'EXP002',
    category: 'Supplies',
    payee: 'Educational Supply Co.',
    amount: 15000000,
    date: '2024-11-05',
    paymentMethod: 'Card',
    project: 'Office Supplies',
    description: 'Stationery and office materials',
    attachments: ['receipt-002.pdf']
  },
  {
    id: 'EXP003',
    category: 'Events',
    payee: 'Catering Service Ltd',
    amount: 8000000,
    date: '2024-11-07',
    paymentMethod: 'Cash',
    project: 'Sports Day',
    description: 'Catering for annual sports day event',
    attachments: ['invoice-003.pdf']
  },
  {
    id: 'EXP004',
    category: 'Salaries',
    payee: 'Teaching Staff',
    amount: 120000000,
    date: '2024-11-01',
    paymentMethod: 'Bank Transfer',
    description: 'Monthly salary payment for teaching staff',
    attachments: ['payroll-nov-2024.pdf']
  },
  {
    id: 'EXP005',
    category: 'Software/Subscriptions',
    payee: 'Microsoft Education',
    amount: 2500000,
    date: '2024-11-03',
    paymentMethod: 'Card',
    description: 'Annual Microsoft 365 Education license renewal',
    attachments: ['microsoft-invoice.pdf']
  },
  {
    id: 'EXP006',
    category: 'Office/Equipment',
    payee: 'Tech Solutions Tashkent',
    amount: 18000000,
    date: '2024-11-08',
    paymentMethod: 'Bank Transfer',
    description: '10 new laptops for computer lab',
    attachments: ['laptop-invoice.pdf', 'warranty-docs.pdf']
  },
  {
    id: 'EXP007',
    category: 'Marketing',
    payee: 'Digital Marketing Agency',
    amount: 5000000,
    date: '2024-11-04',
    paymentMethod: 'Bank Transfer',
    description: 'Social media campaign for enrollment season',
    attachments: ['marketing-proposal.pdf']
  },
  {
    id: 'EXP008',
    category: 'Transportation',
    payee: 'School Bus Services',
    amount: 12000000,
    date: '2024-11-02',
    paymentMethod: 'Bank Transfer',
    description: 'Monthly school bus service payment',
    attachments: ['transport-invoice.pdf']
  },
  {
    id: 'EXP009',
    category: 'Supplies',
    payee: 'Science Lab Equipment Co.',
    amount: 7500000,
    date: '2024-10-28',
    paymentMethod: 'Card',
    description: 'Chemistry lab equipment and materials',
    attachments: ['lab-equipment.pdf']
  },
  {
    id: 'EXP010',
    category: 'Software/Subscriptions',
    payee: 'Zoom Communications',
    amount: 1200000,
    date: '2024-10-30',
    paymentMethod: 'Card',
    description: 'Zoom Pro licenses for virtual classes',
    attachments: ['zoom-receipt.pdf']
  },
  {
    id: 'EXP011',
    category: 'Facilities',
    payee: 'Cleaning Services Plus',
    amount: 4000000,
    date: '2024-11-06',
    paymentMethod: 'Cash',
    description: 'Monthly cleaning and maintenance services',
    attachments: ['cleaning-contract.pdf']
  },
  {
    id: 'EXP012',
    category: 'Other',
    payee: 'Insurance Company',
    amount: 8500000,
    date: '2024-10-25',
    paymentMethod: 'Bank Transfer',
    description: 'Quarterly building and liability insurance',
    attachments: ['insurance-policy.pdf']
  }
];

export const mockEvents: Event[] = [
  {
    id: 'EVT001',
    title: 'Parent-Teacher Meeting',
    type: 'Meeting',
    date: '2024-11-15',
    time: '14:00',
    endTime: '16:00',
    location: 'Main Auditorium',
    locationType: 'Offline',
    description: 'Quarterly parent-teacher conference to discuss student progress and academic development',
    audience: 'Parents & Teachers',
    attendees: 150,
    organizer: 'Admin User',
    status: 'Upcoming',
    category: 'Academic',
    color: 'hsl(var(--primary))',
    attachments: ['meeting-agenda.pdf'],
    notifications: [
      {
        id: 'NOTIF001',
        sentAt: '2024-11-10T10:00:00',
        sentBy: 'Admin User',
        recipients: 'All Parents & Teachers',
        type: 'email',
        message: 'Reminder: Parent-Teacher meeting on Nov 15th at 2 PM'
      }
    ]
  },
  {
    id: 'EVT002',
    title: 'Annual Sports Day',
    type: 'Sports',
    date: '2024-11-20',
    time: '09:00',
    endTime: '17:00',
    location: 'School Sports Ground',
    locationType: 'Offline',
    description: 'Annual inter-house sports competition with various athletic events',
    audience: 'All Students & Parents',
    attendees: 300,
    organizer: 'PE Department',
    status: 'Upcoming',
    category: 'Sports',
    color: 'hsl(142, 76%, 36%)',
    attachments: ['sports-schedule.pdf', 'rules.pdf']
  },
  {
    id: 'EVT003',
    title: 'Staff Development Workshop',
    type: 'Training',
    date: '2024-11-18',
    time: '15:30',
    endTime: '18:00',
    location: 'Conference Room',
    locationType: 'Hybrid',
    description: 'Monthly staff development and training session on modern teaching methodologies',
    audience: 'Teaching Staff',
    attendees: 25,
    organizer: 'HR Department',
    status: 'Upcoming',
    category: 'Professional Development',
    color: 'hsl(221, 83%, 53%)',
    notifications: [
      {
        id: 'NOTIF002',
        sentAt: '2024-11-12T09:00:00',
        sentBy: 'HR Manager',
        recipients: 'All Teaching Staff',
        type: 'in-app',
        message: 'Workshop registration is now open'
      }
    ]
  },
  {
    id: 'EVT004',
    title: 'Charity Fair',
    type: 'Social',
    date: '2024-11-25',
    time: '10:00',
    endTime: '15:00',
    location: 'School Courtyard',
    locationType: 'Offline',
    description: 'Annual charity fundraising event with stalls, games, and performances',
    audience: 'School Community',
    attendees: 200,
    organizer: 'Student Council',
    status: 'Upcoming',
    category: 'Community',
    color: 'hsl(280, 70%, 55%)',
    reminderSet: true
  },
  {
    id: 'EVT005',
    title: 'Mid-term Examinations',
    type: 'Academic',
    date: '2024-11-28',
    time: '08:30',
    endTime: '12:30',
    location: 'All Classrooms',
    locationType: 'Offline',
    description: 'Mid-term examination week begins - all students must attend',
    audience: 'Students & Invigilators',
    attendees: 400,
    organizer: 'Academic Office',
    status: 'Upcoming',
    category: 'Examinations',
    color: 'hsl(0, 70%, 50%)',
    notifications: [
      {
        id: 'NOTIF003',
        sentAt: '2024-11-20T14:00:00',
        sentBy: 'Academic Coordinator',
        recipients: 'All Students',
        type: 'email',
        message: 'Exam schedule and guidelines attached'
      },
      {
        id: 'NOTIF004',
        sentAt: '2024-11-25T09:00:00',
        sentBy: 'Academic Coordinator',
        recipients: 'All Students',
        type: 'push',
        message: 'Reminder: Exams start in 3 days'
      }
    ]
  },
  {
    id: 'EVT006',
    title: 'Holiday Celebration',
    type: 'Celebration',
    date: '2024-12-20',
    time: '12:00',
    endTime: '14:00',
    location: 'Main Hall',
    locationType: 'Offline',
    description: 'End of year celebration with performances and festivities',
    audience: 'All Students & Staff',
    attendees: 450,
    organizer: 'Events Committee',
    status: 'Upcoming',
    category: 'Celebration',
    color: 'hsl(45, 100%, 51%)'
  },
  {
    id: 'EVT007',
    title: 'Online Parent Webinar',
    type: 'Meeting',
    date: '2024-11-12',
    time: '19:00',
    endTime: '20:30',
    location: 'Zoom Meeting',
    locationType: 'Online',
    description: 'Virtual session on supporting children with homework and study habits',
    audience: 'Parents',
    attendees: 80,
    organizer: 'Counseling Department',
    status: 'Completed',
    category: 'Parent Education',
    color: 'hsl(200, 70%, 45%)',
    attachments: ['webinar-recording.mp4', 'slides.pdf']
  },
  {
    id: 'EVT008',
    title: 'Science Fair',
    type: 'Academic',
    date: '2024-10-30',
    time: '10:00',
    endTime: '16:00',
    location: 'Science Labs',
    locationType: 'Offline',
    description: 'Student science project exhibition and competition',
    audience: 'Students, Parents & Judges',
    attendees: 250,
    organizer: 'Science Department',
    status: 'Completed',
    category: 'Academic Competition',
    color: 'hsl(160, 60%, 45%)'
  }
];

export const mockDebtors: Debtor[] = [
  {
    id: 'DBT001',
    studentName: 'Lola Tursunova',
    parentName: 'Malika Tursunova',
    amount: 1500000,
    daysOverdue: 45,
    lastPayment: '2024-08-15'
  },
  {
    id: 'DBT002',
    studentName: 'Test Student',
    parentName: 'Test Parent',
    amount: 3000000,
    daysOverdue: 75,
    lastPayment: '2024-07-20'
  }
];

// Helper functions
// Re-export formatCurrency from lib/format for backward compatibility
export { formatCurrency } from '@/lib/format';

export const getTotalRevenue = (): number => {
  return mockTransactions
    .filter(t => t.status === 'Paid')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getPendingPayments = (): { count: number; total: number } => {
  const pending = mockTransactions.filter(t => t.status === 'Pending');
  return {
    count: pending.length,
    total: pending.reduce((sum, t) => sum + t.amount, 0)
  };
};

export const getTotalExpenses = (): number => {
  return mockExpenses.reduce((sum, e) => sum + e.amount, 0);
};

export const getOutstandingDebtors = (): { count: number; total: number } => {
  return {
    count: mockDebtors.length,
    total: mockDebtors.reduce((sum, d) => sum + d.amount, 0)
  };
};