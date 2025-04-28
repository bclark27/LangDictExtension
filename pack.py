#!/usr/bin/env python3
"""
pack_includes.py

A “mini-webpack” that inlines (pack) or removes (unpack) file contents between special comment markers,
driven by a TOML config. Add `--unpack`/`-u` to clear included blocks when the target file exists.
"""

import argparse
import sys
import tomllib  # for Python ≥3.11; install `toml` on earlier versions and `import toml as tomllib`
import logging
from pathlib import Path
import re
from typing import Dict, List, Tuple

# -----------------------------------------------------------------------------
# Config datatypes
# -----------------------------------------------------------------------------

class IncludeRule:
    def __init__(self, pattern: str, start: str, end: str):
        self.pattern = pattern
        esc_start = re.escape(start).replace(r"\{path\}", r"(?P<path>.+?)")
        esc_end   = re.escape(end).replace(r"\{path\}", r"(?P<path>.+?)")
        self.start_re = re.compile(rf"^{esc_start}\s*$")
        self.end_re   = re.compile(rf"^{esc_end}\s*$")

# -----------------------------------------------------------------------------
# Core logic
# -----------------------------------------------------------------------------

def load_config(path: Path) -> Tuple[List[IncludeRule], bool, Path]:
    """Load and validate TOML config, returning the include rules,
    whether to do in-place edits, and the output directory (if any)."""
    with path.open("rb") as f:
        cfg = tomllib.load(f)

    items = cfg.get("item", [])
    rules = []
    for i, itm in enumerate(items):
        try:
            pat   = itm["pattern"]
            start = itm["start"]
            end   = itm["end"]
        except KeyError as e:
            raise ValueError(f"Config entry {i} missing key: {e}")
        rules.append(IncludeRule(pat, start, end))

    in_place = cfg.get("in_place", True)
    output_dir = Path(cfg.get("output_dir", "")) if not in_place else Path("")
    return rules, in_place, output_dir


def find_marker_blocks(lines: List[str], rule: IncludeRule) -> List[Tuple[int,int,str]]:
    """Return a list of (start_idx, end_idx, relpath) for each include block."""
    blocks = []
    i = 0
    while i < len(lines):
        m1 = rule.start_re.match(lines[i])
        if m1:
            relpath = m1.group("path")
            # look for matching end
            for j in range(i + 1, len(lines)):
                m2 = rule.end_re.match(lines[j])
                if m2 and m2.group("path") == relpath:
                    blocks.append((i, j, relpath))
                    i = j
                    break
            else:
                logging.warning(f"Unclosed marker at line {i+1}")
        i += 1
    return blocks


def process_file(
    src: Path,
    rules: List[IncludeRule],
    cache: Dict[Path, str],
    unpack: bool = False
) -> str:
    """Read a file, find all include blocks for matching rules,
    inline or remove their contents, and return the new text."""
    text = src.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)

    for rule in rules:
        if not src.match(rule.pattern):
            continue

        blocks = find_marker_blocks(lines, rule)
        for start_i, end_i, rel in reversed(blocks):
            inc_path = (src.parent / rel).resolve()
            # Only proceed if the referenced file exists
            if not inc_path.is_file():
                logging.info(f"Skipping missing include target: {inc_path}")
                continue

            if unpack:
                # remove all lines between markers
                lines = lines[: start_i+1] + lines[end_i:]
            else:
                if inc_path not in cache:
                    cache[inc_path] = inc_path.read_text(encoding="utf-8")
                content = cache[inc_path].splitlines(keepends=True)
                lines = (
                    lines[: start_i+1]
                    + content
                    + lines[end_i:]
                )

    return "".join(lines)


def main():
    p = argparse.ArgumentParser(
        description="Inline (pack) or clear (unpack) file contents between comment markers per TOML config."
    )
    p.add_argument("config", type=Path, help="TOML config file")
    p.add_argument(
        "target_dir", nargs="?", type=Path, default=Path("."),
        help="Directory to process (default: cwd)"
    )
    p.add_argument(
        "--unpack", "-u", action="store_true",
        help="Remove inlined content between markers if the target file exists"
    )
    p.add_argument(
        "--dry-run", action="store_true",
        help="Show what would change without writing files"
    )
    p.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable debug logging"
    )
    args = p.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s"
    )

    rules, in_place, out_dir = load_config(args.config)
    target = args.target_dir.resolve()
    if not in_place:
        out_dir = (target / out_dir).resolve()
        out_dir.mkdir(parents=True, exist_ok=True)

    cache: Dict[Path, str] = {}
    for path in target.rglob("*"):
        if not path.is_file():
            continue

        new_text = process_file(path, rules, cache, unpack=args.unpack)
        orig_text = path.read_text(encoding="utf-8")
        if new_text == orig_text:
            continue

        rel = path.relative_to(target)
        if args.dry_run:
            print(f"[dry-run] would update: {rel}")
        else:
            dest = path if in_place else (out_dir / rel)
            if not in_place:
                dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(new_text, encoding="utf-8")
            logging.info(f"Wrote: {dest}")

if __name__ == "__main__":
    main()
