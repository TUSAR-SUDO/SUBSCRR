import type { Metadata } from "next";
import BlogIndex from "@/components/blog/BlogIndex";
import { getPublishedPosts } from "@/lib/blog";

// Re-render at most once a minute so admin edits appear without a redeploy.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — Subscrr",
  description:
    "Audits, psychology, and honest math about the subscriptions you barely notice. The Subscrr journal.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Subscrr Blog",
    itemListElement: posts.map((post, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://subscrr.app/blog/${post.slug}`,
      name: post.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <BlogIndex posts={posts} />
    </>
  );
}
