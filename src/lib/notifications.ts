import { db } from "@/lib/db";

export interface CreateNotificationParams {
  institute_id: String;
  recipient_user_id: String;
  type: "Academic" | "Attendance" | "Finance" | "Tasks" | "Account" | "System";
  category: String;
  title: String;
  message: String;
  priority?: "Normal" | "Important" | "Urgent";
  related_entity_type?: String;
  related_entity_id?: String;
  action_url?: String;
  event_key?: String;
  expires_at?: Date;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
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

    // 1. Duplicate Prevention via event_key
    if (event_key) {
      const existing = await db.notification.findFirst({
        where: {
          recipient_user_id: String(recipient_user_id),
          event_key: String(event_key),
        },
      });
      if (existing) {
        return existing; // Skip duplicate notification
      }
    }

    // 2. Preference Check (Account/Security notifications cannot be disabled)
    if (type !== "Account") {
      const pref = await db.notificationPreference.findUnique({
        where: {
          institute_id_user_id_category: {
            institute_id: String(institute_id),
            user_id: String(recipient_user_id),
            category: String(type),
          },
        },
      });

      if (pref && !pref.enabled) {
        return null; // Suppressed by user preference
      }
    }

    // 3. Create Notification Record
    const notification = await db.notification.create({
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
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

export async function seedDefaultMessageTemplates(instituteId: string) {
  try {
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
      const exists = await db.messageTemplate.findUnique({
        where: {
          institute_id_name: {
            institute_id: instituteId,
            name: t.name,
          },
        },
      });

      if (!exists) {
        await db.messageTemplate.create({
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
  } catch (error) {
    console.error("Error seeding default message templates:", error);
  }
}
