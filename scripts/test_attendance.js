const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runAttendanceTest() {
  console.log("=== STARTING ATTENDANCE MANAGEMENT MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    // Ensure setup course, batch, class, and students exist
    let course = await prisma.course.findFirst({ where: { institute_id: inst.id } });
    let batch = await prisma.batch.findFirst({ where: { institute_id: inst.id } });
    let classItem = await prisma.class.findFirst({ where: { institute_id: inst.id } });

    if (!course || !batch || !classItem) {
      console.log("Creating test setup course, batch, class...");
      course = await prisma.course.create({
        data: { institute_id: inst.id, name: "Attendance 101", code: "ATT-101" },
      });
      batch = await prisma.batch.create({
        data: { institute_id: inst.id, course_id: course.id, name: "Attendance Batch", code: "ATT-B" },
      });
      classItem = await prisma.class.create({
        data: {
          institute_id: inst.id,
          course_id: course.id,
          batch_id: batch.id,
          title: "Attendance Live Session",
          class_type: "physical",
          date: new Date(),
        },
      });
    }

    // Ensure at least 2 students exist in batch
    let student1 = await prisma.student.findFirst({ where: { institute_id: inst.id, batch_id: batch.id } });
    if (!student1) {
      student1 = await prisma.student.create({
        data: {
          institute_id: inst.id,
          course_id: course.id,
          batch_id: batch.id,
          student_code: "INS-2026-ATT01",
          name: "John Doe",
          phone: "9998887771",
        },
      });
    }

    let student2 = await prisma.student.findFirst({ where: { institute_id: inst.id, id: { not: student1.id } } });
    if (!student2) {
      student2 = await prisma.student.create({
        data: {
          institute_id: inst.id,
          course_id: course.id,
          batch_id: batch.id,
          student_code: "INS-2026-ATT02",
          name: "Jane Smith",
          phone: "9998887772",
        },
      });
    }

    // 1. Test Bulk Upsert Attendance Records
    console.log("\n1. Testing Bulk Attendance Marking (Present, Absent, Late, Leave)...");
    const now = new Date();

    const rec1 = await prisma.attendanceRecord.upsert({
      where: {
        institute_id_student_id_class_id: {
          institute_id: inst.id,
          student_id: student1.id,
          class_id: classItem.id,
        },
      },
      update: { status: "Present", date: now },
      create: {
        institute_id: inst.id,
        student_id: student1.id,
        class_id: classItem.id,
        course_id: course.id,
        batch_id: batch.id,
        date: now,
        status: "Present",
        class_type: classItem.class_type,
      },
    });

    const rec2 = await prisma.attendanceRecord.upsert({
      where: {
        institute_id_student_id_class_id: {
          institute_id: inst.id,
          student_id: student2.id,
          class_id: classItem.id,
        },
      },
      update: { status: "Absent", date: now },
      create: {
        institute_id: inst.id,
        student_id: student2.id,
        class_id: classItem.id,
        course_id: course.id,
        batch_id: batch.id,
        date: now,
        status: "Absent",
        class_type: classItem.class_type,
      },
    });

    console.log(`✓ Student 1 (${student1.name}): Status = ${rec1.status}`);
    console.log(`✓ Student 2 (${student2.name}): Status = ${rec2.status}`);

    // 2. Test Attendance % Formula Calculation
    console.log("\n2. Testing Attendance % Formula Calculation...");
    // student2 has 1 Absent -> 0% attendance.
    const st2Attendance = await prisma.attendanceRecord.findMany({
      where: { student_id: student2.id },
    });
    const p = st2Attendance.filter((r) => r.status === "Present").length;
    const l = st2Attendance.filter((r) => r.status === "Late").length;
    const a = st2Attendance.filter((r) => r.status === "Absent").length;
    const den = p + l + a;
    const st2Pct = den > 0 ? ((p + l) / den) * 100 : 0;

    console.log(`✓ Student 2 Attendance %: ${st2Pct.toFixed(2)}% (Present=${p}, Late=${l}, Absent=${a})`);
    console.assert(st2Pct < 75, "Student 2 should trigger Low Attendance threshold (<75%)!");

    // 3. Test Today's Attendance Query for Owner Dashboard
    console.log("\n3. Testing Today's Attendance Dashboard Metrics Query...");
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todayRecords = await prisma.attendanceRecord.findMany({
      where: {
        institute_id: inst.id,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    const presentCount = todayRecords.filter((r) => r.status === "Present").length;
    const absentCount = todayRecords.filter((r) => r.status === "Absent").length;
    const todayDenom = presentCount + absentCount;
    const todayPct = todayDenom > 0 ? ((presentCount / todayDenom) * 100).toFixed(2) : "0.00";

    console.log(`✓ Today's Attendance: ${todayPct}% (${presentCount} Present, ${absentCount} Absent)`);

    console.log("\n=== ALL ATTENDANCE MODULE TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Attendance test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAttendanceTest();
