// Demo Data for Guest/Demo Mode

// Valid MongoDB ObjectIds for demo
export const DEMO_ACADEMIC_YEAR_ID = "650e8400e29b41d4a716446655440000";
export const DEMO_CLASS_ID = "550e8400e29b41d4a716446655440001";
export const DEMO_STUDENT_ID = "660e8400e29b41d4a716446655440002";

// 1. User Profiles for Multi-Role Demo
export const DEMO_USER = {
  _id: DEMO_STUDENT_ID,
  name: "Harshika Patil",
  email: "harshika@demo.com",
  role: "student",
  phone: "9876543210",
  profileImage:
    "https://api.dicebear.com/7.x/avataaars/png?seed=Harshika&gender=female",
  currentClass: {
    _id: DEMO_CLASS_ID,
    value: "3",
    label: "3rd Standard",
    section: "A",
    academicYear: DEMO_ACADEMIC_YEAR_ID,
  },
};

export const DEMO_STUDENT_USER = DEMO_USER;

export const DEMO_TEACHER_USER = {
  _id: "770e8400e29b41d4a716446655440010",
  name: "Mrs. Savita Patil",
  email: "savita.patil@demo.com",
  role: "teacher",
  phone: "9876543211",
  profileImage:
    "https://api.dicebear.com/7.x/avataaars/png?seed=Savita&gender=female",
  designation: "Class Teacher - 3A",
  classes: [DEMO_CLASS_ID],
  isClassTeacher: true,
  classTeacherOf: [DEMO_CLASS_ID],
};

export const DEMO_ADMIN_USER = {
  _id: "880e8400e29b41d4a716446655440020",
  name: "Mr. Rajesh Biradar",
  email: "admin@demo.com",
  role: "admin",
  phone: "9876543212",
  profileImage:
    "https://api.dicebear.com/7.x/avataaars/png?seed=Rajesh&gender=male",
  designation: "Vice Principal",
};

// 1.5. Academic Years
export const DEMO_ACADEMIC_YEARS = [
  {
    _id: DEMO_ACADEMIC_YEAR_ID,
    name: "2024-2025",
    startDate: "2024-06-01T00:00:00.000Z",
    endDate: "2025-05-31T00:00:00.000Z",
    isActive: true,
    status: "current",
    description: "Current Academic Year",
    createdAt: "2024-06-01T00:00:00.000Z",
  },
  {
    _id: "551e8400e29b41d4a716446655440001",
    name: "2023-2024",
    startDate: "2023-06-01T00:00:00.000Z",
    endDate: "2024-05-31T00:00:00.000Z",
    isActive: false,
    status: "archived",
    description: "Previous Academic Year",
    createdAt: "2023-06-01T00:00:00.000Z",
  },
];

// 2. Class Details & Subjects (Teachers: North Karnataka mix)
export const DEMO_CLASS_DETAILS = {
  classData: {
    _id: DEMO_CLASS_ID,
    value: "3",
    label: "3rd Standard",
    section: "A",
    branch: "Main",
    academicYear: DEMO_ACADEMIC_YEAR_ID,
    classTeacher: { name: "Mrs. Savita Patil" },
  },
  subjects: [
    {
      _id: "760e8400e29b41d4a716446655440003",
      name: "Kannada",
      code: "KAN03",
      teachers: [{ name: "Mrs. Savita Patil" }],
    },
    {
      _id: "760e8400e29b41d4a716446655440004",
      name: "English",
      code: "ENG03",
      teachers: [{ name: "Ms. Mary D'Souza" }],
    },
    {
      _id: "760e8400e29b41d4a716446655440005",
      name: "Hindi",
      code: "HIN03",
      teachers: [{ name: "Mrs. Ayesha Siddiqui" }],
    },
    {
      _id: "760e8400e29b41d4a716446655440006",
      name: "Mathematics",
      code: "MAT03",
      teachers: [{ name: "Mr. Abdul Nadaf" }],
    },
    {
      _id: "760e8400e29b41d4a716446655440007",
      name: "EVS",
      code: "EVS03",
      teachers: [{ name: "Mr. Basavaraj Kulkarni" }],
    },
    {
      _id: "760e8400e29b41d4a716446655440008",
      name: "Computer",
      code: "COM03",
      teachers: [{ name: "Mr. John Peter" }],
    },
    {
      _id: "760e8400e29b41d4a716446655440009",
      name: "Art & Craft",
      code: "ART03",
      teachers: [{ name: "Mrs. Renuka Desai" }],
    },
    {
      _id: "760e8400e29b41d4a71644665544000a",
      name: "Physical Education",
      code: "PE03",
      teachers: [{ name: "Mr. Suresh Meti" }],
    },
  ],
  students: [
    {
      _id: DEMO_STUDENT_ID,
      name: "Harshika Patil",
      email: "harshika@demo.com",
      rollNumber: "001",
      regNo: "SGV-2024-001",
      gender: "female",
      bloodGroup: "B+",
      phone: "9876543210",
      parentName: "Mallikarjun Patil",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Harshika&gender=female",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Harshika&gender=female",
      currentClass: {
        _id: DEMO_CLASS_ID,
        value: "3",
        label: "3rd Standard",
        section: "A",
        name: "3",
      },
    },
    {
      _id: "660e8400e29b41d4a716446655440003",
      name: "Aarav Kulkarni",
      email: "aarav.k@demo.com",
      rollNumber: "002",
      regNo: "SGV-2024-002",
      gender: "male",
      bloodGroup: "O+",
      phone: "9876543214",
      parentName: "Suresh Kulkarni",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Aarav&gender=male",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Aarav&gender=male",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a716446655440004",
      name: "Ananya Deshmukh",
      email: "ananya.d@demo.com",
      rollNumber: "003",
      regNo: "SGV-2024-003",
      gender: "female",
      bloodGroup: "A+",
      phone: "9876543215",
      parentName: "Vikram Deshmukh",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Ananya&gender=female",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Ananya&gender=female",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a716446655440005",
      name: "Rohan Biradar",
      email: "rohan.b@demo.com",
      rollNumber: "004",
      regNo: "SGV-2024-004",
      gender: "male",
      bloodGroup: "B+",
      phone: "9876543216",
      parentName: "Shashidhar Biradar",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Rohan&gender=male",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Rohan&gender=male",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a716446655440006",
      name: "Sanvi Hegde",
      email: "sanvi.h@demo.com",
      rollNumber: "005",
      regNo: "SGV-2024-005",
      gender: "female",
      bloodGroup: "AB+",
      phone: "9876543217",
      parentName: "Ganesh Hegde",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Sanvi&gender=female",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Sanvi&gender=female",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a716446655440007",
      name: "Pranav Goudar",
      email: "pranav.g@demo.com",
      rollNumber: "006",
      regNo: "SGV-2024-006",
      gender: "male",
      bloodGroup: "O+",
      phone: "9876543218",
      parentName: "Basanagouda Goudar",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Pranav&gender=male",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Pranav&gender=male",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a716446655440008",
      name: "Diya Inamdar",
      email: "diya.i@demo.com",
      rollNumber: "007",
      regNo: "SGV-2024-007",
      gender: "female",
      bloodGroup: "A+",
      phone: "9876543219",
      parentName: "Rafiq Inamdar",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Diya&gender=female",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Diya&gender=female",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a716446655440009",
      name: "Varun Hiremath",
      email: "varun.h@demo.com",
      rollNumber: "008",
      regNo: "SGV-2024-008",
      gender: "male",
      bloodGroup: "B+",
      phone: "9876543220",
      parentName: "Gururaj Hiremath",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Varun&gender=male",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Varun&gender=male",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a71644665544000a",
      name: "Tanvi Badiger",
      email: "tanvi.b@demo.com",
      rollNumber: "009",
      regNo: "SGV-2024-009",
      gender: "female",
      bloodGroup: "O-",
      phone: "9876543221",
      parentName: "Manjunath Badiger",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Tanvi&gender=female",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Tanvi&gender=female",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a71644665544000b",
      name: "Aditya Pujar",
      email: "aditya.p@demo.com",
      rollNumber: "010",
      regNo: "SGV-2024-010",
      gender: "male",
      bloodGroup: "A+",
      phone: "9876543222",
      parentName: "Somaling Pujar",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Aditya&gender=male",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Aditya&gender=male",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a71644665544000c",
      name: "Sneha Joshi",
      email: "sneha.j@demo.com",
      rollNumber: "011",
      regNo: "SGV-2024-011",
      gender: "female",
      bloodGroup: "B+",
      phone: "9876543223",
      parentName: "Prahlad Joshi",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Sneha&gender=female",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Sneha&gender=female",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a71644665544000d",
      name: "Manjunath Kamat",
      email: "manjunath.k@demo.com",
      rollNumber: "012",
      regNo: "SGV-2024-012",
      gender: "male",
      bloodGroup: "AB+",
      phone: "9876543224",
      parentName: "Ramesh Kamat",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Manjunath&gender=male",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Manjunath&gender=male",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a71644665544000e",
      name: "Pooja Nadiger",
      email: "pooja.n@demo.com",
      rollNumber: "013",
      regNo: "SGV-2024-013",
      gender: "female",
      bloodGroup: "O+",
      phone: "9876543225",
      parentName: "Chandrashekhar Nadiger",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Pooja&gender=female",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Pooja&gender=female",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a71644665544000f",
      name: "Chetan Bellad",
      email: "chetan.b@demo.com",
      rollNumber: "014",
      regNo: "SGV-2024-014",
      gender: "male",
      bloodGroup: "A+",
      phone: "9876543226",
      parentName: "Arvind Bellad",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Chetan&gender=male",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Chetan&gender=male",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
    {
      _id: "660e8400e29b41d4a716446655440010",
      name: "Kavya Angadi",
      email: "kavya.a@demo.com",
      rollNumber: "015",
      regNo: "SGV-2024-015",
      gender: "female",
      bloodGroup: "B+",
      phone: "9876543227",
      parentName: "Shivakumar Angadi",
      profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Kavya&gender=female",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Kavya&gender=female",
      currentClass: { _id: DEMO_CLASS_ID, value: "3", label: "3rd Standard", section: "A", name: "3" },
    },
  ],
};

export const DEMO_STUDENTS = DEMO_CLASS_DETAILS.students.map((st) => ({
  role: "student",
  ...st,
}));

// 2.5. Teacher Subjects (for teacher role)
const DEMO_TEACHER_ID = "770e8400e29b41d4a716446655440010";
export const DEMO_TEACHER_SUBJECTS = {
  subjects: [
    {
      _id: "760e8400e29b41d4a716446655440003",
      name: "Kannada",
      code: "KAN03",
      class: {
        _id: DEMO_CLASS_ID,
        value: "3",
        label: "3rd Standard",
        section: "A",
        branch: "Main",
      },
      teachers: [
        {
          _id: DEMO_TEACHER_ID,
          name: "Mrs. Savita Patil",
          email: "savita.patil@school.edu",
        },
      ],
      isClassTeacher: true,
    },
    {
      _id: "760e8400e29b41d4a716446655440006",
      name: "Mathematics",
      code: "MAT03",
      class: {
        _id: DEMO_CLASS_ID,
        value: "3",
        label: "3rd Standard",
        section: "A",
        branch: "Main",
      },
      teachers: [
        {
          _id: DEMO_TEACHER_ID,
          name: "Mrs. Savita Patil",
          email: "savita.patil@school.edu",
        },
      ],
      isClassTeacher: true,
    },
    {
      _id: "760e8400e29b41d4a716446655440004",
      name: "English",
      code: "ENG03",
      class: {
        _id: DEMO_CLASS_ID,
        value: "3",
        label: "3rd Standard",
        section: "A",
        branch: "Main",
      },
      teachers: [
        {
          _id: DEMO_TEACHER_ID,
          name: "Mrs. Savita Patil",
          email: "savita.patil@school.edu",
        },
      ],
      isClassTeacher: true,
    },
  ],
  classTeacherOf: [DEMO_CLASS_ID],
};

// 3. Attendance Summary
export const DEMO_ATTENDANCE_SUMMARY = {
  overall: {
    total: 92,
    present: 85,
    absent: 5,
    late: 2,
    excused: 0,
    halfDay: 0,
    percentage: 92.4,
    holidaysCount: 4,
  },
  total: 92,
  present: 85,
  absent: 5,
  late: 2,
  excused: 0,
  halfDay: 0,
  percentage: 92.4,
  subjectWise: [
    {
      subjectId: "760e8400e29b41d4a716446655440003",
      name: "Kannada",
      code: "KAN03",
      total: 20,
      present: 19,
      percentage: "95.0",
    },
    {
      subjectId: "760e8400e29b41d4a716446655440004",
      name: "English",
      code: "ENG03",
      total: 20,
      present: 18,
      percentage: "90.0",
    },
    {
      subjectId: "760e8400e29b41d4a716446655440005",
      name: "Hindi",
      code: "HIN03",
      total: 18,
      present: 17,
      percentage: "94.4",
    },
    {
      subjectId: "760e8400e29b41d4a716446655440006",
      name: "Mathematics",
      code: "MAT03",
      total: 22,
      present: 21,
      percentage: "95.5",
    },
    {
      subjectId: "760e8400e29b41d4a716446655440007",
      name: "EVS",
      code: "EVS03",
      total: 18,
      present: 16,
      percentage: "88.9",
    },
    {
      subjectId: "760e8400e29b41d4a716446655440008",
      name: "Computer",
      code: "COM03",
      total: 12,
      present: 11,
      percentage: "91.7",
    },
    {
      subjectId: "760e8400e29b41d4a716446655440009",
      name: "Art & Craft",
      code: "ART03",
      total: 10,
      present: 10,
      percentage: "100.0",
    },
    {
      subjectId: "760e8400e29b41d4a71644665544000a",
      name: "Physical Education",
      code: "PE03",
      total: 12,
      present: 11,
      percentage: "91.7",
    },
  ],
  monthlyBreakdown: [
    { month: "December 2024", total: 24, present: 23, percentage: "95.8" },
    { month: "January 2025", total: 23, present: 21, percentage: "91.3" },
    { month: "February 2025", total: 22, present: 20, percentage: "90.9" },
    { month: "March 2025", total: 23, present: 21, percentage: "91.3" },
  ],
  holidays: [
    {
      _id: "h_demo_1",
      title: "Makar Sankranti",
      description: "Harvest Festival holiday declared by SGV Administration",
      date: "2025-01-14",
      isHoliday: true,
    },
    {
      _id: "h_demo_2",
      title: "Republic Day",
      description: "National Holiday - Republic Day Celebrations",
      date: "2025-01-26",
      isHoliday: true,
    },
    {
      _id: "h_demo_3",
      title: "Maha Shivaratri",
      description: "State Festival Holiday",
      date: "2025-02-26",
      isHoliday: true,
    },
    {
      _id: "h_demo_4",
      title: "Ugadi (New Year)",
      description: "Karnataka New Year Festival Holiday",
      date: "2025-03-30",
      isHoliday: true,
    },
  ],
};

// 4. Attendance History (Dec to March - approx 90 days)
const generateAttendance = () => {
  const history = [];
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    if (date.getDay() === 0) continue; // Skip Sundays

    const rand = ((i * 17 + 3) % 100) / 100;
    let status = "present";
    let remarks = "";

    if (rand > 0.94) {
      status = "absent";
      remarks = "Sick Leave";
    } else if (rand > 0.88) {
      status = "half-day";
      remarks = "Medical appointment";
    }

    history.push({
      _id: `att_${i}`,
      date: date.toISOString(),
      status: status,
      remarks: remarks,
    });
  }
  return history;
};

