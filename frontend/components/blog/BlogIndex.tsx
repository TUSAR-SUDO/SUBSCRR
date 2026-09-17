"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Search } from "lucide-react";
import { CATEGORIES, type Post, type PostCategory } from "@/content/posts";

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CategoryChip({ post }: { post: Post }) {
  return (
    <span
      className="blog-chip"
      style={{ color: post.accent, background: `${post.accent}14` }}
    >
      {post.category}
    </span>
  );
}

function PostCard({ post, index }: { post: Post; index: number }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="blog-card"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="blog-card__media">
        <Image
          src={post.image}
          alt={post.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="blog-card__img"
        />
      </div>
      <div className="blog-card__body">
        <div className="blog-card__meta">
          <CategoryChip post={post} />
          <span className="blog-card__date">{formatDate(post.date)}</span>
        </div>
        <h3 className="blog-card__title">{post.title}</h3>
        <p className="blog-card__excerpt">{post.excerpt}</p>
        <div className="blog-card__footer">
          <span className="blog-card__read">
            <Clock className="w-3.5 h-3.5" />
            {post.readMinutes} min read
          </span>
          <span className="blog-card__arrow" aria-hidden="true">
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BlogIndex({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<PostCategory | "All">("All");
  const [query, setQuery] = useState("");

  const featured = posts.find((p) => p.featured) ?? posts[0];
  const showFeatured = Boolean(featured) && active === "All" && !query.trim();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (showFeatured && p.slug === featured.slug) return false;
      if (active !== "All" && p.category !== active) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [active, query, showFeatured, featured.slug]);

  return (
    <>
      {/* Header */}
      <section className="blog-hero">
        <div className="container">
          <span className="eyebrow reveal-up">The Subscrr Journal</span>
          <h1 className="blog-hero__title reveal-up">
            Money stories worth <em>reading</em>.
          </h1>
          <p className="blog-hero__desc reveal-up">
            Audits, psychology, and honest math about the subscriptions you
            barely notice. No fluff, no lectures — just the numbers and what
            they&apos;re quietly doing to your month.
          </p>
          <div className="blog-hero__stats reveal-up">
            <span className="blog-hero__stat">
              <strong>{posts.length}</strong> articles
            </span>
            <span className="blog-hero__dot" aria-hidden="true" />
            <span className="blog-hero__stat">
              <strong>{CATEGORIES.length}</strong> topics
            </span>
            <span className="blog-hero__dot" aria-hidden="true" />
            <span className="blog-hero__stat">
              <strong>0</strong> bank connections
            </span>
          </div>
        </div>
      </section>

      {/* Featured */}
      {showFeatured && (
        <section className="blog-featured">
          <div className="container">
            <Link href={`/blog/${featured.slug}`} className="blog-featured__card reveal-up">
              <div className="blog-featured__media">
                <Image
                  src={featured.image}
                  alt={featured.imageAlt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="blog-featured__img"
                />
                <span className="blog-featured__badge">Featured</span>
              </div>
              <div className="blog-featured__body">
                <div className="blog-card__meta">
                  <CategoryChip post={featured} />
                  <span className="blog-card__date">
                    {formatDate(featured.date)} · {featured.readMinutes} min read
                  </span>
                </div>
                <h2 className="blog-featured__title">{featured.title}</h2>
                <p className="blog-featured__excerpt">{featured.excerpt}</p>
                <span className="blog-featured__cta">
                  Read the story
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Filters + grid */}
      <section className="blog-list">
        <div className="container">
          <div className="blog-toolbar">
            <div className="blog-filters" role="tablist" aria-label="Filter by topic">
              {(["All", ...CATEGORIES] as const).map((cat) => (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={active === cat}
                  className={`blog-filter${active === cat ? " is-active" : ""}`}
                  onClick={() => setActive(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <label className="blog-search">
              <Search className="w-4 h-4" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search articles…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search articles"
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="blog-empty">
              <span className="blog-empty__emoji" aria-hidden="true">🕳️</span>
              <p>Nothing here yet. Try a different search or topic.</p>
            </div>
          ) : (
            <div className="blog-grid">
              {filtered.map((post, i) => (
                <PostCard key={post.slug} post={post} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="blog-cta">
        <div className="container">
          <div className="blog-cta__card reveal-up">
            <h2 className="blog-cta__title">
              Reading about leaks is step one.
              <br />
              <em>Plugging them</em> is step two.
            </h2>
            <p className="blog-cta__desc">
              Add your subscriptions once — Subscrr keeps the honest totals,
              the per-day truth, and the day-before reminders running quietly
              in the background.
            </p>
            <div className="blog-cta__actions">
              <Link href="/" className="btn btn--rise magnetic">
                Launch the web app
              </Link>
              <a
                href="https://apps.apple.com/app/id6757530448?ct=site_blog&mt=8"
                className="btn btn--ghost magnetic"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get the iPhone app
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
