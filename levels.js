/* =========================================================
   LOCKSTEP — levels + joint solver
   Legend:
     #  wall            .  floor
     H  human start     h  human goal
     R  robot start     r  robot goal
     1  red plate       A  red door
     2  blue plate      B  blue door
   A door is OPEN while any entity stands on a plate of the
   same colour. Entities cannot occupy the same tile.
   Win: human on h AND robot on r, at the same time.
   ========================================================= */
(function (root) {
  "use strict";

  var LEVELS = [
    {
      name: "Handshake",
      brief: "Two sealed corridors. The robot's plate opens your door. It cannot reach your side — and you cannot reach its plate.",
      rows: [
        "#########",
        "#H..A..h#",
        "#########",
        "#R..1..r#",
        "#########"
      ]
    },
    {
      name: "Mutual",
      brief: "Now it runs both ways. Your plate opens the robot's door, its plate opens yours. Neither of you finishes alone.",
      rows: [
        "###########",
        "#H..A..2.h#",
        "###########",
        "#R..1..B.r#",
        "###########"
      ]
    },
    {
      name: "Crossing",
      brief: "One shaft joins the corridors. You will have to walk into the robot's lane, hold its door, and get out of its way.",
      rows: [
        "#############",
        "#H2.A......h#",
        "######.######",
        "#R1.B..2...r#",
        "#############"
      ]
    }
  ];

  var PLATE_OF = { "A": "1", "B": "2" };
  var DIRS = {
    up:    { dx: 0,  dy: -1 },
    down:  { dx: 0,  dy: 1  },
    left:  { dx: -1, dy: 0  },
    right: { dx: 1,  dy: 0  }
  };
  var DIR_NAMES = ["up", "down", "left", "right"];

  /* ---------- parse ---------- */
  function parse(level) {
    var grid = [], start = {}, goal = {};
    for (var y = 0; y < level.rows.length; y++) {
      var row = [];
      for (var x = 0; x < level.rows[y].length; x++) {
        var ch = level.rows[y][x], tile = ch;
        if (ch === "H") { start.h = { x: x, y: y }; tile = "."; }
        else if (ch === "R") { start.r = { x: x, y: y }; tile = "."; }
        else if (ch === "h") { goal.h = { x: x, y: y }; tile = "h"; }
        else if (ch === "r") { goal.r = { x: x, y: y }; tile = "r"; }
        row.push(tile);
      }
      grid.push(row);
    }
    return {
      name: level.name, brief: level.brief, grid: grid,
      w: grid[0].length, h: grid.length,
      start: start, goal: goal
    };
  }

  /* ---------- rules ---------- */
  function tileAt(map, x, y) {
    if (y < 0 || y >= map.h || x < 0 || x >= map.w) return "#";
    return map.grid[y][x];
  }

  /* is a plate of `colour` pressed, given both entity positions */
  function platePressed(map, colour, hp, rp) {
    return tileAt(map, hp.x, hp.y) === colour || tileAt(map, rp.x, rp.y) === colour;
  }

  function doorOpen(map, doorChar, hp, rp) {
    return platePressed(map, PLATE_OF[doorChar], hp, rp);
  }

  /* can `who` ('h'|'r') step onto x,y given current positions */
  function canEnter(map, who, x, y, hp, rp) {
    var t = tileAt(map, x, y);
    if (t === "#") return false;
    var other = who === "h" ? rp : hp;
    if (other.x === x && other.y === y) return false;
    if (t === "A" || t === "B") return doorOpen(map, t, hp, rp);
    return true;
  }

  function step(map, who, dir, hp, rp) {
    var d = DIRS[dir];
    if (!d) return null;
    var p = who === "h" ? hp : rp;
    var nx = p.x + d.dx, ny = p.y + d.dy;
    if (!canEnter(map, who, nx, ny, hp, rp)) return null;
    return who === "h"
      ? { h: { x: nx, y: ny }, r: { x: rp.x, y: rp.y } }
      : { h: { x: hp.x, y: hp.y }, r: { x: nx, y: ny } };
  }

  function isWin(map, hp, rp) {
    return hp.x === map.goal.h.x && hp.y === map.goal.h.y &&
           rp.x === map.goal.r.x && rp.y === map.goal.r.y;
  }

  /* ---------- joint BFS solver ---------- */
  function key(hp, rp) { return hp.x + "," + hp.y + "|" + rp.x + "," + rp.y; }

  function solve(map, hp, rp, limit) {
    limit = limit || 200000;
    if (isWin(map, hp, rp)) return [];
    var seen = {}, queue = [{ h: hp, r: rp, path: [] }], n = 0;
    seen[key(hp, rp)] = true;
    while (queue.length && n++ < limit) {
      var cur = queue.shift();
      for (var w = 0; w < 2; w++) {
        var who = w === 0 ? "r" : "h";
        for (var i = 0; i < 4; i++) {
          var dir = DIR_NAMES[i];
          var nx = step(map, who, dir, cur.h, cur.r);
          if (!nx) continue;
          var k = key(nx.h, nx.r);
          if (seen[k]) continue;
          seen[k] = true;
          var path = cur.path.concat([{ who: who, dir: dir }]);
          if (isWin(map, nx.h, nx.r)) return path;
          queue.push({ h: nx.h, r: nx.r, path: path });
        }
      }
    }
    return null;
  }

  root.LOCKSTEP = {
    LEVELS: LEVELS, PLATE_OF: PLATE_OF, DIRS: DIRS, DIR_NAMES: DIR_NAMES,
    parse: parse, tileAt: tileAt, doorOpen: doorOpen, platePressed: platePressed,
    canEnter: canEnter, step: step, isWin: isWin, solve: solve
  };

  if (typeof module !== "undefined" && module.exports) module.exports = root.LOCKSTEP;
})(typeof window !== "undefined" ? window : globalThis);
