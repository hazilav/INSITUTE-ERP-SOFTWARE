import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";

const SESSION_COOKIE_NAME = "crm_session";
const SESSION_DURATION_DAYS = 7;

export type Role = "OWNER" | "ADMIN" | "STAFF" | "MENTOR" | "STUDENT";
export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID() + "-" + Date.now();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      user_id: userId,
      token: token,
      expires_at: expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.session.deleteMany({
      where: { token },
    });
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
}

export type SafeUser = {
  id: string;
  institute_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role | string;
  status: UserStatus | string;
  must_change_password?: boolean;
  created_at: Date;
};

export type SafeInstitute = {
  id: string;
  name: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website?: string | null;
  institute_mode: string | null;
  work_start_time?: string | null;
  work_end_time?: string | null;
  late_threshold_mins?: number | null;
  half_day_hours?: number | null;
  student_id_prefix?: string | null;
  portal_enabled?: boolean | null;
  student_login_enabled?: boolean | null;
  created_at: Date;
};

export type SessionUserContext = {
  user: SafeUser;
  institute: SafeInstitute;
};

export async function getAuthenticatedUser(): Promise<SessionUserContext | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const session = await db.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            institute: true,
          },
        },
      },
    });

    if (!session) return null;

    if (new Date() > session.expires_at) {
      await db.session.delete({ where: { id: session.id } });
      return null;
    }

    const { user } = session;
    const { institute } = user;

    if (user.status === "Inactive" || (institute as any).is_deactivated) {
      return null;
    }

    return {
      user: {
        id: user.id,
        institute_id: user.institute_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role as Role,
        status: user.status as UserStatus,
        must_change_password: user.must_change_password,
        created_at: user.created_at,
      },
      institute: {
        id: institute.id,
        name: institute.name,
        logo: institute.logo,
        phone: institute.phone,
        email: institute.email,
        address: institute.address,
        website: institute.website,
        institute_mode: institute.institute_mode,
        work_start_time: institute.work_start_time,
        work_end_time: institute.work_end_time,
        late_threshold_mins: institute.late_threshold_mins,
        half_day_hours: institute.half_day_hours,
        created_at: institute.created_at,
      },
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}
