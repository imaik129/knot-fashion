import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { blogPosts } from "@/data/blogPosts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
    return blogPosts.map((post) => ({ slug: post.slug }));
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://knot.fashion";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const post = blogPosts.find((p) => p.slug === slug);
    if (!post) return {};
    return {
        title: post.title,
        description: post.subtitle,
        alternates: {
            canonical: `${baseUrl}/blogs/${post.slug}`,
        },
        openGraph: {
            type: "article",
            url: `${baseUrl}/blogs/${post.slug}`,
            title: post.title,
            description: post.subtitle,
        },
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

                <article className="space-y-6 text-base leading-relaxed text-slate-100">
                    {/* Handle both old (body) and new (intro + sections) formats */}
                    {post.intro ? (
                        <div className="space-y-4">
                            <p className="text-lg">{post.intro}</p>
                        </div>
                    ) : post.body ? (
                        <div className="space-y-4">
                            {post.body.map((para: string, idx: number) => (
                                <p key={idx}>{para}</p>
                            ))}
                        </div>
                    ) : null}

                    {post.sections && post.sections.map((section, idx) => (
                        <section key={idx} className="space-y-4">
                            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">{section.heading}</h2>
                            {section.content.map((para, pIdx) => {
                                // Parse markdown-style links [text](/blogs/slug)
                                const parts: (string | React.ReactElement)[] = [];
                                let lastIndex = 0;
                                const linkRegex = /\[([^\]]+)\]\((\/blogs\/[^)]+)\)/g;
                                let match;

                                while ((match = linkRegex.exec(para)) !== null) {
                                    if (match.index > lastIndex) {
                                        parts.push(para.substring(lastIndex, match.index));
                                    }
                                    parts.push(
                                        <Link
                                            key={`link-${pIdx}-${match.index}`}
                                            href={match[2]}
                                            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                                        >
                                            {match[1]}
                                        </Link>
                                    );
                                    lastIndex = match.index + match[0].length;
                                }
                                if (lastIndex < para.length) {
                                    parts.push(para.substring(lastIndex));
                                }

                                return (
                                    <p key={pIdx}>
                                        {parts.length > 0 ? parts : para}
                                    </p>
                                );
                            })}
                        </section>
                    ))}

                    {post.faq && post.faq.length > 0 && (
                        <section className="mt-12 space-y-6">
                            <h2 className="text-2xl font-semibold text-white mb-6">Frequently Asked Questions</h2>
                            <div className="space-y-6">
                                {post.faq.map((item, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                                        <p className="text-slate-200">{item.answer}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
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

