export const DEMO_USER = {
    id: 'demo-student-id',
    _id: 'demo-student-id',
    name: "Rahul Sharma",
    role: "student",
    phone: "9876543210",
    email: "rahul.sharma@example.com",
    guardianName: "Rajesh Sharma",
    guardianPhone: "9876543211",
    admissionDate: "2023-06-01T00:00:00.000Z",
    currentClass: {
        _id: "demo-class-id",
        name: "10th Standard",
        section: "A"
    },
    classId: "demo-class-id",
    sectionId: "demo-section-id",
    className: "10th Standard",
    sectionName: "A"
};

export const DEMO_CLASS_DETAILS = {
    classData: {
        _id: "demo-class-id",
        name: "10th Standard",
        section: "A",
        academicYear: {
            name: "2023-2024"
        }
    },
    subjects: [
        {
            _id: "s1",
            name: "Mathematics",
            code: "MATH101",
            teachers: [{ name: "Mr. Gupta" }]
        },
        {
            _id: "s2",
            name: "Science",
            code: "SCI101",
            teachers: [{ name: "Mrs. Verma" }]
        },
        {
            _id: "s3",
            name: "English",
            code: "ENG101",
            teachers: [{ name: "Ms. Sharma" }]
        },
        {
            _id: "s4",
            name: "Social Studies",
            code: "SOC101",
            teachers: [{ name: "Mr. Singh" }]
        },
        {
            _id: "s5",
            name: "Hindi",
            code: "HIN101",
            teachers: [{ name: "Mrs. Devi" }]
        },
        {
            _id: "s6",
            name: "Computer Science",
            code: "CS101",
            teachers: [{ name: "Mr. Rao" }]
        }
    ]
};

export const DEMO_ATTENDANCE_SUMMARY = {
    overall: {
        percentage: 85.5,
        present: 171,
        total: 200
    },
    subjectWise: [
        { subjectId: 's1', name: 'Mathematics', present: 45, total: 50, percentage: 90 },
        { subjectId: 's2', name: 'Science', present: 40, total: 50, percentage: 80 },
        { subjectId: 's3', name: 'English', present: 48, total: 50, percentage: 96 },
        { subjectId: 's4', name: 'Social Studies', present: 38, total: 50, percentage: 76 }
    ],
    monthlyBreakdown: [
        { month: 'June', present: 20, total: 22, percentage: 90.9 },
        { month: 'July', present: 21, total: 23, percentage: 91.3 },
        { month: 'August', present: 18, total: 21, percentage: 85.7 },
        { month: 'September', present: 19, total: 22, percentage: 86.4 },
        { month: 'October', present: 15, total: 20, percentage: 75.0 },
        { month: 'November', present: 18, total: 20, percentage: 90.0 }
    ]
};

