import type { MetadataRoute } from "next";
import { blogPosts } from "@/data/blogPosts";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://knot.fashion";

export default function sitemap(): MetadataRoute.Sitemap {
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}/`,
            lastModified: new Date(),
        },
        {
            url: `${baseUrl}/blogs`,
            lastModified: new Date(),
        },
    ];

    const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
        url: `${baseUrl}/blogs/${post.slug}`,
        lastModified: new Date(),
    }));

    // intentionally omit /scan from the sitemap
    return [...staticRoutes, ...blogRoutes];
}


