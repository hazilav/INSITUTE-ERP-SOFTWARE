const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runClassesContentTest() {
  console.log("=== STARTING CLASSES & LEARNING CONTENT MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id}, Mode=${inst.institute_mode})`);

    // Fetch test course and batch
    let course = await prisma.course.findFirst({ where: { institute_id: inst.id } });
    let batch = await prisma.batch.findFirst({ where: { institute_id: inst.id } });

    if (!course || !batch) {
      console.log("Creating setup course & batch for classes test...");
      course = await prisma.course.create({
        data: {
          institute_id: inst.id,
          name: "Physics 101",
          code: "PHYS-101",
          learning_mode: "hybrid",
        },
      });
      batch = await prisma.batch.create({
        data: {
          institute_id: inst.id,
          course_id: course.id,
          name: "Batch Alpha",
          code: "ALPHA",
          learning_mode: "hybrid",
        },
      });
    }

    // 1. Create Physical Class
    console.log("\n1. Testing Physical Class Creation...");
    const physicalClass = await prisma.class.create({
      data: {
        institute_id: inst.id,
        course_id: course.id,
        batch_id: batch.id,
        title: "Classical Mechanics Intro",
        topic: "Kinematics",
        class_type: "physical",
        date: new Date(),
        start_time: "09:00 AM",
        end_time: "10:30 AM",
        room: "Room 302",
        status: "Scheduled",
      },
    });

    console.log(`✓ Physical Class Created: "${physicalClass.title}" (Room=${physicalClass.room}, ID=${physicalClass.id})`);

    // 2. Create Live Online Class
    console.log("\n2. Testing Live Online Class Creation...");
    const liveClass = await prisma.class.create({
      data: {
        institute_id: inst.id,
        course_id: course.id,
        batch_id: batch.id,
        title: "Quantum Physics Live Q&A",
        topic: "Wave Duality",
        class_type: "live_online",
        date: new Date(),
        start_time: "02:00 PM",
        end_time: "03:30 PM",
        meeting_link: "https://meet.google.com/test-live-link",
        status: "Live",
      },
    });

    console.log(`✓ Live Online Class Created: "${liveClass.title}" (MeetingLink=${liveClass.meeting_link}, ID=${liveClass.id})`);

    // 3. Create Recorded Content
    console.log("\n3. Testing Recorded Content Repository...");
    const recordedItem = await prisma.recordedContent.create({
      data: {
        institute_id: inst.id,
        course_id: course.id,
        module_name: "Module 1",
        title: "Vectors & Matrices Video Lecture",
        video_url: "https://youtube.com/embed/test-video-123",
        duration: "45 mins",
        publish_status: "Published",
      },
    });

    console.log(`✓ Recorded Content Created: "${recordedItem.title}" (VideoURL=${recordedItem.video_url})`);

    // 4. Test Owner Dashboard Today's Classes Query
    console.log("\n4. Testing Owner Dashboard Today's Classes Query...");
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todaysClasses = await prisma.class.findMany({
      where: {
        institute_id: inst.id,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    console.log(`✓ Owner Dashboard Today's Classes Count: ${todaysClasses.length}`);
    console.assert(todaysClasses.length >= 2, "Expected at least 2 today's classes!");

    // 5. Test Student Batch Upcoming Classes Query
    console.log("\n5. Testing Student Assigned Batch Upcoming Classes Query...");
    const upcomingForBatch = await prisma.class.findMany({
      where: {
        institute_id: inst.id,
        batch_id: batch.id,
        date: { gte: todayStart },
      },
    });

    console.log(`✓ Student Assigned Batch Upcoming Classes Count: ${upcomingForBatch.length}`);
    console.assert(upcomingForBatch.length >= 2, "Expected at least 2 upcoming classes for batch!");

    console.log("\n=== ALL CLASSES & LEARNING CONTENT TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Classes & Content test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runClassesContentTest();
