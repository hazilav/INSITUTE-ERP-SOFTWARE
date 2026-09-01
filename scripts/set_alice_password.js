const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function setAlicePassword() {
  const passHash = await bcrypt.hash("Student123!", 10);

  const alice = await prisma.student.findFirst({
    where: { student_code: "INS-2026-00001" },
    include: { user: true },
  });

  if (alice && alice.user_id) {
    await prisma.user.update({
      where: { id: alice.user_id },
      data: { password_hash: passHash, status: "ACTIVE" },
    });
    console.log("✓ Reset INS-2026-00001 (Alice Smith) password to Student123!");
  } else {
    console.log("Student INS-2026-00001 not found or has no user account.");
  }
}

setAlicePassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
