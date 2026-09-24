"""Download and normalize historical portraits from Wikipedia/Wikimedia.

The script intentionally excludes Prophet Muhammad: PersonaX uses a respectful
non-figurative calligraphic symbol for that persona.
"""

from __future__ import annotations

import io
import json
import hashlib
import html
import re
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "personas" / "historical"
SOURCES = ROOT / "public" / "personas" / "HISTORICAL_SOURCES.md"
USER_AGENT = "PersonaXAI/1.0 (historical portrait attribution; local development)"

PAGES = {
    "ludwig-van-beethoven": "Ludwig van Beethoven",
    "jesus-christ": "Jesus",
    "moses": "Moses",
    "gautama-buddha": "The Buddha",
    "confucius": "Confucius",
    "laozi": "Laozi",
    "zoroaster": "Zoroaster",
    "wolfgang-amadeus-mozart": "Wolfgang Amadeus Mozart",
    "freddie-mercury": "Freddie Mercury",
    "audrey-hepburn": "Audrey Hepburn",
    "bruce-lee": "Bruce Lee",
    "pele": "Pelé",
    "diego-maradona": "Diego Maradona",
    "ibn-sina": "Avicenna",
    "al-khwarizmi": "Muhammad ibn Musa al-Khwarizmi",
    "ibn-khaldun": "Ibn Khaldun",
    "ibn-rushd": "Averroes",
    "saladin": "Saladin",
    "cyrus-the-great": "Cyrus the Great",
    "darius-the-great": "Darius the Great",
    "hammurabi": "Hammurabi",
    "cleopatra": "Cleopatra",
    "julius-caesar": "Julius Caesar",
    "augustus": "Augustus",
    "marcus-aurelius": "Marcus Aurelius",
    "plato": "Plato",
    "pythagoras": "Pythagoras",
    "archimedes": "Archimedes",
    "hippocrates": "Hippocrates",
    "galen": "Galen",
    "hypatia": "Hypatia",
    "sun-tzu": "Sun Tzu",
    "genghis-khan": "Genghis Khan",
    "kublai-khan": "Kublai Khan",
    "ashoka": "Ashoka",
    "akbar-the-great": "Akbar",
    "shah-jahan": "Shah Jahan",
    "babur": "Babur",
    "mehmed-the-conqueror": "Mehmed II",
    "suleiman-the-magnificent": "Suleiman the Magnificent",
    "joan-of-arc": "Joan of Arc",
    "charlemagne": "Charlemagne",
    "richard-the-lionheart": "Richard I of England",
    "william-the-conqueror": "William the Conqueror",
    "elizabeth-i": "Elizabeth I",
    "queen-victoria": "Queen Victoria",
    "napoleon-bonaparte": "Napoleon",
    "george-washington": "George Washington",
    "abraham-lincoln": "Abraham Lincoln",
    "nelson-mandela": "Nelson Mandela",
    "mahatma-gandhi": "Mahatma Gandhi",
    "martin-luther-king-jr": "Martin Luther King Jr.",
    "winston-churchill": "Winston Churchill",
    "mustafa-kemal-ataturk": "Mustafa Kemal Atatürk",
    "simon-bolivar": "Simón Bolívar",
    "toussaint-louverture": "Toussaint Louverture",
    "frederick-douglass": "Frederick Douglass",
    "harriet-tubman": "Harriet Tubman",
    "florence-nightingale": "Florence Nightingale",
    "ada-lovelace": "Ada Lovelace",
    "charles-darwin": "Charles Darwin",
    "galileo-galilei": "Galileo Galilei",
    "nicolaus-copernicus": "Nicolaus Copernicus",
    "johannes-kepler": "Johannes Kepler",
    "louis-pasteur": "Louis Pasteur",
    "michael-faraday": "Michael Faraday",
    "james-clerk-maxwell": "James Clerk Maxwell",
    "niels-bohr": "Niels Bohr",
    "max-planck": "Max Planck",
    "richard-feynman": "Richard Feynman",
    "rosalind-franklin": "Rosalind Franklin",
    "katherine-johnson": "Katherine Johnson",
    "rabindranath-tagore": "Rabindranath Tagore",
    "omar-khayyam": "Omar Khayyam",
    "hafez": "Hafez",
    "ferdowsi": "Ferdowsi",
    "saadi-shirazi": "Saadi Shirazi",
    "johann-wolfgang-von-goethe": "Johann Wolfgang von Goethe",
    "jane-austen": "Jane Austen",
    "frida-kahlo": "Frida Kahlo",
}


def get_json(base: str, params: dict[str, str]) -> dict:
    url = f"{base}?{urllib.parse.urlencode(params)}"
    for attempt in range(6):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 5:
                raise
            retry_after = int(error.headers.get("Retry-After", "3"))
            time.sleep(max(retry_after, 2**attempt))
    raise RuntimeError("Wikimedia request failed after retries")


