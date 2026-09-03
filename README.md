# 🤖 LOCKSTEP

**A co-op puzzle game you play *with* an AI agent — not against it.**

You control the human. An AI agent controls the robot. Coloured doors only open while someone stands on the matching pressure plate, so **neither of you can finish a level alone**.

The agent doesn't screenshot the page or guess where to click. It calls `get_game_state`, `move_robot`, and `say` — real WebMCP tools this page exposes to the browser.

---

## Run it

No build step, no dependencies, no framework. Five static files.

```bash
npx serve .          # or: python3 -m http.server 8080
```

**Deploy to Vercel** — drag this folder onto [vercel.com/new](https://vercel.com/new).
Framework preset **Other** · Build command **none** · Output directory **`./`**

---

## Playing

| | |
|---|---|
| **Move** | Arrow keys, `WASD`, or the on-screen D-pad |
| **Restart level** | `R` or the ↺ button |
| **Hint** | 💡 shows the optimal next move for whoever's turn it is |

**Three ways to see the co-op loop:**

1. **▶ Let the agent play** — the built-in agent plays the robot, and *stops and asks you* when it needs you to move. It speaks to you through the same `say` tool a real agent would use.
2. **⏩ Auto-solve both** — hands-free replay of a perfect solution. Good for recording.
3. **A real WebMCP agent** — open the deployed URL in a WebMCP-capable browser. The badge flips to **WebMCP live · 6 tools**. Then say:

   > *"Play the robot and help me finish this level."*

---

## The levels

All three are verified co-dependent — a solver confirms the human **cannot** reach their goal if the robot never moves.

| # | Name | Par | The idea |
|---|---|---|---|
| 1 | Handshake | 12 | Two sealed corridors. The robot's plate opens your door. |
| 2 | Mutual | 16 | Runs both ways — your plate opens its door, its plate opens yours. |
| 3 | Crossing | 26 | A shared shaft. You must enter the robot's lane, hold its door, then get out of its way. |

---

## The 6 tools

| Tool | What the agent gets |
|---|---|
| `get_game_state` | ASCII board, legend, the plate/door rule, both positions, open doors, legal robot moves |
| `move_robot` | Moves 1–20 tiles; stops early on a wall, closed door, or the human — and says which |
| `get_hint` | Optimal next move from the current position, and whose move it is |
| `say` | Speech bubble over the board — how the agent asks you for help |
| `reset_level` | Back to the start if you both deadlock |
| `select_level` | Jump to level 1–3 |

The agent can **only** move the robot. There is no tool to move the human. That asymmetry is the whole game.

---

## Why this needs WebMCP

- **A backend MCP server can't play this.** The game state lives in the browser tab, in front of a human who is playing simultaneously. There's no server to connect to.
- **A screenshot agent can't play this well.** It would have to infer from pixels that an amber square is a door, that a ring is a plate, and that the two are linked. `get_game_state` just *says so* — with a legend and an explicit rule string. Semantic tools beat pixel-guessing.
- **`say` closes the loop.** The agent can't move you, so it has to *ask*. That's genuine human–agent negotiation inside one DOM — the thing only WebMCP makes possible.

## Architecture

```
index.html   — intro overlay · board · agent panel
styles.css   — design system, tile/door/plate rendering
levels.js    — level data, movement rules, joint BFS solver
game.js      — engine, rendering, input, built-in agent (window.LS)
webmcp.js    — the 6 tools (defensive across API shapes)
```

### Tests

A minimal DOM shim (`test-harness.js`) lets the whole game run headlessly, so the
UI wiring and the tools are actually tested rather than assumed:

```bash
node test.js     # 41 assertions
```

It verifies every level is solvable, that **no level can be solved without the robot**,
that overlays open and close, that keyboard and D-pad input move the human, that every
button fires without throwing, and that all six WebMCP tools behave — including that
stepping on the red plate really does open the red door.

`webmcp.js` tries `navigator.modelContext.provideContext`, `.registerTool`, `.registerTools`, `window.agent`, and `document.modelContext`, retrying for 10 seconds — so it survives API drift between browsers.

## License

MIT
