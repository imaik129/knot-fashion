import blogJson from "./blogPosts.json";

export type BlogPostSection = {
    heading: string;
    content: string[];
};

export type BlogPostFAQ = {
    question: string;
    answer: string;
};

export type BlogPost = {
    slug: string;
    title: string;
    subtitle: string;
    pillar: "Fit & Sizing" | "Sustainability" | "Technology" | "Craft";
    summary: string;
    intro?: string;
    sections?: BlogPostSection[];
    faq?: BlogPostFAQ[];
    body?: string[]; // Legacy format
    image?: string;
};

export const blogPosts: BlogPost[] = blogJson as BlogPost[];

