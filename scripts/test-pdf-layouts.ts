import {
  generateInvoiceHtml,
  generateReceiptHtml,
  PrintableInvoiceData,
  PrintableReceiptData,
} from "../src/lib/pdf-print";

console.log("==========================================");
console.log("RUNNING PDF & A4 DOCUMENT LAYOUT TESTS");
console.log("==========================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName} - ${detail || "Assertion failed"}`);
    failed++;
  }
}

// TEST 1: Simple invoice
const test1: PrintableInvoiceData = {
  invoice_number: "INV-2026-0001",
  invoice_date: "2026-09-09T00:00:00.000Z",
  due_date: "2026-09-20T00:00:00.000Z",
  description: "Course Tuition Fee",
  amount: 50000,
  discount: 0,
  tax: 0,
  final_amount: 50000,
  paid_amount: 0,
  outstanding_amount: 50000,
  status: "Unpaid",
  student: {
    student_code: "ST101",
    name: "Aarav Sharma",
  },
  course: { name: "Full Stack Web Development" },
  institute: {
    name: "Apex Academy of Technology",
    address: "MG Road, Bengaluru, Karnataka",
    phone: "+91 98765 43210",
    email: "info@apexacademy.edu",
  },
};

const html1 = generateInvoiceHtml(test1);
assert(html1.includes("INV-2026-0001"), "TEST 1: Simple invoice contains invoice number");
assert(html1.includes("₹50,000"), "TEST 1: Simple invoice contains ₹50,000");
assert(html1.includes("UNPAID"), "TEST 1: Simple invoice status is UNPAID");
assert(!html1.includes("undefined") && !html1.includes("NaN"), "TEST 1: No undefined or NaN");

// TEST 2: Partial-payment invoice
const test2: PrintableInvoiceData = {
  invoice_number: "INV-2026-0002",
  invoice_date: "2026-09-01T00:00:00.000Z",
  due_date: "2026-09-15T00:00:00.000Z",
  description: "Data Science & AI Certification",
  amount: 60000,
  discount: 5000,
  tax: 0,
  final_amount: 55000,
  paid_amount: 25000,
  outstanding_amount: 30000,
  status: "Partially Paid",
  student: {
    student_code: "ST102",
    name: "Priya Patel",
    phone: "+91 91234 56789",
  },
  course: { name: "Data Science" },
  payments: [
    {
      receipt_number: "REC-2026-0001",
      amount: 25000,
      payment_date: "2026-09-02T00:00:00.000Z",
      payment_method: "UPI",
    },
  ],
  institute: {
    name: "Apex Academy of Technology",
    address: "MG Road, Bengaluru",
  },
};

const html2 = generateInvoiceHtml(test2);
assert(html2.includes("PARTIALLY PAID"), "TEST 2: Partial-payment invoice status is PARTIALLY PAID");
assert(html2.includes("₹25,000"), "TEST 2: Paid amount is ₹25,000");
assert(html2.includes("₹30,000"), "TEST 2: Outstanding amount is ₹30,000");
assert(html2.includes("REC-2026-0001"), "TEST 2: Contains applied payment log");

// TEST 3: Fully-paid invoice
const test3: PrintableInvoiceData = {
  invoice_number: "INV-2026-0003",
  invoice_date: "2026-08-15T00:00:00.000Z",
  due_date: "2026-08-30T00:00:00.000Z",
  description: "Digital Marketing Masterclass",
  amount: 40000,
  discount: 0,
  tax: 0,
  final_amount: 40000,
  paid_amount: 40000,
  outstanding_amount: 0,
  status: "Paid",
  student: {
    student_code: "ST103",
    name: "Rohan Verma",
  },
  course: { name: "Digital Marketing" },
  institute: { name: "Apex Academy" },
};

const html3 = generateInvoiceHtml(test3);
assert(html3.includes("PAID IN FULL"), "TEST 3: Fully-paid invoice shows PAID IN FULL");
assert(html3.includes("₹40,000"), "TEST 3: Contains ₹40,000");

// TEST 4: Receipt
const test4: PrintableReceiptData = {
  receipt_number: "REC-2026-0004",
  amount: 20000,
  payment_date: "2026-09-09T00:00:00.000Z",
  payment_method: "Bank Transfer",
  reference_number: "HDFC987654321",
  student: {
    student_code: "ST104",
    name: "Ananya Iyer",
  },
  course_name: "UI/UX Design Course",
  invoice_number: "INV-2026-0004",
  invoice_total: 50000,
  previously_paid: 10000,
  this_payment: 20000,
  remaining_balance: 20000,
  institute_name: "Apex Academy",
  institute_phone: "+91 98765 43210",
};

const html4 = generateReceiptHtml(test4);
assert(html4.includes("REC-2026-0004"), "TEST 4: Receipt contains receipt number");
assert(html4.includes("AMOUNT RECEIVED"), "TEST 4: Receipt contains AMOUNT RECEIVED banner");
assert(html4.includes("₹20,000"), "TEST 4: Contains ₹20,000 received");
assert(html4.includes("HDFC987654321"), "TEST 4: Contains bank reference number");
assert(html4.includes("PARTIALLY PAID"), "TEST 4: Receipt shows PARTIALLY PAID");

