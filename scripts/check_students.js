const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function checkAndResetDemoStudent() {
  console.log("=== CHECKING EXISTING STUDENTS IN DATABASE ===");

  const inst = await prisma.institute.findFirst();
  if (!inst) {
    console.log("No institute found.");
    return;
  }

  const students = await prisma.student.findMany({
    where: { institute_id: inst.id, is_archived: false },
    include: { user: true, course: true, batch: true },
  });

  console.log(`Found ${students.length} active student(s) for ${inst.name}:`);

  for (const s of students) {
    console.log(`- Name: ${s.name} | StudentID: ${s.student_code} | Email: ${s.user?.email || s.email || 'None'} | UserStatus: ${s.user?.status}`);
  }

  // Ensure a clean Demo Student exists with known credentials
  const demoCode = "INS-2026-DEMO";
  const demoPass = "Student123!";
  const passHash = await bcrypt.hash(demoPass, 10);

  let demoStudent = await prisma.student.findFirst({
    where: { institute_id: inst.id, student_code: demoCode },
    include: { user: true },
  });

  let course = await prisma.course.findFirst({ where: { institute_id: inst.id } });
  let batch = await prisma.batch.findFirst({ where: { institute_id: inst.id } });

  if (!course) {
    course = await prisma.course.create({
      data: { institute_id: inst.id, name: "Web Development", code: "WEB-101" },
    });
  }

  if (!batch) {
    batch = await prisma.batch.create({
      data: { institute_id: inst.id, course_id: course.id, name: "Batch 2026 Alpha", code: "ALPHA-2026" },
    });
  }

  if (!demoStudent) {
    const demoUser = await prisma.user.create({
      data: {
        institute_id: inst.id,
        name: "Demo Student",
        email: "student@demo.com",
        phone: "9876543210",
        password_hash: passHash,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });

    demoStudent = await prisma.student.create({
      data: {
        institute_id: inst.id,
        user_id: demoUser.id,
        course_id: course.id,
        batch_id: batch.id,
        student_code: demoCode,
        name: "Demo Student",
        phone: "9876543210",
        email: "student@demo.com",
        learning_mode: "hybrid",
        status: "ACTIVE",
      },
    });
  } else {
    // Update existing demo student user password to Student123!
    if (demoStudent.user_id) {
      await prisma.user.update({
        where: { id: demoStudent.user_id },
        data: {
          password_hash: passHash,
          status: "ACTIVE",
        },
      });
    }
  }

  console.log("\n=== DEMO STUDENT CREATED / RESET SUCCESSFULLY ===");
  console.log(`Student ID: ${demoCode}`);
  console.log(`Email: student@demo.com`);
  console.log(`Password: ${demoPass}`);
}

checkAndResetDemoStudent()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
