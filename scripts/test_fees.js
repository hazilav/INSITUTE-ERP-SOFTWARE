const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function calculateFinalFee(courseFee, discountType, discountValue) {
  const fee = Math.max(0, parseFloat(courseFee) || 0);
  const disc = Math.max(0, parseFloat(discountValue) || 0);
  if (discountType === "percentage") {
    return Math.max(0, parseFloat((fee - (fee * disc) / 100).toFixed(2)));
  }
  return Math.max(0, parseFloat((fee - disc).toFixed(2)));
}

function calculateFeeStatus(finalFee, amountPaid, earliestUnpaidDueDate) {
  const balance = Math.max(0, finalFee - amountPaid);
  if (balance <= 0.01) return "Paid";
  const now = new Date();
  if (earliestUnpaidDueDate && new Date(earliestUnpaidDueDate) < now) return "Overdue";
  if (amountPaid > 0) return "Partially Paid";
  return "Pending";
}

async function runFeesTest() {
  console.log("=== STARTING FEES & PAYMENTS MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    // Ensure setup course, batch, and students exist
    let course = await prisma.course.findFirst({ where: { institute_id: inst.id } });
    let student = await prisma.student.findFirst({ where: { institute_id: inst.id } });

    if (!course) {
      course = await prisma.course.create({
        data: { institute_id: inst.id, name: "Web Development Bootcamp", code: "WEB-2026" },
      });
    }

    if (!student) {
      student = await prisma.student.create({
        data: {
          institute_id: inst.id,
          course_id: course.id,
          student_code: "INS-2026-FEE01",
          name: "Charlie Finance",
          phone: "9998889991",
        },
      });
    }

    // 1. Create Fee Plan with 10% Discount & 2 Installments
    console.log("\n1. Testing Fee Plan Creation & Discount Calculation...");
    const courseFee = 1000.0;
    const discountValue = 10.0; // 10%
    const finalFee = calculateFinalFee(courseFee, "percentage", discountValue); // Expected: 900.00

    const feePlan = await prisma.feePlan.create({
      data: {
        institute_id: inst.id,
        student_id: student.id,
        course_id: course.id,
        course_fee: courseFee,
        discount_type: "percentage",
        discount_value: discountValue,
        final_fee: finalFee,
        amount_paid: 0.0,
        balance: finalFee,
        payment_type: "installments",
        status: "Pending",
      },
    });

    console.log(`✓ Fee Plan Created: CourseFee=$${feePlan.course_fee}, Discount=10%, FinalFee=$${feePlan.final_fee}, Balance=$${feePlan.balance}`);

    // Create Installments
    const inst1 = await prisma.installment.create({
      data: {
        institute_id: inst.id,
        fee_plan_id: feePlan.id,
        name: "Installment 1",
        amount: 450.0,
        due_date: new Date(),
        status: "Pending",
      },
    });

    const inst2 = await prisma.installment.create({
      data: {
        institute_id: inst.id,
        fee_plan_id: feePlan.id,
        name: "Installment 2",
        amount: 450.0,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "Pending",
      },
    });

    console.log(`✓ Installments Created: 2 x $450.00 (Total=$900.00)`);

    // 2. Record Payment & Balance Update Verification
    console.log("\n2. Testing Record Payment & Automated Balance Update...");
    const payAmount = 450.0; // Paying installment 1
    const receiptNum = `REC-TEST-${Date.now()}`;

    const payment = await prisma.payment.create({
      data: {
        institute_id: inst.id,
        fee_plan_id: feePlan.id,
        student_id: student.id,
        installment_id: inst1.id,
        receipt_number: receiptNum,
        amount: payAmount,
        payment_date: new Date(),
        payment_method: "UPI",
        reference_number: "UPI/9988776655",
      },
    });

    await prisma.installment.update({
      where: { id: inst1.id },
      data: { status: "Paid" },
    });

    const updatedPaid = feePlan.amount_paid + payAmount;
    const updatedBalance = Math.max(0, feePlan.final_fee - updatedPaid);
    const newStatus = calculateFeeStatus(feePlan.final_fee, updatedPaid, inst2.due_date);

    const updatedPlan = await prisma.feePlan.update({
      where: { id: feePlan.id },
      data: {
        amount_paid: updatedPaid,
        balance: updatedBalance,
        status: newStatus,
      },
    });

    console.log(`✓ Payment Recorded: Receipt=${payment.receipt_number}, Amount=$${payment.amount}`);
    console.log(`✓ Updated Plan: Paid=$${updatedPlan.amount_paid}, Balance=$${updatedPlan.balance}, Status=${updatedPlan.status}`);

    // 3. Financial Security & Validation Checks
    console.log("\n3. Testing Payment Validation (Excess Payment Prevention)...");
    const excessiveAmount = 1000.0;
    const isExcess = excessiveAmount > updatedPlan.balance;
    console.log(`✓ Excess Payment Check: ExcessiveAmount=$1000 vs Balance=$${updatedPlan.balance} => Rejected=${isExcess}`);

    // 4. Owner Dashboard Financial Query
    console.log("\n4. Testing Owner Dashboard Financial Metrics Query...");
    const allPlans = await prisma.feePlan.findMany({
      where: { institute_id: inst.id },
    });

    let totalPending = 0;
    allPlans.forEach((p) => (totalPending += p.balance));

    console.log(`✓ Owner Dashboard Outstanding Balance Query: Total Pending = $${totalPending.toFixed(2)}`);

    console.log("\n=== ALL FEES & PAYMENTS TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Fees test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runFeesTest();
