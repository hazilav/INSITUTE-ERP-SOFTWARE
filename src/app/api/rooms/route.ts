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

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const whereCondition: any = { institute_id: institute.id };
    if (statusFilter) {
      whereCondition.status = statusFilter;
    }

    const rooms = await db.room.findMany({
      where: whereCondition,
      orderBy: { room_number: "asc" },
    });

    return NextResponse.json({
      success: true,
      rooms,
    });
  } catch (error: any) {
    console.error("GET Rooms API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can create rooms." }, { status: 403 });
    }

    const body = await request.json();
    const { name, room_number, capacity, location, status } = body;

    if (!name || !room_number) {
      return NextResponse.json({ error: "name and room_number are required fields." }, { status: 400 });
    }

    const existing = await db.room.findFirst({
      where: { institute_id: institute.id, room_number: room_number.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: `Room number ${room_number} already exists in this institute.` }, { status: 400 });
    }

    const room = await db.room.create({
      data: {
        institute_id: institute.id,
        name: name.trim(),
        room_number: room_number.trim(),
        capacity: capacity ? parseInt(capacity, 10) : 30,
        location: location?.trim() || null,
        status: status || "Available",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Room created successfully.",
      room,
    });
  } catch (error: any) {
    console.error("POST Rooms API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create room" }, { status: 500 });
  }
}
