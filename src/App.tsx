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
      <p>in the process of redesigning...</p>
      <h1 className="logo">RapGenie</h1>
      <div>Semantic verse search</div>
      <form onSubmit={handleSearch}>
        <input
          value={newSearchText}
          onChange={async (e) => {
            setNewSearchText(e.target.value);
          }}
          placeholder="Theme to search for..."
        />
        <button type="submit" disabled={!newSearchText}>
          Search
        </button>
      </form>
      <h2>query: {searchText}</h2>
      {verses.map((verse) => (
        <div>
          <h3>{verse.title}</h3>
          <h4>{verse.artist}</h4>
          <div>{(verse.score * 100).toFixed(1)}% match</div>
          <div className="verse">{verse.verse}</div>
          <a href={`https://genius.com/songs/${verse.geniusId}`}>Genius link</a>
        </div>
      ))}
    </div>
  );
}

export default App;
