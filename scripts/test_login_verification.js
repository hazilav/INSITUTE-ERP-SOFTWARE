const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function testStudentLoginCredentials() {
  console.log("=== TESTING STUDENT LOGIN CREDENTIALS ===");

  const inst = await prisma.institute.findFirst();
  if (!inst) throw new Error("No test institute found!");

  const testCases = [
    { code: "INS-2026-DEMO", pass: "Student123!" },
    { code: "ins-2026-demo", pass: "Student123!" },
    { code: "student@demo.com", pass: "Student123!" },
    { code: "INS-2026-00001", pass: "Student123!" },
    { code: "ins-2026-00001", pass: "Student123!" },
  ];

  for (const tc of testCases) {
    const trimmedCode = tc.code.trim();

    const student = await prisma.student.findFirst({
      where: {
        institute_id: inst.id,
        OR: [
          { student_code: trimmedCode },
          { student_code: trimmedCode.toUpperCase() },
          { email: trimmedCode.toLowerCase() },
        ],
        is_archived: false,
      },
      include: { user: true },
    });

    if (!student || !student.user) {
      console.log(`❌ FAILED for code: "${tc.code}" - Student/User not found`);
      continue;
    }

    const isValid = await bcrypt.compare(tc.pass, student.user.password_hash);
    if (isValid) {
      console.log(`✓ SUCCESS for code: "${tc.code}" | StudentName: ${student.name} | StudentID: ${student.student_code}`);
    } else {
      console.log(`❌ FAILED for code: "${tc.code}" - Invalid Password`);
    }
  }
}

testStudentLoginCredentials()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
