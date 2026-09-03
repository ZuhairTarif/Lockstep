/* LOCKSTEP test suite — run:  node test.js
   Verifies level solvability, co-op necessity, UI wiring and the WebMCP tools. */
"use strict";
require("./test-harness.js");
const D = global.document, LS = global.window.LS, K = global.window.LOCKSTEP;
let pass = 0, fail = 0;
const ok  = (n) => { console.log("  \u2713 " + n); pass++; };
const bad = (n) => { console.log("  \u2717 " + n); fail++; };
const t   = (n, c) => { try { c() ? ok(n) : bad(n); } catch (e) { bad(n + " \u2014 " + e.message); } };

console.log("\nLEVELS");
K.LEVELS.forEach((lv, i) => {
  const m = K.parse(lv);
  const sol = K.solve(m, m.start.h, m.start.r);
  t(`L${i+1} ${lv.name} is solvable`, () => sol !== null);

  // human alone (robot frozen) must NOT be able to reach the human goal
  const r = m.start.r; let seen = {}, q = [m.start.h], reached = false;
  seen[m.start.h.x+","+m.start.h.y] = 1;
  while (q.length) {
    const c = q.shift();
    if (c.x === m.goal.h.x && c.y === m.goal.h.y) { reached = true; break; }
    for (const d of K.DIR_NAMES) {
      const nx = K.step(m, "h", d, c, r);
      if (nx) { const k = nx.h.x+","+nx.h.y; if (!seen[k]) { seen[k]=1; q.push(nx.h); } }
    }
  }
  t(`L${i+1} requires the robot (human cannot solo)`, () => !reached);
});

console.log("\nOVERLAYS");
const intro = D.getElementById("intro");
t("intro visible at boot", () => intro.hidden === false);
D.getElementById("introSolo").click();
t("intro closes on click (hidden + display:none)",
  () => intro.hidden === true && intro.style.display === "none");

console.log("\nINPUT");
LS.selectLevel(1);
const h0 = { ...LS.state.h };
D.dispatch("keydown", { key: "ArrowRight", preventDefault(){} });
t("arrow key moves the human", () => LS.state.h.x === h0.x + 1);
const dpad = D.querySelectorAll(".dbtn");
t("d-pad has 4 buttons", () => dpad.length === 4);
const before = LS.state.h.x;
dpad.find(b => b.getAttribute("data-dir") === "right").click();
t("d-pad moves the human", () => LS.state.h.x === before + 1);

console.log("\nBUTTONS (no exceptions)");
["resetBtn","prevBtn","nextBtn","hintBtn","clearLog","agentToggle","autoBoth",
 "wonReplay","wonNext","helpBtn","introSolo"].forEach(id => {
  t(id, () => { D.getElementById(id).click(); return true; });
});

console.log("\nWEBMCP TOOLS");
const tools = global.window.LOCKSTEP_TOOLS;
t("6 tools registered", () => tools.length === 6);
t("tool names correct", () => tools.map(x=>x.name).join(",") ===
  "get_game_state,move_robot,get_hint,say,reset_level,select_level");
t("every tool has an inputSchema", () => tools.every(x => x.inputSchema && x.inputSchema.type === "object"));
LS.selectLevel(1);
const st = LS.getGameState();
t("get_game_state returns a board", () => Array.isArray(st.board) && st.board.length > 0);
t("get_game_state states the door rule", () => typeof st.rule === "string" && st.rule.length > 20);
t("get_game_state lists legal robot moves", () => Array.isArray(st.robot_legal_moves));
t("doors start closed", () => st.doors.red === "closed");
const mv = LS.moveRobot("right", 3);
t("move_robot walks 3 tiles", () => mv.moved === 3);
t("standing on the red plate opens the red door", () => LS.snapshot().doors.red === "open");
t("move_robot rejects a bad direction", () => LS.moveRobot("sideways").ok === false);
t("get_hint returns a move", () => !!LS.getHint().direction);
t("say accepts a message", () => LS.say("test").ok === true);
t("select_level rejects out of range", () => LS.selectLevel(99).ok === false);

console.log("\nFULL PLAYTHROUGH");
for (let lvl = 1; lvl <= 3; lvl++) {
  LS.selectLevel(lvl);
  let n = 0;
  while (!LS.state.won && n < 300) {
    const sol = K.solve(LS.state.map, LS.state.h, LS.state.r);
    if (!sol || !sol.length) break;
    const m = sol[0];
    m.who === "r" ? LS.moveRobot(m.dir, 1) : LS.moveHuman(m.dir);
    n++;
  }
  t(`level ${lvl} completes (${LS.state.moves} moves)`, () => LS.state.won === true);
  t(`level ${lvl} shows the win overlay`, () => D.getElementById("wonOverlay").hidden === false);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