export const DEMO_ATTENDANCE_HISTORY = {
  attendance: generateAttendance(),
  pagination: { total: 75, page: 1, limit: 100, pages: 1, hasMore: false },
};

// 5. Report Card
export const DEMO_REPORT_CARD = {
  student: {
    name: "Aarav Sharma",
    rollNumber: "12",
    admissionNumber: "SGV-2024-042",
    class: "3rd Standard A",
    className: "3rd Standard",
    section: "A",
    academicYear: "2024-2025",
  },
  attendance: {
    percentage: 94.8,
    presentDays: 182,
    totalDays: 192,
  },
  overall: {
    percentage: 72.5,
    grade: "B+",
    rank: 3,
    classRank: 3,
    totalInClass: 28,
    totalMarksScored: 522,
    totalMaxMarks: 720,
  },
  classStatistics: {
    classAverage: 68.4,
    highestPercentage: 94.2,
    lowestPercentage: 42.0,
  },
  exams: [
    {
      examType: "FA1",
      weightage: 10,
      isCompleted: true,
      percentage: 68,
      grade: "B",
      classRank: 4,
      totalInClassForExam: 28,
      totalObtained: 136,
      totalMax: 200,
      topSubject: { name: "Physical Education", percentage: 92 },
      lowestSubject: { name: "Hindi", percentage: 48 },
      subjects: [
        { subject: "Kannada", obtainedMarks: 15, maxMarks: 25, percentage: 60, grade: "B", remarks: "Good effort, focus on vocabulary" },
        { subject: "English", obtainedMarks: 18, maxMarks: 25, percentage: 72, grade: "B+", remarks: "Strong comprehension skills" },
        { subject: "Hindi", obtainedMarks: 12, maxMarks: 25, percentage: 48, grade: "C+", remarks: "Needs more writing practice" },
        { subject: "Mathematics", obtainedMarks: 22, maxMarks: 25, percentage: 88, grade: "A+", remarks: "Excellent calculation speed" },
        { subject: "EVS", obtainedMarks: 16, maxMarks: 25, percentage: 64, grade: "B", remarks: "Good conceptual grasp" },
        { subject: "Computer", obtainedMarks: 20, maxMarks: 25, percentage: 80, grade: "A", remarks: "Great practical awareness" },
        { subject: "Art & Craft", obtainedMarks: 14, maxMarks: 25, percentage: 56, grade: "C+", remarks: "Creative ideas" },
        { subject: "Physical Education", obtainedMarks: 23, maxMarks: 25, percentage: 92, grade: "A+", remarks: "Very active and enthusiastic" },
      ],
    },
    {
      examType: "FA2",
      weightage: 10,
      isCompleted: true,
      percentage: 75,
      grade: "B+",
      classRank: 3,
      totalInClassForExam: 28,
      totalObtained: 150,
      totalMax: 200,
      topSubject: { name: "Physical Education", percentage: 96 },
      lowestSubject: { name: "Hindi", percentage: 60 },
      subjects: [
        { subject: "Kannada", obtainedMarks: 18, maxMarks: 25, percentage: 72, grade: "B+", remarks: "Noticeable improvement" },
        { subject: "English", obtainedMarks: 20, maxMarks: 25, percentage: 80, grade: "A", remarks: "Fluent expression" },
        { subject: "Hindi", obtainedMarks: 15, maxMarks: 25, percentage: 60, grade: "B", remarks: "Steady progress" },
        { subject: "Mathematics", obtainedMarks: 21, maxMarks: 25, percentage: 84, grade: "A", remarks: "Very good logic" },
        { subject: "EVS", obtainedMarks: 19, maxMarks: 25, percentage: 76, grade: "B+", remarks: "Well prepared for tests" },
        { subject: "Computer", obtainedMarks: 22, maxMarks: 25, percentage: 88, grade: "A+", remarks: "Outstanding performance" },
        { subject: "Art & Craft", obtainedMarks: 16, maxMarks: 25, percentage: 64, grade: "B", remarks: "Neat presentation" },
        { subject: "Physical Education", obtainedMarks: 24, maxMarks: 25, percentage: 96, grade: "A+", remarks: "Role model in sportsmanship" },
      ],
    },
    {
      examType: "SA1",
      weightage: 30,
      isCompleted: true,
      percentage: 65,
      grade: "B",
      classRank: 5,
      totalInClassForExam: 28,
      totalObtained: 415,
      totalMax: 640,
      topSubject: { name: "Mathematics", percentage: 90 },
      lowestSubject: { name: "Hindi", percentage: 50 },
      subjects: [
        { subject: "Kannada", obtainedMarks: 45, maxMarks: 80, percentage: 56.3, grade: "C+", remarks: "Review long-answer questions" },
        { subject: "English", obtainedMarks: 58, maxMarks: 80, percentage: 72.5, grade: "B+", remarks: "Good grammar and composition" },
        { subject: "Hindi", obtainedMarks: 40, maxMarks: 80, percentage: 50, grade: "C", remarks: "Grammar exercises needed" },
        { subject: "Mathematics", obtainedMarks: 72, maxMarks: 80, percentage: 90, grade: "A", remarks: "Exceptional mastery in geometry" },
        { subject: "EVS", obtainedMarks: 50, maxMarks: 80, percentage: 62.5, grade: "B", remarks: "Satisfactory overall performance" },
        { subject: "Computer", obtainedMarks: 65, maxMarks: 80, percentage: 81.3, grade: "A", remarks: "Understands coding concepts well" },
        { subject: "Art & Craft", obtainedMarks: 55, maxMarks: 80, percentage: 68.8, grade: "B", remarks: "Creative project submission" },
        { subject: "Physical Education", obtainedMarks: 70, maxMarks: 80, percentage: 87.5, grade: "A", remarks: "Great physical fitness" },
      ],
    },
    {
      examType: "FA3",
      weightage: 10,
      isCompleted: true,
      percentage: 82,
      grade: "A",
      classRank: 2,
      totalInClassForExam: 28,
      totalObtained: 164,
      totalMax: 200,
      topSubject: { name: "Physical Education", percentage: 96 },
      lowestSubject: { name: "Hindi", percentage: 72 },
      subjects: [
        { subject: "Kannada", obtainedMarks: 19, maxMarks: 25, percentage: 76, grade: "B+", remarks: "Strong rebound in Kannada" },
        { subject: "English", obtainedMarks: 21, maxMarks: 25, percentage: 84, grade: "A", remarks: "Impressive presentation" },
        { subject: "Hindi", obtainedMarks: 18, maxMarks: 25, percentage: 72, grade: "B+", remarks: "Huge improvement" },
        { subject: "Mathematics", obtainedMarks: 23, maxMarks: 25, percentage: 92, grade: "A+", remarks: "Top score in class" },
        { subject: "EVS", obtainedMarks: 20, maxMarks: 25, percentage: 80, grade: "A", remarks: "Demonstrates clear insight" },
        { subject: "Computer", obtainedMarks: 22, maxMarks: 25, percentage: 88, grade: "A+", remarks: "Consistent excellence" },
        { subject: "Art & Craft", obtainedMarks: 20, maxMarks: 25, percentage: 80, grade: "A", remarks: "Brilliant artwork" },
        { subject: "Physical Education", obtainedMarks: 24, maxMarks: 25, percentage: 96, grade: "A+", remarks: "Star athlete" },
      ],
    },
    {
      examType: "FA4",
      weightage: 10,
      isCompleted: true,
      percentage: 55,
      grade: "C+",
      classRank: 8,
      totalInClassForExam: 28,
      totalObtained: 110,
      totalMax: 200,
      topSubject: { name: "Physical Education", percentage: 80 },
      lowestSubject: { name: "Hindi", percentage: 40 },
      subjects: [
        { subject: "Kannada", obtainedMarks: 12, maxMarks: 25, percentage: 48, grade: "C", remarks: "Needs more revision" },
        { subject: "English", obtainedMarks: 15, maxMarks: 25, percentage: 60, grade: "B", remarks: "Average performance" },
        { subject: "Hindi", obtainedMarks: 10, maxMarks: 25, percentage: 40, grade: "C", remarks: "Please focus on basic vocabulary" },
        { subject: "Mathematics", obtainedMarks: 18, maxMarks: 25, percentage: 72, grade: "B+", remarks: "Slight slip in algebra" },
        { subject: "EVS", obtainedMarks: 14, maxMarks: 25, percentage: 56, grade: "C+", remarks: "Review environment chapters" },
        { subject: "Computer", obtainedMarks: 16, maxMarks: 25, percentage: 64, grade: "B", remarks: "Can score higher with practice" },
        { subject: "Art & Craft", obtainedMarks: 12, maxMarks: 25, percentage: 48, grade: "C", remarks: "Incomplete final drawing" },
        { subject: "Physical Education", obtainedMarks: 20, maxMarks: 25, percentage: 80, grade: "A", remarks: "Good effort" },
      ],
    },
    {
      examType: "SA2",
      weightage: 30,
      isCompleted: false,
      percentage: 0,
      grade: "-",
      classRank: null,
      totalInClassForExam: null,
      totalObtained: 0,
      totalMax: 0,
      topSubject: null,
      lowestSubject: null,
      subjects: [],
    },
  ],
};

