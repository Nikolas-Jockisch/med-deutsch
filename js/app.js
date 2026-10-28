/* js/core.js */
/* Medical German A1 — core: namespace, utilities, crypto shuffle, assets, icons. */
(function(){
'use strict';
var M = window.MedA1 = window.MedA1 || {};
M.version = '1.0.0 (f0b0cc4f94)';
M.modules = [];           // all module descriptors (ready + upcoming)
M.byId = {};
M.registerModule = function(mod){
  // A module is pure data: items, views, maps. The engine never needs to change to add one.
  var existing = M.byId[mod.id];
  if (existing) { Object.assign(existing, mod, {status:'ready'}); }
  else { mod.status = 'ready'; M.modules.push(mod); M.byId[mod.id] = mod; }
  var m = M.byId[mod.id];
  m.itemById = {};
  (m.items||[]).forEach(function(it, i){ it.mod = m.id; it.idx = i; m.itemById[it.id] = it; });
  M.modules.sort(function(a,b){ return a.n - b.n; });
};
M.announceModule = function(desc){ // upcoming module tile (no content yet)
  if (M.byId[desc.id]) return;
  desc.status = desc.status || 'soon';
  M.modules.push(desc); M.byId[desc.id] = desc;
  M.modules.sort(function(a,b){ return a.n - b.n; });
};

/* ---------- crypto randomness (no modulo bias) ---------- */
var buf = new Uint32Array(1);
function rand32(){ crypto.getRandomValues(buf); return buf[0]; }
M.randInt = function(n){ // uniform integer in [0, n)
  if (n <= 1) return 0;
  var lim = Math.floor(0x100000000 / n) * n, x;
  do { x = rand32(); } while (x >= lim);
  return x % n;
};
M.shuffle = function(arr){ // Fisher–Yates with crypto.getRandomValues, returns a new array
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = M.randInt(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
};
M.pick = function(arr){ return arr[M.randInt(arr.length)]; };

/* ---------- DOM helper ---------- */
M.h = function(tag, attrs){
  var el = document.createElement(tag), i, k;
  if (attrs) for (k in attrs) {
    var v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.slice(0,2) === 'on') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (i = 2; i < arguments.length; i++) add(el, arguments[i]);
  return el;
};
function add(el, c){
  if (c == null || c === false) return;
  if (Array.isArray(c)) { c.forEach(function(x){ add(el, x); }); return; }
  el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
}
M.esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };

/* ---------- icons (SVG, stroke) ---------- */
var P = {
  back:'<path d="M15 5l-7 7 7 7"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"/>',
  next:'<path d="M9 5l7 7-7 7"/>', prev:'<path d="M15 5l-7 7 7 7"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  shuffle:'<path d="M16 4h4v4M4 20L20 4M20 16v4h-4M15 15l5 5M4 4l5 5"/>',
  down:'<path d="M6 9l6 6 6-6"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>'
};
M.icon = function(name){ return '<svg viewBox="0 0 24 24" aria-hidden="true">' + P[name] + '</svg>'; };
M.chk = function(){ var s = document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('viewBox','0 0 24 24'); s.setAttribute('class','chk'); s.setAttribute('aria-hidden','true'); s.innerHTML = '<path d="M5 12.5l4.5 4.5L19 7.5"/>'; return s; };

/* ---------- assets: folder build uses files; standalone build injects data URIs ---------- */
M.asset = function(key, kind){ // kind: 'webp' | 'line' | 'field'
  var A = window.MEDA1_ASSETS;
  var name = kind === 'webp' ? key + '.webp' : key + '.' + kind + '.png';
  if (A && A[name]) return A[name];
  return 'img/' + name;
};
M.imgMeta = {}; // filled by data/images.js

/* ---------- motion ---------- */
var rmq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
M.reducedMotion = function(){ return !!(rmq && rmq.matches) || document.documentElement.classList.contains('rm'); };
M.wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
M.bezier = function(x1, y1, x2, y2){ // cubic-bezier easing (Newton)
  function a(a1,a2){ return 1 - 3*a2 + 3*a1; } function b(a1,a2){ return 3*a2 - 6*a1; } function c(a1){ return 3*a1; }
  function calc(t,a1,a2){ return ((a(a1,a2)*t + b(a1,a2))*t + c(a1))*t; }
  function slope(t,a1,a2){ return 3*a(a1,a2)*t*t + 2*b(a1,a2)*t + c(a1); }
  return function(x){ if (x <= 0) return 0; if (x >= 1) return 1; var t = x;
    for (var i = 0; i < 8; i++) { var s = slope(t,x1,x2); if (s === 0) break; t -= (calc(t,x1,x2) - x)/s; }
    return calc(Math.min(1,Math.max(0,t)),y1,y2); };
};

/* ---------- text normalisation for typed answers ---------- */
M.norm = function(s){
  return String(s||'').replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4]/g,"'").replace(/[\u201C\u201D\u201E\u201F]/g,'"')
    .replace(/[\u2010-\u2015\u2212]/g,'-').replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'').trim();
};
M.deUml = function(s){ // canonical umlaut-free spelling (for ae/oe/ue/ss acceptance)
  return s.replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/Ä/g,'Ae').replace(/Ö/g,'Oe').replace(/Ü/g,'Ue').replace(/ß/g,'ss');
};
M.lev = function(a, b){
  var m = a.length, n = b.length, d = [], i, j;
  for (i = 0; i <= m; i++) { d[i] = [i]; } for (j = 0; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[m][n];
};
M.dayKey = function(t){ var d = new Date(t); return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); };
M.startOfDay = function(t){ var d = new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
M.DAY = 86400000;
})();

;
/* data/images.js */
/* Image metadata (generated by art/process.py) */
MedA1.imgMeta = {"A1":{"w":864,"h":1152,"origin":[0.503,0.482]},"A2":{"w":864,"h":1152,"origin":[0.502,0.477]},"A3":{"w":1152,"h":864,"origin":[0.506,0.572]},"A4":{"w":1152,"h":864,"origin":[0.505,0.473]},"A5":{"w":864,"h":1152,"origin":[0.503,0.51]},"A6":{"w":864,"h":1152,"origin":[0.48,0.471]},"A7":{"w":1152,"h":864,"origin":[0.516,0.545]},"A8":{"w":1152,"h":864,"origin":[0.485,0.543]},"B01":{"w":1152,"h":864,"origin":[0.499,0.497]},"B02":{"w":1152,"h":864,"origin":[0.505,0.524]},"B03":{"w":1152,"h":864,"origin":[0.521,0.514]},"B04":{"w":1152,"h":864,"origin":[0.466,0.48]},"B05":{"w":1152,"h":864,"origin":[0.5,0.488]},"B06":{"w":1152,"h":864,"origin":[0.51,0.461]},"B07":{"w":1152,"h":864,"origin":[0.522,0.48]},"B08":{"w":1152,"h":864,"origin":[0.501,0.492]},"B09":{"w":1152,"h":864,"origin":[0.486,0.52]},"B10":{"w":1152,"h":864,"origin":[0.46,0.502]},"B11":{"w":1152,"h":864,"origin":[0.489,0.505]},"B12":{"w":1152,"h":864,"origin":[0.497,0.49]},"B13":{"w":1152,"h":864,"origin":[0.498,0.5]},"B14":{"w":1152,"h":864,"origin":[0.505,0.492]},"B15":{"w":1152,"h":864,"origin":[0.477,0.489]},"B16":{"w":1152,"h":864,"origin":[0.503,0.545]},"B17":{"w":1152,"h":864,"origin":[0.5,0.502]},"B18":{"w":1152,"h":864,"origin":[0.505,0.501]},"B19":{"w":1152,"h":864,"origin":[0.499,0.512]},"B20":{"w":584,"h":1000,"origin":[0.521,0.482]},"B21":{"w":690,"h":870,"origin":[0.508,0.428]},"B22":{"w":584,"h":1000,"origin":[0.535,0.514]},"C01":{"w":1152,"h":864,"origin":[0.501,0.621]},"C02":{"w":1152,"h":864,"origin":[0.52,0.595]},"C03":{"w":1152,"h":864,"origin":[0.505,0.571]},"C04":{"w":1152,"h":864,"origin":[0.515,0.556]},"C05":{"w":1152,"h":864,"origin":[0.515,0.592]},"C06":{"w":1152,"h":864,"origin":[0.513,0.617]},"C07":{"w":1152,"h":864,"origin":[0.498,0.615]},"C08":{"w":1152,"h":864,"origin":[0.516,0.597]},"C09":{"w":1152,"h":864,"origin":[0.547,0.575]},"C10":{"w":1152,"h":864,"origin":[0.515,0.577]},"C11":{"w":1152,"h":864,"origin":[0.512,0.619]},"C12":{"w":1152,"h":864,"origin":[0.522,0.586]},"C13":{"w":1152,"h":864,"origin":[0.603,0.556]},"C14":{"w":1152,"h":864,"origin":[0.562,0.612]},"C15":{"w":1152,"h":864,"origin":[0.53,0.602]},"C16":{"w":1152,"h":864,"origin":[0.551,0.588]},"C17":{"w":1152,"h":864,"origin":[0.492,0.57]},"C18":{"w":1152,"h":864,"origin":[0.476,0.61]},"C19":{"w":1152,"h":864,"origin":[0.437,0.497]},"C20":{"w":1152,"h":864,"origin":[0.527,0.588]},"C21":{"w":1152,"h":864,"origin":[0.523,0.617]},"C22":{"w":1152,"h":864,"origin":[0.526,0.597]},"D01":{"w":1152,"h":864,"origin":[0.521,0.589]},"D02":{"w":1152,"h":864,"origin":[0.488,0.564]},"D03":{"w":1152,"h":864,"origin":[0.534,0.584]},"D04":{"w":1152,"h":864,"origin":[0.566,0.583]},"D05":{"w":1152,"h":864,"origin":[0.554,0.604]},"D06":{"w":1152,"h":864,"origin":[0.621,0.595]},"D07":{"w":1152,"h":864,"origin":[0.568,0.602]},"D08":{"w":1152,"h":864,"origin":[0.514,0.489]},"D09":{"w":1152,"h":864,"origin":[0.513,0.583]},"D10":{"w":1152,"h":864,"origin":[0.572,0.564]},"D12":{"w":1152,"h":864,"origin":[0.497,0.526]},"D13":{"w":1152,"h":864,"origin":[0.484,0.536]},"D14":{"w":1152,"h":864,"origin":[0.552,0.616]},"D15":{"w":1152,"h":864,"origin":[0.493,0.547]},"D16":{"w":1152,"h":864,"origin":[0.523,0.583]},"D17":{"w":1152,"h":864,"origin":[0.54,0.529]},"D18":{"w":1152,"h":864,"origin":[0.564,0.616]},"E01":{"w":1152,"h":864,"origin":[0.501,0.586]},"E02":{"w":1152,"h":864,"origin":[0.531,0.575]},"E03":{"w":1152,"h":864,"origin":[0.496,0.615]},"E04":{"w":1152,"h":864,"origin":[0.491,0.598]},"E05":{"w":1152,"h":864,"origin":[0.489,0.542]},"E06":{"w":1152,"h":864,"origin":[0.54,0.571]},"E07":{"w":1152,"h":864,"origin":[0.551,0.556]},"E08":{"w":1152,"h":864,"origin":[0.578,0.567]},"E09":{"w":1152,"h":864,"origin":[0.46,0.579]},"E10":{"w":1152,"h":864,"origin":[0.585,0.572]},"E11":{"w":1152,"h":864,"origin":[0.52,0.578]},"E12":{"w":1152,"h":864,"origin":[0.465,0.621]},"E13":{"w":1152,"h":864,"origin":[0.534,0.604]},"E14":{"w":1152,"h":864,"origin":[0.505,0.573]},"E15":{"w":1152,"h":864,"origin":[0.464,0.583]},"E16":{"w":1152,"h":864,"origin":[0.576,0.573]},"E17":{"w":1152,"h":864,"origin":[0.58,0.58]},"E18":{"w":1152,"h":864,"origin":[0.5,0.591]},"E19":{"w":1152,"h":864,"origin":[0.539,0.552]},"E20":{"w":1152,"h":864,"origin":[0.469,0.594]},"G1":{"w":1152,"h":864,"origin":[0.502,0.556]},"G2":{"w":1152,"h":864,"origin":[0.499,0.563]},"G3":{"w":1152,"h":864,"origin":[0.509,0.514]},"G4":{"w":1152,"h":864,"origin":[0.505,0.541]},"G5":{"w":1152,"h":864,"origin":[0.494,0.501]},"G6":{"w":1152,"h":864,"origin":[0.511,0.504]}};

;
/* js/store.js */
/* Local progress: Leitner boxes per item facet, mastery, settings, export/import. Key: medA1.v1 */
(function(){
'use strict';
var M = window.MedA1, KEY = 'medA1.v1';
var INTERVAL = {1:0, 2:1, 3:3, 4:7, 5:16}; // days; after a correct answer in box 5: 35 days
var DEF_SETTINGS = {theme:'system', teach:false, latin:true, dots:true, alwaysDe:false};
function blank(){ return {v:1, settings:Object.assign({}, DEF_SETTINGS), facets:{}, items:{}, last:{}, browsed:{}, practiced:{}}; }
var mem = null, ok = true;
function readLS(){
  try { var raw = localStorage.getItem(KEY); if (!raw) return blank(); var s = JSON.parse(raw); return migrate(s); }
  catch(e){ ok = false; return blank(); }
}
function migrate(s){
  var b = blank();
  if (!s || typeof s !== 'object') return b;
  b.settings = Object.assign(b.settings, s.settings||{});
  ['facets','items','last','browsed','practiced'].forEach(function(k){ if (s[k] && typeof s[k] === 'object') b[k] = s[k]; });
  return b;
}
var S = readLS();
var vol = null;             // volatile progress while teaching mode is on (never saved)
var sessionDeepTeach = /[?&]unterricht\b/.test(location.search);
function P(){ return vol || S; }
function save(){ if (!ok) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
function isTeach(){ return !!S.settings.teach || sessionDeepTeach; }
function syncVol(){ if (isTeach()) { if (!vol) vol = JSON.parse(JSON.stringify(S)); } else vol = null; }
syncVol();

var store = M.store = {
  get settings(){ return S.settings; },
  setSetting: function(k, v){ S.settings[k] = v; if (k === 'teach') { if (!v) sessionDeepTeach = false; syncVol(); } save(); M.applySettings(); },
  teach: isTeach,
  storageOk: function(){ return ok; },
  // ----- browse memory -----
  lastCard: function(mod){ return P().last[mod] || 0; },
  setLastCard: function(mod, i){ P().last[mod] = i; P().browsed[mod] = true; persist(); },
  browsed: function(mod){ return !!P().browsed[mod]; },
  practiced: function(mod){ return !!P().practiced[mod]; },
  setPracticed: function(mod){ P().practiced[mod] = true; persist(); },
  // ----- facets -----
  facetsOf: function(item){ var f = ['meaning','form']; if (item.tap) f.push('location'); return f; },
  facet: function(item, facet){ return P().facets[item.mod + ':' + item.id + ':' + facet] || null; },
  box: function(item, facet){ var f = store.facet(item, facet); return f ? f.b : 0; },
  record: function(item, facet, result, cap){
    // result: 'ok' | 'almost' | 'wrong' | 'knew' | 'notyet'
    var now = Date.now(), p = P(), k = item.mod + ':' + item.id + ':' + facet;
    var f = p.facets[k] || {b:1, due:now, last:0, err:0, n:0, g:0};
    var ik = item.mod + ':' + item.id, it = p.items[ik] || (p.items[ik] = {first:now, late:false});
    cap = cap || 5;
    if (result === 'ok' || result === 'knew') {
      if (result === 'knew') cap = Math.min(cap, 2);
      if (f.b >= 5 && cap >= 5) f.g = (f.g||0) + 1;
      if (f.b < cap) f.b = f.b + 1;
      if (M.dayKey(now) > M.dayKey(it.first)) it.late = true;
    } else if (result === 'wrong' || result === 'notyet') { f.b = 1; f.err = (f.err||0) + 1; }
    // 'almost' keeps the box
    var days = f.b >= 5 && f.g > 0 ? 35 : INTERVAL[f.b];
    f.due = days === 0 ? now : M.startOfDay(now) + days * M.DAY;
    f.last = now; f.n = (f.n||0) + 1;
    p.facets[k] = f; persist();
    return f;
  },
  mastered: function(item){
    var p = P(), it = p.items[item.mod + ':' + item.id];
    if (!it || !it.late) return false;
    return store.facetsOf(item).every(function(fc){ return store.box(item, fc) >= 4; });
  },
  masteredCount: function(mod){ return (mod.items||[]).filter(store.mastered).length; },
  dueList: function(now){
    now = now || Date.now(); var p = P(), out = [];
    Object.keys(p.facets).forEach(function(k){
      var f = p.facets[k]; if (f.due > now) return;
      var parts = k.split(':'), mod = M.byId[parts[0]]; if (!mod || mod.status !== 'ready') return;
      var item = mod.itemById[parts[1]]; if (!item) return;
      out.push({item:item, facet:parts[2], f:f});
    });
    out.sort(function(a,b){ return a.f.b - b.f.b || a.f.due - b.f.due; });
    return out;
  },
  nextDue: function(mod){ // earliest future due for a module
    var p = P(), best = Infinity, now = Date.now();
    Object.keys(p.facets).forEach(function(k){ if (k.indexOf(mod.id + ':') !== 0) return; var d = p.facets[k].due; if (d > now && d < best) best = d; });
    return best === Infinity ? null : best;
  },
  // ----- export / import / reset -----
  exportJSON: function(){ return JSON.stringify({app:'medA1', v:1, exported:new Date().toISOString(), data:S}, null, 1); },
  importJSON: function(text){
    var o = JSON.parse(text);
    if (!o || o.app !== 'medA1' || o.v !== 1 || !o.data) throw new Error('This file is not a Medical German progress file.');
    S = migrate(o.data); vol = null; syncVol(); save(); M.applySettings();
    return Object.keys(S.facets).length;
  },
  reset: function(){ var keep = S.settings; S = blank(); S.settings = keep; vol = null; syncVol(); save(); },
  _state: function(){ return P(); }
};
function persist(){ if (!vol) save(); }
})();

;
/* js/plate.js */
/* Watercolour plate: WebGL self-drawing (graphite line, then colour bloom along a time map), spotlight, tap maps. */
(function(){
'use strict';
var M = window.MedA1, h = M.h;
var PAPER = [246/255, 243/255, 236/255];
var imgCache = {};
M.loadImg = function(src){
  if (imgCache[src]) return imgCache[src];
  var p = new Promise(function(res, rej){
    var im = new Image(); im.decoding = 'async';
    im.onload = function(){ (im.decode ? im.decode().catch(function(){}) : Promise.resolve()).then(function(){ res(im); }); };
    im.onerror = function(){ delete imgCache[src]; rej(new Error('img ' + src)); };
    im.src = src;
  });
  imgCache[src] = p; return p;
};
M.preloadModule = function(mod){ // warm decode of all colour plates of a module
  var keys = {}; (mod.items||[]).forEach(function(it){ keys[it.view.img] = 1; });
  Object.keys(mod.maps||{}).forEach(function(k){ keys[mod.maps[k].img] = 1; });
  Object.keys(keys).forEach(function(k){ M.loadImg(M.asset(k,'webp')).catch(function(){}); });
};

/* ---------------- WebGL engine (one shared canvas) ---------------- */
var VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}';
var FS = [
'precision mediump float;varying vec2 v;',
'uniform sampler2D uC,uL,uF;uniform vec4 uMap,uCrop;uniform vec2 uO,uA;uniform float uMaxD,uPl,uPc;uniform vec3 uPaper;',
'void main(){',
' vec2 cu=(v-uMap.xy)/uMap.zw;',
' if(cu.x<0.||cu.y<0.||cu.x>1.||cu.y>1.){gl_FragColor=vec4(uPaper,1.);return;}',
' vec2 iu=uCrop.xy+cu*uCrop.zw;',
' vec3 col=texture2D(uC,iu).rgb;float ln=texture2D(uL,iu).r;vec2 fd=texture2D(uF,iu).rg;',
' float d=clamp(length((iu-uO)*uA)/uMaxD,0.,1.);',
' float T=.55*d+.45*fd.r;float band=.08;',
' float a=clamp((uPc*(1.+band)-T)/band,0.,1.);',
' float inb=a*(1.-a)*4.;a=clamp(a+(fd.g-.5)*.5*inb,0.,1.);inb=a*(1.-a)*4.;',
' vec3 c=col*(1.-.06*inb);',
' float Tl=.7*d+.3*fd.g;float la=clamp((uPl*1.12-Tl)/.12,0.,1.)*ln;',
' vec3 base=mix(uPaper,vec3(.30,.29,.28),la*.82);',
' gl_FragColor=vec4(mix(base,c,a),1.);',
'}'].join('\n');
var G = {gl:null, cv:null, prog:null, u:{}, ok:null, active:null, tex:{}};
function initGL(){
  if (G.ok !== null) return G.ok;
  try {
    var cv = document.createElement('canvas'); cv.className = 'gl';
    var gl = cv.getContext('webgl', {alpha:false, antialias:false, premultipliedAlpha:false, preserveDrawingBuffer:false}) || cv.getContext('experimental-webgl');
    if (!gl) return (G.ok = false);
    function sh(t, s){ var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uC','uL','uF','uMap','uCrop','uO','uA','uMaxD','uPl','uPc','uPaper'].forEach(function(n){ G.u[n] = gl.getUniformLocation(pr, n); });
    gl.uniform1i(G.u.uC, 0); gl.uniform1i(G.u.uL, 1); gl.uniform1i(G.u.uF, 2); gl.uniform3fv(G.u.uPaper, PAPER);
    cv.addEventListener('webglcontextlost', function(e){ e.preventDefault(); G.ok = false; if (G.active) G.active.finish(); });
    G.gl = gl; G.cv = cv; G.prog = pr; G.ok = true;
  } catch(e) { G.ok = false; }
  return G.ok;
}
function texFrom(img, key){
  var gl = G.gl;
  if (G.tex[key]) return G.tex[key];
  var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); // throws SecurityError for tainted (file://) images
  G.tex[key] = t;
  var keys = Object.keys(G.tex); // keep GPU memory small (iOS): at most 3 image sets
  if (keys.length > 9) { var old = keys[0]; gl.deleteTexture(G.tex[old]); delete G.tex[old]; }
  return t;
}
var easeLine = function(x){ return 1 - Math.pow(1 - x, 3); };
var easeColor = M.bezier(.45, 0, .2, 1);
M.glAvailable = function(){ return initGL(); };

/* ---------------- geometry: contain-fit of a crop in a 4:3 plate ---------------- */
function fit(meta, crop, ap){
  var cw = crop[2], ch = crop[3], ac = cw / ch, dw, dh;
  if (ac > ap) { dw = 1; dh = ap / ac; } else { dh = 1; dw = ac / ap; }
  var dx = (1 - dw) / 2, dy = (1 - dh) / 2;
  return {dx:dx, dy:dy, dw:dw, dh:dh, iw:dw * meta.w / cw, ih:dh * meta.h / ch,
          il:dx - (crop[0] / cw) * dw, it:dy - (crop[1] / ch) * dh};
}
var uid = 0;
function ellipseAttrs(e){ return {cx:e[0], cy:e[1], rx:e[2], ry:e[3]}; }
function spotSVG(view, crop){
  var e = view.spot, id = 'sp' + (++uid), NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'spot'); svg.setAttribute('viewBox', crop.join(' ')); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet'); svg.setAttribute('aria-hidden', 'true');
  var rot = 'rotate(' + e[4] + ' ' + e[0] + ' ' + e[1] + ')';
  var big = Math.max(crop[2], crop[3]) * 3;
  svg.innerHTML =
    '<defs><radialGradient id="g' + id + '"><stop offset="0.66" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>' +
    '<mask id="m' + id + '" maskUnits="userSpaceOnUse" x="' + (crop[0]-big) + '" y="' + (crop[1]-big) + '" width="' + (crop[2]+2*big) + '" height="' + (crop[3]+2*big) + '">' +
    '<rect x="' + (crop[0]-big) + '" y="' + (crop[1]-big) + '" width="' + (crop[2]+2*big) + '" height="' + (crop[3]+2*big) + '" fill="#fff"/>' +
    '<ellipse cx="' + e[0] + '" cy="' + e[1] + '" rx="' + (e[2]*1.3) + '" ry="' + (e[3]*1.3) + '" transform="' + rot + '" fill="url(#g' + id + ')"/></mask></defs>' +
    '<rect class="veil" x="' + (crop[0]-big) + '" y="' + (crop[1]-big) + '" width="' + (crop[2]+2*big) + '" height="' + (crop[3]+2*big) + '" fill="#F6F3EC" fill-opacity="0.5" mask="url(#m' + id + ')"/>' +
    '<g transform="' + rot + '"><ellipse class="ringe" vector-effect="non-scaling-stroke" cx="' + e[0] + '" cy="' + e[1] + '" rx="' + e[2] + '" ry="' + e[3] + '"/>' +
    '<ellipse class="pulse" vector-effect="non-scaling-stroke" cx="' + e[0] + '" cy="' + e[1] + '" rx="' + e[2] + '" ry="' + e[3] + '"/></g>';
  return svg;
}

/* ---------------- Plate ---------------- */
M.Plate = function(view, opts){
  opts = opts || {};
  var meta = M.imgMeta[view.img], crop = view.crop || [0, 0, meta.w, meta.h];
  var el = h('div', {class:'plate' + (opts.cls ? ' ' + opts.cls : '')});
  var vp = h('div', {class:'vp'});
  var sh = h('div', {class:'shimmer'});
  var img = h('img', {class:'art', alt:opts.alt != null ? opts.alt : (view.alt || 'Illustration'), draggable:'false'});
  var f = fit(meta, crop, 4/3);
  Object.assign(img.style, {width:(f.iw*100)+'%', height:(f.ih*100)+'%', left:(f.il*100)+'%', top:(f.it*100)+'%'});
  vp.appendChild(sh); vp.appendChild(img); el.appendChild(vp);
  var svg = null;
  if (view.spot && opts.spot !== false) { svg = spotSVG(view, crop); el.appendChild(svg); }
  var src = M.asset(view.img, 'webp');
  var ready = M.loadImg(src).then(function(im){ img.src = src; return im; });
  var self = {el:el, img:img, ready:ready, view:view, done:false, destroyed:false};
  function showSpot(delay){ if (!svg) return; setTimeout(function(){ if (!self.destroyed) svg.classList.add('on'); }, delay || 0); }
  function reveal(kind){
    sh.remove();
    if (kind) img.classList.add(kind);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ img.classList.add('on'); }); });
  }
  self.draw = function(dur){
    // dur: 1250 (first appearance) | 600 (repeat) | 0 (no draw: fade)
    return ready.then(function(colorImg){
      if (self.destroyed) return;
      if (M.reducedMotion()) { reveal('fade'); showSpot(0); self.done = true; return; }
      if (!dur) { reveal('fade'); showSpot(120); self.done = true; return; }
      if (!initGL()) { reveal('fadeblur'); showSpot(250); self.done = true; return; }
      return Promise.all([M.loadImg(M.asset(view.img, 'line')), M.loadImg(M.asset(view.img, 'field'))]).then(function(maps){
        if (self.destroyed) return;
        return runGL(self, colorImg, maps[0], maps[1], meta, crop, f, dur, opts.origin);
      }).catch(function(){ reveal('fadeblur'); }).then(function(){ showSpot(0); });
    }).catch(function(){ /* image failed: keep paper shimmer */ });
  };
  self.spotOn = function(){ showSpot(0); };
  self.destroy = function(){ self.destroyed = true; if (G.active && G.active.plate === self) G.active.finish(); };
  self._reveal = reveal; self._sh = sh;
  if (view.spot && opts.spotDelay != null) self.spotDelay = opts.spotDelay;
  return self;
};

function runGL(plate, colorImg, lineImg, fieldImg, meta, crop, f, dur, origin){
  return new Promise(function(resolve){
    if (G.active) G.active.finish();
    var gl = G.gl, cv = G.cv, el = plate.el;
    try {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texFrom(colorImg, plate.view.img + ':c'));
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texFrom(lineImg, plate.view.img + ':l'));
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texFrom(fieldImg, plate.view.img + ':f'));
    } catch(e) { G.ok = false; plate._reveal('fadeblur'); resolve(); return; }
    var rect = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.max(2, Math.round(rect.width * dpr)), H = Math.max(2, Math.round(rect.height * dpr));
    cv.width = W; cv.height = H; gl.viewport(0, 0, W, H);
    var ap = rect.width / Math.max(1, rect.height), ff = fit(meta, crop, ap);
    gl.uniform4f(G.u.uMap, ff.dx, ff.dy, ff.dw, ff.dh);
    gl.uniform4f(G.u.uCrop, crop[0]/meta.w, crop[1]/meta.h, crop[2]/meta.w, crop[3]/meta.h);
    var o = plate.view.spot ? [plate.view.spot[0]/meta.w, plate.view.spot[1]/meta.h] : (origin || meta.origin || [.5,.5]);
    var asp = meta.w / meta.h; gl.uniform2f(G.u.uO, o[0], o[1]); gl.uniform2f(G.u.uA, asp, 1);
    var cx0 = crop[0]/meta.w, cy0 = crop[1]/meta.h, cx1 = cx0 + crop[2]/meta.w, cy1 = cy0 + crop[3]/meta.h, maxD = 0;
    [[cx0,cy0],[cx1,cy0],[cx0,cy1],[cx1,cy1]].forEach(function(c){ var dx = (c[0]-o[0])*asp, dy = c[1]-o[1]; maxD = Math.max(maxD, Math.sqrt(dx*dx+dy*dy)); });
    gl.uniform1f(G.u.uMaxD, maxD || 1);
    plate._sh.remove();
    el.appendChild(cv);
    var s = dur / 1250, t0 = performance.now(), raf = 0, finished = false;
    var spotAt = dur * 0.62, spotted = false;
    function frame(now){
      var t = now - t0;
      var pl = easeLine(Math.min(1, t / (550*s)));
      var pc = easeColor(Math.min(1, Math.max(0, (t - 250*s) / (1000*s))));
      gl.uniform1f(G.u.uPl, pl); gl.uniform1f(G.u.uPc, pc);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!spotted && t >= spotAt) { spotted = true; plate.spotOn(); }
      if (t >= dur) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }
    function finish(){
      if (finished) return; finished = true; cancelAnimationFrame(raf);
      plate.img.classList.add('on'); plate.done = true;
      requestAnimationFrame(function(){ if (cv.parentNode === el) el.removeChild(cv); });
      if (G.active && G.active.plate === plate) G.active = null;
      resolve();
    }
    G.active = {plate:plate, finish:finish};
    gl.uniform1f(G.u.uPl, 0); gl.uniform1f(G.u.uPc, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  });
}

/* ---------------- Tap map (body map, head, hand …) ---------------- */
M.TapMap = function(mod, mapId, opts){
  var m = mod.maps[mapId], meta = M.imgMeta[m.img], NS = 'http://www.w3.org/2000/svg';
  var land = m.w > m.h;
  var el = h('div', {class:'map' + (land ? ' land' : ''), role:'img', 'aria-label':m.alt + '. Tap a body part.', style:{aspectRatio:m.w + ' / ' + m.h}});
  var img = h('img', {alt:'', src:M.asset(m.img, 'webp'), draggable:'false'});
  var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + m.w + ' ' + m.h); svg.setAttribute('preserveAspectRatio', 'none');
  el.appendChild(img); el.appendChild(svg);
  if (opts && opts.caption) el.appendChild(h('div', {class:'map-cap', text:opts.caption}));
  if (m.poly) el.setAttribute('aria-label', m.alt + '. Tap an organ.');
  var self = {el:el, id:mapId, def:m};
  function toMaster(ev){
    var r = el.getBoundingClientRect();
    return {x:(ev.clientX - r.left) / r.width * m.w, y:(ev.clientY - r.top) / r.height * m.h, scale:m.w / r.width};
  }
  // polygon helpers (M5 situs maps: regions carry p = [[x,y],…] instead of an ellipse e)
  function inPoly(p, x, y){
    var c = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      var xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi)) c = !c;
    }
    return c;
  }
  function nearPoly(p, x, y){ // nearest boundary point
    var best = null;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      var ax = p[j][0], ay = p[j][1], bx = p[i][0], by = p[i][1], vx = bx - ax, vy = by - ay;
      var t = ((x - ax) * vx + (y - ay) * vy) / ((vx*vx + vy*vy) || 1); t = Math.max(0, Math.min(1, t));
      var qx = ax + t*vx, qy = ay + t*vy, d = Math.hypot(x - qx, y - qy);
      if (!best || d < best.d) best = {d:d, x:qx, y:qy};
    }
    return best;
  }
  function polyArea(p){ var a = 0; for (var i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return Math.abs(a / 2); }
  self.dist = function(r, pt){ // distance from a point to a region (0 inside)
    if (r.p) return inPoly(r.p, pt.x, pt.y) ? 0 : nearPoly(r.p, pt.x, pt.y).d;
    return Math.hypot(r.e[0] - pt.x, r.e[1] - pt.y);
  };
  self.hit = function(pt){
    // returns all regions containing the point (with a small finger tolerance), smallest first.
    // Polygon maps: regions are the visible parts of the organs (disjoint); a region the tap is really
    // inside wins; the finger tolerance only applies when the tap is inside no region at all.
    var tol = 10 * pt.scale, res = [];
    if (m.poly) {
      m.regions.forEach(function(r){ if (inPoly(r.p, pt.x, pt.y)) res.push({r:r, d:0, area:r._a || (r._a = polyArea(r.p)), inside:true}); });
      if (res.length) { res.sort(function(p, q){ return p.area - q.area; }); return res; }
      m.regions.forEach(function(r){ var n = nearPoly(r.p, pt.x, pt.y); if (n.d <= tol) res.push({r:r, d:n.d, area:0}); });
      res.sort(function(p, q){ return p.d - q.d; });
      return res;
    }
    m.regions.forEach(function(r){
      var e = r.e, a = -e[4] * Math.PI / 180, dx = pt.x - e[0], dy = pt.y - e[1];
      var x = dx * Math.cos(a) - dy * Math.sin(a), y = dx * Math.sin(a) + dy * Math.cos(a);
      var rx = e[2] + tol, ry = e[3] + tol, d = (x*x)/(rx*rx) + (y*y)/(ry*ry);
      if (d <= 1) res.push({r:r, d:d, area:e[2]*e[3]});
    });
    res.sort(function(p, q){ return p.area - q.area; });
    return res;
  };
  function ell(e, cls){
    var g = document.createElementNS(NS, 'g'); g.setAttribute('transform', 'rotate(' + e[4] + ' ' + e[0] + ' ' + e[1] + ')'); g.setAttribute('class', 'reg-draw');
    var o = document.createElementNS(NS, 'ellipse'); o.setAttribute('cx', e[0]); o.setAttribute('cy', e[1]); o.setAttribute('rx', e[2]); o.setAttribute('ry', e[3]);
    o.setAttribute('class', cls); o.setAttribute('vector-effect', 'non-scaling-stroke'); g.appendChild(o); svg.appendChild(g); return g;
  }
  function path(p, cls){
    var g = document.createElementNS(NS, 'path');
    g.setAttribute('d', 'M' + p.map(function(q){ return q[0] + ' ' + q[1]; }).join('L') + 'Z');
    g.setAttribute('class', cls + ' reg-draw'); g.setAttribute('vector-effect', 'non-scaling-stroke'); g.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(g); return g;
  }
  self.mark = function(region, cls){ return region.p ? path(region.p, cls) : ell(region.e, cls); };
  // polygon maps: an organ can have several visible parts (both lungs, both kidneys) — mark them all
  // plan §6.3: the organ(s) in question stay at full strength, every other part of the picture is dimmed to about 35 %
  self.focus = function(items){
    if (!m.poly) return;
    var keep = m.regions.filter(function(r){ return items.indexOf(r.item) >= 0; });
    if (!keep.length) return;
    var d = 'M0 0H' + m.w + 'V' + m.h + 'H0Z' + keep.map(function(r){ return 'M' + r.p.map(function(q){ return q[0] + ' ' + q[1]; }).join('L') + 'Z'; }).join('');
    var g = document.createElementNS(NS, 'path'); g.setAttribute('d', d); g.setAttribute('fill-rule', 'evenodd'); g.setAttribute('class', 'dim reg-draw');
    svg.insertBefore(g, svg.firstChild);
  };
  self.markItem = function(item, cls){ m.regions.forEach(function(r){ if (r.item === item) self.mark(r, cls); }); };
  self.tapMark = function(pt){
    var r = 9 * pt.scale;
    var c = document.createElementNS(NS, 'ellipse'); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('rx', r); c.setAttribute('ry', r);
    c.setAttribute('class', 'tap'); c.setAttribute('vector-effect', 'non-scaling-stroke'); svg.appendChild(c);
    var d = document.createElementNS(NS, 'ellipse'); d.setAttribute('cx', pt.x); d.setAttribute('cy', pt.y); d.setAttribute('rx', 2.5*pt.scale); d.setAttribute('ry', 2.5*pt.scale); d.setAttribute('class', 'tap-dot'); svg.appendChild(d);
  };
  self.lead = function(pt, region){
    if (region.p) {
      if (inPoly(region.p, pt.x, pt.y)) return;
      var n = nearPoly(region.p, pt.x, pt.y);
      var ln = document.createElementNS(NS, 'line'); ln.setAttribute('x1', pt.x); ln.setAttribute('y1', pt.y); ln.setAttribute('x2', n.x); ln.setAttribute('y2', n.y);
      ln.setAttribute('class', 'lead reg-draw'); ln.setAttribute('vector-effect', 'non-scaling-stroke'); svg.appendChild(ln); return;
    }
    var e = region.e, dx = pt.x - e[0], dy = pt.y - e[1], L = Math.sqrt(dx*dx + dy*dy) || 1;
    var a = -e[4] * Math.PI / 180, lx = dx*Math.cos(a) - dy*Math.sin(a), ly = dx*Math.sin(a) + dy*Math.cos(a);
    var k = 1 / Math.sqrt((lx*lx)/(e[2]*e[2]) + (ly*ly)/(e[3]*e[3]) || 1); // boundary along the ray
    var bx = e[0] + dx * Math.min(1, k), by = e[1] + dy * Math.min(1, k);
    if (k >= 1) return; // tap already inside
    var l = document.createElementNS(NS, 'line'); l.setAttribute('x1', pt.x); l.setAttribute('y1', pt.y); l.setAttribute('x2', bx); l.setAttribute('y2', by);
    l.setAttribute('class', 'lead reg-draw'); l.setAttribute('vector-effect', 'non-scaling-stroke'); svg.appendChild(l);
  };
  self.clear = function(){ svg.innerHTML = ''; };
  self.onTap = function(fn){
    el.addEventListener('pointerup', function(ev){ if (ev.button && ev.button !== 0) return; fn(toMaster(ev), self); });
  };
  return self;
};
})();

;
/* js/exercises.js */
/* Exercise types. Each type is generic: it reads item data only, so new modules plug in as data. */
(function(){
'use strict';
var M = window.MedA1, h = M.h;
var T = M.types = {};
M.typeOrder = [];
function def(t){ T[t.id] = t; M.typeOrder.push(t.id); }

/* ---------- formatting ---------- */
/* Questions (M3) and instructions (M4): the finite verb can be marked (underline) to make verb-first / verb-second visible.
   M4 items list the parts to mark in q.mk (finite verb + separable particle) and the reflexive sich in q.rf (a quieter mark). */
M.qHTML = function(item, mark){
  var de = item.de, end = /[?.!]$/.test(de) ? de.slice(-1) : '', body = end ? de.slice(0, -1) : de;
  var toks = body.split(' '), q = item.q || {}, out = toks.map(function(t, i){
    var isV = mark && (q.mk ? q.mk.indexOf(i) >= 0 : (i === q.v || (q.k === 'imp' && i === toks.length - 1)));
    if (mark && q.mk && i === q.rf) return '<i class="rf">' + M.esc(t) + '</i>';
    return isV ? '<b class="vb">' + M.esc(t) + '</b>' : M.esc(t);
  });
  // no orphan: a short last word (10?, weh?, Sie?, aus?) stays on the line with the word before it
  var last = out.length > 2 && toks[toks.length - 1].length <= (q.mk ? 4 : 3) ? out.pop() : null;
  return '<span class="qde">' + out.join(' ') + (last ? '\u00a0' + last : '') + M.esc(end) + '</span>';
};
M.qPattern = function(item){
  var k = item.q && item.q.k;
  if (item.pat) return item.pat;
  return k === 'w' ? 'W-question · verb in second place' : k === 'yn' ? 'Yes/no question · verb first' : k === 'imp' ? 'Polite request · verb first, wehtut at the end' : '';
};
M.deHTML = function(item, which){
  if (item.q) return M.qHTML(item, which === 'mark');
  if (which === 'pl') { if (!item.pl) return ''; return '<span class="dot pl" aria-hidden="true"></span><span class="art">die</span> <span class="noun">' + M.esc(item.pl) + '</span>'; }
  if (!item.art) return '<span class="noun">' + M.esc(item.de) + '</span>';
  if (item.plOnly) return '<span class="dot pl" aria-hidden="true"></span><span class="art">die</span> <span class="noun">' + M.esc(item.de) + '</span>';
  return '<span class="dot ' + item.art + '" aria-hidden="true"></span><span class="art">' + item.art + '</span> <span class="noun">' + M.esc(item.de) + '</span>';
};
/* Long compounds (die Rückenschmerzen) must never overflow their column: shrink the display word to fit, never break it. */
M.fitWords = function(root){
  (root || document).querySelectorAll('.de-big, .de-l').forEach(function(el){
    var n = el.querySelector('.noun'); if (!n) return;
    el.style.fontSize = '';
    var w = el.clientWidth, nw = n.getBoundingClientRect().width;
    if (w > 0 && nw > w) el.style.fontSize = Math.floor(parseFloat(getComputedStyle(el).fontSize) * w / nw * 0.97) + 'px';
  });
  /* Term pairs: never break a word; shrink the whole pairs grid uniformly until the longest word fits (room kept for the check mark). */
  (root || document).querySelectorAll('.pairs:not([data-fit])').forEach(function(g){
    var ls = g.querySelectorAll('.pcl'); if (!ls.length || !g.clientWidth) return;
    var bs = g.querySelectorAll('.opt.pc');
    bs.forEach(function(b){ b.style.fontSize = ''; });
    var base = parseFloat(getComputedStyle(bs[0]).fontSize), r = 1;
    ls.forEach(function(l){ var room = l.clientWidth - 30; if (room > 0 && l.scrollWidth > room) r = Math.min(r, room / l.scrollWidth); });
    if (r < 1) bs.forEach(function(b){ b.style.fontSize = Math.max(11, Math.floor(base * r * 0.97)) + 'px'; });
    g.setAttribute('data-fit', '');
  });
  /* Two-column answer grids fall back to one column when any option label would not fit its half —
     including the room the check mark (22 px + 12 px gap) takes after a right answer. */
  (root || document).querySelectorAll('.opts[data-g2]:not(.locked)').forEach(function(box){
    box.classList.add('grid2');
    var tight = Array.prototype.some.call(box.querySelectorAll('.opt'), function(o){
      if (o.scrollWidth > o.clientWidth + 1) return true;
      var cs = getComputedStyle(o), room = o.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var r = document.createRange(); r.selectNodeContents(o);
      return r.getBoundingClientRect().width + 34 > room + 1; });
    if (tight) box.classList.remove('grid2');
  });
};
(function(){
  var raf = 0; function later(e){ if (e && e.type === 'resize') document.querySelectorAll('.pairs[data-fit]').forEach(function(g){ g.removeAttribute('data-fit'); }); if (!raf) raf = requestAnimationFrame(function(){ raf = 0; M.fitWords(); }); }
  function init(){ var app = document.getElementById('app'); if (app) new MutationObserver(later).observe(app, {childList:true, subtree:true}); window.addEventListener('resize', later); later(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
M.deText = function(item){ return (item.art ? item.art + ' ' : '') + item.de; };
M.enText = function(item){ return item.en; };
/* English noun phrase for feedback: "This is the knee." / "This is a stomachache." / the question in quotes. */
M.enPhrase = function(item){
  if (item.q) return '“' + item.en.replace(/“/g, '‘').replace(/”/g, '’') + '”';
  if (item.enNP) return item.enNP;
  var mod = M.byId[item.mod];
  return mod && mod.enThe ? 'the ' + item.en : item.en;
};
/* 0–10 pain scale (NRS) — UI typography, never inside an illustration */
M.nrs = function(){
  var el = h('div', {class:'nrs', role:'img', 'aria-label':'Pain scale from 0, no pain, to 10, the worst pain imaginable'});
  var row = h('div', {class:'nrs-row'});
  for (var i = 0; i <= 10; i++) row.appendChild(h('span', {class:'nrs-c', style:{'--k':i / 10}, text:String(i)}));
  el.appendChild(row);
  el.appendChild(h('div', {class:'nrs-l'}, h('span', {text:'no pain'}), h('span', {text:'worst pain'})));
  return el;
};

/* ---------- distractors: same module, dangerous neighbours first ---------- */
M.distractors = function(item, mod, n, ok){
  ok = ok || function(){ return true; };
  var excl = {}; excl[item.id] = 1; (item.exclude||[]).forEach(function(x){ excl[x] = 1; });
  var good = function(o){ return !excl[o.id] && !(o.exclude||[]).some(function(x){ return x === item.id; }) && ok(o); };
  var nb = M.shuffle((item.nb||[]).map(function(id){ return mod.itemById[id]; }).filter(function(o){ return o && good(o); }));
  var out = nb.slice(0, Math.min(2, n));
  var rest = M.shuffle(mod.items.filter(function(o){ return good(o) && out.indexOf(o) < 0; }));
  while (out.length < n && rest.length) out.push(rest.shift());
  return out;
};

/* ---------- shared UI pieces ---------- */
function prompt(item){
  return h('div', {class:'prompt'}, h('h2', {class:'prompt-en', text:item.en}), item.hint ? h('div', {class:'prompt-hint', text:item.hint}) : null, item.scale ? M.nrs() : null);
}
function optButtons(list, onPick, cls){
  // list: [{html|text, key, correct}] — already shuffled by caller
  var box = h('div', {class:'opts' + (cls ? ' ' + cls : '')});
  if (/\bgrid2\b/.test(cls || '')) box.setAttribute('data-g2', '');
  var locked = false;
  list.forEach(function(o, i){
    var b = h('button', {class:'opt press', type:'button', style:{animationDelay:(80 + i*40) + 'ms'}, 'data-key':o.key});
    if (o.html) b.innerHTML = o.html; else b.textContent = o.text;
    b.addEventListener('click', function(){ if (locked) return; locked = true; box.classList.add('locked'); onPick(o, b, box); });
    box.appendChild(b);
  });
  return box;
}
function markOpts(box, picked, correctKey){
  Array.prototype.forEach.call(box.children, function(b){
    var k = b.getAttribute('data-key');
    if (k === correctKey) { b.classList.add('ok'); if (b === picked) b.appendChild(M.chk()); }
    else if (b === picked) { b.classList.add('bad', 'shake'); }
    else b.classList.add('dim');
  });
}
function feedback(zone, parts){
  var fb = zone.querySelector('.feedback') || zone.appendChild(h('div', {class:'feedback', 'aria-live':'polite'}));
  fb.innerHTML = '';
  if (parts.de) fb.appendChild(h('div', {class:'fb-de' + (parts.ok ? ' ok' : ''), html:parts.de}));
  if (parts.note) fb.appendChild(h('div', {class:'fb-note', html:parts.note}));
  if (parts.rule) fb.appendChild(h('div', {class:'fb-rule', text:parts.rule}));
  return fb;
}
M.ui = {prompt:prompt, optButtons:optButtons, markOpts:markOpts, feedback:feedback};

function stage(ctx, plateView, plateOpts){
  // standard one-idea layout: plate | side (prompt + answer zone)
  var wrap = ctx.host, st = h('div', {class:'stage'}), side = h('div', {class:'side'});
  var plate = null;
  if (plateView) { plate = M.Plate(plateView, plateOpts); st.appendChild(plate.el); ctx.plates.push(plate); }
  st.appendChild(side); wrap.appendChild(st);
  if (plate) plate.draw(ctx.drawMs);
  return {side:side, plate:plate};
}

/* ---------- typed-answer checking (plan §4.6) ---------- */
function lc(s){ return s.toLocaleLowerCase('de-DE'); }
function splitArt(s){ var m = /^(der|die|das)\s+(.+)$/i.exec(s); return m ? {art:m[1], noun:m[2]} : {art:null, noun:s}; }
var UML = {'ä':'a','ö':'o','ü':'u'};
function umlautDrop(a, b){ // a typed, b target: differ only by ä/ö/ü → a/o/u somewhere
  if (a.length !== b.length) return false; var diff = false;
  for (var i = 0; i < a.length; i++) { if (a[i] === b[i]) continue; if (UML[b[i]] === a[i]) diff = true; else return false; }
  return diff;
}
M.checkTyped = function(input, targets, kind){
  // kind 'word' (article required) | 'plural' (article optional)
  var s = M.norm(input); if (!s) return {result:'wrong', note:'Type the German word.'};
  var best = null;
  targets.forEach(function(t){
    if (best && best.result === 'ok') return;
    var r = typeof t === 'string' ? one(s, t, kind) : one(s, t.t, t.kind || kind); if (!best || rank(r) > rank(best)) best = r;
  });
  return best;
};
function rank(r){ return r.result === 'ok' ? 3 : r.result === 'almost' ? 2 : 1; }
function one(s, t, kind){
  var S = splitArt(s), Tt = splitArt(t);
  var sn = S.noun, tn = Tt.noun, sl = lc(sn), tl = lc(tn), canon = t;
  var nounOk = null, note = '';
  if (sn === tn) nounOk = 'ok';
  else if (sl === tl) { nounOk = 'ok'; note = sn[0] !== tn[0] ? 'Nouns are capitalized in German.' : ''; }
  else if (lc(M.deUml(sn)) === lc(M.deUml(tn)) && /ae|oe|ue|ss/i.test(sn)) { nounOk = 'ok'; note = 'Accepted. The usual spelling is <b>' + M.esc(tn) + '</b>.'; }
  else if (kind === 'plural' && umlautDrop(sl, tl)) nounOk = 'wrong';
  else if (tn.length >= 6 && (M.lev(sl, tl) === 1 || M.lev(lc(M.deUml(sn)), lc(M.deUml(tn))) === 1)) nounOk = 'almost';
  else nounOk = 'wrong';
  if (nounOk === 'wrong') return {result:'wrong', canon:canon};
  // article
  if (Tt.art) {
    if (!S.art) {
      if (kind === 'plural' || kind === 'plonly') return {result:nounOk, canon:canon, note:note || (nounOk === 'almost' ? 'Check the spelling.' : '')};
      return {result:'almost', canon:canon, note:'Add the article: <b>' + M.esc(t) + '</b>.'};
    }
    if (lc(S.art) !== lc(Tt.art)) return {result:'wrong', canon:canon, note:'The article is <b>' + Tt.art + '</b>.'};
  }
  if (nounOk === 'almost') return {result:'almost', canon:canon, note:'Almost. Check the spelling: <b>' + M.esc(t) + '</b>.'};
  return {result:'ok', canon:canon, note:note};
}

/* Whole sentences (M3 questions): case of the first letter is free, commas and the final ? are optional. */
function sNorm(x){ return M.norm(x).replace(/[",]/g, '').replace(/!+$/, '').replace(/\s+/g, ' ').trim(); }
function unitOf(item){ var m = item && M.byId[item.mod]; return (m && m.unit) || 'question'; }
M.unitOf = unitOf;
function capFirst(x){ return x.charAt(0).toLocaleUpperCase('de-DE') + x.slice(1); }
M.checkSentence = function(input, targets, item){
  var s = sNorm(input); if (!s) return {result:'wrong', note:'Type the ' + unitOf(item) + ' in German.'};
  var best = null;
  // M4: 'bitte' is optional in every instruction (Husten Sie mal. / Atmen Sie aus.) — accept each target without it as well
  if (item && item.wf) targets = targets.concat(targets.map(function(t){ return t.replace(/ bitte\b/, ''); }).filter(function(t){ return targets.indexOf(t) < 0; }));
  // M4: a typical mistake (Atmen Sie bitte tief. / Legen Sie bitte hin.) is always wrong and names its rule, even when it is only one letter away;
  // without 'bitte' in the input it also matches the mistake without 'bitte' — unless the input is exactly a correct sentence (only bitte's position differed)
  var b0 = lc(s), exact = targets.some(function(t){ return lc(sNorm(t)) === b0; });
  var hit = exact ? null : (item && item.wf || []).filter(function(w){ var a = lc(sNorm(w.de)); return a === b0 || (!/\bbitte\b/.test(b0) && a.replace(/ bitte\b/, '') === b0); })[0];
  if (hit) return {result:'wrong', canon:targets[0], wf:hit.r};
  targets.forEach(function(t){
    if (best && best.result === 'ok') return;
    var tn = sNorm(t), r;
    var a = capFirst(s), b = capFirst(tn);
    if (a === b) r = {result:'ok'};
    else if (lc(a) === lc(b)) {
      var sw = a.split(' '), tw = b.split(' '), sieBad = tw.some(function(w, i){ return (w === 'Sie' || w === 'Ihnen') && sw[i] !== w; });
      r = sieBad ? {result:'almost', note:'Formal <b>Sie</b> and <b>Ihnen</b> always start with a capital letter.'} : {result:'ok', note:'Nouns are capitalized in German.'};
    }
    else if (lc(M.deUml(a)) === lc(M.deUml(b)) && /ae|oe|ue|ss/i.test(a)) r = {result:'ok', note:'Accepted. The usual spelling is <b>' + M.esc(t) + '</b>.'};
    else {
      var ws = lc(a).split(' ').sort().join(' '), wt = lc(b).split(' ').sort().join(' ');
      if (ws === wt) r = {result:'wrong', note:'The words are right, but the order isn’t.', order:true};
      else {
        var d = M.lev(lc(M.deUml(a)), lc(M.deUml(b)));
        r = d <= (b.length >= 14 ? 2 : 1) ? {result:'almost', note:'Almost. Check the spelling: <b>' + M.esc(t) + '</b>.'} : {result:'wrong'};
      }
    }
    r.canon = t;
    if (!best || rank(r) > rank(best)) best = r;
  });
  return best;
};

function umlautBar(input){
  var bar = h('div', {class:'uml'});
  ['ä','ö','ü','ß'].forEach(function(ch){
    var b = h('button', {type:'button', class:'press', text:ch, 'aria-label':'Insert ' + ch});
    b.addEventListener('pointerdown', function(e){ e.preventDefault(); });
    b.addEventListener('click', function(){
      if (input.disabled) return;
      var a = input.selectionStart == null ? input.value.length : input.selectionStart, z = input.selectionEnd == null ? a : input.selectionEnd;
      input.value = input.value.slice(0, a) + ch + input.value.slice(z); input.focus(); input.setSelectionRange(a + 1, a + 1);
      input.dispatchEvent(new Event('input'));
    });
    bar.appendChild(b);
  });
  return bar;
}
function typeBox(ctx, side, placeholder, onCheck){
  var zone = h('div', {class:'answer'});
  var input = h('input', {class:'tin', type:'text', autocomplete:'off', autocapitalize:'off', autocorrect:'off', spellcheck:'false', placeholder:placeholder, 'aria-label':placeholder, enterkeyhint:'done'});
  var btn = h('button', {class:'btn primary press', type:'button', text:'Check'});
  var done = false;
  function go(){ if (done) return; if (!M.norm(input.value)) { input.focus(); return; } done = true; input.disabled = true; btn.remove(); var ub = zone.querySelector('.uml'); if (ub) ub.remove(); onCheck(input.value, input, zone); }
  btn.addEventListener('click', go);
  input.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); } });
  zone.appendChild(h('div', {class:'input-row'}, input, btn));
  zone.appendChild(umlautBar(input));
  side.appendChild(zone);
  setTimeout(function(){ if (!ctx.coarse) input.focus({preventScroll:true}); }, 60);
  return {zone:zone, input:input};
}

/* =====================================================================
   1 · Flashcard (Aufdeck-Karte) — self-rating, low mastery value
   ===================================================================== */
def({id:'reveal', label:'Flashcard', desc:'Recall, reveal, rate yourself', facet:'meaning', cap:2, productive:false,
  applies:function(it){ return !!it.view; },
  render:function(ctx){
    var it = ctx.item, s = stage(ctx, it.view);
    s.side.appendChild(prompt(it));
    var zone = h('div', {class:'reveal-zone'}); s.side.appendChild(zone);
    var btn = h('button', {class:'reveal-btn press', type:'button', text:'Show German'}); zone.appendChild(btn);
    var shown = false;
    function show(){
      if (shown) return; shown = true; btn.remove();
      zone.appendChild(h('div', {class:'de-block'}, h('p', {class:'de-l display', html:M.deHTML(it)}), it.pl ? h('div', {class:'pl-line', html:M.deHTML(it, 'pl')}) : null));
      var row = h('div', {class:'selfrate'});
      var no = h('button', {class:'btn press', type:'button', text:'Not yet'}), yes = h('button', {class:'btn primary press', type:'button', text:'I knew it'});
      var used = false;
      no.addEventListener('click', function(){ if (used) return; used = true; ctx.done({result:'notyet', silent:true}); });
      yes.addEventListener('click', function(){ if (used) return; used = true; ctx.done({result:'knew', silent:true}); });
      row.appendChild(no); row.appendChild(yes); zone.appendChild(row);
      yes.focus({preventScroll:true});
    }
    btn.addEventListener('click', show);
    ctx.onReveal = show;
  }});

/* =====================================================================
   2 · Picture → word
   ===================================================================== */
def({id:'img2word', label:'Picture → word', desc:'Choose the German word', facet:'meaning', cap:3, productive:false,
  applies:function(it, mod){ return !!it.view && mod.items.length >= 4; },
  render:function(ctx){
    var it = ctx.item, s = stage(ctx, it.view, {alt:'Illustration'});
    s.side.appendChild(h('p', {class:'instr', text:it.q ? 'Which ' + unitOf(it) + ' fits?' : 'Which word is it?'}));
    var opts = M.shuffle([it].concat(M.distractors(it, ctx.mod, 3)));
    var zone = h('div', {class:'answer'});
    zone.appendChild(optButtons(opts.map(function(o){ return {html:M.deHTML(o), key:o.id}; }), function(o, b, box){
      var ok = o.key === it.id; markOpts(box, b, it.id);
      if (!ok) feedback(zone, {note:it.q ? (unitOf(it) === 'question' ? 'The question is <b>' : 'This means <b>') + M.esc(M.enPhrase(it)) + '</b>' : 'This is <b>' + M.esc(M.enPhrase(it)) + '</b>. ' + M.esc(it.trap || '')});
      ctx.done({result:ok ? 'ok' : 'wrong'});
    }, 'grid2'));
    s.side.appendChild(zone);
  }});

/* =====================================================================
   3 · Word → picture
   ===================================================================== */
def({id:'word2img', label:'Word → picture', desc:'Find the matching picture', facet:'meaning', cap:3, productive:false,
  applies:function(it, mod){ return !!it.view && mod.items.length >= 4; },
  render:function(ctx){
    var it = ctx.item, st = h('div', {class:'stage w2i'}), side = h('div', {class:'side'});
    side.appendChild(h('p', {class:'de-l display', html:M.deHTML(it)}));
    side.appendChild(h('p', {class:'instr', style:{marginTop:'12px'}, text:it.q ? 'Which picture fits the ' + unitOf(it) + '?' : 'Which picture shows it?'}));
    var opts = M.shuffle([it].concat(M.distractors(it, ctx.mod, 3, function(o){ return !!o.view; })));
    var grid = h('div', {class:'imgopts'}), locked = false;
    opts.forEach(function(o, i){
      var p = M.Plate(o.view, {alt:'Option ' + (i + 1)}); ctx.plates.push(p);
      var b = h('button', {class:'imgopt press', type:'button', 'data-key':o.id, 'aria-label':'Picture ' + (i + 1), style:{animationDelay:(80 + i*50) + 'ms'}}, p.el);
      b.addEventListener('click', function(){
        if (locked) return; locked = true;
        var ok = o.id === it.id;
        Array.prototype.forEach.call(grid.children, function(c, j){ var oj = opts[j]; if (oj.id === it.id) c.classList.add('ok'); else if (c === b) c.classList.add('bad', 'shake'); else c.classList.add('dim'); });
        if (!ok) feedback(side, {note:it.q ? 'This ' + unitOf(it) + ' means <b>' + M.esc(M.enPhrase(it)) + '</b> The picture you chose goes with ' + M.esc(M.enPhrase(o)) : '<b>' + M.esc(M.deText(it)) + '</b> = ' + M.esc(it.en) + '. You chose ' + M.esc(M.enPhrase(o)) + '.'});
        else feedback(side, {de:M.esc(it.en), ok:true});
        ctx.done({result:ok ? 'ok' : 'wrong'});
      });
      grid.appendChild(b);
      p.draw(0);
    });
    st.appendChild(grid); st.appendChild(side);
    ctx.host.appendChild(st);
  }});

/* =====================================================================
   4 · Body map — tap the place (location facet, high value)
   ===================================================================== */
def({id:'tap', label:'Body map', desc:'Tap where it is', facet:'location', cap:5, productive:true,
  applies:function(it, mod){ return !!(it.tap && mod.tapmaps && mod.tapmaps[it.tap]); },
  render:function(ctx){
    var it = ctx.item, mod = ctx.mod, ids = mod.tapmaps[it.tap];
    ctx.host.classList.add('mapmode');
    var st = h('div', {class:'stage'}), side = h('div', {class:'side'}), area = h('div', {class:'maparea'});
    side.appendChild(prompt(it));
    side.appendChild(h('p', {class:'instr', style:{marginTop:'14px'}, text:'Tap it on the picture.'}));
    var maps = ids.map(function(id){ var md = mod.maps[id]; return M.TapMap(mod, id, {caption:ids.length > 1 ? (md.caption || (/back/.test(id) ? 'Back' : 'Front')) : null}); });
    var narrow = ids.length > 1 && window.matchMedia('(max-width: 599px)').matches;
    var holder = h('div', {class:'maps'});
    var seg = null;
    if (narrow) {
      seg = M.segmented(ids.map(function(id, i){ return {v:i, t:mod.maps[id].short || (i ? 'Back' : 'Front')}; }), 0, function(v){ show(v); }, 'Body view');
      area.appendChild(h('div', {class:'map-switch'}, seg.el));
    }
    function show(i){ maps.forEach(function(mp, j){ mp.el.style.display = (!narrow || i === j) ? '' : 'none'; }); }
    maps.forEach(function(mp){ holder.appendChild(mp.el); });
    show(0); area.appendChild(holder);
    st.appendChild(area); st.appendChild(side); ctx.host.appendChild(st);
    var zone = h('div', {class:'answer'}); side.appendChild(zone);
    var done = false;
    maps.forEach(function(mp, mi){
      mp.onTap(function(pt){
        if (done) return; done = true;
        mp.tapMark(pt);
        var hits = mp.hit(pt), poly = !!mp.def.poly;
        var okIds = [it.id].concat(it.tapOk || []);
        // ellipse maps (M1): any overlapping region may match; polygon maps (situs): only the organ actually tapped counts
        var cand = poly ? hits.slice(0, 1) : hits;
        var correct = cand.some(function(x){ return okIds.indexOf(x.r.item) >= 0; });
        var tapped = hits.length ? mod.itemById[hits[0].r.item] : null;
        if (correct) {
          var reg = cand.filter(function(x){ return okIds.indexOf(x.r.item) >= 0; })[0].r;
          if (poly) { mp.focus([reg.item]); mp.markItem(reg.item, 'hit-ok'); } else mp.mark(reg, 'hit-ok');
          var also = reg.item !== it.id && mod.itemById[reg.item];
          feedback(zone, {de:M.deHTML(it), ok:true, note:also ? M.esc(also.tapNote || '') : ''});
        } else {
          if (poly) maps.forEach(function(m2){ m2.focus([it.id].concat(m2 === mp && tapped ? [tapped.id] : [])); });
          if (tapped) { if (poly) mp.markItem(tapped.id, 'hit-bad'); else mp.mark(hits[0].r, 'hit-bad'); }
          // show the nearest correct place (prefer the map that was tapped)
          var best = null;
          maps.forEach(function(m2, j){ m2.def.regions.forEach(function(r){ if (r.item !== it.id) return;
            var d = j === mi ? m2.dist(r, pt) : 1e9 + j; if (!best || d < best.d) best = {d:d, r:r, m:m2, j:j}; }); });
          if (best) {
            if (poly) best.m.markItem(it.id, 'hit-target'); else best.m.mark(best.r, 'hit-target');
            if (best.j === mi) best.m.lead(pt, best.r); else if (seg) { seg.set(best.j); show(best.j); }
          }
          var where = best && best.j !== mi && mod.maps[best.m.id].whereNote ? ' ' + mod.maps[best.m.id].whereNote : '';
          feedback(zone, {de:M.deHTML(it), note:(tapped ? 'You tapped <b>' + M.esc(M.deText(tapped)) + '</b> (' + M.esc(tapped.en) + '). ' : '') + 'The ' + M.esc(it.en) + ' ' + (it.enPl ? 'are' : 'is') + ' marked.' + where + (it.tapWhy ? ' ' + M.esc(it.tapWhy) : '')});
        }
        ctx.done({result:correct ? 'ok' : 'wrong'});
      });
    });
  }});

/* =====================================================================
   5 · Article (der / das / die)
   ===================================================================== */
def({id:'article', label:'Article', desc:'der, das or die', facet:'form', cap:3, productive:false,
  applies:function(it){ return !!it.art && !it.plOnly; },
  render:function(ctx){
    var it = ctx.item, s = stage(ctx, it.view);
    s.side.appendChild(h('p', {class:'de-l display'}, h('span', {class:'noun', text:it.de})));
    s.side.appendChild(h('div', {class:'prompt-hint', text:it.en}));
    var zone = h('div', {class:'answer'});
    var arts = M.shuffle(['der', 'das', 'die']);
    zone.appendChild(optButtons(arts.map(function(a){ return {html:'<span class="dot ' + a + '" aria-hidden="true"></span>' + a, key:a}; }), function(o, b, box){
      var ok = o.key === it.art; markOpts(box, b, it.art);
      feedback(zone, {de:M.deHTML(it), ok:ok, note:ok ? '' : M.esc(it.trap || ''), rule:ok ? '' : (ctx.mod.grammar && ctx.mod.grammar.article)});
      ctx.done({result:ok ? 'ok' : 'wrong'});
    }, 'art3'));
    s.side.appendChild(zone);
  }});

/* =====================================================================
   6 · Plural — MC in boxes 1–2, typed from box 3
   ===================================================================== */
def({id:'plural', label:'Plural', desc:'Singular → plural', facet:'form', cap:3, productive:false,
  applies:function(it){ return !!(it.pl && it.plWrong && it.plWrong.length >= 2); },
  render:function(ctx){
    var it = ctx.item, s = stage(ctx, it.view);
    s.side.appendChild(h('p', {class:'de-l display', html:M.deHTML(it)}));
    s.side.appendChild(h('p', {class:'instr', style:{marginTop:'12px'}, text:'And the plural?'}));
    var typed = M.store.box(it, 'form') >= 3;
    if (typed) {
      typeBox(ctx, s.side, 'die …', function(val, input, zone){
        var alts = (it.plAlt || []).map(function(x){ return 'die ' + x; });
        var r = M.checkTyped(val, ['die ' + it.pl].concat(alts), 'plural');
        input.classList.add(r.result === 'ok' ? 'ok' : r.result === 'almost' ? 'almost' : 'bad');
        if (r.result === 'wrong') input.classList.add('shake');
        var also = alts.length ? (r.result !== 'wrong' && r.canon && r.canon !== 'die ' + it.pl ? 'Also correct. The plural taught here: <b>die ' + M.esc(it.pl) + '</b>' : r.result === 'ok' ? 'Also correct: ' + alts.map(M.esc).join(', ') + '.' : '') : '';
        feedback(zone, {de:M.deHTML(it, 'pl'), ok:r.result === 'ok', note:[r.result === 'ok' ? r.note : (r.note || M.esc(it.trap || '')), also].filter(Boolean).join(' ')});
        ctx.done({result:r.result, cap:5});
      });
      return;
    }
    var opts = M.shuffle([{text:'die ' + it.pl, key:'ok'}].concat(it.plWrong.slice(0, 2).map(function(w, i){ return {text:'die ' + w, key:'w' + i}; })));
    var zone = h('div', {class:'answer'});
    zone.appendChild(optButtons(opts.map(function(o){ return {html:'<span class="dot pl" aria-hidden="true"></span>' + M.esc(o.text), key:o.key}; }), function(o, b, box){
      var ok = o.key === 'ok'; markOpts(box, b, 'ok');
      if (!ok) feedback(zone, {note:M.esc(it.trap || '')});
      ctx.done({result:ok ? 'ok' : 'wrong'});
    }));
    s.side.appendChild(zone);
  }});

/* =====================================================================
   6b · Compound builder (M5) — die Lunge + die Entzündung → die Lungenentzündung
   The learner picks the article and joins the pieces; the last word decides the gender,
   and a joining -n- (Fugen-n) may sit between the words. A decoy piece has the wrong joint.
   ===================================================================== */
function cpPieces(cp){
  var ps = cp.parts.map(function(p, i){ return i === 0 ? p[1] : p[1].toLocaleLowerCase('de-DE'); });
  ps[ps.length - 1] += cp.fuge; // the joint belongs to the word before it
  return ps.concat([cp.head[1].toLocaleLowerCase('de-DE')]);
}
function cpHTML(cp, art){
  var ps = cp.parts.map(function(p, i){ return i === 0 ? p[1] : p[1].toLocaleLowerCase('de-DE'); });
  var w = ps.map(M.esc).join('') + (cp.fuge ? '<span class="fuge">' + M.esc(cp.fuge) + '</span>' : '') + '<span class="cp-head">' + M.esc(cp.head[1].toLocaleLowerCase('de-DE')) + '</span>';
  art = art || cp.art;
  return '<span class="dot ' + art + '" aria-hidden="true"></span><span class="art">' + art + '</span> <span class="cpw">' + w + '</span>'; // not .noun: the word holds child spans (joint, head)
}
function cpSum(cp){
  return cp.parts.concat([cp.head]).map(function(p){ return '<span class="cp-pt">' + (p[0] ? '<span class="art ' + p[0] + '">' + p[0] + '</span> ' : '') + M.esc(p[1]) + '</span>'; }).join(' <span class="cp-plus">+</span> ');
}
M.cpHTML = cpHTML;
def({id:'compound', label:'Compound builder', desc:'Build the long word and its article', facet:'form', cap:5, productive:true,
  applies:function(it){ return !!it.cp; },
  render:function(ctx){
    var it = ctx.item, cp = it.cp, s = stage(ctx, it.view);
    s.side.appendChild(h('div', {class:'prompt'}, h('h2', {class:'prompt-en', text:cp.en})));
    s.side.appendChild(h('p', {class:'cp-sum', html:cpSum(cp)}));
    s.side.appendChild(h('p', {class:'instr', style:{marginTop:'10px'}, text:'Pick the article and build the word.'}));
    var want = cpPieces(cp), toks = want.map(function(t, i){ return {t:t, id:'p' + i}; });
    if (cp.decoy && want.indexOf(cp.decoy) < 0) toks.push({t:cp.decoy, id:'x0'});
    var order = M.shuffle(toks), placed = [], art = null, locked = false;
    var zone = h('div', {class:'answer'});
    var arts = h('div', {class:'cp-arts', role:'group', 'aria-label':'Article'});
    var line = h('div', {class:'tiles-line cp-line', 'aria-label':'Your word'}), bank = h('div', {class:'bank'});
    var check = h('button', {class:'btn primary press', type:'button', text:'Check', disabled:true});
    ['der', 'das', 'die'].forEach(function(a){
      var b = h('button', {class:'wt cp-art press', type:'button', 'data-art':a, 'aria-pressed':'false', html:'<span class="dot ' + a + '" aria-hidden="true"></span>' + a});
      b.addEventListener('click', function(){ if (locked) return; art = a; Array.prototype.forEach.call(arts.children, function(c){ var on = c.getAttribute('data-art') === a; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); }); render(); });
      arts.appendChild(b);
    });
    function word(){ var w = placed.map(function(x){ return x.t; }).join(''); return w; }
    function render(){
      line.innerHTML = ''; bank.innerHTML = '';
      if (art) line.appendChild(h('span', {class:'cp-a art ' + art, text:art}));
      placed.forEach(function(tk, i){
        var b = h('button', {class:'wt cp-piece press' + (i ? ' joined' : ''), type:'button', text:tk.t, 'aria-label':tk.t + ' (tap to remove)'});
        b.addEventListener('click', function(){ if (locked) return; placed.splice(placed.indexOf(tk), 1); render(); });
        line.appendChild(b);
      });
      order.forEach(function(tk){
        var used = placed.indexOf(tk) >= 0;
        var b = h('button', {class:'wt press' + (used ? ' ghost' : ''), type:'button', text:tk.t, tabindex:used ? '-1' : null, 'aria-hidden':used ? 'true' : null});
        b.addEventListener('click', function(){ if (locked || used) return; placed.push(tk); render(); });
        bank.appendChild(b);
      });
      check.disabled = !(art && placed.length);
    }
    check.addEventListener('click', function(){
      if (locked || !art || !placed.length) return; locked = true; check.remove();
      var okArt = art === cp.art, okWord = word() === want.join('');
      var ok = okArt && okWord;
      line.classList.add(ok ? 'ok' : 'bad'); if (!ok) line.classList.add('shake');
      bank.style.display = 'none'; arts.style.display = 'none';
      var g = ctx.mod.grammar || {}, notes = [], rule = '';
      if (!okWord) {
        var usedDecoy = placed.some(function(x){ return x.id.charAt(0) === 'x'; });
        if (usedDecoy || placed.length !== want.length) notes.push(cp.fuge ? 'The joint is <b>-' + M.esc(cp.fuge) + '-</b>: ' + M.esc(cp.parts[cp.parts.length - 1][1]) + '<b>' + M.esc(cp.fuge) + '</b>…' : 'No joining letter here: ' + M.esc(cp.parts.map(function(p){ return p[1]; }).join(' + ')) + ' + … join directly.');
        else notes.push('Check the order of the pieces.');
        rule = cp.fuge ? (g.fuge || '') : '';
      }
      if (!okArt) { notes.push('The last word decides: <b>' + cp.head[0] + ' ' + M.esc(cp.head[1]) + '</b> → <b>' + cp.art + '</b> ' + M.esc(cp.de) + '.'); rule = g.compound || rule; }
      feedback(zone, {de:cpHTML(cp), ok:ok, note:ok ? 'The last word decides the article: ' + cp.head[0] + ' ' + M.esc(cp.head[1]) + '.' : notes.join(' '), rule:ok ? '' : rule});
      ctx.done({result:ok ? 'ok' : 'wrong'});
    });
    zone.appendChild(arts); zone.appendChild(line); zone.appendChild(bank); zone.appendChild(h('div', {class:'actions'}, check));
    s.side.appendChild(zone);
    render();
  }});

/* =====================================================================
   7 · Typing (production) — English + picture → German with article
   ===================================================================== */
def({id:'type', label:'Typing', desc:'Write the German word', facet:'meaning', cap:5, productive:true,
  applies:function(it){ return !!it.de; },
  render:function(ctx){
    var it = ctx.item, s = stage(ctx, it.view);
    s.side.appendChild(prompt(it));
    var wrap = h('div', {style:{marginTop:'8px'}}); s.side.appendChild(wrap);
    if (it.q) {
      typeBox(ctx, wrap, 'The ' + unitOf(it) + ' in German', function(val, input, zone){
        var r = M.checkSentence(val, [it.de].concat(it.variants || []), it);
        input.classList.add(r.result === 'ok' ? 'ok' : r.result === 'almost' ? 'almost' : 'bad');
        if (r.result === 'wrong') input.classList.add('shake');
        // M4 order mistake: wrong first word (Sie stehen …) → the verb-first / Ich rule; otherwise the sentence's own order rule (particle, sich)
        var vfirst = r.order && it.q.mk && lc(sNorm(val).split(' ')[0]) !== lc(sNorm(it.de).split(' ')[0]);
        var g = ctx.mod.grammar || {}, rule = r.result === 'wrong' ? (g[r.wf || (r.order && it.q.mk && !vfirst && it.sentences && it.sentences[0].order) || it.q.k] || '') : '';
        var other = r.result !== 'wrong' && sNorm(r.canon) !== sNorm(it.de) ? 'Also correct. The ' + unitOf(it) + ' taught here: <b>' + M.esc(it.de) + '</b>' : '';
        feedback(zone, {de:M.deHTML(it, 'mark'), ok:r.result === 'ok', note:[r.note, other].filter(Boolean).join(' '), rule:rule});
        ctx.done({result:r.result, also:r.result === 'ok' ? [['form', 5]] : null});
      });
      return;
    }
    typeBox(ctx, wrap, it.art && !it.plOnly ? 'German, with article' : 'German', function(val, input, zone){
      var targets = [it.plOnly ? {t:M.deText(it), kind:'plonly'} : M.deText(it)].concat(it.variants || []);
      var r = M.checkTyped(val, targets, 'word');
      input.classList.add(r.result === 'ok' ? 'ok' : r.result === 'almost' ? 'almost' : 'bad');
      if (r.result === 'wrong') input.classList.add('shake');
      var also = (it.variants && it.variants.length) ? 'Also correct: ' + it.variants.map(M.esc).join(', ') + '.' : '';
      feedback(zone, {de:M.deHTML(it), ok:r.result === 'ok', note:[r.note, r.result === 'wrong' ? M.esc(it.trap || '') : '', r.result !== 'wrong' && r.canon !== M.deText(it) ? also : ''].filter(Boolean).join(' ')});
      ctx.done({result:r.result, also:r.result === 'ok' ? [['form', 5]] : null});
    });
  }});

/* =====================================================================
   8 · Sentence tiles (production)
   ===================================================================== */
function tileRule(mod, sent, placed, it){
  var g = mod.grammar || {}, used = placed.filter(function(x){ return x.id.charAt(0) === 'x'; });
  if (!used.length && it && it.q && it.q.mk && sent.de === it.de) {   // M4: name the first rule that is broken — verb first, sich after Sie, particle at the end
    var at = function(i){ return placed[i] && placed[i].id === 't' + i; }, n = sent.tiles.length;
    if (!at(0)) return g[it.q.k] || '';
    if (it.q.rf >= 0 && !at(it.q.rf)) return g.sich || '';
    if (it.q.mk.length > 1 && !at(n - 1)) return g.trenn || '';
  }
  if (!used.length) return sent.order ? (g[sent.order] || '') : '';
  var t = used[0].t, key = sent.xrule && sent.xrule[t] ? sent.xrule[t] : /^(tut|tun)$/.test(t) ? 'verb' : /^(Mein|Meine)$/.test(t) ? 'poss' : /^(im|in der)$/.test(t) ? 'ort' : sent.rule;
  return g[key] || '';
}
/* Question module: the first word's capital would give the word order away, so tiles start lower-case and the line capitalizes whatever comes first. */
function tileFace(mod, sent, tk){
  if (!mod.askMode || tk.id !== 't0') return tk.t;
  var t = tk.t; return /^(Sie|Ihnen)$/.test(t) ? t : t.charAt(0).toLocaleLowerCase('de-DE') + t.slice(1);
}
function pickSentence(it, need){ var c = (it.sentences||[]).filter(need); return c.length ? M.pick(c) : null; }
def({id:'tiles', label:'Sentence tiles', desc:'Build the sentence', facet:'form', cap:5, productive:true,
  applies:function(it){ return (it.sentences||[]).some(function(s){ return s.tiles && s.tiles.length >= 3; }); },
  render:function(ctx){
    var it = ctx.item, sent = ctx.card.sentence || (ctx.card.sentence = pickSentence(it, function(s){ return s.tiles && s.tiles.length >= 3; }));
    var st = h('div', {class:'stage tiles-stage'}), side = h('div', {class:'side'});
    var plate = M.Plate(it.view); ctx.plates.push(plate); st.appendChild(plate.el); plate.draw(ctx.drawMs);
    side.appendChild(h('h2', {class:'prompt-en', text:sent.en}));
    side.appendChild(h('p', {class:'instr', style:{marginTop:'12px'}, text:/\?$/.test(sent.de) ? 'Ask it in German.' : 'Build it in German.'}));
    var line = h('div', {class:'tiles-line', 'aria-label':'Your sentence'}), bank = h('div', {class:'bank'});
    var toks = sent.tiles.map(function(t, i){ return {t:t, id:'t' + i}; }).concat((sent.extra||[]).map(function(t, i){ return {t:t, id:'x' + i}; }));
    var order = M.shuffle(toks), placed = [], locked = false;
    var zone = h('div', {class:'answer'});
    var check = h('button', {class:'btn primary press', type:'button', text:'Check', disabled:true});
    function render(){
      line.innerHTML = ''; bank.innerHTML = '';
      placed.forEach(function(tk, pi){ var f = tileFace(ctx.mod, sent, tk); if (ctx.mod.askMode && pi === 0) f = capFirst(f); var b = h('button', {class:'wt press', type:'button', text:f}); b.addEventListener('click', function(){ if (locked) return; placed.splice(placed.indexOf(tk), 1); render(); }); line.appendChild(b); });
      order.forEach(function(tk){
        var used = placed.indexOf(tk) >= 0;
        var b = h('button', {class:'wt press' + (used ? ' ghost' : ''), type:'button', text:tileFace(ctx.mod, sent, tk), tabindex:used ? '-1' : null, 'aria-hidden':used ? 'true' : null});
        b.addEventListener('click', function(){ if (locked || used) return; placed.push(tk); render(); });
        bank.appendChild(b);
      });
      check.disabled = placed.length === 0;
    }
    check.addEventListener('click', function(){
      if (locked || !placed.length) return; locked = true; check.remove();
      var got = placed.map(function(x){ return x.t; }).join(' '), want = sent.tiles.join(' ');
      if (ctx.mod.askMode) got = capFirst(placed.map(function(x){ return tileFace(ctx.mod, sent, x); }).join(' '));
      var ok = got === want;
      line.classList.add(ok ? 'ok' : 'bad'); if (!ok) line.classList.add('shake');
      bank.style.display = 'none';
      var rule = '';
      if (!ok && sent.rule) rule = tileRule(ctx.mod, sent, placed, it);
      else if (!ok) { if (/\b(tut|tun)\b/.test(want) && ctx.mod.grammar) rule = ctx.mod.grammar.verb; if (/^(Mein|Meine)\b/.test(want) && ctx.mod.grammar && got.split(' ')[0] !== want.split(' ')[0]) rule = ctx.mod.grammar.poss; }
      feedback(zone, {de:sent.de === it.de && it.q ? M.deHTML(it, 'mark') : M.esc(sent.de), ok:ok, rule:rule});
      ctx.done({result:ok ? 'ok' : 'wrong'});
    });
    zone.appendChild(line); zone.appendChild(bank); zone.appendChild(h('div', {class:'actions'}, check));
    side.appendChild(zone); st.appendChild(side); ctx.host.appendChild(st);
    render();
  }});

/* =====================================================================
   9 · Gap sentence (mein/meine · tut/tun)
   ===================================================================== */
def({id:'cloze', label:'Gap sentence', desc:'mein / meine, tut / tun', facet:'form', cap:5, productive:true,
  applies:function(it){ return (it.sentences||[]).some(function(s){ return s.cloze && s.cloze.length; }); },
  render:function(ctx){
    var it = ctx.item;
    if (!ctx.card.cz) { var s0 = pickSentence(it, function(s){ return s.cloze && s.cloze.length; }); ctx.card.cz = {s:s0, c:M.pick(s0.cloze)}; }
    var sent = ctx.card.cz.s, cz = ctx.card.cz.c, s = stage(ctx, it.view);
    var answer = sent.tiles[cz.gap];
    var p = h('p', {class:'sent'}), gap = h('span', {class:'gap', text:'\u2009'});
    var punct = /[?!]$/.test(sent.de) ? sent.de.slice(-1) : '.', lastGap = cz.gap === sent.tiles.length - 1;
    sent.tiles.forEach(function(t, i){ if (i) p.appendChild(document.createTextNode(' ')); if (i === cz.gap) { if (!lastGap) p.appendChild(gap); } else p.appendChild(document.createTextNode(t)); });
    // a gap at the end keeps its punctuation glued to it (no stray space, no line break before ? or .)
    if (lastGap) { gap.classList.add('last'); p.appendChild(h('span', {class:'nowrap'}, gap, document.createTextNode(punct))); }
    else p.appendChild(document.createTextNode(punct));
    s.side.appendChild(p);
    s.side.appendChild(h('div', {class:'sent-en', text:sent.en}));
    var zone = h('div', {class:'answer'});
    var opts = M.shuffle(cz.options.map(function(o){ return {text:o, key:o}; }));
    zone.appendChild(optButtons(opts, function(o, b, box){
      var ok = o.key === answer; markOpts(box, b, answer);
      gap.textContent = answer; gap.classList.add('ok', 'filled');
      feedback(zone, {rule:ok ? '' : (ctx.mod.grammar && ctx.mod.grammar[cz.rule]) || ''});
      ctx.done({result:ok ? 'ok' : 'wrong'});
    }, 'grid2'));
    s.side.appendChild(zone);
  }});
/* =====================================================================
   12 · Picture → correct form (M4) — the instruction vs. its typical mistakes
   ===================================================================== */
def({id:'form', label:'Correct form', desc:'Pick the correct sentence', facet:'form', cap:5, productive:true,
  applies:function(it){ return !!(it.view && it.q && it.wf && it.wf.length >= 2); },
  render:function(ctx){
    var it = ctx.item, c = ctx.card;
    if (!c.fm) c.fm = M.shuffle([-1].concat(M.shuffle(it.wf.map(function(_, i){ return i; })).slice(0, 3)));
    var s = stage(ctx, it.view);
    s.side.appendChild(prompt(it));
    s.side.appendChild(h('p', {class:'instr', style:{marginTop:'12px'}, text:'Which sentence is correct?'}));
    var zone = h('div', {class:'answer'});
    zone.appendChild(optButtons(c.fm.map(function(k){ return {text:k < 0 ? it.de : it.wf[k].de, key:k < 0 ? 'ok' : 'w' + k}; }), function(o, b, box){
      var ok = o.key === 'ok'; markOpts(box, b, 'ok');
      var g = ctx.mod.grammar || {}, w = ok ? null : it.wf[+o.key.slice(1)];
      feedback(zone, {de:M.deHTML(it, 'mark'), ok:ok, rule:ok ? '' : (g[w.r] || '')});
      ctx.done({result:ok ? 'ok' : 'wrong'});
    }, 'sents'));
    s.side.appendChild(zone);
  }});

/* =====================================================================
   13 · Exam sequence (M4) — put the steps in order; only sequences with one correct order
   ===================================================================== */
function seqsOf(it, mod){ return (mod.seqs || []).filter(function(q){ return q.steps.indexOf(it.id) >= 0; }); }
def({id:'order', label:'Exam steps', desc:'Put the steps in order', facet:'meaning', cap:3, productive:false,
  applies:function(it, mod){ return seqsOf(it, mod).length > 0; },
  render:function(ctx){
    var it = ctx.item, mod = ctx.mod, c = ctx.card;
    if (!c.sq) {
      var q = M.pick(seqsOf(it, mod)), sh;
      do { sh = M.shuffle(q.steps.slice()); } while (sh.join() === q.steps.join());
      c.sq = {id:q.id, sh:sh};
    }
    var seq = mod.seqs.filter(function(q){ return q.id === c.sq.id; })[0], steps = seq.steps.map(function(id){ return mod.itemById[id]; });
    ctx.host.classList.add('seqmode');
    var st = h('div', {class:'stage seq-stage'}), side = h('div', {class:'side'}), zone = h('div', {class:'answer'});
    side.appendChild(h('h2', {class:'prompt-en', text:seq.en}));
    side.appendChild(h('p', {class:'instr', style:{marginTop:'10px'}, text:'Tap the steps in the order you say them.'}));
    var list = h('ol', {class:'seq', 'aria-label':'Your order'}), bank = h('div', {class:'seq-bank'});
    var placed = [], locked = false;
    var check = h('button', {class:'btn primary press', type:'button', text:'Check', disabled:true});
    function row(o, n){ return [h('span', {class:'sn', 'aria-hidden':'true', text:n ? String(n) : ''}), h('span', {class:'st qde', text:o.de})]; }
    function render(){
      list.innerHTML = ''; bank.innerHTML = '';
      steps.forEach(function(_, i){
        var o = placed[i] ? mod.itemById[placed[i]] : null;
        if (!o) { list.appendChild(h('li', {class:'slot empty'}, h('span', {class:'sn', 'aria-hidden':'true', text:String(i + 1)}), h('span', {class:'st'}))); return; }
        var b = h('button', {class:'slot press', type:'button', 'aria-label':'Step ' + (i + 1) + ': ' + o.de + '. Tap to remove.'}, row(o, i + 1));
        b.addEventListener('click', function(){ if (locked) return; placed.splice(i, 1); render(); });
        list.appendChild(h('li', null, b));
      });
      c.sq.sh.forEach(function(id){
        var o = mod.itemById[id], used = placed.indexOf(id) >= 0;
        var b = h('button', {class:'opt seqo press' + (used ? ' ghost' : ''), type:'button', text:o.de, tabindex:used ? '-1' : null, 'aria-hidden':used ? 'true' : null});
        b.addEventListener('click', function(){ if (locked || used) return; placed.push(id); render(); });
        bank.appendChild(b);
      });
      check.disabled = placed.length !== steps.length;
    }
    check.addEventListener('click', function(){
      if (locked || placed.length !== steps.length) return; locked = true; check.remove();
      var ok = placed.join() === seq.steps.join();
      list.classList.add(ok ? 'ok' : 'bad'); if (!ok) list.classList.add('shake');
      bank.style.display = 'none';
      if (!ok) { list.innerHTML = ''; steps.forEach(function(o, i){ list.appendChild(h('li', null, h('div', {class:'slot fixed' + (placed[i] === o.id ? ' right' : '')}, row(o, i + 1)))); }); }
      var fb = feedback(zone, {ok:ok, note:ok ? '' : 'The usual order is shown above.'});
      var en = h('ol', {class:'seq-en'}); steps.forEach(function(o){ en.appendChild(h('li', {text:o.en})); }); fb.appendChild(en);
      ctx.done({result:ok ? 'ok' : 'wrong'});
    });
    zone.appendChild(list); zone.appendChild(bank); zone.appendChild(h('div', {class:'actions'}, check));
    side.appendChild(zone); st.appendChild(side); ctx.host.appendChild(st);
    render();
  }});

/* =====================================================================
   11 · Term pairs — 4 Latin / medical terms ↔ 4 German words (M2, M5)
   ===================================================================== */
def({id:'pairs', label:'Term pairs', desc:'Match medical terms to German', facet:'meaning', cap:3, productive:false,
  applies:function(it, mod){ return !!it.lat && mod.items.filter(function(o){ return !!o.lat; }).length >= 4; },
  render:function(ctx){
    var it = ctx.item, mod = ctx.mod;
    if (!ctx.card.pairs) ctx.card.pairs = [it].concat(M.distractors(it, mod, 3, function(o){ return !!o.lat && o.lat !== it.lat; })).map(function(o){ return o.id; });
    var set = ctx.card.pairs.map(function(id){ return mod.itemById[id]; });
    ctx.host.classList.add('pairsmode');
    var st = h('div', {class:'stage pairs-stage'}), side = h('div', {class:'side'});
    side.appendChild(h('h2', {class:'prompt-en', text:'Match the pairs.'}));
    side.appendChild(h('p', {class:'instr', style:{marginTop:'10px'}, text:(mod.latLabel || 'Latin term') + ' on the left, German on the right.'}));
    var zone = h('div', {class:'answer'});
    var colL = h('div', {class:'pcol', role:'group', 'aria-label':(mod.latLabel || 'Latin term') + 's'}), colR = h('div', {class:'pcol', role:'group', 'aria-label':'German words'});
    var L = M.shuffle(set), R = M.shuffle(set);
    var sel = null, matched = 0, targetErr = false, errs = 0, busy = false;
    function mk(o, side_, i){
      var b = h('button', {class:'opt pc press', type:'button', 'data-key':o.id, 'data-side':side_, style:{animationDelay:(80 + i*40) + 'ms'}});
      if (side_ === 'L') b.innerHTML = '<span class="pcl"><i class="term">' + M.esc(o.lat) + '</i></span>'; else b.innerHTML = '<span class="pcl">' + M.deHTML(o) + '</span>';
      b.addEventListener('click', function(){ pick(b, o, side_); });
      return b;
    }
    L.forEach(function(o, i){ colL.appendChild(mk(o, 'L', i)); });
    R.forEach(function(o, i){ colR.appendChild(mk(o, 'R', i + 4)); });
    function pick(b, o, sd){
      if (busy || b.classList.contains('ok')) return;
      if (!sel || sel.sd === sd) { if (sel) sel.b.classList.remove('sel'); if (sel && sel.b === b) { sel = null; return; } sel = {b:b, o:o, sd:sd}; b.classList.add('sel'); b.setAttribute('aria-pressed', 'true'); return; }
      var a = sel; sel = null; a.b.classList.remove('sel'); a.b.removeAttribute('aria-pressed');
      if (a.o.id === o.id) {
        [a.b, b].forEach(function(x){ x.classList.add('ok'); x.setAttribute('aria-disabled', 'true'); x.appendChild(M.chk()); });
        matched++;
        if (matched === set.length) finish();
      } else {
        errs++; if (a.o.id === it.id || o.id === it.id) targetErr = true;
        busy = true;
        [a.b, b].forEach(function(x){ x.classList.add('bad', 'shake'); });
        setTimeout(function(){ [a.b, b].forEach(function(x){ x.classList.remove('bad', 'shake'); }); busy = false; }, 520);
      }
    }
    function finish(){
      zone.classList.add('locked');
      var line = '<i>' + M.esc(it.lat) + '</i> = ' + M.deHTML(it);
      feedback(zone, {de:line, ok:!targetErr, note:targetErr ? 'This is <b>' + M.esc(it.en) + '</b>.' : ''});
      ctx.done({result:targetErr ? 'wrong' : 'ok'});
    }
    zone.appendChild(h('div', {class:'pairs'}, colL, colR));
    side.appendChild(zone); st.appendChild(side); ctx.host.appendChild(st);
  }});
/* =====================================================================
   10 · Question ↔ answer (M3) — doctor's question → patient's answer, or the reverse
   ===================================================================== */
function uAns(it){ return (it.ans || []).filter(function(a){ return a.u; }); }
function dlgOk(it){ // distractor filter: no question whose answer could also fit (exclude + qaEx, both ways)
  var bad = {}; bad[it.id] = 1; (it.exclude || []).concat(it.qaEx || []).forEach(function(x){ bad[x] = 1; });
  return function(o){ return !bad[o.id] && (o.exclude || []).concat(o.qaEx || []).indexOf(it.id) < 0; };
}
function dline(who, html, cls){ return h('div', {class:'dl ' + cls}, h('span', {class:'who', text:who}), h('span', {class:'dt', html:html})); }
def({id:'qa', label:'Question ↔ answer', desc:'Match the question and the patient’s answer', facet:'meaning', cap:3, productive:false,
  applies:function(it, mod){ if (!it.q || !uAns(it).length) return false; var ok = dlgOk(it); return mod.items.filter(function(o){ return o !== it && uAns(o).length && ok(o); }).length >= 3; },
  render:function(ctx){
    var it = ctx.item, mod = ctx.mod, c = ctx.card;
    if (!c.qa) {
      var ok = dlgOk(it), ds = M.distractors(it, mod, 3, function(o){ return uAns(o).length > 0 && ok(o); });
      c.qa = {dir:M.randInt(5) < 3 ? 'a2q' : 'q2a', a:M.randInt(uAns(it).length), d:ds.map(function(o){ return o.id; })};
    }
    var a = uAns(it)[c.qa.a], ds = c.qa.d.map(function(id){ return mod.itemById[id]; });
    ctx.host.classList.add('dlgmode');
    var st = h('div', {class:'stage dlg-stage'}), side = h('div', {class:'side'}), zone = h('div', {class:'answer'});
    var dlg = h('div', {class:'dlg'});
    var opts;
    if (c.qa.dir === 'q2a') {
      side.appendChild(h('h2', {class:'prompt-en', text:'What does the patient say?'}));
      dlg.appendChild(dline('Doctor', M.deHTML(it), 'doc'));
      opts = M.shuffle([{text:a.de, key:it.id}].concat(ds.map(function(o){ var u = uAns(o); return {text:M.pick(u).de, key:o.id}; })));
    } else {
      side.appendChild(h('h2', {class:'prompt-en', text:'Which question did the doctor ask?'}));
      dlg.appendChild(dline('Patient', M.esc(a.de), 'pat'));
      opts = M.shuffle([{html:M.deHTML(it), key:it.id}].concat(ds.map(function(o){ return {html:M.deHTML(o), key:o.id}; })));
    }
    side.appendChild(dlg);
    zone.appendChild(optButtons(opts, function(o, b, box){
      var good = o.key === it.id; markOpts(box, b, it.id);
      dlg.innerHTML = '';
      dlg.appendChild(dline('Doctor', M.deHTML(it, 'mark'), 'doc'));
      dlg.appendChild(dline('Patient', M.esc(a.de), 'pat'));
      feedback(zone, {ok:good, note:M.esc('“' + it.en + '” — “' + a.en + '”')});
      ctx.done({result:good ? 'ok' : 'wrong'});
    }));
    side.appendChild(zone); st.appendChild(side); ctx.host.appendChild(st);
  }});

/* =====================================================================
   13 · Dialogue (M3) — a Mini-Anamnese chain with one doctor question missing
   ===================================================================== */
function chainSpots(it, mod){ var out = []; (mod.chains || []).forEach(function(c, ci){ c.steps.forEach(function(s, si){ if (s.q === it.id) out.push([ci, si]); }); }); return out; }
def({id:'chain', label:'Dialogue', desc:'Fill in the doctor’s missing question', facet:'meaning', cap:3, productive:false,
  applies:function(it, mod){ return !!it.q && chainSpots(it, mod).length > 0; },
  render:function(ctx){
    var it = ctx.item, mod = ctx.mod, c = ctx.card;
    if (!c.ch) {
      var sp = M.pick(chainSpots(it, mod)), ch0 = mod.chains[sp[0]];
      var shown = {}; ch0.steps.slice(Math.max(0, sp[1] - 2), sp[1]).forEach(function(s){ shown[s.q] = 1; });
      var ok = dlgOk(it), ds = M.distractors(it, mod, 3, function(o){ return !!o.q && !shown[o.id] && ok(o); });
      c.ch = {c:sp[0], p:sp[1], d:ds.map(function(o){ return o.id; })};
    }
    var ch = mod.chains[c.ch.c], step = ch.steps[c.ch.p];
    ctx.host.classList.add('dlgmode');
    var st = h('div', {class:'stage dlg-stage'}), side = h('div', {class:'side'}), zone = h('div', {class:'answer'});
    side.appendChild(h('h2', {class:'prompt-en', text:'Which question is missing?'}));
    side.appendChild(h('p', {class:'instr', style:{marginTop:'8px'}, text:'Mini-Anamnese · ' + ch.en}));
    var dlg = h('div', {class:'dlg'});
    ch.steps.slice(Math.max(0, c.ch.p - 2), c.ch.p).forEach(function(s){ dlg.appendChild(dline('Doctor', M.deHTML(mod.itemById[s.q]), 'doc ctx')); dlg.appendChild(dline('Patient', M.esc(s.de), 'pat ctx')); });
    var gapLine = dline('Doctor', '<span class="dgap" aria-label="missing question">?</span>', 'doc gapl');
    dlg.appendChild(gapLine); dlg.appendChild(dline('Patient', M.esc(step.de), 'pat'));
    side.appendChild(dlg);
    var opts = M.shuffle([it].concat(c.ch.d.map(function(id){ return mod.itemById[id]; }))).map(function(o){ return {html:M.deHTML(o), key:o.id}; });
    zone.appendChild(optButtons(opts, function(o, b, box){
      var good = o.key === it.id; markOpts(box, b, it.id);
      gapLine.querySelector('.dt').innerHTML = M.deHTML(it, 'mark'); gapLine.classList.add(good ? 'ok' : 'fix');
      feedback(zone, {ok:good, note:M.esc('“' + it.en + '” — “' + step.en + '”')});
      ctx.done({result:good ? 'ok' : 'wrong'});
    }));
    side.appendChild(zone); st.appendChild(side); ctx.host.appendChild(st);
  }});
})();

;
/* js/session.js */
/* Practice session: queue building, recommended progression, re-insertion of mistakes. */
(function(){
'use strict';
var M = window.MedA1, S = M.store;

var FACET_TYPES = {
  meaning:  {low:['img2word', 'word2img', 'pairs', 'reveal', 'qa', 'chain', 'order'], high:['type']},
  form:     {low:['article', 'plural', 'cloze', 'form', 'compound'], high:['tiles', 'cloze', 'plural', 'type', 'compound']},
  location: {low:['tap'],                            high:['tap']}
};
M.FACET_TYPES = FACET_TYPES;

function allowed(mod, id){ return (mod.types || []).indexOf(id) >= 0 && M.types[id]; }
function applicable(mod, it, id){ return allowed(mod, id) && M.types[id].applies(it, mod); }

/* Recommended progression: recognition → form → production, driven by the facet boxes. */
function recommend(mod, it, avoid){
  var b = function(f){ return S.box(it, f); };
  var facets = S.facetsOf(it, mod);
  var seen = facets.some(function(f){ return S.facet(it, f); });
  var cands = [], R = mod.rec; // a module may set its own progression (M3: questions → production of questions)
  if (!seen) cands = R ? R.first.slice() : ['img2word', 'word2img', 'reveal'];
  else {
    var weak = facets.slice().sort(function(p, q){ return b(p) - b(q); });
    if (R) { // module table: interleave the facets' lists (weakest first) so every stage's types get their turn
      // an entry 'a|b' means: one of these, chosen at random (keeps every type of a stage in rotation)
      var ls = weak.map(function(f){ return (R[f] ? R[f][Math.min(b(f), R[f].length - 1)] : []).map(function(t){ return t.indexOf('|') >= 0 ? M.pick(t.split('|')) : t; }); });
      for (var ri = 0; ri < 4; ri++) ls.forEach(function(l){ if (l[ri] && cands.indexOf(l[ri]) < 0) cands.push(l[ri]); });
      weak = [];
    }
    weak.forEach(function(f){
      var lvl = b(f), list;
      if (R && R[f]) list = R[f][Math.min(lvl, R[f].length - 1)];
      else if (f === 'meaning') list = lvl <= 1 ? ['img2word', 'word2img'] : lvl === 2 ? ['word2img', 'pairs', 'img2word', 'type'] : ['type'];
      else if (f === 'form') list = lvl <= 1 ? ['article', 'plural', 'cloze'] : lvl === 2 ? ['plural', 'cloze', 'article', 'tiles'] : ['tiles', 'cloze', 'plural'];
      else list = ['tap'];
      list.forEach(function(t){ if (cands.indexOf(t) < 0) cands.push(t); });
    });
  }
  cands = cands.filter(function(t){ return applicable(mod, it, t); });
  if (!cands.length) cands = M.typeOrder.filter(function(t){ return applicable(mod, it, t); });
  var pref = cands.filter(function(t){ return avoid.indexOf(t) < 0; });
  // a little variety among the top choices
  var pool = (pref.length ? pref : cands).slice(0, 2);
  return pool.length > 1 && M.randInt(3) === 0 ? pool[1] : pool[0];
}

/* For a mistake: same facet, a different type when possible. */
function retryType(mod, it, prevType){
  var f = M.types[prevType].facet, ft = FACET_TYPES[f] || {low:[], high:[]};
  var list = ft.low.concat(ft.high).filter(function(t, i, a){ return a.indexOf(t) === i && t !== prevType && applicable(mod, it, t) && M.types[t].facet === f; });
  if (f === 'location' || !list.length) return prevType; // same type, reshuffled / fresh
  return list[0] === 'reveal' && list.length > 1 ? list[1] : list[0];
}

function noTriple(q, startIdx){
  // never the same type 3x in a row: swap with a later card where possible (retries keep their spacing)
  for (var i = Math.max(2, startIdx || 2); i < q.length; i++) {
    if (q[i].type === q[i-1].type && q[i].type === q[i-2].type && !q[i].retry) {
      for (var j = i + 1; j < q.length; j++) if (q[j].type !== q[i].type && !q[j].retry) { var t = q[i]; q[i] = q[j]; q[j] = t; break; }
    }
  }
}
function keepWindows(q, from){
  // pending retries must come back 3–5 cards after the mistake; an insertion may push one too far
  for (var k = from; k < q.length; k++) {
    var r = q[k]; if (!r.retry || r.from == null) continue;
    var kk = k;
    while (kk - r.from - 1 > 5 && kk - 1 > from && !q[kk-1].retry) { q[kk] = q[kk-1]; q[kk-1] = r; kk--; }
    // blocked by other retries right before it (many mistakes in a row): move the nearest normal card from
    // before that block to just after this retry, as long as every retry in the block keeps at least 3 between
    while (kk - r.from - 1 > 5) {
      var pr = q[kk-1];
      if (kk - 1 > from && pr.retry && pr.from != null && kk - pr.from - 1 <= 5) { q[kk] = pr; q[kk-1] = r; kk--; continue; }
      var j = kk - 1; while (j > from && q[j].retry) j--;
      if (j <= from || q[j].retry) break;
      var okMove = true;
      for (var m = j + 1; m <= kk; m++) if (q[m].retry && q[m].from != null && (m - 1) - q[m].from - 1 < 3) okMove = false;
      if (!okMove) break;
      var moved = q.splice(j, 1)[0]; q.splice(kk, 0, moved); kk--;
    }
  }
}

M.Session = function(opts){
  // opts: {mods:[mod], modId, order:'seq'|'mix', size:10|20|0, mode:'rec'|typeId, review:bool, entries?}
  var self = this;
  this.opts = opts; this.mods = opts.mods; this.q = []; this.i = 0; this.results = []; this.extra = 0;
  this.teach = S.teach();
  var entries = [];
  if (opts.review) {
    entries = S.dueList().slice(0, 20).map(function(d){ return {mod:M.byId[d.item.mod], item:d.item, facet:d.facet}; });
    entries = M.shuffle(entries);
    entries.forEach(function(e){
      var lvl = S.box(e.item, e.facet), ft = FACET_TYPES[e.facet];
      var list = (lvl >= 3 ? ft.high : ft.low).concat(ft.low).filter(function(t){ return t !== 'reveal' && applicable(e.mod, e.item, t) && M.types[t].facet === e.facet; });
      e.type = list.length ? M.pick(list.slice(0, 2)) : recommend(e.mod, e.item, []);
    });
  } else {
    var mod = opts.mods[0], items = mod.items.slice();
    var mode = opts.mode || 'rec';
    if (mode !== 'rec') items = items.filter(function(it){ return applicable(mod, it, mode); });
    if (opts.order === 'mix') {
      // SRS priority: due first, then new, then weakest; interleaved
      var now = Date.now();
      var score = function(it){
        var fs = S.facetsOf(it, mod), due = 0, unseen = 0, sum = 0;
        fs.forEach(function(f){ var st = S.facet(it, f); if (!st) unseen++; else { sum += st.box; if (st.due <= now) due++; } });
        return (due ? 0 : unseen ? 1 : 2) * 100 + sum / Math.max(1, fs.length) * 10 + M.randInt(10) / 10;
      };
      items = items.map(function(it){ return {it:it, s:score(it)}; }).sort(function(a, b){ return a.s - b.s; }).map(function(x){ return x.it; });
      var n = opts.size ? Math.min(opts.size, items.length) : items.length;
      items = M.shuffle(items.slice(0, n));
    } else {
      var start = 0;
      if (opts.size && opts.size < items.length) {
        // in order: continue where the learner left off (first item not yet practiced at all)
        var k = items.findIndex(function(it){ return !S.facetsOf(it, mod).some(function(f){ return S.facet(it, f); }); });
        start = k < 0 ? 0 : k;
        if (start + opts.size > items.length) start = Math.max(0, items.length - opts.size);
      }
      items = opts.size ? items.slice(start, start + opts.size) : items;
    }
    var recent = [];
    entries = items.map(function(it){
      var t = mode === 'rec' ? recommend(mod, it, recent.slice(-2).every(function(x, _, a){ return a.length === 2 && x === a[0]; }) ? [recent[recent.length - 1]] : []) : mode;
      recent.push(t);
      return {mod:mod, item:it, type:t};
    });
  }
  entries.forEach(function(e, k){ e.base = true; e.key = 'e' + k; e.attempt = 0; });
  this.mixedTypes = !opts.mode || opts.mode === 'rec' || !!opts.review;
  if (this.mixedTypes) noTriple(entries);
  this.q = entries; this.baseCount = entries.length; this.maxExtra = Math.ceil(entries.length * 0.5);
  this.seen = {}; this.first = {}; this.wrongItems = []; this.done = false;
};

M.Session.prototype.current = function(){ return this.q[this.i]; };
M.Session.prototype.progress = function(){ return this.q.length ? this.i / this.q.length : 0; };

M.Session.prototype.answer = function(entry, res){
  // res: {result, cap?, also?}
  var t = M.types[entry.type], it = entry.item;
  var facet = entry.facet || t.facet, cap = res.cap || t.cap;
  S.record(it, facet, res.result, cap);
  if (res.also && res.result === 'ok') res.also.forEach(function(a){ S.record(it, a[0], 'ok', a[1]); });
  var good = res.result === 'ok' || res.result === 'knew';
  if (entry.base && entry.attempt === 0) this.first[entry.key] = good;
  this.results.push({entry:entry, result:res.result});
  if (!good) {
    if (this.wrongItems.indexOf(it) < 0) this.wrongItems.push(it);
    M.lessonMistakes = M.lessonMistakes || [];
    if (this.teach && !M.lessonMistakes.some(function(x){ return x.item === it; })) M.lessonMistakes.push({item:it, mod:entry.mod});
    this.reinsert(entry);
  }
  return good;
};

M.Session.prototype.reinsert = function(entry){
  if (this.extra >= this.maxExtra) return;
  // 3–5 cards in between; prefer a slot that does not push an already pending retry beyond its own 5-card window
  var q0 = this.q, i0 = this.i;
  function pushesOut(p){ for (var k = p; k < q0.length; k++) { var e = q0[k]; if (e.retry && e.from != null && k - e.from > 5) return true; } return false; }
  var gaps = M.shuffle([3, 4, 5]), gap = gaps[0];
  for (var gi = 0; gi < gaps.length; gi++) if (!pushesOut(i0 + 1 + gaps[gi])) { gap = gaps[gi]; break; }
  var pos = this.i + 1 + gap;
  // not enough cards left: add fillers (items answered correctly this session) to keep the spacing
  var fillers = this.q.slice(0, this.i).filter(function(e){ return e.item !== entry.item && e.base; });
  var seenF = {};
  fillers = M.shuffle(fillers).filter(function(e){ if (seenF[e.item.id]) return false; seenF[e.item.id] = 1; return true; });
  // the retry must come 3–5 cards later; if even 3 cannot be reached within the +50 % budget, leave it to the SRS (box 1, due today)
  var minNeed = Math.max(0, this.i + 4 - this.q.length), avail = Math.min(this.maxExtra - 1 - this.extra, fillers.length);
  if (minNeed > avail) return;
  while (this.q.length < pos && this.extra < this.maxExtra - 1 && fillers.length) {
    var f = fillers.shift();
    this.q.push({mod:f.mod, item:f.item, type:recommend(f.mod, f.item, [this.q[this.q.length - 1].type]), facet:null, base:false, filler:true, key:f.key + 'f', attempt:1});
    this.extra++;
  }
  pos = Math.min(pos, this.q.length);
  var again = {mod:entry.mod, item:entry.item, type:retryType(entry.mod, entry.item, entry.type), facet:entry.facet || null, base:false, retry:true, key:entry.key, attempt:entry.attempt + 1, from:this.i};
  if (again.facet && M.types[again.type].facet !== again.facet) again.type = entry.type;
  this.q.splice(pos, 0, again);
  this.extra++;
  if (this.mixedTypes) noTriple(this.q, this.i + 1);
  keepWindows(this.q, this.i + 1);
};

M.Session.prototype.next = function(){ this.i++; if (this.i >= this.q.length) this.done = true; return !this.done; };

M.Session.prototype.summary = function(){
  var self = this, keys = Object.keys(this.first), right = keys.filter(function(k){ return self.first[k]; }).length;
  var mods = this.mods;
  return {first:right, total:this.baseCount, wrong:this.wrongItems.slice(), next:mods.reduce(function(m, md){ var d = S.nextDue(md); return d && (!m || d < m) ? d : m; }, null), review:!!this.opts.review, opts:this.opts};
};
})();

;
/* data/modules.js */
/* Upcoming modules. Each becomes "ready" as soon as its data file calls MedA1.registerModule. */
(function(M){
  M.announceModule({id:'beschwerden', n:2, de:'Schmerzen & Beschwerden', en:'Pain & symptoms', cover:'G2'});
  M.announceModule({id:'anamnese',    n:3, de:'Anamnese-Fragen',          en:'Taking a history', cover:'G3'});
  M.announceModule({id:'untersuchung',n:4, de:'Bei der Untersuchung',     en:'The examination', cover:'G4'});
  M.announceModule({id:'organe',      n:5, de:'Organe',                   en:'Organs', cover:'G5'});
  M.announceModule({id:'zahlen',      n:6, de:'Zahlen & Medikamente',     en:'Numbers & medication', cover:'G6'});
})(window.MedA1);

;
/* data/m1-koerperteile.js */
/* Module 1 · Körperteile — generated by tools/build_data.py from plan §2.1 (DWDS-checked 27.10.2026). */
MedA1.registerModule({
 "id": "koerperteile",
 "n": 1,
 "de": "Körperteile",
 "en": "Body parts",
 "cover": "G1",
 "enThe": true,
 "types": [
  "reveal",
  "img2word",
  "word2img",
  "tap",
  "article",
  "plural",
  "type",
  "tiles",
  "cloze"
 ],
 "grammar": {
  "article": "Every German noun has a gender: der, das or die. Learn the article with the word.",
  "poss": "mein goes with der and das words; meine goes with die words and plurals.",
  "verb": "One thing hurts: tut weh. Two or more things hurt: tun weh."
 },
 "items": [
  {
   "id": "kopf",
   "n": 1,
   "en": "head",
   "art": "der",
   "de": "Kopf",
   "pl": "Köpfe",
   "lat": "Caput",
   "ex": {
    "de": "Mein Kopf tut weh.",
    "en": "My head hurts."
   },
   "trap": "Plural with umlaut: Köpfe.",
   "view": {
    "img": "A1",
    "crop": [
     228,
     0,
     400,
     300
    ],
    "spot": [
     428,
     108,
     62,
     76,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Mein Kopf tut weh.",
     "en": "My head hurts.",
     "tiles": [
      "Mein",
      "Kopf",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "gesicht",
    "hals",
    "stirn"
   ],
   "tap": "body",
   "plWrong": [
    "Kopfe",
    "Köpfer"
   ]
  },
  {
   "id": "gesicht",
   "n": 2,
   "en": "face",
   "art": "das",
   "de": "Gesicht",
   "pl": "Gesichter",
   "lat": "Facies",
   "ex": {
    "de": "Das Gesicht ist rot.",
    "en": "The face is red."
   },
   "trap": "It’s das Gesicht; the plural ends in -er.",
   "view": {
    "img": "A3",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     576,
     350,
     150,
     172,
     0
    ],
    "alt": "Watercolor portrait of a woman, seen from the front"
   },
   "sentences": [
    {
     "de": "Das Gesicht ist rot.",
     "en": "The face is red.",
     "tiles": [
      "Das",
      "Gesicht",
      "ist",
      "rot"
     ],
     "extra": []
    },
    {
     "de": "Mein Gesicht tut weh.",
     "en": "My face hurts.",
     "tiles": [
      "Mein",
      "Gesicht",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "kopf",
    "stirn",
    "mund"
   ],
   "tap": "head",
   "plWrong": [
    "Gesicht",
    "Gesichten"
   ]
  },
  {
   "id": "stirn",
   "n": 3,
   "en": "forehead",
   "art": "die",
   "de": "Stirn",
   "pl": "Stirnen",
   "lat": "Frons",
   "ex": {
    "de": "Die Stirn ist heiß.",
    "en": "The forehead is hot."
   },
   "trap": "The plural is rare; you mostly need the singular.",
   "view": {
    "img": "A3",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     576,
     197,
     100,
     40,
     0
    ],
    "alt": "Watercolor portrait of a woman, seen from the front"
   },
   "sentences": [
    {
     "de": "Die Stirn ist heiß.",
     "en": "The forehead is hot.",
     "tiles": [
      "Die",
      "Stirn",
      "ist",
      "heiß"
     ],
     "extra": []
    },
    {
     "de": "Meine Stirn tut weh.",
     "en": "My forehead hurts.",
     "tiles": [
      "Meine",
      "Stirn",
      "tut",
      "weh"
     ],
     "extra": [
      "Mein",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "gesicht",
    "kopf",
    "auge"
   ],
   "tap": "head"
  },
  {
   "id": "auge",
   "n": 4,
   "en": "eye",
   "art": "das",
   "de": "Auge",
   "pl": "Augen",
   "lat": "Oculus",
   "ex": {
    "de": "Meine Augen tun weh.",
    "en": "My eyes hurt."
   },
   "trap": "Plural subject → tun: Meine Augen tun weh.",
   "view": {
    "img": "A3",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     501,
     286,
     32,
     18,
     0
    ],
    "alt": "Watercolor portrait of a woman, seen from the front"
   },
   "sentences": [
    {
     "de": "Mein Auge tut weh.",
     "en": "My eye hurts.",
     "tiles": [
      "Mein",
      "Auge",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Augen tun weh.",
     "en": "My eyes hurt.",
     "tiles": [
      "Meine",
      "Augen",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "ohr",
    "nase",
    "stirn"
   ],
   "tap": "head",
   "plWrong": [
    "Auge",
    "Äuge"
   ]
  },
  {
   "id": "ohr",
   "n": 5,
   "en": "ear",
   "art": "das",
   "de": "Ohr",
   "pl": "Ohren",
   "lat": "Auris",
   "ex": {
    "de": "Mein Ohr tut weh.",
    "en": "My ear hurts."
   },
   "trap": "Compound: Ohrenschmerzen (with -en-).",
   "view": {
    "img": "A3",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     409,
     340,
     26,
     54,
     0
    ],
    "alt": "Watercolor portrait of a woman, seen from the front"
   },
   "sentences": [
    {
     "de": "Mein Ohr tut weh.",
     "en": "My ear hurts.",
     "tiles": [
      "Mein",
      "Ohr",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Ohren tun weh.",
     "en": "My ears hurt.",
     "tiles": [
      "Meine",
      "Ohren",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "auge",
    "nase",
    "hals"
   ],
   "tap": "head",
   "plWrong": [
    "Ohre",
    "Ohrer"
   ]
  },
  {
   "id": "nase",
   "n": 6,
   "en": "nose",
   "art": "die",
   "de": "Nase",
   "pl": "Nasen",
   "lat": "Nasus",
   "ex": {
    "de": "Meine Nase läuft.",
    "en": "My nose is running."
   },
   "trap": "“My nose is running” = Meine Nase läuft.",
   "view": {
    "img": "A3",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     576,
     346,
     46,
     50,
     0
    ],
    "alt": "Watercolor portrait of a woman, seen from the front"
   },
   "sentences": [
    {
     "de": "Meine Nase läuft.",
     "en": "My nose is running.",
     "tiles": [
      "Meine",
      "Nase",
      "läuft"
     ],
     "extra": [
      "Mein"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      }
     ]
    },
    {
     "de": "Meine Nase tut weh.",
     "en": "My nose hurts.",
     "tiles": [
      "Meine",
      "Nase",
      "tut",
      "weh"
     ],
     "extra": [
      "Mein",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "mund",
    "auge",
    "ohr"
   ],
   "tap": "head",
   "plWrong": [
    "Nase",
    "Näsen"
   ]
  },
  {
   "id": "mund",
   "n": 7,
   "en": "mouth",
   "art": "der",
   "de": "Mund",
   "pl": "Münder",
   "lat": "Os",
   "ex": {
    "de": "Machen Sie bitte den Mund auf.",
    "en": "Please open your mouth."
   },
   "trap": "Plural Münder; den Mund is the accusative.",
   "view": {
    "img": "A3",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     576,
     428,
     56,
     26,
     0
    ],
    "alt": "Watercolor portrait of a woman, seen from the front"
   },
   "sentences": [
    {
     "de": "Machen Sie bitte den Mund auf.",
     "en": "Please open your mouth.",
     "tiles": [
      "Machen",
      "Sie",
      "bitte",
      "den Mund",
      "auf"
     ],
     "extra": []
    },
    {
     "de": "Mein Mund tut weh.",
     "en": "My mouth hurts.",
     "tiles": [
      "Mein",
      "Mund",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "zahn",
    "zunge",
    "nase"
   ],
   "tap": "head",
   "plWrong": [
    "Münde",
    "Munder"
   ]
  },
  {
   "id": "zahn",
   "n": 8,
   "en": "tooth",
   "art": "der",
   "de": "Zahn",
   "pl": "Zähne",
   "lat": "Dens",
   "ex": {
    "de": "Mein Zahn tut weh.",
    "en": "My tooth hurts."
   },
   "trap": "Plural with umlaut: Zähne.",
   "view": {
    "img": "A4",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     548,
     352,
     19,
     30,
     0
    ],
    "alt": "Watercolor of an open mouth during an examination"
   },
   "sentences": [
    {
     "de": "Mein Zahn tut weh.",
     "en": "My tooth hurts.",
     "tiles": [
      "Mein",
      "Zahn",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Zähne tun weh.",
     "en": "My teeth hurt.",
     "tiles": [
      "Meine",
      "Zähne",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "zunge",
    "mund"
   ],
   "tap": "mouth",
   "plWrong": [
    "Zahne",
    "Zähner"
   ]
  },
  {
   "id": "zunge",
   "n": 9,
   "en": "tongue",
   "art": "die",
   "de": "Zunge",
   "pl": "Zungen",
   "lat": "Lingua",
   "ex": {
    "de": "Strecken Sie bitte die Zunge heraus.",
    "en": "Please stick out your tongue."
   },
   "trap": "It’s die Zunge.",
   "view": {
    "img": "A4",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     576,
     436,
     105,
     56,
     0
    ],
    "alt": "Watercolor of an open mouth during an examination"
   },
   "sentences": [
    {
     "de": "Strecken Sie bitte die Zunge heraus.",
     "en": "Please stick out your tongue.",
     "tiles": [
      "Strecken",
      "Sie",
      "bitte",
      "die Zunge",
      "heraus"
     ],
     "extra": []
    },
    {
     "de": "Meine Zunge tut weh.",
     "en": "My tongue hurts.",
     "tiles": [
      "Meine",
      "Zunge",
      "tut",
      "weh"
     ],
     "extra": [
      "Mein",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "zahn",
    "mund"
   ],
   "tap": "mouth",
   "plWrong": [
    "Zunge",
    "Züngen"
   ]
  },
  {
   "id": "hals",
   "n": 10,
   "en": "throat",
   "art": "der",
   "de": "Hals",
   "pl": "Hälse",
   "lat": "Collum",
   "ex": {
    "de": "Mein Hals tut weh.",
    "en": "My throat hurts."
   },
   "trap": "Hals = neck AND throat. Sore throat = Halsschmerzen.",
   "view": {
    "img": "A7",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     505,
     520,
     60,
     85,
     -12
    ],
    "alt": "Watercolor of a man in profile, head to shoulders"
   },
   "sentences": [
    {
     "de": "Mein Hals tut weh.",
     "en": "My throat hurts.",
     "tiles": [
      "Mein",
      "Hals",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "nacken",
    "kopf",
    "schulter"
   ],
   "hint": "front of the neck",
   "tap": "profile",
   "plWrong": [
    "Hälser",
    "Hals"
   ]
  },
  {
   "id": "nacken",
   "n": 11,
   "en": "back of the neck",
   "art": "der",
   "de": "Nacken",
   "pl": "Nacken",
   "lat": "Nucha",
   "ex": {
    "de": "Mein Nacken tut weh.",
    "en": "The back of my neck hurts."
   },
   "trap": "Nacken is only the back of the neck. Plural unchanged.",
   "view": {
    "img": "A7",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     668,
     452,
     52,
     85,
     -12
    ],
    "alt": "Watercolor of a man in profile, head to shoulders"
   },
   "sentences": [
    {
     "de": "Mein Nacken tut weh.",
     "en": "The back of my neck hurts.",
     "tiles": [
      "Mein",
      "Nacken",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "hals",
    "ruecken",
    "schulter"
   ],
   "tap": "profile",
   "plWrong": [
    "Näcken",
    "Nackene"
   ]
  },
  {
   "id": "schulter",
   "n": 12,
   "en": "shoulder",
   "art": "die",
   "de": "Schulter",
   "pl": "Schultern",
   "lat": "Articulatio humeri",
   "ex": {
    "de": "Meine Schulter tut weh.",
    "en": "My shoulder hurts."
   },
   "trap": "die Schulter → meine Schulter.",
   "view": {
    "img": "A1",
    "crop": [
     100,
     0,
     480,
     360
    ],
    "spot": [
     313,
     236,
     32,
     32,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Meine Schulter tut weh.",
     "en": "My shoulder hurts.",
     "tiles": [
      "Meine",
      "Schulter",
      "tut",
      "weh"
     ],
     "extra": [
      "Mein",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Schultern tun weh.",
     "en": "My shoulders hurt.",
     "tiles": [
      "Meine",
      "Schultern",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "arm",
    "nacken",
    "ruecken"
   ],
   "tap": "body",
   "plWrong": [
    "Schulter",
    "Schülter"
   ]
  },
  {
   "id": "arm",
   "n": 13,
   "en": "arm",
   "art": "der",
   "de": "Arm",
   "pl": "Arme",
   "lat": "Brachium (upper arm)",
   "ex": {
    "de": "Mein Arm tut weh.",
    "en": "My arm hurts."
   },
   "trap": "Brachium is the upper arm only.",
   "view": {
    "img": "A1",
    "crop": [
     40,
     190,
     600,
     450
    ],
    "spot": [
     283,
     392,
     32,
     168,
     10.6
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Mein Arm tut weh.",
     "en": "My arm hurts.",
     "tiles": [
      "Mein",
      "Arm",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Arme tun weh.",
     "en": "My arms hurt.",
     "tiles": [
      "Meine",
      "Arme",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "ellenbogen",
    "hand",
    "schulter"
   ],
   "tap": "body",
   "plWrong": [
    "Ärme",
    "Arm"
   ],
   "exclude": [
    "haut"
   ]
  },
  {
   "id": "ellenbogen",
   "n": 14,
   "en": "elbow",
   "art": "der",
   "de": "Ellenbogen",
   "pl": "Ellenbogen",
   "lat": "Cubitus",
   "ex": {
    "de": "Mein Ellenbogen tut weh.",
    "en": "My elbow hurts."
   },
   "trap": "Also correct: der Ellbogen. Plural unchanged.",
   "view": {
    "img": "A2",
    "crop": [
     80,
     250,
     432,
     324
    ],
    "spot": [
     296,
     408,
     20,
     22,
     0
    ],
    "alt": "Watercolor of a man standing, seen from behind"
   },
   "sentences": [
    {
     "de": "Mein Ellenbogen tut weh.",
     "en": "My elbow hurts.",
     "tiles": [
      "Mein",
      "Ellenbogen",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Ellenbogen tun weh.",
     "en": "My elbows hurt.",
     "tiles": [
      "Meine",
      "Ellenbogen",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "arm",
    "handgelenk",
    "schulter"
   ],
   "tap": "body",
   "plWrong": [
    "Ellenbogene",
    "Ellenbogenen"
   ],
   "variants": [
    "der Ellbogen"
   ],
   "exclude": [
    "haut"
   ]
  },
  {
   "id": "handgelenk",
   "n": 15,
   "en": "wrist",
   "art": "das",
   "de": "Handgelenk",
   "pl": "Handgelenke",
   "lat": "Carpus",
   "ex": {
    "de": "Mein Handgelenk tut weh.",
    "en": "My wrist hurts."
   },
   "trap": "It’s das: the last word (das Gelenk) decides.",
   "view": {
    "img": "A5",
    "crop": [
     0,
     0,
     864,
     1152
    ],
    "spot": [
     432,
     762,
     82,
     32,
     0
    ],
    "alt": "Watercolor of an open right hand, palm facing forward"
   },
   "sentences": [
    {
     "de": "Mein Handgelenk tut weh.",
     "en": "My wrist hurts.",
     "tiles": [
      "Mein",
      "Handgelenk",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Handgelenke tun weh.",
     "en": "My wrists hurt.",
     "tiles": [
      "Meine",
      "Handgelenke",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "hand",
    "ellenbogen",
    "daumen"
   ],
   "tap": "hand",
   "plWrong": [
    "Handgelenker",
    "Handgelenk"
   ]
  },
  {
   "id": "hand",
   "n": 16,
   "en": "hand",
   "art": "die",
   "de": "Hand",
   "pl": "Hände",
   "lat": "Manus",
   "ex": {
    "de": "Meine Hand tut weh.",
    "en": "My hand hurts."
   },
   "trap": "Plural with umlaut: Hände.",
   "view": {
    "img": "A1",
    "crop": [
     20,
     380,
     480,
     360
    ],
    "spot": [
     234,
     592,
     44,
     54,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Meine Hand tut weh.",
     "en": "My hand hurts.",
     "tiles": [
      "Meine",
      "Hand",
      "tut",
      "weh"
     ],
     "extra": [
      "Mein",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Hände tun weh.",
     "en": "My hands hurt.",
     "tiles": [
      "Meine",
      "Hände",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "finger",
    "handgelenk",
    "arm"
   ],
   "tap": "body",
   "plWrong": [
    "Hande",
    "Händer"
   ],
   "exclude": [
    "haut"
   ]
  },
  {
   "id": "finger",
   "n": 17,
   "en": "finger",
   "art": "der",
   "de": "Finger",
   "pl": "Finger",
   "lat": "Digitus",
   "ex": {
    "de": "Meine Finger tun weh.",
    "en": "My fingers hurt."
   },
   "trap": "The plural is unchanged; the verb shows the number.",
   "view": {
    "img": "A5",
    "crop": [
     0,
     0,
     864,
     1152
    ],
    "spot": [
     523,
     271,
     30,
     140,
     -2
    ],
    "alt": "Watercolor of an open right hand, palm facing forward"
   },
   "sentences": [
    {
     "de": "Mein Finger tut weh.",
     "en": "My finger hurts.",
     "tiles": [
      "Mein",
      "Finger",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Finger tun weh.",
     "en": "My fingers hurt.",
     "tiles": [
      "Meine",
      "Finger",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "daumen",
    "hand",
    "zeh"
   ],
   "tap": "hand",
   "plWrong": [
    "Fingere",
    "Fingeren"
   ]
  },
  {
   "id": "daumen",
   "n": 18,
   "en": "thumb",
   "art": "der",
   "de": "Daumen",
   "pl": "Daumen",
   "lat": "Pollex",
   "ex": {
    "de": "Mein Daumen tut weh.",
    "en": "My thumb hurts."
   },
   "trap": "The plural is unchanged.",
   "view": {
    "img": "A5",
    "crop": [
     0,
     0,
     864,
     1152
    ],
    "spot": [
     648,
     481,
     32,
     135,
     39.4
    ],
    "alt": "Watercolor of an open right hand, palm facing forward"
   },
   "sentences": [
    {
     "de": "Mein Daumen tut weh.",
     "en": "My thumb hurts.",
     "tiles": [
      "Mein",
      "Daumen",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Daumen tun weh.",
     "en": "My thumbs hurt.",
     "tiles": [
      "Meine",
      "Daumen",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "finger",
    "hand",
    "handgelenk"
   ],
   "tap": "hand",
   "plWrong": [
    "Däumen",
    "Daumene"
   ]
  },
  {
   "id": "brust",
   "n": 19,
   "en": "chest",
   "art": "die",
   "de": "Brust",
   "pl": "Brüste",
   "lat": "Thorax / Pectus",
   "ex": {
    "de": "Ich habe Schmerzen in der Brust.",
    "en": "I have pain in my chest."
   },
   "trap": "Singular Brust = chest. The plural Brüste means breasts only.",
   "view": {
    "img": "A1",
    "crop": [
     152,
     150,
     560,
     420
    ],
    "spot": [
     432,
     295,
     84,
     52,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Ich habe Schmerzen in der Brust.",
     "en": "I have pain in my chest.",
     "tiles": [
      "Ich",
      "habe",
      "Schmerzen",
      "in",
      "der Brust"
     ],
     "extra": []
    },
    {
     "de": "Meine Brust tut weh.",
     "en": "My chest hurts.",
     "tiles": [
      "Meine",
      "Brust",
      "tut",
      "weh"
     ],
     "extra": [
      "Mein",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "bauch",
    "schulter",
    "ruecken"
   ],
   "tap": "body"
  },
  {
   "id": "bauch",
   "n": 20,
   "en": "belly",
   "art": "der",
   "de": "Bauch",
   "pl": "Bäuche",
   "lat": "Abdomen",
   "ex": {
    "de": "Mein Bauch tut weh.",
    "en": "My belly hurts."
   },
   "trap": "“Stomach ache” = Bauchschmerzen. Der Magen is the organ.",
   "view": {
    "img": "A1",
    "crop": [
     152,
     240,
     560,
     420
    ],
    "spot": [
     432,
     452,
     76,
     58,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Mein Bauch tut weh.",
     "en": "My belly hurts.",
     "tiles": [
      "Mein",
      "Bauch",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "brust",
    "huefte",
    "ruecken"
   ],
   "hint": "abdomen",
   "tap": "body",
   "plWrong": [
    "Bauche",
    "Bäucher"
   ]
  },
  {
   "id": "ruecken",
   "n": 21,
   "en": "back",
   "art": "der",
   "de": "Rücken",
   "pl": "Rücken",
   "lat": "Dorsum",
   "ex": {
    "de": "Mein Rücken tut weh.",
    "en": "My back hurts."
   },
   "trap": "The plural is unchanged.",
   "view": {
    "img": "A2",
    "crop": [
     112,
     120,
     640,
     480
    ],
    "spot": [
     432,
     372,
     86,
     140,
     0
    ],
    "alt": "Watercolor of a man standing, seen from behind"
   },
   "sentences": [
    {
     "de": "Mein Rücken tut weh.",
     "en": "My back hurts.",
     "tiles": [
      "Mein",
      "Rücken",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "nacken",
    "schulter",
    "bauch"
   ],
   "tap": "body",
   "plWrong": [
    "Rückene",
    "Rückenen"
   ]
  },
  {
   "id": "huefte",
   "n": 22,
   "en": "hip",
   "art": "die",
   "de": "Hüfte",
   "pl": "Hüften",
   "lat": "Coxa",
   "ex": {
    "de": "Meine Hüfte tut weh.",
    "en": "My hip hurts."
   },
   "trap": "Ends in -e, so the plural adds -n.",
   "view": {
    "img": "A1",
    "crop": [
     112,
     380,
     560,
     420
    ],
    "spot": [
     320,
     568,
     26,
     36,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Meine Hüfte tut weh.",
     "en": "My hip hurts.",
     "tiles": [
      "Meine",
      "Hüfte",
      "tut",
      "weh"
     ],
     "extra": [
      "Mein",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Hüften tun weh.",
     "en": "My hips hurt.",
     "tiles": [
      "Meine",
      "Hüften",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "oberschenkel",
    "bauch",
    "bein"
   ],
   "tap": "body",
   "plWrong": [
    "Hüfte",
    "Hüfter"
   ]
  },
  {
   "id": "bein",
   "n": 23,
   "en": "leg",
   "art": "das",
   "de": "Bein",
   "pl": "Beine",
   "lat": "Membrum inferius",
   "ex": {
    "de": "Mein Bein tut weh.",
    "en": "My leg hurts."
   },
   "trap": "In compounds, -bein can mean bone (das Schienbein).",
   "view": {
    "img": "A1",
    "crop": [
     0,
     504,
     864,
     648
    ],
    "spot": [
     380,
     789,
     46,
     238,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Mein Bein tut weh.",
     "en": "My leg hurts.",
     "tiles": [
      "Mein",
      "Bein",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Beine tun weh.",
     "en": "My legs hurt.",
     "tiles": [
      "Meine",
      "Beine",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "oberschenkel",
    "knie",
    "fuss"
   ],
   "tap": "body",
   "plWrong": [
    "Beiner",
    "Bein"
   ]
  },
  {
   "id": "oberschenkel",
   "n": 24,
   "en": "thigh",
   "art": "der",
   "de": "Oberschenkel",
   "pl": "Oberschenkel",
   "lat": "Femur",
   "ex": {
    "de": "Mein Oberschenkel tut weh.",
    "en": "My thigh hurts."
   },
   "trap": "ober- = upper. The plural is unchanged.",
   "view": {
    "img": "A1",
    "crop": [
     132,
     440,
     600,
     450
    ],
    "spot": [
     373,
     650,
     44,
     78,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Mein Oberschenkel tut weh.",
     "en": "My thigh hurts.",
     "tiles": [
      "Mein",
      "Oberschenkel",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Oberschenkel tun weh.",
     "en": "My thighs hurt.",
     "tiles": [
      "Meine",
      "Oberschenkel",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "bein",
    "knie",
    "huefte"
   ],
   "tap": "body",
   "plWrong": [
    "Oberschenkele",
    "Oberschenkelen"
   ]
  },
  {
   "id": "knie",
   "n": 25,
   "en": "knee",
   "art": "das",
   "de": "Knie",
   "pl": "Knie",
   "lat": "Genu",
   "ex": {
    "de": "Mein Knie tut weh.",
    "en": "My knee hurts."
   },
   "trap": "The plural looks the same; the verb shows the number.",
   "view": {
    "img": "A1",
    "crop": [
     132,
     560,
     600,
     450
    ],
    "spot": [
     373,
     757,
     30,
     32,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Mein Knie tut weh.",
     "en": "My knee hurts.",
     "tiles": [
      "Mein",
      "Knie",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Knie tun weh.",
     "en": "My knees hurt.",
     "tiles": [
      "Meine",
      "Knie",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "bein",
    "oberschenkel",
    "wade"
   ],
   "tap": "body",
   "plWrong": [
    "Kniee",
    "Knier"
   ]
  },
  {
   "id": "wade",
   "n": 26,
   "en": "calf",
   "art": "die",
   "de": "Wade",
   "pl": "Waden",
   "lat": "Sura",
   "ex": {
    "de": "Meine Wade tut weh.",
    "en": "My calf hurts."
   },
   "trap": "Not the animal (das Kalb).",
   "view": {
    "img": "A2",
    "crop": [
     132,
     620,
     600,
     450
    ],
    "spot": [
     363,
     850,
     32,
     64,
     0
    ],
    "alt": "Watercolor of a man standing, seen from behind"
   },
   "sentences": [
    {
     "de": "Meine Wade tut weh.",
     "en": "My calf hurts.",
     "tiles": [
      "Meine",
      "Wade",
      "tut",
      "weh"
     ],
     "extra": [
      "Mein",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Waden tun weh.",
     "en": "My calves hurt.",
     "tiles": [
      "Meine",
      "Waden",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "knie",
    "knoechel",
    "bein"
   ],
   "tap": "body",
   "plWrong": [
    "Wade",
    "Wäden"
   ]
  },
  {
   "id": "knoechel",
   "n": 27,
   "en": "ankle",
   "art": "der",
   "de": "Knöchel",
   "pl": "Knöchel",
   "lat": "Malleolus",
   "ex": {
    "de": "Mein Knöchel tut weh.",
    "en": "My ankle hurts."
   },
   "trap": "Knöchel = ankle AND knuckle.",
   "view": {
    "img": "A6",
    "crop": [
     150,
     700,
     600,
     450
    ],
    "spot": [
     363,
     933,
     26,
     30,
     0
    ],
    "alt": "Watercolor of a right lower leg and foot, side view"
   },
   "sentences": [
    {
     "de": "Mein Knöchel tut weh.",
     "en": "My ankle hurts.",
     "tiles": [
      "Mein",
      "Knöchel",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Knöchel tun weh.",
     "en": "My ankles hurt.",
     "tiles": [
      "Meine",
      "Knöchel",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "fuss",
    "wade",
    "zeh"
   ],
   "tap": "leg",
   "plWrong": [
    "Knöchele",
    "Knochel"
   ]
  },
  {
   "id": "fuss",
   "n": 28,
   "en": "foot",
   "art": "der",
   "de": "Fuß",
   "pl": "Füße",
   "lat": "Pes",
   "ex": {
    "de": "Meine Füße tun weh.",
    "en": "My feet hurt."
   },
   "trap": "Written with ß; plural Füße.",
   "view": {
    "img": "A1",
    "crop": [
     196,
     840,
     416,
     312
    ],
    "spot": [
     352,
     1036,
     46,
     32,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Mein Fuß tut weh.",
     "en": "My foot hurts.",
     "tiles": [
      "Mein",
      "Fuß",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Füße tun weh.",
     "en": "My feet hurt.",
     "tiles": [
      "Meine",
      "Füße",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "zeh",
    "knoechel",
    "bein"
   ],
   "tap": "body",
   "plWrong": [
    "Fuße",
    "Füßer"
   ]
  },
  {
   "id": "zeh",
   "n": 29,
   "en": "toe",
   "art": "der",
   "de": "Zeh",
   "pl": "Zehen",
   "lat": "Digitus pedis",
   "ex": {
    "de": "Mein Zeh tut weh.",
    "en": "My toe hurts."
   },
   "trap": "Also correct: die Zehe. The plural is always Zehen.",
   "view": {
    "img": "A1",
    "crop": [
     196,
     840,
     416,
     312
    ],
    "spot": [
     358,
     1053,
     13,
     12,
     0
    ],
    "alt": "Watercolor of a man standing, seen from the front"
   },
   "sentences": [
    {
     "de": "Mein Zeh tut weh.",
     "en": "My toe hurts.",
     "tiles": [
      "Mein",
      "Zeh",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    },
    {
     "de": "Meine Zehen tun weh.",
     "en": "My toes hurt.",
     "tiles": [
      "Meine",
      "Zehen",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "fuss",
    "finger",
    "knoechel"
   ],
   "tap": "leg",
   "plWrong": [
    "Zeher",
    "Zehene"
   ],
   "variants": [
    "die Zehe"
   ]
  },
  {
   "id": "haut",
   "n": 30,
   "en": "skin",
   "art": "die",
   "de": "Haut",
   "pl": null,
   "lat": "Cutis",
   "ex": {
    "de": "Meine Haut juckt.",
    "en": "My skin itches."
   },
   "trap": "In this sense practically singular only.",
   "view": {
    "img": "A8",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": [
     461,
     397,
     70,
     45,
     0
    ],
    "alt": "Watercolor of a skin fold being lifted on a forearm"
   },
   "sentences": [
    {
     "de": "Meine Haut juckt.",
     "en": "My skin itches.",
     "tiles": [
      "Meine",
      "Haut",
      "juckt"
     ],
     "extra": [
      "Mein"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      }
     ]
    },
    {
     "de": "Meine Haut tut weh.",
     "en": "My skin hurts.",
     "tiles": [
      "Meine",
      "Haut",
      "tut",
      "weh"
     ],
     "extra": [
      "Mein",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ]
    }
   ],
   "nb": [
    "hand",
    "gesicht",
    "bauch"
   ],
   "exclude": [
    "arm",
    "ellenbogen",
    "hand"
   ]
  }
 ],
 "maps": {
  "body_front": {
   "img": "A1",
   "w": 864,
   "h": 1152,
   "regions": [
    {
     "item": "kopf",
     "side": null,
     "e": [
      428,
      108,
      62,
      76,
      0
     ]
    },
    {
     "item": "hals",
     "side": null,
     "e": [
      429,
      187,
      34,
      21,
      0
     ]
    },
    {
     "item": "schulter",
     "side": "R",
     "e": [
      313,
      236,
      32,
      32,
      0
     ]
    },
    {
     "item": "schulter",
     "side": "L",
     "e": [
      547,
      236,
      32,
      32,
      0
     ]
    },
    {
     "item": "arm",
     "side": "R",
     "e": [
      283,
      392,
      32,
      168,
      10.6
     ]
    },
    {
     "item": "arm",
     "side": "L",
     "e": [
      577,
      392,
      32,
      168,
      -10.6
     ]
    },
    {
     "item": "ellenbogen",
     "side": "R",
     "e": [
      298,
      403,
      19,
      19,
      0
     ]
    },
    {
     "item": "ellenbogen",
     "side": "L",
     "e": [
      566,
      403,
      19,
      19,
      0
     ]
    },
    {
     "item": "hand",
     "side": "R",
     "e": [
      234,
      592,
      44,
      54,
      0
     ]
    },
    {
     "item": "hand",
     "side": "L",
     "e": [
      630,
      592,
      44,
      54,
      0
     ]
    },
    {
     "item": "brust",
     "side": null,
     "e": [
      432,
      295,
      84,
      52,
      0
     ]
    },
    {
     "item": "bauch",
     "side": null,
     "e": [
      432,
      452,
      76,
      58,
      0
     ]
    },
    {
     "item": "huefte",
     "side": "R",
     "e": [
      320,
      568,
      26,
      36,
      0
     ]
    },
    {
     "item": "huefte",
     "side": "L",
     "e": [
      544,
      568,
      26,
      36,
      0
     ]
    },
    {
     "item": "bein",
     "side": "R",
     "e": [
      380,
      789,
      46,
      238,
      0
     ]
    },
    {
     "item": "bein",
     "side": "L",
     "e": [
      482,
      789,
      46,
      238,
      0
     ]
    },
    {
     "item": "oberschenkel",
     "side": "R",
     "e": [
      373,
      650,
      44,
      78,
      0
     ]
    },
    {
     "item": "oberschenkel",
     "side": "L",
     "e": [
      490,
      650,
      44,
      78,
      0
     ]
    },
    {
     "item": "knie",
     "side": "R",
     "e": [
      373,
      757,
      30,
      32,
      0
     ]
    },
    {
     "item": "knie",
     "side": "L",
     "e": [
      489,
      757,
      30,
      32,
      0
     ]
    },
    {
     "item": "fuss",
     "side": "R",
     "e": [
      352,
      1036,
      46,
      32,
      0
     ]
    },
    {
     "item": "fuss",
     "side": "L",
     "e": [
      508,
      1036,
      46,
      32,
      0
     ]
    }
   ],
   "alt": "Watercolor of a man standing, seen from the front"
  },
  "body_back": {
   "img": "A2",
   "w": 864,
   "h": 1152,
   "regions": [
    {
     "item": "kopf",
     "side": null,
     "e": [
      432,
      110,
      62,
      76,
      0
     ]
    },
    {
     "item": "nacken",
     "side": null,
     "e": [
      432,
      186,
      36,
      22,
      0
     ]
    },
    {
     "item": "schulter",
     "side": "L",
     "e": [
      312,
      236,
      32,
      32,
      0
     ]
    },
    {
     "item": "schulter",
     "side": "R",
     "e": [
      552,
      236,
      32,
      32,
      0
     ]
    },
    {
     "item": "ruecken",
     "side": null,
     "e": [
      432,
      372,
      86,
      140,
      0
     ]
    },
    {
     "item": "arm",
     "side": "L",
     "e": [
      283,
      392,
      32,
      168,
      10.6
     ]
    },
    {
     "item": "arm",
     "side": "R",
     "e": [
      581,
      392,
      32,
      168,
      -10.6
     ]
    },
    {
     "item": "ellenbogen",
     "side": "L",
     "e": [
      296,
      408,
      20,
      22,
      0
     ]
    },
    {
     "item": "ellenbogen",
     "side": "R",
     "e": [
      566,
      408,
      20,
      22,
      0
     ]
    },
    {
     "item": "hand",
     "side": "L",
     "e": [
      238,
      602,
      44,
      54,
      0
     ]
    },
    {
     "item": "hand",
     "side": "R",
     "e": [
      628,
      602,
      44,
      54,
      0
     ]
    },
    {
     "item": "huefte",
     "side": "L",
     "e": [
      320,
      566,
      26,
      36,
      0
     ]
    },
    {
     "item": "huefte",
     "side": "R",
     "e": [
      546,
      566,
      26,
      36,
      0
     ]
    },
    {
     "item": "bein",
     "side": "L",
     "e": [
      372,
      795,
      46,
      236,
      0
     ]
    },
    {
     "item": "bein",
     "side": "R",
     "e": [
      488,
      795,
      46,
      236,
      0
     ]
    },
    {
     "item": "oberschenkel",
     "side": "L",
     "e": [
      372,
      668,
      44,
      90,
      0
     ]
    },
    {
     "item": "oberschenkel",
     "side": "R",
     "e": [
      488,
      668,
      44,
      90,
      0
     ]
    },
    {
     "item": "knie",
     "side": "L",
     "e": [
      370,
      768,
      30,
      28,
      0
     ]
    },
    {
     "item": "knie",
     "side": "R",
     "e": [
      488,
      768,
      30,
      28,
      0
     ]
    },
    {
     "item": "wade",
     "side": "L",
     "e": [
      363,
      850,
      32,
      64,
      0
     ]
    },
    {
     "item": "wade",
     "side": "R",
     "e": [
      497,
      850,
      32,
      64,
      0
     ]
    },
    {
     "item": "fuss",
     "side": "L",
     "e": [
      365,
      1036,
      40,
      26,
      0
     ]
    },
    {
     "item": "fuss",
     "side": "R",
     "e": [
      500,
      1036,
      40,
      26,
      0
     ]
    }
   ],
   "alt": "Watercolor of a man standing, seen from behind"
  },
  "head": {
   "img": "A3",
   "w": 1152,
   "h": 864,
   "regions": [
    {
     "item": "gesicht",
     "side": null,
     "e": [
      576,
      350,
      150,
      172,
      0
     ]
    },
    {
     "item": "stirn",
     "side": null,
     "e": [
      576,
      197,
      100,
      40,
      0
     ]
    },
    {
     "item": "auge",
     "side": "R",
     "e": [
      501,
      286,
      32,
      18,
      0
     ]
    },
    {
     "item": "auge",
     "side": "L",
     "e": [
      651,
      286,
      32,
      18,
      0
     ]
    },
    {
     "item": "ohr",
     "side": "R",
     "e": [
      409,
      340,
      26,
      54,
      0
     ]
    },
    {
     "item": "ohr",
     "side": "L",
     "e": [
      749,
      340,
      26,
      54,
      0
     ]
    },
    {
     "item": "nase",
     "side": null,
     "e": [
      576,
      346,
      46,
      50,
      0
     ]
    },
    {
     "item": "mund",
     "side": null,
     "e": [
      576,
      428,
      56,
      26,
      0
     ]
    }
   ],
   "alt": "Watercolor portrait of a woman, seen from the front"
  },
  "mouth": {
   "img": "A4",
   "w": 1152,
   "h": 864,
   "regions": [
    {
     "item": "zahn",
     "side": null,
     "e": [
      576,
      350,
      162,
      34,
      0
     ]
    },
    {
     "item": "zahn",
     "side": null,
     "e": [
      576,
      501,
      128,
      26,
      0
     ]
    },
    {
     "item": "zunge",
     "side": null,
     "e": [
      576,
      436,
      105,
      56,
      0
     ]
    }
   ],
   "alt": "Watercolor of an open mouth during an examination"
  },
  "profile": {
   "img": "A7",
   "w": 1152,
   "h": 864,
   "regions": [
    {
     "item": "kopf",
     "side": null,
     "e": [
      564,
      262,
      190,
      205,
      0
     ]
    },
    {
     "item": "ohr",
     "side": "L",
     "e": [
      611,
      285,
      30,
      46,
      0
     ]
    },
    {
     "item": "hals",
     "side": null,
     "e": [
      505,
      520,
      60,
      85,
      -12
     ]
    },
    {
     "item": "nacken",
     "side": null,
     "e": [
      668,
      452,
      52,
      85,
      -12
     ]
    },
    {
     "item": "schulter",
     "side": "L",
     "e": [
      737,
      650,
      80,
      92,
      0
     ]
    }
   ],
   "alt": "Watercolor of a man in profile, head to shoulders"
  },
  "hand": {
   "img": "A5",
   "w": 864,
   "h": 1152,
   "regions": [
    {
     "item": "hand",
     "side": "R",
     "e": [
      423,
      560,
      120,
      140,
      0
     ]
    },
    {
     "item": "daumen",
     "side": "R",
     "e": [
      648,
      481,
      32,
      135,
      39.4
     ]
    },
    {
     "item": "finger",
     "side": "R",
     "e": [
      523,
      271,
      30,
      140,
      -2
     ]
    },
    {
     "item": "finger",
     "side": "R",
     "e": [
      415,
      242,
      30,
      150,
      0
     ]
    },
    {
     "item": "finger",
     "side": "R",
     "e": [
      328,
      276,
      28,
      135,
      -5
     ]
    },
    {
     "item": "finger",
     "side": "R",
     "e": [
      238,
      357,
      26,
      108,
      -17.3
     ]
    },
    {
     "item": "handgelenk",
     "side": "R",
     "e": [
      432,
      762,
      82,
      32,
      0
     ]
    }
   ],
   "alt": "Watercolor of an open right hand, palm facing forward"
  },
  "leg": {
   "img": "A6",
   "w": 864,
   "h": 1152,
   "regions": [
    {
     "item": "oberschenkel",
     "side": "R",
     "e": [
      403,
      196,
      88,
      80,
      0
     ]
    },
    {
     "item": "knie",
     "side": "R",
     "e": [
      410,
      346,
      72,
      70,
      0
     ]
    },
    {
     "item": "wade",
     "side": "R",
     "e": [
      337,
      553,
      50,
      120,
      0
     ]
    },
    {
     "item": "knoechel",
     "side": "R",
     "e": [
      363,
      933,
      26,
      30,
      0
     ]
    },
    {
     "item": "fuss",
     "side": "R",
     "e": [
      484,
      1000,
      190,
      68,
      0
     ]
    },
    {
     "item": "zeh",
     "side": "R",
     "e": [
      632,
      1018,
      50,
      28,
      0
     ]
    }
   ],
   "alt": "Watercolor of a right lower leg and foot, side view"
  }
 },
 "tapmaps": {
  "body": [
   "body_front",
   "body_back"
  ],
  "head": [
   "head"
  ],
  "mouth": [
   "mouth"
  ],
  "profile": [
   "profile"
  ],
  "hand": [
   "hand"
  ],
  "leg": [
   "leg"
  ]
 }
});

;
/* data/m2-beschwerden.js */
/* Module 2 · Schmerzen & Beschwerden — generated by tools/build_data_m2.py from plan §2.2 (DWDS-checked 27.10.2026). */
MedA1.registerModule({
 "id": "beschwerden",
 "n": 2,
 "de": "Schmerzen & Beschwerden",
 "en": "Pain & symptoms",
 "cover": "G2",
 "latLabel": "Medical term",
 "typeDesc": {
  "cloze": "habe / bin · mir / ich · im / in der"
 },
 "types": [
  "reveal",
  "img2word",
  "word2img",
  "pairs",
  "article",
  "type",
  "tiles",
  "cloze"
 ],
 "grammar": {
  "article": "Every German noun has a gender: der, das or die. Learn the article with the word.",
  "haben": "Ich habe + noun: Ich habe Fieber. With erkältet it’s bin: Ich bin erkältet.",
  "mir": "Mir ist schlecht. Mir ist schwindelig. A fixed phrase: mir, not ich.",
  "ort": "der and das words → im (im Bauch). die words → in der (in der Brust).",
  "einen": "der Ausschlag is countable: Ich habe einen Ausschlag.",
  "mich": "sich übergeben: Ich muss mich übergeben.",
  "es": "German says it itches: Es juckt.",
  "poss": "mein goes with der and das words; meine goes with die words and plurals.",
  "verb": "One thing hurts: tut weh. Two or more things hurt: tun weh."
 },
 "items": [
  {
   "id": "kopfschmerzen",
   "n": 1,
   "en": "headache",
   "art": "die",
   "de": "Kopfschmerzen",
   "pl": null,
   "lat": "Cephalgie",
   "ex": {
    "de": "Ich habe Kopfschmerzen.",
    "en": "I have a headache."
   },
   "trap": "Usually plural, and no article: Ich habe Kopfschmerzen.",
   "view": {
    "img": "C01",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man pressing his fingertips to his temples, eyes shut"
   },
   "sentences": [
    {
     "de": "Ich habe Kopfschmerzen.",
     "en": "I have a headache.",
     "tiles": [
      "Ich",
      "habe",
      "Kopfschmerzen"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Mein Kopf tut weh.",
     "en": "My head hurts.",
     "tiles": [
      "Mein",
      "Kopf",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ],
     "rule": "poss"
    }
   ],
   "nb": [
    "schwindel",
    "ohrenschmerzen",
    "zahnschmerzen"
   ],
   "plOnly": true,
   "variants": [
    "der Kopfschmerz"
   ],
   "enNP": "a headache"
  },
  {
   "id": "halsschmerzen",
   "n": 2,
   "en": "sore throat",
   "art": "die",
   "de": "Halsschmerzen",
   "pl": null,
   "lat": null,
   "ex": {
    "de": "Ich habe Halsschmerzen.",
    "en": "I have a sore throat."
   },
   "trap": "Hals = throat here. Also: Mein Hals tut weh.",
   "view": {
    "img": "C02",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman touching the front of her neck, wincing as she swallows"
   },
   "sentences": [
    {
     "de": "Ich habe Halsschmerzen.",
     "en": "I have a sore throat.",
     "tiles": [
      "Ich",
      "habe",
      "Halsschmerzen"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Mein Hals tut weh.",
     "en": "My throat hurts.",
     "tiles": [
      "Mein",
      "Hals",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ],
     "rule": "poss"
    }
   ],
   "nb": [
    "husten",
    "zahnschmerzen",
    "ohrenschmerzen"
   ],
   "plOnly": true,
   "variants": [
    "der Halsschmerz"
   ],
   "enNP": "a sore throat",
   "exclude": [
    "erkaeltung"
   ]
  },
  {
   "id": "bauchschmerzen",
   "n": 3,
   "en": "stomachache",
   "art": "die",
   "de": "Bauchschmerzen",
   "pl": null,
   "lat": "Abdominalschmerz",
   "ex": {
    "de": "Ich habe Bauchschmerzen.",
    "en": "I have a stomachache."
   },
   "trap": "Say Magenschmerzen only if it is really the stomach.",
   "view": {
    "img": "C03",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of an older man bent slightly forward, both hands on his belly"
   },
   "sentences": [
    {
     "de": "Ich habe Bauchschmerzen.",
     "en": "I have a stomachache.",
     "tiles": [
      "Ich",
      "habe",
      "Bauchschmerzen"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Ich habe Schmerzen im Bauch.",
     "en": "I have pain in my belly.",
     "tiles": [
      "Ich",
      "habe",
      "Schmerzen",
      "im",
      "Bauch"
     ],
     "extra": [
      "in der"
     ],
     "cloze": [
      {
       "gap": 3,
       "options": [
        "im",
        "in der"
       ],
       "rule": "ort"
      }
     ],
     "rule": "ort"
    }
   ],
   "nb": [
    "uebelkeit",
    "sodbrennen",
    "rueckenschmerzen"
   ],
   "hint": "abdominal pain",
   "plOnly": true,
   "exclude": [
    "verstopfung",
    "durchfall"
   ],
   "variants": [
    "der Bauchschmerz"
   ],
   "enNP": "a stomachache"
  },
  {
   "id": "rueckenschmerzen",
   "n": 4,
   "en": "back pain",
   "art": "die",
   "de": "Rückenschmerzen",
   "pl": null,
   "lat": "Dorsalgie",
   "ex": {
    "de": "Ich habe Rückenschmerzen.",
    "en": "I have back pain."
   },
   "trap": "Also: Mein Rücken tut weh.",
   "view": {
    "img": "C04",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man seen from behind, one hand pressed to his lower back"
   },
   "sentences": [
    {
     "de": "Ich habe Rückenschmerzen.",
     "en": "I have back pain.",
     "tiles": [
      "Ich",
      "habe",
      "Rückenschmerzen"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Mein Rücken tut weh.",
     "en": "My back hurts.",
     "tiles": [
      "Mein",
      "Rücken",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ],
     "rule": "poss"
    },
    {
     "de": "Ich habe Schmerzen im Rücken.",
     "en": "I have pain in my back.",
     "tiles": [
      "Ich",
      "habe",
      "Schmerzen",
      "im",
      "Rücken"
     ],
     "extra": [
      "in der"
     ],
     "cloze": [
      {
       "gap": 3,
       "options": [
        "im",
        "in der"
       ],
       "rule": "ort"
      }
     ],
     "rule": "ort"
    }
   ],
   "nb": [
    "bauchschmerzen",
    "brustschmerzen",
    "kopfschmerzen"
   ],
   "plOnly": true,
   "variants": [
    "der Rückenschmerz"
   ],
   "enNP": "back pain"
  },
  {
   "id": "zahnschmerzen",
   "n": 5,
   "en": "toothache",
   "art": "die",
   "de": "Zahnschmerzen",
   "pl": null,
   "lat": "Odontalgie",
   "ex": {
    "de": "Ich habe Zahnschmerzen.",
    "en": "I have a toothache."
   },
   "trap": "Also: Mein Zahn tut weh.",
   "view": {
    "img": "C05",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman holding her palm against her jaw, wincing"
   },
   "sentences": [
    {
     "de": "Ich habe Zahnschmerzen.",
     "en": "I have a toothache.",
     "tiles": [
      "Ich",
      "habe",
      "Zahnschmerzen"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Mein Zahn tut weh.",
     "en": "My tooth hurts.",
     "tiles": [
      "Mein",
      "Zahn",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ],
     "rule": "poss"
    }
   ],
   "nb": [
    "ohrenschmerzen",
    "halsschmerzen",
    "kopfschmerzen"
   ],
   "plOnly": true,
   "variants": [
    "der Zahnschmerz"
   ],
   "enNP": "a toothache"
  },
  {
   "id": "ohrenschmerzen",
   "n": 6,
   "en": "earache",
   "art": "die",
   "de": "Ohrenschmerzen",
   "pl": null,
   "lat": "Otalgie",
   "ex": {
    "de": "Ich habe Ohrenschmerzen.",
    "en": "I have an earache."
   },
   "trap": "Ohrenschmerzen has -en- in the middle.",
   "view": {
    "img": "C06",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of an older man pressing his hand flat over one ear, wincing"
   },
   "sentences": [
    {
     "de": "Ich habe Ohrenschmerzen.",
     "en": "I have an earache.",
     "tiles": [
      "Ich",
      "habe",
      "Ohrenschmerzen"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Mein Ohr tut weh.",
     "en": "My ear hurts.",
     "tiles": [
      "Mein",
      "Ohr",
      "tut",
      "weh"
     ],
     "extra": [
      "Meine",
      "tun"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ],
     "rule": "poss"
    }
   ],
   "nb": [
    "zahnschmerzen",
    "kopfschmerzen",
    "halsschmerzen"
   ],
   "plOnly": true,
   "variants": [
    "der Ohrenschmerz"
   ],
   "enNP": "an earache"
  },
  {
   "id": "brustschmerzen",
   "n": 7,
   "en": "chest pain",
   "art": "die",
   "de": "Brustschmerzen",
   "pl": null,
   "lat": "Thoraxschmerz",
   "ex": {
    "de": "Ich habe Brustschmerzen.",
    "en": "I have chest pain."
   },
   "trap": "Also: Ich habe Schmerzen in der Brust.",
   "view": {
    "img": "C07",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man pressing his fist against the middle of his chest"
   },
   "sentences": [
    {
     "de": "Ich habe Brustschmerzen.",
     "en": "I have chest pain.",
     "tiles": [
      "Ich",
      "habe",
      "Brustschmerzen"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Ich habe Schmerzen in der Brust.",
     "en": "I have pain in my chest.",
     "tiles": [
      "Ich",
      "habe",
      "Schmerzen",
      "in der",
      "Brust"
     ],
     "extra": [
      "im"
     ],
     "cloze": [
      {
       "gap": 3,
       "options": [
        "im",
        "in der"
       ],
       "rule": "ort"
      }
     ],
     "rule": "ort"
    }
   ],
   "nb": [
    "herzrasen",
    "atemnot",
    "rueckenschmerzen"
   ],
   "plOnly": true,
   "exclude": [
    "sodbrennen"
   ],
   "variants": [
    "der Brustschmerz"
   ],
   "enNP": "chest pain"
  },
  {
   "id": "fieber",
   "n": 8,
   "en": "fever",
   "art": "das",
   "de": "Fieber",
   "pl": null,
   "lat": "Febris",
   "ex": {
    "de": "Ich habe Fieber.",
    "en": "I have a fever."
   },
   "trap": "No article and no plural: Ich habe Fieber.",
   "view": {
    "img": "C08",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a flushed woman wrapped in a blanket, beads of sweat on her forehead"
   },
   "sentences": [
    {
     "de": "Ich habe Fieber.",
     "en": "I have a fever.",
     "tiles": [
      "Ich",
      "habe",
      "Fieber"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Ich habe hohes Fieber.",
     "en": "I have a high fever.",
     "tiles": [
      "Ich",
      "habe",
      "hohes",
      "Fieber"
     ],
     "extra": [
      "bin"
     ]
    }
   ],
   "nb": [
    "schnupfen",
    "husten",
    "schwindel"
   ],
   "exclude": [
    "grippe",
    "erkaeltung"
   ],
   "enNP": "a fever"
  },
  {
   "id": "husten",
   "n": 9,
   "en": "cough",
   "art": "der",
   "de": "Husten",
   "pl": null,
   "lat": "Tussis",
   "ex": {
    "de": "Ich habe Husten.",
    "en": "I have a cough."
   },
   "trap": "Singular only. The verb: Ich huste.",
   "view": {
    "img": "C09",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man coughing into the crook of his elbow"
   },
   "sentences": [
    {
     "de": "Ich habe Husten.",
     "en": "I have a cough.",
     "tiles": [
      "Ich",
      "habe",
      "Husten"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    }
   ],
   "nb": [
    "halsschmerzen",
    "schnupfen",
    "atemnot"
   ],
   "exclude": [
    "erkaeltung"
   ],
   "enNP": "a cough",
   "sgOnly": true
  },
  {
   "id": "schnupfen",
   "n": 10,
   "en": "runny nose",
   "art": "der",
   "de": "Schnupfen",
   "pl": null,
   "lat": "Rhinitis",
   "ex": {
    "de": "Ich habe Schnupfen.",
    "en": "I have a runny nose."
   },
   "trap": "Just the nose. A whole cold is die Erkältung.",
   "view": {
    "img": "C10",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man holding a tissue to his reddened nose"
   },
   "sentences": [
    {
     "de": "Ich habe Schnupfen.",
     "en": "I have a runny nose.",
     "tiles": [
      "Ich",
      "habe",
      "Schnupfen"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Meine Nase läuft.",
     "en": "My nose is running.",
     "tiles": [
      "Meine",
      "Nase",
      "läuft"
     ],
     "extra": [
      "Mein"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      }
     ],
     "rule": "poss"
    }
   ],
   "nb": [
    "fieber",
    "husten",
    "halsschmerzen"
   ],
   "exclude": [
    "erkaeltung"
   ],
   "enNP": "a runny nose"
  },
  {
   "id": "erkaeltung",
   "n": 11,
   "en": "a cold",
   "art": "die",
   "de": "Erkältung",
   "pl": "Erkältungen",
   "lat": "grippaler Infekt",
   "ex": {
    "de": "Ich bin erkältet.",
    "en": "I have a cold."
   },
   "trap": "Patients usually say Ich bin erkältet.",
   "view": {
    "img": "C11",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of an older man in a wool scarf, holding a steaming mug and a tissue"
   },
   "sentences": [
    {
     "de": "Ich bin erkältet.",
     "en": "I have a cold.",
     "tiles": [
      "Ich",
      "bin",
      "erkältet"
     ],
     "extra": [
      "habe"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Ich habe eine Erkältung.",
     "en": "I have a cold.",
     "tiles": [
      "Ich",
      "habe",
      "eine",
      "Erkältung"
     ],
     "extra": [
      "einen"
     ]
    }
   ],
   "nb": [
    "kopfschmerzen",
    "schwindel",
    "uebelkeit"
   ],
   "exclude": [
    "schnupfen",
    "grippe",
    "fieber",
    "husten",
    "halsschmerzen"
   ],
   "enNP": "a cold"
  },
  {
   "id": "grippe",
   "n": 12,
   "en": "flu",
   "art": "die",
   "de": "Grippe",
   "pl": null,
   "lat": "Influenza",
   "ex": {
    "de": "Ich habe Grippe.",
    "en": "I have the flu."
   },
   "trap": "Patients often say Grippe for any bad cold.",
   "view": {
    "img": "C12",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of an exhausted man lying in bed, the covers pulled up to his chest"
   },
   "sentences": [
    {
     "de": "Ich habe Grippe.",
     "en": "I have the flu.",
     "tiles": [
      "Ich",
      "habe",
      "Grippe"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    }
   ],
   "nb": [
    "husten",
    "schnupfen",
    "schwindel"
   ],
   "exclude": [
    "fieber",
    "erkaeltung"
   ],
   "enNP": "the flu"
  },
  {
   "id": "durchfall",
   "n": 13,
   "en": "diarrhea",
   "art": "der",
   "de": "Durchfall",
   "pl": null,
   "lat": "Diarrhö",
   "ex": {
    "de": "Ich habe Durchfall.",
    "en": "I have diarrhea."
   },
   "trap": "No article: Ich habe Durchfall.",
   "view": {
    "img": "C13",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man hurrying toward a door, one hand on his belly"
   },
   "sentences": [
    {
     "de": "Ich habe Durchfall.",
     "en": "I have diarrhea.",
     "tiles": [
      "Ich",
      "habe",
      "Durchfall"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    }
   ],
   "nb": [
    "verstopfung",
    "uebelkeit",
    "erbrechen"
   ],
   "exclude": [
    "bauchschmerzen"
   ],
   "enNP": "diarrhea"
  },
  {
   "id": "verstopfung",
   "n": 14,
   "en": "constipation",
   "art": "die",
   "de": "Verstopfung",
   "pl": null,
   "lat": "Obstipation",
   "ex": {
    "de": "Ich habe Verstopfung.",
    "en": "I’m constipated."
   },
   "trap": "No article: Ich habe Verstopfung.",
   "view": {
    "img": "C14",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of an older man sitting on a chair, one hand on his lower belly, uncomfortable"
   },
   "sentences": [
    {
     "de": "Ich habe Verstopfung.",
     "en": "I’m constipated.",
     "tiles": [
      "Ich",
      "habe",
      "Verstopfung"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    }
   ],
   "nb": [
    "durchfall",
    "sodbrennen",
    "uebelkeit"
   ],
   "exclude": [
    "bauchschmerzen"
   ],
   "enNP": "constipation"
  },
  {
   "id": "uebelkeit",
   "n": 15,
   "en": "nausea",
   "art": "die",
   "de": "Übelkeit",
   "pl": null,
   "lat": "Nausea",
   "ex": {
    "de": "Mir ist schlecht.",
    "en": "I feel sick to my stomach."
   },
   "trap": "Mir ist schlecht = I feel sick. Ich bin schlecht is wrong.",
   "view": {
    "img": "C15",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a queasy woman holding her fingers to her lips, looking away"
   },
   "sentences": [
    {
     "de": "Mir ist schlecht.",
     "en": "I feel sick to my stomach.",
     "tiles": [
      "Mir",
      "ist",
      "schlecht"
     ],
     "extra": [
      "Ich",
      "bin"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mir",
        "Ich"
       ],
       "rule": "mir"
      }
     ],
     "rule": "mir"
    },
    {
     "de": "Mir ist übel.",
     "en": "I feel nauseous.",
     "tiles": [
      "Mir",
      "ist",
      "übel"
     ],
     "extra": [
      "Ich",
      "bin"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mir",
        "Ich"
       ],
       "rule": "mir"
      }
     ],
     "rule": "mir"
    }
   ],
   "nb": [
    "schwindel",
    "sodbrennen",
    "bauchschmerzen"
   ],
   "exclude": [
    "erbrechen"
   ],
   "enNP": "nausea"
  },
  {
   "id": "erbrechen",
   "n": 16,
   "en": "vomiting",
   "art": "das",
   "de": "Erbrechen",
   "pl": null,
   "lat": "Emesis",
   "ex": {
    "de": "Ich muss mich übergeben.",
    "en": "I’m going to throw up."
   },
   "trap": "The noun is for the doctor. Patients say Ich muss mich übergeben.",
   "view": {
    "img": "C16",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man leaning over an empty kidney-shaped basin"
   },
   "sentences": [
    {
     "de": "Ich muss mich übergeben.",
     "en": "I’m going to throw up.",
     "tiles": [
      "Ich",
      "muss",
      "mich",
      "übergeben"
     ],
     "extra": [
      "mir"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "mich",
        "mir"
       ],
       "rule": "mich"
      }
     ],
     "rule": "mich"
    }
   ],
   "nb": [
    "durchfall",
    "husten",
    "schwindel"
   ],
   "exclude": [
    "uebelkeit"
   ],
   "enNP": "vomiting",
   "sgOnly": true
  },
  {
   "id": "schwindel",
   "n": 17,
   "en": "dizziness",
   "art": "der",
   "de": "Schwindel",
   "pl": null,
   "lat": "Vertigo",
   "ex": {
    "de": "Mir ist schwindelig.",
    "en": "I feel dizzy."
   },
   "trap": "Mir ist schwindelig: learn it as a fixed phrase. Also correct: schwindlig.",
   "view": {
    "img": "C17",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man losing his balance, gripping the back of a chair, hand at his forehead"
   },
   "sentences": [
    {
     "de": "Mir ist schwindelig.",
     "en": "I feel dizzy.",
     "tiles": [
      "Mir",
      "ist",
      "schwindelig"
     ],
     "extra": [
      "Ich",
      "bin"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mir",
        "Ich"
       ],
       "rule": "mir"
      }
     ],
     "rule": "mir"
    }
   ],
   "nb": [
    "kopfschmerzen",
    "uebelkeit",
    "atemnot"
   ],
   "enNP": "dizziness"
  },
  {
   "id": "atemnot",
   "n": 18,
   "en": "shortness of breath",
   "art": "die",
   "de": "Atemnot",
   "pl": null,
   "lat": "Dyspnoe",
   "ex": {
    "de": "Ich bekomme schlecht Luft.",
    "en": "I’m having trouble breathing."
   },
   "trap": "Patients rarely say Atemnot. They say Ich bekomme schlecht Luft (bekommen = get).",
   "view": {
    "img": "C18",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of an older man at the top of some stairs, bent over with his hands on his thighs, panting"
   },
   "sentences": [
    {
     "de": "Ich bekomme schlecht Luft.",
     "en": "I’m having trouble breathing.",
     "tiles": [
      "Ich",
      "bekomme",
      "schlecht",
      "Luft"
     ],
     "extra": [
      "habe"
     ]
    }
   ],
   "nb": [
    "herzrasen",
    "brustschmerzen",
    "husten"
   ],
   "enNP": "shortness of breath"
  },
  {
   "id": "ausschlag",
   "n": 19,
   "en": "rash",
   "art": "der",
   "de": "Ausschlag",
   "pl": "Ausschläge",
   "lat": "Exanthem",
   "ex": {
    "de": "Ich habe einen Ausschlag.",
    "en": "I have a rash."
   },
   "trap": "Countable, so: Ich habe einen Ausschlag.",
   "view": {
    "img": "C19",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a forearm held out, covered in red blotchy spots"
   },
   "sentences": [
    {
     "de": "Ich habe einen Ausschlag.",
     "en": "I have a rash.",
     "tiles": [
      "Ich",
      "habe",
      "einen",
      "Ausschlag"
     ],
     "extra": [
      "ein"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "einen",
        "ein"
       ],
       "rule": "einen"
      }
     ],
     "rule": "einen"
    }
   ],
   "nb": [
    "juckreiz",
    "fieber",
    "schnupfen"
   ],
   "enNP": "a rash"
  },
  {
   "id": "juckreiz",
   "n": 20,
   "en": "itching",
   "art": "der",
   "de": "Juckreiz",
   "pl": null,
   "lat": "Pruritus",
   "ex": {
    "de": "Es juckt.",
    "en": "It itches."
   },
   "trap": "Patients say Es juckt.",
   "view": {
    "img": "C20",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man scratching his forearm, annoyed"
   },
   "sentences": [
    {
     "de": "Meine Haut juckt.",
     "en": "My skin itches.",
     "tiles": [
      "Meine",
      "Haut",
      "juckt"
     ],
     "extra": [
      "Mein"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      }
     ],
     "rule": "poss"
    },
    {
     "de": "Es juckt hier.",
     "en": "It itches here.",
     "tiles": [
      "Es",
      "juckt",
      "hier"
     ],
     "extra": [
      "Ich"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Es",
        "Ich"
       ],
       "rule": "es"
      }
     ],
     "rule": "es"
    }
   ],
   "nb": [
    "ausschlag",
    "schnupfen",
    "sodbrennen"
   ],
   "enNP": "itching"
  },
  {
   "id": "sodbrennen",
   "n": 21,
   "en": "heartburn",
   "art": "das",
   "de": "Sodbrennen",
   "pl": null,
   "lat": "Pyrosis",
   "ex": {
    "de": "Ich habe Sodbrennen.",
    "en": "I have heartburn."
   },
   "trap": "Singular only: Ich habe Sodbrennen.",
   "view": {
    "img": "C21",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of an older man at the table after a meal, hand on the lower end of his breastbone, grimacing"
   },
   "sentences": [
    {
     "de": "Ich habe Sodbrennen.",
     "en": "I have heartburn.",
     "tiles": [
      "Ich",
      "habe",
      "Sodbrennen"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    }
   ],
   "nb": [
    "uebelkeit",
    "bauchschmerzen",
    "herzrasen"
   ],
   "exclude": [
    "brustschmerzen"
   ],
   "enNP": "heartburn",
   "sgOnly": true
  },
  {
   "id": "herzrasen",
   "n": 22,
   "en": "racing heart",
   "art": "das",
   "de": "Herzrasen",
   "pl": null,
   "lat": "Tachykardie",
   "ex": {
    "de": "Ich habe Herzrasen.",
    "en": "My heart is racing."
   },
   "trap": "Singular only. It’s das, from das Rasen.",
   "view": {
    "img": "C22",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a startled woman with wide eyes, her hand flat on the left side of her chest"
   },
   "sentences": [
    {
     "de": "Ich habe Herzrasen.",
     "en": "My heart is racing.",
     "tiles": [
      "Ich",
      "habe",
      "Herzrasen"
     ],
     "extra": [
      "bin"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "habe",
        "bin"
       ],
       "rule": "haben"
      }
     ],
     "rule": "haben"
    },
    {
     "de": "Mein Herz rast.",
     "en": "My heart is racing.",
     "tiles": [
      "Mein",
      "Herz",
      "rast"
     ],
     "extra": [
      "Meine"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      }
     ],
     "rule": "poss"
    }
   ],
   "nb": [
    "brustschmerzen",
    "atemnot",
    "schwindel"
   ],
   "hint": "palpitations",
   "enNP": "a racing heart",
   "sgOnly": true
  }
 ]
});

;
/* data/m3-anamnese.js */
/* Module 3 · Anamnese-Fragen — generated by tools/build_data_m3.py from plan §2.3 (DWDS-checked 27.10.2026). */
MedA1.registerModule({
 "id": "anamnese",
 "n": 3,
 "de": "Anamnese-Fragen",
 "en": "Taking a history",
 "cover": "G3",
 "unit": "question",
 "units": "questions",
 "askMode": true,
 "typeLabel": {
  "img2word": "Picture → question",
  "word2img": "Question → picture",
  "type": "Typing"
 },
 "typeDesc": {
  "img2word": "Choose the German question",
  "word2img": "Find the matching picture",
  "type": "Write the question in German",
  "tiles": "Build the question: word order",
  "cloze": "Sie / dich · haben / hat · sind / ist"
 },
 "types": [
  "reveal",
  "img2word",
  "word2img",
  "qa",
  "chain",
  "type",
  "tiles",
  "cloze"
 ],
 "chains": [
  {
   "id": "bauch",
   "en": "Stomach pain",
   "steps": [
    {
     "q": "tun",
     "de": "Ich habe Bauchschmerzen.",
     "en": "I have a stomachache."
    },
    {
     "q": "wo",
     "de": "Hier, im Bauch.",
     "en": "Here, in my belly."
    },
    {
     "q": "seitwann",
     "de": "Seit gestern.",
     "en": "Since yesterday."
    },
    {
     "q": "stark",
     "de": "Sieben.",
     "en": "Seven."
    },
    {
     "q": "wann",
     "de": "Nach dem Essen.",
     "en": "After eating."
    },
    {
     "q": "uebel",
     "de": "Ja, mir ist sehr übel.",
     "en": "Yes, I feel very nauseous."
    },
    {
     "q": "medikamente",
     "de": "Ja, eine Tablette für den Blutdruck.",
     "en": "Yes, a pill for my blood pressure."
    },
    {
     "q": "allergien",
     "de": "Nein, ich habe keine Allergien.",
     "en": "No, I don’t have any allergies."
    }
   ]
  },
  {
   "id": "husten",
   "en": "Cough",
   "steps": [
    {
     "q": "tun",
     "de": "Ich habe Husten.",
     "en": "I have a cough."
    },
    {
     "q": "beschwerden",
     "de": "Husten, Schnupfen und Halsschmerzen.",
     "en": "A cough, a runny nose and a sore throat."
    },
    {
     "q": "seitwann",
     "de": "Seit drei Tagen.",
     "en": "For three days."
    },
    {
     "q": "fieber",
     "de": "Ja, 38,5.",
     "en": "Yes, 38.5 °C."
    },
    {
     "q": "rauchen",
     "de": "Ja, zehn Zigaretten am Tag.",
     "en": "Yes, ten cigarettes a day."
    },
    {
     "q": "allergien",
     "de": "Ja, gegen Penicillin.",
     "en": "Yes, to penicillin."
    }
   ]
  }
 ],
 "rec": {
  "first": [
   "img2word",
   "reveal",
   "word2img"
  ],
  "meaning": [
   [
    "img2word",
    "qa"
   ],
   [
    "qa",
    "img2word",
    "chain"
   ],
   [
    "chain",
    "qa",
    "type"
   ],
   [
    "type",
    "chain"
   ]
  ],
  "form": [
   [
    "cloze",
    "tiles"
   ],
   [
    "cloze",
    "tiles"
   ],
   [
    "tiles",
    "cloze"
   ],
   [
    "tiles",
    "cloze"
   ]
  ]
 },
 "grammar": {
  "w": "W-question: question word first, verb second. Seit wann | haben | Sie …?",
  "yn": "Yes/no question: the verb comes first. Haben Sie Fieber?",
  "imp": "Polite request: verb first, then Sie. Zeigen Sie mir bitte, …",
  "sie": "With patients, always Sie (capital S): für Sie, not für dich.",
  "ihnen": "Wie geht es Ihnen? Formal Ihnen, not dir.",
  "sieverb": "With Sie, the verb looks like the infinitive: haben Sie, nehmen Sie, trinken Sie.",
  "tut": "es tut weh = it hurts. tut is the verb, so it comes second: Wo tut es weh?",
  "wehtut": "After wo, the verb goes to the end: …, wo es wehtut.",
  "seit": "German uses the present with seit: Seit wann haben Sie …? = How long have you had …?",
  "dativ": "seit + dative: seit drei Tagen (with -n), seit einer Woche.",
  "sind": "Plural and Sie take sind: Wie stark sind die Schmerzen? Sind Sie schwanger?",
  "trenn": "ausstrahlen splits: Strahlt der Schmerz aus? The aus goes to the end.",
  "fieber": "No article: Haben Sie Fieber? Ich habe Fieber.",
  "dat": "Like Mir ist übel: Ist Ihnen übel? Not Sind Sie übel?",
  "mir": "Mir ist übel. A fixed phrase: mir, not ich.",
  "kein": "No allergies: keine Allergien. Use kein/keine with nouns, not nicht.",
  "hatten": "hatten = had: Hatten Sie schon einmal eine Operation?",
  "amtag": "am Tag = a day: zehn Zigaretten am Tag."
 },
 "items": [
  {
   "id": "tun",
   "n": 1,
   "en": "What can I do for you?",
   "de": "Was kann ich für Sie tun?",
   "art": null,
   "q": {
    "k": "w",
    "v": 1,
    "w": 1
   },
   "ans": [
    {
     "de": "Ich habe Bauchschmerzen.",
     "en": "I have a stomachache.",
     "u": true
    }
   ],
   "ex": {
    "de": "Ich habe Bauchschmerzen.",
    "en": "I have a stomachache."
   },
   "trap": "Also common: Was führt Sie zu mir? (What brings you in?)",
   "view": {
    "img": "D01",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a doctor seated at her desk, turned toward a man who has just sat down, her open hand inviting him to speak"
   },
   "sentences": [
    {
     "de": "Was kann ich für Sie tun?",
     "en": "What can I do for you?",
     "tiles": [
      "Was",
      "kann",
      "ich",
      "für",
      "Sie",
      "tun"
     ],
     "extra": [
      "dich"
     ],
     "cloze": [
      {
       "gap": 4,
       "options": [
        "Sie",
        "dich"
       ],
       "rule": "sie"
      }
     ],
     "rule": "w",
     "order": "w",
     "xrule": {
      "dich": "sie"
     }
    }
   ],
   "nb": [
    "wo"
   ],
   "exclude": [
    "wiegeht",
    "beschwerden"
   ],
   "variants": [
    "Was führt Sie zu mir?",
    "Was führt Sie zu uns?",
    "Wie kann ich Ihnen helfen?"
   ]
  },
  {
   "id": "wiegeht",
   "n": 2,
   "en": "How are you feeling?",
   "de": "Wie geht es Ihnen?",
   "art": null,
   "q": {
    "k": "w",
    "v": 1,
    "w": 1
   },
   "ans": [
    {
     "de": "Nicht so gut.",
     "en": "Not so great.",
     "u": true
    }
   ],
   "ex": {
    "de": "Nicht so gut.",
    "en": "Not so great."
   },
   "trap": "Formal Ihnen, not dir. Wie geht es dir? is for friends.",
   "view": {
    "img": "D02",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a doctor at a hospital bedside, leaning in kindly toward a tired woman sitting up in bed"
   },
   "sentences": [
    {
     "de": "Wie geht es Ihnen?",
     "en": "How are you feeling?",
     "tiles": [
      "Wie",
      "geht",
      "es",
      "Ihnen"
     ],
     "extra": [
      "dir"
     ],
     "cloze": [
      {
       "gap": 3,
       "options": [
        "Ihnen",
        "dir"
       ],
       "rule": "ihnen"
      }
     ],
     "rule": "w",
     "order": "w",
     "xrule": {
      "dir": "ihnen"
     }
    }
   ],
   "nb": [
    "uebel",
    "beschwerden"
   ],
   "exclude": [
    "tun"
   ],
   "qaEx": [
    "beschwerden"
   ],
   "variants": [
    "Wie geht’s Ihnen?",
    "Wie geht's Ihnen?",
    "Wie fühlen Sie sich?"
   ]
  },
  {
   "id": "beschwerden",
   "n": 3,
   "en": "What symptoms are you having?",
   "de": "Welche Beschwerden haben Sie?",
   "art": null,
   "q": {
    "k": "w",
    "v": 2,
    "w": 2
   },
   "ans": [
    {
     "de": "Ich habe Husten und Fieber.",
     "en": "I have a cough and a fever.",
     "u": true
    }
   ],
   "ex": {
    "de": "Ich habe Husten und Fieber.",
    "en": "I have a cough and a fever."
   },
   "trap": "Beschwerden = symptoms, complaints. It’s plural here.",
   "view": {
    "img": "D03",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man counting off his symptoms on his fingers while the doctor listens and writes on a blank clipboard"
   },
   "sentences": [
    {
     "de": "Welche Beschwerden haben Sie?",
     "en": "What symptoms are you having?",
     "tiles": [
      "Welche",
      "Beschwerden",
      "haben",
      "Sie"
     ],
     "extra": [
      "hat"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "haben",
        "hat"
       ],
       "rule": "sieverb"
      }
     ],
     "rule": "w",
     "order": "w",
     "xrule": {
      "hat": "sieverb"
     }
    }
   ],
   "nb": [
    "vorerkrankungen",
    "wiegeht"
   ],
   "exclude": [
    "tun"
   ],
   "qaEx": [
    "wiegeht"
   ],
   "variants": [
    "Was für Beschwerden haben Sie?"
   ]
  },
  {
   "id": "wo",
   "n": 4,
   "en": "Where does it hurt?",
   "de": "Wo tut es weh?",
   "art": null,
   "q": {
    "k": "w",
    "v": 1,
    "w": 1
   },
   "ans": [
    {
     "de": "Hier, im Bauch.",
     "en": "Here, in my belly.",
     "u": true
    }
   ],
   "ex": {
    "de": "Hier, im Bauch.",
    "en": "Here, in my belly."
   },
   "trap": "Verb in second place: Wo tut es weh?",
   "view": {
    "img": "D04",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a doctor with an open, questioning hand turned toward a man who holds one hand on his side"
   },
   "sentences": [
    {
     "de": "Wo tut es weh?",
     "en": "Where does it hurt?",
     "tiles": [
      "Wo",
      "tut",
      "es",
      "weh"
     ],
     "extra": [
      "tun"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "tut"
      }
     ],
     "rule": "w",
     "order": "w",
     "xrule": {
      "tun": "tut"
     }
    }
   ],
   "nb": [
    "stark",
    "ausstrahlen",
    "tun"
   ],
   "exclude": [
    "zeigen",
    "operation"
   ],
   "variants": [
    "Wo tut’s weh?",
    "Wo tut's weh?",
    "Wo haben Sie Schmerzen?"
   ]
  },
  {
   "id": "zeigen",
   "n": 5,
   "en": "Please show me where it hurts.",
   "de": "Zeigen Sie mir bitte, wo es wehtut.",
   "art": null,
   "q": {
    "k": "imp",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Hier.",
     "en": "Here.",
     "u": false
    }
   ],
   "ex": {
    "de": "Hier.",
    "en": "Here."
   },
   "trap": "After wo, the verb goes to the end, and wehtut stays in one piece.",
   "view": {
    "img": "D05",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman pointing with one finger at a small spot on her lower right belly, the doctor watching her finger"
   },
   "sentences": [
    {
     "de": "Zeigen Sie mir bitte, wo es wehtut.",
     "en": "Please show me where it hurts.",
     "tiles": [
      "Zeigen",
      "Sie",
      "mir",
      "bitte,",
      "wo",
      "es",
      "wehtut"
     ],
     "extra": [
      "tut weh"
     ],
     "cloze": [
      {
       "gap": 6,
       "options": [
        "wehtut",
        "tut weh"
       ],
       "rule": "wehtut"
      }
     ],
     "rule": "imp",
     "order": "imp",
     "xrule": {
      "tut weh": "wehtut"
     }
    }
   ],
   "nb": [
    "ausstrahlen",
    "stark",
    "seitwann"
   ],
   "exclude": [
    "wo",
    "operation"
   ],
   "variants": [
    "Zeigen Sie mir, wo es wehtut.",
    "Zeigen Sie mir bitte, wo es weh tut.",
    "Bitte zeigen Sie mir, wo es wehtut."
   ]
  },
  {
   "id": "seitwann",
   "n": 6,
   "en": "How long have you had the pain?",
   "de": "Seit wann haben Sie die Schmerzen?",
   "art": null,
   "q": {
    "k": "w",
    "v": 2,
    "w": 2
   },
   "ans": [
    {
     "de": "Seit drei Tagen.",
     "en": "For three days.",
     "u": true
    },
    {
     "de": "Seit gestern.",
     "en": "Since yesterday.",
     "u": true
    }
   ],
   "ex": {
    "de": "Seit drei Tagen.",
    "en": "For three days."
   },
   "trap": "German uses the present here: Seit wann haben Sie …? Not hatten.",
   "view": {
    "img": "D06",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a wall calendar page with plain empty day squares and no numbers, the last few squares washed in soft red, a patient’s finger resting on the first red square"
   },
   "sentences": [
    {
     "de": "Seit wann haben Sie die Schmerzen?",
     "en": "How long have you had the pain?",
     "tiles": [
      "Seit",
      "wann",
      "haben",
      "Sie",
      "die",
      "Schmerzen"
     ],
     "extra": [
      "hatten"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "haben",
        "hatten"
       ],
       "rule": "seit"
      }
     ],
     "rule": "seit",
     "order": "w",
     "xrule": {
      "hatten": "seit"
     }
    },
    {
     "de": "Ich habe seit drei Tagen Schmerzen.",
     "en": "I’ve had pain for three days.",
     "tiles": [
      "Ich",
      "habe",
      "seit",
      "drei",
      "Tagen",
      "Schmerzen"
     ],
     "extra": [
      "Tage"
     ],
     "cloze": [
      {
       "gap": 4,
       "options": [
        "Tagen",
        "Tage"
       ],
       "rule": "dativ"
      }
     ],
     "rule": "dativ",
     "xrule": {
      "Tage": "dativ"
     }
    }
   ],
   "nb": [
    "wann",
    "stark",
    "operation"
   ],
   "qaEx": [
    "wann"
   ],
   "variants": [
    "Seit wann haben Sie Schmerzen?",
    "Wie lange haben Sie die Schmerzen schon?",
    "Wie lange haben Sie schon Schmerzen?"
   ]
  },
  {
   "id": "stark",
   "n": 7,
   "en": "On a scale of 0 to 10, how bad is the pain?",
   "de": "Wie stark sind die Schmerzen von 0 bis 10?",
   "art": null,
   "q": {
    "k": "w",
    "v": 2,
    "w": 2
   },
   "ans": [
    {
     "de": "Sieben.",
     "en": "Seven.",
     "u": true
    }
   ],
   "ex": {
    "de": "Sieben.",
    "en": "Seven."
   },
   "trap": "sind, because die Schmerzen is plural. 0 = no pain, 10 = the worst pain imaginable.",
   "view": {
    "img": "D07",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a doctor holding up a plain colour strip that runs from soft green to deep red, without numbers; a man with a hand on his belly points near the red end"
   },
   "sentences": [
    {
     "de": "Wie stark sind die Schmerzen von 0 bis 10?",
     "en": "On a scale of 0 to 10, how bad is the pain?",
     "tiles": [
      "Wie",
      "stark",
      "sind",
      "die",
      "Schmerzen",
      "von 0 bis 10"
     ],
     "extra": [
      "ist"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "sind",
        "ist"
       ],
       "rule": "sind"
      }
     ],
     "rule": "sind",
     "order": "w",
     "xrule": {
      "ist": "sind"
     }
    }
   ],
   "nb": [
    "seitwann",
    "wo",
    "wann"
   ],
   "variants": [
    "Wie stark sind die Schmerzen von null bis zehn?",
    "Wie stark sind die Schmerzen auf einer Skala von 0 bis 10?",
    "Wie stark sind die Schmerzen?"
   ],
   "scale": true
  },
  {
   "id": "wann",
   "n": 8,
   "en": "When do you get the pain?",
   "de": "Wann haben Sie die Schmerzen?",
   "art": null,
   "q": {
    "k": "w",
    "v": 1,
    "w": 1
   },
   "ans": [
    {
     "de": "Nachts.",
     "en": "At night.",
     "u": true
    },
    {
     "de": "Nach dem Essen.",
     "en": "After eating.",
     "u": true
    }
   ],
   "ex": {
    "de": "Nachts.",
    "en": "At night."
   },
   "trap": "Wann? = at what time. Seit wann? = how long. Answers: nachts, morgens, nach dem Essen.",
   "view": {
    "img": "D08",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a soft arc across the paper from a pale sun on the left to a crescent moon on the right, above a woman sitting on the edge of her bed at night holding her belly"
   },
   "sentences": [
    {
     "de": "Wann haben Sie die Schmerzen?",
     "en": "When do you get the pain?",
     "tiles": [
      "Wann",
      "haben",
      "Sie",
      "die",
      "Schmerzen"
     ],
     "extra": [
      "hat"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "haben",
        "hat"
       ],
       "rule": "sieverb"
      }
     ],
     "rule": "w",
     "order": "w",
     "xrule": {
      "hat": "sieverb"
     }
    }
   ],
   "nb": [
    "seitwann",
    "stark",
    "uebel"
   ],
   "qaEx": [
    "seitwann"
   ],
   "variants": [
    "Wann haben Sie Schmerzen?",
    "Wann kommen die Schmerzen?"
   ]
  },
  {
   "id": "ausstrahlen",
   "n": 9,
   "en": "Does the pain spread anywhere?",
   "de": "Strahlt der Schmerz aus?",
   "art": null,
   "q": {
    "k": "yn",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Ja, in den Arm.",
     "en": "Yes, into my arm.",
     "u": true
    }
   ],
   "ex": {
    "de": "Ja, in den Arm.",
    "en": "Yes, into my arm."
   },
   "trap": "ausstrahlen splits: Strahlt … aus? The aus goes to the end.",
   "view": {
    "img": "D09",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of an older man with one hand on the center of his chest, a warm red glaze spreading from his chest down into his left arm"
   },
   "sentences": [
    {
     "de": "Strahlt der Schmerz aus?",
     "en": "Does the pain spread anywhere?",
     "tiles": [
      "Strahlt",
      "der",
      "Schmerz",
      "aus"
     ],
     "extra": [
      "ausstrahlt"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Strahlt",
        "Ausstrahlt"
       ],
       "rule": "trenn"
      }
     ],
     "rule": "trenn",
     "order": "yn",
     "xrule": {
      "ausstrahlt": "trenn"
     }
    }
   ],
   "nb": [
    "wo",
    "zeigen",
    "stark"
   ],
   "qaEx": [
    "operation"
   ],
   "variants": [
    "Strahlen die Schmerzen aus?",
    "Strahlt der Schmerz irgendwohin aus?"
   ]
  },
  {
   "id": "fieber",
   "n": 10,
   "en": "Do you have a fever?",
   "de": "Haben Sie Fieber?",
   "art": null,
   "q": {
    "k": "yn",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Ja, 38,5.",
     "en": "Yes, 38.5 °C.",
     "u": true
    },
    {
     "de": "Nein.",
     "en": "No.",
     "u": false
    }
   ],
   "ex": {
    "de": "Ja, 38,5.",
    "en": "Yes, 38.5 °C."
   },
   "trap": "No article: Haben Sie Fieber? Not ein Fieber.",
   "view": {
    "img": "D10",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a doctor holding a plain ear thermometer with a blank display to a flushed man’s ear"
   },
   "sentences": [
    {
     "de": "Haben Sie Fieber?",
     "en": "Do you have a fever?",
     "tiles": [
      "Haben",
      "Sie",
      "Fieber"
     ],
     "extra": [
      "ein"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Haben",
        "Hat"
       ],
       "rule": "sieverb"
      }
     ],
     "rule": "yn",
     "order": "yn",
     "xrule": {
      "ein": "fieber"
     }
    },
    {
     "de": "Ja, ich habe Fieber.",
     "en": "Yes, I have a fever.",
     "tiles": [
      "Ja,",
      "ich",
      "habe",
      "Fieber"
     ],
     "extra": [
      "ein"
     ],
     "rule": "fieber",
     "xrule": {
      "ein": "fieber"
     }
    }
   ],
   "nb": [
    "uebel",
    "allergien",
    "vorerkrankungen"
   ]
  },
  {
   "id": "uebel",
   "n": 11,
   "en": "Do you feel nauseous?",
   "de": "Ist Ihnen übel?",
   "art": null,
   "q": {
    "k": "yn",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Ja, mir ist sehr übel.",
     "en": "Yes, I feel very nauseous.",
     "u": true
    }
   ],
   "ex": {
    "de": "Ja, mir ist sehr übel.",
    "en": "Yes, I feel very nauseous."
   },
   "trap": "Like Mir ist übel: Ist Ihnen übel? Not Sind Sie übel?",
   "view": {
    "img": "C15",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a queasy woman holding her fingers to her lips, looking away"
   },
   "sentences": [
    {
     "de": "Ist Ihnen übel?",
     "en": "Do you feel nauseous?",
     "tiles": [
      "Ist",
      "Ihnen",
      "übel"
     ],
     "extra": [
      "sind",
      "Sie"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "Ihnen",
        "Sie"
       ],
       "rule": "dat"
      }
     ],
     "rule": "dat",
     "order": "yn",
     "xrule": {
      "sind": "dat",
      "Sie": "dat"
     }
    },
    {
     "de": "Mir ist sehr übel.",
     "en": "I feel very nauseous.",
     "tiles": [
      "Mir",
      "ist",
      "sehr",
      "übel"
     ],
     "extra": [
      "ich",
      "bin"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mir",
        "Ich"
       ],
       "rule": "mir"
      }
     ],
     "rule": "mir",
     "xrule": {
      "ich": "mir",
      "bin": "mir"
     }
    }
   ],
   "nb": [
    "fieber",
    "wiegeht",
    "schwanger"
   ],
   "variants": [
    "Ist Ihnen schlecht?"
   ]
  },
  {
   "id": "allergien",
   "n": 12,
   "en": "Do you have any allergies?",
   "de": "Haben Sie Allergien?",
   "art": null,
   "q": {
    "k": "yn",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Nein, ich habe keine Allergien.",
     "en": "No, I don’t have any allergies.",
     "u": true
    },
    {
     "de": "Ja, gegen Penicillin.",
     "en": "Yes, to penicillin.",
     "u": true
    }
   ],
   "ex": {
    "de": "Nein, ich habe keine Allergien.",
    "en": "No, I don’t have any allergies."
   },
   "trap": "No allergies = keine Allergien (not nicht). Also correct: Penizillin.",
   "view": {
    "img": "D12",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a still life of common allergy triggers: a sprig of flowering grass, a birch catkin, a few peanuts and a strawberry"
   },
   "sentences": [
    {
     "de": "Haben Sie Allergien?",
     "en": "Do you have any allergies?",
     "tiles": [
      "Haben",
      "Sie",
      "Allergien"
     ],
     "extra": [
      "hat"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Haben",
        "Hat"
       ],
       "rule": "sieverb"
      }
     ],
     "rule": "yn",
     "order": "yn",
     "xrule": {
      "hat": "sieverb"
     }
    },
    {
     "de": "Ich habe keine Allergien.",
     "en": "I don’t have any allergies.",
     "tiles": [
      "Ich",
      "habe",
      "keine",
      "Allergien"
     ],
     "extra": [
      "nicht"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "keine",
        "nicht"
       ],
       "rule": "kein"
      }
     ],
     "rule": "kein",
     "xrule": {
      "nicht": "kein"
     }
    }
   ],
   "nb": [
    "medikamente",
    "vorerkrankungen",
    "fieber"
   ],
   "variants": [
    "Haben Sie irgendwelche Allergien?",
    "Haben Sie eine Allergie?"
   ]
  },
  {
   "id": "medikamente",
   "n": 13,
   "en": "Do you take any medications regularly?",
   "de": "Nehmen Sie regelmäßig Medikamente?",
   "art": null,
   "q": {
    "k": "yn",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Ja, eine Tablette für den Blutdruck.",
     "en": "Yes, a pill for my blood pressure.",
     "u": true
    }
   ],
   "ex": {
    "de": "Ja, eine Tablette für den Blutdruck.",
    "en": "Yes, a pill for my blood pressure."
   },
   "trap": "Sie nehmen, but er nimmt.",
   "view": {
    "img": "D13",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a hand taking one white tablet from an open weekly pill organizer without any letters, a glass of water beside it"
   },
   "sentences": [
    {
     "de": "Nehmen Sie regelmäßig Medikamente?",
     "en": "Do you take any medications regularly?",
     "tiles": [
      "Nehmen",
      "Sie",
      "regelmäßig",
      "Medikamente"
     ],
     "extra": [
      "nimmt"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Nehmen",
        "Nimmt"
       ],
       "rule": "sieverb"
      }
     ],
     "rule": "yn",
     "order": "yn",
     "xrule": {
      "nimmt": "sieverb"
     }
    }
   ],
   "nb": [
    "allergien",
    "vorerkrankungen",
    "alkohol"
   ],
   "qaEx": [
    "vorerkrankungen"
   ],
   "variants": [
    "Nehmen Sie regelmäßig Medikamente ein?",
    "Nehmen Sie Medikamente?",
    "Nehmen Sie regelmässig Medikamente?"
   ]
  },
  {
   "id": "vorerkrankungen",
   "n": 14,
   "en": "Do you have any pre-existing conditions?",
   "de": "Haben Sie Vorerkrankungen?",
   "art": null,
   "q": {
    "k": "yn",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Ja, ich habe Diabetes.",
     "en": "Yes, I have diabetes.",
     "u": true
    }
   ],
   "ex": {
    "de": "Ja, ich habe Diabetes.",
    "en": "Yes, I have diabetes."
   },
   "trap": "Diabetes without an article: Ich habe Diabetes.",
   "view": {
    "img": "D14",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a doctor opening a thick, worn patient folder full of blank old records while an older man sits beside her"
   },
   "sentences": [
    {
     "de": "Haben Sie Vorerkrankungen?",
     "en": "Do you have any pre-existing conditions?",
     "tiles": [
      "Haben",
      "Sie",
      "Vorerkrankungen"
     ],
     "extra": [
      "hat"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Haben",
        "Hat"
       ],
       "rule": "sieverb"
      }
     ],
     "rule": "yn",
     "order": "yn",
     "xrule": {
      "hat": "sieverb"
     }
    }
   ],
   "nb": [
    "medikamente",
    "operation",
    "allergien"
   ],
   "hint": "earlier or chronic illnesses",
   "qaEx": [
    "medikamente"
   ],
   "variants": [
    "Haben Sie irgendwelche Vorerkrankungen?"
   ]
  },
  {
   "id": "operation",
   "n": 15,
   "en": "Have you ever had surgery?",
   "de": "Hatten Sie schon einmal eine Operation?",
   "art": null,
   "q": {
    "k": "yn",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Ja, am Knie.",
     "en": "Yes, on my knee.",
     "u": true
    }
   ],
   "ex": {
    "de": "Ja, am Knie.",
    "en": "Yes, on my knee."
   },
   "trap": "hatten = had: a past form you can learn as a chunk.",
   "view": {
    "img": "D15",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of an older man in shorts sitting on a chair and pointing to a faint, long-healed surgical scar over his knee"
   },
   "sentences": [
    {
     "de": "Hatten Sie schon einmal eine Operation?",
     "en": "Have you ever had surgery?",
     "tiles": [
      "Hatten",
      "Sie",
      "schon",
      "einmal",
      "eine",
      "Operation"
     ],
     "extra": [
      "haben"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Hatten",
        "Haben"
       ],
       "rule": "hatten"
      }
     ],
     "rule": "hatten",
     "order": "yn",
     "xrule": {
      "haben": "hatten"
     }
    }
   ],
   "nb": [
    "vorerkrankungen",
    "seitwann",
    "medikamente"
   ],
   "exclude": [
    "wo",
    "zeigen"
   ],
   "qaEx": [
    "ausstrahlen"
   ],
   "variants": [
    "Wurden Sie schon einmal operiert?",
    "Hatten Sie schon mal eine Operation?",
    "Sind Sie schon einmal operiert worden?",
    "Wurden Sie schon mal operiert?"
   ]
  },
  {
   "id": "rauchen",
   "n": 16,
   "en": "Do you smoke?",
   "de": "Rauchen Sie?",
   "art": null,
   "q": {
    "k": "yn",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Ja, zehn Zigaretten am Tag.",
     "en": "Yes, ten cigarettes a day.",
     "u": true
    },
    {
     "de": "Nein.",
     "en": "No.",
     "u": false
    }
   ],
   "ex": {
    "de": "Ja, zehn Zigaretten am Tag.",
    "en": "Yes, ten cigarettes a day."
   },
   "trap": "am Tag = a day, per day.",
   "view": {
    "img": "D16",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a single cigarette resting on a plain glass ashtray, a thin thread of smoke rising"
   },
   "sentences": [
    {
     "de": "Ich rauche zehn Zigaretten am Tag.",
     "en": "I smoke ten cigarettes a day.",
     "tiles": [
      "Ich",
      "rauche",
      "zehn",
      "Zigaretten",
      "am",
      "Tag"
     ],
     "extra": [
      "im"
     ],
     "cloze": [
      {
       "gap": 4,
       "options": [
        "am",
        "im"
       ],
       "rule": "amtag"
      }
     ],
     "rule": "amtag",
     "xrule": {
      "im": "amtag"
     }
    }
   ],
   "nb": [
    "alkohol",
    "medikamente",
    "fieber"
   ]
  },
  {
   "id": "alkohol",
   "n": 17,
   "en": "Do you drink alcohol?",
   "de": "Trinken Sie Alkohol?",
   "art": null,
   "q": {
    "k": "yn",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Manchmal ein Glas Wein.",
     "en": "Sometimes a glass of wine.",
     "u": true
    },
    {
     "de": "Selten.",
     "en": "Rarely.",
     "u": false
    }
   ],
   "ex": {
    "de": "Manchmal ein Glas Wein.",
    "en": "Sometimes a glass of wine."
   },
   "trap": "Answers: nie, selten, manchmal, jeden Tag.",
   "view": {
    "img": "D17",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a glass of red wine and a glass of beer side by side, no labels"
   },
   "sentences": [
    {
     "de": "Trinken Sie Alkohol?",
     "en": "Do you drink alcohol?",
     "tiles": [
      "Trinken",
      "Sie",
      "Alkohol"
     ],
     "extra": [
      "trinkt"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Trinken",
        "Trinkt"
       ],
       "rule": "sieverb"
      }
     ],
     "rule": "yn",
     "order": "yn",
     "xrule": {
      "trinkt": "sieverb"
     }
    }
   ],
   "nb": [
    "rauchen",
    "medikamente",
    "allergien"
   ]
  },
  {
   "id": "schwanger",
   "n": 18,
   "en": "Are you pregnant?",
   "de": "Sind Sie schwanger?",
   "art": null,
   "q": {
    "k": "yn",
    "v": 0,
    "w": 0
   },
   "ans": [
    {
     "de": "Nein, ich bin nicht schwanger.",
     "en": "No, I’m not pregnant.",
     "u": true
    },
    {
     "de": "Nein.",
     "en": "No.",
     "u": false
    }
   ],
   "ex": {
    "de": "Nein, ich bin nicht schwanger.",
    "en": "No, I’m not pregnant."
   },
   "trap": "Ask it calmly, like any other question. Softer: Könnten Sie schwanger sein?",
   "view": {
    "img": "D18",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a visibly pregnant woman sitting calmly in a chair, both hands resting on her belly, talking with the doctor"
   },
   "sentences": [
    {
     "de": "Sind Sie schwanger?",
     "en": "Are you pregnant?",
     "tiles": [
      "Sind",
      "Sie",
      "schwanger"
     ],
     "extra": [
      "haben"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Sind",
        "Haben"
       ],
       "rule": "sind"
      }
     ],
     "rule": "yn",
     "order": "yn",
     "xrule": {
      "haben": "sind"
     }
    }
   ],
   "nb": [
    "uebel",
    "fieber",
    "medikamente"
   ],
   "variants": [
    "Könnten Sie schwanger sein?"
   ]
  }
 ]
});

;
/* data/m4-untersuchung.js */
/* Module 4 · Bei der Untersuchung — generated by tools/build_data_m4.py from plan §2.4 (DWDS-checked 27.10.2026). */
MedA1.registerModule({
 "id": "untersuchung",
 "n": 4,
 "de": "Bei der Untersuchung",
 "en": "The examination",
 "cover": "G4",
 "unit": "phrase",
 "units": "phrases",
 "askMode": true,
 "seqs": [
  {
   "id": "rachen",
   "en": "Throat exam",
   "steps": [
    "mund",
    "zunge",
    "ah"
   ]
  },
  {
   "id": "atmung",
   "en": "Breathing",
   "steps": [
    "einatmen",
    "anhalten",
    "ausatmen"
   ]
  },
  {
   "id": "bauchu",
   "en": "Abdominal exam",
   "steps": [
    "hinlegen",
    "ruecken",
    "beine"
   ]
  }
 ],
 "typeLabel": {
  "img2word": "Picture → phrase",
  "word2img": "Phrase → picture",
  "type": "Typing",
  "form": "Correct form"
 },
 "typeDesc": {
  "img2word": "Choose the German instruction",
  "word2img": "Find the matching picture",
  "type": "Write the instruction in German",
  "tiles": "Build it: verb first, small word at the end",
  "cloze": "sich · ein / aus · den / dem",
  "form": "Pick the correct sentence (typical mistakes)",
  "order": "Put the steps of an exam in order"
 },
 "types": [
  "reveal",
  "img2word",
  "word2img",
  "form",
  "order",
  "type",
  "tiles",
  "cloze"
 ],
 "rec": {
  "first": [
   "img2word",
   "reveal",
   "word2img"
  ],
  "meaning": [
   [
    "img2word",
    "word2img"
   ],
   [
    "word2img",
    "img2word",
    "order"
   ],
   [
    "order",
    "type",
    "word2img"
   ],
   [
    "type",
    "order"
   ],
   [
    "type",
    "order"
   ]
  ],
  "form": [
   [
    "form",
    "cloze"
   ],
   [
    "form",
    "cloze",
    "tiles"
   ],
   [
    "cloze",
    "tiles",
    "form"
   ],
   [
    "form",
    "tiles",
    "cloze"
   ],
   [
    "tiles",
    "form",
    "cloze"
   ]
  ]
 },
 "grammar": {
  "imp": "Polite instruction: verb first, then Sie (+ bitte): Machen Sie bitte den Mund auf.",
  "ich": "Announcement: Ich + verb in second place, the small part at the end: Ich höre jetzt Ihre Lunge ab.",
  "trenn": "Separable verb: the verb comes first, the small part goes to the very end: Atmen Sie bitte tief ein.",
  "einaus": "ein = in, aus = out: Atmen Sie ein. / Atmen Sie aus.",
  "anaus": "an = on, aus = off: Ziehen Sie sich an. / Ziehen Sie sich aus.",
  "auf": "auf = open, zu = closed: Machen Sie den Mund auf.",
  "sich": "Reflexive verbs need sich right after Sie: Legen Sie sich bitte hin. Setzen Sie sich bitte.",
  "nosich": "No sich here: Stehen Sie bitte auf. Husten Sie bitte.",
  "sitzen": "setzen = to sit down (movement). sitzen = to be sitting. So: Setzen Sie sich bitte.",
  "liegen": "legen = to lie down (movement). liegen = to be lying. So: Legen Sie sich bitte hin.",
  "akk": "Movement → accusative: auf den Rücken, auf den Bauch.",
  "dat": "folgen + dative: meinem Finger.",
  "faust": "die Faust (feminine) → eine Faust.",
  "poss": "Accusative after abhören: die Lunge → Ihre Lunge, der Bauch → Ihren Bauch, das Herz → Ihr Herz.",
  "lunge": "German says Ihre Lunge (singular) for both lungs.",
  "sieverb": "With Sie, the verb looks like the infinitive: Sagen Sie, Husten Sie."
 },
 "items": [
  {
   "id": "frei",
   "n": 1,
   "en": "Please take off your top.",
   "de": "Machen Sie bitte den Oberkörper frei.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     5
    ],
    "rf": -1
   },
   "inf": "freimachen",
   "pat": "Verb first + Sie · frei at the end",
   "ex": null,
   "trap": "frei goes to the very end: Machen Sie … frei.",
   "variants": [
    "Machen Sie den Oberkörper frei.",
    "Bitte machen Sie den Oberkörper frei.",
    "Machen Sie bitte den Oberkörper frei!"
   ],
   "wf": [
    {
     "de": "Freimachen Sie bitte den Oberkörper.",
     "r": "trenn"
    },
    {
     "de": "Machen Sie bitte frei den Oberkörper.",
     "r": "trenn"
    },
    {
     "de": "Machen bitte den Oberkörper frei.",
     "r": "imp"
    }
   ],
   "view": {
    "img": "E01",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man seen from behind pulling his T-shirt up over his head in an exam room, his bare back turned to the doctor"
   },
   "sentences": [
    {
     "de": "Machen Sie bitte den Oberkörper frei.",
     "en": "Please take off your top.",
     "tiles": [
      "Machen",
      "Sie",
      "bitte",
      "den",
      "Oberkörper",
      "frei"
     ],
     "extra": [
      "freimachen"
     ],
     "cloze": [
      {
       "gap": 5,
       "options": [
        "frei",
        "aus"
       ],
       "rule": "trenn"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "freimachen": "trenn"
     }
    }
   ],
   "nb": [
    "anziehen",
    "umdrehen",
    "abhoeren"
   ],
   "hint": "undress to the waist"
  },
  {
   "id": "setzen",
   "n": 2,
   "en": "Please sit down.",
   "de": "Setzen Sie sich bitte.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0
    ],
    "rf": 2
   },
   "inf": "sich setzen",
   "pat": "Verb first + Sie · sich right after Sie",
   "ex": null,
   "trap": "sich is required. Not Sitzen Sie (sitzen = to be sitting).",
   "variants": [
    "Setzen Sie sich.",
    "Bitte setzen Sie sich.",
    "Setzen Sie sich bitte hin.",
    "Setzen Sie sich hin."
   ],
   "wf": [
    {
     "de": "Sitzen Sie bitte.",
     "r": "sitzen"
    },
    {
     "de": "Setzen Sie bitte.",
     "r": "sich"
    },
    {
     "de": "Setzen sich Sie bitte.",
     "r": "sich"
    },
    {
     "de": "Sitzen Sie sich bitte.",
     "r": "sitzen"
    }
   ],
   "view": {
    "img": "E02",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman lowering herself to sit on the edge of an examination couch while the doctor gestures toward it"
   },
   "sentences": [
    {
     "de": "Setzen Sie sich bitte.",
     "en": "Please sit down.",
     "tiles": [
      "Setzen",
      "Sie",
      "sich",
      "bitte"
     ],
     "extra": [
      "sitzen"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "sich",
        "Sie"
       ],
       "rule": "sich"
      }
     ],
     "rule": "imp",
     "order": "sich",
     "xrule": {
      "sitzen": "sitzen"
     }
    }
   ],
   "nb": [
    "hinlegen",
    "ruecken"
   ],
   "exclude": [
    "aufstehen"
   ]
  },
  {
   "id": "hinlegen",
   "n": 3,
   "en": "Please lie down.",
   "de": "Legen Sie sich bitte hin.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     4
    ],
    "rf": 2
   },
   "inf": "sich hinlegen",
   "pat": "Verb first + Sie · sich after Sie · hin at the end",
   "ex": null,
   "trap": "sich + hin at the end. Not Liegen Sie (liegen = to be lying).",
   "variants": [
    "Legen Sie sich hin.",
    "Bitte legen Sie sich hin.",
    "Legen Sie sich bitte hin!"
   ],
   "wf": [
    {
     "de": "Liegen Sie sich bitte hin.",
     "r": "liegen"
    },
    {
     "de": "Legen Sie bitte hin.",
     "r": "sich"
    },
    {
     "de": "Hinlegen Sie sich bitte.",
     "r": "trenn"
    }
   ],
   "view": {
    "img": "E03",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man in the middle of lying down on an examination couch, one elbow still propped, legs swinging up"
   },
   "sentences": [
    {
     "de": "Legen Sie sich bitte hin.",
     "en": "Please lie down.",
     "tiles": [
      "Legen",
      "Sie",
      "sich",
      "bitte",
      "hin"
     ],
     "extra": [
      "liegen"
     ],
     "cloze": [
      {
       "gap": 4,
       "options": [
        "hin",
        "her"
       ],
       "rule": "trenn"
      },
      {
       "gap": 2,
       "options": [
        "sich",
        "Sie"
       ],
       "rule": "sich"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "liegen": "liegen"
     }
    }
   ],
   "nb": [
    "setzen",
    "bauch"
   ],
   "exclude": [
    "ruecken",
    "beine"
   ]
  },
  {
   "id": "ruecken",
   "n": 4,
   "en": "Please lie on your back.",
   "de": "Legen Sie sich bitte auf den Rücken.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0
    ],
    "rf": 2
   },
   "inf": "sich legen",
   "pat": "Verb first + Sie · sich after Sie · auf den Rücken (movement → accusative)",
   "ex": null,
   "trap": "auf den Rücken: accusative, because you move there.",
   "variants": [
    "Legen Sie sich auf den Rücken.",
    "Bitte legen Sie sich auf den Rücken."
   ],
   "wf": [
    {
     "de": "Legen Sie sich bitte auf dem Rücken.",
     "r": "akk"
    },
    {
     "de": "Liegen Sie sich bitte auf den Rücken.",
     "r": "liegen"
    },
    {
     "de": "Legen Sie bitte auf den Rücken.",
     "r": "sich"
    }
   ],
   "view": {
    "img": "E04",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman lying flat on her back on an examination couch, arms relaxed at her sides, face turned up"
   },
   "sentences": [
    {
     "de": "Legen Sie sich bitte auf den Rücken.",
     "en": "Please lie on your back.",
     "tiles": [
      "Legen",
      "Sie",
      "sich",
      "bitte",
      "auf",
      "den",
      "Rücken"
     ],
     "extra": [
      "liegen"
     ],
     "cloze": [
      {
       "gap": 5,
       "options": [
        "den",
        "dem"
       ],
       "rule": "akk"
      }
     ],
     "rule": "imp",
     "order": "sich",
     "xrule": {
      "liegen": "liegen"
     }
    }
   ],
   "nb": [
    "bauch",
    "beine"
   ],
   "exclude": [
    "hinlegen"
   ]
  },
  {
   "id": "bauch",
   "n": 5,
   "en": "Please lie on your stomach.",
   "de": "Legen Sie sich bitte auf den Bauch.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0
    ],
    "rf": 2
   },
   "inf": "sich legen",
   "pat": "Verb first + Sie · sich after Sie · auf den Bauch (movement → accusative)",
   "ex": null,
   "trap": "Here, stomach = Bauch (front of the body). auf den: accusative.",
   "variants": [
    "Legen Sie sich auf den Bauch.",
    "Bitte legen Sie sich auf den Bauch."
   ],
   "wf": [
    {
     "de": "Legen Sie sich bitte auf dem Bauch.",
     "r": "akk"
    },
    {
     "de": "Legen Sie bitte auf den Bauch.",
     "r": "sich"
    },
    {
     "de": "Legen sich Sie bitte auf den Bauch.",
     "r": "sich"
    },
    {
     "de": "Liegen Sie sich bitte auf den Bauch.",
     "r": "liegen"
    }
   ],
   "view": {
    "img": "E05",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man lying face down on an examination couch, head turned to one side resting on his folded arms"
   },
   "sentences": [
    {
     "de": "Legen Sie sich bitte auf den Bauch.",
     "en": "Please lie on your stomach.",
     "tiles": [
      "Legen",
      "Sie",
      "sich",
      "bitte",
      "auf",
      "den",
      "Bauch"
     ],
     "extra": [
      "liegen"
     ],
     "cloze": [
      {
       "gap": 5,
       "options": [
        "den",
        "dem"
       ],
       "rule": "akk"
      }
     ],
     "rule": "imp",
     "order": "sich",
     "xrule": {
      "liegen": "liegen"
     }
    }
   ],
   "nb": [
    "ruecken",
    "beine",
    "umdrehen"
   ]
  },
  {
   "id": "umdrehen",
   "n": 6,
   "en": "Please turn around.",
   "de": "Drehen Sie sich bitte um.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     4
    ],
    "rf": 2
   },
   "inf": "sich umdrehen",
   "pat": "Verb first + Sie · sich after Sie · um at the end",
   "ex": null,
   "trap": "um goes to the end: Drehen Sie sich … um.",
   "variants": [
    "Drehen Sie sich um.",
    "Bitte drehen Sie sich um."
   ],
   "wf": [
    {
     "de": "Umdrehen Sie sich bitte.",
     "r": "trenn"
    },
    {
     "de": "Drehen Sie bitte um.",
     "r": "sich"
    },
    {
     "de": "Drehen sich Sie bitte um.",
     "r": "sich"
    }
   ],
   "view": {
    "img": "E06",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man standing and turning his body around, mid-turn, so that his back faces the doctor"
   },
   "sentences": [
    {
     "de": "Drehen Sie sich bitte um.",
     "en": "Please turn around.",
     "tiles": [
      "Drehen",
      "Sie",
      "sich",
      "bitte",
      "um"
     ],
     "extra": [
      "umdrehen"
     ],
     "cloze": [
      {
       "gap": 4,
       "options": [
        "um",
        "an"
       ],
       "rule": "trenn"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "umdrehen": "trenn"
     }
    }
   ],
   "nb": [
    "aufstehen",
    "frei",
    "geradeaus"
   ],
   "exclude": [
    "abhoeren"
   ]
  },
  {
   "id": "aufstehen",
   "n": 7,
   "en": "Please stand up.",
   "de": "Stehen Sie bitte auf.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     3
    ],
    "rf": -1
   },
   "inf": "aufstehen",
   "pat": "Verb first + Sie · auf at the end",
   "ex": null,
   "trap": "auf goes to the end: Stehen Sie bitte auf.",
   "variants": [
    "Stehen Sie auf.",
    "Bitte stehen Sie auf.",
    "Stehen Sie bitte auf!"
   ],
   "wf": [
    {
     "de": "Aufstehen Sie bitte.",
     "r": "trenn"
    },
    {
     "de": "Stehen Sie bitte.",
     "r": "trenn"
    },
    {
     "de": "Stehen Sie sich bitte auf.",
     "r": "nosich"
    }
   ],
   "view": {
    "img": "E07",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman rising from a chair, hands pushing on her knees, halfway up"
   },
   "sentences": [
    {
     "de": "Stehen Sie bitte auf.",
     "en": "Please stand up.",
     "tiles": [
      "Stehen",
      "Sie",
      "bitte",
      "auf"
     ],
     "extra": [
      "aufstehen"
     ],
     "cloze": [
      {
       "gap": 3,
       "options": [
        "auf",
        "an"
       ],
       "rule": "trenn"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "aufstehen": "trenn"
     }
    }
   ],
   "nb": [
    "umdrehen",
    "hinlegen"
   ],
   "exclude": [
    "setzen"
   ]
  },
  {
   "id": "mund",
   "n": 8,
   "en": "Please open your mouth.",
   "de": "Machen Sie bitte den Mund auf.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     5
    ],
    "rf": -1
   },
   "inf": "aufmachen",
   "pat": "Verb first + Sie · auf at the end (or: Öffnen Sie bitte den Mund.)",
   "ex": null,
   "trap": "Same meaning: Öffnen Sie bitte den Mund. öffnen does not split.",
   "variants": [
    "Öffnen Sie bitte den Mund.",
    "Öffnen Sie den Mund.",
    "Machen Sie den Mund auf.",
    "Bitte machen Sie den Mund auf.",
    "Bitte öffnen Sie den Mund."
   ],
   "wf": [
    {
     "de": "Aufmachen Sie bitte den Mund.",
     "r": "trenn"
    },
    {
     "de": "Machen Sie bitte auf den Mund.",
     "r": "trenn"
    },
    {
     "de": "Machen Sie bitte den Mund.",
     "r": "trenn"
    }
   ],
   "view": {
    "img": "E08",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man opening his mouth wide while the doctor, holding a small penlight, looks in"
   },
   "sentences": [
    {
     "de": "Machen Sie bitte den Mund auf.",
     "en": "Please open your mouth.",
     "tiles": [
      "Machen",
      "Sie",
      "bitte",
      "den",
      "Mund",
      "auf"
     ],
     "extra": [
      "aufmachen"
     ],
     "cloze": [
      {
       "gap": 5,
       "options": [
        "auf",
        "zu"
       ],
       "rule": "auf"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "aufmachen": "trenn"
     }
    }
   ],
   "nb": [
    "zunge",
    "faust"
   ],
   "exclude": [
    "ah"
   ]
  },
  {
   "id": "zunge",
   "n": 9,
   "en": "Please stick out your tongue.",
   "de": "Strecken Sie bitte die Zunge heraus.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     5
    ],
    "rf": -1
   },
   "inf": "herausstrecken",
   "pat": "Verb first + Sie · heraus at the end",
   "ex": null,
   "trap": "heraus goes to the end. Spoken: raus.",
   "variants": [
    "Strecken Sie die Zunge heraus.",
    "Strecken Sie bitte die Zunge raus.",
    "Bitte strecken Sie die Zunge heraus."
   ],
   "wf": [
    {
     "de": "Herausstrecken Sie bitte die Zunge.",
     "r": "trenn"
    },
    {
     "de": "Strecken Sie bitte heraus die Zunge.",
     "r": "trenn"
    },
    {
     "de": "Strecken Sie bitte die Zunge.",
     "r": "trenn"
    }
   ],
   "view": {
    "img": "E09",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman sticking her tongue out while the doctor looks at it"
   },
   "sentences": [
    {
     "de": "Strecken Sie bitte die Zunge heraus.",
     "en": "Please stick out your tongue.",
     "tiles": [
      "Strecken",
      "Sie",
      "bitte",
      "die",
      "Zunge",
      "heraus"
     ],
     "extra": [
      "herausstrecken"
     ],
     "cloze": [
      {
       "gap": 5,
       "options": [
        "heraus",
        "herein"
       ],
       "rule": "trenn"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "herausstrecken": "trenn"
     }
    }
   ],
   "nb": [
    "mund",
    "ah",
    "geradeaus"
   ]
  },
  {
   "id": "ah",
   "n": 10,
   "en": "Please say “ah.”",
   "de": "Sagen Sie bitte „A“.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0
    ],
    "rf": -1
   },
   "inf": "sagen",
   "pat": "Verb first + Sie · German quotation marks „A“",
   "ex": null,
   "trap": "German quotation marks: „A“ (low, then high).",
   "variants": [
    "Sagen Sie bitte „Ah“.",
    "Sagen Sie bitte „Aah“.",
    "Sagen Sie „A“.",
    "Sagen Sie mal „A“."
   ],
   "wf": [
    {
     "de": "Sagen bitte „A“.",
     "r": "imp"
    },
    {
     "de": "Sie sagen bitte „A“.",
     "r": "imp"
    },
    {
     "de": "Sagt Sie bitte „A“.",
     "r": "sieverb"
    }
   ],
   "view": {
    "img": "E10",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of the doctor holding a wooden tongue depressor at the open mouth of a man who is saying a long ah"
   },
   "sentences": [
    {
     "de": "Sagen Sie bitte „A“.",
     "en": "Please say “ah.”",
     "tiles": [
      "Sagen",
      "Sie",
      "bitte",
      "„A“"
     ],
     "extra": [
      "sagt"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Sagen",
        "Sagt"
       ],
       "rule": "sieverb"
      }
     ],
     "rule": "imp",
     "order": "imp",
     "xrule": {
      "sagt": "sieverb"
     }
    }
   ],
   "nb": [
    "zunge",
    "husten"
   ],
   "exclude": [
    "mund"
   ]
  },
  {
   "id": "einatmen",
   "n": 11,
   "en": "Please breathe in deeply.",
   "de": "Atmen Sie bitte tief ein.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     4
    ],
    "rf": -1
   },
   "inf": "einatmen",
   "pat": "Verb first + Sie · ein at the end",
   "ex": null,
   "trap": "Without ein the sentence is incomplete: Atmen Sie bitte tief ein.",
   "variants": [
    "Atmen Sie tief ein.",
    "Bitte atmen Sie tief ein.",
    "Atmen Sie bitte tief ein!"
   ],
   "wf": [
    {
     "de": "Atmen Sie bitte tief.",
     "r": "trenn"
    },
    {
     "de": "Einatmen Sie bitte tief.",
     "r": "trenn"
    },
    {
     "de": "Atmen Sie bitte ein tief.",
     "r": "trenn"
    }
   ],
   "view": {
    "img": "E11",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man breathing in deeply, chest lifted and shoulders slightly raised, a soft cool glaze drawn in at his nose"
   },
   "sentences": [
    {
     "de": "Atmen Sie bitte tief ein.",
     "en": "Please breathe in deeply.",
     "tiles": [
      "Atmen",
      "Sie",
      "bitte",
      "tief",
      "ein"
     ],
     "extra": [
      "einatmen"
     ],
     "cloze": [
      {
       "gap": 4,
       "options": [
        "ein",
        "aus"
       ],
       "rule": "einaus"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "einatmen": "trenn"
     }
    }
   ],
   "nb": [
    "ausatmen",
    "anhalten",
    "husten"
   ]
  },
  {
   "id": "ausatmen",
   "n": 12,
   "en": "Please breathe out.",
   "de": "Atmen Sie bitte aus.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     3
    ],
    "rf": -1
   },
   "inf": "ausatmen",
   "pat": "Verb first + Sie · aus at the end",
   "ex": null,
   "trap": "aus goes to the end: Atmen Sie bitte aus.",
   "variants": [
    "Atmen Sie aus.",
    "Bitte atmen Sie aus.",
    "Atmen Sie bitte wieder aus."
   ],
   "wf": [
    {
     "de": "Ausatmen Sie bitte.",
     "r": "trenn"
    },
    {
     "de": "Atmen Sie bitte.",
     "r": "trenn"
    },
    {
     "de": "Atmen bitte Sie aus.",
     "r": "imp"
    }
   ],
   "view": {
    "img": "E12",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman breathing out slowly through slightly open lips, shoulders lowered, a faint pale breath glaze leaving her mouth"
   },
   "sentences": [
    {
     "de": "Atmen Sie bitte aus.",
     "en": "Please breathe out.",
     "tiles": [
      "Atmen",
      "Sie",
      "bitte",
      "aus"
     ],
     "extra": [
      "ausatmen"
     ],
     "cloze": [
      {
       "gap": 3,
       "options": [
        "aus",
        "ein"
       ],
       "rule": "einaus"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "ausatmen": "trenn"
     }
    }
   ],
   "nb": [
    "einatmen",
    "anhalten",
    "husten"
   ]
  },
  {
   "id": "anhalten",
   "n": 13,
   "en": "Please hold your breath.",
   "de": "Halten Sie bitte die Luft an.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     5
    ],
    "rf": -1
   },
   "inf": "anhalten",
   "pat": "Verb first + Sie · an at the end",
   "ex": null,
   "trap": "Literally “hold the air”: die Luft anhalten. an goes to the end.",
   "variants": [
    "Halten Sie die Luft an.",
    "Bitte halten Sie die Luft an.",
    "Halten Sie bitte kurz die Luft an."
   ],
   "wf": [
    {
     "de": "Anhalten Sie bitte die Luft.",
     "r": "trenn"
    },
    {
     "de": "Halten Sie bitte die Luft.",
     "r": "trenn"
    },
    {
     "de": "Halten Sie bitte an die Luft.",
     "r": "trenn"
    }
   ],
   "view": {
    "img": "E13",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man holding his breath, lips pressed closed and cheeks slightly puffed, eyes calm"
   },
   "sentences": [
    {
     "de": "Halten Sie bitte die Luft an.",
     "en": "Please hold your breath.",
     "tiles": [
      "Halten",
      "Sie",
      "bitte",
      "die",
      "Luft",
      "an"
     ],
     "extra": [
      "anhalten"
     ],
     "cloze": [
      {
       "gap": 5,
       "options": [
        "an",
        "aus"
       ],
       "rule": "trenn"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "anhalten": "trenn"
     }
    }
   ],
   "nb": [
    "einatmen",
    "ausatmen",
    "husten"
   ]
  },
  {
   "id": "husten",
   "n": 14,
   "en": "Please cough.",
   "de": "Husten Sie bitte.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0
    ],
    "rf": -1
   },
   "inf": "husten",
   "pat": "Verb first + Sie · not separable",
   "ex": null,
   "trap": "husten does not split and has no sich.",
   "variants": [
    "Husten Sie.",
    "Bitte husten Sie.",
    "Husten Sie bitte einmal.",
    "Husten Sie bitte mal."
   ],
   "wf": [
    {
     "de": "Husten bitte.",
     "r": "imp"
    },
    {
     "de": "Sie husten bitte.",
     "r": "imp"
    },
    {
     "de": "Husten Sie sich bitte.",
     "r": "nosich"
    }
   ],
   "view": {
    "img": "E14",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman coughing into the crook of her elbow while the doctor listens to her back with a stethoscope"
   },
   "sentences": [
    {
     "de": "Husten Sie bitte.",
     "en": "Please cough.",
     "tiles": [
      "Husten",
      "Sie",
      "bitte"
     ],
     "extra": [
      "sich"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Husten",
        "Hustet"
       ],
       "rule": "sieverb"
      }
     ],
     "rule": "imp",
     "order": "imp",
     "xrule": {
      "sich": "nosich"
     }
    }
   ],
   "nb": [
    "einatmen",
    "ausatmen",
    "anhalten"
   ],
   "exclude": [
    "abhoeren"
   ]
  },
  {
   "id": "geradeaus",
   "n": 15,
   "en": "Please look straight ahead.",
   "de": "Schauen Sie bitte geradeaus.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0
    ],
    "rf": -1
   },
   "inf": "schauen",
   "pat": "Verb first + Sie",
   "ex": null,
   "trap": "geradeaus is one word.",
   "variants": [
    "Schauen Sie geradeaus.",
    "Bitte schauen Sie geradeaus.",
    "Sehen Sie bitte geradeaus.",
    "Blicken Sie bitte geradeaus."
   ],
   "wf": [
    {
     "de": "Schauen bitte geradeaus.",
     "r": "imp"
    },
    {
     "de": "Sie schauen bitte geradeaus.",
     "r": "imp"
    },
    {
     "de": "Schauen Sie sich bitte geradeaus.",
     "r": "nosich"
    }
   ],
   "view": {
    "img": "E15",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man looking straight ahead with a steady gaze while the doctor shines a small penlight into one eye from the side"
   },
   "sentences": [
    {
     "de": "Schauen Sie bitte geradeaus.",
     "en": "Please look straight ahead.",
     "tiles": [
      "Schauen",
      "Sie",
      "bitte",
      "geradeaus"
     ],
     "extra": [
      "sich"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Schauen",
        "Schaut"
       ],
       "rule": "sieverb"
      }
     ],
     "rule": "imp",
     "order": "imp",
     "xrule": {
      "sich": "nosich"
     }
    }
   ],
   "nb": [
    "umdrehen",
    "zunge"
   ],
   "exclude": [
    "finger"
   ]
  },
  {
   "id": "finger",
   "n": 16,
   "en": "Please follow my finger with your eyes.",
   "de": "Folgen Sie bitte meinem Finger mit den Augen.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0
    ],
    "rf": -1
   },
   "inf": "folgen",
   "pat": "Verb first + Sie · folgen + dative: meinem Finger",
   "ex": null,
   "trap": "Learn it as a block: meinem Finger (folgen + dative).",
   "variants": [
    "Folgen Sie meinem Finger mit den Augen.",
    "Folgen Sie bitte mit den Augen meinem Finger.",
    "Bitte folgen Sie meinem Finger mit den Augen."
   ],
   "wf": [
    {
     "de": "Folgen Sie bitte meinen Finger mit den Augen.",
     "r": "dat"
    },
    {
     "de": "Folgen Sie bitte mein Finger mit den Augen.",
     "r": "dat"
    },
    {
     "de": "Folgen bitte meinem Finger mit den Augen.",
     "r": "imp"
    }
   ],
   "view": {
    "img": "E16",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman following the doctor’s raised index finger with her eyes, her head still and her gaze turned to the side"
   },
   "sentences": [
    {
     "de": "Folgen Sie bitte meinem Finger mit den Augen.",
     "en": "Please follow my finger with your eyes.",
     "tiles": [
      "Folgen",
      "Sie",
      "bitte",
      "meinem",
      "Finger",
      "mit",
      "den",
      "Augen"
     ],
     "extra": [
      "meinen"
     ],
     "cloze": [
      {
       "gap": 3,
       "options": [
        "meinem",
        "meinen"
       ],
       "rule": "dat"
      }
     ],
     "rule": "imp",
     "order": "imp",
     "xrule": {
      "meinen": "dat"
     }
    }
   ],
   "nb": [
    "faust",
    "zunge"
   ],
   "exclude": [
    "geradeaus"
   ]
  },
  {
   "id": "faust",
   "n": 17,
   "en": "Please make a fist.",
   "de": "Machen Sie bitte eine Faust.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0
    ],
    "rf": -1
   },
   "inf": "machen",
   "pat": "Verb first + Sie · die Faust → eine Faust",
   "ex": null,
   "trap": "die Faust (feminine) → eine Faust.",
   "variants": [
    "Machen Sie eine Faust.",
    "Bitte machen Sie eine Faust."
   ],
   "wf": [
    {
     "de": "Machen Sie bitte einen Faust.",
     "r": "faust"
    },
    {
     "de": "Machen Sie bitte ein Faust.",
     "r": "faust"
    },
    {
     "de": "Machen bitte eine Faust.",
     "r": "imp"
    }
   ],
   "view": {
    "img": "E17",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a man’s forearm resting on a small table, his hand clenched into a fist, the doctor’s hands steadying his arm"
   },
   "sentences": [
    {
     "de": "Machen Sie bitte eine Faust.",
     "en": "Please make a fist.",
     "tiles": [
      "Machen",
      "Sie",
      "bitte",
      "eine",
      "Faust"
     ],
     "extra": [
      "einen"
     ],
     "cloze": [
      {
       "gap": 3,
       "options": [
        "eine",
        "einen"
       ],
       "rule": "faust"
      }
     ],
     "rule": "imp",
     "order": "imp",
     "xrule": {
      "einen": "faust"
     }
    }
   ],
   "nb": [
    "finger",
    "mund",
    "beine"
   ]
  },
  {
   "id": "beine",
   "n": 18,
   "en": "Please bend your knees.",
   "de": "Winkeln Sie bitte die Beine an.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     5
    ],
    "rf": -1
   },
   "inf": "anwinkeln",
   "pat": "Verb first + Sie · an at the end",
   "ex": null,
   "trap": "an goes to the end. Also correct: Winkeln Sie bitte die Knie an.",
   "variants": [
    "Winkeln Sie bitte die Knie an.",
    "Winkeln Sie die Beine an.",
    "Winkeln Sie die Knie an.",
    "Bitte winkeln Sie die Beine an."
   ],
   "wf": [
    {
     "de": "Anwinkeln Sie bitte die Beine.",
     "r": "trenn"
    },
    {
     "de": "Winkeln Sie bitte die Beine.",
     "r": "trenn"
    },
    {
     "de": "Winkeln Sie bitte an die Beine.",
     "r": "trenn"
    }
   ],
   "view": {
    "img": "E18",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman lying on her back on an examination couch with both knees bent and feet flat on the couch"
   },
   "sentences": [
    {
     "de": "Winkeln Sie bitte die Beine an.",
     "en": "Please bend your knees.",
     "tiles": [
      "Winkeln",
      "Sie",
      "bitte",
      "die",
      "Beine",
      "an"
     ],
     "extra": [
      "anwinkeln"
     ],
     "cloze": [
      {
       "gap": 5,
       "options": [
        "an",
        "ab"
       ],
       "rule": "trenn"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "anwinkeln": "trenn"
     }
    }
   ],
   "nb": [
    "ruecken",
    "bauch"
   ],
   "exclude": [
    "hinlegen"
   ]
  },
  {
   "id": "abhoeren",
   "n": 19,
   "en": "I’m going to listen to your lungs now.",
   "de": "Ich höre jetzt Ihre Lunge ab.",
   "art": null,
   "q": {
    "k": "ich",
    "mk": [
     1,
     5
    ],
    "rf": -1
   },
   "inf": "abhören",
   "pat": "Announcement · Ich + verb in second place · ab at the end",
   "ex": null,
   "trap": "Announce before you touch. Ihre Lunge (die Lunge): singular in German.",
   "variants": [
    "Ich höre Ihre Lunge jetzt ab.",
    "Ich höre jetzt Ihre Lungen ab.",
    "Ich höre Ihre Lunge ab."
   ],
   "wf": [
    {
     "de": "Ich abhöre jetzt Ihre Lunge.",
     "r": "trenn"
    },
    {
     "de": "Ich höre jetzt Ihre Lunge.",
     "r": "trenn"
    },
    {
     "de": "Ich höre jetzt Ihren Lunge ab.",
     "r": "poss"
    }
   ],
   "view": {
    "img": "E19",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of the doctor listening with a stethoscope to the bare back of an older man who sits with his back to her"
   },
   "sentences": [
    {
     "de": "Ich höre jetzt Ihre Lunge ab.",
     "en": "I’m going to listen to your lungs now.",
     "tiles": [
      "Ich",
      "höre",
      "jetzt",
      "Ihre",
      "Lunge",
      "ab"
     ],
     "extra": [
      "Ihren"
     ],
     "cloze": [
      {
       "gap": 4,
       "options": [
        "Lunge",
        "Lungen"
       ],
       "rule": "lunge"
      },
      {
       "gap": 3,
       "options": [
        "Ihre",
        "Ihren"
       ],
       "rule": "poss"
      }
     ],
     "rule": "ich",
     "order": "ich",
     "xrule": {
      "Ihren": "poss"
     }
    }
   ],
   "nb": [
    "frei",
    "einatmen"
   ],
   "exclude": [
    "husten",
    "umdrehen"
   ]
  },
  {
   "id": "anziehen",
   "n": 20,
   "en": "You can get dressed again.",
   "de": "Ziehen Sie sich bitte wieder an.",
   "art": null,
   "q": {
    "k": "imp",
    "mk": [
     0,
     5
    ],
    "rf": 2
   },
   "inf": "sich anziehen",
   "pat": "Verb first + Sie · sich after Sie · an at the end",
   "ex": null,
   "trap": "sich + an at the end. aus = off: Ziehen Sie sich aus.",
   "variants": [
    "Ziehen Sie sich wieder an.",
    "Bitte ziehen Sie sich wieder an.",
    "Sie können sich wieder anziehen."
   ],
   "wf": [
    {
     "de": "Anziehen Sie sich bitte wieder.",
     "r": "trenn"
    },
    {
     "de": "Ziehen Sie bitte wieder an.",
     "r": "sich"
    },
    {
     "de": "Ziehen Sie sich bitte wieder aus.",
     "r": "anaus"
    }
   ],
   "view": {
    "img": "E20",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a woman buttoning up her shirt again after the exam, the doctor nearby"
   },
   "sentences": [
    {
     "de": "Ziehen Sie sich bitte wieder an.",
     "en": "You can get dressed again.",
     "tiles": [
      "Ziehen",
      "Sie",
      "sich",
      "bitte",
      "wieder",
      "an"
     ],
     "extra": [
      "aus"
     ],
     "cloze": [
      {
       "gap": 5,
       "options": [
        "an",
        "aus"
       ],
       "rule": "anaus"
      },
      {
       "gap": 2,
       "options": [
        "sich",
        "Sie"
       ],
       "rule": "sich"
      }
     ],
     "rule": "imp",
     "order": "trenn",
     "xrule": {
      "aus": "anaus"
     }
    }
   ],
   "nb": [
    "frei",
    "aufstehen",
    "setzen"
   ]
  }
 ]
});

;
/* data/m5-organe.js */
/* Module 5 · Organe — generated by tools/build_data_m5.py from plan §2.5 (DWDS-checked 27.10.2026). */
MedA1.registerModule({
 "id": "organe",
 "n": 5,
 "de": "Organe",
 "en": "Organs",
 "cover": "G5",
 "enThe": true,
 "latLabel": "Latin",
 "rec": {
  "first": [
   "img2word",
   "word2img",
   "reveal"
  ],
  "meaning": [
   [
    "img2word",
    "word2img"
   ],
   [
    "word2img|img2word",
    "pairs"
   ],
   [
    "pairs|img2word|word2img",
    "type"
   ],
   [
    "type",
    "pairs"
   ],
   [
    "type",
    "pairs"
   ]
  ],
  "form": [
   [
    "article|plural",
    "plural",
    "article"
   ],
   [
    "plural|article",
    "compound",
    "article"
   ],
   [
    "compound|cloze|plural",
    "tiles",
    "cloze",
    "plural"
   ],
   [
    "tiles|compound|cloze|article",
    "compound",
    "cloze",
    "plural"
   ],
   [
    "compound|tiles|cloze|plural",
    "tiles",
    "cloze",
    "plural"
   ]
  ],
  "location": [
   [
    "tap"
   ],
   [
    "tap"
   ],
   [
    "tap"
   ],
   [
    "tap"
   ],
   [
    "tap"
   ]
  ]
 },
 "types": [
  "reveal",
  "img2word",
  "word2img",
  "tap",
  "pairs",
  "article",
  "plural",
  "compound",
  "type",
  "tiles",
  "cloze"
 ],
 "typeLabel": {
  "tap": "Organ map",
  "pairs": "Latin pairs",
  "compound": "Compound builder"
 },
 "typeDesc": {
  "tap": "Tap where the organ is",
  "pairs": "Match Latin to German",
  "compound": "Build the long word and its article",
  "cloze": "rechts / links · ist / sind · im / in der"
 },
 "grammar": {
  "article": "Every German noun has a gender: der, das or die. Learn the article with the word.",
  "compound": "In a compound, the last word decides the gender: die Galle + die Blase → die Gallenblase; das Blut + der Druck → der Blutdruck.",
  "fuge": "Often an -n- joins the two words: Lunge + Entzündung → Lungenentzündung, Niere + Stein → Nierenstein.",
  "lage": "rechts and links mean the patient’s right and left: Die Leber ist rechts oben.",
  "lunge": "die Lunge is singular in German: Die Lunge ist … (English: the lungs are …).",
  "sind": "Plural subject → sind: Die Nieren sind hinten.",
  "ort": "der and das words → im (im Kopf). die words → in der (in der Brust).",
  "am": "der and das words → am (am Hals). die words → an der.",
  "verb3": "er/sie/es → -t: Das Herz pumpt.",
  "trenn": "Separable verb: the small part goes to the end: Ich nehme Blut ab.",
  "gebrochen": "Der Knochen ist gebrochen — a fixed phrase with ist.",
  "poss": "mein goes with der and das words; meine goes with die words and plurals.",
  "verb": "One thing hurts: tut weh. Two or more things hurt: tun weh."
 },
 "items": [
  {
   "id": "herz",
   "n": 1,
   "en": "heart",
   "art": "das",
   "de": "Herz",
   "pl": "Herzen",
   "lat": "Cor",
   "stem": "kardi- (cardio-)",
   "ex": {
    "de": "Das Herz pumpt Blut.",
    "en": "The heart pumps blood."
   },
   "trap": "das Herz. Plural: die Herzen.",
   "view": {
    "img": "B01",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a human heart seen from the front, its apex pointing down to the right of the picture, with the great vessels on top"
   },
   "sentences": [
    {
     "de": "Das Herz pumpt Blut.",
     "en": "The heart pumps blood.",
     "tiles": [
      "Das Herz",
      "pumpt",
      "Blut"
     ],
     "extra": [
      "Der Herz",
      "pumpen"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "pumpt",
        "pumpen"
       ],
       "rule": "verb3"
      }
     ],
     "rule": "verb3"
    }
   ],
   "nb": [
    "lunge",
    "magen",
    "niere"
   ],
   "plWrong": [
    "Herze",
    "Herzer"
   ],
   "tap": "rumpf",
   "cp": {
    "parts": [
     [
      "das",
      "Herz"
     ]
    ],
    "fuge": "",
    "head": [
     "der",
     "Infarkt"
    ],
    "de": "Herzinfarkt",
    "art": "der",
    "en": "heart attack",
    "decoy": "Herzen"
   }
  },
  {
   "id": "lunge",
   "n": 2,
   "en": "lungs",
   "art": "die",
   "de": "Lunge",
   "pl": "Lungen",
   "lat": "Pulmo",
   "stem": "pneumo- / pulmo-",
   "ex": {
    "de": "Ich höre jetzt Ihre Lunge ab.",
    "en": "I’m going to listen to your lungs now."
   },
   "trap": "One die Lunge = both lungs (English: lungs).",
   "view": {
    "img": "B02",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a pair of human lungs seen from the front: three lobes on the left of the picture, two lobes and a notch for the heart on the right"
   },
   "sentences": [
    {
     "de": "Die Lunge ist in der Brust.",
     "en": "The lungs are in the chest.",
     "tiles": [
      "Die Lunge",
      "ist",
      "in der",
      "Brust"
     ],
     "extra": [
      "sind",
      "im"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "ist",
        "sind"
       ],
       "rule": "lunge"
      },
      {
       "gap": 2,
       "options": [
        "in der",
        "im"
       ],
       "rule": "ort"
      }
     ],
     "rule": "lunge"
    },
    {
     "de": "Ich höre jetzt Ihre Lunge ab.",
     "en": "I’m going to listen to your lungs now.",
     "tiles": [
      "Ich",
      "höre",
      "jetzt",
      "Ihre Lunge",
      "ab"
     ],
     "extra": [
      "an"
     ],
     "cloze": [
      {
       "gap": 4,
       "options": [
        "ab",
        "an"
       ],
       "rule": "trenn"
      }
     ],
     "rule": "trenn"
    }
   ],
   "nb": [
    "herz",
    "luftroehre",
    "leber"
   ],
   "plWrong": [
    "Lünge",
    "Lunges"
   ],
   "tap": "rumpf",
   "cp": {
    "parts": [
     [
      "die",
      "Lunge"
     ]
    ],
    "fuge": "n",
    "head": [
     "die",
     "Entzündung"
    ],
    "de": "Lungenentzündung",
    "art": "die",
    "en": "pneumonia",
    "decoy": "Lunge"
   },
   "enPl": true
  },
  {
   "id": "magen",
   "n": 3,
   "en": "stomach",
   "art": "der",
   "de": "Magen",
   "pl": "Mägen",
   "lat": "Gaster / Ventriculus",
   "stem": "gastr- (gastro-)",
   "ex": {
    "de": "Der Magen ist links oben im Bauch.",
    "en": "The stomach is in the upper left of the abdomen."
   },
   "trap": "der Magen = the organ only; der Bauch = belly. Plural Mägen (also Magen).",
   "view": {
    "img": "B03",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a J-shaped human stomach seen from the front, the esophagus entering at the top"
   },
   "sentences": [
    {
     "de": "Der Magen ist links oben im Bauch.",
     "en": "The stomach is in the upper left of the abdomen.",
     "tiles": [
      "Der Magen",
      "ist",
      "links",
      "oben",
      "im",
      "Bauch"
     ],
     "extra": [
      "rechts"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "links",
        "rechts"
       ],
       "rule": "lage"
      }
     ],
     "rule": "lage"
    }
   ],
   "nb": [
    "leber",
    "milz",
    "blase"
   ],
   "hint": "the organ",
   "plWrong": [
    "Magens",
    "Mägener"
   ],
   "tap": "rumpf",
   "plAlt": [
    "Magen"
   ]
  },
  {
   "id": "leber",
   "n": 4,
   "en": "liver",
   "art": "die",
   "de": "Leber",
   "pl": "Lebern",
   "lat": "Hepar",
   "stem": "hepat- (hepato-)",
   "ex": {
    "de": "Die Leber ist rechts oben im Bauch.",
    "en": "The liver is in the upper right of the abdomen."
   },
   "trap": "die Leber (feminine), although hepar is neuter in Latin.",
   "view": {
    "img": "B04",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a human liver seen from the front: a large right lobe on the left of the picture and a smaller left lobe"
   },
   "sentences": [
    {
     "de": "Die Leber ist rechts oben im Bauch.",
     "en": "The liver is in the upper right of the abdomen.",
     "tiles": [
      "Die Leber",
      "ist",
      "rechts",
      "oben",
      "im",
      "Bauch"
     ],
     "extra": [
      "links"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "rechts",
        "links"
       ],
       "rule": "lage"
      },
      {
       "gap": 3,
       "options": [
        "oben",
        "unten"
       ],
       "rule": "lage"
      }
     ],
     "rule": "lage"
    }
   ],
   "nb": [
    "milz",
    "magen",
    "niere"
   ],
   "plWrong": [
    "Leber",
    "Lebers"
   ],
   "tap": "rumpf"
  },
  {
   "id": "niere",
   "n": 5,
   "en": "kidney",
   "art": "die",
   "de": "Niere",
   "pl": "Nieren",
   "lat": "Ren / Nephros",
   "stem": "nephr- (nephro-), ren- (renal)",
   "ex": {
    "de": "Die Nieren sind hinten.",
    "en": "The kidneys are at the back."
   },
   "trap": "Usually plural: die Nieren sind …",
   "view": {
    "img": "B05",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a pair of bean-shaped human kidneys with their ureters, the right one sitting slightly lower"
   },
   "sentences": [
    {
     "de": "Die Nieren sind hinten.",
     "en": "The kidneys are at the back.",
     "tiles": [
      "Die Nieren",
      "sind",
      "hinten"
     ],
     "extra": [
      "ist",
      "vorne"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "sind",
        "ist"
       ],
       "rule": "sind"
      },
      {
       "gap": 2,
       "options": [
        "hinten",
        "vorne"
       ],
       "rule": "lage"
      }
     ],
     "rule": "sind"
    }
   ],
   "nb": [
    "leber",
    "blase",
    "herz"
   ],
   "plWrong": [
    "Nieres",
    "Nier"
   ],
   "tap": "rumpf",
   "cp": {
    "parts": [
     [
      "die",
      "Niere"
     ]
    ],
    "fuge": "n",
    "head": [
     "der",
     "Stein"
    ],
    "de": "Nierenstein",
    "art": "der",
    "en": "kidney stone",
    "decoy": "Niere"
   },
   "tapWhy": "The kidneys lie at the back. Seen from behind, the right kidney is on your right and a little lower."
  },
  {
   "id": "darm",
   "n": 6,
   "en": "intestines",
   "art": "der",
   "de": "Darm",
   "pl": "Därme",
   "lat": "Intestinum",
   "stem": "enter- (entero-)",
   "ex": {
    "de": "Der Darm ist lang.",
    "en": "The intestines are long."
   },
   "trap": "der Darm (singular) = the whole bowel. Plural with umlaut: Därme.",
   "view": {
    "img": "B06",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of human small intestine coiled in the middle, framed by the large intestine, seen from the front"
   },
   "sentences": [
    {
     "de": "Der Darm ist lang.",
     "en": "The intestines are long.",
     "tiles": [
      "Der Darm",
      "ist",
      "lang"
     ],
     "extra": [
      "sind",
      "Die Darm"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Der Darm",
        "Die Darm"
       ],
       "rule": "article"
      }
     ],
     "rule": "article"
    }
   ],
   "nb": [
    "blinddarm",
    "magen",
    "blase"
   ],
   "hint": "bowel",
   "plWrong": [
    "Darme",
    "Därmer"
   ],
   "tap": "rumpf",
   "enPl": true,
   "exclude": [
    "blinddarm"
   ],
   "tapOk": [
    "blinddarm"
   ]
  },
  {
   "id": "gehirn",
   "n": 7,
   "en": "brain",
   "art": "das",
   "de": "Gehirn",
   "pl": "Gehirne",
   "lat": "Cerebrum / Encephalon",
   "stem": "enzephal- (encephalo-)",
   "ex": {
    "de": "Das Gehirn ist im Kopf.",
    "en": "The brain is in the head."
   },
   "trap": "It’s das Gehirn.",
   "view": {
    "img": "B07",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a human brain seen from the side, front to the left"
   },
   "sentences": [
    {
     "de": "Das Gehirn ist im Kopf.",
     "en": "The brain is in the head.",
     "tiles": [
      "Das Gehirn",
      "ist",
      "im",
      "Kopf"
     ],
     "extra": [
      "in der"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "im",
        "in der"
       ],
       "rule": "ort"
      }
     ],
     "rule": "ort"
    }
   ],
   "nb": [
    "herz",
    "schilddruese",
    "knochen"
   ],
   "plWrong": [
    "Gehirner",
    "Gehirns"
   ]
  },
  {
   "id": "blase",
   "n": 8,
   "en": "bladder",
   "art": "die",
   "de": "Blase",
   "pl": "Blasen",
   "lat": "Vesica urinaria",
   "stem": "zyst- (cysto-)",
   "ex": {
    "de": "Die Blase ist voll.",
    "en": "The bladder is full."
   },
   "trap": "Also: die Harnblase. die Blase can also mean a blister.",
   "view": {
    "img": "B08",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a rounded human urinary bladder with the two ureters entering from above"
   },
   "sentences": [
    {
     "de": "Die Blase ist voll.",
     "en": "The bladder is full.",
     "tiles": [
      "Die Blase",
      "ist",
      "voll"
     ],
     "extra": [
      "Der Blase"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Die Blase",
        "Der Blase"
       ],
       "rule": "article"
      }
     ],
     "rule": "article"
    }
   ],
   "nb": [
    "niere",
    "gallenblase",
    "magen"
   ],
   "plWrong": [
    "Blases",
    "Bläse"
   ],
   "tap": "rumpf",
   "cp": {
    "parts": [
     [
      "die",
      "Blase"
     ]
    ],
    "fuge": "n",
    "head": [
     "die",
     "Entzündung"
    ],
    "de": "Blasenentzündung",
    "art": "die",
    "en": "bladder infection",
    "decoy": "Blase"
   },
   "variants": [
    "die Harnblase"
   ]
  },
  {
   "id": "gallenblase",
   "n": 9,
   "en": "gallbladder",
   "art": "die",
   "de": "Gallenblase",
   "pl": "Gallenblasen",
   "lat": "Vesica biliaris (fellea)",
   "stem": "chol- (chole-, cholecyst-)",
   "ex": {
    "de": "Die Gallenblase ist unter der Leber.",
    "en": "The gallbladder is under the liver."
   },
   "trap": "die Gallenblase: the last word decides (die Blase).",
   "view": {
    "img": "B09",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a small pear-shaped green gallbladder with its duct"
   },
   "sentences": [
    {
     "de": "Die Gallenblase ist unter der Leber.",
     "en": "The gallbladder is under the liver.",
     "tiles": [
      "Die Gallenblase",
      "ist",
      "unter",
      "der Leber"
     ],
     "extra": [
      "über"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "unter",
        "über"
       ],
       "rule": "lage"
      }
     ],
     "rule": "lage"
    }
   ],
   "nb": [
    "pankreas",
    "blase",
    "leber"
   ],
   "plWrong": [
    "Gallenblases",
    "Gallenbläse"
   ],
   "tap": "rumpf",
   "cp": {
    "parts": [
     [
      "die",
      "Galle"
     ]
    ],
    "fuge": "n",
    "head": [
     "die",
     "Blase"
    ],
    "de": "Gallenblase",
    "art": "die",
    "en": "gallbladder",
    "decoy": "Galle"
   }
  },
  {
   "id": "pankreas",
   "n": 10,
   "en": "pancreas",
   "art": "die",
   "de": "Bauchspeicheldrüse",
   "pl": "Bauchspeicheldrüsen",
   "lat": "Pancreas",
   "stem": "pankreat- (pancreato-)",
   "ex": {
    "de": "Die Bauchspeicheldrüse ist hinter dem Magen.",
    "en": "The pancreas is behind the stomach."
   },
   "trap": "Long compound; -drüse → die. Doctors also say das Pankreas.",
   "view": {
    "img": "B10",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a long, lobulated, pale pancreas lying horizontally: head on the left of the picture, tail on the right"
   },
   "sentences": [
    {
     "de": "Die Bauchspeicheldrüse ist hinter dem Magen.",
     "en": "The pancreas is behind the stomach.",
     "tiles": [
      "Die Bauchspeicheldrüse",
      "ist",
      "hinter",
      "dem Magen"
     ],
     "extra": [
      "vor"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "hinter",
        "vor"
       ],
       "rule": "lage"
      }
     ],
     "rule": "lage"
    }
   ],
   "nb": [
    "gallenblase",
    "milz",
    "schilddruese"
   ],
   "plWrong": [
    "Bauchspeicheldrüses",
    "Bauchspeicheldrüse"
   ],
   "tap": "rumpf",
   "cp": {
    "parts": [
     [
      "der",
      "Bauch"
     ],
     [
      "der",
      "Speichel"
     ]
    ],
    "fuge": "",
    "head": [
     "die",
     "Drüse"
    ],
    "de": "Bauchspeicheldrüse",
    "art": "die",
    "en": "pancreas",
    "decoy": "Bauchs"
   },
   "variants": [
    "das Pankreas"
   ]
  },
  {
   "id": "milz",
   "n": 11,
   "en": "spleen",
   "art": "die",
   "de": "Milz",
   "pl": "Milzen",
   "lat": "Lien / Splen",
   "stem": "splen- (spleno-)",
   "ex": {
    "de": "Die Milz ist links.",
    "en": "The spleen is on the left."
   },
   "trap": "Short word, feminine: die Milz.",
   "view": {
    "img": "B11",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a dark purple, bean-shaped human spleen with a notched edge"
   },
   "sentences": [
    {
     "de": "Die Milz ist links oben im Bauch.",
     "en": "The spleen is in the upper left of the abdomen.",
     "tiles": [
      "Die Milz",
      "ist",
      "links",
      "oben",
      "im",
      "Bauch"
     ],
     "extra": [
      "rechts"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "links",
        "rechts"
       ],
       "rule": "lage"
      }
     ],
     "rule": "lage"
    }
   ],
   "nb": [
    "leber",
    "niere",
    "pankreas"
   ],
   "plWrong": [
    "Milze",
    "Milzer"
   ],
   "tap": "rumpf"
  },
  {
   "id": "schilddruese",
   "n": 12,
   "en": "thyroid",
   "art": "die",
   "de": "Schilddrüse",
   "pl": "Schilddrüsen",
   "lat": "Glandula thyreoidea",
   "stem": "thyr- (thyro-)",
   "ex": {
    "de": "Die Schilddrüse ist am Hals.",
    "en": "The thyroid is in the neck."
   },
   "trap": "-drüse = gland → die Schilddrüse.",
   "view": {
    "img": "B12",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a butterfly-shaped thyroid gland wrapped around the front of the windpipe below the larynx"
   },
   "sentences": [
    {
     "de": "Die Schilddrüse ist am Hals.",
     "en": "The thyroid is in the neck.",
     "tiles": [
      "Die Schilddrüse",
      "ist",
      "am",
      "Hals"
     ],
     "extra": [
      "an der"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "am",
        "an der"
       ],
       "rule": "am"
      }
     ],
     "rule": "am"
    }
   ],
   "nb": [
    "luftroehre",
    "speiseroehre",
    "pankreas"
   ],
   "hint": "thyroid gland",
   "plWrong": [
    "Schilddrüses",
    "Schilddrüse"
   ],
   "tap": "hals",
   "cp": {
    "parts": [
     [
      null,
      "Schild"
     ]
    ],
    "fuge": "",
    "head": [
     "die",
     "Drüse"
    ],
    "de": "Schilddrüse",
    "art": "die",
    "en": "thyroid",
    "decoy": "Schilds"
   },
   "exclude": [
    "luftroehre"
   ]
  },
  {
   "id": "speiseroehre",
   "n": 13,
   "en": "esophagus",
   "art": "die",
   "de": "Speiseröhre",
   "pl": "Speiseröhren",
   "lat": "Oesophagus",
   "stem": "ösophag- (esophago-)",
   "ex": {
    "de": "Die Speiseröhre ist hinter der Luftröhre.",
    "en": "The esophagus is behind the windpipe."
   },
   "trap": "die Speise (food) + die Röhre (tube).",
   "view": {
    "img": "B13",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a muscular tube, the esophagus, running down from the throat and joining the top of the stomach"
   },
   "sentences": [
    {
     "de": "Die Speiseröhre ist hinter der Luftröhre.",
     "en": "The esophagus is behind the windpipe.",
     "tiles": [
      "Die Speiseröhre",
      "ist",
      "hinter",
      "der Luftröhre"
     ],
     "extra": [
      "vor"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "hinter",
        "vor"
       ],
       "rule": "lage"
      }
     ],
     "rule": "lage"
    }
   ],
   "nb": [
    "luftroehre",
    "magen",
    "schilddruese"
   ],
   "plWrong": [
    "Speiseröhres",
    "Speiseröhre"
   ],
   "tap": "hals",
   "cp": {
    "parts": [
     [
      "die",
      "Speise"
     ]
    ],
    "fuge": "",
    "head": [
     "die",
     "Röhre"
    ],
    "de": "Speiseröhre",
    "art": "die",
    "en": "esophagus",
    "decoy": "Speisen"
   },
   "exclude": [
    "luftroehre"
   ]
  },
  {
   "id": "luftroehre",
   "n": 14,
   "en": "windpipe",
   "art": "die",
   "de": "Luftröhre",
   "pl": "Luftröhren",
   "lat": "Trachea",
   "stem": "trache- (tracheo-)",
   "ex": {
    "de": "Die Luftröhre ist vorne im Hals.",
    "en": "The windpipe is at the front of the neck."
   },
   "trap": "die Luft (air) + die Röhre (tube).",
   "view": {
    "img": "B14",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a ringed windpipe dividing into the two main bronchi"
   },
   "sentences": [
    {
     "de": "Die Luftröhre ist vorne im Hals.",
     "en": "The windpipe is at the front of the neck.",
     "tiles": [
      "Die Luftröhre",
      "ist",
      "vorne",
      "im",
      "Hals"
     ],
     "extra": [
      "hinten"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "vorne",
        "hinten"
       ],
       "rule": "lage"
      }
     ],
     "rule": "lage"
    }
   ],
   "nb": [
    "speiseroehre",
    "lunge",
    "schilddruese"
   ],
   "hint": "trachea",
   "plWrong": [
    "Luftröhres",
    "Luftröhre"
   ],
   "tap": "hals",
   "cp": {
    "parts": [
     [
      "die",
      "Luft"
     ]
    ],
    "fuge": "",
    "head": [
     "die",
     "Röhre"
    ],
    "de": "Luftröhre",
    "art": "die",
    "en": "windpipe",
    "decoy": "Lüfte"
   },
   "exclude": [
    "schilddruese",
    "speiseroehre"
   ]
  },
  {
   "id": "blinddarm",
   "n": 15,
   "en": "appendix",
   "art": "der",
   "de": "Blinddarm",
   "pl": "Blinddärme",
   "lat": "Caecum (anat.) / Appendix",
   "stem": "append- (appendic-)",
   "ex": {
    "de": "Der Blinddarm ist rechts unten.",
    "en": "The appendix is in the lower right."
   },
   "trap": "Patients say Blinddarm for the appendix. Appendicitis = die Blinddarmentzündung.",
   "view": {
    "img": "B15",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of the pouch at the start of the large intestine with the small worm-shaped appendix hanging from it"
   },
   "sentences": [
    {
     "de": "Der Blinddarm ist rechts unten.",
     "en": "The appendix is in the lower right.",
     "tiles": [
      "Der Blinddarm",
      "ist",
      "rechts",
      "unten"
     ],
     "extra": [
      "links",
      "oben"
     ],
     "cloze": [
      {
       "gap": 2,
       "options": [
        "rechts",
        "links"
       ],
       "rule": "lage"
      },
      {
       "gap": 3,
       "options": [
        "unten",
        "oben"
       ],
       "rule": "lage"
      }
     ],
     "rule": "lage"
    }
   ],
   "nb": [
    "darm",
    "blase",
    "gallenblase"
   ],
   "plWrong": [
    "Blinddarme",
    "Blinddärmer"
   ],
   "tap": "rumpf",
   "cp": {
    "parts": [
     [
      "der",
      "Blinddarm"
     ]
    ],
    "fuge": "",
    "head": [
     "die",
     "Entzündung"
    ],
    "de": "Blinddarmentzündung",
    "art": "die",
    "en": "appendicitis",
    "decoy": "Blinddarms"
   },
   "exclude": [
    "darm"
   ],
   "tapNote": "Der Blinddarm is part of the bowel, too.",
   "tapWhy": "Der Blinddarm is low on the patient’s right, where the small intestine joins the large intestine."
  },
  {
   "id": "blut",
   "n": 16,
   "en": "blood",
   "art": "das",
   "de": "Blut",
   "pl": null,
   "lat": "Sanguis",
   "stem": "häm- (hemo-)",
   "ex": {
    "de": "Ich nehme jetzt Blut ab.",
    "en": "I’m going to take some blood now."
   },
   "trap": "das Blut. No plural.",
   "view": {
    "img": "B16",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a few drops of blood and a scattering of red blood cells, seen up close"
   },
   "sentences": [
    {
     "de": "Ich nehme jetzt Blut ab.",
     "en": "I’m going to take some blood now.",
     "tiles": [
      "Ich",
      "nehme",
      "jetzt",
      "Blut",
      "ab"
     ],
     "extra": [
      "an"
     ],
     "cloze": [
      {
       "gap": 4,
       "options": [
        "ab",
        "an"
       ],
       "rule": "trenn"
      }
     ],
     "rule": "trenn"
    }
   ],
   "nb": [
    "herz",
    "muskel",
    "knochen"
   ],
   "cp": {
    "parts": [
     [
      "das",
      "Blut"
     ]
    ],
    "fuge": "",
    "head": [
     "der",
     "Druck"
    ],
    "de": "Blutdruck",
    "art": "der",
    "en": "blood pressure",
    "decoy": "Bluts"
   },
   "sgOnly": true
  },
  {
   "id": "knochen",
   "n": 17,
   "en": "bone",
   "art": "der",
   "de": "Knochen",
   "pl": "Knochen",
   "lat": "Os",
   "stem": "oste- (osteo-)",
   "ex": {
    "de": "Der Knochen ist gebrochen.",
    "en": "The bone is broken."
   },
   "trap": "Plural unchanged: die Knochen. gebrochen = broken.",
   "view": {
    "img": "B17",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a single long bone, like a thigh bone, lying diagonally"
   },
   "sentences": [
    {
     "de": "Der Knochen ist gebrochen.",
     "en": "The bone is broken.",
     "tiles": [
      "Der Knochen",
      "ist",
      "gebrochen"
     ],
     "extra": [
      "hat"
     ],
     "cloze": [
      {
       "gap": 1,
       "options": [
        "ist",
        "hat"
       ],
       "rule": "gebrochen"
      }
     ],
     "rule": "gebrochen"
    }
   ],
   "nb": [
    "gelenk",
    "muskel",
    "blut"
   ],
   "plWrong": [
    "Knöchen",
    "Knochens"
   ],
   "cp": {
    "parts": [
     [
      "der",
      "Knochen"
     ]
    ],
    "fuge": "",
    "head": [
     "der",
     "Bruch"
    ],
    "de": "Knochenbruch",
    "art": "der",
    "en": "broken bone",
    "decoy": "Knochens"
   },
   "exclude": [
    "gelenk"
   ]
  },
  {
   "id": "muskel",
   "n": 18,
   "en": "muscle",
   "art": "der",
   "de": "Muskel",
   "pl": "Muskeln",
   "lat": "Musculus",
   "stem": "my- (myo-)",
   "ex": {
    "de": "Meine Muskeln tun weh.",
    "en": "My muscles hurt."
   },
   "trap": "Mostly plural: die Muskeln.",
   "view": {
    "img": "B18",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a single spindle-shaped muscle with its tendons at both ends, the fibres faintly visible"
   },
   "sentences": [
    {
     "de": "Meine Muskeln tun weh.",
     "en": "My muscles hurt.",
     "tiles": [
      "Meine",
      "Muskeln",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ],
     "rule": "poss"
    }
   ],
   "nb": [
    "knochen",
    "gelenk",
    "herz"
   ],
   "plWrong": [
    "Muskels",
    "Müskel"
   ]
  },
  {
   "id": "gelenk",
   "n": 19,
   "en": "joint",
   "art": "das",
   "de": "Gelenk",
   "pl": "Gelenke",
   "lat": "Articulatio",
   "stem": "arthr- (arthro-)",
   "ex": {
    "de": "Meine Gelenke tun weh.",
    "en": "My joints hurt."
   },
   "trap": "das Gelenk, so: das Handgelenk, das Kniegelenk.",
   "view": {
    "img": "B19",
    "crop": [
     0,
     0,
     1152,
     864
    ],
    "spot": null,
    "alt": "Watercolor of a knee joint seen from the front: the ends of the thigh and shin bones with the kneecap and ligaments"
   },
   "sentences": [
    {
     "de": "Meine Gelenke tun weh.",
     "en": "My joints hurt.",
     "tiles": [
      "Meine",
      "Gelenke",
      "tun",
      "weh"
     ],
     "extra": [
      "Mein",
      "tut"
     ],
     "cloze": [
      {
       "gap": 0,
       "options": [
        "Mein",
        "Meine"
       ],
       "rule": "poss"
      },
      {
       "gap": 2,
       "options": [
        "tut",
        "tun"
       ],
       "rule": "verb"
      }
     ],
     "rule": "poss"
    }
   ],
   "nb": [
    "knochen",
    "muskel",
    "blut"
   ],
   "plWrong": [
    "Gelenker",
    "Gelenks"
   ],
   "exclude": [
    "knochen"
   ]
  }
 ],
 "maps": {
  "situs_front": {
   "img": "B20",
   "w": 584,
   "h": 1000,
   "poly": true,
   "caption": "Front",
   "short": "Front",
   "alt": "Watercolor of the organs in the chest and belly, front view",
   "regions": [
    {
     "item": "lunge",
     "side": null,
     "p": [
      [
       355,
       84
      ],
      [
       342,
       89
      ],
      [
       332,
       99
      ],
      [
       323,
       120
      ],
      [
       320,
       137
      ],
      [
       323,
       195
      ],
      [
       315,
       230
      ],
      [
       317,
       260
      ],
      [
       323,
       266
      ],
      [
       328,
       283
      ],
      [
       338,
       263
      ],
      [
       347,
       267
      ],
      [
       342,
       280
      ],
      [
       344,
       283
      ],
      [
       353,
       272
      ],
      [
       358,
       273
      ],
      [
       361,
       279
      ],
      [
       356,
       284
      ],
      [
       354,
       292
      ],
      [
       360,
       297
      ],
      [
       368,
       313
      ],
      [
       377,
       312
      ],
      [
       386,
       320
      ],
      [
       385,
       329
      ],
      [
       381,
       333
      ],
      [
       367,
       335
      ],
      [
       373,
       342
      ],
      [
       383,
       341
      ],
      [
       385,
       344
      ],
      [
       382,
       350
      ],
      [
       384,
       354
      ],
      [
       379,
       359
      ],
      [
       378,
       375
      ],
      [
       383,
       402
      ],
      [
       374,
       429
      ],
      [
       377,
       431
      ],
      [
       400,
       424
      ],
      [
       416,
       427
      ],
      [
       423,
       431
      ],
      [
       441,
       452
      ],
      [
       455,
       433
      ],
      [
       490,
       409
      ],
      [
       490,
       327
      ],
      [
       480,
       254
      ],
      [
       457,
       184
      ],
      [
       423,
       127
      ],
      [
       404,
       106
      ],
      [
       383,
       90
      ]
     ]
    },
    {
     "item": "lunge",
     "side": null,
     "p": [
      [
       241,
       86
      ],
      [
       220,
       84
      ],
      [
       204,
       90
      ],
      [
       189,
       100
      ],
      [
       157,
       136
      ],
      [
       124,
       198
      ],
      [
       109,
       243
      ],
      [
       96,
       314
      ],
      [
       92,
       366
      ],
      [
       96,
       425
      ],
      [
       124,
       407
      ],
      [
       158,
       399
      ],
      [
       197,
       402
      ],
      [
       251,
       417
      ],
      [
       260,
       414
      ],
      [
       249,
       377
      ],
      [
       249,
       360
      ],
      [
       257,
       338
      ],
      [
       272,
       319
      ],
      [
       274,
       251
      ],
      [
       269,
       215
      ],
      [
       261,
       195
      ],
      [
       265,
       157
      ],
      [
       262,
       122
      ],
      [
       257,
       104
      ]
     ]
    },
    {
     "item": "darm",
     "side": null,
     "p": [
      [
       456,
       630
      ],
      [
       446,
       622
      ],
      [
       413,
       620
      ],
      [
       402,
       626
      ],
      [
       379,
       647
      ],
      [
       367,
       653
      ],
      [
       325,
       662
      ],
      [
       323,
       678
      ],
      [
       312,
       692
      ],
      [
       300,
       694
      ],
      [
       293,
       689
      ],
      [
       278,
       705
      ],
      [
       255,
       712
      ],
      [
       231,
       710
      ],
      [
       204,
       698
      ],
      [
       184,
       677
      ],
      [
       175,
       656
      ],
      [
       172,
       635
      ],
      [
       168,
       632
      ],
      [
       150,
       634
      ],
      [
       136,
       641
      ],
      [
       129,
       652
      ],
      [
       129,
       679
      ],
      [
       126,
       685
      ],
      [
       128,
       696
      ],
      [
       123,
       706
      ],
      [
       120,
       737
      ],
      [
       201,
       739
      ],
      [
       202,
       789
      ],
      [
       205,
       792
      ],
      [
       202,
       806
      ],
      [
       208,
       812
      ],
      [
       223,
       816
      ],
      [
       226,
       824
      ],
      [
       234,
       830
      ],
      [
       253,
       832
      ],
      [
       265,
       828
      ],
      [
       268,
       843
      ],
      [
       265,
       853
      ],
      [
       267,
       863
      ],
      [
       288,
       857
      ],
      [
       305,
       858
      ],
      [
       318,
       863
      ],
      [
       322,
       854
      ],
      [
       320,
       838
      ],
      [
       323,
       835
      ],
      [
       343,
       843
      ],
      [
       368,
       846
      ],
      [
       415,
       839
      ],
      [
       426,
       834
      ],
      [
       447,
       817
      ],
      [
       450,
       809
      ],
      [
       462,
       795
      ],
      [
       462,
       784
      ],
      [
       467,
       775
      ],
      [
       463,
       761
      ],
      [
       465,
       751
      ],
      [
       460,
       742
      ],
      [
       461,
       731
      ],
      [
       453,
       709
      ],
      [
       452,
       671
      ],
      [
       456,
       661
      ]
     ]
    },
    {
     "item": "pankreas",
     "side": null,
     "p": [
      [
       462,
       568
      ],
      [
       457,
       563
      ],
      [
       447,
       562
      ],
      [
       397,
       573
      ],
      [
       381,
       582
      ],
      [
       366,
       586
      ],
      [
       350,
       586
      ],
      [
       327,
       578
      ],
      [
       308,
       577
      ],
      [
       302,
       578
      ],
      [
       300,
       586
      ],
      [
       289,
       594
      ],
      [
       280,
       593
      ],
      [
       273,
       583
      ],
      [
       257,
       586
      ],
      [
       249,
       591
      ],
      [
       241,
       614
      ],
      [
       215,
       650
      ],
      [
       211,
       645
      ],
      [
       234,
       609
      ],
      [
       241,
       589
      ],
      [
       242,
       568
      ],
      [
       234,
       564
      ],
      [
       225,
       577
      ],
      [
       218,
       601
      ],
      [
       205,
       622
      ],
      [
       188,
       634
      ],
      [
       173,
       637
      ],
      [
       176,
       656
      ],
      [
       187,
       680
      ],
      [
       209,
       700
      ],
      [
       240,
       711
      ],
      [
       266,
       709
      ],
      [
       282,
       701
      ],
      [
       292,
       688
      ],
      [
       300,
       693
      ],
      [
       312,
       691
      ],
      [
       322,
       678
      ],
      [
       323,
       665
      ],
      [
       318,
       656
      ],
      [
       306,
       647
      ],
      [
       295,
       646
      ],
      [
       293,
       644
      ],
      [
       296,
       641
      ],
      [
       329,
       630
      ],
      [
       371,
       624
      ],
      [
       438,
       601
      ],
      [
       460,
       585
      ],
      [
       463,
       579
      ]
     ]
    },
    {
     "item": "magen",
     "side": null,
     "p": [
      [
       423,
       432
      ],
      [
       402,
       425
      ],
      [
       387,
       427
      ],
      [
       380,
       431
      ],
      [
       386,
       438
      ],
      [
       386,
       444
      ],
      [
       357,
       470
      ],
      [
       361,
       498
      ],
      [
       357,
       512
      ],
      [
       347,
       526
      ],
      [
       332,
       531
      ],
      [
       308,
       522
      ],
      [
       272,
       542
      ],
      [
       271,
       572
      ],
      [
       282,
       593
      ],
      [
       289,
       593
      ],
      [
       300,
       584
      ],
      [
       292,
       564
      ],
      [
       292,
       554
      ],
      [
       296,
       548
      ],
      [
       305,
       553
      ],
      [
       310,
       564
      ],
      [
       318,
       572
      ],
      [
       334,
       581
      ],
      [
       350,
       585
      ],
      [
       366,
       585
      ],
      [
       381,
       581
      ],
      [
       398,
       572
      ],
      [
       412,
       560
      ],
      [
       430,
       535
      ],
      [
       443,
       498
      ],
      [
       436,
       480
      ],
      [
       436,
       466
      ],
      [
       440,
       455
      ],
      [
       433,
       442
      ]
     ]
    },
    {
     "item": "milz",
     "side": null,
     "p": [
      [
       513,
       413
      ],
      [
       496,
       411
      ],
      [
       482,
       416
      ],
      [
       460,
       430
      ],
      [
       449,
       441
      ],
      [
       437,
       466
      ],
      [
       439,
       487
      ],
      [
       449,
       500
      ],
      [
       457,
       504
      ],
      [
       466,
       504
      ],
      [
       478,
       496
      ],
      [
       503,
       444
      ],
      [
       516,
       430
      ],
      [
       517,
       418
      ]
     ]
    },
    {
     "item": "leber",
     "side": null,
     "p": [
      [
       385,
       438
      ],
      [
       373,
       431
      ],
      [
       354,
       461
      ],
      [
       344,
       471
      ],
      [
       329,
       474
      ],
      [
       322,
       472
      ],
      [
       299,
       455
      ],
      [
       262,
       417
      ],
      [
       251,
       418
      ],
      [
       202,
       404
      ],
      [
       175,
       400
      ],
      [
       143,
       402
      ],
      [
       112,
       414
      ],
      [
       102,
       421
      ],
      [
       82,
       444
      ],
      [
       76,
       455
      ],
      [
       69,
       481
      ],
      [
       68,
       513
      ],
      [
       81,
       613
      ],
      [
       86,
       627
      ],
      [
       93,
       633
      ],
      [
       101,
       633
      ],
      [
       122,
       622
      ],
      [
       158,
       592
      ],
      [
       167,
       576
      ],
      [
       180,
       563
      ],
      [
       207,
       546
      ],
      [
       232,
       542
      ],
      [
       245,
       552
      ],
      [
       248,
       549
      ],
      [
       247,
       540
      ],
      [
       252,
       534
      ],
      [
       256,
       537
      ],
      [
       265,
       531
      ],
      [
       265,
       537
      ],
      [
       272,
       539
      ],
      [
       297,
       529
      ],
      [
       324,
       506
      ],
      [
       356,
       469
      ],
      [
       384,
       446
      ]
     ]
    },
    {
     "item": "gallenblase",
     "side": null,
     "p": [
      [
       266,
       534
      ],
      [
       262,
       532
      ],
      [
       256,
       538
      ],
      [
       251,
       538
      ],
      [
       251,
       546
      ],
      [
       246,
       556
      ],
      [
       237,
       545
      ],
      [
       224,
       543
      ],
      [
       207,
       547
      ],
      [
       180,
       564
      ],
      [
       165,
       580
      ],
      [
       157,
       595
      ],
      [
       155,
       611
      ],
      [
       161,
       626
      ],
      [
       171,
       633
      ],
      [
       184,
       634
      ],
      [
       204,
       622
      ],
      [
       217,
       601
      ],
      [
       224,
       577
      ],
      [
       231,
       567
      ],
      [
       230,
       553
      ],
      [
       235,
       551
      ],
      [
       243,
       566
      ],
      [
       242,
       589
      ],
      [
       235,
       609
      ],
      [
       212,
       645
      ],
      [
       216,
       649
      ],
      [
       243,
       608
      ],
      [
       250,
       586
      ],
      [
       253,
       556
      ]
     ]
    },
    {
     "item": "herz",
     "side": null,
     "p": [
      [
       315,
       263
      ],
      [
       309,
       267
      ],
      [
       313,
       288
      ],
      [
       303,
       301
      ],
      [
       301,
       282
      ],
      [
       297,
       278
      ],
      [
       289,
       277
      ],
      [
       280,
       281
      ],
      [
       279,
       306
      ],
      [
       274,
       318
      ],
      [
       254,
       346
      ],
      [
       250,
       360
      ],
      [
       250,
       377
      ],
      [
       259,
       409
      ],
      [
       273,
       429
      ],
      [
       316,
       467
      ],
      [
       325,
       472
      ],
      [
       337,
       473
      ],
      [
       353,
       461
      ],
      [
       380,
       412
      ],
      [
       382,
       395
      ],
      [
       377,
       375
      ],
      [
       378,
       358
      ],
      [
       383,
       354
      ],
      [
       381,
       350
      ],
      [
       384,
       344
      ],
      [
       373,
       343
      ],
      [
       365,
       334
      ],
      [
       381,
       332
      ],
      [
       385,
       320
      ],
      [
       377,
       313
      ],
      [
       365,
       313
      ],
      [
       361,
       300
      ],
      [
       352,
       290
      ],
      [
       360,
       279
      ],
      [
       358,
       274
      ],
      [
       354,
       273
      ],
      [
       342,
       286
      ],
      [
       341,
       280
      ],
      [
       346,
       267
      ],
      [
       339,
       264
      ],
      [
       328,
       285
      ],
      [
       322,
       266
      ]
     ]
    },
    {
     "item": "blase",
     "side": null,
     "p": [
      [
       288,
       858
      ],
      [
       264,
       865
      ],
      [
       248,
       879
      ],
      [
       245,
       902
      ],
      [
       254,
       923
      ],
      [
       284,
       945
      ],
      [
       288,
       957
      ],
      [
       288,
       970
      ],
      [
       294,
       973
      ],
      [
       297,
       969
      ],
      [
       300,
       946
      ],
      [
       331,
       922
      ],
      [
       338,
       907
      ],
      [
       339,
       893
      ],
      [
       336,
       879
      ],
      [
       321,
       865
      ],
      [
       305,
       859
      ]
     ]
    },
    {
     "item": "blinddarm",
     "side": null,
     "p": [
      [
       120,
       740
      ],
      [
       117,
       743
      ],
      [
       119,
       754
      ],
      [
       116,
       765
      ],
      [
       120,
       773
      ],
      [
       118,
       788
      ],
      [
       124,
       799
      ],
      [
       144,
       811
      ],
      [
       161,
       811
      ],
      [
       174,
       805
      ],
      [
       179,
       806
      ],
      [
       184,
       811
      ],
      [
       186,
       824
      ],
      [
       191,
       829
      ],
      [
       198,
       830
      ],
      [
       200,
       828
      ],
      [
       192,
       823
      ],
      [
       190,
       809
      ],
      [
       184,
       802
      ],
      [
       201,
       786
      ],
      [
       201,
       742
      ]
     ]
    }
   ]
  },
  "situs_back": {
   "img": "B22",
   "w": 584,
   "h": 1000,
   "poly": true,
   "caption": "Back · seen from behind",
   "short": "Back",
   "alt": "Watercolor of the back with both kidneys, seen from behind",
   "regions": [
    {
     "item": "niere",
     "side": null,
     "p": [
      [
       239,
       432
      ],
      [
       214,
       444
      ],
      [
       182,
       479
      ],
      [
       171,
       507
      ],
      [
       168,
       543
      ],
      [
       172,
       565
      ],
      [
       183,
       592
      ],
      [
       189,
       601
      ],
      [
       206,
       615
      ],
      [
       228,
       618
      ],
      [
       241,
       613
      ],
      [
       252,
       603
      ],
      [
       259,
       585
      ],
      [
       263,
       586
      ],
      [
       263,
       643
      ],
      [
       267,
       640
      ],
      [
       272,
       593
      ],
      [
       271,
       562
      ],
      [
       264,
       542
      ],
      [
       278,
       544
      ],
      [
       281,
       541
      ],
      [
       282,
       534
      ],
      [
       278,
       529
      ],
      [
       281,
       521
      ],
      [
       277,
       517
      ],
      [
       256,
       518
      ],
      [
       251,
       514
      ],
      [
       260,
       504
      ],
      [
       263,
       492
      ],
      [
       268,
       486
      ],
      [
       269,
       472
      ],
      [
       256,
       440
      ],
      [
       247,
       433
      ]
     ]
    },
    {
     "item": "niere",
     "side": null,
     "p": [
      [
       350,
       459
      ],
      [
       339,
       459
      ],
      [
       331,
       463
      ],
      [
       321,
       477
      ],
      [
       317,
       489
      ],
      [
       316,
       515
      ],
      [
       322,
       522
      ],
      [
       325,
       532
      ],
      [
       333,
       540
      ],
      [
       327,
       544
      ],
      [
       308,
       542
      ],
      [
       305,
       545
      ],
      [
       308,
       554
      ],
      [
       304,
       558
      ],
      [
       304,
       566
      ],
      [
       308,
       569
      ],
      [
       317,
       566
      ],
      [
       321,
       568
      ],
      [
       314,
       590
      ],
      [
       319,
       665
      ],
      [
       323,
       661
      ],
      [
       324,
       609
      ],
      [
       327,
       610
      ],
      [
       336,
       631
      ],
      [
       343,
       637
      ],
      [
       356,
       642
      ],
      [
       371,
       641
      ],
      [
       386,
       634
      ],
      [
       397,
       623
      ],
      [
       408,
       604
      ],
      [
       414,
       583
      ],
      [
       414,
       540
      ],
      [
       402,
       506
      ],
      [
       373,
       473
      ]
     ]
    }
   ]
  },
  "situs_neck": {
   "img": "B21",
   "w": 690,
   "h": 870,
   "poly": true,
   "caption": null,
   "alt": "Watercolor of the neck from the side",
   "regions": [
    {
     "item": "schilddruese",
     "side": null,
     "p": [
      [
       318,
       307
      ],
      [
       312,
       307
      ],
      [
       303,
       319
      ],
      [
       305,
       322
      ],
      [
       300,
       328
      ],
      [
       302,
       331
      ],
      [
       291,
       354
      ],
      [
       300,
       363
      ],
      [
       298,
       370
      ],
      [
       287,
       383
      ],
      [
       292,
       392
      ],
      [
       288,
       400
      ],
      [
       270,
       416
      ],
      [
       259,
       404
      ],
      [
       273,
       392
      ],
      [
       271,
       390
      ],
      [
       261,
       396
      ],
      [
       251,
       386
      ],
      [
       252,
       381
      ],
      [
       242,
       349
      ],
      [
       233,
       361
      ],
      [
       224,
       403
      ],
      [
       226,
       431
      ],
      [
       238,
       458
      ],
      [
       255,
       475
      ],
      [
       264,
       475
      ],
      [
       269,
       469
      ],
      [
       267,
       466
      ],
      [
       274,
       459
      ],
      [
       293,
       479
      ],
      [
       308,
       482
      ],
      [
       320,
       473
      ],
      [
       329,
       457
      ],
      [
       339,
       413
      ],
      [
       339,
       377
      ],
      [
       331,
       330
      ],
      [
       324,
       313
      ]
     ]
    },
    {
     "item": "luftroehre",
     "side": null,
     "p": [
      [
       348,
       466
      ],
      [
       345,
       469
      ],
      [
       337,
       469
      ],
      [
       332,
       475
      ],
      [
       319,
       475
      ],
      [
       308,
       483
      ],
      [
       300,
       483
      ],
      [
       288,
       475
      ],
      [
       281,
       475
      ],
      [
       278,
       478
      ],
      [
       282,
       498
      ],
      [
       288,
       503
      ],
      [
       288,
       527
      ],
      [
       296,
       546
      ],
      [
       299,
       578
      ],
      [
       302,
       587
      ],
      [
       308,
       591
      ],
      [
       308,
       616
      ],
      [
       315,
       637
      ],
      [
       315,
       656
      ],
      [
       320,
       678
      ],
      [
       326,
       684
      ],
      [
       327,
       722
      ],
      [
       331,
       726
      ],
      [
       334,
       763
      ],
      [
       341,
       767
      ],
      [
       369,
       766
      ],
      [
       373,
       759
      ],
      [
       378,
       759
      ],
      [
       382,
       755
      ],
      [
       382,
       720
      ],
      [
       389,
       715
      ],
      [
       389,
       709
      ],
      [
       394,
       705
      ],
      [
       394,
       696
      ],
      [
       389,
       691
      ],
      [
       386,
       646
      ],
      [
       381,
       642
      ],
      [
       380,
       607
      ],
      [
       378,
       600
      ],
      [
       372,
       596
      ],
      [
       369,
       555
      ],
      [
       362,
       551
      ],
      [
       362,
       520
      ],
      [
       360,
       510
      ],
      [
       352,
       506
      ],
      [
       352,
       470
      ]
     ]
    },
    {
     "item": "luftroehre",
     "side": null,
     "p": [
      [
       313,
       208
      ],
      [
       310,
       211
      ],
      [
       309,
       229
      ],
      [
       288,
       230
      ],
      [
       284,
       239
      ],
      [
       241,
       240
      ],
      [
       238,
       243
      ],
      [
       238,
       272
      ],
      [
       227,
       276
      ],
      [
       227,
       307
      ],
      [
       231,
       312
      ],
      [
       237,
       339
      ],
      [
       247,
       344
      ],
      [
       248,
       357
      ],
      [
       254,
       362
      ],
      [
       254,
       379
      ],
      [
       260,
       390
      ],
      [
       266,
       380
      ],
      [
       275,
       375
      ],
      [
       275,
       353
      ],
      [
       282,
       346
      ],
      [
       282,
       335
      ],
      [
       290,
       334
      ],
      [
       294,
       330
      ],
      [
       306,
       301
      ],
      [
       325,
       293
      ],
      [
       333,
       263
      ],
      [
       333,
       244
      ],
      [
       330,
       231
      ],
      [
       325,
       226
      ],
      [
       325,
       219
      ],
      [
       317,
       216
      ]
     ]
    },
    {
     "item": "speiseroehre",
     "side": null,
     "p": [
      [
       349,
       112
      ],
      [
       340,
       122
      ],
      [
       327,
       124
      ],
      [
       331,
       140
      ],
      [
       321,
       152
      ],
      [
       312,
       157
      ],
      [
       321,
       170
      ],
      [
       318,
       177
      ],
      [
       320,
       213
      ],
      [
       326,
       219
      ],
      [
       326,
       226
      ],
      [
       331,
       231
      ],
      [
       334,
       244
      ],
      [
       334,
       263
      ],
      [
       322,
       304
      ],
      [
       332,
       330
      ],
      [
       338,
       359
      ],
      [
       339,
       422
      ],
      [
       347,
       464
      ],
      [
       353,
       470
      ],
      [
       353,
       494
      ],
      [
       355,
       503
      ],
      [
       361,
       510
      ],
      [
       365,
       550
      ],
      [
       371,
       558
      ],
      [
       373,
       590
      ],
      [
       381,
       607
      ],
      [
       382,
       638
      ],
      [
       390,
       660
      ],
      [
       390,
       691
      ],
      [
       395,
       696
      ],
      [
       395,
       705
      ],
      [
       391,
       709
      ],
      [
       391,
       722
      ],
      [
       396,
       733
      ],
      [
       394,
       737
      ],
      [
       399,
       747
      ],
      [
       415,
       747
      ],
      [
       420,
       723
      ],
      [
       423,
       726
      ],
      [
       437,
       726
      ],
      [
       442,
       721
      ],
      [
       442,
       698
      ],
      [
       439,
       691
      ],
      [
       441,
       679
      ],
      [
       427,
       588
      ],
      [
       404,
       499
      ],
      [
       402,
       478
      ],
      [
       398,
       471
      ],
      [
       382,
       393
      ],
      [
       374,
       339
      ],
      [
       371,
       293
      ],
      [
       376,
       218
      ],
      [
       395,
       133
      ],
      [
       381,
       131
      ],
      [
       377,
       127
      ],
      [
       375,
       112
      ]
     ]
    }
   ]
  }
 },
 "tapmaps": {
  "rumpf": [
   "situs_front",
   "situs_back"
  ],
  "hals": [
   "situs_neck"
  ]
 }
});

;
/* js/app.js */
/* Views, router, settings, PWA glue. */
(function(){
'use strict';
var M = window.MedA1, h = M.h, S = M.store;
var root, cur = null; // current view cleanup
var depth = 0;        // in-app history depth (for back buttons)

/* ---------------- settings → document ---------------- */
var mqDark = matchMedia('(prefers-color-scheme: dark)');
M.applySettings = function(){
  var st = S.settings, de = document.documentElement;
  var dark = st.theme === 'dark' || (st.theme === 'system' && mqDark.matches);
  de.setAttribute('data-theme', dark ? 'dark' : 'light');
  de.classList.toggle('teach', S.teach());
  de.classList.toggle('nodots', !st.dots);
  var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', dark ? '#000000' : '#FAFAF8');
};
mqDark.addEventListener && mqDark.addEventListener('change', function(){ M.applySettings(); });

/* ---------------- small components ---------------- */
M.segmented = function(items, value, onChange, label){
  var el = h('div', {class:'seg', role:'group', 'aria-label':label || ''}), th = h('i', {class:'thumbp', 'aria-hidden':'true'});
  el.appendChild(th);
  var btns = items.map(function(it){
    var b = h('button', {type:'button', text:it.t, 'aria-pressed':String(it.v === value)});
    b.addEventListener('click', function(){ if (it.v === value) return; set(it.v); onChange(it.v); });
    el.appendChild(b); return b;
  });
  function place(){
    var i = items.findIndex(function(x){ return x.v === value; }), b = btns[i];
    if (!b || !b.offsetWidth) { th.style.width = 'calc((100% - 8px) / ' + items.length + ')'; th.style.transform = 'translateX(' + (i * 100) + '%)'; return; }
    th.style.width = b.offsetWidth + 'px'; th.style.transform = 'translateX(' + (b.offsetLeft - 4) + 'px)';
  }
  function set(v){ value = v; btns.forEach(function(b, i){ b.setAttribute('aria-pressed', String(items[i].v === v)); }); place(); }
  requestAnimationFrame(place); window.addEventListener('resize', place);
  return {el:el, set:set, get:function(){ return value; }};
};
function sw(on, onChange, label){
  var b = h('button', {class:'switch', type:'button', role:'switch', 'aria-checked':String(!!on), 'aria-label':label});
  b.addEventListener('click', function(){ on = !on; b.setAttribute('aria-checked', String(on)); onChange(on); });
  return b;
}
function ring(frac, size){
  size = size || 40; var r = size/2 - 2.5, c = 2 * Math.PI * r;
  var s = '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true"><circle class="trk" cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '"/>' +
    '<circle class="val" cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')" data-to="' + (c * (1 - frac)) + '"/></svg>';
  var wrap = h('span', {html:s}); var svg = wrap.firstChild;
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ var v = svg.querySelector('.val'); v.setAttribute('stroke-dashoffset', v.getAttribute('data-to')); }); });
  return svg;
}
function bar(opts){
  var b = h('header', {class:'bar'});
  if (opts.back) { var bb = h('button', {class:'icon-btn press', type:'button', 'aria-label':opts.backLabel || 'Back', html:M.icon(opts.backIcon || 'back')}); bb.addEventListener('click', opts.back); b.appendChild(bb); }
  if (opts.title) b.appendChild(h('div', {class:'bar-title', text:opts.title}));
  b.appendChild(h('div', {class:'spacer'}));
  if (S.teach()) b.appendChild(h('span', {class:'pill-flag', text:'Teaching'}));
  (opts.right || []).forEach(function(x){ b.appendChild(x); });
  if (opts.gear !== false) { var g = h('button', {class:'icon-btn press', type:'button', 'aria-label':'Settings', html:M.icon('gear')}); g.addEventListener('click', function(){ M.go('/settings'); }); b.appendChild(g); }
  if (opts.progress != null) { var hr = h('div', {class:'hair', style:{position:'absolute', left:0, right:0, bottom:0}}, h('i', {style:{width:(opts.progress*100) + '%'}})); b.style.position = 'sticky'; b.appendChild(hr); b._hair = hr.firstChild; }
  return b;
}
var toastT = 0;
M.toast = function(msg, action){
  var t = document.getElementById('toast'); t.innerHTML = ''; t.appendChild(h('span', {text:msg}));
  if (action) { var b = h('button', {type:'button', text:action.t}); b.addEventListener('click', action.fn); t.appendChild(b); }
  t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove('on'); }, action ? 12000 : 2600);
};
function fmtDue(t){
  if (!t) return '';
  var days = Math.round((M.startOfDay(t) - M.startOfDay(Date.now())) / M.DAY);
  if (days <= 0) return 'later today'; if (days === 1) return 'tomorrow';
  return new Date(t).toLocaleDateString('en-US', {weekday:'long', month:'short', day:'numeric'});
}

/* ---------------- router ---------------- */
M.go = function(path, replace){
  if (replace) { history.replaceState({d:depth}, '', '#' + path); }
  else { depth++; history.pushState({d:depth}, '', '#' + path); }
  route();
};
M.back = function(fallback){ if (depth > 0) history.back(); else M.go(fallback || '/', true); };
window.addEventListener('popstate', function(e){ depth = (e.state && e.state.d) || 0; route(); });

function parse(){
  var p = (location.hash || '#/').slice(1) || '/';
  var seg = p.split('?')[0].split('/').filter(Boolean);
  return seg;
}
var rendering = false;
function route(){
  var seg = parse();
  var go = function(){ render(seg); };
  // cross-fade/morph only between home and module page (the cover plate); everything else switches instantly so taps never land on a transition overlay
  var isHub = function(s){ return !s.length || (s[0] === 'm' && s.length === 2); };
  if (document.startViewTransition && !M.reducedMotion() && cur && cur.hub && isHub(seg)) { try { var vt = document.startViewTransition(go), noop = function(){}; /* a skipped transition (rapid navigation) rejects its promises — not an error */ ['ready', 'finished', 'updateCallbackDone'].forEach(function(k){ if (vt && vt[k] && vt[k].catch) vt[k].catch(noop); }); return; } catch(e){} }
  go();
}
function render(seg){
  if (cur && cur.cleanup) cur.cleanup();
  cur = null; document.onkeydown = null;
  root.innerHTML = ''; window.scrollTo(0, 0);
  var v;
  if (!seg.length) v = viewHome();
  else if (seg[0] === 'settings') v = viewSettings();
  else if (seg[0] === 'review') v = seg[1] === 'ergebnis' ? viewSummary(null) : viewReview();
  else if (seg[0] === 'm' && M.byId[seg[1]] && M.byId[seg[1]].status === 'ready') {
    var mod = M.byId[seg[1]];
    if (!seg[2]) v = viewModule(mod);
    else if (seg[2] === 'anschauen') v = viewBrowse(mod, parseInt(seg[3], 10) || 1);
    else if (seg[2] === 'dialog' && mod.chains && mod.chains[(parseInt(seg[3], 10) || 1) - 1]) v = viewDialog(mod, (parseInt(seg[3], 10) || 1) - 1, parseInt(seg[4], 10) || 1);
    else if (seg[2] === 'ueben' && seg[3] === 'session') v = viewSession(mod);
    else if (seg[2] === 'ueben' && seg[3] === 'ergebnis') v = viewSummary(mod);
    else if (seg[2] === 'ueben') v = viewSetup(mod);
  }
  if (!v) { history.replaceState({d:depth}, '', '#/'); v = viewHome(); }
  v.hub = !seg.length || (seg[0] === 'm' && seg.length === 2);
  cur = v; root.appendChild(v.el);
  document.title = v.title ? v.title + ' · Medical German' : 'Medical German';
}

/* ---------------- Home ---------------- */
function viewHome(){
  var el = h('div', {class:'view home'});
  el.appendChild(bar({}));
  var w = h('main', {class:'wrap'});
  w.appendChild(h('div', {class:'home-head'}, h('h1', {class:'display', text:'Medical German'}), h('p', {text:'The words you need on the ward, one picture at a time.'})));
  var due = S.dueList();
  if (due.length) {
    var n = Math.min(20, due.length);
    var r = h('button', {class:'review press', type:'button'}, h('div', {}, h('b', {text:'Review today'}), h('span', {text:n === 1 ? '1 card is due' : n + ' cards are due'})), h('span', {class:'go', html:M.icon('arrow')}));
    r.addEventListener('click', function(){ M.go('/review'); });
    w.appendChild(r);
  }
  var grid = h('div', {class:'tiles'});
  M.modules.forEach(function(mod){
    var ready = mod.status === 'ready';
    var thumb = h('div', {class:'thumb'}, h('img', {src:M.asset(mod.cover, 'webp'), alt:'', loading:'lazy', draggable:'false', style:ready ? {viewTransitionName:'cover-' + mod.id} : null}));
    var meta = h('div', {class:'meta'}, h('div', {}, h('span', {class:'num tnum', text:String(mod.n).padStart(2, '0')}), h('h2', {class:'display', text:mod.de}), h('div', {class:'en', text:mod.en})));
    if (ready) { var tot = mod.items.length, m = S.masteredCount(mod); meta.appendChild(ring(m / tot, 36)); meta.lastChild.setAttribute('aria-label', m + ' of ' + tot + ' mastered'); }
    else meta.appendChild(h('span', {class:'next', text:'Coming next'}));
    var t = h(ready ? 'button' : 'div', {class:'tile ' + (ready ? 'ready press' : 'soon'), type:ready ? 'button' : null, 'aria-label':ready ? mod.de + ', ' + mod.en : mod.de + ', ' + mod.en + ', coming next', 'aria-disabled':ready ? null : 'true'}, thumb, meta);
    if (ready) t.addEventListener('click', function(){ M.go('/m/' + mod.id); });
    grid.appendChild(t);
  });
  w.appendChild(grid); el.appendChild(w);
  return {el:el};
}

/* ---------------- Module page ---------------- */
function viewModule(mod){
  var el = h('div', {class:'view'});
  el.appendChild(bar({back:function(){ M.back('/'); }, backLabel:'Home'}));
  var w = h('main', {class:'wrap'});
  var tot = mod.items.length, m = S.masteredCount(mod);
  var cover = M.Plate({img:mod.cover}, {alt:''});
  cover.img.style.viewTransitionName = 'cover-' + mod.id;
  cover.draw(0);
  var hero = h('section', {class:'mod-hero'}, cover.el, h('div', {},
    h('h1', {class:'display', text:mod.de}), h('div', {class:'en', text:mod.en}),
    h('div', {class:'mastery'}, ring(m / tot, 44), h('span', {html:'<b class="tnum">' + m + '</b> of ' + tot + ' mastered'}))));
  w.appendChild(hero);
  var recBrowse = !S.browsed(mod.id), recPractice = !recBrowse;
  function mode(title, sub, rec, fn){
    var b = h('button', {class:'mode press', type:'button'}, rec ? h('i', {class:'rec', 'aria-hidden':'true'}) : null, h('span', {class:'arrow', html:M.icon('arrow')}), h('b', {text:title}), h('span', {text:sub}));
    if (rec) b.setAttribute('aria-description', 'Recommended next step');
    b.addEventListener('click', fn); return b;
  }
  var last = S.lastCard(mod.id), U = mod.unit || 'word', Us = mod.units || 'words';
  w.appendChild(h('div', {class:'modes'},
    mode('Anschauen', last && last < tot ? 'Continue at ' + U + ' ' + (last + 1) : 'Browse all ' + tot + ' ' + Us, recBrowse, function(){ M.go('/m/' + mod.id + '/anschauen/' + ((last && last < tot) ? last + 1 : 1)); }),
    mode('Üben', 'Practice in order or mixed', recPractice, function(){ M.go('/m/' + mod.id + '/ueben'); })));
  // word list
  var det = h('details', {class:'words'});
  // Mini-Anamnese (plan §3: teaching extra) — the dialogue chains step by step
  if (mod.chains && mod.chains.length && S.teach()) {
    var dl = h('section', {class:'minia'}, h('h2', {text:'Mini-Anamnese'}), h('p', {text:'A short history, step by step. Ask in German, then reveal.'}));
    var row = h('div', {class:'minia-row'});
    mod.chains.forEach(function(c, k){
      var b = h('button', {class:'mode small press', type:'button'}, h('span', {class:'arrow', html:M.icon('arrow')}), h('b', {text:c.en}), h('span', {text:c.steps.length + ' questions'}));
      b.addEventListener('click', function(){ M.go('/m/' + mod.id + '/dialog/' + (k + 1) + '/1'); });
      row.appendChild(b);
    });
    dl.appendChild(row); w.appendChild(dl);
  }
  det.appendChild(h('summary', {html:'<span>All ' + tot + ' ' + (mod.units || 'words') + '</span>' + M.icon('down')}));
  var wl = h('div', {class:'wl'});
  mod.items.forEach(function(it, i){
    var a = h('a', {href:'#/m/' + mod.id + '/anschauen/' + (i + 1)},
      h('span', {class:'i tnum', text:String(i + 1)}), h('span', {class:'e', text:it.en}),
      h('span', {class:'de', html:M.deHTML(it) + (S.mastered(it) ? '<i class="m" aria-label="mastered"></i>' : '')}));
    a.addEventListener('click', function(e){ e.preventDefault(); M.go('/m/' + mod.id + '/anschauen/' + (i + 1)); });
    wl.appendChild(a);
  });
  det.appendChild(wl); w.appendChild(det);
  el.appendChild(w);
  M.preloadModule && M.preloadModule(mod);
  return {el:el, title:mod.de, cleanup:function(){ cover.destroy(); }};
}

/* ---------------- Anschauen (browse) ---------------- */
function viewBrowse(mod, n){
  var tot = mod.items.length;
  n = Math.max(1, Math.min(tot + 1, n));
  var el = h('div', {class:'view browse'}), plates = [];
  var right = [];
  if (S.teach()) { var rnd = h('button', {class:'icon-btn press', type:'button', 'aria-label':'Random card', html:M.icon('shuffle')}); rnd.addEventListener('click', function(){ var k; do { k = 1 + M.randInt(tot); } while (k === n && tot > 1); show(k, 0); }); right.push(rnd); }
  var b = bar({back:function(){ M.back('/m/' + mod.id); }, backIcon:'close', backLabel:'Close', title:mod.de, right:right, progress:0});
  el.appendChild(b);
  var sw = h('main', {class:'stage-wrap wide'}); el.appendChild(sw);
  var body = h('div', {style:{display:'contents'}}); sw.appendChild(body);
  var nav = h('div', {class:'browse-nav'});
  var prev = h('button', {class:'nav-btn press', type:'button', 'aria-label':'Previous ' + (mod.unit || 'word'), html:M.icon('prev')});
  var next = h('button', {class:'nav-btn press', type:'button', 'aria-label':'Next ' + (mod.unit || 'word'), html:M.icon('next')});
  nav.appendChild(prev); nav.appendChild(next); sw.appendChild(nav);
  prev.addEventListener('click', function(){ show(n - 1, -1); });
  next.addEventListener('click', function(){ show(n + 1, 1); });
  var revealFn = null, busy = 0;
  function show(k, dir){
    if (k < 1 || k > tot + 1) return;
    n = k; history.replaceState({d:depth}, '', '#/m/' + mod.id + '/anschauen/' + n);
    plates.forEach(function(p){ p.destroy(); }); plates = [];
    body.innerHTML = ''; revealFn = null;
    b._hair.style.width = (Math.min(n, tot) / tot * 100) + '%';
    prev.disabled = n === 1; next.disabled = n > tot;
    nav.style.display = n > tot ? 'none' : '';
    if (n > tot) { endCard(); return; }
    var it = mod.items[n - 1];
    S.setLastCard(mod.id, n - 1);
    var st = h('div', {class:'stage'}), side = h('div', {class:'side'});
    var p = M.Plate(it.view); plates.push(p); st.appendChild(p.el);
    side.appendChild(h('h2', {class:'prompt-en', text:it.en}));
    if (it.hint) side.appendChild(h('div', {class:'prompt-hint', text:it.hint}));
    if (it.scale) side.appendChild(M.nrs());
    var zone = h('div', {class:'reveal-zone'}); side.appendChild(zone);
    function reveal(){
      if (revealFn === null) return; revealFn = null; zone.innerHTML = '';
      var blk = h('div', {class:'de-block'});
      blk.appendChild(h('p', {class:'de-big display', html:M.deHTML(it, 'mark')}));
      if (it.q) {
        blk.appendChild(h('div', {class:'pl-line qpat', text:M.qPattern(it)}));
        if (it.ans && it.ans.length) {
          var an = h('div', {class:'ex answers'}, h('div', {class:'who', text:'The patient might say'}));
          it.ans.forEach(function(a){ an.appendChild(h('div', {class:'a'}, h('div', {text:a.de}), h('div', {class:'en', text:a.en}))); });
          blk.appendChild(an);
        }
        if (it.inf) blk.appendChild(h('div', {class:'ex inf'}, h('div', {class:'en', text:'Infinitive'}), h('div', {text:it.inf})));
      } else {
      blk.appendChild(h('div', {class:'pl-line', html:it.pl ? M.deHTML(it, 'pl') : '<span style="color:var(--ink-3)">' + (it.plOnly ? 'plural only' : it.sgOnly ? 'no plural' : 'usually no plural') + '</span>'}));
      if (it.ex) blk.appendChild(h('div', {class:'ex'}, h('div', {text:it.ex.de}), h('div', {class:'en', text:it.ex.en})));
      }
      if (it.trap) blk.appendChild(h('div', {class:'trap', text:it.trap}));
      if (S.settings.latin && it.lat) blk.appendChild(h('div', {class:'lat', html:M.esc(mod.latLabel || 'Latin') + ' <i>' + M.esc(it.lat) + '</i>'}));
      zone.appendChild(blk);
    }
    revealFn = reveal;
    var rb = h('button', {class:'reveal-btn press', type:'button', text:'Show German'}); rb.addEventListener('click', reveal); zone.appendChild(rb);
    st.appendChild(side); body.appendChild(st);
    p.draw(1250);
    if (S.settings.alwaysDe) reveal();
    // preload neighbours
    [n, n + 1].forEach(function(j){ var o = mod.items[j]; if (o) { M.loadImg(M.asset(o.view.img, 'webp')); M.loadImg(M.asset(o.view.img, 'line')); M.loadImg(M.asset(o.view.img, 'field')); } });
  }
  function endCard(){
    var c = h('div', {class:'end-card'}, h('h2', {class:'display', text:'That’s all ' + tot + ' ' + (mod.units || 'words') + '.'}), h('p', {text:'Ready to practice them?'}));
    var go = h('button', {class:'btn primary press', type:'button', text:'Practice now'}); go.addEventListener('click', function(){ M.go('/m/' + mod.id + '/ueben', true); });
    var again = h('button', {class:'btn press', type:'button', text:'Start again'}); again.addEventListener('click', function(){ show(1, 0); });
    var back = h('button', {class:'btn press', type:'button', text:'Back to the module'}); back.addEventListener('click', function(){ M.back('/m/' + mod.id); });
    c.appendChild(h('div', {class:'row'}, go, again, back)); body.appendChild(c);
    S.setLastCard(mod.id, tot);
  }
  // keys + swipe
  document.onkeydown = function(e){
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); if (S.teach() && revealFn) revealFn(); else show(n + 1, 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(n - 1, -1); }
    else if (e.key === ' ' || e.key === 'Enter') { if (e.target && e.target.tagName === 'BUTTON' && e.key === 'Enter') return; e.preventDefault(); if (revealFn) revealFn(); else show(n + 1, 1); }
    else if (e.key === 'Escape') M.back('/m/' + mod.id);
  };
  var sx = null, sy = 0;
  sw.addEventListener('pointerdown', function(e){ if (e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; });
  sw.addEventListener('pointerup', function(e){ if (sx == null) return; var dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(n + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
  M.preloadModule && M.preloadModule(mod);
  setTimeout(function(){ show(n, 0); }, 0);
  return {el:el, title:mod.de, cleanup:function(){ plates.forEach(function(p){ p.destroy(); }); }};
}

/* ---------------- Mini-Anamnese (dialogue chain, step by step; nothing is scored) ---------------- */
function viewDialog(mod, k, n){
  var ch = mod.chains[k], tot = ch.steps.length, plates = [];
  n = Math.max(1, Math.min(tot + 1, n));
  var el = h('div', {class:'view browse'});
  var b = bar({back:function(){ M.back('/m/' + mod.id); }, backIcon:'close', backLabel:'Close', title:'Mini-Anamnese', progress:0});
  el.appendChild(b);
  var sw = h('main', {class:'stage-wrap wide'}); el.appendChild(sw);
  var body = h('div', {style:{display:'contents'}}); sw.appendChild(body);
  var nav = h('div', {class:'browse-nav'});
  var prev = h('button', {class:'nav-btn press', type:'button', 'aria-label':'Previous step', html:M.icon('prev')});
  var next = h('button', {class:'nav-btn press', type:'button', 'aria-label':'Next step', html:M.icon('next')});
  nav.appendChild(prev); nav.appendChild(next); sw.appendChild(nav);
  prev.addEventListener('click', function(){ show(n - 1); });
  next.addEventListener('click', function(){ show(n + 1); });
  var stepFn = null;
  function show(j){
    if (j < 1 || j > tot + 1) return;
    n = j; history.replaceState({d:depth}, '', '#/m/' + mod.id + '/dialog/' + (k + 1) + '/' + n);
    plates.forEach(function(p){ p.destroy(); }); plates = []; body.innerHTML = ''; stepFn = null;
    b._hair.style.width = (Math.min(n, tot) / tot * 100) + '%';
    prev.disabled = n === 1; nav.style.display = n > tot ? 'none' : '';
    if (n > tot) {
      var c = h('div', {class:'end-card'}, h('h2', {class:'display', text:'History complete.'}), h('p', {text:tot + ' questions, one conversation.'}));
      var again = h('button', {class:'btn primary press', type:'button', text:'Start again'}); again.addEventListener('click', function(){ show(1); });
      var back = h('button', {class:'btn press', type:'button', text:'Back to the module'}); back.addEventListener('click', function(){ M.back('/m/' + mod.id); });
      c.appendChild(h('div', {class:'row'}, again, back)); body.appendChild(c); return;
    }
    var s = ch.steps[n - 1], it = mod.itemById[s.q];
    var st = h('div', {class:'stage'}), side = h('div', {class:'side'});
    var p = M.Plate(it.view); plates.push(p); st.appendChild(p.el);
    side.appendChild(h('p', {class:'instr', text:ch.en + ' · Step ' + n + ' of ' + tot + ' · Ask the patient:'}));
    side.appendChild(h('h2', {class:'prompt-en', text:it.en}));
    if (it.scale) side.appendChild(M.nrs());
    var zone = h('div', {class:'reveal-zone'}); side.appendChild(zone);
    var stage = 0;
    var rb = h('button', {class:'reveal-btn press', type:'button', text:'Show German'});
    function step(){
      if (stage === 0) {
        stage = 1; rb.remove();
        zone.appendChild(h('div', {class:'de-block'}, h('p', {class:'de-big display', html:M.deHTML(it, 'mark')})));
        var pb = h('button', {class:'reveal-btn press', type:'button', text:'Patient’s answer'}); pb.addEventListener('click', step); zone.appendChild(pb); rb = pb;
      } else if (stage === 1) {
        stage = 2; rb.remove();
        zone.appendChild(h('div', {class:'de-block'}, h('div', {class:'dlg'}, h('div', {class:'dl pat'}, h('span', {class:'who', text:'Patient'}), h('span', {class:'dt', text:s.de}), h('span', {class:'den', text:s.en})))));
      } else show(n + 1);
    }
    rb.addEventListener('click', step); zone.appendChild(rb);
    stepFn = step;
    st.appendChild(side); body.appendChild(st);
    p.draw(900);
  }
  document.onkeydown = function(e){
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || (e.key === 'Enter' && !(e.target && e.target.tagName === 'BUTTON'))) { e.preventDefault(); if (stepFn) stepFn(); else show(n + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(n - 1); }
    else if (e.key === 'Escape') M.back('/m/' + mod.id);
  };
  M.preloadModule && M.preloadModule(mod);
  setTimeout(function(){ show(n); }, 0);
  return {el:el, title:'Mini-Anamnese · ' + ch.en, cleanup:function(){ plates.forEach(function(p){ p.destroy(); }); }};
}

/* ---------------- Üben setup ---------------- */
var lastSetup = {};
function viewSetup(mod){
  var el = h('div', {class:'view'});
  el.appendChild(bar({back:function(){ M.back('/m/' + mod.id); }, backIcon:'close', backLabel:'Close'}));
  var pg = h('main', {class:'sheet-page'}); el.appendChild(pg);
  var tot = mod.items.length;
  var prev = lastSetup[mod.id] || {order:S.practiced(mod.id) ? 'mix' : 'seq', size:10, mode:'rec'};
  var cfg = Object.assign({}, prev);
  pg.appendChild(h('h1', {class:'display', text:'Üben'}));
  pg.appendChild(h('p', {class:'sub', text:mod.de + ' · ' + mod.en}));
  var f1 = h('div', {class:'field'}, h('div', {class:'lab', text:'Order'}));
  f1.appendChild(M.segmented([{v:'seq', t:'In order'}, {v:'mix', t:'Mixed'}], cfg.order, function(v){ cfg.order = v; }, 'Order').el);
  var f2 = h('div', {class:'field'}, h('div', {class:'lab', text:'Length'}));
  f2.appendChild(M.segmented([{v:10, t:'10'}, {v:20, t:'20'}, {v:0, t:'All ' + tot}], cfg.size, function(v){ cfg.size = v; }, 'Length').el);
  var f3 = h('div', {class:'field'}, h('div', {class:'lab', text:'Exercise'}));
  var list = h('div', {class:'typelist', role:'radiogroup', 'aria-label':'Exercise'});
  var opts = [{id:'rec', label:'Recommended', desc:'Adapts to what you know'}].concat(mod.types.filter(function(t){ return M.types[t] && mod.items.some(function(it){ return M.types[t].applies(it, mod); }); }).map(function(t){ return {id:t, label:(mod.typeLabel && mod.typeLabel[t]) || M.types[t].label, desc:(mod.typeDesc && mod.typeDesc[t]) || M.types[t].desc}; }));
  var btns = opts.map(function(o){
    var b = h('button', {class:'press', type:'button', role:'radio', 'aria-pressed':String(cfg.mode === o.id), 'aria-checked':String(cfg.mode === o.id)}, document.createTextNode(o.label), h('span', {text:o.desc}));
    b.addEventListener('click', function(){ cfg.mode = o.id; btns.forEach(function(x, i){ var on = opts[i].id === o.id; x.setAttribute('aria-pressed', String(on)); x.setAttribute('aria-checked', String(on)); }); });
    list.appendChild(b); return b;
  });
  f3.appendChild(list);
  pg.appendChild(f1); pg.appendChild(f2); pg.appendChild(f3);
  var start = h('button', {class:'btn primary block press', type:'button', text:'Start'});
  var started = false;
  start.addEventListener('click', function(){
    if (started) return; started = true;
    lastSetup[mod.id] = cfg;
    M.currentSession = new M.Session({mods:[mod], order:cfg.order, size:cfg.size, mode:cfg.mode});
    M.go('/m/' + mod.id + '/ueben/session', true);
  });
  pg.appendChild(start);
  return {el:el, title:'Üben · ' + mod.de};
}

/* ---------------- Session ---------------- */
function viewReview(){
  var due = S.dueList();
  if (!due.length) return null;
  M.currentSession = new M.Session({mods:M.modules.filter(function(m){ return m.status === 'ready'; }), review:true});
  return viewSession(null);
}
function viewSession(mod){
  var ses = M.currentSession;
  if (!ses || ses.done || (mod && ses.mods[0] !== mod) || (!mod && !ses.opts.review)) { setTimeout(function(){ M.go(mod ? '/m/' + mod.id + '/ueben' : '/', true); }, 0); return {el:h('div', {class:'view'}), vt:false}; }
  var el = h('div', {class:'view session'}), plates = [];
  var b = bar({back:function(){ M.back(mod ? '/m/' + mod.id : '/'); }, backIcon:'close', backLabel:'End practice', title:mod ? mod.de : 'Review', progress:ses.progress()});
  el.appendChild(b);
  var host = h('main', {class:'stage-wrap wide'}); el.appendChild(host);
  var advT = 0, seenItems = {}, coarse = matchMedia('(pointer: coarse)').matches;
  var ctx = null;
  function cleanupCard(){ clearTimeout(advT); plates.forEach(function(p){ p.destroy(); }); plates = []; }
  function card(){
    cleanupCard();
    var e = ses.current();
    if (!e) return finish();
    host.innerHTML = ''; host.className = 'stage-wrap wide';
    b._hair.style.width = (ses.progress() * 100) + '%';
    var first = !seenItems[e.item.id]; seenItems[e.item.id] = 1;
    var answered = false;
    ctx = {item:e.item, mod:e.mod, card:e, host:host, plates:plates, drawMs:first ? 1250 : 600, coarse:coarse,
      done:function(res){
        if (answered) return; answered = true;
        var good = ses.answer(e, res);
        b._hair.style.width = ((ses.i + 1) / ses.q.length * 100) + '%';
        if (res.silent) { advance(); return; }
        if (good && !S.teach()) { advT = setTimeout(advance, 700); return; }
        var side = host.querySelector('.answer') || host.querySelector('.side') || host;
        var c = h('button', {class:'btn primary press cont', type:'button', html:'Continue ' + M.icon('arrow')});
        var used = false;
        c.addEventListener('click', function(){ if (used) return; used = true; advance(); });
        side.appendChild(c);
        setTimeout(function(){ c.focus({preventScroll:true}); if (c.scrollIntoView && c.getBoundingClientRect().bottom > innerHeight) c.scrollIntoView({block:'nearest', behavior:M.reducedMotion() ? 'auto' : 'smooth'}); }, 30);
      }};
    M.types[e.type].render(ctx);
  }
  var advancing = false;
  function advance(){
    if (advancing) return; advancing = true; clearTimeout(advT);
    setTimeout(function(){ advancing = false; }, 50);
    if (ses.next()) card(); else finish();
  }
  function finish(){
    cleanupCard();
    if (mod) S.setPracticed(mod.id);
    M.lastSummary = ses.summary();
    M.currentSession = null;
    M.go(mod ? '/m/' + mod.id + '/ueben/ergebnis' : '/review/ergebnis', true);
  }
  document.onkeydown = function(ev){
    if (ev.key === 'Escape') { M.back(mod ? '/m/' + mod.id : '/'); return; }
    var c = host.querySelector('.cont');
    if (c && ev.key === 'Enter' && document.activeElement !== c) { ev.preventDefault(); c.click(); return; }
    if (S.teach() && ctx && ctx.onReveal && (ev.key === ' ' || ev.key === 'ArrowRight') && !(ev.target && /INPUT/.test(ev.target.tagName))) { ev.preventDefault(); ctx.onReveal(); }
  };
  setTimeout(card, 0);
  return {el:el, title:mod ? 'Üben · ' + mod.de : 'Review', cleanup:function(){ cleanupCard(); }};
}

/* ---------------- Summary ---------------- */
function viewSummary(mod){
  var r = M.lastSummary;
  if (!r) { setTimeout(function(){ M.go(mod ? '/m/' + mod.id : '/', true); }, 0); return {el:h('div', {class:'view'}), vt:false}; }
  var el = h('div', {class:'view'});
  el.appendChild(bar({back:function(){ M.back(mod ? '/m/' + mod.id : '/'); }, backIcon:'close', backLabel:'Close'}));
  var s = h('main', {class:'sum'}); el.appendChild(s);
  s.appendChild(h('p', {class:'big display tnum', html:r.first + '<small> / ' + r.total + '</small>'}));
  s.appendChild(h('p', {class:'cap', text:'right on the first try'}));
  if (r.wrong.length) {
    s.appendChild(h('h2', {text:'Worth another look'}));
    var ul = h('ul');
    r.wrong.forEach(function(it){ ul.appendChild(h('li', {}, h('span', {html:M.deHTML(it)}), h('span', {class:'e', text:it.en}))); });
    s.appendChild(ul);
  }
  if (r.next) s.appendChild(h('p', {class:'nextrev', text:'Next review: ' + fmtDue(r.next) + '.'}));
  var row = h('div', {class:'row'});
  if (mod) {
    var again = h('button', {class:'btn primary press', type:'button', text:'Another round'});
    var used = false;
    again.addEventListener('click', function(){ if (used) return; used = true; var o = r.opts; M.currentSession = new M.Session({mods:[mod], order:o.order, size:o.size, mode:o.mode}); M.lastSummary = null; M.go('/m/' + mod.id + '/ueben/session', true); });
    row.appendChild(again);
  }
  var back = h('button', {class:'btn press', type:'button', text:mod ? 'Back to the module' : 'Done'});
  back.addEventListener('click', function(){ M.back(mod ? '/m/' + mod.id : '/'); });
  row.appendChild(back); s.appendChild(row);
  return {el:el, title:'Result'};
}

/* ---------------- Settings ---------------- */
function viewSettings(){
  var el = h('div', {class:'view'});
  el.appendChild(bar({back:function(){ M.back('/'); }, gear:false, title:'Settings'}));
  var pg = h('main', {class:'sheet-page'}); el.appendChild(pg);
  pg.appendChild(h('h1', {class:'display', text:'Settings'}));
  function row(t, d, ctl){ return h('div', {class:'set-row'}, h('div', {}, h('div', {class:'t', text:t}), d ? h('div', {class:'d', text:d}) : null), ctl); }
  var st = S.settings;
  // Teaching
  var g1 = h('section', {class:'set-group'}, h('h2', {text:'Lesson'}));
  g1.appendChild(row('Teaching mode', 'Larger type, no auto-advance. Progress during the lesson is not saved.', sw(S.teach(), function(v){ S.setSetting('teach', v); setTimeout(function(){ render(['settings']); }, 220); }, 'Teaching mode')));
  if (S.teach()) {
    var mk = M.lessonMistakes || [];
    var box = h('div', {class:'mistakes'});
    box.appendChild(h('div', {class:'set-row', style:{borderBottom:'0'}}, h('div', {class:'t', text:'Mistakes this lesson'}), h('span', {class:'tnum', style:{color:'var(--ink-3)'}, text:String(mk.length)})));
    if (mk.length) { var ul = h('ul'); mk.forEach(function(x){ ul.appendChild(h('li', {}, h('span', {html:M.deHTML(x.item)}), h('span', {class:'e', text:x.item.en}))); }); box.appendChild(ul); }
    g1.appendChild(box);
  }
  pg.appendChild(g1);
  // Appearance
  var g2 = h('section', {class:'set-group'}, h('h2', {text:'Appearance'}));
  var themeSeg = M.segmented([{v:'system', t:'Auto'}, {v:'light', t:'Light'}, {v:'dark', t:'Dark'}], st.theme, function(v){ S.setSetting('theme', v); }, 'Appearance');
  g2.appendChild(row('Theme', null, themeSeg.el));
  g2.appendChild(row('Article colors', 'A small dot: der blue, das green, die red, plural amber.', sw(st.dots, function(v){ S.setSetting('dots', v); }, 'Article colors')));
  g2.appendChild(row('Show German right away', 'In Anschauen, skip the reveal step.', sw(st.alwaysDe, function(v){ S.setSetting('alwaysDe', v); }, 'Show German right away')));
  g2.appendChild(row('Latin & medical terms', 'Shown under the German word in Anschauen.', sw(st.latin, function(v){ S.setSetting('latin', v); }, 'Latin and medical terms')));
  pg.appendChild(g2);
  // Progress
  var g3 = h('section', {class:'set-group'}, h('h2', {text:'Progress'}));
  g3.appendChild(h('div', {class:'d', style:{color:'var(--ink-3)', fontSize:'var(--fs-call)', margin:'12px 0 0'}, text:S.storageOk() ? 'Saved on this device only.' : 'This browser blocks storage. Progress lasts until you close the tab.'}));
  var ex = h('button', {class:'btn press', type:'button', text:'Export'}), im = h('button', {class:'btn press', type:'button', text:'Import'}), rs = h('button', {class:'btn danger press', type:'button', text:'Reset'});
  var file = h('input', {type:'file', accept:'application/json,.json', style:{display:'none'}});
  ex.addEventListener('click', function(){
    var blob = new Blob([S.exportJSON()], {type:'application/json'}), a = h('a', {href:URL.createObjectURL(blob), download:'medical-german-progress-' + new Date().toISOString().slice(0, 10) + '.json'});
    document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
    M.toast('Progress exported');
  });
  im.addEventListener('click', function(){ file.click(); });
  file.addEventListener('change', function(){
    var f = file.files[0]; if (!f) return;
    f.text().then(function(t){ try { S.importJSON(t); M.toast('Progress imported'); render(['settings']); } catch(err){ M.toast(err.message && /progress file/.test(err.message) ? err.message : 'That file could not be read.'); } file.value = ''; });
  });
  var conf = null;
  rs.addEventListener('click', function(){
    if (conf) return;
    conf = h('div', {class:'confirm'}, h('p', {text:'Delete all progress on this device? Settings stay.'}));
    var yes = h('button', {class:'btn danger press', type:'button', text:'Delete progress'}), no = h('button', {class:'btn press', type:'button', text:'Cancel'});
    yes.addEventListener('click', function(){ S.reset(); M.lessonMistakes = []; M.toast('Progress reset'); conf.remove(); conf = null; });
    no.addEventListener('click', function(){ conf.remove(); conf = null; });
    conf.appendChild(h('div', {class:'btnrow', style:{marginTop:0}}, yes, no)); g3.appendChild(conf);
  });
  g3.appendChild(h('div', {class:'btnrow'}, ex, im, rs, file));
  pg.appendChild(g3);
  pg.appendChild(h('p', {style:{color:'var(--ink-3)', fontSize:'var(--fs-cap)', marginTop:'56px'}, text:'Medical German A1 · version ' + M.version}));
  return {el:el, title:'Settings'};
}

/* ---------------- boot ---------------- */
function boot(){
  root = document.getElementById('app');
  M.applySettings();
  history.replaceState({d:0}, '', location.hash || '#/');
  route();
  // service worker (folder build, served over http(s) only)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.MEDA1_ASSETS) {
    navigator.serviceWorker.register('sw.js').then(function(reg){
      reg.addEventListener('updatefound', function(){
        var nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', function(){
          if (nw.state === 'installed' && navigator.serviceWorker.controller) M.toast('A new version is ready.', {t:'Reload', fn:function(){ nw.postMessage('skipWaiting'); }});
        });
      });
    }).catch(function(){});
    var reloaded = false, hadController = !!navigator.serviceWorker.controller;
    // first install claims the page silently; only an update (user tapped Reload) reloads
    navigator.serviceWorker.addEventListener('controllerchange', function(){ if (reloaded || !hadController) return; reloaded = true; location.reload(); });
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
