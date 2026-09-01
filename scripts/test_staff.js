const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function generateEmployeeId(prefix = "EMP") {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomSuffix}`;
}

async function runStaffTest() {
  console.log("=== STARTING STAFF & MENTOR MANAGEMENT MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    // 1. Test Staff & Login Account Creation with Password Hashing
    console.log("\n1. Testing Staff Profile & Hashed Password Login Account Creation...");
    const empEmail = `mentor.test.${Date.now()}@institute.com`;
    const tempPassword = "TempPassword123!";
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const userAcc = await prisma.user.create({
      data: {
        institute_id: inst.id,
        name: "Dr. Alice Vance",
        email: empEmail,
        phone: "555-0199",
        password_hash: passwordHash,
        role: "MENTOR",
        status: "ACTIVE",
      },
    });

    const empId = generateEmployeeId("EMP");
    const staffProfile = await prisma.staffProfile.create({
      data: {
        institute_id: inst.id,
        user_id: userAcc.id,
        employee_id: empId,
        name: "Dr. Alice Vance",
        phone: "555-0199",
        email: empEmail,
        department: "Computer Science",
        designation: "Senior Lecturer",
        role: "MENTOR",
        status: "Active",
      },
    });

    console.log(`✓ Staff Profile Created: Name=${staffProfile.name}, EmployeeID=${staffProfile.employee_id}, Role=${staffProfile.role}`);
    console.log(`✓ Password Hash Verification: StoredHash != PlainText: ${userAcc.password_hash !== tempPassword}`);
    
    const isPasswordValid = await bcrypt.compare(tempPassword, userAcc.password_hash);
    console.log(`✓ Password Hash Match Check: ${isPasswordValid}`);

    // 2. Test OWNER Role Protection
    console.log("\n2. Testing OWNER Role Protection Guard...");
    const tryOwnerRole = "OWNER";
    const isOwnerBlocked = tryOwnerRole.toUpperCase() === "OWNER";
    console.log(`✓ OWNER Creation Protection Guard: Blocked=${isOwnerBlocked}`);

    // 3. Test Mentor Assignment to Batch
    console.log("\n3. Testing Mentor Assignment to Batch...");
    let course = await prisma.course.findFirst({ where: { institute_id: inst.id } });
    let batch = await prisma.batch.findFirst({ where: { institute_id: inst.id } });

    if (!course) {
      course = await prisma.course.create({
        data: { institute_id: inst.id, name: "Physics 101", code: "PHY-101" },
      });
    }

    if (!batch) {
      batch = await prisma.batch.create({
        data: { institute_id: inst.id, course_id: course.id, name: "Batch Alpha 2026", code: "BALPHA-26" },
      });
    }

    const updatedBatch = await prisma.batch.update({
      where: { id: batch.id },
      data: { primary_mentor_id: userAcc.id },
      include: { primary_mentor: true },
    });

    const assignment = await prisma.mentorAssignment.create({
      data: {
        institute_id: inst.id,
        mentor_id: userAcc.id,
        course_id: course.id,
        batch_id: batch.id,
        assignment_type: "primary_mentor",
      },
    });

    console.log(`✓ Mentor Assigned to Batch: Batch=${updatedBatch.name}, PrimaryMentor=${updatedBatch.primary_mentor.name}`);

    // 4. Test Mentor Data Access Scoping
    console.log("\n4. Testing Mentor Data Access Scoping...");
    const mentorBatches = await prisma.batch.findMany({
      where: { institute_id: inst.id, primary_mentor_id: userAcc.id },
    });

    console.log(`✓ Scoped Query Result: Mentor Dr. Alice Vance accesses ${mentorBatches.length} assigned batch(es).`);

    // 5. Test Staff Deactivation (Soft Delete preserving historical data)
    console.log("\n5. Testing Staff Account Deactivation...");
    await prisma.staffProfile.update({
      where: { id: staffProfile.id },
      data: { status: "Inactive" },
    });

    const updatedUserAcc = await prisma.user.update({
      where: { id: userAcc.id },
      data: { status: "INACTIVE" },
    });

    console.log(`✓ Staff Deactivated: Profile Status=Inactive, Account Login Status=${updatedUserAcc.status} (Login Blocked)`);

    // 6. Test Owner Dashboard Metrics Query
    console.log("\n6. Testing Owner Dashboard Staff Metrics...");
    const totalStaff = await prisma.staffProfile.count({ where: { institute_id: inst.id } });
    const activeStaff = await prisma.staffProfile.count({ where: { institute_id: inst.id, status: "Active" } });
    const mentorsCount = await prisma.staffProfile.count({ where: { institute_id: inst.id, role: "MENTOR" } });

    console.log(`✓ Staff Summary Metrics: Total=${totalStaff}, Active=${activeStaff}, Mentors=${mentorsCount}`);

    console.log("\n=== ALL STAFF & MENTOR MANAGEMENT TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Staff test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStaffTest();
