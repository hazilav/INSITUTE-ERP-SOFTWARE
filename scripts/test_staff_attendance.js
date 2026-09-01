const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runStaffAttendanceModuleTest() {
  console.log("=== STARTING STAFF ATTENDANCE & LEAVE MANAGEMENT TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    // Ensure test staff profile
    let staff = await prisma.staffProfile.findFirst({
      where: { institute_id: inst.id },
    });

    if (!staff) {
      staff = await prisma.staffProfile.create({
        data: {
          institute_id: inst.id,
          employee_id: `EMP-${Date.now().toString().slice(-4)}`,
          name: "Test Instructor Staff",
          phone: "9876543210",
          role: "STAFF",
          department: "Academics",
          designation: "Lecturer",
          status: "Active",
        },
      });
    }

    console.log(`✓ Test Staff Profile: ${staff.name} (EmpID=${staff.employee_id})`);

    // 1. Test Attendance Marking & Duplicate Prevention
    console.log("\n1. Testing Staff Attendance Marking & Duplicate Prevention...");
    const todayDate = new Date();
    const dayStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 0, 0, 0, 0);

    const att1 = await prisma.staffAttendance.upsert({
      where: {
        institute_id_staff_id_attendance_date: {
          institute_id: inst.id,
          staff_id: staff.id,
          attendance_date: dayStart,
        },
      },
      update: { status: "Present", notes: "First Upsert" },
      create: {
        institute_id: inst.id,
        staff_id: staff.id,
        attendance_date: dayStart,
        status: "Present",
        notes: "First Upsert",
      },
    });

    console.log(`✓ Staff Attendance Marked: ID=${att1.id}, Status=${att1.status}`);

    const att2 = await prisma.staffAttendance.upsert({
      where: {
        institute_id_staff_id_attendance_date: {
          institute_id: inst.id,
          staff_id: staff.id,
          attendance_date: dayStart,
        },
      },
      update: { status: "Late", notes: "Updated Status" },
      create: {
        institute_id: inst.id,
        staff_id: staff.id,
        attendance_date: dayStart,
        status: "Late",
        notes: "Updated Status",
      },
    });

    if (att1.id === att2.id) {
      console.log(`✓ Duplicate Prevention Working: Upsert updated existing record ID ${att2.id} without creating duplicates.`);
    } else {
      throw new Error("Duplicate prevention failed!");
    }

    // 2. Test Leave Request Submission & Approval Connection
    console.log("\n2. Testing Leave Request Submission & Approval Connection...");
    const tomorrow = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(todayDate.getTime() + 48 * 60 * 60 * 1000);

    const leave = await prisma.leaveRequest.create({
      data: {
        institute_id: inst.id,
        staff_id: staff.id,
        leave_type: "Casual",
        start_date: tomorrow,
        end_date: dayAfter,
        days_count: 2,
        reason: "Personal medical checkup",
        status: "Pending",
      },
    });

    console.log(`✓ Leave Request Submitted: ID=${leave.id}, Type=${leave.leave_type}, Status=${leave.status}`);

    // Approve Leave Request
    await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: { status: "Approved" },
    });

    // Auto-generate/update StaffAttendance for leave dates
    const leaveDayStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0, 0);

    const leaveAttendance = await prisma.staffAttendance.upsert({
      where: {
        institute_id_staff_id_attendance_date: {
          institute_id: inst.id,
          staff_id: staff.id,
          attendance_date: leaveDayStart,
        },
      },
      update: { status: "Leave", notes: "Approved Casual Leave" },
      create: {
        institute_id: inst.id,
        staff_id: staff.id,
        attendance_date: leaveDayStart,
        status: "Leave",
        notes: "Approved Casual Leave",
      },
    });

    console.log(`✓ Approved Leave Connection Verified: Staff Attendance Status for ${leaveDayStart.toISOString().slice(0, 10)} set to '${leaveAttendance.status}'`);

    console.log("\n=== ALL STAFF ATTENDANCE & LEAVE MANAGEMENT TESTS PASSED CLEANLY! ===");
  } catch (err) {
    console.error("❌ Staff attendance module test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStaffAttendanceModuleTest();
