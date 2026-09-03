# LOCKSTEP — Devpost submission pack

Everything below is ready to paste. Fill the three blanks marked `<<< >>>`.

---

## 1. Project name

**Lockstep**

## 2. Tagline (one line)

> A co-op puzzle game you play *with* an AI agent — coloured doors mean neither of you can finish alone.

---

## 3. Elevator pitch (short description)

> Lockstep is a 2D co-op puzzle. You move the human; an AI agent moves the robot. Doors only open while someone stands on the matching pressure plate, so the two of you have to cooperate — and the agent has no tool to move you, so it has to *ask*. It plays through six WebMCP tools instead of screenshotting the page.

---

## 4. Full description

**Paste this into the main description field.**

### The idea

Almost every agentic web demo is an agent doing a chore *for* you — booking, filling, buying. Lockstep asks a different question: what does it feel like to be **in a room with an agent**, both acting on the same live page at the same time?

It's a co-op puzzle game. You control the human character. An AI agent controls the robot. Coloured doors stay shut unless a human or robot is standing on a pressure plate of the same colour — so the two of you are physically interlocked. A solver verifies every level: **the human cannot reach their goal if the robot never moves.** Cooperation isn't flavour text, it's a hard constraint of the level geometry.

The agent gets six tools. It can read the board, move the robot, ask for a hint, reset, change level, and **speak to you**. What it cannot do — deliberately — is move your character. There is no tool for that. So when it needs you on a plate, it has to say so, and wait.

### Why WebMCP specifically

**A backend MCP server can't play this game.** The state lives in a browser tab, in front of a human who is playing at the same instant. There's no server to connect to and no way to share a screen.

**A screenshot-driven browser agent plays this badly.** It would have to infer from pixels that an amber tile is a door, that an outlined square is a plate, and that the two are causally linked. `get_game_state` just tells it — an ASCII board, a legend, an explicit rule string, and the robot's currently legal moves. That's the WebMCP thesis in miniature: sites should *declare* their semantics, not force agents to reverse-engineer them from a rendering.

**And `say` closes the loop.** Because the agent can't move you, it must negotiate. That two-way exchange — agent acts, agent asks, human answers, agent re-plans — needs both parties co-present in the same authenticated DOM. WebMCP is the only thing that puts them there.

### How it improves the user experience

Ordinary agent-on-web interaction is a black box: you hand over control, something happens, you hope it was right. Lockstep makes the whole exchange legible and, more importantly, **mutual**.

- Every tool call the agent makes appears live in a side panel, in plain language, timestamped.
- The agent's requests to you appear as a speech bubble on the board, not buried in a chat log.
- When the agent is waiting on you, your character visibly pulses and the target tile is marked.
- You can stop the agent mid-plan; it re-plans from wherever you've both ended up rather than replaying a stale script.

That last point matters. The agent recomputes an optimal joint solution after *every* state change, so it never assumes you did what it asked. Wander off and it adapts.

### What becomes possible that wasn't before

A genuine **shared-agency interface** — a page where a human and an agent both hold controls, with the affordances split so that neither side is sufficient alone.

That pattern generalises well beyond a puzzle. It's the shape of any high-stakes agentic workflow: agent handles reach and speed, human holds the actions that need a person, and the two negotiate in the same view. Lockstep is the smallest, most legible version of that idea I could build — a game you can grasp in twenty seconds that demonstrates a UX primitive worth stealing.

### How I built it

Vanilla JavaScript, no framework, no build step, five static files. Deployed on Vercel.

- **`levels.js`** — level data, movement rules, and a joint breadth-first solver over the combined `(human, robot)` state space. It's isomorphic, so the levels are unit-testable from Node; I used that to verify every level is solvable *and* that no level is solvable single-handed.
- **`game.js`** — engine, DOM-grid renderer, keyboard/D-pad input, and a built-in agent that drives the same public API (`window.LS`) the tools call. That means the demo runs identically whether a real agent is attached or not.
- **`webmcp.js`** — the six tool definitions, each with a JSON schema and a description written for a model rather than a developer. Registration is defensive: it tries `navigator.modelContext.provideContext`, `.registerTool`, `.registerTools`, `window.agent`, and `document.modelContext`, then retries for ten seconds, so it survives API drift between browsers.

