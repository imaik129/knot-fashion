import { notFound } from "next/navigation";
import Link from "next/link";
import { blogPosts } from "@/data/blogPosts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.subtitle,
  };
}

export default async function BlogArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return notFound();

  const recommendations = blogPosts
    .filter((p) => p.slug !== post.slug)
    .filter((p) => p.pillar === post.pillar || p.pillar === "Fit & Sizing")
    .slice(0, 3);

  const heroImage =
    post.image ??
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=2000&q=80";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url('${heroImage}')`,
          }}
        />
      </div>
      <div className="relative mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 sm:px-10 lg:px-14">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge className="border-white/30 bg-white/10 text-white">
              {post.pillar}
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl text-white">
              {post.title}
            </h1>
            <p className="mt-2 text-slate-200">{post.subtitle}</p>
          </div>
          <Link href="/blogs" className="text-sm text-slate-200 hover:text-white">
            ← Back to blogs
          </Link>
        </header>

        <article className="space-y-4 text-base leading-relaxed text-slate-100">
          {post.body.map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </article>

        <section className="space-y-3">
          <Card className="border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-200">
              Liked this piece? Join the knot.fashion waitlist to hear when new
              essays and products drop.
            </p>
            <div className="mt-3">
              <Link href="/#waitlist">
                <Button className="px-4 py-2 text-sm bg-emerald-500 text-slate-900 hover:bg-emerald-400">
                  Join the waitlist →
                </Button>
              </Link>
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Recommended</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {recommendations.map((rec) => (
              <Link key={rec.slug} href={`/blogs/${rec.slug}`}>
                <Card className="border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white">{rec.title}</p>
                  <p className="mt-1 text-xs text-slate-200 line-clamp-3">
                    {rec.summary}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

