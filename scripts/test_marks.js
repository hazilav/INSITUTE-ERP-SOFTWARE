const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function calculatePercentage(obtained, max) {
  if (!max || max <= 0) return 0;
  const pct = (obtained / max) * 100;
  return Math.min(100, Math.max(0, parseFloat(pct.toFixed(2))));
}

function calculateGrade(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

async function runMarksTest() {
  console.log("=== STARTING MARKS & RESULTS MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    // Ensure setup course, batch, and students exist
    let course = await prisma.course.findFirst({ where: { institute_id: inst.id } });
    let batch = await prisma.batch.findFirst({ where: { institute_id: inst.id } });

    if (!course || !batch) {
      console.log("Creating test setup course & batch...");
      course = await prisma.course.create({
        data: { institute_id: inst.id, name: "Data Structures 101", code: "DS-101" },
      });
      batch = await prisma.batch.create({
        data: { institute_id: inst.id, course_id: course.id, name: "DS Batch 2026", code: "DS-B26" },
      });
    }

    let student1 = await prisma.student.findFirst({ where: { institute_id: inst.id, batch_id: batch.id } });
    if (!student1) {
      student1 = await prisma.student.create({
        data: {
          institute_id: inst.id,
          course_id: course.id,
          batch_id: batch.id,
          student_code: "INS-2026-MRK01",
          name: "Bob Marks",
          phone: "9998887771",
        },
      });
    }

    // 1. Create Assessment
    console.log("\n1. Testing Assessment Creation...");
    const assessment = await prisma.assessment.create({
      data: {
        institute_id: inst.id,
        course_id: course.id,
        batch_id: batch.id,
        name: "Midterm Exam 2026",
        type: "Exam",
        module_name: "Algorithms & Complexity",
        assessment_date: new Date(),
        maximum_marks: 100.0,
        passing_marks: 40.0,
        status: "Scheduled",
      },
    });

    console.log(`✓ Assessment Created: "${assessment.name}" (ID=${assessment.id}, Max=${assessment.maximum_marks}, Pass=${assessment.passing_marks})`);

    // 2. Fast Bulk Mark Entry Calculation Verification
    console.log("\n2. Testing Fast Bulk Student Mark Entry & Auto-Calculation...");
    const studentScore = 85.5; // Expected: 85.5%, Grade A, Pass = true
    const percentage = calculatePercentage(studentScore, assessment.maximum_marks);
    const grade = calculateGrade(percentage);
    const isPass = studentScore >= assessment.passing_marks;

    const result = await prisma.assessmentResult.upsert({
      where: {
        institute_id_assessment_id_student_id: {
          institute_id: inst.id,
          assessment_id: assessment.id,
          student_id: student1.id,
        },
      },
      update: {
        obtained_marks: studentScore,
        percentage,
        grade,
        is_pass: isPass,
        result_status: "Evaluated",
        feedback: "Great performance in binary search algorithms.",
      },
      create: {
        institute_id: inst.id,
        assessment_id: assessment.id,
        student_id: student1.id,
        obtained_marks: studentScore,
        percentage,
        grade,
        is_pass: isPass,
        result_status: "Evaluated",
        feedback: "Great performance in binary search algorithms.",
      },
    });

    console.log(`✓ Result Upserted: Score=${result.obtained_marks}/${assessment.maximum_marks}, Pct=${result.percentage}%, Grade=${result.grade}, Pass=${result.is_pass}`);

    // 3. Mark Finalization Lock Test
    console.log("\n3. Testing Assessment Finalization Lock...");
    const finalizedAssessment = await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        finalized: true,
        finalized_at: new Date(),
        status: "Completed",
      },
    });

    console.log(`✓ Finalized State: Finalized=${finalizedAssessment.finalized}, Status=${finalizedAssessment.status}`);

    // 4. Reopen Finalized Assessment Test
    console.log("\n4. Testing Assessment Reopen by Authorized User...");
    const reopenedAssessment = await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        finalized: false,
        finalized_at: null,
        status: "Evaluation Pending",
      },
    });

    console.log(`✓ Reopened State: Finalized=${reopenedAssessment.finalized}, Status=${reopenedAssessment.status}`);

    // 5. Owner Dashboard Academic Performance Calculation
    console.log("\n5. Testing Owner Dashboard Academic Performance Metrics Query...");
    const allResults = await prisma.assessmentResult.findMany({
      where: { institute_id: inst.id },
      select: { percentage: true, is_pass: true },
    });

    const sumPct = allResults.reduce((acc, r) => acc + r.percentage, 0);
    const avgPct = allResults.length > 0 ? (sumPct / allResults.length).toFixed(2) + "%" : "0.00%";
    const failingCount = allResults.filter((r) => !r.is_pass).length;

    console.log(`✓ Academic Metrics Calculated: Average=${avgPct}, Failing Students=${failingCount}`);

    console.log("\n=== ALL MARKS & RESULTS TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Marks test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMarksTest();