The design decision I'd defend hardest: **the tool descriptions carry the game rules.** `get_game_state` returns a `rule` field in prose — "a coloured door is open ONLY while a human or robot stands on a plate of the same colour." An agent that has never seen this game can play it correctly on the first attempt, because the page taught it how.

### Challenges

Getting the built-in agent to feel like a *partner* rather than a cutscene. Early versions solved the whole level themselves. The fix was to have it compute the joint solution but execute only its own moves — then stop, mark your tile, and wait. That single constraint turned a demo into a game.

### What's next

More mechanics that force asymmetry — one-way tiles the robot can't sense, tiles only the human can read. Timed levels where the agent's latency becomes part of the puzzle. And a two-agent mode, because the tool surface doesn't actually care who's holding it.

---

## 5. Built with

`javascript` `html` `css` `webmcp` `model-context-protocol` `vercel` `vanilla-js` `bfs` `game-design`

---

## 6. Links

- **Live demo:** `<<< your Vercel URL >>>`
- **Repo:** `<<< your GitHub URL >>>`
- **Video:** `<<< your YouTube URL >>>`

---

## 7. Video script — target 2:20

Record in one take if you can. Screen capture at 1080p, browser at ~1400px wide so the board and the tool-call panel are both readable.

### 0:00 – 0:18 — The hook

> "Most agentic web demos are an agent doing a chore for you. I wanted to know what it feels like to be in a room with one."
>
> *(Intro screen on-screen.)*
>
> "This is Lockstep. I move the human. An AI agent moves the robot. And the doors are the catch."

### 0:18 – 0:50 — Level 1, show the constraint

*Click "Play with the built-in agent." Let it move. Then:*

> "Red door, red plate. It's shut, and it stays shut unless someone's standing on the plate. The robot is walking to it now."
>
> *(Robot lands on plate — door visibly opens.)*
>
> "There. And notice what the agent just did — it stopped."

*Point at the pulsing human character and the marked tile.*

> "It has no tool to move me. There is no such tool. So it has to ask."

*Move through the open door. Finish level 1.*

### 0:50 – 1:30 — The tool panel

*Scroll the right-hand panel.*

> "Everything it did is here. `get_game_state`, `move_robot`, `say`. Six tools, and this is the important one —"

*Expand the tools list, hover `get_game_state`.*

> "It returns an ASCII board with a legend and the actual rule in plain English. The agent doesn't squint at a screenshot trying to work out that amber means door. The page just tells it. That's the whole WebMCP argument in one function."

### 1:30 – 2:05 — Level 3, the real thing

*Jump to level 3, start the agent.*

> "Level three needs me to walk into the robot's corridor, stand on its plate to hold the door, then get out of its way before it can pass."
>
> *(Play it through with the agent.)*
>
> "And if I ignore it — watch."

*Deliberately walk the wrong way for two moves.*

> "It re-plans. It's not replaying a script, it recomputes the optimal joint solution after every single move either of us makes."

*Finish the level. Win card appears.*

### 2:05 – 2:20 — The close

> "A backend MCP server couldn't play this — there's no shared screen. A screenshot agent couldn't play it well — there's no structure to read. It only works because WebMCP puts both of us in the same tab, holding different halves of the controls."
>
> "Agents don't just need access to our websites. Sometimes they need to be in them, with us."

---

## 8. Pre-submit checklist

- [ ] Deployed to Vercel; opened the live URL in a fresh browser and completed level 1
- [ ] Repo is **public** with the MIT `LICENSE` file included
- [ ] Video is **public** on YouTube, **under 3 minutes**, **has audio**
- [ ] Description covers all four required points — WebMCP fit, UX improvement, new capability, implementation *(the full description above does)*
- [ ] Live URL, repo URL, and video URL all pasted into Devpost
- [ ] Submitted **before** the deadline — don't leave it to the final ten minutes
