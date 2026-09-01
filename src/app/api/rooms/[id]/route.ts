import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can edit rooms." }, { status: 403 });
    }

    const room = await db.room.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, room_number, capacity, location, status } = body;

    const updated = await db.room.update({
      where: { id: room.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(room_number ? { room_number: room_number.trim() } : {}),
        ...(capacity !== undefined ? { capacity: parseInt(capacity, 10) } : {}),
        ...(location !== undefined ? { location: location ? location.trim() : null } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Room updated successfully.",
      room: updated,
    });
  } catch (error: any) {
    console.error("PATCH Room API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can delete rooms." }, { status: 403 });
    }

    const room = await db.room.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await db.room.delete({ where: { id: room.id } });

    return NextResponse.json({
      success: true,
      message: "Room deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE Room API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete room" }, { status: 500 });
  }
}