def get_bytes(url: str) -> bytes:
    for attempt in range(4):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=75) as response:
                return response.read()
        except (TimeoutError, urllib.error.URLError):
            if attempt == 3:
                raise
            time.sleep(2**attempt)
    raise RuntimeError("Image download failed after retries")


def fetch_page(title: str) -> dict | None:
    data = get_json(
        "https://en.wikipedia.org/w/api.php",
        {
            "action": "query",
            "format": "json",
            "formatversion": "2",
            "redirects": "1",
            "prop": "pageimages",
            "piprop": "thumbnail|original|name",
            "pithumbsize": "900",
            "titles": title,
        },
    )
    page = data.get("query", {}).get("pages", [{}])[0]
    if page.get("missing") is True or not page.get("thumbnail"):
        return None
    return page


def clean_metadata(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", html.unescape(value or ""))
    return re.sub(r"\s+", " ", value).strip().replace("|", "–")


def commons_metadata(filename: str) -> dict | None:
    data = get_json(
        "https://commons.wikimedia.org/w/api.php",
        {
            "action": "query",
            "format": "json",
            "formatversion": "2",
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "iiurlwidth": "900",
            "titles": f"File:{filename}",
        },
    )
    page = data.get("query", {}).get("pages", [{}])[0]
    info = (page.get("imageinfo") or [None])[0]
    if not info:
        return None
    metadata = info.get("extmetadata", {})
    license_name = clean_metadata(metadata.get("LicenseShortName", {}).get("value", ""))
    allowed = license_name == "Public domain" or license_name == "CC0" or license_name.startswith("CC BY")
    if not allowed:
        return None
    return {
        "url": info.get("thumburl") or info.get("url"),
        "description_url": info.get("descriptionurl"),
        "artist": clean_metadata(metadata.get("Artist", {}).get("value", "Unknown")),
        "license": license_name,
        "license_url": clean_metadata(metadata.get("LicenseUrl", {}).get("value", "")),
    }


def square_jpeg(raw: bytes, destination: Path) -> str:
    with Image.open(io.BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        width, height = image.size
        side = min(width, height)
        left = max(0, (width - side) // 2)
        top = max(0, int((height - side) * 0.2))
        image = image.crop((left, top, left + side, top + side))
        image = image.resize((512, 512), Image.Resampling.LANCZOS)
        image.save(destination, "JPEG", quality=88, optimize=True, progressive=True)
    return hashlib.sha256(destination.read_bytes()).hexdigest()


def fetch_one(item: tuple[str, str]) -> tuple[str, str, dict | None, str | None]:
    slug, title = item
    try:
        page = fetch_page(title)
        if not page or not page.get("pageimage"):
            return slug, title, None, "No page image"
        metadata = commons_metadata(page["pageimage"])
        if not metadata or not metadata.get("url"):
            return slug, title, None, "No reusable Commons image metadata"
        destination = OUTPUT / f"{slug}.jpg"
        sha256 = square_jpeg(get_bytes(metadata["url"]), destination)
        return slug, title, {**metadata, "filename": page["pageimage"], "sha256": sha256}, None
    except Exception as error:
        return slug, title, None, str(error)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source_rows: list[str] = []
    failures: list[tuple[str, str]] = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(fetch_one, item) for item in PAGES.items()]
        for index, future in enumerate(as_completed(futures), start=1):
            slug, title, metadata, error = future.result()
            if error or not metadata:
                failures.append((slug, error or "Unknown error"))
                continue
            page_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
            license_text = metadata["license"]
            if metadata["license_url"]:
                license_text = f"[{license_text}]({metadata['license_url']})"
            source_rows.append(f"| {slug} | [{title}]({page_url}) | [{metadata['filename']}]({metadata['description_url']}) | {metadata['artist']} | {license_text} | `{metadata['sha256'][:12]}` |")
            print(f"[{index:02d}/{len(PAGES)}] {slug}")

    lines = [
        "# Historical persona portrait sources",
        "",
        "Portraits are normalized local copies of the lead images from the linked Wikipedia pages. Image authorship and license details are recorded below.",
        "",
        "All local files are center-cropped, resized to 512×512, and converted to JPEG. Licenses were restricted to Public Domain, CC0, CC BY, and CC BY-SA at download time.",
        "",
        "| Persona slug | Subject page | Commons file | Creator | License | SHA-256 |",
        "| --- | --- | --- | --- | --- | --- |",
        *sorted(source_rows),
    ]
    if failures:
        lines.extend(["", "## Missing", "", *[f"- `{slug}`: {reason}" for slug, reason in failures]])
    SOURCES.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Downloaded {len(source_rows)} portraits; {len(failures)} missing.")
    if failures:
        print("Missing:", ", ".join(slug for slug, _ in failures))


if __name__ == "__main__":
    main()
