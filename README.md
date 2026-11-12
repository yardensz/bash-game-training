# Bash Quest

An interactive game for learning Bash fundamentals from scratch.

**Play:** https://yardensz.github.io/bash-game-training/

## Features

- 24 sequential missions in four chapters, with explanations, examples,
  optional hints, solutions, and a final multi-command challenge.
- In-memory filesystem and a bounded shell simulator. Commands actually
  change simulated state; no code runs on the visitor's computer.
- Pipes, output redirection, simple variables, single/double quoting,
  relative/absolute paths, and basic file/text commands.
- Free practice, searchable command reference, command history, Tab
  completion, a live always-visible filesystem map, light/dark themes,
  sound effects, responsive English LTR interface.
- Completed lessons and current lesson persist in localStorage on the same
  browser. Lesson files reset when changing/restarting a lesson; XP is awarded
  only once per lesson. No login, analytics, or backend.

## Run locally

Serve this folder over HTTP (ES modules require a web server):

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. No build or dependency installation is required.
Google Fonts are optional; system fonts are the fallback.

## Test

Node.js 20+:

```sh
npm test
```

The test suite solves all 24 lessons and checks filesystem mutations, quoting,
variables, invalid input, and pipelines with newly generated content.

## Files

- `engine.js`: isolated teaching simulator, not a real Bash interpreter.
- `lessons.js`: curriculum, hints, solutions, outcome checks.
- `app.js`: interaction, progress persistence, command reference.
- `index.html`, `style.css`: accessible responsive interface.
- `tests/engine.test.js`: dependency-free regression tests.

## Deliberate limits

This is a **fundamentals course**, not full Bash emulation. No scripts, loops,
conditionals, command substitution, glob expansion, full shell word splitting,
input/stderr redirection, permissions enforcement, processes, networking,
or arbitrary executable commands. `grep` supports plain text only; `ls -l`
shows illustrative permissions, not full Unix metadata. File copy/move/remove
support files, not recursive directories. `sort` uses simple character order.
Supported options are documented in the in-app reference. Every lesson starts
from the same clean fixture so previous experiments cannot block progression.

Deploys as static files through the repository's existing GitHub Pages setup.

## Station console interface (v3)

The desktop interface fits a single viewport (1000px+ wide) as a sci-fi station
console with four always-visible panels:

- **Mission map** — four station systems, each a path of six mission nodes with
  the best star rating earned. Locked missions are dashed.
- **Mission briefing** — mission number, typed-out story line, numbered
  objective steps, a visible success condition, and a collapsible explanation.
- **Terminal** — CRT-style simulated shell. Successful missions trigger a
  "Mission complete" banner, confetti, and sound; errors shake the terminal.
- **Station map** — a live `tree`-style view of the whole simulated filesystem
  from `/`. A "YOU ARE HERE" marker and breadcrumb show the current directory;
  the path from `/` to it is highlighted. Files created or changed by the last
  command are tagged NEW / EDIT, and removals are listed below the tree.
  Hidden dot-files appear after `ls -a` or with the "hidden" toggle. Clicking a
  file or folder types its path (relative to the current directory) into the
  command line; clicking a breadcrumb types the matching `cd` command.

The heads-up display shows level (every 100 XP), XP bar, rank, total stars, a
no-help streak, and badges. Each mission awards 50 XP only once. Stars: 3 for
independent completion, 2 with a hint, 1 with the solution. Errors never
penalize the learner; replaying can improve the saved star rating. Every six
missions restores a station system and unlocks a badge. Successful commands
immediately open the next mission and keep keyboard focus in the terminal.

Dark theme is the default; light theme and sound effects can be toggled in the
header (both remembered on the device). Animations respect
`prefers-reduced-motion`. On tablets the mission map becomes a top strip; on
phones the panels stack (briefing, terminal, station map, mission map).

Keyboard: Enter runs commands, Tab completes commands, files, and folders,
Up/Down browse history, Ctrl+L clears the screen, F1 shows a hint, F2 opens the
guide, Escape closes dialogs/returns focus, Alt+Left/Right visits unlocked
missions, and Alt+R restarts the current workspace.
