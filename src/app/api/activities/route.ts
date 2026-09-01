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
    const search = searchParams.get("search")?.trim() || "";
    const courseFilter = searchParams.get("course_id") || "ALL";
    const batchFilter = searchParams.get("batch_id") || "ALL";
    const typeFilter = searchParams.get("activity_type") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";

    const whereCondition: any = {
      institute_id: institute.id,
    };

    // If user is STUDENT, show only Published activities belonging to student's batch
    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student || !student.batch_id) {
        return NextResponse.json({
          success: true,
          activities: [],
          metrics: { total: 0, active: 0, pendingReview: 0, completed: 0, overdue: 0 },
        });
      }
      whereCondition.batch_id = student.batch_id;
      whereCondition.status = "Published";
    } else {
      if (courseFilter !== "ALL") whereCondition.course_id = courseFilter;
      if (batchFilter !== "ALL") whereCondition.batch_id = batchFilter;
      if (statusFilter !== "ALL") whereCondition.status = statusFilter;
    }

    if (typeFilter !== "ALL") whereCondition.activity_type = typeFilter;

    if (search) {
      whereCondition.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { module_name: { contains: search } },
      ];
    }

    const activities = await db.activity.findMany({
      where: whereCondition,
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, code: true } },
        mentor: { select: { id: true, name: true } },
        submissions: {
          select: {
            id: true,
            status: true,
            submitted_at: true,
            obtained_marks: true,
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: [{ due_date: "asc" }, { created_at: "desc" }],
    });

    // Compute Metrics for Institute
    const allInstituteActivities = await db.activity.findMany({
      where: { institute_id: institute.id },
      include: {
        submissions: { select: { status: true } },
      },
    });

    const now = new Date();
    const totalCount = allInstituteActivities.length;
    const activeCount = allInstituteActivities.filter((a) => a.status === "Published").length;
    const completedCount = allInstituteActivities.filter((a) => a.status === "Closed").length;
    const overdueCount = allInstituteActivities.filter(
      (a) => a.status === "Published" && new Date(a.due_date) < now
    ).length;

    let pendingReviewCount = 0;
    allInstituteActivities.forEach((a) => {
      a.submissions.forEach((s) => {
        if (["Submitted", "Late", "Under Review"].includes(s.status)) {
          pendingReviewCount++;
        }
      });
    });

    const activeCourses = await db.course.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    const activeBatches = await db.batch.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      activities: activities.map((a) => {
        const pendingCount = a.submissions.filter((s) =>
          ["Submitted", "Late", "Under Review"].includes(s.status)
        ).length;
        const isOverdue = a.status === "Published" && new Date(a.due_date) < now;

        return {
          ...a,
          submission_count: a._count.submissions,
          pending_review_count: pendingCount,
          is_overdue: isOverdue,
        };
      }),
      metrics: {
        total: totalCount,
        active: activeCount,
        pendingReview: pendingReviewCount,
        completed: completedCount,
        overdue: overdueCount,
      },
      activeCourses,
      activeBatches,
      instituteMode: institute.institute_mode || "hybrid",
    });
  } catch (error) {
    console.error("GET Activities API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      course_id,
      batch_id,
      module_name,
      mentor_id,
      activity_type,
      submission_type,
      assigned_date,
      due_date,
      maximum_marks,
      grading_required,
      status,
    } = body;

    if (!title || !course_id || !batch_id || !due_date) {
      return NextResponse.json(
        { error: "title, course_id, batch_id, and due_date are required fields." },
        { status: 400 }
      );
    }

    // Verify course & batch belong to current institute
    const courseItem = await db.course.findFirst({
      where: { id: course_id, institute_id: institute.id },
    });

    const batchItem = await db.batch.findFirst({
      where: { id: batch_id, institute_id: institute.id },
    });

    if (!courseItem || !batchItem) {
      return NextResponse.json(
        { error: "Invalid course or batch for your institute." },
        { status: 400 }
      );
    }

    // Enforce submission type based on institute_mode
    let validSubmissionType = submission_type || "online";
    if (institute.institute_mode === "offline") validSubmissionType = "offline";
    else if (institute.institute_mode === "online") validSubmissionType = "online";

    const newActivity = await db.activity.create({
      data: {
        institute_id: institute.id,
        course_id,
        batch_id,
        mentor_id: mentor_id || user.id,
        title: title.trim(),
        description: description?.trim() || null,
        module_name: module_name?.trim() || null,
        activity_type: activity_type || "Assignment",
        submission_type: validSubmissionType,
        assigned_date: assigned_date ? new Date(assigned_date) : new Date(),
        due_date: new Date(due_date),
        maximum_marks: parseFloat(maximum_marks) || 100.0,
        grading_required: grading_required !== false,
        status: status || "Draft",
      },
    });

    if (newActivity.status === "Published") {
      const { createNotification } = await import("@/lib/notifications");
      const batchStudents = await db.student.findMany({
        where: { institute_id: institute.id, batch_id, is_archived: false },
        select: { user_id: true },
      });

      for (const st of batchStudents) {
        if (st.user_id) {
          await createNotification({
            institute_id: institute.id,
            recipient_user_id: st.user_id,
            type: "Academic",
            category: "New activity",
            title: `New Activity: ${newActivity.title}`,
            message: `A new ${newActivity.activity_type.toLowerCase()} "${newActivity.title}" has been assigned. Due on ${new Date(newActivity.due_date).toLocaleDateString()}.`,
            priority: "Normal",
            related_entity_type: "activity",
            related_entity_id: newActivity.id,
            action_url: `/student/activities/${newActivity.id}`,
            event_key: `new_act_${newActivity.id}`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      activity: newActivity,
    });
  } catch (error: any) {
    console.error("POST Activity API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create activity" },
      { status: 500 }
    );
  }
}
