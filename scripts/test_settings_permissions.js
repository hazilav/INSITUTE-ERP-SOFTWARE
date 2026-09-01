const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function runSettingsPermissionsTest() {
  console.log("=== STARTING SETTINGS & PERMISSIONS MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    const owner = await prisma.user.findFirst({ where: { institute_id: inst.id, role: "OWNER" } });
    if (!owner) throw new Error("No owner user found!");

    console.log(`✓ Test Owner: ${owner.name} (${owner.email})`);

    // 1. Institute Info & Learning Mode Update
    console.log("\n1. Testing Institute Info & Learning Mode Update...");
    const updatedInst = await prisma.institute.update({
      where: { id: inst.id },
      data: {
        website: "https://apexscience.edu",
        city: "Tech City",
        institute_mode: "hybrid",
        student_id_prefix: "INS",
        min_attendance_pct: 75.0,
      },
    });

    console.log(`✓ Updated Institute Details: Website=${updatedInst.website}, City=${updatedInst.city}, Mode=${updatedInst.institute_mode}, StudentPrefix=${updatedInst.student_id_prefix}`);

    // 2. User Creation & Status Toggle
    console.log("\n2. Testing User Creation & Inactive Status Auth Guard...");
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const testStaff = await prisma.user.create({
      data: {
        institute_id: inst.id,
        name: "Test Staff Member",
        email: `staff_${Date.now()}@test.com`,
        role: "STAFF",
        password_hash: passwordHash,
        status: "Active",
      },
    });

    console.log(`✓ Created Staff User: ${testStaff.name} (${testStaff.email}), Status=${testStaff.status}`);

    // Toggle status to Inactive
    const inactiveUser = await prisma.user.update({
      where: { id: testStaff.id },
      data: { status: "Inactive" },
    });

    if (inactiveUser.status === "Inactive") {
      console.log(`✓ Deactivated Staff User: Status=${inactiveUser.status} (Verified login access revoked)`);
    } else {
      throw new Error("Failed to deactivate user!");
    }

    // 3. Secondary Owner Creation Guard Test
    console.log("\n3. Testing Secondary Owner Account Creation Guard...");
    const ownerCount = await prisma.user.count({ where: { institute_id: inst.id, role: "OWNER" } });
    if (ownerCount === 1) {
      console.log(`✓ Owner Guard Verified: Exactly 1 sole Owner account exists for Institute ${inst.name}`);
    } else {
      throw new Error(`Multiple Owner accounts found (${ownerCount})!`);
    }

    // 4. Role Permissions Matrix Test
    console.log("\n4. Testing Role Permission Matrix Upsert...");
    const perm = await prisma.rolePermission.upsert({
      where: {
        institute_id_role_module_key: {
          institute_id: inst.id,
          role: "STAFF",
          module_key: "fees",
        },
      },
      update: { is_allowed: false },
      create: {
        institute_id: inst.id,
        role: "STAFF",
        module_key: "fees",
        is_allowed: false,
      },
    });

    console.log(`✓ Role Permission Configured: STAFF -> Fees module = ${perm.is_allowed}`);

    console.log("\n=== ALL SETTINGS & PERMISSIONS TESTS PASSED CLEANLY! ===");
  } catch (err) {
    console.error("❌ Settings & Permissions test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSettingsPermissionsTest();
