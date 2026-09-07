export const SCHOOL_INFO = {
  name: 'Model Senior Secondary School',
  subtext: 'District Education Center · Urban Zone',
  udiseCode: 'UDISE+ 07040100123',
  location: 'Sector 14, Urban Ward 12',
};

export const TEACHERS = [
  {
    id: 'T101',
    pin: '1234',
    name: 'Sunita Sharma',
    role: 'Senior Teacher & Nodal Coordinator',
    assignedClasses: ['8C'],
  },
];

export const COORDINATORS = [
  {
    id: 'C101',
    pin: '1234',
    password: '1234',
    name: 'Meena Devi',
    role: 'Meal Coordinator & Kitchen Supervisor',
    zone: 'Urban Zone · Sector 14',
  },
];

export const ADMINISTRATORS = [
  {
    id: 'ADM01',
    password: '1234',
    pin: '1234',
    name: 'Dr. Rajesh Verma',
    role: 'School Principal',
    zone: 'Model Senior Secondary School · Sector 14',
  },
];

export const CLASSES_LIST = [
  {
    id: '8C',
    label: 'Class 8 - Section C',
    section: 'C',
    grade: '8th',
    strength: 20,
    allocatedTime: '08:00 AM - 08:50 AM',
  },
];

export const STUDENTS_BY_CLASS = {
  '8C': [
    // --- Team Members (Rolls 01–06) ---
    { id: 'PS-8C-01', rollNo: '01', name: 'Naitik Baliyan',    gender: 'M', qrCode: 'QR-PS-8C-01' },
    { id: 'PS-8C-02', rollNo: '02', name: 'Anshika Malik',     gender: 'F', qrCode: 'QR-PS-8C-02' },
    { id: 'PS-8C-03', rollNo: '03', name: 'Shagun Jaggi',      gender: 'F', qrCode: 'QR-PS-8C-03' },
    { id: 'PS-8C-04', rollNo: '04', name: 'Aryan Choudhary',   gender: 'M', qrCode: 'QR-PS-8C-04' },
    { id: 'PS-8C-05', rollNo: '05', name: 'Puneet Choudhary',  gender: 'M', qrCode: 'QR-PS-8C-05' },
    { id: 'PS-8C-06', rollNo: '06', name: 'Omeshwar Goswami',  gender: 'M', qrCode: 'QR-PS-8C-06' },
    // --- Other Students (Rolls 07–20) ---
    { id: 'PS-8C-07', rollNo: '07', name: 'Priya Kumari',      gender: 'F', qrCode: 'QR-PS-8C-07' },
    { id: 'PS-8C-08', rollNo: '08', name: 'Rahul Gupta',       gender: 'M', qrCode: 'QR-PS-8C-08' },
    { id: 'PS-8C-09', rollNo: '09', name: 'Sneha Patel',       gender: 'F', qrCode: 'QR-PS-8C-09' },
    { id: 'PS-8C-10', rollNo: '10', name: 'Karan Singh',       gender: 'M', qrCode: 'QR-PS-8C-10' },
    { id: 'PS-8C-11', rollNo: '11', name: 'Ananya Rao',        gender: 'F', qrCode: 'QR-PS-8C-11' },
    { id: 'PS-8C-12', rollNo: '12', name: 'Mohit Joshi',       gender: 'M', qrCode: 'QR-PS-8C-12' },
    { id: 'PS-8C-13', rollNo: '13', name: 'Divya Nair',        gender: 'F', qrCode: 'QR-PS-8C-13' },
    { id: 'PS-8C-14', rollNo: '14', name: 'Arjun Meena',       gender: 'M', qrCode: 'QR-PS-8C-14' },
    { id: 'PS-8C-15', rollNo: '15', name: 'Kavya Pillai',      gender: 'F', qrCode: 'QR-PS-8C-15' },
    { id: 'PS-8C-16', rollNo: '16', name: 'Vikas Maurya',      gender: 'M', qrCode: 'QR-PS-8C-16' },
    { id: 'PS-8C-17', rollNo: '17', name: 'Pooja Vishwakarma', gender: 'F', qrCode: 'QR-PS-8C-17' },
    { id: 'PS-8C-18', rollNo: '18', name: 'Rohan Sharma',      gender: 'M', qrCode: 'QR-PS-8C-18' },
    { id: 'PS-8C-19', rollNo: '19', name: 'Nisha Soni',        gender: 'F', qrCode: 'QR-PS-8C-19' },
    { id: 'PS-8C-20', rollNo: '20', name: 'Suresh Yadav',      gender: 'M', qrCode: 'QR-PS-8C-20' },
  ],
};
