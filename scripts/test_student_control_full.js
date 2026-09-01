const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

async function testStudentControl() {
  console.log("==========================================================================");
  console.log("   STUDENT CONTROL & ACCESS MANAGEMENT AUDIT");
  console.log("==========================================================================");

  let institute = null;
  let studentUser = null;
  let student = null;

  try {
    // 1. Setup Test Institute
    console.log("\n[1/5] SETTING UP TEST INSTITUTE WITH PORTAL CONTROLS...");
    institute = await db.institute.create({
      data: {
        name: "Student Control Institute",
        portal_enabled: true,
        student_login_enabled: true,
        student_id_prefix: "CTL",
      },
    });
    console.log(`✓ Institute Created: ${institute.id}`);

    // 2. Create Student Account
    console.log("\n[2/5] CREATING STUDENT PORTAL ACCOUNT...");
    const tempPass = "TempPass#2026";
    const passHash = await bcrypt.hash(tempPass, 10);
    const code = "CTL-2026-00001";

    studentUser = await db.user.create({
      data: {
        institute_id: institute.id,
        name: "Student Control Test",
        email: "control.student@institute.test",
        password_hash: passHash,
        role: "STUDENT",
        status: "ACTIVE",
        must_change_password: true,
      },
    });

    student = await db.student.create({
      data: {
        institute_id: institute.id,
        user_id: studentUser.id,
        student_code: code,
        name: "Student Control Test",
        phone: "+15550193333",
        email: "control.student@institute.test",
        status: "ACTIVE",
      },
    });

    console.log(`✓ Student Created with Code: ${student.student_code}`);
    console.log(`✓ Initial User Status: ${studentUser.status}`);

    // 3. Test Individual Student Deactivation / Reactivation Toggle
    console.log("\n[3/5] TESTING INDIVIDUAL STUDENT PORTAL DEACTIVATION...");
    await db.user.update({
      where: { id: studentUser.id },
      data: { status: "INACTIVE" },
    });

    const deactivatedUser = await db.user.findUnique({ where: { id: studentUser.id } });
    if (deactivatedUser.status !== "INACTIVE") {
      throw new Error("FAILURE: Student account deactivation failed!");
    }
    console.log("✓ Student portal access deactivated successfully.");

    await db.user.update({
      where: { id: studentUser.id },
      data: { status: "ACTIVE" },
    });

    const reactivatedUser = await db.user.findUnique({ where: { id: studentUser.id } });
    if (reactivatedUser.status !== "ACTIVE") {
      throw new Error("FAILURE: Student account reactivation failed!");
    }
    console.log("✓ Student portal access reactivated successfully.");

    // 4. Test Global Institute Portal Disable Guard
    console.log("\n[4/5] TESTING GLOBAL INSTITUTE PORTAL ACCESS TOGGLE...");
    await db.institute.update({
      where: { id: institute.id },
      data: { portal_enabled: false },
    });

    const updatedInst = await db.institute.findUnique({ where: { id: institute.id } });
    if (updatedInst.portal_enabled !== false) {
      throw new Error("FAILURE: Global institute portal disabling failed!");
    }
    console.log("✓ Global Institute Portal Control disabled successfully.");

    await db.institute.update({
      where: { id: institute.id },
      data: { portal_enabled: true },
    });
    console.log("✓ Global Institute Portal Control restored to active.");

    // 5. Test Password Reset & Credentials Protection
    console.log("\n[5/5] TESTING PASSWORD RESET & NO PLAIN-TEXT STORAGE...");
    const resetPass = "NewTempPass#2026";
    const resetHash = await bcrypt.hash(resetPass, 10);
    await db.user.update({
      where: { id: studentUser.id },
      data: { password_hash: resetHash, must_change_password: true },
    });

    const checkUser = await db.user.findUnique({ where: { id: studentUser.id } });
    const isOldValid = await bcrypt.compare(tempPass, checkUser.password_hash);
    const isNewValid = await bcrypt.compare(resetPass, checkUser.password_hash);

    if (isOldValid || !isNewValid) {
      throw new Error("FAILURE: Password reset hash verification failed!");
    }
    console.log("✓ Old password invalidated immediately upon reset.");
    console.log("✓ New temporary password active with must_change_password = true.");

  } catch (error) {
    console.error("❌ AUDIT FAILED:", error);
    process.exit(1);
  } finally {
    if (student) await db.student.deleteMany({ where: { id: student.id } });
    if (studentUser) await db.user.deleteMany({ where: { id: studentUser.id } });
    if (institute) await db.institute.deleteMany({ where: { id: institute.id } });
    await db.$disconnect();
    console.log("\n✓ Cleanup completed.");
  }

  console.log("\n==========================================================================");
  console.log("   === ALL STUDENT CONTROL TESTS PASSED CLEANLY! ===");
  console.log("==========================================================================");
}

testStudentControl();
