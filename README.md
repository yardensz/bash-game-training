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
- Free practice, searchable command reference, command history, filesystem
  inspector, light/dark themes, responsive English LTR interface.
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

## Mission Control update

The desktop interface fits a single viewport (1000px+ wide). The numbered
mission map, objective, terminal input, XP, and reward bar remain visible;
long explanations and terminal history scroll inside their panels. Mobile
layouts stack naturally. Each objective includes explicit steps and a visible
success condition.

Successful commands immediately open the next mission and keep keyboard focus
in the terminal. The reward bar preserves the last completion and the terminal
keeps its final output. Every six missions restores a station system and unlocks
a badge. Each mission awards XP only once. Stars: 3 for independent completion,
2 with a hint, 1 with the solution. Errors never penalize the learner; replaying
can improve the saved star rating.

Keyboard: Enter runs commands, Up/Down browse history, F1 shows a hint, F2 opens
the guide, F3 opens files, Escape closes dialogs/returns focus, Alt+Left/Right
visits unlocked missions, and Alt+R restarts the current workspace.
