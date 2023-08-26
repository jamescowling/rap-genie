import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

function App() {
  const search = useAction(api.search.search);
  const [searchText, setSearchText] = useState("");
  const [verses, setVerses] = useState<
    { title: string; artist: string; verse: string }[]
  >([]);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    search({ text: searchText, count: 3 }).then(setVerses);
    setSearchText("");
  };

  return (
    <div className="App">
      <h1>RapGenie</h1>
      <div className="byline">semantic verse search</div>
      <form onSubmit={handleSearch}>
        <input
          className="search"
          value={searchText}
          onChange={async (e) => {
            setSearchText(e.target.value);
          }}
          placeholder="theme to search for..."
        />
        <button type="submit" className="submit" disabled={!searchText}>
          Send
        </button>
      </form>
      {verses.map((verse) => (
        <div className="song">
          <div className="title">{verse.title}</div>
          <div className="artist">{verse.artist}</div>
          <div className="verse">{verse.verse}</div>
        </div>
      ))}
    </div>
  );
}

export default App;
