import { useAction } from "convex/react";
import { useRef, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../convex/_generated/api";
import rgLogo from "../assets/rg.png";

type Verse = FunctionReturnType<typeof api.search.search>[number];
const examples = [
  "feeling on top of the world",
  "missing home",
  "late night drives",
];

function SongCard({ verse }: { verse: Verse }) {
  const [expanded, setExpanded] = useState(false);
  const lines = verse.verse.trim().split("\n");
  const long = lines.length > 8 || verse.verse.length > 600;
  const preview = lines.slice(0, 8).join("\n").slice(0, 600);
  return (
    <li className="rounded-2xl border border-stone-600 bg-stone-800 p-6 sm:p-8">
      <p className="text-sm text-stone-300">{verse.artist}</p>
      <h3 className="mt-1 text-xl font-semibold text-amber-300">
        <a
          className="hover:underline"
          href={`https://genius.com/songs/${verse.geniusId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {verse.title}
        </a>
      </h3>
      <p className="mt-6 whitespace-pre-wrap break-words text-base leading-8 text-stone-100">
        {expanded || !long ? verse.verse.trim() : `${preview.trimEnd()}…`}
      </p>
      <div className="mt-6 flex items-center justify-between gap-4 text-sm">
        {long ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="font-medium text-amber-300 hover:underline"
          >
            {expanded ? "Show less" : "Read full verse"}
          </button>
        ) : (
          <span />
        )}
        <a
          href={`https://genius.com/songs/${verse.geniusId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-300 hover:text-white"
        >
          View on Genius ↗
        </a>
      </div>
    </li>
  );
}

export default function App() {
  const search = useAction(api.search.search);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);

  async function runSearch(value: string) {
    const submitted = value.trim();
    if (!submitted || submitted.length > 1000) return;
    const id = ++request.current;
    setText(value);
    setQuery(submitted);
    setVerses([]);
    setLoading(true);
    setError("");
    try {
      const results = await search({ text: submitted, count: 9 });
      if (id === request.current) setVerses(results);
    } catch {
      if (id === request.current)
        setError("Couldn't load verses. Please try again.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <header className="max-w-2xl">
          <img
            src={rgLogo}
            alt="Rap Genie"
            className="mb-8 h-28 w-auto sm:h-36"
          />
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Find a verse for the feeling.
          </h1>
          <p className="mt-4 text-lg leading-7 text-stone-300">
            A mood, a moment, a topic. Discover rap lyrics that say it.
          </p>
        </header>
        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch(text);
          }}
        >
          <label htmlFor="topic" className="sr-only">
            Describe a mood, moment, or topic
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="topic"
              type="search"
              required
              maxLength={1000}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What’s on your mind?"
              className="min-w-0 flex-1 rounded-xl border border-stone-500 bg-stone-800 px-5 py-4 text-base text-white placeholder:text-stone-400"
            />
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="rounded-xl bg-amber-300 px-7 py-4 font-semibold text-stone-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching…" : "Find verses"}
            </button>
          </div>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="mr-1 text-stone-400">Try</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              disabled={loading}
              onClick={() => void runSearch(example)}
              className="rounded-full border border-stone-600 px-3 py-1.5 text-stone-300 hover:border-amber-300 hover:text-amber-300 disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
        <section
          className="mt-12"
          aria-label="Search results"
          aria-busy={loading}
        >
          <div role="status" aria-live="polite">
            {loading ? (
              <p className="text-stone-300">Finding verses for “{query}”…</p>
            ) : (
              query &&
              !error && (
                <h2 className="mb-6 text-lg text-stone-300">
                  {verses.length
                    ? `${verses.length} verses for “${query}”`
                    : `No verses found for “${query}”. Try another topic.`}
                </h2>
              )
            )}
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-400 bg-red-950/30 p-5 text-red-200"
            >
              {error}
            </p>
          )}
          <ul className="grid items-start gap-5 md:grid-cols-2">
            {verses.map((verse) => (
              <SongCard key={`${query}:${verse.verseId}`} verse={verse} />
            ))}
          </ul>
        </section>
        <footer className="mt-16 border-t border-stone-700 pt-6 text-sm leading-6 text-stone-400">
          <p>Search by meaning. Lyrics sourced from Genius.</p>
          <p className="mt-2">
            Built with{" "}
            <a
              className="text-stone-300 hover:underline"
              href="https://convex.dev"
            >
              Convex
            </a>{" "}
            and OpenAI.{" "}
            <a
              className="ml-3 text-stone-300 hover:underline"
              href="https://github.com/jamescowling/rap-genie"
            >
              Source on GitHub ↗
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
