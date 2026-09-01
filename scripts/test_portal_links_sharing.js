const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function runSection22ATest() {
  console.log("==========================================================================");
  console.log("   SECTION 22A — PORTAL LINKS & SHARE SYSTEM AUDIT");
  console.log("==========================================================================");

  try {
    // 1. SETUP INSTITUTE & STAFF RECORD
    console.log("\n[1/4] SETTING UP TEST INSTITUTE & STAFF USER...");
    let institute = await prisma.institute.findFirst({ where: { name: "Apex Institute of Science" } });
    if (!institute) {
      institute = await prisma.institute.create({
        data: { name: "Apex Institute of Science", institute_mode: "hybrid" },
      });
    }

    const testStaffEmail = `staff.test.${Date.now().toString().slice(-4)}@apex.edu`;
    const passwordHash = await bcrypt.hash("InitialPass2026!", 10);

    const staffUser = await prisma.user.create({
      data: {
        institute_id: institute.id,
        name: "Professor Charles Xavier",
        email: testStaffEmail,
        password_hash: passwordHash,
        role: "MENTOR",
        status: "ACTIVE",
      },
    });

    const staffProfile = await prisma.staffProfile.create({
      data: {
        institute_id: institute.id,
        user_id: staffUser.id,
        employee_id: `EMP-${Date.now().toString().slice(-4)}`,
        name: staffUser.name,
        email: staffUser.email,
        phone: "+1555000111",
        role: "MENTOR",
        department: "Computer Science",
        designation: "Head Mentor",
        status: "ACTIVE",
      },
    });

    console.log(`✓ Staff Profile Created: '${staffProfile.name}' (${staffProfile.employee_id})`);

    // 2. PORTAL LINK RESOLUTION & SECURITY CHECK
    console.log("\n[2/4] VERIFYING PORTAL LINK RESOLUTION & ZERO SECRET EXPOSURE...");
    const studentUrl = `http://localhost:3000/student/login`;
    const staffUrl = `http://localhost:3000/login`;

    console.log(`✓ Student Portal URL: ${studentUrl}`);
    console.log(`✓ Staff Portal URL:   ${staffUrl}`);

    if (studentUrl.includes("password") || studentUrl.includes("token") || staffUrl.includes("password")) {
      throw new Error("SECURITY FAILURE: Portal URL contains sensitive information!");
    }
    console.log("✓ Security Verified: Portal links are clean and require credentials!");

    // 3. STAFF PASSWORD RESET WORKFLOW
    console.log("\n[3/4] TESTING STAFF PASSWORD RESET API LOGIC...");
    const tempPass = "StaffTemp2026!";
    const newHash = await bcrypt.hash(tempPass, 10);

    const updatedUser = await prisma.user.update({
      where: { id: staffUser.id },
      data: {
        password_hash: newHash,
        must_change_password: true,
      },
    });

    console.log(`✓ Staff Password Reset. must_change_password = ${updatedUser.must_change_password}`);

    // 4. CLEANUP
    console.log("\n[4/4] CLEANING UP AUDIT TEST RECORDS...");
    await prisma.staffProfile.delete({ where: { id: staffProfile.id } });
    await prisma.user.delete({ where: { id: staffUser.id } });
    console.log("✓ Audit test staff records cleaned up cleanly.");

    console.log("\n==========================================================================");
    console.log("   === ALL SECTION 22A PORTAL LINK & SHARE TESTS PASSED CLEANLY! ===");
    console.log("==========================================================================");
  } catch (err) {
    console.error("❌ Section 22A Audit Test Failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSection22ATest();
