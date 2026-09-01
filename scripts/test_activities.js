const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runActivitiesTest() {
  console.log("=== STARTING ACTIVITIES & ASSIGNMENTS MODULE TEST ===");

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
        data: { institute_id: inst.id, name: "Activities 101", code: "ACT-101" },
      });
      batch = await prisma.batch.create({
        data: { institute_id: inst.id, course_id: course.id, name: "Activities Batch", code: "ACT-B" },
      });
    }

    let student = await prisma.student.findFirst({ where: { institute_id: inst.id, batch_id: batch.id } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          institute_id: inst.id,
          course_id: course.id,
          batch_id: batch.id,
          student_code: "INS-2026-ACT01",
          name: "Alice Activity",
          phone: "9998886661",
        },
      });
    }

    // 1. Create Published Activity
    console.log("\n1. Testing Activity Creation & Publishing...");
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    const activity = await prisma.activity.create({
      data: {
        institute_id: inst.id,
        course_id: course.id,
        batch_id: batch.id,
        title: "Database Normalization Assignment",
        description: "Normalize 3NF tables and provide ER diagram.",
        activity_type: "Assignment",
        submission_type: "hybrid",
        assigned_date: new Date(),
        due_date: dueDate,
        maximum_marks: 100.0,
        status: "Published",
      },
    });

    console.log(`✓ Activity Created & Published: "${activity.title}" (ID=${activity.id}, Due=${activity.due_date.toISOString()})`);

    // 2. Submit Online Activity Response
    console.log("\n2. Testing Online Activity Submission...");
    const submission = await prisma.activitySubmission.create({
      data: {
        institute_id: inst.id,
        activity_id: activity.id,
        student_id: student.id,
        submission_type: "online",
        submission_text: "Here is my ER diagram notes.",
        file_url: "/uploads/activities/test-er-diagram.pdf",
        file_name: "test-er-diagram.pdf",
        submitted_at: new Date(),
        status: "Submitted",
      },
    });

    console.log(`✓ Submission Created: ID=${submission.id}, Status=${submission.status}, File=${submission.file_name}`);

    // 3. Test Mentor Review Submission
    console.log("\n3. Testing Mentor Submission Review (Marks & Feedback)...");
    const reviewed = await prisma.activitySubmission.update({
      where: { id: submission.id },
      data: {
        obtained_marks: 92.5,
        feedback: "Excellent 3NF normalization work!",
        status: "Reviewed",
        reviewed_at: new Date(),
      },
    });

    console.log(`✓ Submission Reviewed: Grade=${reviewed.obtained_marks}/${activity.maximum_marks}, Feedback="${reviewed.feedback}"`);

    // 4. Test Late Submission Detection
    console.log("\n4. Testing Late Submission Detection...");
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 3);

    const overdueActivity = await prisma.activity.create({
      data: {
        institute_id: inst.id,
        course_id: course.id,
        batch_id: batch.id,
        title: "Past Due Homework",
        activity_type: "Homework",
        submission_type: "online",
        assigned_date: new Date(),
        due_date: pastDueDate,
        maximum_marks: 50.0,
        status: "Published",
      },
    });

    const now = new Date();
    const isLate = now > overdueActivity.due_date;
    console.log(`✓ Past due activity check: IsLate=${isLate} (Due=${overdueActivity.due_date.toISOString()})`);

    // 5. Test Owner Dashboard Pending Activities Query
    console.log("\n5. Testing Owner Dashboard Pending Activities Query...");
    const pendingCount = await prisma.activitySubmission.count({
      where: {
        institute_id: inst.id,
        status: { in: ["Submitted", "Late", "Under Review"] },
      },
    });

    console.log(`✓ Pending Submissions Awaiting Review Count: ${pendingCount}`);

    console.log("\n=== ALL ACTIVITIES & ASSIGNMENTS TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Activities test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runActivitiesTest();
