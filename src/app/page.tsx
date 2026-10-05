import Image from "next/image";
import { EntriesBrowser } from "@/features/hacker-news/get-entries/ui/entries-browser";

export default function Home() {
  return (
    <main className="news-page mx-auto pb-7">
      <header className="news-header pt-10">
        <span className="news-mark" aria-hidden="true">
          HN
        </span>
        <span className="news-eyebrow block text-xs font-semibold uppercase">
          Less noise & Better stories
        </span>
        <h1 className="news-title">
          Hacker News<span className="news-accent">.</span>
        </h1>
        <p className="text-[17px] text-muted">
          The first 30 stories, explored by title length.
        </p>
      </header>
      <EntriesBrowser />
      <footer className="news-footer flex gap-6 text-xs text-muted">
        <span>Developed by Danilo A.</span>
        <div
          className="tech-logos flex shrink-0 items-center gap-4"
          aria-label="Next.js, TypeScript and Stack Builders"
        >
          <Image src="/next.svg" alt="Next.js" width={72} height={15} />
          <Image
            src="/typescript.svg"
            alt="TypeScript"
            width={26}
            height={26}
          />
          <Image
            src="/stack-builders.svg"
            alt="Stack Builders"
            width={21}
            height={26}
          />
        </div>
      </footer>
    </main>
  );
}
