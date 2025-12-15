import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const note = typeof body?.note === "string" ? body.note.trim() : undefined;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!supabase) {
      console.error("Supabase env vars missing");
      return NextResponse.json(
        { error: "Waitlist storage not configured" },
        { status: 500 }
      );
    }

    const { error } = await supabase.from("waitlist").insert({
      email,
      note,
      source: "site",
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Ignore duplicate email constraint if present
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      console.error("Supabase insert error", error);
      return NextResponse.json(
        { error: "Unable to save" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("waitlist route error", err);
    return NextResponse.json(
      { error: "Unable to record" },
      { status: 500 }
    );
  }
}


