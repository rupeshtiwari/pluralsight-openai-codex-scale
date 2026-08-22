#!/usr/bin/env python3
"""Deterministic terminal formatter for SupportHub demo output.

Every value shown on screen during a demo goes through this module so output is
stable, readable at recording zoom, and never truncated.

Layout contract (see the course output rules):
  - fixed 62-column content width, which stays readable at 1920x1080
  - long values wrap at word boundaries with a continuation indent; nothing is
    ever cut off or replaced with an ellipsis
  - highlighted properties are padded with blank lines so each one can be
    isolated on screen
  - output depends only on its arguments, so a rerun produces identical bytes

COLORS: the approved course palette is defined in the Pluralsight standards
document, which is not yet available in this repository. Until it is, output is
structural and uncolored. `PALETTE` below is the single place to add the
approved values; no other code needs to change.

Usage as a module:
    from fmt import box, star, section, item, verdict

Usage from a shell script:
    python3 scripts/fmt.py box "Validate the migrated ticket route" \
        "Prove the bounded migration preserved the external API contract"
    python3 scripts/fmt.py star "status" "200"
    python3 scripts/fmt.py verdict pass "All four validation gates passed"
"""

import sys
import textwrap

WIDTH = 62          # content width inside the box borders
INDENT = "  "       # left gutter for properties and sections

# Approved course colors are pending the Pluralsight standards document.
# Populate these with the approved escape sequences when it is available.
PALETTE = {
    "reset": "",
    "border": "",
    "title": "",
    "label": "",
    "value": "",
    "pass": "",
    "fail": "",
}


def _paint(text, role):
    """Wrap text in the palette entry for a role. A no-op until colors land."""
    return f"{PALETTE.get(role, '')}{text}{PALETTE['reset']}"


def _wrap(text, width):
    """Wrap without ever dropping characters. Long unbroken tokens are kept whole."""
    if not text:
        return [""]
    return textwrap.wrap(
        text,
        width=width,
        break_long_words=False,
        break_on_hyphens=False,
    ) or [""]


def box(title, *subtitle_lines):
    """A titled header box. Title and subtitles wrap; nothing is truncated."""
    inner = WIDTH - 2
    lines = []
    for line in _wrap(title, inner):
        lines.append(line)
    for sub in subtitle_lines:
        for line in _wrap(sub, inner):
            lines.append(line)

    out = [_paint("┌" + "─" * WIDTH + "┐", "border")]
    for line in lines:
        out.append(
            _paint("│", "border")
            + " " + _paint(line.ljust(inner), "title") + " "
            + _paint("│", "border")
        )
    out.append(_paint("└" + "─" * WIDTH + "┘", "border"))
    return "\n".join(out) + "\n"


def star(label, value):
    """One highlighted property, padded with a blank line for isolation on screen."""
    head = f"{INDENT}★ {label}: "
    body = str(value)
    room = WIDTH - len(head)
    chunks = _wrap(body, max(room, 20))
    out = [head + _paint(chunks[0], "value")]
    pad = " " * len(head)
    for extra in chunks[1:]:
        out.append(pad + _paint(extra, "value"))
    return "\n".join(out) + "\n\n"


def section(name):
    """A section header introducing a group of items."""
    return f"{INDENT}{_paint(name + ':', 'label')}\n\n"


def item(text):
    """One bullet inside a section."""
    head = f"{INDENT}★ "
    chunks = _wrap(str(text), WIDTH - len(head))
    out = [head + chunks[0]]
    for extra in chunks[1:]:
        out.append(" " * len(head) + extra)
    return "\n".join(out) + "\n\n"


def rule():
    return _paint("─" * (WIDTH + 2), "border") + "\n"


def verdict(ok, text):
    """A final PASS/FAIL line. `ok` may be a bool or the string 'pass'/'fail'."""
    passed = ok is True or str(ok).lower() == "pass"
    word = "PASS" if passed else "FAIL"
    return f"{INDENT}{_paint(word, 'pass' if passed else 'fail')}: {text}\n"


_COMMANDS = {
    "box": box,
    "star": star,
    "section": lambda name: section(name),
    "item": item,
    "rule": lambda: rule(),
    "verdict": verdict,
}


def main(argv):
    if len(argv) < 2 or argv[1] not in _COMMANDS:
        sys.stderr.write(
            "usage: fmt.py {box|star|section|item|rule|verdict} [args...]\n"
        )
        return 2
    sys.stdout.write(_COMMANDS[argv[1]](*argv[2:]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
