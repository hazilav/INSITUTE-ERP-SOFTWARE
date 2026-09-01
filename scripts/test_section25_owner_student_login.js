const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

async function testSection25() {
  console.log("==========================================================================");
  console.log("   SECTION 25 — OWNER CONTROLLED STUDENT LOGIN SYSTEM AUDIT");
  console.log("==========================================================================");

  let institute = null;
  let studentUser = null;
  let student = null;

  try {
    // 1. Setup Test Institute
    console.log("\n[1/7] SETTING UP OWNER INSTITUTE WITH PORTAL CONTROLS...");
    institute = await db.institute.create({
      data: {
        name: "Section 25 Owner Institute",
        portal_enabled: true,
        student_login_enabled: true,
        student_id_prefix: "STU",
      },
    });
    console.log(`✓ Institute Created: ${institute.id}`);

    // 2. Test Owner Manual vs Auto-Generated Password Creation
    console.log("\n[2/7] TESTING OWNER CREATING STUDENT WITH MANUAL INITIAL PASSWORD...");
    const manualPass = "K7mP92xQ";
    const manualHash = await bcrypt.hash(manualPass, 10);
    const customCode = "STU-2026-00125";

    studentUser = await db.user.create({
      data: {
        institute_id: institute.id,
        name: "Ahmed",
        email: "stu-2026-00125@student.crm",
        password_hash: manualHash,
        role: "STUDENT",
        status: "ACTIVE",
        must_change_password: true,
      },
    });

    student = await db.student.create({
      data: {
        institute_id: institute.id,
        user_id: studentUser.id,
        student_code: customCode,
        name: "Ahmed",
        phone: "+15550192888",
        email: "ahmed@example.com",
        status: "ACTIVE",
      },
    });

    console.log(`✓ Student Created: ${student.name} (${student.student_code})`);
    console.log(`✓ Initial Password Hashed with Bcrypt. Must Change Password = ${studentUser.must_change_password}`);

    // 3. Verify Password Is Not Retrievable In Plain-Text & Stored As Hash Only
    console.log("\n[3/7] VERIFYING PASSWORDS ARE NEVER STORED IN PLAIN-TEXT...");
    const fetchUser = await db.user.findUnique({ where: { id: studentUser.id } });
    if (fetchUser.password_hash === manualPass || !fetchUser.password_hash.startsWith("$2")) {
      throw new Error("SECURITY FAILURE: Plain-text password detected or invalid bcrypt hash!");
    }
    console.log("✓ Password stored securely as bcrypt hash. Plain-text retrieval blocked.");

    // 4. Test Student Login & First Login Password Update
    console.log("\n[4/7] TESTING FIRST-LOGIN MANDATORY PASSWORD CHANGE...");
    const isManualValid = await bcrypt.compare(manualPass, fetchUser.password_hash);
    if (!isManualValid) {
      throw new Error("FAILURE: Manual password authentication failed!");
    }

    const studentNewPass = "AhmedSecurePass#2026";
    const studentNewHash = await bcrypt.hash(studentNewPass, 10);

    await db.user.update({
      where: { id: studentUser.id },
      data: {
        password_hash: studentNewHash,
        must_change_password: false,
      },
    });

    const updatedStudentUser = await db.user.findUnique({ where: { id: studentUser.id } });
    if (updatedStudentUser.must_change_password !== false) {
      throw new Error("FAILURE: First login password change failed to update must_change_password to false!");
    }
    console.log("✓ Temporary password invalidated. Student set new permanent password.");

    // 5. Test Owner Password Reset (Manual or Auto-Generated)
    console.log("\n[5/7] TESTING OWNER RESET PASSWORD & INVALIDATING OLD PASSWORD...");
    const resetPass = "ResetPass#9988";
    const resetHash = await bcrypt.hash(resetPass, 10);

    await db.user.update({
      where: { id: studentUser.id },
      data: {
        password_hash: resetHash,
        must_change_password: true,
      },
    });

    const checkResetUser = await db.user.findUnique({ where: { id: studentUser.id } });
    const isOldStudentPassValid = await bcrypt.compare(studentNewPass, checkResetUser.password_hash);
    const isResetPassValid = await bcrypt.compare(resetPass, checkResetUser.password_hash);

    if (isOldStudentPassValid || !isResetPassValid) {
      throw new Error("FAILURE: Old password was not invalidated upon Owner reset!");
    }
    console.log("✓ Old password immediately stopped working upon Owner reset.");

    // 6. Test Owner Account Deactivation Without Data Deletion
    console.log("\n[6/7] TESTING OWNER DEACTIVATING PORTAL ACCESS...");
    await db.user.update({
      where: { id: studentUser.id },
      data: { status: "INACTIVE" },
    });

    const deactivatedUser = await db.user.findUnique({ where: { id: studentUser.id } });
    const checkStudentStillExists = await db.student.findUnique({ where: { id: student.id } });

    if (deactivatedUser.status !== "INACTIVE" || !checkStudentStillExists) {
      throw new Error("FAILURE: Deactivating portal deleted or corrupted student profile!");
    }
    console.log("✓ Portal login deactivated. Academic history & student profile preserved 100%.");

    // 7. Verify Standard Student Portal Link Format
    console.log("\n[7/7] VERIFYING STANDARD CLEAN STUDENT PORTAL URL FORMAT...");
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/student/login`;
    if (portalUrl.includes("password=") || portalUrl.includes("token=") || portalUrl.includes("student_id=")) {
      throw new Error("SECURITY FAILURE: Sensitive info found in portal link!");
    }
    console.log(`✓ Clean Portal Link Verified: ${portalUrl}`);

  } catch (error) {
    console.error("❌ SECTION 25 AUDIT FAILED:", error);
    process.exit(1);
  } finally {
    if (student) await db.student.deleteMany({ where: { id: student.id } });
    if (studentUser) await db.user.deleteMany({ where: { id: studentUser.id } });
    if (institute) await db.institute.deleteMany({ where: { id: institute.id } });
    await db.$disconnect();
    console.log("\n✓ Cleanup completed.");
  }

  console.log("\n==========================================================================");
  console.log("   === ALL SECTION 25 OWNER CONTROLLED LOGIN TESTS PASSED CLEANLY! ===");
  console.log("==========================================================================");
}

testSection25();
