import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

function safeDate(value: string): Date {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: Awaited<ReturnType<typeof getPublishedPosts>> = [];
  try {
    posts = await getPublishedPosts();
  } catch {
    // Content DB unavailable — still emit the static routes.
  }

  const base = "https://subscrr.app";

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: safeDate(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
