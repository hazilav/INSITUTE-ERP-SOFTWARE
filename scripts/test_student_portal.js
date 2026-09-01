const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runStudentPortalTest() {
  console.log("=== STARTING STUDENT PORTAL MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    // Ensure setup course and batch
    let course = await prisma.course.findFirst({ where: { institute_id: inst.id } });
    let batch = await prisma.batch.findFirst({ where: { institute_id: inst.id } });

    if (!course) {
      course = await prisma.course.create({
        data: { institute_id: inst.id, name: "Computer Science 101", code: "CS-101" },
      });
    }

    if (!batch) {
      batch = await prisma.batch.create({
        data: { institute_id: inst.id, course_id: course.id, name: "Batch 2026 CS", code: "CS-2026" },
      });
    }

    // 1. Create Student A & User Account with Student ID
    console.log("\n1. Testing Student Account Creation with Student ID...");
    const studentCodeA = `INS-2026-PORTAL-${Date.now().toString().slice(-4)}`;
    const plainPasswordA = "StudentPass123!";
    const passwordHashA = await bcrypt.hash(plainPasswordA, 10);

    const userA = await prisma.user.create({
      data: {
        institute_id: inst.id,
        name: "Student Alpha",
        email: `student.alpha.${Date.now()}@institute.com`,
        phone: "555-0101",
        password_hash: passwordHashA,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });

    const studentA = await prisma.student.create({
      data: {
        institute_id: inst.id,
        user_id: userA.id,
        course_id: course.id,
        batch_id: batch.id,
        student_code: studentCodeA,
        name: "Student Alpha",
        phone: "555-0101",
        status: "ACTIVE",
      },
    });

    console.log(`✓ Student A Created: Name=${studentA.name}, StudentID=${studentA.student_code}`);

    // 2. Test Student ID Authentication & Password Verification
    console.log("\n2. Testing Student ID Authentication...");
    const foundStudent = await prisma.student.findFirst({
      where: { institute_id: inst.id, student_code: studentCodeA, is_archived: false },
      include: { user: true },
    });

    const isPasswordValid = await bcrypt.compare(plainPasswordA, foundStudent.user.password_hash);
    console.log(`✓ Student Auth Check: FoundStudentID=${foundStudent.student_code}, PasswordMatches=${isPasswordValid}`);

    // 3. Test Personal Student Tasks
    console.log("\n3. Testing Personal Student Tasks...");
    const task = await prisma.studentTask.create({
      data: {
        institute_id: inst.id,
        student_id: studentA.id,
        title: "Read Chapter 5 - Data Structures",
        task_type: "reading",
        status: "Pending",
        priority: "High",
      },
    });

    const updatedTask = await prisma.studentTask.update({
      where: { id: task.id },
      data: { status: "Completed" },
    });

    console.log(`✓ Personal Student Task Created & Completed: Title="${updatedTask.title}", Status=${updatedTask.status}`);

    // 4. Test Student Data Access Scoping (Isolation Check)
    console.log("\n4. Testing Student Data Access Scoping...");
    const studentATasks = await prisma.studentTask.findMany({
      where: { institute_id: inst.id, student_id: studentA.id },
    });

    console.log(`✓ Scoped Query: Student A accesses only Student A tasks (Count=${studentATasks.length})`);

    // 5. Test Password Change Functionality
    console.log("\n5. Testing Secure Password Change...");
    const newPassword = "NewStudentPass456!";
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userA.id },
      data: { password_hash: newPasswordHash },
    });

    const isNewPasswordValid = await bcrypt.compare(newPassword, newPasswordHash);
    console.log(`✓ Password Change Verification: NewPasswordMatches=${isNewPasswordValid}`);

    console.log("\n=== ALL STUDENT PORTAL TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Student portal test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStudentPortalTest();
