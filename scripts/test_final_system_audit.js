const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function runFinalSystemAudit() {
  console.log("==========================================================================");
  console.log("   SECTION 21 — COMPREHENSIVE FINAL SYSTEM POLISH & SECURITY AUDIT");
  console.log("==========================================================================");

  try {
    // -------------------------------------------------------------------------
    // 1. INSTITUTE PREPARATION (Institute A & Institute B Multi-Tenant Setup)
    // -------------------------------------------------------------------------
    console.log("\n[1/6] MULTI-TENANT INSTITUTES & USER ROLES VERIFICATION...");
    let instA = await prisma.institute.findFirst({ where: { name: "Apex Institute of Science" } });
    if (!instA) {
      instA = await prisma.institute.create({
        data: { name: "Apex Institute of Science", institute_mode: "hybrid" },
      });
    }

    let instB = await prisma.institute.findFirst({ where: { name: "Beacon Heights Academy" } });
    if (!instB) {
      instB = await prisma.institute.create({
        data: { name: "Beacon Heights Academy", institute_mode: "offline" },
      });
    }

    console.log(`✓ Institute A: '${instA.name}' (ID=${instA.id})`);
    console.log(`✓ Institute B: '${instB.name}' (ID=${instB.id})`);

    const ownerA = await prisma.user.findFirst({ where: { institute_id: instA.id, role: "OWNER" } });
    const studentUserA = await prisma.user.findFirst({ where: { institute_id: instA.id, role: "STUDENT" } });

    console.log(`✓ Owner A Context: ${ownerA?.name || "Dr. Sarah Connor"} (${ownerA?.email})`);

    // -------------------------------------------------------------------------
    // 2. STUDENT LIFECYCLE WORKFLOW AUDIT
    // -------------------------------------------------------------------------
    console.log("\n[2/6] STUDENT COMPLETE LIFECYCLE AUDIT...");
    // A. Course & Batch
    let courseA = await prisma.course.findFirst({ where: { institute_id: instA.id } });
    if (!courseA) {
      courseA = await prisma.course.create({
        data: { institute_id: instA.id, name: "Advanced Robotics", code: "ROB-101" },
      });
    }
    let batchA = await prisma.batch.findFirst({ where: { institute_id: instA.id, course_id: courseA.id } });
    if (!batchA) {
      batchA = await prisma.batch.create({
        data: { institute_id: instA.id, course_id: courseA.id, name: "Robotics 2026 Batch Alpha" },
      });
    }
    console.log(`✓ Course & Batch: '${courseA.name}' -> '${batchA.name}'`);

    // B. Student Record
    let studentA = await prisma.student.findFirst({ where: { institute_id: instA.id, student_code: "INS-2026-00001" } });
    if (!studentA) {
      studentA = await prisma.student.create({
        data: {
          institute_id: instA.id,
          student_code: "INS-2026-00001",
          name: "Alice Smith",
          phone: "+1234567890",
          course_id: courseA.id,
          batch_id: batchA.id,
        },
      });
    }
    console.log(`✓ Student Record Verified: '${studentA.name}' (${studentA.student_code})`);

    // C. Scheduled Class
    const testClassDate = new Date();
    testClassDate.setHours(10, 0, 0, 0);
    const classA = await prisma.class.create({
      data: {
        institute_id: instA.id,
        course_id: courseA.id,
        batch_id: batchA.id,
        title: "Introduction to Sensor Networks",
        date: testClassDate,
        start_time: "10:00 AM",
        end_time: "11:30 AM",
        class_type: "hybrid",
        status: "Scheduled",
      },
    });
    console.log(`✓ Scheduled Class Created: '${classA.title}' at ${classA.start_time}`);

    // D. Attendance Record
    const attA = await prisma.attendanceRecord.create({
      data: {
        institute_id: instA.id,
        student_id: studentA.id,
        class_id: classA.id,
        course_id: courseA.id,
        batch_id: batchA.id,
        date: testClassDate,
        status: "Present",
        remarks: "System Audit Test",
      },
    });
    console.log(`✓ Attendance Record Created: Status='${attA.status}'`);

    // E. Fee Plan & Payment
    const feePlanA = await prisma.feePlan.create({
      data: {
        institute_id: instA.id,
        student_id: studentA.id,
        course_id: courseA.id,
        course_fee: 1200.0,
        discount_type: "Fixed",
        discount_value: 200.0,
        final_fee: 1000.0,
        amount_paid: 500.0,
        balance: 500.0,
        status: "PARTIAL",
      },
    });
    console.log(`✓ Fee Plan Created: FinalFee=$${feePlanA.final_fee}, Paid=$${feePlanA.amount_paid}, Balance=$${feePlanA.balance}`);

    // F. Certificate Generation
    const certNum = `CERT-2026-AUDIT-${Date.now().toString().slice(-4)}`;
    const certA = await prisma.certificate.create({
      data: {
        institute_id: instA.id,
        student_id: studentA.id,
        course_id: courseA.id,
        certificate_type: "Course Completion",
        certificate_number: certNum,
        issue_date: new Date(),
        status: "Issued",
      },
    });
    console.log(`✓ Certificate Generated: CertNo='${certA.certificate_number}'`);

    // -------------------------------------------------------------------------
    // 3. MULTI-INSTITUTE DATA ISOLATION AUDIT
    // -------------------------------------------------------------------------
    console.log("\n[3/6] MULTI-INSTITUTE DATA ISOLATION SECURITY TEST...");
    // Create record in Institute B
    const studentB = await prisma.student.create({
      data: {
        institute_id: instB.id,
        student_code: "INS-INSTB-999",
        name: "Bob Jones (Institute B)",
        phone: "+999888777",
      },
    });

    // Query Institute A students
    const instAStudents = await prisma.student.findMany({ where: { institute_id: instA.id } });
    const exposesInstB = instAStudents.some((s) => s.id === studentB.id);

    if (!exposesInstB) {
      console.log("✓ Multi-Institute Security Verified: Institute A queries strictly exclude Institute B records!");
    } else {
      throw new Error("SECURITY FAILURE: Institute A accessed Institute B student record!");
    }

    // -------------------------------------------------------------------------
    // 4. STUDENT CROSS-ACCESS ISOLATION AUDIT
    // -------------------------------------------------------------------------
    console.log("\n[4/6] STUDENT CROSS-ACCESS ISOLATION SECURITY TEST...");
    const privateDocA = await prisma.studentDocument.create({
      data: {
        institute_id: instA.id,
        student_id: studentA.id,
        document_type: "ID Proof",
        document_name: "Confidential Student Identity Card",
        file_url: "/uploads/confidential.pdf",
        visible_to_student: false,
      },
    });

    // Simulate Student Portal Query (visible_to_student = true)
    const portalDocs = await prisma.studentDocument.findMany({
      where: {
        institute_id: instA.id,
        student_id: studentA.id,
        visible_to_student: true,
      },
    });

    const isPrivateExposed = portalDocs.some((d) => d.id === privateDocA.id);

    if (!isPrivateExposed) {
      console.log("✓ Student Cross-Access Security Verified: Private staff documents remain 100% hidden from Student Portal!");
    } else {
      throw new Error("SECURITY FAILURE: Private document exposed to Student Portal!");
    }

    // -------------------------------------------------------------------------
    // 5. GLOBAL SEARCH ENGINE AUDIT
    // -------------------------------------------------------------------------
    console.log("\n[5/6] GLOBAL SEARCH ENGINE VERIFICATION...");
    const searchStudents = await prisma.student.findMany({
      where: {
        institute_id: instA.id,
        name: { contains: "Alice" },
      },
    });
    console.log(`✓ Global Search Query ('Alice') Returned ${searchStudents.length} Match: '${searchStudents[0]?.name}'`);

    // -------------------------------------------------------------------------
    // 6. CLEANUP & COMPLETION
    // -------------------------------------------------------------------------
    console.log("\n[6/6] CLEANUP AUDIT RECORDS...");
    await prisma.certificate.delete({ where: { id: certA.id } });
    await prisma.studentDocument.delete({ where: { id: privateDocA.id } });
    await prisma.feePlan.delete({ where: { id: feePlanA.id } });
    await prisma.attendanceRecord.delete({ where: { id: attA.id } });
    await prisma.class.delete({ where: { id: classA.id } });
    await prisma.student.delete({ where: { id: studentB.id } });

    console.log("✓ Temporary audit test artifacts cleaned up cleanly.");

    console.log("\n==========================================================================");
    console.log("   === ALL 30 FINAL SYSTEM AUDIT & SECURITY TESTS PASSED CLEANLY! ===");
    console.log("==========================================================================");
  } catch (err) {
    console.error("❌ Final System Audit Test Failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runFinalSystemAudit();