// TEST 4B: Fully-paid receipt
const test4b: PrintableReceiptData = {
  receipt_number: "REC-2026-0005",
  amount: 20000,
  payment_date: "2026-09-09T00:00:00.000Z",
  payment_method: "UPI",
  student: {
    student_code: "ST104",
    name: "Ananya Iyer",
  },
  course_name: "UI/UX Design Course",
  invoice_total: 50000,
  previously_paid: 30000,
  this_payment: 20000,
  remaining_balance: 0,
  institute_name: "Apex Academy",
};

const html4b = generateReceiptHtml(test4b);
assert(html4b.includes("PAID IN FULL"), "TEST 4B: Fully-paid receipt shows PAID IN FULL");
assert(html4b.includes("Balance Remaining (Fully Cleared)"), "TEST 4B: Shows cleared balance");

// TEST 5: Long student / course name
const test5: PrintableInvoiceData = {
  invoice_number: "INV-2026-0005",
  invoice_date: "2026-09-09T00:00:00.000Z",
  due_date: "2026-09-25T00:00:00.000Z",
  description: "Executive Master of Technology in Advanced Artificial Intelligence and Robotics Engineering Specialization",
  amount: 150000,
  discount: 10000,
  tax: 25200,
  final_amount: 165200,
  paid_amount: 65200,
  outstanding_amount: 100000,
  status: "Partially Paid",
  student: {
    student_code: "ST-ENG-2026-009988",
    name: "Dr. Venkata Ramanathan Subramaniam Ananthakrishnan",
    phone: "+91 98400 12345",
    email: "venkata.subramaniam.longname@example-university.edu.in",
    address: "Flat 402, Tower B, Sri Ramana Prestige Enclave, Outer Ring Road, Mahadevapura, Bengaluru - 560048",
  },
  course: { name: "Executive M.Tech in Artificial Intelligence & Robotics" },
  institute: {
    name: "International Institute of Advanced Cognitive Computing and Information Technology",
    address: "Knowledge Corridor, Cyber City Phase 2, Electronic City, Bengaluru - 560100",
    phone: "+91 80 2345 6789",
    email: "admissions-desk@iiaccit-international.ac.in",
    website: "https://www.iiaccit-international.ac.in",
  },
};

const html5 = generateInvoiceHtml(test5);
assert(html5.includes("Dr. Venkata Ramanathan Subramaniam Ananthakrishnan"), "TEST 5: Renders long student name safely");
assert(html5.includes("Executive M.Tech in Artificial Intelligence"), "TEST 5: Renders long course name safely");
assert(html5.includes("₹1,65,200"), "TEST 5: Indian currency formatting handles 6-digit sums: ₹1,65,200");

// TEST 6: Invoice with discount
const test6: PrintableInvoiceData = {
  invoice_number: "INV-2026-0006",
  invoice_date: "2026-09-09T00:00:00.000Z",
  due_date: "2026-09-20T00:00:00.000Z",
  description: "Web Development Bootcamp",
  amount: 45000,
  discount: 5000,
  tax: 0,
  final_amount: 40000,
  paid_amount: 0,
  outstanding_amount: 40000,
  status: "Unpaid",
  student: { student_code: "ST106", name: "Suresh Rao" },
  course: { name: "Web Development" },
  institute: { name: "Code Academy" },
};

const html6 = generateInvoiceHtml(test6);
assert(html6.includes("Discount / Scholarship Applied"), "TEST 6: Contains discount row");
assert(html6.includes("- ₹5,000"), "TEST 6: Shows - ₹5,000 discount");

// TEST 7: Invoice with institute logo
const test7: PrintableInvoiceData = {
  invoice_number: "INV-2026-0007",
  invoice_date: "2026-09-09T00:00:00.000Z",
  due_date: "2026-09-20T00:00:00.000Z",
  description: "Tuition Fee",
  amount: 25000,
  discount: 0,
  tax: 0,
  final_amount: 25000,
  paid_amount: 25000,
  outstanding_amount: 0,
  status: "Paid",
  student: { student_code: "ST107", name: "Deepak Kumar" },
  institute: {
    name: "Design School",
    logo: "https://example.com/logo.png",
  },
};

const html7 = generateInvoiceHtml(test7);
assert(html7.includes('src="https://example.com/logo.png"'), "TEST 7: Renders logo image tag");
assert(html7.includes('class="inst-logo"'), "TEST 7: Applies constrained logo styling");

// TEST 8: Invoice without logo
const test8: PrintableInvoiceData = {
  invoice_number: "INV-2026-0008",
  invoice_date: "2026-09-09T00:00:00.000Z",
  due_date: "2026-09-20T00:00:00.000Z",
  description: "Tuition Fee",
  amount: 30000,
  discount: 0,
  tax: 0,
  final_amount: 30000,
  paid_amount: 0,
  outstanding_amount: 30000,
  status: "Unpaid",
  student: { student_code: "ST108", name: "Meera Nair" },
  institute: {
    name: "Art Institute",
    logo: null,
  },
};

const html8 = generateInvoiceHtml(test8);
assert(!html8.includes("<img"), "TEST 8: Does not render broken img tag when logo is null");
assert(html8.includes("Art Institute"), "TEST 8: Renders clean text header for Art Institute");

console.log("\n==========================================");
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("==========================================");

if (failed > 0) {
  process.exit(1);
}
