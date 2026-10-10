#!/usr/bin/env python3
"""Send new blog posts to Buttondown subscribers.

Runs at the end of the GitHub Pages deploy workflow. Detects posts added in
the pushed commit range, extracts each post's summary (the text before
<!--more-->), composes a markdown email, and asks Buttondown to send it
immediately ("about_to_send").

Environment variables:
  BUTTONDOWN_API_KEY  API key from Buttondown settings (GitHub secret).
  GITHUB_BEFORE_SHA   SHA before the push (set by the workflow).
  SINCE_SHA           Manual diff base override (workflow_dispatch input).
  GITHUB_SHA          Deployed commit (set by the workflow).
  DRY_RUN             If set, print the email instead of sending it.
"""

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

SITE_URL = "https://jiejue.ai"
API_URL = "https://api.buttondown.com/v1/emails"
POST_PATH_RE = re.compile(r"^content/posts/.+/index\.md$")
SHA_RE = re.compile(r"^[0-9a-f]{7,40}$")


def git(*args):
    """Run a git command; returns (stdout, stderr, returncode)."""
    proc = subprocess.run(("git",) + args, capture_output=True, text=True)
    return proc.stdout, proc.stderr, proc.returncode


def find_new_posts(since, until):
    """Paths of posts added between two commits (only main index.md files,
    skipping the index_executive / index_general / index_professional variants)."""
    out, err, code = git("diff", "--name-only", "--diff-filter=A", since + ".." + until)
    if code != 0:
        print("WARNING: git diff failed (force push? bad SHA?): " + err.strip())
        return []
    return [line for line in out.splitlines() if POST_PATH_RE.match(line)]


def split_front_matter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return "", text
    return m.group(1), text[m.end():]


def fm_value(front_matter, key):
    m = re.search(r"^" + key + r":\s*['\"]?(.*?)['\"]?\s*$", front_matter, re.M)
    return m.group(1).strip() if m else ""


def parse_post(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    front_matter, body = split_front_matter(text)

    title = fm_value(front_matter, "title")
    date = fm_value(front_matter, "date")
    slug = fm_value(front_matter, "slug") or os.path.basename(os.path.dirname(path))

    dm = re.match(r"(\d{4})-(\d{2})", date)
    if dm:
        url = SITE_URL + "/" + dm.group(1) + "/" + dm.group(2) + "/" + slug + "/"
    else:
        print("WARNING: no date in front matter of " + path)
        url = SITE_URL + "/posts/"

    pieces = re.split(r"<!--\s*more\s*-->", body, maxsplit=1)
    summary = pieces[0].strip()
    if len(pieces) == 1:
        # No <!--more--> marker: fall back to the first couple of paragraphs.
        paragraphs = [p for p in summary.split("\n\n") if p.strip()][:2]
        summary = "\n\n".join(paragraphs)[:600]

    return {"title": title, "url": url, "summary": summary}


def compose_email(posts):
    if len(posts) == 1:
        subject = posts[0]["title"]
    else:
        subject = "解决笔记 · " + str(len(posts)) + " 篇新文章：" + posts[0]["title"]

    blocks = [
        "## [" + p["title"] + "](" + p["url"] + ")\n\n" + p["summary"]
        for p in posts
    ]
    body = "新的解决笔记来了：\n\n" + "\n\n---\n\n".join(blocks) + "\n\n祝好，\n董昊\n"
    return subject, body


def main():
    api_key = os.environ.get("BUTTONDOWN_API_KEY", "")
    since = os.environ.get("SINCE_SHA") or os.environ.get("GITHUB_BEFORE_SHA", "")
    until = os.environ.get("GITHUB_SHA") or "HEAD"

    if not since or not SHA_RE.match(since) or set(since) == {"0"}:
        print("No valid 'since' SHA (first push, or manual run without input); skipping.")
        return 0

    new_posts = find_new_posts(since, until)
    if not new_posts:
        print("No new posts in this push; nothing to send.")
        return 0

    posts = [parse_post(path) for path in new_posts]
    subject, body = compose_email(posts)

    if os.environ.get("DRY_RUN"):
        print("=== SUBJECT ===")
        print(subject)
        print("=== BODY ===")
        print(body)
        return 0

    if not api_key:
        print("BUTTONDOWN_API_KEY is not set; skipping.")
        return 0

    payload = json.dumps(
        {"subject": subject, "body": body, "status": "about_to_send"}
    ).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": "Token " + api_key,
            "Content-Type": "application/json",
            "X-API-Version": "2026-04-01",
            # One-time "yes, send for real" handshake; harmless afterwards.
            "X-Buttondown-Live-Dangerously": "true",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        print("Buttondown email " + str(data.get("id")) + " queued, status=" + str(data.get("status")))
    except urllib.error.HTTPError as e:
        print("Buttondown API error: HTTP " + str(e.code))
        print(e.read().decode("utf-8", "replace"))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
