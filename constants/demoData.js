// Demo Data for Guest/Demo Mode

// 1. User Profile
export const DEMO_USER = {
    _id: "demo-student-id",
    name: "Harshika Patil",
    email: "harshika@demo.com",
    role: "student",
    phone: "9876543210",
    profileImage: "https://api.dicebear.com/7.x/avataaars/png?seed=Harshika&gender=female",
    currentClass: {
        _id: "class-3-a",
        name: "3rd Standard",
        section: "A",
        academicYear: "2024-2025"
    }
};

// 2. Class Details & Subjects (Teachers: North Karnataka mix)
export const DEMO_CLASS_DETAILS = {
    classData: {
        _id: "class-3-a",
        name: "3rd Standard",
        section: "A",
        academicYear: "2024-2025",
        classTeacher: { name: "Mrs. Savita Patil" }
    },
    subjects: [
        { _id: "s1", name: "Kannada", code: "KAN03", teachers: [{ name: "Mrs. Savita Patil" }] },
        { _id: "s2", name: "English", code: "ENG03", teachers: [{ name: "Ms. Mary D'Souza" }] },
        { _id: "s3", name: "Hindi", code: "HIN03", teachers: [{ name: "Mrs. Ayesha Siddiqui" }] },
        { _id: "s4", name: "Mathematics", code: "MAT03", teachers: [{ name: "Mr. Abdul Nadaf" }] },
        { _id: "s5", name: "EVS", code: "EVS03", teachers: [{ name: "Mr. Basavaraj Kulkarni" }] },
        { _id: "s6", name: "Computer", code: "COM03", teachers: [{ name: "Mr. John Peter" }] },
        { _id: "s7", name: "Art & Craft", code: "ART03", teachers: [{ name: "Mrs. Renuka Desai" }] },
        { _id: "s8", name: "Physical Education", code: "PE03", teachers: [{ name: "Mr. Suresh Meti" }] }
    ]
};

// 3. Attendance Summary
export const DEMO_ATTENDANCE_SUMMARY = {
    present: 85,
    absent: 5,
    late: 2,
    totalWorkingDays: 92,
    attendancePercentage: 92.4
};

// 4. Attendance History (Dec to March - approx 120 days)
const generateAttendance = () => {
    const history = [];
    const today = new Date();
    // Go back 120 days
    for (let i = 0; i < 120; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        // Skip Sundays
        if (date.getDay() === 0) continue;

        // Random status with higher probability of 'present'
        const rand = Math.random();
        let status = 'present';
        let remarks = '';

        if (rand > 0.95) {
            status = 'absent';
            remarks = 'Sick Leave';
        } else if (rand > 0.90) {
            status = 'late';
            remarks = 'Bus delay';
        }

        history.push({
            date: date.toISOString(),
            status: status,
            remarks: remarks
        });
    }
    return history;
};

export const DEMO_ATTENDANCE_HISTORY = {
    attendance: generateAttendance()
};

