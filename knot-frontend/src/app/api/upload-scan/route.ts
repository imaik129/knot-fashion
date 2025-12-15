import { NextRequest, NextResponse } from "next/server";

// For dev, backend runs on localhost:8000
// Later on Vercel, set KNOT_BACKEND_URL in env
const BACKEND_URL =
  process.env.KNOT_BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("video");
    const heightCm = formData.get("height_cm");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No video file provided (field name must be 'video')" },
        { status: 400 }
      );
    }

    // Rebuild FormData to forward to backend
    const backendFormData = new FormData();
    backendFormData.append("video", file, file.name);
    if (heightCm) {
      backendFormData.append("height_cm", heightCm.toString());
    }

    const res = await fetch(`${BACKEND_URL}/process-scan`, {
      method: "POST",
      body: backendFormData,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Backend error:", res.status, text);
      return NextResponse.json(
        { error: "Backend error", status: res.status, details: text },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("upload-scan route error:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

