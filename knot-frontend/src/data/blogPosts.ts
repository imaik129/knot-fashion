import blogJson from "./blogPosts.json";

export type BlogPost = {
    slug: string;
    title: string;
    subtitle: string;
    pillar: "Fit & Sizing" | "Sustainability" | "Technology" | "Craft";
    summary: string;
    body: string[];
};

export const blogPosts: BlogPost[] = blogJson as BlogPost[];

