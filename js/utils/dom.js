/** querySelector shorthand */
export const qs = (selector, root = document) => root.querySelector(selector);

/** querySelectorAll shorthand */
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Create an element with optional attributes and children.
 * @param {string} tag
 * @param {Object} [attrs]
 * @param {...(Node|string)} [children]
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') {
      node.className = v;
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset') {
      Object.assign(node.dataset, v);
    } else if (v === true) {
      node.setAttribute(k, '');
    } else if (v !== false && v != null) {
      node.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/**
 * Add an event listener, returns a cleanup function.
 */
export function on(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

/**
 * Event delegation — listen for events on a root that match a selector.
 */
export function delegate(root, event, selector, handler) {
  const listener = (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) {
      handler(e, target);
    }
  };
  root.addEventListener(event, listener);
  return () => root.removeEventListener(event, listener);
}

/**
 * Set innerHTML safely from a trusted string.
 */
export function setHTML(node, html) {
  node.innerHTML = html;
  return node;
}

/**
 * Show/hide element(s).
 */
export function show(node) { node.removeAttribute('hidden'); }
export function hide(node) { node.setAttribute('hidden', ''); }

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format a number as USD with no cents. Returns null if n is null/undefined. */
export function formatUSD(n) {
  if (n == null) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Roll up estimated/actual costs from a tide's waves and their ripples.
 * Returns { est: number|null, act: number|null }.
 */
export function tideCosts(tide) {
  let est = null, act = null;
  for (const w of tide.waves) {
    if (w.estimatedCost != null) {
      est = (est ?? 0) + w.estimatedCost;
    } else {
      const rEst = w.ripples.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
      if (w.ripples.some(r => r.estimatedCost != null)) est = (est ?? 0) + rEst;
    }
    if (w.actualCost != null) {
      act = (act ?? 0) + w.actualCost;
    } else {
      const rAct = w.ripples.reduce((s, r) => s + (r.actualCost ?? 0), 0);
      if (w.ripples.some(r => r.actualCost != null)) act = (act ?? 0) + rAct;
    }
  }
  return { est, act };
}