export const DEMO_INSIGHTS = {
  examTrends: [
    { exam: "FA1", percentage: 68 },
    { exam: "FA2", percentage: 75 },
    { exam: "SA1", percentage: 65 },
    { exam: "FA3", percentage: 82 },
    { exam: "FA4", percentage: 55 },
  ],
  subjectTrends: {
    Kannada: [
      { exam: "FA1", percentage: 60 },
      { exam: "FA2", percentage: 72 },
      { exam: "SA1", percentage: 56 },
      { exam: "FA3", percentage: 76 },
      { exam: "FA4", percentage: 48 },
    ],
    English: [
      { exam: "FA1", percentage: 72 },
      { exam: "FA2", percentage: 80 },
      { exam: "SA1", percentage: 72 },
      { exam: "FA3", percentage: 84 },
      { exam: "FA4", percentage: 60 },
    ],
    Hindi: [
      { exam: "FA1", percentage: 48 },
      { exam: "FA2", percentage: 60 },
      { exam: "SA1", percentage: 50 },
      { exam: "FA3", percentage: 72 },
      { exam: "FA4", percentage: 40 },
    ],
    Mathematics: [
      { exam: "FA1", percentage: 88 },
      { exam: "FA2", percentage: 84 },
      { exam: "SA1", percentage: 90 },
      { exam: "FA3", percentage: 92 },
      { exam: "FA4", percentage: 72 },
    ],
    EVS: [
      { exam: "FA1", percentage: 64 },
      { exam: "FA2", percentage: 76 },
      { exam: "SA1", percentage: 62 },
      { exam: "FA3", percentage: 80 },
      { exam: "FA4", percentage: 56 },
    ],
    Computer: [
      { exam: "FA1", percentage: 80 },
      { exam: "FA2", percentage: 88 },
      { exam: "SA1", percentage: 81 },
      { exam: "FA3", percentage: 88 },
      { exam: "FA4", percentage: 64 },
    ],
    "Art & Craft": [
      { exam: "FA1", percentage: 56 },
      { exam: "FA2", percentage: 64 },
      { exam: "SA1", percentage: 68 },
      { exam: "FA3", percentage: 80 },
      { exam: "FA4", percentage: 48 },
    ],
    "Physical Education": [
      { exam: "FA1", percentage: 92 },
      { exam: "FA2", percentage: 96 },
      { exam: "SA1", percentage: 87 },
      { exam: "FA3", percentage: 96 },
      { exam: "FA4", percentage: 80 },
    ],
  },
  subjectSummary: [
    { subject: "Physical Education", average: 90.2, grade: "A+", examCount: 5 },
    { subject: "Mathematics", average: 85.2, grade: "A", examCount: 5 },
    { subject: "Computer", average: 80.2, grade: "A", examCount: 5 },
    { subject: "English", average: 73.6, grade: "A", examCount: 5 },
    { subject: "EVS", average: 67.6, grade: "B+", examCount: 5 },
    { subject: "Art & Craft", average: 63.2, grade: "B+", examCount: 5 },
    { subject: "Kannada", average: 62.4, grade: "B+", examCount: 5 },
    { subject: "Hindi", average: 54.0, grade: "B+", examCount: 5 },
  ],
  strengths: [
    { subject: "Physical Education", average: 90.2, grade: "A+", examCount: 5 },
    { subject: "Mathematics", average: 85.2, grade: "A", examCount: 5 },
    { subject: "Computer", average: 80.2, grade: "A", examCount: 5 },
  ],
  weaknesses: [
    { subject: "Hindi", average: 54.0, grade: "B+", examCount: 5 },
    { subject: "Kannada", average: 62.4, grade: "B+", examCount: 5 },
  ],
  consistency: {
    score: 88,
    label: "Very Stable & Consistent",
  },
};

// 6. Timetable
// 9:30 - 4:30. 8 Periods. 4 Short breaks (10m). 1 Lunch (40m).
// P1: 9:30-10:10, B1: 10:10-10:20, P2: 10:20-11:00, B2: 11:00-11:10, P3: 11:10-11:50, B3: 11:50-12:00, P4: 12:00-12:40
// Lunch: 12:40-1:20
// P5: 1:20-2:00, B4: 2:00-2:10, P6: 2:10-2:50, P7: 2:50-3:30, P8: 3:30-4:10 (Last period slightly different or packup 4:10-4:30)
// Adjusted to fit 4:30 end:
// P1: 09:30-10:10 | B1: 10:10-10:20
// P2: 10:20-11:00 | B2: 11:00-11:10
// P3: 11:10-11:50 | B3: 11:50-12:00
// P4: 12:00-12:40 | Lunch: 12:40-01:20
// P5: 01:20-02:00 | B4: 02:00-02:10
// P6: 02:10-02:50
// P7: 02:50-03:30
// P8: 03:30-04:10
// Pack up/Diary: 04:10-04:30

const periodsMonFri = [
  {
    periodNumber: 1,
    startTime: "09:30 AM",
    endTime: "10:10 AM",
    type: "class",
  },
  {
    periodNumber: 2,
    startTime: "10:10 AM",
    endTime: "10:20 AM",
    type: "break",
    name: "Short Break",
  },
  {
    periodNumber: 3,
    startTime: "10:20 AM",
    endTime: "11:00 AM",
    type: "class",
  },
  {
    periodNumber: 4,
    startTime: "11:00 AM",
    endTime: "11:10 AM",
    type: "break",
    name: "Short Break",
  },
  {
    periodNumber: 5,
    startTime: "11:10 AM",
    endTime: "11:50 AM",
    type: "class",
  },
  {
    periodNumber: 6,
    startTime: "11:50 AM",
    endTime: "12:00 PM",
    type: "break",
    name: "Short Break",
  },
  {
    periodNumber: 7,
    startTime: "12:00 PM",
    endTime: "12:40 PM",
    type: "class",
  },
  {
    periodNumber: 8,
    startTime: "12:40 PM",
    endTime: "01:20 PM",
    type: "break",
    name: "Lunch Break",
  },
  {
    periodNumber: 9,
    startTime: "01:20 PM",
    endTime: "02:00 PM",
    type: "class",
  },
  {
    periodNumber: 10,
    startTime: "02:00 PM",
    endTime: "02:10 PM",
    type: "break",
    name: "Short Break",
  },
  {
    periodNumber: 11,
    startTime: "02:10 PM",
    endTime: "02:50 PM",
    type: "class",
  },
  {
    periodNumber: 12,
    startTime: "02:50 PM",
    endTime: "03:30 PM",
    type: "class",
  },
  {
    periodNumber: 13,
    startTime: "03:30 PM",
    endTime: "04:10 PM",
    type: "class",
  },
  {
    periodNumber: 14,
    startTime: "04:10 PM",
    endTime: "04:30 PM",
    type: "break",
    name: "Diary/Pack-up",
  },
];

const periodsSat = [
  {
    periodNumber: 1,
    startTime: "09:30 AM",
    endTime: "10:10 AM",
    type: "class",
  },
  {
    periodNumber: 2,
    startTime: "10:10 AM",
    endTime: "10:20 AM",
    type: "break",
    name: "Short Break",
  },
  {
    periodNumber: 3,
    startTime: "10:20 AM",
    endTime: "11:00 AM",
    type: "class",
  },
  {
    periodNumber: 4,
    startTime: "11:00 AM",
    endTime: "11:10 AM",
    type: "break",
    name: "Short Break",
  },
  {
    periodNumber: 5,
    startTime: "11:10 AM",
    endTime: "11:50 AM",
    type: "class",
  },
  {
    periodNumber: 6,
    startTime: "11:50 AM",
    endTime: "12:30 PM",
    type: "class",
  },
  {
    periodNumber: 7,
    startTime: "12:30 PM",
    endTime: "01:00 PM",
    type: "break",
    name: "Dispersal",
  },
];

