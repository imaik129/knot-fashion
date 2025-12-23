import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { blogPosts } from "@/data/blogPosts";

const grouped = ["Fit & Sizing", "Sustainability", "Technology", "Craft"].map(
  (pillar) => ({
    label: pillar,
    posts: blogPosts.filter((p) => p.pillar === pillar),
  })
);

export const metadata: Metadata = {
  title: "Blogs on Fit, Sizing & Anti–Fast Fashion",
  description:
    "Calm, in‑depth reads on clothing fit, sizing, sustainable alternatives to fast fashion, and AI body scanning from knot.fashion.",
};

export default function BlogsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(15,23,42,0.1), rgba(15,23,42,0.2)), url('https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
      </div>
      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 lg:px-14">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge className="border-slate-300 bg-slate-100 text-slate-900">
              Blogs
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl text-slate-900">
              Blogs
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Short reads on fit, circularity, and building quietly with craft.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/#waitlist">
              <Button className="px-4 py-2 text-sm">Join waitlist</Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" className="px-4 py-2 text-sm">
                ← Back
              </Button>
            </Link>
          </div>
        </header>

        <div className="space-y-10">
          {grouped.map((pillar) => (
            <div key={pillar.label} className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {pillar.label}
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                {pillar.posts.map((post, idx) => {
                  const hasImage = !!post.image;
                  const isFeatured = idx === 0;
                  return (
                    <Link
                      key={post.slug}
                      href={`/blogs/${post.slug}`}
                      className={isFeatured ? "md:col-span-2" : ""}
                    >
                      <Card className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-emerald-300/80">
                        {hasImage && (
                          <div
                            className={isFeatured ? "h-56 w-full bg-cover bg-center" : "h-36 w-full bg-cover bg-center"}
                            style={{
                              backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.18)), url(${post.image})`,
                            }}
                          />
                        )}
                        <div className="flex flex-1 flex-col gap-2 p-5">
                          <h3 className="text-base font-semibold text-slate-900">
                            {post.title}
                          </h3>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            {post.pillar}
                          </p>
                          <p className="text-sm text-slate-600">
                            {post.subtitle}
                          </p>
                          <p className="mt-auto text-sm text-slate-700 leading-relaxed line-clamp-3">
                            {post.summary}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Card className="border border-slate-200 bg-white p-6 text-sm text-slate-700">
          Want the next drop?{" "}
          <Link
            href="/"
            className="font-semibold text-emerald-600 underline-offset-4 hover:underline"
          >
            Join the silent list
          </Link>{" "}
          and we will ping you when new notes surface.
        </Card>
      </div>
    </main>
  );
}

