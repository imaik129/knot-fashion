"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Failed");

      setStatus("success");
      setEmail("");
    } catch (err) {
      console.error("waitlist submit error", err);
      setStatus("error");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url('https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="mb-16 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.18)]" />
            <p className="text-xs uppercase tracking-[0.2em] text-slate-200">
              knot.fashion
            </p>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-200">
            <Link href="/blogs" className="transition hover:text-white">
              Blogs
            </Link>
          </nav>
        </header>

        <div className="flex flex-1 flex-col justify-center">
          <div className="max-w-3xl space-y-8">
            <Badge className="border-white/30 bg-white/10 text-white">
              Fashion tech
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              The new way to shop fashion: tailored quietly, fit-first, low-noise.
            </h1>
            <p className="max-w-2xl text-lg text-slate-200">
              Adaptive silhouettes, circular passports, and privacy-respectful fit data.
              Built with people who care how garments live, move, and return.
            </p>

            <Card className="max-w-xl border-white/10 bg-white/10 p-5 shadow-[0_25px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
              <form className="space-y-3" onSubmit={handleSubmit}>
                <label className="space-y-2 text-sm text-slate-100">
                  <span>Signup for waitlist</span>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@contact"
                    className="bg-white/10 text-white placeholder:text-slate-300"
                  />
                </label>
                <Button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full px-5 py-3 bg-emerald-500 text-slate-900 hover:bg-emerald-400"
                >
                  {status === "loading" ? "Sending..." : "Request invite"}
                  <span className="text-lg">→</span>
                </Button>
                {status === "success" && (
                  <p className="text-sm text-emerald-200">
                    Received. We will reach out quietly.
                  </p>
                )}
                {status === "error" && (
                  <p className="text-sm text-rose-200">
                    Something went off-script. Try again?
                  </p>
                )}
                <p className="text-xs text-slate-300">
                  No blasts. No resale. Your contact stays encrypted at rest.
                </p>
              </form>
            </Card>
          </div>
        </div>

        <footer className="mt-12 flex items-center justify-between text-xs text-slate-200">
          <p>© Knot — crafted for fit, circularity, and silence.</p>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p>Private by default.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
