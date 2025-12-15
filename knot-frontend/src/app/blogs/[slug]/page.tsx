import { notFound } from "next/navigation";
import Link from "next/link";
import { blogPosts } from "@/data/blogPosts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateStaticParams() {
    return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
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

    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-900 text-white">
            <div className="pointer-events-none absolute inset-0">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.8)), url('https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=2000&q=80')",
                    }}
                />
            </div>
            <div className="relative mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 sm:px-10 lg:px-14">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge className="border-white/30 bg-white/10 text-white">
                            {post.pillar}
                        </Badge>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">
                            Field notes
                        </span>
                    </div>
                    <Link href="/blogs" className="text-sm text-slate-200 hover:text-white">
                        ← Back to blogs
                    </Link>
                </header>

                <article className="space-y-6">
                    <h1 className="text-3xl font-semibold sm:text-4xl text-white">
                        {post.title}
                    </h1>
                    <p className="text-lg text-slate-200">{post.subtitle}</p>
                    <div className="space-y-4 text-base leading-relaxed text-slate-100">
                        {post.body.map((para, idx) => (
                            <p key={idx}>{para}</p>
                        ))}
                    </div>
                </article>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-white">Recommended</h2>
                    <div className="grid gap-3 md:grid-cols-3">
                        {recommendations.map((rec) => (
                            <Link key={rec.slug} href={`/blogs/${rec.slug}`}>
                                <Card className="border border-white/10 bg-white/5 p-3 transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-white/10">
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