// 5. Report Card
export const DEMO_REPORT_CARD = {
    overall: { percentage: 72.5, grade: "B+" },
    student: { class: { name: "3rd Standard", section: "A" } },
    exams: [
        {
            examType: "FA1",
            isCompleted: true,
            percentage: 68,
            grade: "B",
            subjects: [
                { subject: "Kannada", obtainedMarks: 15, maxMarks: 25, grade: "B" },
                { subject: "English", obtainedMarks: 18, maxMarks: 25, grade: "B+" },
                { subject: "Hindi", obtainedMarks: 12, maxMarks: 25, grade: "C+" },
                { subject: "Mathematics", obtainedMarks: 22, maxMarks: 25, grade: "A+" },
                { subject: "EVS", obtainedMarks: 16, maxMarks: 25, grade: "B" },
                { subject: "Computer", obtainedMarks: 20, maxMarks: 25, grade: "A" },
                { subject: "Art & Craft", obtainedMarks: 14, maxMarks: 25, grade: "C+" },
                { subject: "Physical Education", obtainedMarks: 23, maxMarks: 25, grade: "A+" }
            ]
        },
        {
            examType: "FA2",
            isCompleted: true,
            percentage: 75,
            grade: "B+",
            subjects: [
                { subject: "Kannada", obtainedMarks: 18, maxMarks: 25, grade: "B+" },
                { subject: "English", obtainedMarks: 20, maxMarks: 25, grade: "A" },
                { subject: "Hindi", obtainedMarks: 15, maxMarks: 25, grade: "B" },
                { subject: "Mathematics", obtainedMarks: 21, maxMarks: 25, grade: "A" },
                { subject: "EVS", obtainedMarks: 19, maxMarks: 25, grade: "B+" },
                { subject: "Computer", obtainedMarks: 22, maxMarks: 25, grade: "A+" },
                { subject: "Art & Craft", obtainedMarks: 16, maxMarks: 25, grade: "B" },
                { subject: "Physical Education", obtainedMarks: 24, maxMarks: 25, grade: "A+" }
            ]
        },
        {
            examType: "SA1",
            isCompleted: true,
            percentage: 65,
            grade: "B",
            subjects: [
                { subject: "Kannada", obtainedMarks: 45, maxMarks: 80, grade: "C+" },
                { subject: "English", obtainedMarks: 58, maxMarks: 80, grade: "B+" },
                { subject: "Hindi", obtainedMarks: 40, maxMarks: 80, grade: "C" },
                { subject: "Mathematics", obtainedMarks: 72, maxMarks: 80, grade: "A" },
                { subject: "EVS", obtainedMarks: 50, maxMarks: 80, grade: "B" },
                { subject: "Computer", obtainedMarks: 65, maxMarks: 80, grade: "A" },
                { subject: "Art & Craft", obtainedMarks: 55, maxMarks: 80, grade: "B" },
                { subject: "Physical Education", obtainedMarks: 70, maxMarks: 80, grade: "A" }
            ]
        },
        {
            examType: "FA3",
            isCompleted: true,
            percentage: 82,
            grade: "A",
            subjects: [
                { subject: "Kannada", obtainedMarks: 19, maxMarks: 25, grade: "B+" },
                { subject: "English", obtainedMarks: 21, maxMarks: 25, grade: "A" },
                { subject: "Hindi", obtainedMarks: 18, maxMarks: 25, grade: "B+" },
                { subject: "Mathematics", obtainedMarks: 23, maxMarks: 25, grade: "A+" },
                { subject: "EVS", obtainedMarks: 20, maxMarks: 25, grade: "A" },
                { subject: "Computer", obtainedMarks: 22, maxMarks: 25, grade: "A+" },
                { subject: "Art & Craft", obtainedMarks: 20, maxMarks: 25, grade: "A" },
                { subject: "Physical Education", obtainedMarks: 24, maxMarks: 25, grade: "A+" }
            ]
        },
        {
            examType: "FA4",
            isCompleted: true,
            percentage: 55,
            grade: "C+",
            subjects: [
                { subject: "Kannada", obtainedMarks: 12, maxMarks: 25, grade: "C" },
                { subject: "English", obtainedMarks: 15, maxMarks: 25, grade: "B" },
                { subject: "Hindi", obtainedMarks: 10, maxMarks: 25, grade: "C" },
                { subject: "Mathematics", obtainedMarks: 18, maxMarks: 25, grade: "B+" },
                { subject: "EVS", obtainedMarks: 14, maxMarks: 25, grade: "C+" },
                { subject: "Computer", obtainedMarks: 16, maxMarks: 25, grade: "B" },
                { subject: "Art & Craft", obtainedMarks: 12, maxMarks: 25, grade: "C" },
                { subject: "Physical Education", obtainedMarks: 20, maxMarks: 25, grade: "A" }
            ]
        },
        {
            examType: "SA2",
            isCompleted: false,
            percentage: 0,
            grade: "-",
            subjects: []
        }
    ]
};

