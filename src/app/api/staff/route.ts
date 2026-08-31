import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type StaffRole =
  | "admin"
  | "sub_admin"
  | "patient_attender"
  | "super_admin";

const STAFF_ROLES: StaffRole[] = [
  "admin",
  "sub_admin",
  "patient_attender",
  "super_admin",
];

const CREATABLE_ROLES: StaffRole[] = [
  "admin",
  "sub_admin",
  "patient_attender",
];

function errorResponse(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    throw new Error("Missing authentication token.");
  }

  if (!authorization.startsWith("Bearer ")) {
    throw new Error("Invalid authentication header.");
  }

  const token = authorization
    .substring(7)
    .trim();

  if (!token) {
    throw new Error("Missing authentication token.");
  }

  return await adminAuth.verifyIdToken(token);
}

async function requireStaffManager(
  request: NextRequest
) {
  const decodedToken =
    await getAuthenticatedUser(request);

  const userDoc = await adminDb
    .collection("users")
    .doc(decodedToken.uid)
    .get();

  if (!userDoc.exists) {
    throw new Error(
      "Your user profile was not found."
    );
  }

  const userData = userDoc.data();
  const role = userData?.role;

  if (
    role !== "super_admin" &&
    role !== "admin" &&
    role !== "sub_admin"
  ) {
    throw new Error(
      "You do not have permission to manage staff."
    );
  }

  return {
    uid: decodedToken.uid,
    role: role as StaffRole,
  };
}

/* =====================================================
   GET
===================================================== */

export async function GET(
  request: NextRequest
) {
  try {
    await requireStaffManager(request);

    const snapshot = await adminDb
      .collection("users")
      .get();

    const staff = snapshot.docs
      .map((doc) => {
        const data = doc.data();

        let createdAt = "";

        if (data.createdAt) {
          if (
            typeof data.createdAt.toDate ===
            "function"
          ) {
            createdAt =
              data.createdAt
                .toDate()
                .toISOString();
          } else if (
            data.createdAt instanceof Date
          ) {
            createdAt =
              data.createdAt.toISOString();
          } else if (
            typeof data.createdAt === "string"
          ) {
            createdAt = data.createdAt;
          }
        }

        return {
          uid: doc.id,
          name: data.name || "",
          email: data.email || "",
          role: data.role || "",
          phone: data.phone || "",
          active: data.active !== false,
          createdAt,
        };
      })
      .filter((person) =>
        STAFF_ROLES.includes(
          person.role as StaffRole
        )
      );

    return NextResponse.json({
      success: true,
      staff,
    });
  } catch (error: any) {
    console.error("GET /api/staff:", error);

    const message =
      error?.message ||
      "Failed to load staff.";

    if (
      message.includes(
        "Missing authentication"
      ) ||
      message.includes(
        "Invalid authentication"
      )
    ) {
      return errorResponse(message, 401);
    }

    if (
      message.includes("permission")
    ) {
      return errorResponse(message, 403);
    }

    return errorResponse(message, 500);
  }
}

/* =====================================================
   POST
===================================================== */

