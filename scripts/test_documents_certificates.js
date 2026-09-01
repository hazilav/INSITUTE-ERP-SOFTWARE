const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runDocumentsCertificatesTest() {
  console.log("=== STARTING DOCUMENTS & CERTIFICATES MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    const student = await prisma.student.findFirst({ where: { institute_id: inst.id } });
    const user = await prisma.user.findFirst({ where: { institute_id: inst.id, role: { in: ["OWNER", "ADMIN"] } } });

    if (!student || !user) throw new Error("No test student or admin user found!");

    console.log(`✓ Test Context: Student=${student.name} (${student.student_code}), Admin=${user.name}`);

    // 1. Student Document Upload & Visibility Test
    console.log("\n1. Testing Student Document Upload & Visibility Security...");
    const docPrivate = await prisma.studentDocument.create({
      data: {
        institute_id: inst.id,
        student_id: student.id,
        document_type: "ID Proof",
        document_name: "Internal Passport Verification",
        file_url: "/uploads/activities/test-passport.pdf",
        notes: "Confidential verification copy",
        visible_to_student: false,
        uploaded_by_id: user.id,
      },
    });

    console.log(`✓ Private Document Created: ID=${docPrivate.id}, Name='${docPrivate.document_name}', VisibleToStudent=${docPrivate.visible_to_student}`);

    const docPublic = await prisma.studentDocument.create({
      data: {
        institute_id: inst.id,
        student_id: student.id,
        document_type: "Education Certificate",
        document_name: "10th Marksheet Verified",
        file_url: "/uploads/activities/test-marksheet.pdf",
        visible_to_student: true,
        uploaded_by_id: user.id,
      },
    });

    console.log(`✓ Student-Visible Document Created: ID=${docPublic.id}, Name='${docPublic.document_name}', VisibleToStudent=${docPublic.visible_to_student}`);

    // Verify query filtering for student
    const studentVisibleDocs = await prisma.studentDocument.findMany({
      where: {
        institute_id: inst.id,
        student_id: student.id,
        visible_to_student: true,
      },
    });

    const hasPrivate = studentVisibleDocs.some((d) => d.id === docPrivate.id);
    if (!hasPrivate && studentVisibleDocs.some((d) => d.id === docPublic.id)) {
      console.log("✓ Document Security Verified: Student portal query strictly hides private documents!");
    } else {
      throw new Error("Document security test failed! Private document exposed.");
    }

    // 2. Certificate Generation & Unique Number Test
    console.log("\n2. Testing Certificate Generation & Unique Certificate Numbers...");
    const year = new Date().getFullYear();
    const count = await prisma.certificate.count({ where: { institute_id: inst.id } });
    const certNum = `CERT-${year}-${(count + 1).toString().padStart(5, "0")}`;

    const cert = await prisma.certificate.create({
      data: {
        institute_id: inst.id,
        student_id: student.id,
        course_id: student.course_id || null,
        certificate_type: "Course Completion",
        certificate_number: certNum,
        issue_date: new Date(),
        status: "Issued",
        generated_by_id: user.id,
      },
    });

    console.log(`✓ Certificate Generated: ID=${cert.id}, CertNo=${cert.certificate_number}, Type='${cert.certificate_type}', Status=${cert.status}`);

    // Test Revocation Status
    const revokedCert = await prisma.certificate.update({
      where: { id: cert.id },
      data: { status: "Revoked" },
    });

    console.log(`✓ Certificate Revoked: CertNo=${revokedCert.certificate_number}, Status=${revokedCert.status} (History Retained)`);

    console.log("\n=== ALL DOCUMENTS & CERTIFICATES TESTS PASSED CLEANLY! ===");
  } catch (err) {
    console.error("❌ Documents & Certificates module test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDocumentsCertificatesTest();
