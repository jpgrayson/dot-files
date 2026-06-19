#!/usr/bin/env python3
"""Safely install dot-files to home directory."""

from collections import Counter
from pathlib import Path
import argparse
import os
import subprocess
import sys


HERE = Path(__file__).parent.absolute()

EXCLUDE = [
    HERE / "install.py",
    HERE / "README.md",
    HERE / "LICENSE.md",
    HERE / ".git",
    HERE / ".gitmodules",
    HERE / ".gitignore",
    HERE / ".jj",
]

# Outcome status -> (badge, color, category).
# fmt: off
STATUS = {
    "link":   ("link",   "green",  "change"),
    "relink": ("relink", "green",  "change"),
    "mkdir":  ("mkdir",  "green",  "change"),
    "differ": ("differ", "yellow", "warn"),
    "broken": ("broken", "yellow", "warn"),
    "error":  ("error",  "red",    "warn"),
    "ok":     ("ok",     "dim",    "noop"),
    "skip":   ("skip",   "dim",    "noop"),
}
# fmt: on

BADGE_WIDTH = max(len(badge) for badge, _, _ in STATUS.values())

ANSI = {"green": "32", "yellow": "33", "red": "31", "dim": "2", "bold": "1"}


def identical(path0, path1):
    return path0.read_bytes() == path1.read_bytes()


def git_ignored(paths):
    """Return the subset of paths that git ignores (honors .gitignore,
    .git/info/exclude, and global excludes)."""
    paths = list(paths)
    if not paths:
        return set()
    proc = subprocess.run(
        ["git", "-C", str(HERE), "check-ignore", "--stdin", "-z"],
        input="\0".join(str(p) for p in paths).encode(),
        capture_output=True,
    )
    if proc.returncode not in (0, 1):
        raise RuntimeError(f"git check-ignore failed: {proc.stderr.decode().strip()}")
    return {Path(p) for p in proc.stdout.decode().split("\0") if p}


def link_target(path):
    """Absolute path a symlink points to, resolved relative to its location."""
    return (path.parent / path.readlink()).resolve()


def link(src, dst):
    target = src.relative_to(dst.parent, walk_up=True)
    dst.symlink_to(target)


def install(src_dir, dst_dir, outcomes):
    if not dst_dir.exists():
        outcomes.append(("mkdir", dst_dir))
        dst_dir.mkdir(parents=True)
        make_links(src_dir, dst_dir, outcomes)
    elif dst_dir.is_symlink():
        outcomes.append(("skip", dst_dir))
    elif dst_dir.is_dir():
        make_links(src_dir, dst_dir, outcomes)
    else:
        outcomes.append(("error", dst_dir))


def make_links(src_dir, dst_dir, outcomes):
    children = list(src_dir.iterdir())
    ignored = git_ignored(children)
    for src in children:
        if src in EXCLUDE or src in ignored:
            continue

        dst = dst_dir / src.relative_to(src_dir)

        if src.is_dir():
            install(src, dst, outcomes)
        elif dst.is_symlink():
            if link_target(dst) == src.resolve():
                outcomes.append(("ok", dst))
            elif not dst.exists():
                outcomes.append(("broken", dst))
            elif dst.is_file() and identical(dst, src):
                dst.unlink()
                link(src, dst)
                outcomes.append(("relink", dst))
            else:
                outcomes.append(("differ", dst))
        elif not dst.exists():
            link(src, dst)
            outcomes.append(("link", dst))
        elif dst.is_file():
            if identical(dst, src):
                dst.unlink()
                link(src, dst)
                outcomes.append(("relink", dst))
            else:
                outcomes.append(("differ", dst))
        else:
            outcomes.append(("error", dst))


def tilde(path):
    """Render a path with $HOME abbreviated to ~ for compactness."""
    home = Path.home()
    if path == home:
        return "~"
    try:
        return f"~/{path.relative_to(home)}"
    except ValueError:
        return str(path)


def painter(enabled):
    def paint(text, color):
        if not enabled or color is None:
            return text
        return f"\033[{ANSI[color]}m{text}\033[0m"

    return paint


def color_enabled(mode):
    if mode == "always":
        return True
    if mode == "never":
        return False
    return sys.stdout.isatty() and os.environ.get("NO_COLOR") is None


def render(outcomes, verbose, color):
    paint = painter(color)

    groups = [("change", "Changed"), ("warn", "Needs attention")]
    if verbose:
        groups.append(("noop", "Unchanged"))

    printed = False
    for category, header in groups:
        items = sorted(
            (o for o in outcomes if STATUS[o[0]][2] == category),
            key=lambda o: str(o[1]),
        )
        if not items:
            continue
        if printed:
            print()
        print(paint(header, "bold"))
        for status, path in items:
            badge, color_name, _ = STATUS[status]
            tag = paint(f"{badge:<{BADGE_WIDTH}}", color_name)
            print(f"  {tag}  {tilde(path)}")
        printed = True

    counts = Counter(status for status, _ in outcomes)
    parts = [
        paint(f"{counts[status]} {badge}", color_name)
        for status, (badge, color_name, _) in STATUS.items()
        if counts[status]
    ]
    summary = "  ".join(parts) if parts else paint("nothing to do", "dim")
    if printed:
        print()
    print(summary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "dst",
        metavar="DIR",
        nargs="?",
        default=Path.home(),
        type=Path,
        help="Installation destination. Default: %(default)s",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Also list unchanged entries.",
    )
    parser.add_argument(
        "--color",
        choices=["auto", "always", "never"],
        default="auto",
        help="Colorize output. Default: %(default)s",
    )
    args = parser.parse_args()

    outcomes = []
    install(HERE, args.dst, outcomes)
    render(outcomes, args.verbose, color_enabled(args.color))


if __name__ == "__main__":
    main()
