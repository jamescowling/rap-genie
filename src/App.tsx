import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

function App() {
  const search = useAction(api.search.search);
  const [newSearchText, setNewSearchText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [verses, setVerses] = useState<
    {
      title: string;
      artist: string;
      verse: string;
      geniusId: bigint;
      score: number;
    }[]
  >([]);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    search({ text: newSearchText, count: 3 }).then((verses) => {
      setSearchText(newSearchText);
      setVerses(verses);
    });
    setNewSearchText("");
  };

  return (
    <div className="App">
      <h1>RapGenie</h1>
      <div className="byline">semantic verse search</div>
      <form onSubmit={handleSearch}>
        <input
          className="search"
          value={newSearchText}
          onChange={async (e) => {
            setNewSearchText(e.target.value);
          }}
          placeholder="theme to search for..."
        />
        <button type="submit" className="submit" disabled={!newSearchText}>
          Send
        </button>
      </form>
      <h2>{searchText}</h2>
      {verses.map((verse) => (
        <div className="song">
          <a
            className="headerLink"
            href={`https://genius.com/songs/${verse.geniusId}`}
          >
            <div className="title">{verse.title}</div>
            <div className="artist">{verse.artist}</div>
            <div>{(verse.score * 100).toFixed(1)}% match</div>
          </a>
          <div className="verse">{verse.verse}</div>
        </div>
      ))}
    </div>
  );
}

export default App;
