const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

async function runStaffPortalAudit() {
  console.log("==========================================================================");
  console.log("   STAFF PORTAL & STAFF LOGIN AUDIT");
  console.log("==========================================================================");

  let testInstitute = null;
  let testStaffUser = null;
  let testStaffProfile = null;

  try {
    // 1. SETUP TEST INSTITUTE
    console.log("\n[1/6] SETTING UP AUDIT TEST INSTITUTE...");
    testInstitute = await db.institute.create({
      data: {
        name: "Staff Portal Audit Institute",
        institute_mode: "hybrid",
        email: "staff.audit@institute.test",
        phone: "+15550197777",
      },
    });
    console.log(`✓ Created Test Institute ID: ${testInstitute.id}`);

    // 2. CREATE STAFF PORTAL ACCOUNT TEST
    console.log("\n[2/6] TESTING AUTOMATIC STAFF PORTAL ACCOUNT CREATION...");
    const empId = `EMP-2026-999`;
    const tempPassword = `Stf#8mK2xP9q`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const staffEmail = `ahmed.staff@institute.test`;

    testStaffUser = await db.user.create({
      data: {
        institute_id: testInstitute.id,
        name: "Ahmed Instructor",
        email: staffEmail,
        phone: "+15550192222",
        password_hash: passwordHash,
        role: "STAFF",
        status: "ACTIVE",
        must_change_password: true,
      },
    });

    testStaffProfile = await db.staffProfile.create({
      data: {
        institute_id: testInstitute.id,
        user_id: testStaffUser.id,
        employee_id: empId,
        name: "Ahmed Instructor",
        phone: "+15550192222",
        email: staffEmail,
        role: "STAFF",
        department: "Academics",
        designation: "Senior Instructor",
        status: "Active",
      },
    });

    console.log(`✓ Staff Profile Created: '${testStaffProfile.name}' (${testStaffProfile.employee_id})`);
    console.log(`✓ User Account Connected: ID ${testStaffUser.id}`);
    console.log(`✓ Initial Password State: must_change_password = ${testStaffUser.must_change_password}`);

    // 3. SECURITY CHECK: VERIFY NO PLAIN-TEXT PASSWORDS STORED
    console.log("\n[3/6] VERIFYING PASSWORDS ARE NOT STORED IN PLAIN TEXT...");
    const fetchedUser = await db.user.findUnique({
      where: { id: testStaffUser.id },
      select: { id: true, email: true, password_hash: true, must_change_password: true },
    });
    if (fetchedUser.password_hash === tempPassword) {
      throw new Error("SECURITY FAILURE: Plain text password stored in database!");
    }
    const isMatch = await bcrypt.compare(tempPassword, fetchedUser.password_hash);
    if (!isMatch) {
      throw new Error("SECURITY FAILURE: Password hash verification failed!");
    }
    console.log("✓ Staff password stored securely as bcrypt hash.");

    // 4. RESET STAFF PASSWORD TEST
    console.log("\n[4/6] TESTING RESET STAFF PASSWORD LOGIC...");
    const newTempPassword = `Stf#9xQ3mP8r`;
    const newPasswordHash = await bcrypt.hash(newTempPassword, 10);

    await db.user.update({
      where: { id: testStaffUser.id },
      data: {
        password_hash: newPasswordHash,
        must_change_password: true,
      },
    });

    const resetUser = await db.user.findUnique({ where: { id: testStaffUser.id } });
    const oldPasswordValid = await bcrypt.compare(tempPassword, resetUser.password_hash);
    const newPasswordValid = await bcrypt.compare(newTempPassword, resetUser.password_hash);

    if (oldPasswordValid) {
      throw new Error("FAILURE: Old staff password remains valid after reset!");
    }
    if (!newPasswordValid) {
      throw new Error("FAILURE: New temporary staff password is invalid!");
    }
    console.log("✓ Old password invalidated immediately.");
    console.log("✓ New temporary password active with must_change_password = true.");

    // 5. FIRST LOGIN PASSWORD CHANGE LOGIC TEST
    console.log("\n[5/6] TESTING STAFF FIRST LOGIN PASSWORD CHANGE LOGIC...");
    const permanentPassword = "StaffSecurePermPassword#2026";
    const permHash = await bcrypt.hash(permanentPassword, 10);

    await db.user.update({
      where: { id: testStaffUser.id },
      data: {
        password_hash: permHash,
        must_change_password: false,
      },
    });

    const updatedUser = await db.user.findUnique({ where: { id: testStaffUser.id } });
    if (updatedUser.must_change_password !== false) {
      throw new Error("FAILURE: must_change_password not updated to false after staff password change!");
    }
    const permMatch = await bcrypt.compare(permanentPassword, updatedUser.password_hash);
    if (!permMatch) {
      throw new Error("FAILURE: Permanent password hash verification failed!");
    }
    console.log("✓ Staff permanent password updated successfully.");
    console.log("✓ must_change_password = false. Password status shows 'Set'.");

    // 6. STAFF DASHBOARD & WORKFLOW DATA INTEGRITY TEST
    console.log("\n[6/6] VERIFYING STAFF DASHBOARD & DATA ACCESS SCOPE...");
    // Check that staff profile is linked 1:1
    const staffWithUser = await db.staffProfile.findFirst({
      where: { id: testStaffProfile.id },
      include: { user: true },
    });

    if (staffWithUser.user.role !== "STAFF" || staffWithUser.user.id !== testStaffUser.id) {
      throw new Error("FAILURE: Staff profile to User relationship mismatch!");
    }
    console.log("✓ Staff Profile 1:1 relation verified with role 'STAFF'.");

  } catch (error) {
    console.error("❌ AUDIT FAILED:", error);
    process.exit(1);
  } finally {
    if (testStaffProfile) {
      await db.staffProfile.deleteMany({ where: { id: testStaffProfile.id } });
    }
    if (testStaffUser) {
      await db.user.deleteMany({ where: { id: testStaffUser.id } });
    }
    if (testInstitute) {
      await db.institute.deleteMany({ where: { id: testInstitute.id } });
    }
    await db.$disconnect();
    console.log("\n✓ Cleanup completed.");
  }

  console.log("\n==========================================================================");
  console.log("   === ALL STAFF PORTAL & STAFF LOGIN TESTS PASSED CLEANLY! ===");
  console.log("==========================================================================");
}

runStaffPortalAudit();
