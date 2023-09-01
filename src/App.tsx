import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { SVGProps, useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { JSX } from "react/jsx-runtime";

import rgLogo from "../assets/rg.svg";

function Header() {
  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <img src={rgLogo} alt="RapGenie" className="h-36 mb-12 w-auto" />
      <h1 className="mt-2 text-4xl tracking-tight font-['Fruktur'] text-amber-400 sm:text-6xl">
        RapGenie
      </h1>
      <h3 className="mt-6 text-lg leading-8">
        Semantic verse search. Powered by{" "}
        <a href="https://convex.dev">Convex</a> and{" "}
        <a href="https://platform.openai.com/docs/guides/embeddings">OpenAI</a>.
      </h3>
    </div>
  );
}

function SongCard({
  verse,
}: {
  verse: {
    verseId: Id<"verses">;
    title: string;
    artist: string;
    verse: string;
    geniusId: bigint;
    score: number;
  };
}) {
  return (
    <li key={verse.verseId.toString()}>
      <div className="overflow-hidden rounded-lg bg-stone-700 shadow">
        <div className="border-b border-stone-400 px-4 py-5 sm:px-6">
          <h3 className="font-bold text-xl text-amber-400">{verse.title}</h3>
          <p className="mt-1">{verse.artist}</p>
          <div>{(verse.score * 100).toFixed(1)}% match</div>
        </div>
        <div className="verse p-4 sm:p-6">{verse.verse}</div>
        <div className="p-4 sm:px-6 text-right">
          <a
            className="font-semibold text-amber-400 hover:text-amber-300"
            href={`https://genius.com/songs/${verse.geniusId}`}
          >
            genius.com
          </a>
        </div>
      </div>
    </li>
  );
}

function Footer() {
  const navigation = [
    {
      name: "GitHub",
      href: "https://github.com/JamesCowling/rap-genie",
      icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: "Twitter",
      href: "https://twitter.com/jamesacowling",
      icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
        </svg>
      ),
    },
    {
      name: "Convex",
      href: "https://convex.dev",
      icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 611.25 615.51" {...props}>
          <g id="b">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="m386.29,485.14c91.01-9.93,176.83-57.6,224.12-137.18-22.36,196.77-241.35,321.17-420.03,244.77-16.49-7.05-30.63-18.66-40.38-33.71-40.17-61.96-53.38-140.83-34.43-212.39,54.23,91.95,164.42,148.34,270.72,138.52"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="m112.26,288.92c-36.91,83.77-38.53,181.93,6.75,262.68-159.23-117.74-157.47-369.59-1.96-486.14,14.35-10.75,31.48-17.19,49.39-18.11,73.74-3.81,148.64,24.19,201.15,76.38-106.75.99-210.67,68.22-255.33,165.19"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="m419.05,149.45c-53.84-73.8-138.16-123.99-230.49-125.52,178.51-79.64,398.03,49.48,421.97,240.31,2.22,17.75-.69,35.76-8.7,51.74-33.37,66.54-95.21,118.17-167.47,137.28,53.05-96.49,46.46-214.39-15.31-303.82"
            />
          </g>
        </svg>
      ),
    },
  ];

  return (
    <footer>
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-stone-500 hover:text-stone-400"
            >
              <span className="sr-only">{item.name}</span>
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </a>
          ))}
        </div>
        <div className="mt-8 md:order-1 md:mt-0">
          <p className="text-center text-xs leading-5 text-stone-500">
            MIT Licensed. Do whatevs.
          </p>
        </div>
      </div>
    </footer>
  );
}

function AboutBox() {
  return (
    <div className="bg-stone-700 shadow sm:rounded-lg max-w-xl mx-auto mt-20 mb-8 px-4 py-5 sm:p-6">
      <h3 className="text-base font-semibold leading-6">About RapGenie</h3>
      <div className="mt-2 max-w-xl text-sm">
        <p>
          Rap Genie uses OpenAI to generate an embedding for each verse and each
          search query. The rest of the app is built entirely on Convex, a
          serverless fullstack development platform that makes it easy to build
          dynamic web apps, talk to third party APIs, and run background jobs.
          Feel free to fork the repo to make changes, or build something else
          cool on Convex.
        </p>
      </div>
      <div className="mt-5 space-x-4">
        <a
          href="https://github.com/JamesCowling/rap-genie"
          className="inline-flex items-center rounded-md bg-stone-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Rap Genie on GitHub
        </a>
        <a
          href="https://docs.convex.dev/get-started"
          className="inline-flex items-center rounded-md bg-amber-400 px-3 py-2 text-sm font-semibold text-black shadow-sm hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Build on Convex
        </a>
      </div>
    </div>
  );
}

function App() {
  const search = useAction(api.search.search);
  const [newSearchText, setNewSearchText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [verses, setVerses] = useState<
    {
      verseId: Id<"verses">;
      title: string;
      artist: string;
      verse: string;
      geniusId: bigint;
      score: number;
    }[]
  >([]);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    search({ text: newSearchText, count: 9 }).then((verses) => {
      setSearchText(newSearchText);
      setVerses(verses);
    });
    setNewSearchText("");
  };

  return (
    <div className="text-stone-200 bg-stone-800 min-h-screen">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12 sm:py-16">
        <Header />
        <form className="mt-10 max-w-md" onSubmit={handleSearch}>
          <div className="flex gap-x-4">
            <input
              type="search"
              required
              value={newSearchText}
              onChange={async (e) => {
                setNewSearchText(e.target.value);
              }}
              className="min-w-0 flex-auto rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Enter a theme"
            />
            <button
              type="submit"
              className="flex-none rounded-md bg-amber-400 px-3.5 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              disabled={!newSearchText}
            >
              Search
            </button>
          </div>
          <p className="mt-4 text-sm leading-6">
            Enter a theme like "feeling tired" or "forgot where I parked my
            car".
          </p>
        </form>
        {searchText && (
          <div className="bg-stone-700 shadow sm:rounded-lg max-w-xl mt-16 px-4 py-5 sm:p-6">
            <h2 className="text-amber-400 font-semibold">Query:</h2>
            <p>{searchText}</p>
          </div>
        )}
      </div>
      <ul className="container mx-auto grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {verses.map((verse) => SongCard({ verse }))}
      </ul>
      <AboutBox />
      <Footer />
    </div>
  );
}

export default App;
