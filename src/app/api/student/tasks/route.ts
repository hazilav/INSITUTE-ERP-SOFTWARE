import { NextResponse } from "next/server";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const studentContext = await getAuthenticatedStudent();

    if (!studentContext) {
      return NextResponse.json({ error: "Unauthorized: Access Denied" }, { status: 403 });
    }

    const { student, institute } = studentContext;

    const tasks = await db.studentTask.findMany({
      where: { institute_id: institute.id, student_id: student.id },
      orderBy: [{ status: "asc" }, { due_date: "asc" }],
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error("GET Student Tasks API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const studentContext = await getAuthenticatedStudent();

    if (!studentContext) {
      return NextResponse.json({ error: "Unauthorized: Access Denied" }, { status: 403 });
    }

    const { student, institute } = studentContext;
    const body = await request.json();
    const { title, description, task_type, due_date, priority } = body;

    if (!title) {
      return NextResponse.json({ error: "Task title is required." }, { status: 400 });
    }

    const newTask = await db.studentTask.create({
      data: {
        institute_id: institute.id,
        student_id: student.id,
        title: title.trim(),
        description: description?.trim() || null,
        task_type: task_type || "assignment",
        due_date: due_date ? new Date(due_date) : null,
        priority: priority || "Medium",
        status: "Pending",
      },
    });

    return NextResponse.json({ success: true, task: newTask });
  } catch (error) {
    console.error("POST Student Task API Error:", error);
    return NextResponse.json(
      { error: "Failed to create personal task" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const studentContext = await getAuthenticatedStudent();

    if (!studentContext) {
      return NextResponse.json({ error: "Unauthorized: Access Denied" }, { status: 403 });
    }

    const { student, institute } = studentContext;
    const body = await request.json();
    const { task_id, status } = body;

    if (!task_id || !status) {
      return NextResponse.json({ error: "task_id and status are required." }, { status: 400 });
    }

    const existingTask = await db.studentTask.findFirst({
      where: { id: task_id, institute_id: institute.id, student_id: student.id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updatedTask = await db.studentTask.update({
      where: { id: task_id },
      data: { status },
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("PATCH Student Task API Error:", error);
    return NextResponse.json(
      { error: "Failed to update personal task" },
      { status: 500 }
    );
  }
}
