/* Minimal DOM shim to execute game.js + webmcp.js headlessly and
   verify that clicks, keys and the WebMCP tools actually work. */
"use strict";
const fs = require("fs");

function mkEl(tag) {
  const el = {
    tagName: (tag || "div").toUpperCase(),
    id: "", _html: "", _text: "", hidden: false,
    children: [], parent: null, _cls: new Set(), _listeners: {},
    style: new Proxy({}, { get:(t,k)=>t[k]||"", set:(t,k,v)=>{t[k]=v;return true;} }),
    _attrs: {},
    get innerHTML(){ return this._html; },
    set innerHTML(v){ this._html = String(v); if(v==="") this.children=[]; },
    get textContent(){ return this._text; },
    set textContent(v){ this._text = String(v); },
    get className(){ return [...this._cls].join(" "); },
    set className(v){ this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    classList: null,
    setAttribute(k,v){ this._attrs[k]=v; if(k==="id"){this.id=v; DOC._ids[v]=this;} },
    getAttribute(k){ return this._attrs[k] ?? null; },
    appendChild(c){ c.parent=this; this.children.push(c); return c; },
    removeChild(c){ const i=this.children.indexOf(c); if(i>=0)this.children.splice(i,1); return c; },
    querySelector(){ return null; },
    querySelectorAll(sel){ return DOC._byClass(sel.replace(/^\./,"")); },
    addEventListener(ev,fn){ (this._listeners[ev] ||= []).push(fn); },
    removeEventListener(ev,fn){ const a=this._listeners[ev]||[]; const i=a.indexOf(fn); if(i>=0)a.splice(i,1); },
    dispatch(ev,e){ (this._listeners[ev]||[]).forEach(f=>f(e||{preventDefault(){}})); },
    click(){ this.dispatch("click",{preventDefault(){}}); },
    scrollIntoView(){}, focus(){}, select(){},
    get scrollTop(){return 0;}, set scrollTop(v){},
    get scrollHeight(){return 0;}
  };
  el.classList = {
    add:(...c)=>c.forEach(x=>el._cls.add(x)),
    remove:(...c)=>c.forEach(x=>el._cls.delete(x)),
    contains:(c)=>el._cls.has(c),
    toggle:(c,f)=>{ const on = f===undefined ? !el._cls.has(c) : !!f; on?el._cls.add(c):el._cls.delete(c); return on; }
  };
  return el;
}

const DOC = {
  _ids: {}, _all: [],
  documentElement: mkEl("html"),
  createElement(t){ const e=mkEl(t); DOC._all.push(e); return e; },
  getElementById(id){ return DOC._ids[id] || null; },
  querySelector(sel){ const r=DOC._byClass(sel.replace(/^\./,"")); return r[0]||null; },
  querySelectorAll(sel){ return DOC._byClass(sel.replace(/^\./,"")); },
  _byClass(c){ return DOC._all.filter(e=>e._cls.has(c)); },
  addEventListener(ev,fn){ (DOC._listeners[ev] ||= []).push(fn); },
  _listeners: {},
  dispatch(ev,e){ (DOC._listeners[ev]||[]).forEach(f=>f(e)); }
};

// build id elements from index.html
const html = fs.readFileSync(__dirname + "/index.html", "utf8");
for (const m of html.matchAll(/id="([A-Za-z0-9_]+)"/g)) {
  const e = mkEl("div"); e.id = m[1]; DOC._ids[m[1]] = e; DOC._all.push(e);
}
// d-pad buttons
for (const m of html.matchAll(/class="dbtn dbtn--[a-z]"\s+data-dir="(\w+)"/g)) {
  const e = mkEl("button"); e.className = "dbtn"; e._attrs["data-dir"] = m[1];
  DOC._all.push(e);
}

global.window = {
  addEventListener(){}, navigator: {},
  getComputedStyle: () => ({ getPropertyValue: () => "44" })
};
global.document = DOC;
global.getComputedStyle = window.getComputedStyle;
Object.defineProperty(global, "navigator", { value: window.navigator, configurable: true });

require("./levels.js");
window.LOCKSTEP = global.LOCKSTEP || window.LOCKSTEP;

// evaluate game.js + webmcp.js in this global scope
const vm = require("vm");
const ctx = vm.createContext(global);
global.globalThis = global;
vm.runInContext(fs.readFileSync(__dirname+"/game.js","utf8"), ctx, {filename:"game.js"});
vm.runInContext(fs.readFileSync(__dirname+"/webmcp.js","utf8"), ctx, {filename:"webmcp.js"});

module.exports = { DOC, mkEl };
