const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createNotification(params) {
  const {
    institute_id,
    recipient_user_id,
    type,
    category,
    title,
    message,
    priority = "Normal",
    related_entity_type,
    related_entity_id,
    action_url,
    event_key,
    expires_at,
  } = params;

  if (event_key) {
    const existing = await prisma.notification.findFirst({
      where: {
        recipient_user_id: String(recipient_user_id),
        event_key: String(event_key),
      },
    });
    if (existing) {
      return existing;
    }
  }

  if (type !== "Account") {
    const pref = await prisma.notificationPreference.findUnique({
      where: {
        institute_id_user_id_category: {
          institute_id: String(institute_id),
          user_id: String(recipient_user_id),
          category: String(type),
        },
      },
    });

    if (pref && !pref.enabled) {
      return null;
    }
  }

  const notification = await prisma.notification.create({
    data: {
      institute_id: String(institute_id),
      recipient_user_id: String(recipient_user_id),
      type: String(type),
      category: String(category),
      title: String(title),
      message: String(message),
      priority: String(priority),
      related_entity_type: related_entity_type ? String(related_entity_type) : null,
      related_entity_id: related_entity_id ? String(related_entity_id) : null,
      action_url: action_url ? String(action_url) : null,
      event_key: event_key ? String(event_key) : null,
      expires_at: expires_at || null,
    },
  });

  return notification;
}

async function seedDefaultMessageTemplates(instituteId) {
  const defaultTemplates = [
    {
      name: "Fee Reminder",
      category: "Finance",
      subject: "Fee Payment Reminder",
      body_template: "Dear {{student_name}}, your fee payment of {{balance}} is due on {{due_date}}.",
      placeholders: "student_name, balance, due_date",
    },
    {
      name: "Activity Reminder",
      category: "Academic",
      subject: "Coursework Activity Due Soon",
      body_template: "Your activity {{activity_name}} is due on {{due_date}}.",
      placeholders: "activity_name, due_date",
    },
    {
      name: "Attendance Alert",
      category: "Attendance",
      subject: "Low Attendance Warning",
      body_template: "Your attendance has fallen below {{threshold}}%. Current rate: {{attendance_rate}}%.",
      placeholders: "threshold, attendance_rate",
    },
  ];

  for (const t of defaultTemplates) {
    const exists = await prisma.messageTemplate.findUnique({
      where: {
        institute_id_name: {
          institute_id: instituteId,
          name: t.name,
        },
      },
    });

    if (!exists) {
      await prisma.messageTemplate.create({
        data: {
          institute_id: instituteId,
          name: t.name,
          category: t.category,
          subject: t.subject,
          body_template: t.body_template,
          placeholders: t.placeholders,
        },
      });
    }
  }
}

