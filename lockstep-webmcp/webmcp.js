/* =========================================================
   LOCKSTEP — WebMCP tool registration
   Six tools that let an AI agent play the robot.
   ========================================================= */
(function () {
  "use strict";

  function ok(o) { return { content: [{ type: "text", text: JSON.stringify(o, null, 2) }] }; }

  var TOOLS = [
    {
      name: "get_game_state",
      description:
        "Read the current puzzle. Returns an ASCII board, the legend, the rule about coloured doors and plates, both characters' coordinates, which doors are currently open, and the robot's legal moves. Call this first, and again after anything changes.",
      inputSchema: { type: "object", properties: {}, required: [] },
      execute: function () { return ok(window.LS.getGameState()); }
    },
    {
      name: "move_robot",
      description:
        "Move the robot you control. You may take several steps in one call; movement stops early if you hit a wall, a closed door, or the human. Returns how far you got, why you stopped, and the new board state. You control ONLY the robot — never the human.",
      inputSchema: {
        type: "object",
        properties: {
          direction: { type: "string", description: "up, down, left or right" },
          steps: { type: "number", description: "How many tiles to travel, 1-20. Defaults to 1." }
        },
        required: ["direction"]
      },
      execute: function (a) { return ok(window.LS.moveRobot(a.direction, a.steps)); }
    },
    {
      name: "get_hint",
      description:
        "Ask the puzzle for the optimal next move from the current position. Returns whose move it is (robot or human) and the direction, plus how many moves remain in a perfect solution. Use it when you are stuck, or to work out what to ask the human to do.",
      inputSchema: { type: "object", properties: {}, required: [] },
      execute: function () { return ok(window.LS.getHint()); }
    },
    {
      name: "say",
      description:
        "Speak to the human player. Your message appears as a speech bubble over the board. Use this to coordinate — tell them which way to walk, or which plate you need them to stand on. This is how you ask for the cooperation the puzzle requires.",
      inputSchema: {
        type: "object",
        properties: { message: { type: "string", description: "Short message, max 140 characters" } },
        required: ["message"]
      },
      execute: function (a) { return ok(window.LS.say(a.message)); }
    },
    {
      name: "reset_level",
      description:
        "Put the current level back to its starting position. Use this if the two of you have manoeuvred into a dead end.",
      inputSchema: { type: "object", properties: {}, required: [] },
      execute: function () { return ok(window.LS.resetLevel()); }
    },
    {
      name: "select_level",
      description:
        "Jump to a specific level by number. There are three, increasing in difficulty.",
      inputSchema: {
        type: "object",
        properties: { level: { type: "number", description: "Level number, 1 to 3" } },
        required: ["level"]
      },
      execute: function (a) { return ok(window.LS.selectLevel(a.level)); }
    }
  ];

  /* ---- show the tool list in the UI ---- */
  var ul = document.getElementById("toolList");
  TOOLS.forEach(function (t) {
    var li = document.createElement("li");
    var b = document.createElement("b"); b.textContent = t.name;
    var s = document.createElement("span"); s.textContent = t.description.split(".")[0] + ".";
    li.appendChild(b); li.appendChild(s); ul.appendChild(li);
  });

  /* ---- normalise arg shapes across agent implementations ---- */
  function wrap(t) {
    return {
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      execute: function (raw) {
        var a = (raw && raw.arguments) ? raw.arguments : (raw || {});
        try { return Promise.resolve(t.execute(a)); }
        catch (e) { return Promise.resolve(ok({ error: String(e && e.message || e) })); }
      }
    };
  }
  var tools = TOOLS.map(wrap);

  function register() {
    var nav = window.navigator || {};
    var mc = nav.modelContext || window.modelContext || document.modelContext ||
             (window.agent && window.agent.modelContext) || window.agent;
    if (!mc) return null;
    if (typeof mc.provideContext === "function") { mc.provideContext({ tools: tools }); return "provideContext"; }
    if (typeof mc.registerTool === "function") { tools.forEach(function (t) { mc.registerTool(t); }); return "registerTool"; }
    if (typeof mc.registerTools === "function") { mc.registerTools(tools); return "registerTools"; }
    return null;
  }

  var method = null;
  try { method = register(); } catch (e) { method = null; }

  if (method) {
    window.LS.setMcpLive(true, "WebMCP live \u00B7 6 tools");
    window.LS.log("webmcp", "Registered <b>6</b> tools via <code>" + method + "</code>. An agent can now play the robot.", "win");
  } else {
    window.LS.setMcpLive(false, "WebMCP not detected \u00B7 built-in agent ready");
    var tries = 0;
    var iv = setInterval(function () {
      var m = null;
      try { m = register(); } catch (e) {}
      if (m || ++tries > 20) {
        clearInterval(iv);
        if (m) {
          window.LS.setMcpLive(true, "WebMCP live \u00B7 6 tools");
          window.LS.log("webmcp", "Registered <b>6</b> tools via <code>" + m + "</code>.", "win");
        }
      }
    }, 500);
  }

  window.LOCKSTEP_TOOLS = tools;
})();
