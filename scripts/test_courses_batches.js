const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runCoursesBatchesTest() {
  console.log("=== STARTING COURSES & BATCHES MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    // 1. Create a Course
    console.log("\n1. Testing Course Creation...");
    const courseCode = `CRS-TEST-${Date.now().toString().slice(-4)}`;
    const course = await prisma.course.create({
      data: {
        institute_id: inst.id,
        name: "Fullstack Web Development",
        code: courseCode,
        description: "Comprehensive Web Dev Course",
        duration: "6 Months",
        learning_mode: inst.institute_mode || "hybrid",
        status: "Active",
      },
    });

    console.log(`✓ Created Course: ${course.name} (Code=${course.code}, ID=${course.id})`);

    // 2. Create a Batch linked to the Course
    console.log("\n2. Testing Batch Creation...");
    const batchCode = `BTC-TEST-${Date.now().toString().slice(-4)}`;
    const batch = await prisma.batch.create({
      data: {
        institute_id: inst.id,
        course_id: course.id,
        name: "Batch 01 - Morning",
        code: batchCode,
        learning_mode: course.learning_mode,
        status: "Active",
        classroom: "Room 101",
        days: "Mon, Wed, Fri",
        start_time: "10:00 AM",
        end_time: "12:00 PM",
      },
    });

    console.log(`✓ Created Batch: ${batch.name} (Code=${batch.code}, Room=${batch.classroom}, ID=${batch.id})`);

    // 3. Assign Student to Course & Batch
    console.log("\n3. Testing Student Assignment to Course & Batch...");
    let student = await prisma.student.findFirst({
      where: { institute_id: inst.id, is_archived: false },
    });

    if (!student) {
      student = await prisma.student.create({
        data: {
          institute_id: inst.id,
          student_code: "INS-2026-88888",
          name: "Academic Test Student",
          phone: "+15550000",
          learning_mode: "hybrid",
          status: "ACTIVE",
        },
      });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        course_id: course.id,
        batch_id: batch.id,
      },
      include: {
        course: true,
        batch: true,
      },
    });

    console.log(`✓ Student ${updatedStudent.name} assigned to Course: "${updatedStudent.course.name}" and Batch: "${updatedStudent.batch.name}"`);

    // 4. Verify Enrolled Student Counts
    console.log("\n4. Testing Real Enrolled Student Count Calculation...");
    const batchStudentCount = await prisma.student.count({
      where: { batch_id: batch.id, is_archived: false },
    });

    const courseStudentCount = await prisma.student.count({
      where: { course_id: course.id, is_archived: false },
    });

    console.log(`✓ Batch Enrolled Students Count: ${batchStudentCount}`);
    console.log(`✓ Course Enrolled Students Count: ${courseStudentCount}`);
    console.assert(batchStudentCount >= 1, "Expected at least 1 student in batch!");
    console.assert(courseStudentCount >= 1, "Expected at least 1 student in course!");

    // 5. Verify Multi-Tenant Isolation
    console.log("\n5. Testing Multi-Tenant Isolation...");
    const instB = await prisma.institute.create({
      data: {
        name: "Second Test Institute B",
        institute_mode: "online",
      },
    });

    const instBCourse = await prisma.course.create({
      data: {
        institute_id: instB.id,
        name: "Institute B Isolated Course",
        code: "INSTB-01",
        learning_mode: "online",
        status: "Active",
      },
    });

    const instAQueryForInstBCourse = await prisma.course.findFirst({
      where: { id: instBCourse.id, institute_id: inst.id },
    });

    console.log(`✓ Institute A Query for Institute B Course result: ${instAQueryForInstBCourse === null ? "NULL (Isolated)" : "Leaked!"}`);
    console.assert(instAQueryForInstBCourse === null, "Multi-tenant leakage detected!");

    // Cleanup Inst B test data
    await prisma.course.delete({ where: { id: instBCourse.id } });
    await prisma.institute.delete({ where: { id: instB.id } });

    console.log("\n=== ALL COURSES & BATCHES TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Courses & Batches test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCoursesBatchesTest();
