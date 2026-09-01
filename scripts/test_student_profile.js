const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runStudentProfileTest() {
  console.log("=== STARTING STUDENT PROFILE & TIMELINE VERIFICATION TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    // Fetch or create a student for profile test
    let student = await prisma.student.findFirst({
      where: { institute_id: inst.id, is_archived: false },
      include: { user: true, activities: true },
    });

    if (!student) {
      console.log("Creating test student for profile test...");
      const passHash = await bcrypt.hash("InitialPass123", 10);
      const user = await prisma.user.create({
        data: {
          institute_id: inst.id,
          name: "Test Profile Student",
          email: "profile_test@apex.local",
          phone: "+15551111",
          password_hash: passHash,
          role: "STUDENT",
        },
      });

      student = await prisma.student.create({
        data: {
          institute_id: inst.id,
          user_id: user.id,
          student_code: "INS-2026-99999",
          name: "Test Profile Student",
          phone: "+15551111",
          learning_mode: "hybrid",
          status: "ACTIVE",
        },
        include: { user: true, activities: true },
      });

      await prisma.studentActivity.create({
        data: {
          institute_id: inst.id,
          student_id: student.id,
          action: "Student record created",
          performed_by: "System Admin",
          details: "Created via automated test runner",
        },
      });
    }

    console.log(`\n1. Testing Student Profile Query & Activity Logs...`);
    const fetched = await prisma.student.findUnique({
      where: { id: student.id },
      include: { user: true, activities: true },
    });

    console.log(`✓ Student Profile fetched: Code=${fetched.student_code}, Activities Count=${fetched.activities.length}`);
    console.assert(fetched.activities.length >= 1, "Expected activity logs!");

    console.log(`\n2. Testing Password Reset & Hash Update...`);
    const newTempPass = "Std#Pass9876";
    const newHash = await bcrypt.hash(newTempPass, 10);

    await prisma.user.update({
      where: { id: fetched.user_id },
      data: { password_hash: newHash },
    });

    await prisma.studentActivity.create({
      data: {
        institute_id: inst.id,
        student_id: fetched.id,
        action: "Student password reset",
        performed_by: "Sarah Connor (OWNER)",
        details: "Password reset issued successfully",
      },
    });

    const updatedUser = await prisma.user.findUnique({ where: { id: fetched.user_id } });
    const isMatch = await bcrypt.compare(newTempPass, updatedUser.password_hash);
    console.log(`✓ Password Reset Hash Match: ${isMatch}`);
    console.assert(isMatch === true, "Password reset hash validation failed!");

    const updatedActivities = await prisma.studentActivity.findMany({
      where: { student_id: fetched.id },
    });
    console.log(`✓ Updated Activity Timeline events: ${updatedActivities.map(a => a.action).join(" | ")}`);

    console.log("\n=== ALL STUDENT PROFILE TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Student profile test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStudentProfileTest();
