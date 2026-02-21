#!/usr/bin/env python3
"""
Re-extract blog post content from the WordPress XML export,
preserving original paragraph structure, and update the
existing Astro markdown files in-place (frontmatter untouched).
"""

import xml.etree.ElementTree as ET
import re
import os
import html
import sys

WP_XML = os.path.expanduser("~/code/hologramthoughts-wp/hologramthoughts.WordPress.2025-09-18.xml")
ASTRO_BLOG_DIR = os.path.expanduser("~/code/hologramthoughts-astro/src/content/blog")

NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "wp": "http://wordpress.org/export/1.2/",
}


def wp_content_to_markdown(raw: str) -> str:
    """
    Convert WordPress post content (mix of HTML + wpautop newlines)
    to clean markdown with proper paragraph breaks.
    """
    text = raw

    # --- Handle <p> tags: convert to double-newline separated blocks ---
    # Some posts use explicit <p>...</p>
    text = re.sub(r"<p[^>]*>", "\n\n", text)
    text = re.sub(r"</p>", "\n\n", text)

    # --- Block-level elements get their own lines ---
    for tag in ["blockquote", "div", "h1", "h2", "h3", "h4", "h5", "h6",
                "ul", "ol", "li", "pre", "hr", "table", "tr", "td", "th"]:
        text = re.sub(rf"<{tag}[^>]*>", f"\n\n<{tag}>", text, flags=re.IGNORECASE)
        text = re.sub(rf"</{tag}>", f"</{tag}>\n\n", text, flags=re.IGNORECASE)

    # --- Inline HTML conversions ---
    # Bold
    text = re.sub(r"<strong[^>]*>(.*?)</strong>", r"**\1**", text, flags=re.DOTALL)
    text = re.sub(r"<b[^>]*>(.*?)</b>", r"**\1**", text, flags=re.DOTALL)
    # Italic
    text = re.sub(r"<em[^>]*>(.*?)</em>", r"*\1*", text, flags=re.DOTALL)
    text = re.sub(r"<i[^>]*>(.*?)</i>", r"*\1*", text, flags=re.DOTALL)

    # --- Links: <a href="...">text</a> -> [text](url) ---
    text = re.sub(
        r'<a\s+[^>]*href=["\']([^"\']*)["\'][^>]*>(.*?)</a>',
        r"[\2](\1)",
        text,
        flags=re.DOTALL | re.IGNORECASE,
    )

    # --- Images: <img ... src="..." alt="..." /> -> ![alt](src) ---
    def img_replace(m):
        tag = m.group(0)
        src_match = re.search(r'src=["\']([^"\']*)["\']', tag)
        alt_match = re.search(r'alt=["\']([^"\']*)["\']', tag)
        title_match = re.search(r'title=["\']([^"\']*)["\']', tag)
        src = src_match.group(1) if src_match else ""
        alt = alt_match.group(1) if alt_match else ""
        title = title_match.group(1) if title_match else ""
        if title:
            return f'![{alt}]({src} "{title}")'
        return f"![{alt}]({src})"

    text = re.sub(r"<img\s[^>]*?/?>", img_replace, text, flags=re.IGNORECASE)

    # --- Headings ---
    for level in range(1, 7):
        text = re.sub(
            rf"<h{level}[^>]*>(.*?)</h{level}>",
            lambda m, l=level: "\n\n" + "#" * l + " " + m.group(1).strip() + "\n\n",
            text,
            flags=re.DOTALL | re.IGNORECASE,
        )

    # --- Blockquotes ---
    def blockquote_replace(m):
        inner = m.group(1).strip()
        lines = inner.split("\n")
        quoted = "\n".join("> " + line for line in lines)
        return "\n\n" + quoted + "\n\n"

    text = re.sub(
        r"<blockquote[^>]*>(.*?)</blockquote>",
        blockquote_replace,
        text,
        flags=re.DOTALL | re.IGNORECASE,
    )

    # --- Lists ---
    text = re.sub(r"<li[^>]*>(.*?)</li>", r"\n- \1", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"</?[uo]l[^>]*>", "\n", text, flags=re.IGNORECASE)

    # --- Horizontal rules ---
    text = re.sub(r"<hr[^>]*/?>", "\n\n---\n\n", text, flags=re.IGNORECASE)

    # --- <br> tags -> single newline ---
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)

    # --- WordPress captions and shortcodes ---
    text = re.sub(r"\[caption[^\]]*\](.*?)\[/caption\]", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"\[/?[a-zA-Z_]+[^\]]*\]", "", text)

    # --- Strip remaining HTML tags ---
    text = re.sub(r"<[^>]+>", "", text)

    # --- Decode HTML entities ---
    text = html.unescape(text)

    # --- WordPress double-newlines are paragraph breaks ---
    # Normalize: collapse 3+ newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    # --- Clean up whitespace ---
    # Remove trailing spaces on each line
    text = re.sub(r" +\n", "\n", text)
    # Remove leading/trailing whitespace
    text = text.strip()

    return text


