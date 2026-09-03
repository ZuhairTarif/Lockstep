/* =========================================================
   LOCKSTEP — engine, rendering, input, built-in agent
   window.LS is the API that both the UI and the WebMCP
   tools in webmcp.js drive.
   ========================================================= */
(function () {
  "use strict";

  var K = window.LOCKSTEP;
  var $ = function (id) { return document.getElementById(id); };

  /* Overlay visibility helper.
     Sets BOTH the hidden attribute and an inline display, so the element stays
     hidden even if a stylesheet rule (display:grid/flex) would otherwise win,
     or if a cached stylesheet lacks the [hidden] rule. */
  function show(el) { if (!el) return; el.hidden = false; el.style.display = ""; }
  function hide(el) { if (!el) return; el.hidden = true;  el.style.display = "none"; }
  function isHidden(el) { return !el || el.hidden || el.style.display === "none"; }

  var G = {
    idx: 0,
    map: null,
    h: null, r: null,
    moves: 0, hMoves: 0, rMoves: 0,
    won: false,
    par: null,
    botOn: false,
    botTimer: null,
    hintCell: null
  };

  var boardEl = $("board"), logEl = $("log"), logEmpty = $("logEmpty");
  var pawnH = null, pawnR = null, hintEl = null;
  var TILE = 44, GAP = 3, PAD = 12;

  function px() {
    var v = getComputedStyle(document.documentElement).getPropertyValue("--tile");
    TILE = parseInt(v, 10) || 44;
  }

  /* ---------------- board ---------------- */
  function buildBoard() {
    px();
    var m = G.map;
    boardEl.innerHTML = "";
    boardEl.style.gridTemplateColumns = "repeat(" + m.w + ", " + TILE + "px)";
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        var t = m.grid[y][x];
        var c = document.createElement("div");
        c.className = "cell " + cls(t);
        c.id = "c_" + x + "_" + y;
        boardEl.appendChild(c);
      }
    }
    pawnH = document.createElement("div");
    pawnH.className = "pawn pawn--h"; pawnH.textContent = "🧑";
    pawnR = document.createElement("div");
    pawnR.className = "pawn pawn--r"; pawnR.textContent = "🤖";
    hintEl = document.createElement("div");
    hintEl.className = "hintdot"; hintEl.innerHTML = "<i></i>"; hintEl.style.display = "none";
    boardEl.appendChild(hintEl);
    boardEl.appendChild(pawnH);
    boardEl.appendChild(pawnR);
  }

  function cls(t) {
    if (t === "#") return "c-wall";
    if (t === "h") return "c-goalh";
    if (t === "r") return "c-goalr";
    if (t === "1") return "c-plate1";
    if (t === "2") return "c-plate2";
    if (t === "A") return "c-door1";
    if (t === "B") return "c-door2";
    return "c-floor";
  }

  function pos(p) {
    return { left: PAD + p.x * (TILE + GAP), top: PAD + p.y * (TILE + GAP) };
  }

  function place(el, p) {
    var q = pos(p);
    el.style.transform = "translate(" + q.left + "px," + q.top + "px)";
  }

  function render() {
    var m = G.map;
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        var t = m.grid[y][x], c = $("c_" + x + "_" + y);
        if (!c) continue;
        if (t === "A" || t === "B") {
          c.classList.toggle("open", K.doorOpen(m, t, G.h, G.r));
        } else if (t === "1" || t === "2") {
          c.classList.toggle("pressed", K.platePressed(m, t, G.h, G.r));
        }
      }
    }
    place(pawnH, G.h);
    place(pawnR, G.r);
    $("statMoves").textContent = G.moves;
    $("statBest").textContent = G.par === null ? "—" : G.par;
  }

  /* ---------------- level control ---------------- */
  function load(i, quiet) {
    stopBot(true);
    G.idx = Math.max(0, Math.min(K.LEVELS.length - 1, i));
    G.map = K.parse(K.LEVELS[G.idx]);
    G.h = { x: G.map.start.h.x, y: G.map.start.h.y };
    G.r = { x: G.map.start.r.x, y: G.map.start.r.y };
    G.moves = 0; G.hMoves = 0; G.rMoves = 0; G.won = false;
    var sol = K.solve(G.map, G.h, G.r);
    G.par = sol ? sol.length : null;

    $("lvlNum").textContent = G.idx + 1;
    $("lvlTotal").textContent = K.LEVELS.length;
    $("lvlName").textContent = G.map.name;
    $("lvlBrief").textContent = G.map.brief;
    hide($("wonOverlay"));
    $("prevBtn").disabled = G.idx === 0;
    $("nextBtn").disabled = G.idx === K.LEVELS.length - 1;
    hideHint();
    hideBubble();

    buildBoard();
    render();
    if (!quiet) say("New level. Call get_game_state and I'll work out the plan.");
    return true;
  }

  /* ---------------- movement ---------------- */
  function move(who, dir) {
    if (G.won) return { ok: false, reason: "level_already_complete" };
    var nx = K.step(G.map, who, dir, G.h, G.r);
    var pawn = who === "h" ? pawnH : pawnR;
    if (!nx) {
      pawn.classList.add("bump");
      setTimeout(function () { pawn.classList.remove("bump"); }, 220);
      return { ok: false, reason: blockedReason(who, dir) };
    }
    G.h = nx.h; G.r = nx.r;
    G.moves++;
    if (who === "h") G.hMoves++; else G.rMoves++;
    hideHint();
    render();
    if (K.isWin(G.map, G.h, G.r)) win();
    return { ok: true };
  }

  function blockedReason(who, dir) {
    var d = K.DIRS[dir];
    var p = who === "h" ? G.h : G.r;
    var tx = p.x + d.dx, ty = p.y + d.dy;
    var t = K.tileAt(G.map, tx, ty);
    if (t === "#") return "wall";
    if (t === "A" || t === "B") return "door_closed";
    var other = who === "h" ? G.r : G.h;
    if (other.x === tx && other.y === ty) return "occupied_by_partner";
    return "blocked";
  }

  function win() {
    G.won = true;
    stopBot(true);
    $("wonMoves").textContent = G.moves;
    $("wonHuman").textContent = G.hMoves;
    $("wonRobot").textContent = G.rMoves;
    var last = G.idx === K.LEVELS.length - 1;
    $("wonTitle").textContent = last ? "All levels clear" : "Level complete";
    $("wonSub").textContent = last
      ? "Three puzzles, neither of you could solve alone."
      : "You and the agent got there together.";
    $("wonNext").textContent = last ? "Back to level 1" : "Next level →";
    show($("wonOverlay"));
    addLog("submit_result", "Both goals occupied. Level <b>" + G.map.name + "</b> solved in <code>" + G.moves + "</code> moves.", "win");
    say("We did it. " + G.rMoves + " moves from me, " + G.hMoves + " from you.");
    toast("✓ Level complete", "ok");
  }

  /* ---------------- hint ---------------- */
  function showHintFor(whoFilter) {
    var sol = K.solve(G.map, G.h, G.r);
    if (!sol || !sol.length) return null;
    var mv = null;
    for (var i = 0; i < sol.length; i++) {
      if (!whoFilter || sol[i].who === whoFilter) { mv = sol[i]; break; }
    }
    if (!mv) return null;
    var p = mv.who === "h" ? G.h : G.r;
    var d = K.DIRS[mv.dir];
    hintEl.style.display = "";
    place(hintEl, { x: p.x + d.dx, y: p.y + d.dy });
    G.hintCell = mv;
    return mv;
  }
  function hideHint() { if (hintEl) hintEl.style.display = "none"; G.hintCell = null; }

  /* ---------------- agent speech ---------------- */
  var bubbleT = null;
  function say(msg) {
    $("agentSays").textContent = msg;
    var b = $("bubble");
    b.textContent = "🤖 " + msg;
    show(b);
    clearTimeout(bubbleT);
    bubbleT = setTimeout(function () { hide(b); }, 3400);
  }
  function hideBubble() { hide($("bubble")); }

  /* ---------------- log ---------------- */
  function addLog(tool, body, tag) {
    logEmpty.style.display = "none";
    var tags = { move:"tag--move", read:"tag--read", block:"tag--block", win:"tag--win" };
    var e = document.createElement("div");
    e.className = "entry";
    e.innerHTML =
      '<div class="entry__top"><span class="entry__tool">' + tool + "()</span>" +
      (tag ? '<span class="tag ' + (tags[tag] || "") + '">' + tag + "</span>" : "") +
      '<span class="entry__time">' + new Date().toLocaleTimeString([], { hour12:false }) + "</span></div>" +
      '<div class="entry__body">' + body + "</div>";
    logEl.appendChild(e);
    logEl.scrollTop = logEl.scrollHeight;
    while (logEl.children.length > 60) logEl.removeChild(logEl.children[1]);
  }

  var toastT = null;
  function toast(msg, kind) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (kind ? " toast--" + kind : "");
    show(t);
    clearTimeout(toastT);
    toastT = setTimeout(function () { hide(t); }, 2600);
  }

  /* ---------------- ASCII view for agents ---------------- */
  function ascii() {
    var m = G.map, out = [];
    for (var y = 0; y < m.h; y++) {
      var s = "";
      for (var x = 0; x < m.w; x++) {
        if (G.h.x === x && G.h.y === y) { s += "H"; continue; }
        if (G.r.x === x && G.r.y === y) { s += "R"; continue; }
        var t = m.grid[y][x];
        if ((t === "A" || t === "B") && K.doorOpen(m, t, G.h, G.r)) s += "/";
        else s += t;
      }
      out.push(s);
    }
    return out;
  }

  function legal(who) {
    var out = [];
    for (var i = 0; i < K.DIR_NAMES.length; i++) {
      var d = K.DIR_NAMES[i];
      if (K.step(G.map, who, d, G.h, G.r)) out.push(d);
    }
    return out;
  }

  function snapshot() {
    var m = G.map;
    return {
      level: G.idx + 1,
      level_name: m.name,
      goal: "Move the robot (R) onto its goal 'r' while the human (H) reaches 'h'. Both must be on their goals at the same time.",
      legend: {
        "#": "wall", ".": "floor", "H": "human (controlled by the person)",
        "R": "robot (controlled by YOU)", "h": "human goal", "r": "robot goal",
        "1": "red plate", "A": "red door (closed)", "2": "blue plate",
        "B": "blue door (closed)", "/": "an open door you may walk through"
      },
      rule: "A coloured door is open ONLY while a human or robot is standing on a plate of the same colour. Step off the plate and it shuts.",
      board: ascii(),
      robot: { x: G.r.x, y: G.r.y },
      human: { x: G.h.x, y: G.h.y },
      robot_goal: m.goal.r,
      human_goal: m.goal.h,
      doors: {
        red: K.platePressed(m, "1", G.h, G.r) ? "open" : "closed",
        blue: K.platePressed(m, "2", G.h, G.r) ? "open" : "closed"
      },
      robot_legal_moves: legal("r"),
      moves_made: G.moves,
      solved: G.won
    };
  }

  /* ---------------- built-in agent ---------------- */
  function botStep() {
    if (!G.botOn || G.won) return;
    var sol = K.solve(G.map, G.h, G.r);
    if (!sol) {
      say("This position is stuck — try restarting the level.");
      addLog("get_game_state", "No solution from here. Suggesting a restart.", "block");
      stopBot();
      return;
    }
    if (!sol.length) return;
    var next = sol[0];

    if (next.who === "r") {
      addLog("move_robot", 'Moving <code>' + next.dir + "</code>. " + sol.length + " moves left in my plan.", "move");
      move("r", next.dir);
      $("agentMode").textContent = "playing";
      pawnH.classList.remove("turn");
      hideHint();
      G.botTimer = setTimeout(botStep, 420);
    } else {
      // it's the human's move — wait, and nudge
      $("agentMode").textContent = "waiting for you";
      pawnH.classList.add("turn");
      showHintFor("h");
      say(nudge(next.dir));
      addLog("get_game_state", "Read the board. It's <b>your</b> move \u2014 I've marked where to step.", "read");
      G.botTimer = setTimeout(botStep, 900);
    }
  }

  var NUDGES = [
    "Your turn — step {d}, I'll hold this door.",
    "I can't move until you go {d}.",
    "Head {d}. I need you off my lane.",
    "Step {d} and the plate does the rest."
  ];
  var nudgeI = 0;
  function nudge(dir) {
    var s = NUDGES[nudgeI++ % NUDGES.length];
    return s.replace("{d}", dir);
  }

  function startBot() {
    if (G.won) return;
    G.botOn = true;
    $("agentToggle").textContent = "■ Stop the agent";
    $("agentToggle").classList.remove("btn--primary");
    $("agentToggle").classList.add("btn--stop");
    $("agentMode").textContent = "playing";
    $("agentMode").classList.add("live");
    addLog("get_game_state", "Read board <code>" + G.map.name + "</code>. Planning the robot's route.", "read");
    say("Reading the board…");
    clearTimeout(G.botTimer);
    G.botTimer = setTimeout(botStep, 500);
  }

  function stopBot(silent) {
    G.botOn = false;
    clearTimeout(G.botTimer);
    if (pawnH) pawnH.classList.remove("turn");
    var b = $("agentToggle");
    if (b) {
      b.textContent = "▶ Let the agent play";
      b.classList.add("btn--primary");
      b.classList.remove("btn--stop");
    }
    var m = $("agentMode");
    if (m) { m.textContent = "idle"; m.classList.remove("live"); }
    if (!silent) say("Stopped. Restart me whenever.");
  }

  /* auto-solve both sides — for hands-free demo/video */
  function autoBoth() {
    stopBot(true);
    if (G.won) return;
    $("agentMode").textContent = "auto-solving";
    $("agentMode").classList.add("live");
    var run = function () {
      if (G.won) { $("agentMode").textContent = "idle"; $("agentMode").classList.remove("live"); return; }
      var sol = K.solve(G.map, G.h, G.r);
      if (!sol || !sol.length) { $("agentMode").textContent = "idle"; return; }
      var n = sol[0];
      if (n.who === "r") addLog("move_robot", "Moving <code>" + n.dir + "</code>.", "move");
      move(n.who, n.dir);
      G.botTimer = setTimeout(run, 300);
    };
    clearTimeout(G.botTimer);
    G.botTimer = setTimeout(run, 250);
  }

  /* =========================================================
     public API
     ========================================================= */
  var LS = {
    state: G,
    snapshot: snapshot,
    ascii: ascii,
    legalMoves: legal,

    getGameState: function () {
      addLog("get_game_state", "Returned the board, both positions and <code>" + legal("r").length + "</code> legal robot moves.", "read");
      return snapshot();
    },

    moveRobot: function (dir, steps) {
      dir = String(dir || "").toLowerCase();
      if (!K.DIRS[dir]) return { ok:false, error:"direction must be up, down, left or right", state: snapshot() };
      steps = Math.max(1, Math.min(20, parseInt(steps, 10) || 1));
      stopBot(true);
      var done = 0, stopped = null;
      for (var i = 0; i < steps; i++) {
        var r = move("r", dir);
        if (!r.ok) { stopped = r.reason; break; }
        done++;
        if (G.won) break;
      }
      addLog("move_robot",
        "Moved <code>" + dir + "</code> \u00D7" + done + (stopped ? " then hit <b>" + stopped + "</b>" : "") + ".",
        stopped ? "block" : "move");
      return { ok: done > 0, moved: done, stopped_by: stopped, solved: G.won, state: snapshot() };
    },

    moveHuman: function (dir) {
      dir = String(dir || "").toLowerCase();
      if (!K.DIRS[dir]) return { ok:false, error:"bad direction" };
      var r = move("h", dir);
      return { ok: r.ok, reason: r.reason, solved: G.won, state: snapshot() };
    },

    getHint: function () {
      var mv = showHintFor(null);
      if (!mv) { addLog("get_hint", "No solution from this position.", "block"); return { hint:null, message:"no solution from here \u2014 reset the level" }; }
      var sol = K.solve(G.map, G.h, G.r);
      addLog("get_hint", "Optimal next move: <b>" + (mv.who === "r" ? "robot" : "human") + "</b> \u2192 <code>" + mv.dir + "</code>.", "read");
      return { who: mv.who === "r" ? "robot" : "human", direction: mv.dir, moves_remaining: sol.length };
    },

    resetLevel: function () {
      load(G.idx, true);
      addLog("reset_level", "Level <b>" + G.map.name + "</b> reset to its starting position.", "read");
      return { ok:true, state: snapshot() };
    },

    selectLevel: function (n) {
      n = parseInt(n, 10);
      if (isNaN(n) || n < 1 || n > K.LEVELS.length)
        return { ok:false, error:"level must be 1.." + K.LEVELS.length };
      load(n - 1, true);
      addLog("select_level", "Loaded level <b>" + n + " \u2014 " + G.map.name + "</b>.", "read");
      return { ok:true, state: snapshot() };
    },

    say: function (msg) {
      msg = String(msg || "").slice(0, 140);
      if (!msg) return { ok:false };
      say(msg);
      addLog("say", "\u201C" + msg.replace(/[<>]/g, "") + "\u201D", "move");
      return { ok:true };
    },

    setMcpLive: function (on, label) {
      $("mcpBadge").className = "mcp-badge " + (on ? "mcp-badge--on" : "mcp-badge--off");
      $("mcpBadgeText").textContent = label;
      if (on) {
        $("agentName").textContent = "Live WebMCP agent connected";
        $("agentNote").textContent = "A real agent is attached. Ask it: \u201CPlay the robot and help me finish this level.\u201D The built-in agent is still available below.";
      }
    },

    log: addLog
  };
  window.LS = LS;

  /* ---------------- input ---------------- */
  var KEYMAP = {
    ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right",
    w:"up", s:"down", a:"left", d:"right", W:"up", S:"down", A:"left", D:"right"
  };

  document.addEventListener("keydown", function (e) {
    if (!isHidden($("intro"))) {
      if (e.key === "Escape" || e.key === "Enter") { hide($("intro")); }
      return;
    }
    if (e.key === "r" || e.key === "R") { LS.resetLevel(); return; }
    var dir = KEYMAP[e.key];
    if (!dir) return;
    e.preventDefault();
    move("h", dir);
  }, false);

  Array.prototype.forEach.call(document.querySelectorAll(".dbtn"), function (b) {
    b.addEventListener("click", function () { move("h", b.getAttribute("data-dir")); });
  });

  $("resetBtn").addEventListener("click", function () { LS.resetLevel(); });
  $("prevBtn").addEventListener("click", function () { load(G.idx - 1); });
  $("nextBtn").addEventListener("click", function () { load(G.idx + 1); });
  $("hintBtn").addEventListener("click", function () { LS.getHint(); });
  $("clearLog").addEventListener("click", function () {
    logEl.innerHTML = ""; logEl.appendChild(logEmpty); logEmpty.style.display = "";
  });
  $("agentToggle").addEventListener("click", function () { G.botOn ? stopBot() : startBot(); });
  $("autoBoth").addEventListener("click", autoBoth);
  $("wonReplay").addEventListener("click", function () { load(G.idx); });
  $("wonNext").addEventListener("click", function () {
    load(G.idx === K.LEVELS.length - 1 ? 0 : G.idx + 1);
  });
  $("helpBtn").addEventListener("click", function () { show($("intro")); });
  $("introSolo").addEventListener("click", function () { hide($("intro")); });
  $("introPlay").addEventListener("click", function () { hide($("intro")); startBot(); });

  window.addEventListener("resize", function () {
    var old = TILE; px();
    if (old !== TILE) { buildBoard(); render(); }
  });

  /* ---------------- boot ---------------- */
  load(0, true);
})();