export const DEMO_INSIGHTS = {
    examTrends: [
        { exam: "FA1", percentage: "68" },
        { exam: "FA2", percentage: "75" },
        { exam: "SA1", percentage: "65" },
        { exam: "FA3", percentage: "82" },
        { exam: "FA4", percentage: "55" }
    ],
    subjectTrends: {
        "Kannada": [
            { exam: "FA1", percentage: "60" },
            { exam: "FA2", percentage: "72" },
            { exam: "SA1", percentage: "56" },
            { exam: "FA3", percentage: "76" },
            { exam: "FA4", percentage: "48" }
        ],
        "English": [
            { exam: "FA1", percentage: "72" },
            { exam: "FA2", percentage: "80" },
            { exam: "SA1", percentage: "72" },
            { exam: "FA3", percentage: "84" },
            { exam: "FA4", percentage: "60" }
        ],
        "Hindi": [
            { exam: "FA1", percentage: "48" },
            { exam: "FA2", percentage: "60" },
            { exam: "SA1", percentage: "50" },
            { exam: "FA3", percentage: "72" },
            { exam: "FA4", percentage: "40" }
        ],
        "Mathematics": [
            { exam: "FA1", percentage: "88" },
            { exam: "FA2", percentage: "84" },
            { exam: "SA1", percentage: "90" },
            { exam: "FA3", percentage: "92" },
            { exam: "FA4", percentage: "72" }
        ],
        "EVS": [
            { exam: "FA1", percentage: "64" },
            { exam: "FA2", percentage: "76" },
            { exam: "SA1", percentage: "62" },
            { exam: "FA3", percentage: "80" },
            { exam: "FA4", percentage: "56" }
        ],
        "Computer": [
            { exam: "FA1", percentage: "80" },
            { exam: "FA2", percentage: "88" },
            { exam: "SA1", percentage: "81" },
            { exam: "FA3", percentage: "88" },
            { exam: "FA4", percentage: "64" }
        ],
        "Art & Craft": [
            { exam: "FA1", percentage: "56" },
            { exam: "FA2", percentage: "64" },
            { exam: "SA1", percentage: "68" },
            { exam: "FA3", percentage: "80" },
            { exam: "FA4", percentage: "48" }
        ],
        "Physical Education": [
            { exam: "FA1", percentage: "92" },
            { exam: "FA2", percentage: "96" },
            { exam: "SA1", percentage: "87" },
            { exam: "FA3", percentage: "96" },
            { exam: "FA4", percentage: "80" }
        ]
    }
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
    { periodNumber: 1, startTime: "09:30", endTime: "10:10", type: "class" },
    { periodNumber: 0, startTime: "10:10", endTime: "10:20", type: "break", name: "Short Break" },
    { periodNumber: 2, startTime: "10:20", endTime: "11:00", type: "class" },
    { periodNumber: 0, startTime: "11:00", endTime: "11:10", type: "break", name: "Short Break" },
    { periodNumber: 3, startTime: "11:10", endTime: "11:50", type: "class" },
    { periodNumber: 0, startTime: "11:50", endTime: "12:00", type: "break", name: "Short Break" },
    { periodNumber: 4, startTime: "12:00", endTime: "12:40", type: "class" },
    { periodNumber: 0, startTime: "12:40", endTime: "01:20", type: "break", name: "Lunch Break" },
    { periodNumber: 5, startTime: "01:20", endTime: "02:00", type: "class" },
    { periodNumber: 0, startTime: "02:00", endTime: "02:10", type: "break", name: "Short Break" },
    { periodNumber: 6, startTime: "02:10", endTime: "02:50", type: "class" },
    { periodNumber: 7, startTime: "02:50", endTime: "03:30", type: "class" },
    { periodNumber: 8, startTime: "03:30", endTime: "04:10", type: "class" },
    { periodNumber: 0, startTime: "04:10", endTime: "04:30", type: "break", name: "Diary/Pack-up" },
];

const periodsSat = [
    { periodNumber: 1, startTime: "09:30", endTime: "10:10", type: "class" },
    { periodNumber: 0, startTime: "10:10", endTime: "10:20", type: "break", name: "Short Break" },
    { periodNumber: 2, startTime: "10:20", endTime: "11:00", type: "class" },
    { periodNumber: 0, startTime: "11:00", endTime: "11:10", type: "break", name: "Short Break" },
    { periodNumber: 3, startTime: "11:10", endTime: "11:50", type: "class" },
    { periodNumber: 4, startTime: "11:50", endTime: "12:30", type: "class" },
    { periodNumber: 0, startTime: "12:30", endTime: "01:00", type: "break", name: "Dispersal" },
];

