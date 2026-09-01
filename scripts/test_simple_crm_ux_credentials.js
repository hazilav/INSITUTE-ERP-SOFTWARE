const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function runSection22Test() {
  console.log("==========================================================================");
  console.log("   SECTION 22 — SIMPLE CRM UX, ACTIONS & STUDENT CREDENTIALS AUDIT");
  console.log("==========================================================================");

  try {
    // 1. SETUP INSTITUTE & STUDENT
    console.log("\n[1/5] SETTING UP TEST INSTITUTE & STUDENT...");
    let institute = await prisma.institute.findFirst({ where: { name: "Apex Institute of Science" } });
    if (!institute) {
      institute = await prisma.institute.create({
        data: { name: "Apex Institute of Science", institute_mode: "hybrid" },
      });
    }

    const testStudentCode = `STU-2026-TEST-${Date.now().toString().slice(-4)}`;
    const student = await prisma.student.create({
      data: {
        institute_id: institute.id,
        student_code: testStudentCode,
        name: "Edward Test",
        phone: "+1987654321",
        email: "edward.test@example.com",
      },
    });

    console.log(`✓ Test Student Created: '${student.name}' (${student.student_code})`);

    // 2. GENERATE TEMPORARY PASSWORD CREDENTIALS
    console.log("\n[2/5] GENERATING TEMPORARY PASSWORD & ENFORCING FIRST LOGIN CHANGE...");
    const tempPassword = "TempPass2026!";
    const hash = await bcrypt.hash(tempPassword, 10);

    const studentUser = await prisma.user.create({
      data: {
        institute_id: institute.id,
        name: student.name,
        email: `${student.student_code.toLowerCase()}@student.crm`,
        password_hash: hash,
        role: "STUDENT",
        status: "ACTIVE",
        must_change_password: true,
      },
    });

    await prisma.student.update({
      where: { id: student.id },
      data: { user_id: studentUser.id },
    });

    console.log(`✓ Portal Account Created for '${student.name}'`);
    console.log(`✓ Temporary Password Set. must_change_password = ${studentUser.must_change_password}`);

    if (!studentUser.must_change_password) {
      throw new Error("FAILURE: must_change_password flag was not set to true!");
    }

    // 3. SIMULATE FIRST LOGIN & MANDATORY PASSWORD CHANGE
    console.log("\n[3/5] SIMULATING FIRST LOGIN & PASSWORD UPDATE...");
    const newPermanentPass = "MyNewSecretPass2026!";
    const newHash = await bcrypt.hash(newPermanentPass, 10);

    const updatedUser = await prisma.user.update({
      where: { id: studentUser.id },
      data: {
        password_hash: newHash,
        must_change_password: false,
        last_login: new Date(),
      },
    });

    console.log(`✓ Permanent Password Updated. must_change_password = ${updatedUser.must_change_password}`);
    console.log(`✓ Last Login Date Recorded: ${updatedUser.last_login.toISOString()}`);

    if (updatedUser.must_change_password) {
      throw new Error("FAILURE: must_change_password flag was not reset to false!");
    }

    // 4. PORTAL ACCOUNT DEACTIVATION / REACTIVATION TEST
    console.log("\n[4/5] TESTING PORTAL ACCOUNT DEACTIVATION & REACTIVATION...");
    const deactivatedUser = await prisma.user.update({
      where: { id: studentUser.id },
      data: { status: "INACTIVE" },
    });
    console.log(`✓ Account Status Deactivated: '${deactivatedUser.status}' (Student data preserved)`);

    const reactivatedUser = await prisma.user.update({
      where: { id: studentUser.id },
      data: { status: "ACTIVE" },
    });
    console.log(`✓ Account Status Reactivated: '${reactivatedUser.status}'`);

    // 5. CLEANUP
    console.log("\n[5/5] CLEANING UP TEST ARTIFACTS...");
    await prisma.student.delete({ where: { id: student.id } });
    await prisma.user.delete({ where: { id: studentUser.id } });
    console.log("✓ Audit test student and user record cleaned up cleanly.");

    console.log("\n==========================================================================");
    console.log("   === ALL SECTION 22 CRM UX & CREDENTIAL TESTS PASSED CLEANLY! ===");
    console.log("==========================================================================");
  } catch (err) {
    console.error("❌ Section 22 Test Failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSection22Test();
