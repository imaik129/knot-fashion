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

export default function BlogsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.8)), url('https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
      </div>
      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 lg:px-14">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge className="border-white/30 bg-white/10 text-white">Blogs</Badge>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl text-white">Blogs</h1>
            <p className="mt-2 max-w-2xl text-slate-200">
              Short reads on fit, circularity, and building quietly with craft.
            </p>
          </div>
          <Link href="/">
            <Button variant="secondary" className="px-4 py-2 text-sm">
              ← Back
            </Button>
          </Link>
        </header>

        <div className="space-y-8">
          {grouped.map((pillar) => (
            <div key={pillar.label} className="space-y-4">
              <h2 className="text-xl font-semibold text-white">{pillar.label}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pillar.posts.map((post) => (
                  <Link key={post.slug} href={`/blogs/${post.slug}`}>
                    <Card className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-white/10">
                      <div
                        className="h-40 w-full bg-cover bg-center"
                        style={{
                          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.35)), url(${post.image})`,
                        }}
                      />
                      <div className="p-5 space-y-2">
                        <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                        <p className="text-sm text-slate-200">{post.subtitle}</p>
                        <p className="text-sm text-slate-200 leading-relaxed line-clamp-3">
                          {post.summary}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Card className="border border-white/10 bg-white/5 p-6 text-sm text-slate-100">
          Want the next drop?{" "}
          <Link
            href="/"
            className="font-semibold text-emerald-300 underline-offset-4 hover:underline"
          >
            Join the silent list
          </Link>{" "}
          and we will ping you when new notes surface.
        </Card>
      </div>
    </main>
  );
}