export const DEMO_TIMETABLE = {
    schedule: [
        {
            day: "Monday",
            periods: periodsMonFri.map(p => {
                if (p.type === 'break') return { ...p, subject: { name: p.name }, teacher: { name: "" } };
                // Assign subjects based on period number for variety
                let sub = "Kannada";
                let teacher = "Mrs. Savita Patil";
                if (p.periodNumber === 2) { sub = "Mathematics"; teacher = "Mr. Abdul Nadaf"; }
                if (p.periodNumber === 3) { sub = "English"; teacher = "Ms. Mary D'Souza"; }
                if (p.periodNumber === 4) { sub = "EVS"; teacher = "Mr. Basavaraj Kulkarni"; }
                if (p.periodNumber === 5) { sub = "Hindi"; teacher = "Mrs. Ayesha Siddiqui"; }
                if (p.periodNumber === 6) { sub = "Computer"; teacher = "Mr. John Peter"; }
                if (p.periodNumber === 7) { sub = "Art & Craft"; teacher = "Mrs. Renuka Desai"; }
                if (p.periodNumber === 8) { sub = "PE"; teacher = "Mr. Suresh Meti"; }
                return { ...p, subject: { name: sub }, teacher: { name: teacher }, roomNumber: "301" };
            })
        },
        {
            day: "Tuesday",
            periods: periodsMonFri.map(p => {
                if (p.type === 'break') return { ...p, subject: { name: p.name }, teacher: { name: "" } };
                let sub = "English";
                let teacher = "Ms. Mary D'Souza";
                if (p.periodNumber === 2) { sub = "Kannada"; teacher = "Mrs. Savita Patil"; }
                if (p.periodNumber === 3) { sub = "Mathematics"; teacher = "Mr. Abdul Nadaf"; }
                if (p.periodNumber === 4) { sub = "Hindi"; teacher = "Mrs. Ayesha Siddiqui"; }
                if (p.periodNumber === 5) { sub = "EVS"; teacher = "Mr. Basavaraj Kulkarni"; }
                if (p.periodNumber === 6) { sub = "Library"; teacher = "Mrs. Savita Patil"; }
                if (p.periodNumber === 7) { sub = "PE"; teacher = "Mr. Suresh Meti"; }
                if (p.periodNumber === 8) { sub = "Music"; teacher = "Mr. John Peter"; }
                return { ...p, subject: { name: sub }, teacher: { name: teacher }, roomNumber: "301" };
            })
        },
        {
            day: "Wednesday",
            periods: periodsMonFri.map(p => {
                if (p.type === 'break') return { ...p, subject: { name: p.name }, teacher: { name: "" } };
                let sub = "Mathematics";
                let teacher = "Mr. Abdul Nadaf";
                if (p.periodNumber === 2) { sub = "EVS"; teacher = "Mr. Basavaraj Kulkarni"; }
                if (p.periodNumber === 3) { sub = "Kannada"; teacher = "Mrs. Savita Patil"; }
                if (p.periodNumber === 4) { sub = "English"; teacher = "Ms. Mary D'Souza"; }
                if (p.periodNumber === 5) { sub = "Computer"; teacher = "Mr. John Peter"; }
                if (p.periodNumber === 6) { sub = "Hindi"; teacher = "Mrs. Ayesha Siddiqui"; }
                if (p.periodNumber === 7) { sub = "GK"; teacher = "Mrs. Savita Patil"; }
                if (p.periodNumber === 8) { sub = "Story Time"; teacher = "Ms. Mary D'Souza"; }
                return { ...p, subject: { name: sub }, teacher: { name: teacher }, roomNumber: "301" };
            })
        },
        {
            day: "Thursday",
            periods: periodsMonFri.map(p => {
                if (p.type === 'break') return { ...p, subject: { name: p.name }, teacher: { name: "" } };
                let sub = "EVS";
                let teacher = "Mr. Basavaraj Kulkarni";
                if (p.periodNumber === 2) { sub = "English"; teacher = "Ms. Mary D'Souza"; }
                if (p.periodNumber === 3) { sub = "Mathematics"; teacher = "Mr. Abdul Nadaf"; }
                if (p.periodNumber === 4) { sub = "Kannada"; teacher = "Mrs. Savita Patil"; }
                if (p.periodNumber === 5) { sub = "Hindi"; teacher = "Mrs. Ayesha Siddiqui"; }
                if (p.periodNumber === 6) { sub = "Art & Craft"; teacher = "Mrs. Renuka Desai"; }
                if (p.periodNumber === 7) { sub = "Computer"; teacher = "Mr. John Peter"; }
                if (p.periodNumber === 8) { sub = "PE"; teacher = "Mr. Suresh Meti"; }
                return { ...p, subject: { name: sub }, teacher: { name: teacher }, roomNumber: "301" };
            })
        },
        {
            day: "Friday",
            periods: periodsMonFri.map(p => {
                if (p.type === 'break') return { ...p, subject: { name: p.name }, teacher: { name: "" } };
                let sub = "Hindi";
                let teacher = "Mrs. Ayesha Siddiqui";
                if (p.periodNumber === 2) { sub = "Mathematics"; teacher = "Mr. Abdul Nadaf"; }
                if (p.periodNumber === 3) { sub = "EVS"; teacher = "Mr. Basavaraj Kulkarni"; }
                if (p.periodNumber === 4) { sub = "English"; teacher = "Ms. Mary D'Souza"; }
                if (p.periodNumber === 5) { sub = "Kannada"; teacher = "Mrs. Savita Patil"; }
                if (p.periodNumber === 6) { sub = "Activity"; teacher = "Mrs. Renuka Desai"; }
                if (p.periodNumber === 7) { sub = "Value Ed"; teacher = "Mrs. Savita Patil"; }
                if (p.periodNumber === 8) { sub = "Mass PT"; teacher = "Mr. Suresh Meti"; }
                return { ...p, subject: { name: sub }, teacher: { name: teacher }, roomNumber: "Ground" };
            })
        },
        {
            day: "Saturday",
            periods: periodsSat.map(p => {
                if (p.type === 'break') return { ...p, subject: { name: p.name }, teacher: { name: "" } };
                let sub = "PE";
                let teacher = "Mr. Suresh Meti";
                if (p.periodNumber === 2) { sub = "Art & Craft"; teacher = "Mrs. Renuka Desai"; }
                if (p.periodNumber === 3) { sub = "Music"; teacher = "Mr. John Peter"; }
                if (p.periodNumber === 4) { sub = "Club Activity"; teacher = "Mrs. Savita Patil"; }
                return { ...p, subject: { name: sub }, teacher: { name: teacher }, roomNumber: "301" };
            })
        }
    ]
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
            { name: "Library Fee", amount: 1000 }
        ]
    },
    payments: [
        { _id: "p1", amount: 5000, paymentDate: "2024-05-15T10:00:00.000Z", paymentMethod: "Cash", receiptNumber: "REC/24/0056", status: "paid" },
        { _id: "p2", amount: 15000, paymentDate: "2024-08-10T11:30:00.000Z", paymentMethod: "Online", receiptNumber: "REC/24/0892", status: "paid" }
    ]
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
        instructions: "Bring geometry box and exam pad."
    },
    {
        _id: "e2",
        name: "Summative Assessment 2 (SA2)",
        type: "Written",
        date: new Date(new Date().setDate(new Date().getDate() + 17)).toISOString(),
        subject: { name: "Kannada" },
        duration: 180,
        room: "Hall 3",
        instructions: "Handwriting marks included."
    },
    {
        _id: "e3",
        name: "Summative Assessment 2 (SA2)",
        type: "Written",
        date: new Date(new Date().setDate(new Date().getDate() + 19)).toISOString(),
        subject: { name: "English" },
        duration: 180,
        room: "Hall 3",
        instructions: "Read questions carefully."
    },
    {
        _id: "e4",
        name: "Summative Assessment 2 (SA2)",
        type: "Written",
        date: new Date(new Date().setDate(new Date().getDate() + 21)).toISOString(),
        subject: { name: "EVS" },
        duration: 180,
        room: "Hall 3",
        instructions: "Draw diagrams where necessary."
    },
    {
        _id: "e5",
        name: "Summative Assessment 2 (SA2)",
        type: "Written",
        date: new Date(new Date().setDate(new Date().getDate() + 23)).toISOString(),
        subject: { name: "Hindi" },
        duration: 180,
        room: "Hall 3",
        instructions: "Answer all questions."
    },
    {
        _id: "e6",
        name: "Summative Assessment 2 (SA2)",
        type: "Written",
        date: new Date(new Date().setDate(new Date().getDate() + 25)).toISOString(),
        subject: { name: "Computer" },
        duration: 120,
        room: "Lab 1",
        instructions: "Practical exam included."
    }
];

