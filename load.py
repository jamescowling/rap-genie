# Load songs from a song dataset into Convex.
#
# ds2.csv is a dataset of 5 million songs from Kaggle.
# https://www.kaggle.com/datasets/nikhilnayak123/5-million-song-lyrics-dataset

import csv
import sys
import os
import time
from dotenv import load_dotenv

from convex import ConvexClient
from convex.values import ConvexInt64
import requests

SOURCE = "ds2.csv"
BATCH_SIZE = 250
SAMPLE_SKIP = 0  # how many rows to skip before adding a song

load_dotenv(".env.local")
load_dotenv()

client = ConvexClient(os.getenv("VITE_CONVEX_URL"))

csv.field_size_limit(sys.maxsize)


class Song:
    def __init__(self, row, header):
        self.__dict__ = dict(zip(header, row))


# Write a batch of songs to Convex.
def writeBatch(batch, offset):
    if not batch:
        return
    backoff = 1
    while True:
        try:
            client.mutation("songs:addBatch", {"batch": batch})
            print("Added batch of", len(batch), "at offset", offset)
            break
        except requests.exceptions.ConnectionError:
            print(
                "ConnectionError at offset",
                offset,
                ", retrying in",
                backoff,
                "seconds",
            )
            time.sleep(backoff)
            backoff *= 2


def main():
    with open(SOURCE, "r") as f:
        reader = csv.reader(f)
        header = next(reader)
        done = False
        i = 0
        while not done:
            batch = []
            for _ in range(BATCH_SIZE):
                try:
                    for _ in range(SAMPLE_SKIP):
                        next(reader)
                        i += 1
                    row = next(reader)
                    i += 1
                    song = Song(row, header)
                    if song.tag != "rap":
                        continue
                    batch.append(
                        {
                            "genre": song.tag,
                            "artist": song.artist,
                            "title": song.title,
                            "year": ConvexInt64(int(song.year)),
                            "lyrics": song.lyrics,
                            "features": song.features,
                            "geniusViews": ConvexInt64(int(song.views)),
                            "geniusId": ConvexInt64(int(song.id)),
                        }
                    )
                except StopIteration:
                    done = True
            writeBatch(batch, i)


main()