export const DEMO_TIMETABLE = {
  schedule: [
    {
      day: "Monday",
      periods: periodsMonFri.map((p) => {
        if (p.type === "break")
          return { ...p, subject: { name: p.name }, teacher: { name: "" } };
        // Assign subjects based on period number for variety
        let sub = "Kannada";
        let teacher = "Mrs. Savita Patil";
        if (p.periodNumber === 2) {
          sub = "Mathematics";
          teacher = "Mr. Abdul Nadaf";
        }
        if (p.periodNumber === 3) {
          sub = "English";
          teacher = "Ms. Mary D'Souza";
        }
        if (p.periodNumber === 4) {
          sub = "EVS";
          teacher = "Mr. Basavaraj Kulkarni";
        }
        if (p.periodNumber === 5) {
          sub = "Hindi";
          teacher = "Mrs. Ayesha Siddiqui";
        }
        if (p.periodNumber === 6) {
          sub = "Computer";
          teacher = "Mr. John Peter";
        }
        if (p.periodNumber === 7) {
          sub = "Art & Craft";
          teacher = "Mrs. Renuka Desai";
        }
        if (p.periodNumber === 8) {
          sub = "PE";
          teacher = "Mr. Suresh Meti";
        }
        return {
          ...p,
          subject: { name: sub },
          teacher: { name: teacher },
          roomNumber: "301",
        };
      }),
    },
    {
      day: "Tuesday",
      periods: periodsMonFri.map((p) => {
        if (p.type === "break")
          return { ...p, subject: { name: p.name }, teacher: { name: "" } };
        let sub = "English";
        let teacher = "Ms. Mary D'Souza";
        if (p.periodNumber === 2) {
          sub = "Kannada";
          teacher = "Mrs. Savita Patil";
        }
        if (p.periodNumber === 3) {
          sub = "Mathematics";
          teacher = "Mr. Abdul Nadaf";
        }
        if (p.periodNumber === 4) {
          sub = "Hindi";
          teacher = "Mrs. Ayesha Siddiqui";
        }
        if (p.periodNumber === 5) {
          sub = "EVS";
          teacher = "Mr. Basavaraj Kulkarni";
        }
        if (p.periodNumber === 6) {
          sub = "Library";
          teacher = "Mrs. Savita Patil";
        }
        if (p.periodNumber === 7) {
          sub = "PE";
          teacher = "Mr. Suresh Meti";
        }
        if (p.periodNumber === 8) {
          sub = "Music";
          teacher = "Mr. John Peter";
        }
        return {
          ...p,
          subject: { name: sub },
          teacher: { name: teacher },
          roomNumber: "301",
        };
      }),
    },
    {
      day: "Wednesday",
      periods: periodsMonFri.map((p) => {
        if (p.type === "break")
          return { ...p, subject: { name: p.name }, teacher: { name: "" } };
        let sub = "Mathematics";
        let teacher = "Mr. Abdul Nadaf";
        if (p.periodNumber === 2) {
          sub = "EVS";
          teacher = "Mr. Basavaraj Kulkarni";
        }
        if (p.periodNumber === 3) {
          sub = "Kannada";
          teacher = "Mrs. Savita Patil";
        }
        if (p.periodNumber === 4) {
          sub = "English";
          teacher = "Ms. Mary D'Souza";
        }
        if (p.periodNumber === 5) {
          sub = "Computer";
          teacher = "Mr. John Peter";
        }
        if (p.periodNumber === 6) {
          sub = "Hindi";
          teacher = "Mrs. Ayesha Siddiqui";
        }
        if (p.periodNumber === 7) {
          sub = "GK";
          teacher = "Mrs. Savita Patil";
        }
        if (p.periodNumber === 8) {
          sub = "Story Time";
          teacher = "Ms. Mary D'Souza";
        }
        return {
          ...p,
          subject: { name: sub },
          teacher: { name: teacher },
          roomNumber: "301",
        };
      }),
    },
    {
      day: "Thursday",
      periods: periodsMonFri.map((p) => {
        if (p.type === "break")
          return { ...p, subject: { name: p.name }, teacher: { name: "" } };
        let sub = "EVS";
        let teacher = "Mr. Basavaraj Kulkarni";
        if (p.periodNumber === 2) {
          sub = "English";
          teacher = "Ms. Mary D'Souza";
        }
        if (p.periodNumber === 3) {
          sub = "Mathematics";
          teacher = "Mr. Abdul Nadaf";
        }
        if (p.periodNumber === 4) {
          sub = "Kannada";
          teacher = "Mrs. Savita Patil";
        }
        if (p.periodNumber === 5) {
          sub = "Hindi";
          teacher = "Mrs. Ayesha Siddiqui";
        }
        if (p.periodNumber === 6) {
          sub = "Art & Craft";
          teacher = "Mrs. Renuka Desai";
        }
        if (p.periodNumber === 7) {
          sub = "Computer";
          teacher = "Mr. John Peter";
        }
        if (p.periodNumber === 8) {
          sub = "PE";
          teacher = "Mr. Suresh Meti";
        }
        return {
          ...p,
          subject: { name: sub },
          teacher: { name: teacher },
          roomNumber: "301",
        };
      }),
    },
    {
      day: "Friday",
      periods: periodsMonFri.map((p) => {
        if (p.type === "break")
          return { ...p, subject: { name: p.name }, teacher: { name: "" } };
        let sub = "Hindi";
        let teacher = "Mrs. Ayesha Siddiqui";
        if (p.periodNumber === 2) {
          sub = "Mathematics";
          teacher = "Mr. Abdul Nadaf";
        }
        if (p.periodNumber === 3) {
          sub = "EVS";
          teacher = "Mr. Basavaraj Kulkarni";
        }
        if (p.periodNumber === 4) {
          sub = "English";
          teacher = "Ms. Mary D'Souza";
        }
        if (p.periodNumber === 5) {
          sub = "Kannada";
          teacher = "Mrs. Savita Patil";
        }
        if (p.periodNumber === 6) {
          sub = "Activity";
          teacher = "Mrs. Renuka Desai";
        }
        if (p.periodNumber === 7) {
          sub = "Value Ed";
          teacher = "Mrs. Savita Patil";
        }
        if (p.periodNumber === 8) {
          sub = "Mass PT";
          teacher = "Mr. Suresh Meti";
        }
        return {
          ...p,
          subject: { name: sub },
          teacher: { name: teacher },
          roomNumber: "Ground",
        };
      }),
    },
    {
      day: "Saturday",
      periods: periodsSat.map((p) => {
        if (p.type === "break")
          return { ...p, subject: { name: p.name }, teacher: { name: "" } };
        let sub = "PE";
        let teacher = "Mr. Suresh Meti";
        if (p.periodNumber === 2) {
          sub = "Art & Craft";
          teacher = "Mrs. Renuka Desai";
        }
        if (p.periodNumber === 3) {
          sub = "Music";
          teacher = "Mr. John Peter";
        }
        if (p.periodNumber === 4) {
          sub = "Club Activity";
          teacher = "Mrs. Savita Patil";
        }
        return {
          ...p,
          subject: { name: sub },
          teacher: { name: teacher },
          roomNumber: "301",
        };
      }),
    },
  ],
};

// 7. Fees
export const DEMO_FEES = {
  totalFees: 35000,
  paidAmount: 20000,
  pendingAmount: 15000,
  feeStructure: {
    components: [
      { name: "Admission Fee", amount: 5000 },
      { name: "Tuition Fee", amount: 20000 },
      { name: "Term Fee", amount: 4000 },
      { name: "Computer Lab", amount: 3000 },
      { name: "Sports Fee", amount: 2000 },
      { name: "Library Fee", amount: 1000 },
    ],
  },
  payments: [
    {
      _id: "p1",
      amount: 5000,
      paymentDate: "2024-05-15T10:00:00.000Z",
      paymentMethod: "Cash",
      receiptNumber: "REC/24/0056",
      status: "paid",
    },
    {
      _id: "p2",
      amount: 15000,
      paymentDate: "2024-08-10T11:30:00.000Z",
      paymentMethod: "Online",
      receiptNumber: "REC/24/0892",
      status: "paid",
    },
  ],
};

// 8. Exams
export const DEMO_EXAMS = [
  {
    _id: "e1",
    name: "Summative Assessment 2 (SA2)",
    type: "Written",
    date: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(),
    subject: { name: "Mathematics" },
    duration: 180,
    room: "Hall 3",
    instructions: "Bring geometry box and exam pad.",
  },
  {
    _id: "e2",
    name: "Summative Assessment 2 (SA2)",
    type: "Written",
    date: new Date(new Date().setDate(new Date().getDate() + 17)).toISOString(),
    subject: { name: "Kannada" },
    duration: 180,
    room: "Hall 3",
    instructions: "Handwriting marks included.",
  },
  {
    _id: "e3",
    name: "Summative Assessment 2 (SA2)",
    type: "Written",
    date: new Date(new Date().setDate(new Date().getDate() + 19)).toISOString(),
    subject: { name: "English" },
    duration: 180,
    room: "Hall 3",
    instructions: "Read questions carefully.",
  },
  {
    _id: "e4",
    name: "Summative Assessment 2 (SA2)",
    type: "Written",
    date: new Date(new Date().setDate(new Date().getDate() + 21)).toISOString(),
    subject: { name: "EVS" },
    duration: 180,
    room: "Hall 3",
    instructions: "Draw diagrams where necessary.",
  },
  {
    _id: "e5",
    name: "Summative Assessment 2 (SA2)",
    type: "Written",
    date: new Date(new Date().setDate(new Date().getDate() + 23)).toISOString(),
    subject: { name: "Hindi" },
    duration: 180,
    room: "Hall 3",
    instructions: "Answer all questions.",
  },
  {
    _id: "e6",
    name: "Summative Assessment 2 (SA2)",
    type: "Written",
    date: new Date(new Date().setDate(new Date().getDate() + 25)).toISOString(),
    subject: { name: "Computer" },
    duration: 120,
    room: "Lab 1",
    instructions: "Practical exam included.",
  },
  // Past exams for history.jsx viewing
  {
    _id: "past_e1",
    name: "Formative Assessment 1 (FA1)",
    type: "Written",
    date: new Date(Date.now() - 45 * 86400000).toISOString(),
    subject: { name: "Mathematics" },
    duration: 90,
    room: "Classroom 3A",
    instructions: "All questions compulsory.",
  },
  {
    _id: "past_e2",
    name: "Formative Assessment 1 (FA1)",
    type: "Written",
    date: new Date(Date.now() - 43 * 86400000).toISOString(),
    subject: { name: "Kannada" },
    duration: 90,
    room: "Classroom 3A",
    instructions: "Answer in clean handwriting.",
  },
];