def extract_frontmatter(md_content: str):
    """Split an existing .md file into (frontmatter_block, body)."""
    if md_content.startswith("---"):
        parts = md_content.split("---", 2)
        if len(parts) >= 3:
            frontmatter_block = "---" + parts[1] + "---"
            body = parts[2]
            return frontmatter_block, body
    return None, md_content


def main(dry_run=False):
    print("Parsing WordPress XML...")
    tree = ET.parse(WP_XML)
    root = tree.getroot()

    # Build slug -> content map from WP XML
    wp_posts = {}
    for item in root.iter("item"):
        post_type = item.find("wp:post_type", NS)
        status = item.find("wp:status", NS)
        if (post_type is not None and post_type.text == "post"
                and status is not None and status.text == "publish"):
            slug_el = item.find("wp:post_name", NS)
            slug = slug_el.text if slug_el is not None and slug_el.text else ""
            content_el = item.find("content:encoded", NS)
            content = content_el.text if content_el is not None and content_el.text else ""
            title = item.find("title").text or ""
            if slug and content.strip():
                wp_posts[slug] = {"title": title, "content": content}

    print(f"Found {len(wp_posts)} published WP posts with content")

    # Process each Astro markdown file
    updated = 0
    skipped = 0
    no_match = 0
    unchanged = 0

    for filename in sorted(os.listdir(ASTRO_BLOG_DIR)):
        if not filename.endswith(".md"):
            continue

        filepath = os.path.join(ASTRO_BLOG_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            md_content = f.read()

        frontmatter, old_body = extract_frontmatter(md_content)
        if frontmatter is None:
            skipped += 1
            continue

        # Extract slug from frontmatter
        slug_match = re.search(r"^slug:\s*(.+)$", frontmatter, re.MULTILINE)
        if not slug_match:
            skipped += 1
            continue

        slug = slug_match.group(1).strip().strip("'\"")

        if slug not in wp_posts:
            no_match += 1
            continue

        # Convert WP content to markdown with proper paragraphs
        new_body = wp_content_to_markdown(wp_posts[slug]["content"])

        # Check if it actually changed (compare stripped versions)
        old_stripped = old_body.strip()
        if old_stripped == new_body:
            unchanged += 1
            continue

        # Count paragraph breaks to see if we actually improved things
        old_breaks = old_stripped.count("\n\n")
        new_breaks = new_body.count("\n\n")

        if new_breaks <= old_breaks:
            # New version doesn't have more paragraphs — skip
            unchanged += 1
            continue

        if dry_run:
            print(f"  WOULD UPDATE: {filename} ({old_breaks} -> {new_breaks} paragraph breaks)")
        else:
            new_content = frontmatter + "\n" + new_body + "\n"
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"  UPDATED: {filename} ({old_breaks} -> {new_breaks} paragraph breaks)")

        updated += 1

    print(f"\nDone!")
    print(f"  Updated: {updated}")
    print(f"  Unchanged: {unchanged}")
    print(f"  No WP match: {no_match}")
    print(f"  Skipped (no frontmatter/slug): {skipped}")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("=== DRY RUN MODE ===\n")
    main(dry_run=dry_run)
