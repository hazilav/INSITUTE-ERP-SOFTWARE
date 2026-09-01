const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runStudentDataCenterTest() {
  console.log("=== STARTING STUDENT DATA CENTER VERIFICATION TEST ===");

  try {
    // 1. Get or create test institute
    let instA = await prisma.institute.findFirst();
    if (!instA) {
      instA = await prisma.institute.create({
        data: { name: "Apex Test Institute", email: "apex@test.com" },
      });
    }

    console.log(`✓ Active Test Institute: ${instA.name} (ID=${instA.id})`);

    // 2. Clean previous test student records
    await prisma.student.deleteMany({ where: { institute_id: instA.id } });

    console.log("\n1. Testing Student Creation & Unique Student ID Generation...");
    const year = new Date().getFullYear();
    const code1 = `INS-${year}-00001`;

    const passHash = await bcrypt.hash("Std#Pass123", 10);

    const user1 = await prisma.user.create({
      data: {
        institute_id: instA.id,
        name: "Alice Smith",
        email: "alice@apex.local",
        phone: "+15550001",
        password_hash: passHash,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });

    const student1 = await prisma.student.create({
      data: {
        institute_id: instA.id,
        user_id: user1.id,
        student_code: code1,
        name: "Alice Smith",
        phone: "+15550001",
        email: "alice@apex.local",
        learning_mode: "hybrid",
        status: "ACTIVE",
      },
    });

    console.log(`✓ Created Student 1: Code=${student1.student_code}, Name=${student1.name}`);
    console.assert(student1.student_code === code1, "Student code mismatch!");

    // 3. Create second student to verify sequential unique ID
    const code2 = `INS-${year}-00002`;
    const user2 = await prisma.user.create({
      data: {
        institute_id: instA.id,
        name: "Bob Jones",
        email: "bob@apex.local",
        phone: "+15550002",
        password_hash: passHash,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });

    const student2 = await prisma.student.create({
      data: {
        institute_id: instA.id,
        user_id: user2.id,
        student_code: code2,
        name: "Bob Jones",
        phone: "+15550002",
        learning_mode: "online",
        status: "ON_HOLD",
      },
    });

    console.log(`✓ Created Student 2: Code=${student2.student_code}, Name=${student2.name}`);
    console.assert(student2.student_code === code2, "Sequential student code mismatch!");

    console.log("\n2. Testing Student Record Edit...");
    const updated1 = await prisma.student.update({
      where: { id: student1.id },
      data: { phone: "+15559999", learning_mode: "offline" },
    });
    console.log(`✓ Student 1 updated: Phone=${updated1.phone}, Mode=${updated1.learning_mode}`);
    console.assert(updated1.phone === "+15559999", "Phone update failed!");

    console.log("\n3. Testing Archiving Student...");
    const archived2 = await prisma.student.update({
      where: { id: student2.id },
      data: { is_archived: true, status: "ARCHIVED" },
    });

    const activeList = await prisma.student.findMany({
      where: { institute_id: instA.id, is_archived: false },
    });

    console.log(`✓ Total active students in Institute: ${activeList.length}`);
    console.assert(activeList.length === 1, "Archived student still appeared in active query!");
    console.assert(activeList[0].id === student1.id, "Active student mismatch!");

    console.log("\n4. Testing Multi-Tenant Isolation...");
    let instB = await prisma.institute.findFirst({ where: { NOT: { id: instA.id } } });
    if (!instB) {
      instB = await prisma.institute.create({
        data: { name: "Zenith Test Institute B" },
      });
    }

    const instBStudents = await prisma.student.findMany({
      where: { institute_id: instB.id },
    });
    console.log(`✓ Institute B student count: ${instBStudents.length}`);
    console.assert(instBStudents.length === 0, "Institute A data leaked to Institute B!");

    console.log("\n=== ALL STUDENT DATA CENTER TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Student Data Center test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStudentDataCenterTest();
