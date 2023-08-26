import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

function App() {
  const search = useAction(api.ai.search);
  const [searchText, setSearchText] = useState("");
  const [song, setSong] = useState({
    score: 0,
    title: "",
    artist: "",
    lyrics: "",
  });

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    search({ text: searchText }).then(setSong);
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
      {song && (
        <div className="song">
          <div className="title">{song.title}</div>
          <div className="artist">{song.artist}</div>
          <div className="lyrics">{song.lyrics}</div>
        </div>
      )}
    </div>
  );
}

export default App;
