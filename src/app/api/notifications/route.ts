import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all, unread, important
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const whereCondition: any = {
      institute_id: institute.id,
      recipient_user_id: user.id,
    };

    if (filter === "unread") {
      whereCondition.is_read = false;
    } else if (filter === "important") {
      whereCondition.priority = { in: ["Important", "Urgent"] };
    }

    const notifications = await db.notification.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      take: limit,
    });

    const unreadCount = await db.notification.count({
      where: {
        institute_id: institute.id,
        recipient_user_id: user.id,
        is_read: false,
      },
    });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("GET Notifications API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;
    const body = await request.json();
    const { notification_id, mark_all } = body;

    if (mark_all) {
      await db.notification.updateMany({
        where: {
          institute_id: institute.id,
          recipient_user_id: user.id,
          is_read: false,
        },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });

      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (!notification_id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    // Verify ownership
    const notification = await db.notification.findFirst({
      where: {
        id: notification_id,
        institute_id: institute.id,
        recipient_user_id: user.id,
      },
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification not found or access denied" }, { status: 404 });
    }

    const updated = await db.notification.update({
      where: { id: notification.id },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    console.error("PATCH Notifications API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notification" },
      { status: 500 }
    );
  }
}
