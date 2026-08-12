"""One-off downloader for the DeepLearning.AI course listing page.

RUN THIS ON A MACHINE WITH A REAL BROWSER AND A RESIDENTIAL IP (e.g. your
Windows laptop) — NOT in a datacenter/cloud environment. The site sits behind
a Cloudflare managed challenge that blocks datacenter IPs outright, and this
script needs an on-screen browser window so you can clear the challenge by
hand if one appears.

Opens the courses page in a real, headed browser (your installed Chrome by
default), pauses so you can complete any Cloudflare verification, then saves
the fully rendered HTML to scrapers/input/deeplearning_ai_courses.html — the
exact file scrapers/deeplearning_ai.py expects to parse.

Usage:
    uv run --with playwright python scrapers/fetch_deeplearning_ai.py

    (first run only, if you don't already have Chrome installed:
     uv run --with playwright playwright install chromium
     then add --channel chromium)
"""

import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright

SCRAPERS_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = SCRAPERS_DIR / "input" / "deeplearning_ai_courses.html"
COURSES_URL = "https://www.deeplearning.ai/courses/"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=COURSES_URL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--channel",
        default="chrome",
        help="Browser channel Playwright should launch: 'chrome' (your real "
        "installed Chrome, default) or 'chromium' (Playwright's bundled "
        "browser — requires `playwright install chromium` first).",
    )
    args = parser.parse_args()

    with sync_playwright() as p:
        browser = p.chromium.launch(channel=args.channel, headless=False)
        page = browser.new_page()
        print(f"Opening {args.url} ...")
        page.goto(args.url, wait_until="domcontentloaded")

        print()
        print("If a Cloudflare 'Verify you are human' check appears, complete")
        print("it in the browser window now.")
        print()
        input("Once the actual course listing is visible on the page, press Enter here to save it... ")

        try:
            page.wait_for_load_state("networkidle", timeout=10_000)
        except Exception:
            pass  # best-effort; we save whatever is rendered regardless

        html = page.content()
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(html, encoding="utf-8")
        print(f"Saved {len(html):,} chars -> {args.output}")

        browser.close()


if __name__ == "__main__":
    main()
