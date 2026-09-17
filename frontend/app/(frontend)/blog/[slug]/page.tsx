import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import ArticleBody from "@/components/blog/ArticleBody";
import { getPublishedPost, getPublishedPosts } from "@/lib/blog";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getPublishedPosts();
  return slugs.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Article not found — Subscrr" };

  return {
    title: `${post.title} — Subscrr Blog`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      url: `https://subscrr.app/blog/${post.slug}`,
      siteName: "Subscrr",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export const dynamicParams = true;

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  // Related: same category first, then shared tags, from published posts only.
  const all = await getPublishedPosts();
  const related = all
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      post: p,
      score:
        (p.category === post.category ? 2 : 0) +
        p.tags.filter((t) => post.tags.includes(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.post);

  // Build TOC from ##/### headings
  const toc = post.body
    .split("\n")
    .filter((l) => l.startsWith("## ") || l.startsWith("### "))
    .map((l) => {
      const text = l.replace(/^#+\s/, "");
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return { id, text };
    });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Organization", name: "Subscrr" },
    publisher: { "@type": "Organization", name: "Subscrr" },
    keywords: post.tags.join(", "),
    articleSection: post.category,
    mainEntityOfPage: `https://subscrr.app/blog/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="article">
        {/* Header */}
        <header className="article__header">
          <div className="container article__container">
            <Link href="/blog" className="article__back">
              <ArrowLeft className="w-4 h-4" />
              All articles
            </Link>

            <div className="blog-card__meta article__meta">
              <span
                className="blog-chip"
                style={{ color: post.accent, background: `${post.accent}14` }}
              >
                {post.category}
              </span>
              <span className="blog-card__date">{formatDate(post.date)}</span>
              <span className="blog-card__read">
                <Clock className="w-3.5 h-3.5" />
                {post.readMinutes} min read
              </span>
            </div>

            <h1 className="article__title">{post.title}</h1>
            <p className="article__excerpt">{post.excerpt}</p>
          </div>
          <div
            className="article__band"
            style={{
              background: `linear-gradient(90deg, ${post.accent} 0%, ${post.accent}00 100%)`,
            }}
            aria-hidden="true"
          />
        </header>

        {/* Body */}
        <div className="container article__container">
          <ArticleBody post={post} toc={toc} />

          {/* Tags */}
          <div className="article__tags">
            {[...new Set(post.tags)].map((tag) => (
              <span key={tag} className="article__tag">
                #{tag}
              </span>
            ))}
          </div>

          {/* CTA */}
          <aside className="article__cta">
            <h3>See your own honest number.</h3>
            <p>
              Add your subscriptions once — Subscrr shows what you really pay
              per day, month and year, and nudges you before every charge.
            </p>
            <Link href="/" className="btn btn--rise">
              Launch the web app
            </Link>
          </aside>

          {/* Related */}
          <section className="article__related">
            <h2>Keep reading</h2>
            <div className="article__related-grid">
              {related.map((rel) => (
                <Link key={rel.slug} href={`/blog/${rel.slug}`} className="blog-card">
                  <div className="blog-card__media">
                    <Image
                      src={rel.image}
                      alt={rel.imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="blog-card__img"
                    />
                  </div>
                  <div className="blog-card__body">
                    <div className="blog-card__meta">
                      <span
                        className="blog-chip"
                        style={{ color: rel.accent, background: `${rel.accent}14` }}
                      >
                        {rel.category}
                      </span>
                      <span className="blog-card__date">{formatDate(rel.date)}</span>
                    </div>
                    <h3 className="blog-card__title">{rel.title}</h3>
                    <span className="article__related-more">
                      Read article
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </article>
    </>
  );
}
