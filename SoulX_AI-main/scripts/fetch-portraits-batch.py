"""Resolve portrait metadata in batches, download missing images, and write attribution."""

from __future__ import annotations

import importlib.util
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("portrait_source", ROOT / "scripts" / "fetch-historical-portraits.py")
source = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(source)


def chunks(items, size=45):
    items = list(items)
    for index in range(0, len(items), size):
        yield items[index:index + size]


def resolve_pages():
    title_to_slug = {title: slug for slug, title in source.PAGES.items()}
    resolved = {}
    for batch in chunks(source.PAGES.values()):
        data = source.get_json(
            "https://en.wikipedia.org/w/api.php",
            {
                "action": "query", "format": "json", "formatversion": "2", "redirects": "1",
                "prop": "pageimages", "piprop": "thumbnail|name", "pithumbsize": "900", "titles": "|".join(batch),
            },
        )
        redirects = {item["to"]: item["from"] for item in data.get("query", {}).get("redirects", [])}
        normalized = {item["to"]: item["from"] for item in data.get("query", {}).get("normalized", [])}
        for page in data.get("query", {}).get("pages", []):
            title = page.get("title", "")
            original = redirects.get(title, normalized.get(title, title))
            slug = title_to_slug.get(title) or title_to_slug.get(original)
            if slug and page.get("pageimage"):
                resolved[page["pageimage"]] = {"slug": slug, "title": title, "page": page}
    return resolved


def resolve_commons(page_images):
    metadata = {}
    for batch in chunks(page_images):
        data = source.get_json(
            "https://commons.wikimedia.org/w/api.php",
            {
                "action": "query", "format": "json", "formatversion": "2", "redirects": "1",
                "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": "900",
                "titles": "|".join(f"File:{name}" for name in batch),
            },
        )
        for page in data.get("query", {}).get("pages", []):
            info = (page.get("imageinfo") or [None])[0]
            if not info:
                continue
            filename = page.get("title", "").removeprefix("File:").replace(" ", "_")
            ext = info.get("extmetadata", {})
            license_name = source.clean_metadata(ext.get("LicenseShortName", {}).get("value", ""))
            reusable = license_name == "Public domain" or license_name == "CC0" or license_name.startswith("CC BY")
            if reusable:
                metadata[filename] = {
                    "url": info.get("thumburl") or info.get("url"),
                    "description_url": info.get("descriptionurl", ""),
                    "artist": source.clean_metadata(ext.get("Artist", {}).get("value", "Unknown")),
                    "license": license_name,
                    "license_url": source.clean_metadata(ext.get("LicenseUrl", {}).get("value", "")),
                }
    return metadata


def download(item):
    filename, record, meta = item
    destination = source.OUTPUT / f"{record['slug']}.jpg"
    if not destination.exists() or destination.stat().st_size < 10_000:
        sha = source.square_jpeg(source.get_bytes(meta["url"]), destination)
        return record["slug"], sha, True
    import hashlib
    return record["slug"], hashlib.sha256(destination.read_bytes()).hexdigest(), False


def main():
    source.OUTPUT.mkdir(parents=True, exist_ok=True)
    pages = resolve_pages()
    commons = resolve_commons(pages.keys())
    jobs = []
    unresolved = []
    for filename, record in pages.items():
        meta = commons.get(filename.replace(" ", "_"))
        if meta:
            jobs.append((filename, record, meta))
        else:
            unresolved.append(record["slug"])

    hashes = {}
    downloaded = []
    download_failures = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(download, job) for job in jobs]
        for future in as_completed(futures):
            try:
                slug, sha, changed = future.result()
            except Exception as error:
                download_failures.append(str(error))
                continue
            hashes[slug] = sha
            if changed:
                downloaded.append(slug)
                print("downloaded", slug)

    rows = []
    for filename, record, meta in jobs:
        slug = record["slug"]
        license_text = meta["license"]
        if meta["license_url"]:
            license_text = f"[{license_text}]({meta['license_url']})"
        subject_url = "https://en.wikipedia.org/wiki/" + urllib.parse.quote(record["title"].replace(" ", "_"))
        rows.append(f"| {slug} | [{record['title']}]({subject_url}) | [{filename}]({meta['description_url']}) | {meta['artist']} | {license_text} | `{hashes.get(slug, '')[:12]}` |")

    existing_slugs = {path.stem for path in source.OUTPUT.glob("*.jpg")}
    missing_slugs = sorted(set(source.PAGES) - existing_slugs)
    lines = [
        "# Historical persona portrait sources", "",
        "Local portraits are sourced from Wikimedia Commons. They are center-cropped, resized to 512×512, and converted to JPEG for PersonaX.", "",
        "| Persona slug | Subject page | Commons file | Creator | License | SHA-256 |",
        "| --- | --- | --- | --- | --- | --- |", *sorted(rows),
    ]
    if missing_slugs:
        lines.extend(["", "## No approved lead image", "", *[f"- `{slug}`" for slug in missing_slugs]])
    source.SOURCES.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"ready={len(jobs)} downloaded={len(downloaded)} unresolved={len(missing_slugs)}")
    if missing_slugs:
        print("unresolved:", ", ".join(missing_slugs))


if __name__ == "__main__":
    main()
