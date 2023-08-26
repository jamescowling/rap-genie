# https://www.kaggle.com/datasets/nikhilnayak123/5-million-song-lyrics-dataset

import csv
import sys
import os
from dotenv import load_dotenv

from convex import ConvexClient
from convex.values import ConvexInt64

load_dotenv(".env.local")
load_dotenv()

client = ConvexClient(os.getenv("VITE_CONVEX_URL"))


class Song:
    def __init__(self, row, header):
        self.__dict__ = dict(zip(header, row))


csv.field_size_limit(sys.maxsize)
with open("ds2.csv", "r") as f:
    reader = csv.reader(f)
    header = next(reader)
    i = 0
    for row in reader:
        i += 1
        if i > 1000:
            break
        song = Song(row, header)
        client.mutation(
            "songs:add",
            {
                "genre": song.tag,
                "artist": song.artist,
                "title": song.title,
                "year": ConvexInt64(int(song.year)),
                "lyrics": song.lyrics,
                "features": song.features,
                "geniusViews": ConvexInt64(int(song.views)),
                "geniusId": ConvexInt64(int(song.id)),
            },
        )
        print(song.tag, song.artist, song.title)