// Generate some attendance history for the last 30 days
// Generate attendance history for Dec to March (approx 4 months)
const generateAttendance = () => {
    const history = [];
    const today = new Date();
    // Go back 120 days
    for (let i = 0; i < 120; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        // Skip Sundays
        if (date.getDay() === 0) continue;

        const statuses = ['present', 'present', 'present', 'present', 'absent', 'late'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        history.push({
            date: date.toISOString(),
            status: status,
            remarks: status === 'absent' ? 'Sick leave' : ''
        });
    }
    return history;
};

export const DEMO_ATTENDANCE_HISTORY = {
    attendance: generateAttendance()
};

export const DEMO_REPORT_CARD = {
    overall: { percentage: 88.5, grade: "A" },
    student: { class: { name: "10th Standard", section: "A" } },
    exams: [
        {
            examType: "Mid Term",
            isCompleted: true,
            percentage: 88,
            grade: "A",
            subjects: [
                { subject: "Mathematics", obtainedMarks: 90, maxMarks: 100, grade: "A+" },
                { subject: "Science", obtainedMarks: 85, maxMarks: 100, grade: "A" },
                { subject: "English", obtainedMarks: 88, maxMarks: 100, grade: "A" },
                { subject: "Social Studies", obtainedMarks: 82, maxMarks: 100, grade: "B+" },
                { subject: "Hindi", obtainedMarks: 92, maxMarks: 100, grade: "A+" },
                { subject: "Computer Science", obtainedMarks: 95, maxMarks: 100, grade: "A+" }
            ]
        },
        {
            examType: "Final Term",
            isCompleted: false,
            percentage: 0,
            grade: "-",
            subjects: []
        }
    ]
};

export const DEMO_INSIGHTS = {
    examTrends: [
        { exam: "Unit Test 1", percentage: "82" },
        { exam: "Mid Term", percentage: "88" }
    ],
    subjectTrends: {
        "Mathematics": [
            { exam: "Unit Test 1", percentage: "85" },
            { exam: "Mid Term", percentage: "90" }
        ],
        "Science": [
            { exam: "Unit Test 1", percentage: "80" },
            { exam: "Mid Term", percentage: "85" }
        ]
    }
};

export const DEMO_TIMETABLE = {
    schedule: [
        {
            day: "Monday",
            periods: [
                { periodNumber: 1, startTime: "09:00", endTime: "10:00", subject: { name: "Mathematics" }, teacher: { name: "Mr. Gupta" }, roomNumber: "101" },
                { periodNumber: 2, startTime: "10:00", endTime: "11:00", subject: { name: "Science" }, teacher: { name: "Mrs. Verma" }, roomNumber: "102" },
                { periodNumber: 3, startTime: "11:15", endTime: "12:15", subject: { name: "English" }, teacher: { name: "Ms. Sharma" }, roomNumber: "103" }
            ]
        },
        {
            day: "Tuesday",
            periods: [
                { periodNumber: 1, startTime: "09:00", endTime: "10:00", subject: { name: "Social Studies" }, teacher: { name: "Mr. Singh" }, roomNumber: "104" },
                { periodNumber: 2, startTime: "10:00", endTime: "11:00", subject: { name: "Hindi" }, teacher: { name: "Mrs. Devi" }, roomNumber: "105" },
                { periodNumber: 3, startTime: "11:15", endTime: "12:15", subject: { name: "Computer Science" }, teacher: { name: "Mr. Rao" }, roomNumber: "Lab 1" }
            ]
        },
        {
            day: "Wednesday",
            periods: [
                { periodNumber: 1, startTime: "09:00", endTime: "10:00", subject: { name: "Mathematics" }, teacher: { name: "Mr. Gupta" }, roomNumber: "101" },
                { periodNumber: 2, startTime: "10:00", endTime: "11:00", subject: { name: "Science" }, teacher: { name: "Mrs. Verma" }, roomNumber: "102" }
            ]
        },
        {
            day: "Thursday",
            periods: [
                { periodNumber: 1, startTime: "09:00", endTime: "10:00", subject: { name: "English" }, teacher: { name: "Ms. Sharma" }, roomNumber: "103" },
                { periodNumber: 2, startTime: "10:00", endTime: "11:00", subject: { name: "Social Studies" }, teacher: { name: "Mr. Singh" }, roomNumber: "104" }
            ]
        },
        {
            day: "Friday",
            periods: [
                { periodNumber: 1, startTime: "09:00", endTime: "10:00", subject: { name: "Hindi" }, teacher: { name: "Mrs. Devi" }, roomNumber: "105" },
                { periodNumber: 2, startTime: "10:00", endTime: "11:00", subject: { name: "Computer Science" }, teacher: { name: "Mr. Rao" }, roomNumber: "Lab 1" }
            ]
        },
        {
            day: "Saturday",
            periods: [
                { periodNumber: 1, startTime: "09:00", endTime: "10:00", subject: { name: "Physical Education" }, teacher: { name: "Mr. Khan" }, roomNumber: "Ground" }
            ]
        }
    ]
};

export const DEMO_FEES = {
    totalFees: 50000,
    paidAmount: 30000,
    pendingAmount: 20000,
    feeStructure: {
        components: [
            { name: "Tuition Fee", amount: 30000 },
            { name: "Development Fee", amount: 10000 },
            { name: "Lab Charges", amount: 5000 },
            { name: "Library Fee", amount: 5000 }
        ]
    },
    payments: [
        { _id: "p1", amount: 15000, paymentDate: "2023-06-15T10:00:00.000Z", paymentMethod: "Online", receiptNumber: "REC001", status: "paid" },
        { _id: "p2", amount: 15000, paymentDate: "2023-09-15T10:00:00.000Z", paymentMethod: "Cash", receiptNumber: "REC002", status: "paid" }
    ]
};

export const DEMO_EXAMS = [
    {
        _id: "e1",
        name: "Final Term Examination",
        type: "Written",
        date: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(), // 10 days from now
        subject: { name: "Mathematics" },
        duration: 180,
        room: "Hall A",
        instructions: "Bring your own geometry box."
    },
    {
        _id: "e2",
        name: "Final Term Examination",
        type: "Written",
        date: new Date(new Date().setDate(new Date().getDate() + 12)).toISOString(), // 12 days from now
        subject: { name: "Science" },
        duration: 180,
        room: "Hall B",
        instructions: "Calculators are not allowed."
    }
];

export const DEMO_LEAVES = {
    data: [
        {
            _id: "l1",
            startDate: "2023-08-10T00:00:00.000Z",
            endDate: "2023-08-12T00:00:00.000Z",
            leaveType: "full",
            reason: "Family function",
            status: "approved"
        },
        {
            _id: "l2",
            startDate: "2023-09-05T00:00:00.000Z",
            endDate: "2023-09-05T00:00:00.000Z",
            leaveType: "half",
            halfDaySlot: "morning",
            reason: "Doctor appointment",
            status: "rejected",
            rejectionReason: "Important exam on this day",
            rejectionComments: "Please reschedule."
        }
    ]
};

export const DEMO_SUBJECT_CONTENT = [
    {
        _id: "c1",
        title: "Chapter 1: Real Numbers",
        description: "Introduction to Real Numbers, Euclid's Division Lemma.",
        type: "note",
        createdAt: "2023-06-10T09:00:00.000Z",
        author: { name: "Mr. Gupta" }
    },
    {
        _id: "c2",
        title: "Homework: Exercise 1.1",
        description: "Solve questions 1 to 5 from Exercise 1.1.",
        type: "homework",
        createdAt: "2023-06-12T10:00:00.000Z",
        author: { name: "Mr. Gupta" }
    },
    {
        _id: "c3",
        title: "Class Test Announcement",
        description: "Class test on Real Numbers will be held on Monday.",
        type: "news",
        createdAt: "2023-06-15T08:00:00.000Z",
        author: { name: "Mr. Gupta" }
    }
];