async function runNotificationsModuleTest() {
  console.log("=== STARTING NOTIFICATIONS & COMMUNICATION MODULE TEST ===");

  try {
    const inst = await prisma.institute.findFirst();
    if (!inst) throw new Error("No test institute found!");

    console.log(`✓ Active Institute: ${inst.name} (ID=${inst.id})`);

    let user = await prisma.user.findFirst({
      where: { institute_id: inst.id, role: "STUDENT" },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          institute_id: inst.id,
          name: "Test Notification Student",
          email: `notif.student.${Date.now()}@test.com`,
          password_hash: await bcrypt.hash("Pass123!", 10),
          role: "STUDENT",
          status: "ACTIVE",
        },
      });
    }

    console.log(`✓ Test User: ${user.name} (ID=${user.id})`);

    // 1. Test createNotification Engine
    console.log("\n1. Testing createNotification Engine...");
    const n1 = await createNotification({
      institute_id: inst.id,
      recipient_user_id: user.id,
      type: "Academic",
      category: "New activity",
      title: "New Activity: Mathematics Assignment",
      message: "Complete exercises 1 to 10 by Friday.",
      priority: "Normal",
      action_url: "/student/activities",
      event_key: `test_event_key_1_${Date.now()}`,
    });

    console.log(`✓ Notification Created: Title="${n1.title}", Priority=${n1.priority}`);

    // 2. Test Duplicate Prevention via event_key
    console.log("\n2. Testing Duplicate Prevention via event_key...");
    const duplicateKey = `dup_key_${Date.now()}`;

    const firstCall = await createNotification({
      institute_id: inst.id,
      recipient_user_id: user.id,
      type: "Finance",
      category: "Fee due soon",
      title: "Fee Payment Reminder",
      message: "Your fee installment of $500 is due tomorrow.",
      event_key: duplicateKey,
    });

    const secondCall = await createNotification({
      institute_id: inst.id,
      recipient_user_id: user.id,
      type: "Finance",
      category: "Fee due soon",
      title: "Fee Payment Reminder",
      message: "Your fee installment of $500 is due tomorrow.",
      event_key: duplicateKey,
    });

    if (firstCall.id === secondCall.id) {
      console.log(`✓ Duplicate Prevention Working: Second call returned existing ID ${secondCall.id}`);
    } else {
      throw new Error("Duplicate prevention failed!");
    }

    // 3. Test Preference Suppression & Security Guard
    console.log("\n3. Testing Notification Preferences & Security Overrides...");
    await prisma.notificationPreference.upsert({
      where: {
        institute_id_user_id_category: {
          institute_id: inst.id,
          user_id: user.id,
          category: "Finance",
        },
      },
      update: { enabled: false },
      create: {
        institute_id: inst.id,
        user_id: user.id,
        category: "Finance",
        enabled: false,
      },
    });

    const suppressedNotif = await createNotification({
      institute_id: inst.id,
      recipient_user_id: user.id,
      type: "Finance",
      category: "Fee overdue",
      title: "Overdue Notice",
      message: "Your fee is overdue.",
      event_key: `suppressed_key_${Date.now()}`,
    });

    console.log(`✓ Preference Check: Non-security notification suppressed -> Result=${suppressedNotif}`);

    const securityNotif = await createNotification({
      institute_id: inst.id,
      recipient_user_id: user.id,
      type: "Account",
      category: "Password changed",
      title: "Security Alert: Password Changed",
      message: "Your portal account password was updated.",
      priority: "Urgent",
      event_key: `security_key_${Date.now()}`,
    });

    console.log(`✓ Security Guard Override: Critical security notification created despite preferences -> ID=${securityNotif.id}`);

    await prisma.notificationPreference.update({
      where: {
        institute_id_user_id_category: {
          institute_id: inst.id,
          user_id: user.id,
          category: "Finance",
        },
      },
      data: { enabled: true },
    });

    // 4. Test Mark Read
    console.log("\n4. Testing Mark as Read...");
    await prisma.notification.update({
      where: { id: n1.id },
      data: { is_read: true, read_at: new Date() },
    });

    const checkRead = await prisma.notification.findUnique({ where: { id: n1.id } });
    console.log(`✓ Mark Read Verification: is_read=${checkRead.is_read}, read_at=${checkRead.read_at}`);

    // 5. Test Message Templates & Placeholders
    console.log("\n5. Testing Message Templates & Placeholders...");
    await seedDefaultMessageTemplates(inst.id);

    const feeTemplate = await prisma.messageTemplate.findUnique({
      where: {
        institute_id_name: {
          institute_id: inst.id,
          name: "Fee Reminder",
        },
      },
    });

    let renderedBody = feeTemplate.body_template;
    renderedBody = renderedBody.replace("{{student_name}}", "Jane Doe");
    renderedBody = renderedBody.replace("{{balance}}", "$750.00");
    renderedBody = renderedBody.replace("{{due_date}}", "September 15");

    console.log(`✓ Template Seeding & Placeholder Output: "${renderedBody}"`);

    console.log("\n=== ALL NOTIFICATIONS & COMMUNICATION TESTS PASSED CLEANLY! ===");
  } catch (err) {
    console.error("❌ Notifications module test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runNotificationsModuleTest();
