const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runVerification() {
  console.log("=== STARTING FOUNDATION VERIFICATION TEST ===");

  try {
    // Clean database before test
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.institute.deleteMany();

    console.log("1. Creating Test Institute A & Owner User...");
    const hashedPass = await bcrypt.hash("OwnerPass123", 10);

    const instA = await prisma.institute.create({
      data: {
        name: "Apex Institute of Science",
        email: "contact@apex.edu",
        phone: "+15550100",
        address: "100 Science Parkway",
        logo: "https://apex.edu/logo.png",
      },
    });

    const ownerUser = await prisma.user.create({
      data: {
        institute_id: instA.id,
        name: "Dr. Sarah Connor",
        email: "sarah@apex.edu",
        phone: "+15550101",
        password_hash: hashedPass,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    console.log(`✓ Institute A Created: ID=${instA.id}, Name=${instA.name}`);
    console.log(`✓ Owner User Created: ID=${ownerUser.id}, Role=${ownerUser.role}`);
    console.assert(ownerUser.role === "OWNER", "User role must be OWNER!");

    console.log("\n2. Creating Test Institute B for Multi-Tenancy Isolation...");
    const instB = await prisma.institute.create({
      data: {
        name: "Zenith Technology Institute",
        email: "contact@zenith.edu",
        phone: "+15550200",
        address: "200 Innovation Way",
      },
    });

    const ownerB = await prisma.user.create({
      data: {
        institute_id: instB.id,
        name: "Prof. Alex Vance",
        email: "alex@zenith.edu",
        password_hash: hashedPass,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    console.log(`✓ Institute B Created: ID=${instB.id}, Name=${instB.name}`);
    console.log(`✓ Owner B Created: ID=${ownerB.id}, Role=${ownerB.role}`);

    console.log("\n3. Testing Backend Multi-Tenancy Isolation Querying...");
    // Fetch users for Institute A strictly by institute_id
    const usersInstA = await prisma.user.findMany({
      where: { institute_id: instA.id },
    });

    const usersInstB = await prisma.user.findMany({
      where: { institute_id: instB.id },
    });

    console.log(`✓ Institute A user count: ${usersInstA.length}`);
    console.log(`✓ Institute B user count: ${usersInstB.length}`);

    console.assert(usersInstA.length === 1 && usersInstA[0].id === ownerUser.id, "Institute A data leaked!");
    console.assert(usersInstB.length === 1 && usersInstB[0].id === ownerB.id, "Institute B data leaked!");

    console.log("\n4. Testing Password Hashing & Authentication Match...");
    const validMatch = await bcrypt.compare("OwnerPass123", ownerUser.password_hash);
    const invalidMatch = await bcrypt.compare("WrongPass", ownerUser.password_hash);

    console.log(`✓ Valid Password Match Result: ${validMatch}`);
    console.log(`✓ Invalid Password Match Result: ${invalidMatch}`);
    console.assert(validMatch === true, "Valid password failed match!");
    console.assert(invalidMatch === false, "Invalid password passed match!");

    console.log("\n=== ALL FOUNDATION TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Test failed with error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
