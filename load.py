# Load songs from a song dataset into Convex.
#
# ds2.csv is a dataset of 5 million songs from Kaggle.
# https://www.kaggle.com/datasets/nikhilnayak123/5-million-song-lyrics-dataset

import csv
import sys
import os
import time
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests


from convex import ConvexClient
from convex.values import ConvexInt64

SOURCE = "ds2.csv"
BATCH_SIZE = 250
SAMPLE_SKIP = 0  # how many rows to skip between each song added
START_OFFSET = 0  # how many rows to skip at the start
MAX_WORKERS = 10  # concurrent requests to Convex

load_dotenv(".env.local")
load_dotenv()

client = ConvexClient(os.getenv("VITE_CONVEX_URL"))

csv.field_size_limit(sys.maxsize)


class Song:
    def __init__(self, row, header):
        self.__dict__ = dict(zip(header, row))


# Write a batch of songs to Convex.
def write_batch(batch, offset):
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
                "retrying in",
                backoff,
                "seconds",
            )
            time.sleep(backoff)
            backoff *= 2


# A generator that will yield batches of songs and their offset in the CSV.
def generate_batches(reader, header):
    i = 0
    for i in range(START_OFFSET):
        if i % 10000 == 0:
            print("Skipping", i, "rows")
        next(reader, None)
        i += 1
    while True:
        batch = []
        for _ in range(BATCH_SIZE):
            try:
                for _ in range(SAMPLE_SKIP):
                    next(reader)
                    i += 1
                song = Song(next(reader), header)
                i += 1
                if song.tag == "rap":
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
                if batch:
                    yield batch, i
                break
        yield batch, i


def main():
    with open(SOURCE, "r") as f:
        reader = csv.reader(f)
        header = next(reader)
        with ThreadPoolExecutor(MAX_WORKERS) as executor:
            futures = [
                executor.submit(write_batch, batch, offset)
                for batch, offset in generate_batches(reader, header)
            ]
            for future in as_completed(futures):
                future.result()


main()
