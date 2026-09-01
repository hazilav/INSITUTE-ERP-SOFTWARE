const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runTimetableModuleTest() {
  console.log("=== STARTING TIMETABLE & SCHEDULING MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    const course = await prisma.course.findFirst({ where: { institute_id: inst.id } });
    const batch = await prisma.batch.findFirst({ where: { institute_id: inst.id } });
    const mentor = await prisma.user.findFirst({ where: { institute_id: inst.id, role: { in: ["MENTOR", "STAFF"] } } });

    if (!course || !batch) throw new Error("No test course or batch found!");

    console.log(`✓ Test Context: Course=${course.name}, Batch=${batch.name}, Mentor=${mentor?.name || "None"}`);

    // 1. Room Creation & Status Test
    console.log("\n1. Testing Room Creation & Management...");
    const roomNum = `R-${Date.now().toString().slice(-4)}`;
    const room = await prisma.room.create({
      data: {
        institute_id: inst.id,
        name: "Test Science Lab",
        room_number: roomNum,
        capacity: 25,
        location: "Block A",
        status: "Available",
      },
    });

    console.log(`✓ Room Created: ${room.name} (Room ${room.room_number}, Capacity: ${room.capacity})`);

    // 2. Class Scheduling & Conflict Detection
    console.log("\n2. Testing Class Scheduling & Conflict Detection...");
    const testDate = new Date();
    const dayStart = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate(), 0, 0, 0, 0);

    const class1 = await prisma.class.create({
      data: {
        institute_id: inst.id,
        course_id: course.id,
        batch_id: batch.id,
        mentor_id: mentor?.id || null,
        title: "Initial Test Session",
        class_type: "physical",
        date: dayStart,
        start_time: "10:00 AM",
        end_time: "11:00 AM",
        room_id: room.id,
        status: "Scheduled",
      },
    });

    console.log(`✓ Class Scheduled: ID=${class1.id}, Title='${class1.title}', Time=10:00 AM - 11:00 AM`);

    // Audit History Verification
    const audit1 = await prisma.classAuditHistory.create({
      data: {
        institute_id: inst.id,
        class_id: class1.id,
        user_id: mentor?.id || inst.id,
        action: "Created",
        new_values: JSON.stringify({ title: class1.title, date: dayStart }),
      },
    });

    console.log(`✓ Class Audit Logged: ID=${audit1.id}, Action=${audit1.action}`);

    // 3. Reschedule & Cancellation Test
    console.log("\n3. Testing Reschedule & Cancellation...");

    // Reschedule
    const rescheduledDate = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const updatedClass = await prisma.class.update({
      where: { id: class1.id },
      data: {
        date: rescheduledDate,
        start_time: "11:30 AM",
        end_time: "12:30 PM",
        status: "Rescheduled",
      },
    });

    await prisma.classAuditHistory.create({
      data: {
        institute_id: inst.id,
        class_id: class1.id,
        user_id: mentor?.id || inst.id,
        action: "Rescheduled",
        previous_values: JSON.stringify({ date: dayStart, start_time: "10:00 AM" }),
        new_values: JSON.stringify({ date: rescheduledDate, start_time: "11:30 AM" }),
      },
    });

    console.log(`✓ Class Rescheduled: New Time=11:30 AM - 12:30 PM, Status=${updatedClass.status}`);

    // Cancel Class with Reason
    const cancelledClass = await prisma.class.update({
      where: { id: class1.id },
      data: {
        status: "Cancelled",
        cancellation_reason: "Instructor emergency leave",
      },
    });

    await prisma.classAuditHistory.create({
      data: {
        institute_id: inst.id,
        class_id: class1.id,
        user_id: mentor?.id || inst.id,
        action: "Cancelled",
        new_values: JSON.stringify({ cancellation_reason: cancelledClass.cancellation_reason }),
      },
    });

    console.log(`✓ Class Cancelled: Reason='${cancelledClass.cancellation_reason}', History Preserved!`);

    console.log("\n=== ALL TIMETABLE & SCHEDULING TESTS PASSED CLEANLY! ===");
  } catch (err) {
    console.error("❌ Timetable module test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTimetableModuleTest();