// Helper to generate dynamic event dates
const getRelativeDate = (offsetDays, hours = 9, minutes = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const demoEventItems = [
  {
    _id: "ev_dyn1",
    title: "Annual Sports Meet & Track Finals",
    description: "All students must assemble on the ground by 8:30 AM in sports uniforms.",
    date: getRelativeDate(3, 9, 0),
    isSchoolEvent: true,
    type: "sports",
  },
  {
    _id: "ev_dyn2",
    title: "Science & Innovation Fair",
    description: "Interactive exhibits and working model presentations. Parents and guests are welcome.",
    date: getRelativeDate(7, 10, 0),
    isSchoolEvent: true,
    type: "academic",
  },
  {
    _id: "ev_dyn3",
    title: "Parents-Teachers Interactive Meet",
    description: "Review comprehensive student evaluation and holistic development.",
    date: getRelativeDate(14, 9, 30),
    isSchoolEvent: true,
    type: "meeting",
  },
  {
    _id: "ev_dyn4",
    title: "Cultural Arts & Music Extravaganza",
    description: "Annual cultural festival featuring folk dances, theatre, and music ensemble.",
    date: getRelativeDate(25, 17, 0),
    isSchoolEvent: true,
    type: "celebration",
  },
  {
    _id: "ev_dyn5",
    title: "Educational Field Excursion",
    description: "One-day nature and science exploration field visit.",
    date: getRelativeDate(38, 7, 30),
    isSchoolEvent: true,
    type: "trip",
  },
  {
    _id: "ev_dyn_past1",
    title: "Inter-School Debate Championship",
    description: "Congratulations to our middle-school debaters on securing 1st prize!",
    date: getRelativeDate(-6, 11, 0),
    isSchoolEvent: true,
    type: "academic",
  },
  {
    _id: "ev_dyn_past2",
    title: "Independence Day Cultural Pageant",
    description: "Grand flag hoisting ceremony, parade, and patriotic speeches.",
    date: getRelativeDate(-20, 8, 30),
    isSchoolEvent: true,
    type: "celebration",
  },
];

// 11. Events (Dynamic & backward compatible with both data.event and data.events)
export const DEMO_EVENTS = {
  success: true,
  event: demoEventItems,
  events: demoEventItems,
};

// 12. Notifications
export const DEMO_NOTIFICATIONS = {
  notifications: [
    {
      _id: "n1",
      title: "School Reopening",
      message: "School will reopen on June 1st for the new academic year.",
      type: "info",
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      _id: "n2",
      title: "Exam Schedule Released",
      message:
        "The timetable for SA2 has been published. Please check the Exams tab.",
      type: "alert",
      createdAt: new Date(
        new Date().setDate(new Date().getDate() - 1)
      ).toISOString(),
      read: false,
    },
    {
      _id: "n3",
      title: "Fee Payment Reminder",
      message:
        "Last date to pay the term fee is coming up. Ignore if already paid.",
      type: "warning",
      createdAt: new Date(
        new Date().setDate(new Date().getDate() - 3)
      ).toISOString(),
      read: true,
    },
    {
      _id: "n4",
      title: "Holiday Declared",
      message: "Tomorrow is a holiday due to heavy rains.",
      type: "info",
      createdAt: new Date(
        new Date().setDate(new Date().getDate() - 5)
      ).toISOString(),
      read: true,
    },
    {
      _id: "n5",
      title: "Sports Day Winners",
      message: "Congratulations to all the winners of the Annual Sports Day!",
      type: "success",
      createdAt: new Date(
        new Date().setDate(new Date().getDate() - 10)
      ).toISOString(),
      read: true,
    },
  ],
};

// 9. Leaves
export const DEMO_LEAVES = {
  data: [
    {
      _id: "l1",
      startDate: "2024-07-10T00:00:00.000Z",
      endDate: "2024-07-12T00:00:00.000Z",
      leaveType: "full",
      reason: "Viral Fever",
      status: "approved",
    },
    {
      _id: "l2",
      startDate: "2024-09-05T00:00:00.000Z",
      endDate: "2024-09-05T00:00:00.000Z",
      leaveType: "full",
      reason: "Cousin's Wedding",
      status: "approved",
    },
    {
      _id: "l3",
      startDate: "2024-11-14T00:00:00.000Z",
      endDate: "2024-11-14T00:00:00.000Z",
      leaveType: "half",
      halfDaySlot: "afternoon",
      reason: "Stomach ache",
      status: "rejected",
      rejectionReason: "Incomplete classwork",
      rejectionComments: "Complete your notes first.",
    },
  ],
};

// 10. Subject Content
export const DEMO_SUBJECT_CONTENT = [
  {
    _id: "c1",
    title: "Poem: The Little Plant",
    description: "Read and memorize the first stanza.",
    type: "note",
    createdAt: "2024-11-20T09:00:00.000Z",
    author: { name: "Ms. Mary D'Souza" },
  },
  {
    _id: "c2",
    title: "Homework: Multiplication",
    description: "Solve page 45, Exercise 3.2 (Q1 to Q10).",
    type: "homework",
    createdAt: "2024-11-22T10:00:00.000Z",
    author: { name: "Mr. Abdul Nadaf" },
  },
  {
    _id: "c3",
    title: "Project: Types of Leaves",
    description:
      "Collect 5 different types of leaves and paste them in scrapbook.",
    type: "homework",
    createdAt: "2024-11-25T08:00:00.000Z",
    author: { name: "Mr. Basavaraj Kulkarni" },
  },
  {
    _id: "c4",
    title: "Kannada Varnamala",
    description: "Practice writing vowels (Swaragalu) 5 times.",
    type: "homework",
    createdAt: "2024-11-26T11:00:00.000Z",
    author: { name: "Mrs. Savita Patil" },
  },
  {
    _id: "c5",
    title: "Annual Sports Day",
    description: "Selection for running race tomorrow.",
    type: "news",
    createdAt: "2024-11-28T08:00:00.000Z",
    author: { name: "Mr. Suresh Meti" },
  },
];
// 11. Dashboard Data
export const DEMO_STUDENT_DASHBOARD = {
  overview: {
    attendancePercentage: 92.4,
    dueAmount: 1500,
    nextExamDate: "2025-01-15",
  },
  charts: {
    performanceTrend: [
      { examType: "FA1", percentage: 85, subjectCount: 5 },
      { examType: "FA2", percentage: 78, subjectCount: 5 },
      { examType: "SA1", percentage: 92, subjectCount: 5 },
    ],
  },
};

export const DEMO_CLASSES = [
  {
    _id: "550e8400e29b41d4a716446655440001",
    name: "3",
    value: "3",
    label: "3rd Standard",
    section: "A",
    branch: "Main",
    academicYear: DEMO_ACADEMIC_YEAR_ID,
    classTeacher: { name: "Mrs. Savita Patil" },
  },
  {
    _id: "550e8400e29b41d4a716446655440002",
    name: "3",
    value: "3",
    label: "3rd Standard",
    section: "B",
    branch: "Main",
    academicYear: DEMO_ACADEMIC_YEAR_ID,
    classTeacher: { name: "Mr. Basavaraj Kulkarni" },
  },
  {
    _id: "550e8400e29b41d4a716446655440003",
    name: "1",
    value: "1",
    label: "1st Standard",
    section: "A",
    branch: "Main",
    academicYear: DEMO_ACADEMIC_YEAR_ID,
    classTeacher: { name: "Mrs. Deepa Nayak" },
  },
  {
    _id: "550e8400e29b41d4a716446655440004",
    name: "2",
    value: "2",
    label: "2nd Standard",
    section: "A",
    branch: "Main",
    academicYear: DEMO_ACADEMIC_YEAR_ID,
    classTeacher: { name: "Mr. Vijay Kammar" },
  },
  {
    _id: "550e8400e29b41d4a716446655440005",
    name: "4",
    value: "4",
    label: "4th Standard",
    section: "A",
    branch: "Main",
    academicYear: DEMO_ACADEMIC_YEAR_ID,
    classTeacher: { name: "Ms. Mary D'Souza" },
  },
  {
    _id: "550e8400e29b41d4a716446655440006",
    name: "5",
    value: "5",
    label: "5th Standard",
    section: "A",
    branch: "Main",
    academicYear: DEMO_ACADEMIC_YEAR_ID,
    classTeacher: { name: "Mrs. Renuka Desai" },
  },
];

export const DEMO_TEACHER_DASHBOARD = {
  overview: {
    selectedClassId: "550e8400e29b41d4a716446655440001",
    attendanceRate: 94.2,
    classesCount: 3,
    totalStudents: 35,
    pendingTasks: 2,
    todayPeriodsCount: 4,
  },
  stats: {
    totalStudents: 35,
    attendanceRate: 94.2,
    classesCount: 3,
    avgScore: 82.5,
  },
  charts: {
    attendanceTrend: [
      { day: "Mon", rate: 96 },
      { day: "Tue", rate: 94 },
      { day: "Wed", rate: 91 },
      { day: "Thu", rate: 95 },
      { day: "Fri", rate: 94 },
    ],
  },
};

export const DEMO_ADMIN_DASHBOARD = {
  overview: {
    attendancePercentage: 93.8,
    attendanceTrend: 2.1,
    totalCollected: 2450000,
    feeCollectionTrend: 5.4,
    totalStudents: 450,
    totalStaff: 28,
  },
  charts: {
    feeTrend: [
      { month: "Jun", amount: 650000 },
      { month: "Jul", amount: 420000 },
      { month: "Aug", amount: 380000 },
      { month: "Sep", amount: 510000 },
      { month: "Oct", amount: 490000 },
    ],
    attendanceTrend: [
      { month: "Jun", rate: 95.2 },
      { month: "Jul", rate: 94.1 },
      { month: "Aug", rate: 92.8 },
      { month: "Sep", rate: 93.5 },
      { month: "Oct", rate: 93.8 },
    ],
  },
};

// 12. Student Past Academic History (/reports/history/me)
export const DEMO_STUDENT_HISTORY = {
  history: [
    {
      _id: "hist_2023_2024",
      class: {
        _id: "550e8400e29b41d4a716446655440004",
        value: "2",
        name: "2",
        label: "2nd Standard",
        section: "A",
      },
      academicYear: {
        _id: "551e8400e29b41d4a716446655440001",
        name: "2023-2024",
      },
      finalStatus: "promoted",
      totalAttendancePercentage: 96.4,
      examsAvailable: true,
      overallPercentage: 91.5,
      gpa: "9.2",
      rank: 2,
      totalStudents: 20,
      exams: [
        { name: "SA2 Final", percentage: 92.5, grade: "A+" },
        { name: "SA1 Midterm", percentage: 90.5, grade: "A+" },
      ],
      remarks: "Exceptional academic performance and leadership in Class 2A.",
    },
    {
      _id: "hist_2022_2023",
      class: {
        _id: "550e8400e29b41d4a716446655440003",
        value: "1",
        name: "1",
        label: "1st Standard",
        section: "A",
      },
      academicYear: {
        _id: "551e8400e29b41d4a716446655440002",
        name: "2022-2023",
      },
      finalStatus: "promoted",
      totalAttendancePercentage: 95.8,
      examsAvailable: true,
      overallPercentage: 89.2,
      gpa: "8.9",
      rank: 3,
      totalStudents: 22,
      exams: [
        { name: "SA2 Final", percentage: 90.0, grade: "A" },
        { name: "SA1 Midterm", percentage: 88.4, grade: "A" },
      ],
      remarks: "Quick learner with great enthusiasm for Kannada and Art.",
    },
  ],
};

// 13. Admin Staff Attendance (/attendance/staff-list)
export const DEMO_STAFF_LIST = [
  {
    user: {
      _id: "770e8400e29b41d4a716446655440010",
      name: "Mrs. Savita Patil",
      role: "teacher",
      designation: "Class Teacher - 3A",
      employeeId: "EMP-0101",
      phone: "9876543211",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Savita&gender=female",
    },
    status: "present",
    remarks: "On Time",
  },
  {
    user: {
      _id: "770e8400e29b41d4a716446655440011",
      name: "Mr. Abdul Nadaf",
      role: "teacher",
      designation: "Mathematics Teacher",
      employeeId: "EMP-0102",
      phone: "9876543228",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Abdul&gender=male",
    },
    status: "present",
    remarks: "On Time",
  },
  {
    user: {
      _id: "770e8400e29b41d4a716446655440012",
      name: "Ms. Mary D'Souza",
      role: "teacher",
      designation: "English Teacher",
      employeeId: "EMP-0103",
      phone: "9876543229",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Mary&gender=female",
    },
    status: "present",
    remarks: "On Time",
  },
  {
    user: {
      _id: "770e8400e29b41d4a716446655440013",
      name: "Mr. Basavaraj Kulkarni",
      role: "teacher",
      designation: "Science & EVS Teacher",
      employeeId: "EMP-0104",
      phone: "9876543230",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Basavaraj&gender=male",
    },
    status: "leave",
    remarks: "Approved Medical Leave",
  },
  {
    user: {
      _id: "770e8400e29b41d4a716446655440014",
      name: "Mrs. Ayesha Siddiqui",
      role: "teacher",
      designation: "Hindi Teacher",
      employeeId: "EMP-0105",
      phone: "9876543231",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Ayesha&gender=female",
    },
    status: "present",
    remarks: "On Time",
  },
  {
    user: {
      _id: "770e8400e29b41d4a716446655440015",
      name: "Mr. John Peter",
      role: "teacher",
      designation: "Computer Teacher",
      employeeId: "EMP-0106",
      phone: "9876543232",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=John&gender=male",
    },
    status: "present",
    remarks: "On Time",
  },
  {
    user: {
      _id: "770e8400e29b41d4a716446655440016",
      name: "Mrs. Renuka Desai",
      role: "teacher",
      designation: "Art & Craft Teacher",
      employeeId: "EMP-0107",
      phone: "9876543233",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Renuka&gender=female",
    },
    status: "present",
    remarks: "On Time",
  },
  {
    user: {
      _id: "770e8400e29b41d4a716446655440017",
      name: "Mr. Suresh Meti",
      role: "teacher",
      designation: "PE Instructor",
      employeeId: "EMP-0108",
      phone: "9876543234",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Suresh&gender=male",
    },
    status: "present",
    remarks: "On Time",
  },
  {
    user: {
      _id: "880e8400e29b41d4a716446655440020",
      name: "Mr. Rajesh Biradar",
      role: "admin",
      designation: "Vice Principal",
      employeeId: "EMP-0002",
      phone: "9876543212",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Rajesh&gender=male",
    },
    status: "present",
    remarks: "On Time",
  },
  {
    user: {
      _id: "770e8400e29b41d4a716446655440018",
      name: "Mrs. Sunita Belagavi",
      role: "staff",
      designation: "Head Librarian",
      employeeId: "EMP-0201",
      phone: "9876543235",
      profilePhoto: "https://api.dicebear.com/7.x/avataaars/png?seed=Sunita&gender=female",
    },
    status: "present",
    remarks: "On Time",
  },
];

// 14. Admin Marked Classes (/attendance/classes-marked)
export const DEMO_CLASSES_MARKED = [
  {
    _id: "mark_3a",
    class: {
      _id: "550e8400e29b41d4a716446655440001",
      name: "3",
      value: "3",
      label: "3rd Standard",
      section: "A",
    },
    markedBy: { name: "Mrs. Savita Patil" },
    totalStudents: 15,
    presentCount: 14,
    absentCount: 1,
    markedAt: "2026-10-06T09:15:00.000Z",
  },
  {
    _id: "mark_1a",
    class: {
      _id: "550e8400e29b41d4a716446655440003",
      name: "1",
      value: "1",
      label: "1st Standard",
      section: "A",
    },
    markedBy: { name: "Mrs. Deepa Nayak" },
    totalStudents: 18,
    presentCount: 17,
    absentCount: 1,
    markedAt: "2026-10-06T09:20:00.000Z",
  },
  {
    _id: "mark_2a",
    class: {
      _id: "550e8400e29b41d4a716446655440004",
      name: "2",
      value: "2",
      label: "2nd Standard",
      section: "A",
    },
    markedBy: { name: "Mr. Vijay Kammar" },
    totalStudents: 19,
    presentCount: 18,
    absentCount: 1,
    markedAt: "2026-10-06T09:18:00.000Z",
  },
  {
    _id: "mark_4a",
    class: {
      _id: "550e8400e29b41d4a716446655440005",
      name: "4",
      value: "4",
      label: "4th Standard",
      section: "A",
    },
    markedBy: { name: "Ms. Mary D'Souza" },
    totalStudents: 20,
    presentCount: 20,
    absentCount: 0,
    markedAt: "2026-10-06T09:25:00.000Z",
  },
];

// 15. Admin Missing Attendance Tracker (/attendance/missing-tracker)
export const DEMO_MISSING_TRACKER = {
  success: true,
  missingData: [
    {
      date: "2026-10-05",
      formattedDate: "05 Oct 2026",
      missingClasses: [
        {
          _id: "550e8400e29b41d4a716446655440002",
          name: "3",
          value: "3",
          section: "B",
          teacher: "Mr. Basavaraj Kulkarni",
        },
      ],
    },
  ],
  teacherSummary: [
    { teacherName: "Mrs. Savita Patil", pendingCount: 0, completedCount: 22 },
    { teacherName: "Mrs. Deepa Nayak", pendingCount: 0, completedCount: 22 },
    { teacherName: "Mr. Vijay Kammar", pendingCount: 0, completedCount: 22 },
    { teacherName: "Ms. Mary D'Souza", pendingCount: 0, completedCount: 22 },
    { teacherName: "Mr. Basavaraj Kulkarni", pendingCount: 1, completedCount: 21 },
  ],
  totalWorkingDays: 22,
  totalClasses: 6,
};

// 16. Complaints & Feedback (/complaints, /feedback)
export const DEMO_COMPLAINTS = [
  {
    _id: "comp_001",
    title: "School Bus Route 4 Timing Delay",
    description: "The morning bus arrives 20 minutes late at Navanagar stop, causing students to miss morning prayer.",
    category: "Transport",
    priority: "Medium",
    status: "In Progress",
    raisedBy: DEMO_USER,
    student: DEMO_USER,
    createdAt: "2026-10-04T08:30:00.000Z",
    adminResponse: "Transport supervisor contacted. Bus route driver has been notified to depart 15 mins earlier starting tomorrow.",
  },
  {
    _id: "comp_002",
    title: "Drinking Water Dispenser Filter on 2nd Floor",
    description: "Water pressure on the second floor dispenser was low during recess.",
    category: "Facilities",
    priority: "High",
    status: "Resolved",
    raisedBy: DEMO_USER,
    student: DEMO_USER,
    createdAt: "2026-09-28T10:15:00.000Z",
    adminResponse: "Filter cartridge replaced and flow rate verified by school maintenance on 29 Sep 2026.",
  },
  {
    _id: "comp_003",
    title: "Maths Olympiad Practice Material Clarification",
    description: "Requesting supplementary practice sheets for the upcoming State Level Mathematics Olympiad.",
    category: "Academics",
    priority: "Low",
    status: "Resolved",
    raisedBy: DEMO_USER,
    student: DEMO_USER,
    createdAt: "2026-09-20T14:00:00.000Z",
    adminResponse: "Practice booklets provided to Class 3A Math teacher Mr. Abdul Nadaf for distribution.",
  },
];

export const DEMO_FEEDBACK = [
  {
    _id: "feed_001",
    title: "Remarkable Kannada Poetry Recitation",
    message: "Harshika demonstrated outstanding pronounciation, expression, and rhythm during the Kannada Rajyotsava preparatory recitations.",
    category: "Academics",
    type: "appreciation",
    teacher: {
      _id: "770e8400e29b41d4a716446655440010",
      name: "Mrs. Savita Patil",
    },
    student: DEMO_USER,
    class: {
      _id: "550e8400e29b41d4a716446655440001",
      name: "3",
      section: "A",
    },
    createdAt: "2026-10-02T11:00:00.000Z",
  },
  {
    _id: "feed_002",
    title: "Mental Mathematics Speed & Accuracy",
    message: "Consistently scoring full marks in classroom quick-quizzes. Recommended for inter-school Olympiad training.",
    category: "Academics",
    type: "appreciation",
    teacher: {
      _id: "770e8400e29b41d4a716446655440011",
      name: "Mr. Abdul Nadaf",
    },
    student: DEMO_USER,
    class: {
      _id: "550e8400e29b41d4a716446655440001",
      name: "3",
      section: "A",
    },
    createdAt: "2026-09-25T14:30:00.000Z",
  },
  {
    _id: "feed_003",
    title: "Sports Day Relay Captaincy",
    message: "Displayed inspiring teamwork and sportsmanship while anchoring the 4x50m junior girls relay team.",
    category: "Sports",
    type: "appreciation",
    teacher: {
      _id: "770e8400e29b41d4a716446655440017",
      name: "Mr. Suresh Meti",
    },
    student: DEMO_USER,
    class: {
      _id: "550e8400e29b41d4a716446655440001",
      name: "3",
      section: "A",
    },
    createdAt: "2026-09-18T16:00:00.000Z",
  },
];

// 17. Standardized Exams for Teacher Assessments (/exams/standardized)
export const DEMO_STANDARDIZED_EXAMS = [
  {
    type: "FA1",
    exists: true,
    marksEntered: true,
    marksCount: 15,
    exam: {
      _id: "exam_fa1_kan",
      name: "Formative Assessment 1",
      type: "FA1",
      totalMarks: 20,
      class: "550e8400e29b41d4a716446655440001",
      subject: "760e8400e29b41d4a716446655440003",
    },
  },
  {
    type: "FA2",
    exists: true,
    marksEntered: true,
    marksCount: 15,
    exam: {
      _id: "exam_fa2_kan",
      name: "Formative Assessment 2",
      type: "FA2",
      totalMarks: 20,
      class: "550e8400e29b41d4a716446655440001",
      subject: "760e8400e29b41d4a716446655440003",
    },
  },
  {
    type: "SA1",
    exists: true,
    marksEntered: false,
    marksCount: 0,
    exam: {
      _id: "exam_sa1_kan",
      name: "Summative Assessment 1",
      type: "SA1",
      totalMarks: 80,
      class: "550e8400e29b41d4a716446655440001",
      subject: "760e8400e29b41d4a716446655440003",
    },
  },
  {
    type: "FA3",
    exists: false,
    marksEntered: false,
    marksCount: 0,
    exam: null,
  },
  {
    type: "FA4",
    exists: false,
    marksEntered: false,
    marksCount: 0,
    exam: null,
  },
  {
    type: "SA2",
    exists: false,
    marksEntered: false,
    marksCount: 0,
    exam: null,
  },
];

// 18. Teacher Exam Dashboard (/exams/teacher/dashboard)
export const DEMO_TEACHER_EXAM_DASHBOARD = {
  academicYear: {
    _id: DEMO_ACADEMIC_YEAR_ID,
    name: "2024-2025",
  },
  dashboard: [
    {
      class: {
        _id: "550e8400e29b41d4a716446655440001",
        name: "3",
        section: "A",
      },
      subject: {
        _id: "760e8400e29b41d4a716446655440003",
        name: "Kannada",
        code: "KAN03",
      },
      summary: {
        examsCreated: 3,
        marksEntered: 2,
        marksPublished: 2,
        pending: 1,
      },
      exams: [
        {
          _id: "exam_fa1_kan",
          name: "FA 1 - Kannada",
          type: "FA1",
          status: "published",
          totalMarks: 20,
          marksEntered: true,
          marksPublished: true,
          studentsTotal: 15,
          studentsGraded: 15,
        },
        {
          _id: "exam_fa2_kan",
          name: "FA 2 - Kannada",
          type: "FA2",
          status: "published",
          totalMarks: 20,
          marksEntered: true,
          marksPublished: true,
          studentsTotal: 15,
          studentsGraded: 15,
        },
        {
          _id: "exam_sa1_kan",
          name: "SA 1 - Midterm",
          type: "SA1",
          status: "draft",
          totalMarks: 80,
          marksEntered: false,
          marksPublished: false,
          studentsTotal: 15,
          studentsGraded: 0,
        },
      ],
    },
    {
      class: {
        _id: "550e8400e29b41d4a716446655440001",
        name: "3",
        section: "A",
      },
      subject: {
        _id: "760e8400e29b41d4a716446655440006",
        name: "Mathematics",
        code: "MAT03",
      },
      summary: {
        examsCreated: 2,
        marksEntered: 2,
        marksPublished: 2,
        pending: 0,
      },
      exams: [
        {
          _id: "exam_fa1_mat",
          name: "FA 1 - Mathematics",
          type: "FA1",
          status: "published",
          totalMarks: 20,
          marksEntered: true,
          marksPublished: true,
          studentsTotal: 15,
          studentsGraded: 15,
        },
        {
          _id: "exam_fa2_mat",
          name: "FA 2 - Mathematics",
          type: "FA2",
          status: "published",
          totalMarks: 20,
          marksEntered: true,
          marksPublished: true,
          studentsTotal: 15,
          studentsGraded: 15,
        },
      ],
    },
  ],
};

// 19. Individual Exam Marks (/marks/exam/:examId)
export const DEMO_EXAM_MARKS = DEMO_STUDENTS.map((st, idx) => {
  const scores = [19, 18, 20, 17, 19, 16, 18, 17, 19, 16, 18, 17, 19, 16, 18];
  const marks = scores[idx] || 18;
  return {
    _id: `mark_${st._id}`,
    student: st,
    marksObtained: marks,
    totalMarks: 20,
    percentage: Math.round((marks / 20) * 100),
    grade: marks >= 18 ? "A+" : marks >= 16 ? "A" : "B+",
    remarks: marks >= 18 ? "Excellent comprehension" : "Good performance",
  };
});

// 20. School-wide Exam Performance (/exams/performance/school)
export const DEMO_SCHOOL_EXAM_PERFORMANCE = {
  overallAverage: 81.4,
  totalStudents: 450,
  overallPassingRate: 97.2,
  topPerformingClass: "3rd Standard A",
  topPerformingSubject: "Kannada",
  examwisePerformance: [
    { examType: "FA1", averagePercentage: 83.2, studentCount: 450, passPercentage: 98.4 },
    { examType: "FA2", averagePercentage: 80.8, studentCount: 450, passPercentage: 96.8 },
    { examType: "SA1", averagePercentage: 79.5, studentCount: 445, passPercentage: 95.2 },
  ],
  classwiseSummary: [
    { classId: "550e8400e29b41d4a716446655440001", className: "3rd Standard A", averagePercentage: 83.4, studentCount: 15, passPercentage: 100 },
    { classId: "550e8400e29b41d4a716446655440002", className: "3rd Standard B", averagePercentage: 79.8, studentCount: 18, passPercentage: 94.4 },
    { classId: "550e8400e29b41d4a716446655440003", className: "1st Standard A", averagePercentage: 84.1, studentCount: 18, passPercentage: 100 },
    { classId: "550e8400e29b41d4a716446655440004", className: "2nd Standard A", averagePercentage: 82.0, studentCount: 19, passPercentage: 98.0 },
    { classId: "550e8400e29b41d4a716446655440005", className: "4th Standard A", averagePercentage: 79.2, studentCount: 20, passPercentage: 95.0 },
    { classId: "550e8400e29b41d4a716446655440006", className: "5th Standard A", averagePercentage: 78.5, studentCount: 22, passPercentage: 94.0 },
  ],
  subjectwiseSummary: [
    { subjectId: "sub_kan", subjectName: "Kannada", averagePercentage: 85.0, passPercentage: 99.0 },
    { subjectId: "sub_eng", subjectName: "English", averagePercentage: 81.2, passPercentage: 97.0 },
    { subjectId: "sub_mat", subjectName: "Mathematics", averagePercentage: 79.4, passPercentage: 95.5 },
    { subjectId: "sub_evs", subjectName: "Science / EVS", averagePercentage: 82.5, passPercentage: 98.0 },
    { subjectId: "sub_hin", subjectName: "Hindi", averagePercentage: 80.1, passPercentage: 96.0 },
  ],
};

// 21. Student Rankings (/marks/analytics/school/students)
export const DEMO_STUDENT_RANKINGS = DEMO_STUDENTS.map((st, idx) => {
  const totals = [380, 375, 372, 365, 360, 355, 350, 345, 340, 335, 330, 325, 320, 315, 310];
  const percentages = [95.0, 93.8, 93.0, 91.3, 90.0, 88.8, 87.5, 86.3, 85.0, 83.8, 82.5, 81.3, 80.0, 78.8, 77.5];
  return {
    _id: st._id,
    student: st,
    rank: idx + 1,
    totalMarks: totals[idx] || 350,
    maxMarks: 400,
    percentage: percentages[idx] || 85.0,
    grade: idx < 5 ? "A+" : idx < 10 ? "A" : "B+",
    class: st.currentClass,
  };
});

// 22. Admin Fee Analytics (/fees/analytics, /fees/summary)
export const DEMO_FEE_ANALYTICS = {
  totalExpected: 3200000,
  totalCollected: 2840000,
  totalPending: 360000,
  collectionRate: 88.75,
  totalArrears: 45000,
  totalConcession: 25000,
  totalGrossFees: 3200000,
  classBreakdown: [
    {
      classId: "550e8400e29b41d4a716446655440001",
      className: "3rd Standard A",
      totalExpected: 450000,
      totalCollected: 405000,
      totalPending: 45000,
      collectionRate: 90.0,
      studentCount: 15,
      paidCount: 13,
      dueCount: 2,
    },
    {
      classId: "550e8400e29b41d4a716446655440002",
      className: "3rd Standard B",
      totalExpected: 480000,
      totalCollected: 420000,
      totalPending: 60000,
      collectionRate: 87.5,
      studentCount: 16,
      paidCount: 14,
      dueCount: 2,
    },
    {
      classId: "550e8400e29b41d4a716446655440003",
      className: "1st Standard A",
      totalExpected: 540000,
      totalCollected: 495000,
      totalPending: 45000,
      collectionRate: 91.67,
      studentCount: 18,
      paidCount: 16,
      dueCount: 2,
    },
    {
      classId: "550e8400e29b41d4a716446655440004",
      className: "2nd Standard A",
      totalExpected: 570000,
      totalCollected: 510000,
      totalPending: 60000,
      collectionRate: 89.47,
      studentCount: 19,
      paidCount: 17,
      dueCount: 2,
    },
    {
      classId: "550e8400e29b41d4a716446655440005",
      className: "4th Standard A",
      totalExpected: 580000,
      totalCollected: 510000,
      totalPending: 70000,
      collectionRate: 87.93,
      studentCount: 20,
      paidCount: 17,
      dueCount: 3,
    },
    {
      classId: "550e8400e29b41d4a716446655440006",
      className: "5th Standard A",
      totalExpected: 580000,
      totalCollected: 500000,
      totalPending: 80000,
      collectionRate: 86.21,
      studentCount: 22,
      paidCount: 18,
      dueCount: 4,
    },
  ],
  recentTransactions: [
    {
      _id: "tx_001",
      studentName: "Harshika Patil",
      rollNumber: "001",
      className: "3rd Standard A",
      amount: 15000,
      mode: "UPI",
      date: "2026-10-02T10:30:00.000Z",
      status: "completed",
      receiptNo: "REC-2024-8891",
    },
    {
      _id: "tx_002",
      studentName: "Aarav Kulkarni",
      rollNumber: "002",
      className: "3rd Standard A",
      amount: 15000,
      mode: "Net Banking",
      date: "2026-10-01T15:20:00.000Z",
      status: "completed",
      receiptNo: "REC-2024-8890",
    },
    {
      _id: "tx_003",
      studentName: "Ananya Deshmukh",
      rollNumber: "003",
      className: "3rd Standard A",
      amount: 30000,
      mode: "Cheque",
      date: "2026-09-29T11:45:00.000Z",
      status: "completed",
      receiptNo: "REC-2024-8889",
    },
    {
      _id: "tx_004",
      studentName: "Rohan Biradar",
      rollNumber: "004",
      className: "3rd Standard A",
      amount: 15000,
      mode: "Cash",
      date: "2026-09-28T14:10:00.000Z",
      status: "completed",
      receiptNo: "REC-2024-8888",
    },
  ],
};

// 23. Leave Applications for Admin & Teacher Approval (/leaves/requests, /leaves/daily-stats)
export const DEMO_LEAVE_REQUESTS = [
  {
    _id: "leave_req_001",
    applicant: {
      _id: "770e8400e29b41d4a716446655440013",
      name: "Mr. Basavaraj Kulkarni",
      role: "teacher",
      designation: "Science & EVS Teacher",
    },
    leaveType: "Medical Leave",
    startDate: "2026-10-06T00:00:00.000Z",
    endDate: "2026-10-07T00:00:00.000Z",
    daysCount: 2,
    reason: "Severe viral fever and physician recommended rest.",
    status: "Pending",
    appliedOn: "2026-10-05T18:00:00.000Z",
  },
  {
    _id: "leave_req_002",
    applicant: {
      _id: "660e8400e29b41d4a716446655440003",
      name: "Aarav Kulkarni",
      role: "student",
      class: { name: "3", section: "A" },
      rollNumber: "002",
    },
    leaveType: "Sick Leave",
    startDate: "2026-10-06T00:00:00.000Z",
    endDate: "2026-10-07T00:00:00.000Z",
    daysCount: 2,
    reason: "Dental procedure follow up.",
    status: "Pending",
    appliedOn: "2026-10-05T20:15:00.000Z",
  },
  {
    _id: "leave_req_003",
    applicant: {
      _id: "770e8400e29b41d4a716446655440012",
      name: "Ms. Mary D'Souza",
      role: "teacher",
      designation: "English Teacher",
    },
    leaveType: "Casual Leave",
    startDate: "2026-10-01T00:00:00.000Z",
    endDate: "2026-10-01T00:00:00.000Z",
    daysCount: 1,
    reason: "Family event in Belagavi.",
    status: "Approved",
    appliedOn: "2026-09-28T09:00:00.000Z",
    approvedBy: { name: "Mr. Rajesh Biradar" },
  },
  {
    _id: "leave_req_004",
    applicant: {
      _id: DEMO_STUDENT_ID,
      name: "Harshika Patil",
      role: "student",
      class: { name: "3", section: "A" },
      rollNumber: "001",
    },
    leaveType: "Family Function",
    startDate: "2026-09-15T00:00:00.000Z",
    endDate: "2026-09-16T00:00:00.000Z",
    daysCount: 2,
    reason: "Cousin's wedding in Bagalkot.",
    status: "Approved",
    appliedOn: "2026-09-10T11:00:00.000Z",
    approvedBy: { name: "Mrs. Savita Patil" },
  },
];

export const DEMO_LEAVE_STATS = {
  staffOnLeave: 1,
  studentsOnLeave: 2,
  pendingRequests: 2,
  approvedToday: 1,
};

export const DEMO_LEAVE_BALANCE = {
  casualLeave: { total: 12, used: 4, remaining: 8 },
  sickLeave: { total: 10, used: 3, remaining: 7 },
  earnedLeave: { total: 15, used: 1, remaining: 14 },
};

// 24. Student Monthly Ratings Data (/student-ratings)
export const DEMO_TEACHER_RATING_SUBJECTS = {
  summary: { total: 2, completed: 1, pending: 1 },
  subjects: [
    {
      _id: "760e8400e29b41d4a716446655440003",
      name: "Kannada",
      code: "KAN03",
      class: { _id: "550e8400e29b41d4a716446655440001", name: "3", section: "A" },
      status: "completed",
      ratedCount: 15,
      totalCount: 15,
    },
    {
      _id: "760e8400e29b41d4a716446655440006",
      name: "Mathematics",
      code: "MAT03",
      class: { _id: "550e8400e29b41d4a716446655440001", name: "3", section: "A" },
      status: "pending",
      ratedCount: 8,
      totalCount: 15,
    },
  ],
};

export const DEMO_SUBJECT_RATINGS_DATA = {
  students: DEMO_STUDENTS.map((st, idx) => ({
    _id: st._id,
    name: st.name,
    rollNumber: st.rollNumber,
    profilePhoto: st.profilePhoto,
    rating: {
      classEngagement: [5, 4, 5, 4, 5, 3, 4, 4, 5, 3, 4, 4, 5, 3, 4][idx] || 4,
      homeworkClasswork: [5, 5, 5, 4, 4, 4, 4, 4, 5, 4, 4, 3, 4, 4, 4][idx] || 4,
      behaviourSocial: [5, 5, 5, 5, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 4][idx] || 5,
      englishComm: [4, 4, 5, 4, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4][idx] || 4,
    },
  })),
};

export const DEMO_ADMIN_RATINGS_SUMMARY = {
  schoolAverage: 4.42,
  totalStudentsRated: 420,
  totalStudents: 450,
  schoolCriteriaAverages: {
    classEngagement: 4.35,
    homeworkClasswork: 4.45,
    behaviourSocial: 4.60,
    englishComm: 4.28,
  },
  classes: [
    {
      classId: "550e8400e29b41d4a716446655440001",
      className: "3rd Standard A",
      overallAverage: 4.52,
      ratedCount: 15,
      totalCount: 15,
      avgClassEngagement: 4.5,
      avgHomeworkClasswork: 4.6,
      avgBehaviourSocial: 4.7,
      avgEnglishComm: 4.3,
    },
    {
      classId: "550e8400e29b41d4a716446655440002",
      className: "3rd Standard B",
      overallAverage: 4.38,
      ratedCount: 16,
      totalCount: 16,
      avgClassEngagement: 4.2,
      avgHomeworkClasswork: 4.4,
      avgBehaviourSocial: 4.6,
      avgEnglishComm: 4.3,
    },
    {
      classId: "550e8400e29b41d4a716446655440003",
      className: "1st Standard A",
      overallAverage: 4.48,
      ratedCount: 18,
      totalCount: 18,
      avgClassEngagement: 4.4,
      avgHomeworkClasswork: 4.5,
      avgBehaviourSocial: 4.7,
      avgEnglishComm: 4.3,
    },
    {
      classId: "550e8400e29b41d4a716446655440004",
      className: "2nd Standard A",
      overallAverage: 4.40,
      ratedCount: 19,
      totalCount: 19,
      avgClassEngagement: 4.3,
      avgHomeworkClasswork: 4.4,
      avgBehaviourSocial: 4.6,
      avgEnglishComm: 4.3,
    },
  ],
};

export const DEMO_CLASS_RATINGS_SUMMARY = {
  classId: "550e8400e29b41d4a716446655440001",
  className: "3rd Standard A",
  students: DEMO_STUDENTS.map((st, idx) => {
    const averages = [4.75, 4.5, 5.0, 4.25, 4.5, 3.5, 4.25, 3.75, 4.75, 3.5, 4.25, 3.5, 4.5, 3.5, 4.0];
    const avg = averages[idx] || 4.25;
    return {
      student: st,
      overallAverage: avg,
      ratings: {
        classEngagement: [5, 4, 5, 4, 5, 3, 4, 4, 5, 3, 4, 4, 5, 3, 4][idx] || 4,
        homeworkClasswork: [5, 5, 5, 4, 4, 4, 4, 4, 5, 4, 4, 3, 4, 4, 4][idx] || 4,
        behaviourSocial: [5, 5, 5, 5, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 4][idx] || 5,
        englishComm: [4, 4, 5, 4, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4][idx] || 4,
      },
    };
  }),
};

export const DEMO_MOVERS_DATA = {
  improving: [
    {
      student: DEMO_STUDENTS[0],
      currentAverage: 4.75,
      previousAverage: 4.25,
      delta: "+0.50",
      strongestArea: "English Communication",
    },
    {
      student: DEMO_STUDENTS[2],
      currentAverage: 5.0,
      previousAverage: 4.6,
      delta: "+0.40",
      strongestArea: "Class Engagement",
    },
    {
      student: DEMO_STUDENTS[4],
      currentAverage: 4.5,
      previousAverage: 4.15,
      delta: "+0.35",
      strongestArea: "Homework & Classwork",
    },
  ],
  declining: [
    {
      student: DEMO_STUDENTS[5],
      currentAverage: 3.5,
      previousAverage: 3.85,
      delta: "-0.35",
      focusArea: "English Communication",
    },
  ],
};

export const DEMO_RATINGS_TRACKER = {
  overall: { total: 12, completed: 11, pending: 1 },
  teachers: [
    {
      teacher: { _id: "770e8400e29b41d4a716446655440010", name: "Mrs. Savita Patil", designation: "Kannada & Math Teacher" },
      total: 2,
      completed: 2,
      pending: 0,
      status: "completed",
    },
    {
      teacher: { _id: "770e8400e29b41d4a716446655440011", name: "Mr. Abdul Nadaf", designation: "Mathematics Teacher" },
      total: 2,
      completed: 2,
      pending: 0,
      status: "completed",
    },
    {
      teacher: { _id: "770e8400e29b41d4a716446655440012", name: "Ms. Mary D'Souza", designation: "English Teacher" },
      total: 2,
      completed: 2,
      pending: 0,
      status: "completed",
    },
    {
      teacher: { _id: "770e8400e29b41d4a716446655440013", name: "Mr. Basavaraj Kulkarni", designation: "Science Teacher" },
      total: 2,
      completed: 1,
      pending: 1,
      status: "in_progress",
    },
  ],
};

// 25. Teacher Subject Matrix (/teachers/admin/teacher-subject-matrix)
export const DEMO_TEACHER_SUBJECT_MATRIX = {
  teachers: [
    {
      _id: "770e8400e29b41d4a716446655440010",
      name: "Mrs. Savita Patil",
      designation: "Class Teacher - 3A",
      assignedSubjects: [
        { _id: "760e8400e29b41d4a716446655440003", name: "Kannada", className: "3rd Standard A" },
        { _id: "760e8400e29b41d4a716446655440006", name: "Mathematics", className: "3rd Standard A" },
      ],
    },
    {
      _id: "770e8400e29b41d4a716446655440011",
      name: "Mr. Abdul Nadaf",
      designation: "Mathematics Teacher",
      assignedSubjects: [
        { _id: "760e8400e29b41d4a716446655440006", name: "Mathematics", className: "4th Standard A" },
      ],
    },
    {
      _id: "770e8400e29b41d4a716446655440012",
      name: "Ms. Mary D'Souza",
      designation: "English Teacher",
      assignedSubjects: [
        { _id: "760e8400e29b41d4a716446655440004", name: "English", className: "3rd Standard A" },
      ],
    },
    {
      _id: "770e8400e29b41d4a716446655440013",
      name: "Mr. Basavaraj Kulkarni",
      designation: "Science & EVS Teacher",
      assignedSubjects: [
        { _id: "760e8400e29b41d4a716446655440007", name: "EVS", className: "3rd Standard A" },
      ],
    },
  ],
  subjects: DEMO_CLASS_DETAILS.subjects.map((sub) => ({
    ...sub,
    class: { _id: DEMO_CLASS_ID, name: "3", section: "A", label: "3rd Standard A" },
  })),
};

// 26. Daily Reminders & Cron Logs (/notifications/cron-logs)
export const DEMO_CRON_LOGS = {
  logs: [
    {
      _id: "cron_001",
      jobName: "Morning Attendance Notification",
      status: "success",
      triggeredAt: "2026-10-06T09:30:00.000Z",
      recipientsCount: 420,
      details: "Sent SMS & Push alerts to parents of present & absent students.",
    },
    {
      _id: "cron_002",
      jobName: "Pending Fee Reminder",
      status: "success",
      triggeredAt: "2026-10-05T10:00:00.000Z",
      recipientsCount: 38,
      details: "Sent automated Term 1 fee due reminders via WhatsApp & SMS.",
    },
    {
      _id: "cron_003",
      jobName: "Student Birthday Greetings",
      status: "success",
      triggeredAt: "2026-10-05T08:00:00.000Z",
      recipientsCount: 2,
      details: "Dispatched birthday greeting cards on School Vibes feed.",
    },
  ],
};

// 27. Admin Init Fixture (/classes/admin/init)
export const DEMO_ADMIN_INIT = {
  classes: DEMO_CLASSES,
  academicYears: DEMO_ACADEMIC_YEARS,
};

// 28. Subjects Fixture (/subjects)
export const DEMO_SUBJECTS = DEMO_CLASS_DETAILS.subjects;

// 29. Admin Vibes Moderation Fixture (/vibes/admin/moderation & /vibes)
export const DEMO_VIBES_POSTS = [
  {
    _id: "vibe_001",
    author: {
      _id: "770e8400e29b41d4a716446655440010",
      name: "Mrs. Savita Patil",
      role: "teacher",
      designation: "Head of Arts & Culture",
      profilePhoto:
        "https://api.dicebear.com/7.x/avataaars/png?seed=Savita&gender=female",
      phone: "+91 98765 43210",
    },
    title: "State Level Drawing Competition Winners!",
    caption:
      "Hearty congratulations to our young artists from Grade 9 & 10 who bagged top honors at the Belagavi Division Art Festival! 🎨✨ Proud moment for Shri Guru Vidyapeeth!",
    images: [
      {
        url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1080&auto=format&fit=crop&q=80",
        type: "image",
        aspectRatio: 1.33,
        width: 1080,
        height: 810,
      },
      {
        url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1080&auto=format&fit=crop&q=80",
        type: "image",
        aspectRatio: 1.33,
        width: 1080,
        height: 810,
      },
    ],
    category: "achievement",
    status: "approved",
    location: "Kala Bhavan, Belagavi",
    tags: ["#ArtCompetition", "#StateWinners", "#ProudMoment"],
    likesCount: 148,
    commentsCount: 12,
    viewsCount: 624,
    sharesCount: 18,
    isLiked: false,
    isBookmarked: false,
    isPinned: true,
    isSpotlight: true,
    isVisibleToDemo: true,
    createdAt: "2026-10-05T10:00:00.000Z",
    reviewedBy: { name: "Dr. Arvind Rao", role: "admin" },
    reviewedAt: "2026-10-05T10:30:00.000Z",
  },
  {
    _id: "vibe_002",
    author: {
      _id: "770e8400e29b41d4a716446655440017",
      name: "Mr. Suresh Meti",
      role: "teacher",
      designation: "Physical Education Director",
      profilePhoto:
        "https://api.dicebear.com/7.x/avataaars/png?seed=Suresh&gender=male",
      phone: "+91 98765 43217",
    },
    title: "Inter-House Kho-Kho Championship Finals",
    caption:
      "Thrilling contest today between Chalukya and Hoysala houses! Hoysala house clinched the trophy in extra time with brilliant defense tactics. 🏆🏃‍♂️",
    images: [
      {
        url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1080&auto=format&fit=crop&q=80",
        type: "image",
        aspectRatio: 1.33,
        width: 1080,
        height: 810,
      },
    ],
    category: "sports",
    status: "pending",
    location: "School Sports Complex",
    tags: ["#KhoKho", "#SportsDay", "#HouseChampionship"],
    likesCount: 0,
    commentsCount: 0,
    viewsCount: 42,
    sharesCount: 0,
    isLiked: false,
    isBookmarked: false,
    isPinned: false,
    isSpotlight: false,
    isVisibleToDemo: true,
    createdAt: "2026-10-06T14:30:00.000Z",
  },
  {
    _id: "vibe_003",
    author: {
      _id: "660e8400e29b41d4a716446655440003",
      name: "Aarav Kulkarni",
      role: "student",
      designation: "Grade 10-A Student",
      profilePhoto:
        "https://api.dicebear.com/7.x/avataaars/png?seed=Aarav&gender=male",
      phone: "+91 98765 43214",
    },
    title: "Science Fair Working Model - Smart Irrigation",
    caption:
      "Presented our IoT-based automated soil moisture detection system at the annual district science fair! Huge thanks to our Physics faculty for guiding us. 🤖🌱",
    images: [
      {
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1080&auto=format&fit=crop&q=80",
        type: "image",
        aspectRatio: 1.33,
        width: 1080,
        height: 810,
      },
    ],
    category: "academic",
    status: "approved",
    location: "Main Auditorium",
    tags: ["#ScienceFair", "#Innovation", "#IoTProject"],
    likesCount: 89,
    commentsCount: 8,
    viewsCount: 410,
    sharesCount: 14,
    isLiked: true,
    isBookmarked: true,
    isPinned: false,
    isSpotlight: false,
    isVisibleToDemo: true,
    createdAt: "2026-10-04T11:20:00.000Z",
    reviewedBy: { name: "Dr. Arvind Rao", role: "admin" },
    reviewedAt: "2026-10-04T12:00:00.000Z",
  },
  {
    _id: "vibe_004",
    author: {
      _id: "660e8400e29b41d4a716446655440004",
      name: "Pooja Hegde",
      role: "student",
      designation: "Grade 10-B Student",
      profilePhoto:
        "https://api.dicebear.com/7.x/avataaars/png?seed=Pooja&gender=female",
      phone: "+91 98765 43215",
    },
    title: "Casual campus hallway clip",
    caption: "Rough draft testing clip during lunch break.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1080&auto=format&fit=crop&q=80",
        type: "image",
        aspectRatio: 1.33,
        width: 1080,
        height: 810,
      },
    ],
    category: "general",
    status: "rejected",
    location: "Junior Quad",
    tags: ["#CampusLife"],
    likesCount: 0,
    commentsCount: 0,
    viewsCount: 5,
    sharesCount: 0,
    isLiked: false,
    isBookmarked: false,
    isPinned: false,
    isSpotlight: false,
    isVisibleToDemo: false,
    rejectionReason: "Incomplete description / Guidelines",
    reviewedBy: { name: "Dr. Arvind Rao", role: "admin" },
    reviewedAt: "2026-10-05T09:15:00.000Z",
    createdAt: "2026-10-04T16:00:00.000Z",
  },
];

