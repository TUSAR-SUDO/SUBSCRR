import Image from "next/image";
import type { Post } from "@/content/posts";

/** Render inline markdown-lite: **bold**, *italic*, `code`. */
function renderInline(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**")) {
      return <strong key={i}>{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      return <em key={i}>{tok.slice(1, -1)}</em>;
    }
    if (tok.startsWith("`") && tok.endsWith("`")) {
      return <code key={i}>{tok.slice(1, -1)}</code>;
    }
    return <span key={i}>{tok}</span>;
  });
}

interface TocEntry {
  id: string;
  text: string;
}

export default function ArticleBody({ post, toc }: { post: Post; toc: TocEntry[] }) {
  const blocks = post.body.split(/\n{2,}/);

  return (
    <>
      <figure className="article__hero-figure">
        <Image
          src={post.image}
          alt={post.imageAlt}
          width={1600}
          height={900}
          priority
          sizes="(max-width: 1024px) 100vw, 780px"
          className="article__hero-img"
        />
      </figure>

      <div className="article__layout">
      {/* Table of contents */}
      {toc.length > 0 && (
        <aside className="article__toc">
          <span className="article__toc-label">In this story</span>
          <nav>
            {toc.map((t) => (
              <a key={t.id} href={`#${t.id}`}>
                {t.text}
              </a>
            ))}
          </nav>
          <div className="article__toc-accent" style={{ background: post.accent }} aria-hidden="true" />
        </aside>
      )}

      {/* Body */}
      <div className="article__prose">
        {blocks.map((block, bi) => {
          const lines = block.split("\n");
          const first = lines[0].trim();

          if (first.startsWith("### ")) {
            const text = first.slice(4);
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            return (
              <h3 key={bi} id={id}>
                {renderInline(text)}
              </h3>
            );
          }
          if (first.startsWith("## ")) {
            const text = first.slice(3);
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            return (
              <h2 key={bi} id={id}>
                {renderInline(text)}
              </h2>
            );
          }
          if (first.startsWith("> ")) {
            return (
              <blockquote key={bi} style={{ borderColor: post.accent }}>
                {renderInline(first.slice(2))}
              </blockquote>
            );
          }
          if (lines.every((l) => l.trim().startsWith("- "))) {
            return (
              <ul key={bi}>
                {lines.map((l, li) => (
                  <li key={li}>{renderInline(l.trim().slice(2))}</li>
                ))}
              </ul>
            );
          }
          if (/^\d+\.\s/.test(first) && lines.every((l) => /^\d+\.\s/.test(l.trim()))) {
            return (
              <ol key={bi}>
                {lines.map((l, li) => (
                  <li key={li}>{renderInline(l.trim().replace(/^\d+\.\s/, ""))}</li>
                ))}
              </ol>
            );
          }
          if (first.startsWith("|")) {
            const rows = lines
              .filter((l) => !/^\|[\s:|-]+\|$/.test(l.trim()))
              .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
            const [head, ...body] = rows;
            return (
              <table key={bi}>
                <thead>
                  <tr>{head.map((c, i) => <th key={i}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((c, ci) => (
                        <td key={ci} style={{ color: ci > 0 ? post.accent : undefined }}>
                          {renderInline(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }
          return <p key={bi}>{renderInline(block)}</p>;
        })}
      </div>
      </div>
    </>
  );
}