export async function POST(
  request: NextRequest
) {
  try {
    const manager =
      await requireStaffManager(request);

    const body = await request.json();

    const name =
      String(body.name || "").trim();

    const email =
      String(body.email || "")
        .trim()
        .toLowerCase();

    const password =
      String(body.password || "");

    const phone =
      String(body.phone || "").trim();

    const role =
      body.role as StaffRole;

    if (!name) {
      return errorResponse(
        "Staff name is required."
      );
    }

    if (!email) {
      return errorResponse(
        "Staff email is required."
      );
    }

    if (!password) {
      return errorResponse(
        "Staff password is required."
      );
    }

    if (password.length < 6) {
      return errorResponse(
        "Password must contain at least 6 characters."
      );
    }

    if (
      !CREATABLE_ROLES.includes(role)
    ) {
      return errorResponse(
        "Invalid staff role."
      );
    }

    if (
      manager.role === "sub_admin" &&
      role === "admin"
    ) {
      return errorResponse(
        "Sub Admins cannot create Admin accounts.",
        403
      );
    }

    const userRecord =
      await adminAuth.createUser({
        email,
        password,
        displayName: name,
        disabled: false,
      });

    try {
      await adminDb
        .collection("users")
        .doc(userRecord.uid)
        .set({
          uid: userRecord.uid,
          name,
          email,
          phone,
          role,
          active: true,
          createdAt: new Date(),
        });
    } catch (firestoreError) {
      try {
        await adminAuth.deleteUser(
          userRecord.uid
        );
      } catch (cleanupError) {
        console.error(
          "Failed to cleanup Auth user:",
          cleanupError
        );
      }

      throw firestoreError;
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Staff account created successfully.",
        staff: {
          uid: userRecord.uid,
          name,
          email,
          phone,
          role,
          active: true,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/staff:", error);

    if (
      error?.code ===
      "auth/email-already-exists"
    ) {
      return errorResponse(
        "An account with this email already exists.",
        409
      );
    }

    const message =
      error?.message ||
      "Failed to create staff account.";

    if (
      message.includes(
        "Missing authentication"
      ) ||
      message.includes(
        "Invalid authentication"
      )
    ) {
      return errorResponse(message, 401);
    }

    if (
      message.includes("permission") ||
      message.includes("cannot create")
    ) {
      return errorResponse(message, 403);
    }

    return errorResponse(message, 500);
  }
}

/* =====================================================
   PATCH
===================================================== */

export async function PATCH(
  request: NextRequest
) {
  try {
    await requireStaffManager(request);

    const body = await request.json();

    const uid =
      String(body.uid || "").trim();

    const active =
      Boolean(body.active);

    if (!uid) {
      return errorResponse(
        "Staff UID is required."
      );
    }

    const staffRef = adminDb
      .collection("users")
      .doc(uid);

    const staffDoc =
      await staffRef.get();

    if (!staffDoc.exists) {
      return errorResponse(
        "Staff account not found.",
        404
      );
    }

    const staffData =
      staffDoc.data();

    if (
      staffData?.role === "super_admin"
    ) {
      return errorResponse(
        "The Super Admin account cannot be disabled.",
        403
      );
    }

    await adminAuth.updateUser(uid, {
      disabled: !active,
    });

    await staffRef.update({
      active,
    });

    return NextResponse.json({
      success: true,
      message: active
        ? "Staff account enabled."
        : "Staff account disabled.",
    });
  } catch (error: any) {
    console.error(
      "PATCH /api/staff:",
      error
    );

    const message =
      error?.message ||
      "Failed to update staff.";

    if (
      message.includes(
        "Missing authentication"
      ) ||
      message.includes(
        "Invalid authentication"
      )
    ) {
      return errorResponse(message, 401);
    }

    if (
      message.includes("permission")
    ) {
      return errorResponse(message, 403);
    }

    return errorResponse(message, 500);
  }
}

/* =====================================================
   DELETE
===================================================== */

export async function DELETE(
  request: NextRequest
) {
  try {
    await requireStaffManager(request);

    const body = await request.json();

    const uid =
      String(body.uid || "").trim();

    if (!uid) {
      return errorResponse(
        "Staff UID is required."
      );
    }

    const staffRef = adminDb
      .collection("users")
      .doc(uid);

    const staffDoc =
      await staffRef.get();

    if (!staffDoc.exists) {
      return errorResponse(
        "Staff account not found.",
        404
      );
    }

    const staffData =
      staffDoc.data();

    if (
      staffData?.role === "super_admin"
    ) {
      return errorResponse(
        "The Super Admin account cannot be deleted.",
        403
      );
    }

    await adminAuth.deleteUser(uid);
    await staffRef.delete();

    return NextResponse.json({
      success: true,
      message:
        "Staff account deleted.",
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/staff:",
      error
    );

    const message =
      error?.message ||
      "Failed to delete staff.";

    if (
      message.includes(
        "Missing authentication"
      ) ||
      message.includes(
        "Invalid authentication"
      )
    ) {
      return errorResponse(message, 401);
    }

    if (
      message.includes("permission")
    ) {
      return errorResponse(message, 403);
    }

    return errorResponse(message, 500);
  }
}