export const DEMO_VIBES_COMMENTS = [
  {
    _id: "comm_001",
    vibeId: "vibe_001",
    user: {
      _id: "660e8400e29b41d4a716446655440002",
      name: "Dr. Arvind Rao",
      role: "admin",
      profilePhoto:
        "https://api.dicebear.com/7.x/avataaars/png?seed=Arvind&gender=male",
    },
    author: {
      _id: "660e8400e29b41d4a716446655440002",
      name: "Dr. Arvind Rao",
      role: "admin",
      profilePhoto:
        "https://api.dicebear.com/7.x/avataaars/png?seed=Arvind&gender=male",
    },
    text: "Remarkable achievement! The entire school management is proud of our talented students and the dedication of Mrs. Savita.",
    content:
      "Remarkable achievement! The entire school management is proud of our talented students and the dedication of Mrs. Savita.",
    likesCount: 14,
    isLiked: false,
    isSchoolOfficial: true,
    createdAt: "2026-10-05T11:00:00.000Z",
  },
  {
    _id: "comm_002",
    vibeId: "vibe_001",
    user: {
      _id: "660e8400e29b41d4a716446655440001",
      name: "Harshika Patil",
      role: "student",
      profilePhoto:
        "https://api.dicebear.com/7.x/avataaars/png?seed=Harshika&gender=female",
    },
    author: {
      _id: "660e8400e29b41d4a716446655440001",
      name: "Harshika Patil",
      role: "student",
      profilePhoto:
        "https://api.dicebear.com/7.x/avataaars/png?seed=Harshika&gender=female",
    },
    text: "Congratulations everyone! Outstanding work on the paintings 👏🎨",
    content:
      "Congratulations everyone! Outstanding work on the paintings 👏🎨",
    likesCount: 5,
    isLiked: true,
    isSchoolOfficial: false,
    createdAt: "2026-10-05T12:30:00.000Z",
  },
];

// 30. All Users for Admin User Management (/users)
export const DEMO_ALL_USERS = [
  {
    ...DEMO_ADMIN_USER,
    profilePhoto: DEMO_ADMIN_USER.profileImage,
    employeeId: "EMP-0002",
  },
  {
    ...DEMO_TEACHER_USER,
    profilePhoto: DEMO_TEACHER_USER.profileImage,
    employeeId: "EMP-0101",
  },
  ...DEMO_STAFF_LIST.map((s) => ({
    ...s.user,
    email: `${s.user.name.toLowerCase().replace(/[^a-z]/g, "")}@demo.com`,
  })).filter(
    (u) =>
      u._id !== DEMO_TEACHER_USER._id && u._id !== DEMO_ADMIN_USER._id
  ),
  ...DEMO_STUDENTS.map((st) => ({
    role: "student",
    ...st,
  })),
];

