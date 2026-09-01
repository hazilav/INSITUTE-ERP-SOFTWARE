const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const db = new PrismaClient();

async function testRegistration() {
  console.log("=== TESTING REGISTRATION FUNCTIONALITY ===");
  try {
    const instituteName = "Test Institute " + Date.now();
    const cleanEmail = `testowner_${Date.now()}@example.com`;
    const password = "password123";
    const name = "Test Owner";
    const phone = "1234567890";
    const institutePhone = "0987654321";
    const address = "123 Test Street";

    console.log(`Attempting registration with email: ${cleanEmail}`);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Atomically create Institute and Owner User
    const result = await db.$transaction(async (tx) => {
      const institute = await tx.institute.create({
        data: {
          name: instituteName.trim(),
          logo: null,
          phone: institutePhone?.trim() || null,
          email: cleanEmail,
          address: address?.trim() || null,
        },
      });

      const user = await tx.user.create({
        data: {
          institute_id: institute.id,
          name: name.trim(),
          email: cleanEmail,
          phone: phone?.trim() || null,
          password_hash: hashedPassword,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      return { institute, user };
    });

    console.log("✓ Transaction Succeeded!");
    console.log("Created Institute ID:", result.institute.id);
    console.log("Created User ID:", result.user.id);

    // Session creation
    const token = crypto.randomUUID() + "-" + Date.now();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await db.session.create({
      data: {
        user_id: result.user.id,
        token: token,
        expires_at: expiresAt,
      },
    });

    console.log("✓ Session Created ID:", session.id);
    console.log("=== REGISTRATION TEST PASSED ===");

  } catch (error) {
    console.error("❌ REGISTRATION TEST FAILED WITH ERROR:", error);
  } finally {
    await db.$disconnect();
  }
}

testRegistration();
