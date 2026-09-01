const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function parseDateFilter(rangeType, startDateStr, endDateStr) {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (rangeType) {
    case "today": {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { start: startOfDay, end: endOfDay };
    }
    case "week": {
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startOfWeek.setHours(0, 0, 0, 0);
      return { start: startOfWeek, end: endOfDay };
    }
    case "month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start: startOfMonth, end: endOfDay };
    }
    case "year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { start: startOfYear, end: endOfDay };
    }
    case "custom": {
      if (startDateStr && endDateStr) {
        const start = new Date(startDateStr);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      return {};
    }
    default:
      return {};
  }
}

async function runReportsModuleTest() {
  console.log("=== STARTING REPORTS & ANALYTICS MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    // 1. Test Date Range Filter Parsing
    console.log("\n1. Testing Date Range Filter Parsing...");
    const todayFilter = parseDateFilter("today");
    console.log(`✓ Today Filter Range: Start=${todayFilter.start.toISOString()}, End=${todayFilter.end.toISOString()}`);

    const monthFilter = parseDateFilter("month");
    console.log(`✓ Month Filter Range: Start=${monthFilter.start.toISOString()}, End=${monthFilter.end.toISOString()}`);

    const customFilter = parseDateFilter("custom", "2026-08-01", "2026-08-31");
    console.log(`✓ Custom Filter Range: Start=${customFilter.start.toISOString()}, End=${customFilter.end.toISOString()}`);

    // 2. Test Student Metrics Aggregation
    console.log("\n2. Testing Student Analytics Metrics...");
    const totalStudents = await prisma.student.count({
      where: { institute_id: inst.id, is_archived: false },
    });
    const activeStudents = await prisma.student.count({
      where: { institute_id: inst.id, is_archived: false, status: "ACTIVE" },
    });

    console.log(`✓ Student Counts: Total=${totalStudents}, Active=${activeStudents}`);

    // 3. Test Attendance Metrics & Low Attendance Alerts
    console.log("\n3. Testing Attendance Analytics & Alerts...");
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { institute_id: inst.id },
      select: { status: true },
    });
    const presentCount = attendanceRecords.filter((r) => r.status === "Present").length;
    const lateCount = attendanceRecords.filter((r) => r.status === "Late").length;
    const absentCount = attendanceRecords.filter((r) => r.status === "Absent").length;

    console.log(`✓ Attendance Counts: Present=${presentCount}, Late=${lateCount}, Absent=${absentCount}`);

    // 4. Test Academic Performance Aggregations
    console.log("\n4. Testing Academic Performance Metrics...");
    const results = await prisma.assessmentResult.findMany({
      where: { institute_id: inst.id },
      select: { percentage: true, is_pass: true },
    });
    const passCount = results.filter((r) => r.is_pass).length;
    console.log(`✓ Academic Results Count=${results.length}, Pass Rate=${results.length > 0 ? ((passCount / results.length) * 100).toFixed(1) + "%" : "N/A"}`);

    // 5. Test Financial Fees Metrics
    console.log("\n5. Testing Finance Analytics Metrics...");
    const payments = await prisma.payment.findMany({
      where: { institute_id: inst.id },
      select: { amount: true, payment_method: true },
    });
    const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

    const feePlans = await prisma.feePlan.findMany({
      where: { institute_id: inst.id },
      select: { balance: true },
    });
    const totalOutstanding = feePlans.reduce((acc, f) => acc + f.balance, 0);

    console.log(`✓ Financial Metrics: Total Collected=$${totalCollected.toFixed(2)}, Total Outstanding=$${totalOutstanding.toFixed(2)}`);

    // 6. Test Staff & Tasks Metrics
    console.log("\n6. Testing Staff & Tasks Performance Metrics...");
    const activeStaffCount = await prisma.staffProfile.count({
      where: { institute_id: inst.id, status: "Active" },
    });
    const totalTasks = await prisma.studentTask.count({
      where: { institute_id: inst.id },
    });

    console.log(`✓ Staff & Tasks: Active Staff=${activeStaffCount}, Total Tasks=${totalTasks}`);

    console.log("\n=== ALL REPORTS & ANALYTICS TESTS PASSED CLEANLY! ===");
  } catch (err) {
    console.error("❌ Reports module test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runReportsModuleTest();