// 11. Events (Dec 2024 - April 2025)
export const DEMO_EVENTS = {
    events: [
        // December 2024
        {
            _id: "ev_dec1",
            title: "Annual Sports Day",
            description: "All students must assemble in the ground by 8:30 AM. Track suits are mandatory.",
            date: "2024-12-10T09:00:00.000Z",
            isSchoolEvent: true,
            type: "sports"
        },
        {
            _id: "ev_dec2",
            title: "Christmas Celebration",
            description: "Cultural programs and cake distribution.",
            date: "2024-12-24T10:00:00.000Z",
            isSchoolEvent: true,
            type: "celebration"
        },
        // January 2025
        {
            _id: "ev_jan1",
            title: "Republic Day",
            description: "Flag hoisting at 8:00 AM. Attendance is compulsory.",
            date: "2025-01-26T08:00:00.000Z",
            isSchoolEvent: true,
            type: "celebration"
        },
        {
            _id: "ev_jan2",
            title: "Science Exhibition",
            description: "Projects to be submitted by 28th Jan. Parents are invited.",
            date: "2025-01-30T10:00:00.000Z",
            isSchoolEvent: true,
            type: "academic"
        },
        // February 2025
        {
            _id: "ev_feb1",
            title: "Parent Teacher Meeting",
            description: "Discussion about FA3 and FA4 performance.",
            date: "2025-02-10T09:30:00.000Z",
            isSchoolEvent: true,
            type: "meeting"
        },
        {
            _id: "ev_feb2",
            title: "School Picnic",
            description: "One day trip to Water Park. Consent forms to be submitted by 15th.",
            date: "2025-02-20T07:00:00.000Z",
            isSchoolEvent: true,
            type: "trip"
        },
        // March 2025
        {
            _id: "ev_mar1",
            title: "Preparatory Exams",
            description: "Study holidays start from 15th March.",
            date: "2025-03-10T09:00:00.000Z",
            isSchoolEvent: false,
            type: "exam"
        },
        {
            _id: "ev_mar2",
            title: "Ugadi Celebration",
            description: "Holiday on account of Ugadi.",
            date: "2025-03-30T00:00:00.000Z",
            isSchoolEvent: true,
            type: "holiday"
        },
        // April 2025
        {
            _id: "ev_apr1",
            title: "Annual Day",
            description: "Cultural extravaganza evening.",
            date: "2025-04-05T17:00:00.000Z",
            isSchoolEvent: true,
            type: "celebration"
        },
        {
            _id: "ev_apr2",
            title: "Result Declaration",
            description: "Report cards distribution for Academic Year 2024-25.",
            date: "2025-04-15T10:00:00.000Z",
            isSchoolEvent: true,
            type: "academic"
        }
    ]
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
            read: false
        },
        {
            _id: "n2",
            title: "Exam Schedule Released",
            message: "The timetable for SA2 has been published. Please check the Exams tab.",
            type: "alert",
            createdAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
            read: false
        },
        {
            _id: "n3",
            title: "Fee Payment Reminder",
            message: "Last date to pay the term fee is coming up. Ignore if already paid.",
            type: "warning",
            createdAt: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
            read: true
        },
        {
            _id: "n4",
            title: "Holiday Declared",
            message: "Tomorrow is a holiday due to heavy rains.",
            type: "info",
            createdAt: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
            read: true
        },
        {
            _id: "n5",
            title: "Sports Day Winners",
            message: "Congratulations to all the winners of the Annual Sports Day!",
            type: "success",
            createdAt: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
            read: true
        }
    ]
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
            status: "approved"
        },
        {
            _id: "l2",
            startDate: "2024-09-05T00:00:00.000Z",
            endDate: "2024-09-05T00:00:00.000Z",
            leaveType: "full",
            reason: "Cousin's Wedding",
            status: "approved"
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
            rejectionComments: "Complete your notes first."
        }
    ]
};

// 10. Subject Content
export const DEMO_SUBJECT_CONTENT = [
    {
        _id: "c1",
        title: "Poem: The Little Plant",
        description: "Read and memorize the first stanza.",
        type: "note",
        createdAt: "2024-11-20T09:00:00.000Z",
        author: { name: "Ms. Mary D'Souza" }
    },
    {
        _id: "c2",
        title: "Homework: Multiplication",
        description: "Solve page 45, Exercise 3.2 (Q1 to Q10).",
        type: "homework",
        createdAt: "2024-11-22T10:00:00.000Z",
        author: { name: "Mr. Abdul Nadaf" }
    },
    {
        _id: "c3",
        title: "Project: Types of Leaves",
        description: "Collect 5 different types of leaves and paste them in scrapbook.",
        type: "homework",
        createdAt: "2024-11-25T08:00:00.000Z",
        author: { name: "Mr. Basavaraj Kulkarni" }
    },
    {
        _id: "c4",
        title: "Kannada Varnamala",
        description: "Practice writing vowels (Swaragalu) 5 times.",
        type: "homework",
        createdAt: "2024-11-26T11:00:00.000Z",
        author: { name: "Mrs. Savita Patil" }
    },
    {
        _id: "c5",
        title: "Annual Sports Day",
        description: "Selection for running race tomorrow.",
        type: "news",
        createdAt: "2024-11-28T08:00:00.000Z",
        author: { name: "Mr. Suresh Meti" }
    }
];
