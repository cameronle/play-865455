'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

class Target {
  constructor() {this.listeners = new Map();}
  addEventListener(type, fn) {const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list);}
  removeEventListener(type, fn) {this.listeners.set(type, (this.listeners.get(type) || []).filter(f => f !== fn));}
  emit(type, props = {}) {
    const e = {type, target: this, currentTarget: this, defaultPrevented: false, preventDefault() {this.defaultPrevented = true;}, ...props};
    for (const fn of this.listeners.get(type) || []) fn(e);
    return e;
  }
}
class Element extends Target {
  constructor(tagName = 'div', id = '') {
    super(); this.tagName = tagName.toUpperCase(); this.id = id; this.hidden = false; this.disabled = false;
    this.dataset = {}; this.style = {}; this.children = []; this.textContent = ''; this.value = ''; this.attributes = {};
    this.className = ''; this.rect = {left: 0, top: 0, width: 400, height: 400};
    this.classList = {add: () => {}, remove: () => {}, toggle: () => {}};
  }
  getBoundingClientRect() {return this.rect;}
  setAttribute(k, v) {this.attributes[k] = String(v);}
  append(...nodes) {for (const node of nodes) {node.parentElement = this; this.children.push(node);}}
  appendChild(node) {this.append(node); return node;}
  replaceChildren(...nodes) {this.children = []; this.append(...nodes);}
  closest(selector) {
    let el = this;
    while (el) {
      if (selector === '[data-upgrade]' && el.dataset.upgrade) return el;
      if (selector === '[hidden]' && el.hidden) return el;
      el = el.parentElement;
    }
    return null;
  }
  setPointerCapture() {}
  releasePointerCapture() {}
  click() {this.emit('click');}
  getContext() {
    if (!this.context) {this.calls = []; this.context = new Proxy({}, {get: (t, p) => p in t ? t[p] : (...args) => this.calls.push({op:p,args}), set: (t, p, v) => (t[p] = v, true)});}
    return this.context;
  }
}
function environment(files = [], initialStored = {}) {
  const html = fs.readFileSync('bubble-tanks/index.html', 'utf8');
  const elements = new Map();
  for (const m of html.matchAll(/<([\w-]+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const el = new Element(m[1], m[2]); el.hidden = /\bhidden\b/.test(m[0]); elements.set(el.id, el);
  }
  const labels = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => {const el = new Element(); el.dataset.i18n = m[1]; return el;});
  const document = new Target(); document.documentElement = new Element('html'); document.hidden = false;
  document.querySelector = selector => selector.startsWith('#') ? elements.get(selector.slice(1)) : null;
  document.querySelectorAll = selector => selector === '[data-i18n]' ? labels : [];
  document.createElement = tag => new Element(tag);
  const window = new Target(), queue = [], stored = new Map(Object.entries(initialStored)); let time = 0;
  Object.assign(window, {document});
  const context = vm.createContext({window, document, console, Math, Date, JSON, URLSearchParams, setTimeout, clearTimeout,
    performance: {now: () => time}, localStorage: {getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v)},
    getComputedStyle: () => ({getPropertyValue: name => ({'--field':'#155b83','--field-deep':'#10486d','--player':'#c5f4ff','--hostile':'#ffc5a3','--drop':'#b7efd8'})[name] || ''}),
    requestAnimationFrame: fn => {queue.push(fn); return queue.length;}, cancelAnimationFrame: () => {},
    location: {search: ''}, navigator: {maxTouchPoints: 0}});
  context.globalThis = window;
  for (const file of ['content.js', 'rules.js', 'bosses.js', 'world.js', 'adventure.js', 'weapons.js', 'skills.js', 'enemies.js', 'modifiers.js', 'combat.js', 'storage.js', 'visuals.js', 'detail-ui.js', ...files]) {
    const path = 'bubble-tanks/' + file;
    assert.ok(fs.existsSync(path), `runtime module ${file} must exist`);
    vm.runInContext(fs.readFileSync(path, 'utf8'), context, {filename: path});
  }
  function frames(n = 1) {
    for (let i = 0; i < n; i++) {time += 1000 / 60; const callbacks = queue.splice(0); for (const cb of callbacks) cb(time);}
  }
  return {B: window.BubbleFrontier, window, document, elements, frames, stored, labels};
}
module.exports = {environment, Element};
