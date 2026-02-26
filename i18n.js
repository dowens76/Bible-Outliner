// i18n.js — Runtime language loader for Bible Outliner
//
// Usage:
//   await i18n.load('es');        // fetch + cache _locales/es/messages.json
//   i18n.t('addHeading')          // → "Añadir encabezado"
//   i18n.t('errorSaving', msg)    // → "Error al guardar el encabezado: …"
//   i18n.localizeDOM()            // apply data-i18n* attrs to static HTML
//   i18n.localizeBookSelects()    // translate <option> book names
//
// Loaded in order: db.js → i18n.js → backup.js → drive.js → sidepanel.js

'use strict';

const i18n = (() => {
  const SUPPORTED = ['en', 'es', 'fr', 'de', 'vi'];
  let strings = {};

  /**
   * Load the messages.json for the given language code.
   * Always loads English first as a baseline; the target language is then
   * merged on top so any missing keys gracefully fall back to English.
   * @param {string} lang  e.g. 'es', 'fr'
   */
  async function load(lang) {
    const target = SUPPORTED.includes(lang) ? lang : 'en';

    // English baseline
    const enUrl  = chrome.runtime.getURL('_locales/en/messages.json');
    const enData = await (await fetch(enUrl)).json();

    if (target === 'en') {
      strings = enData;
    } else {
      const url  = chrome.runtime.getURL(`_locales/${target}/messages.json`);
      const data = await (await fetch(url)).json();
      // Target language overrides English; English fills any missing keys
      strings = { ...enData, ...data };
    }
  }

  /**
   * Retrieve a translated string by key.
   * Supports Chrome-style positional placeholders: $1, $2, …
   * Returns the key itself if the key is not found (safe fallback).
   * @param {string} key
   * @param {...string} subs  Positional substitutions for $1, $2, …
   * @returns {string}
   */
  function t(key, ...subs) {
    const entry = strings[key];
    if (!entry) return key;
    let msg = entry.message || '';
    subs.forEach((s, i) => {
      msg = msg.replace(new RegExp(`\\$${i + 1}`, 'g'), String(s));
    });
    return msg;
  }

  /**
   * Walk the DOM and apply translations to elements that carry data-i18n*
   * attributes.  Called once after load() resolves.
   *
   *   data-i18n="key"             → el.textContent = t(key)
   *   data-i18n-title="key"       → el.title = t(key)
   *   data-i18n-placeholder="key" → el.placeholder = t(key)
   *   data-i18n-label="key"       → el.label = t(key)   (for <optgroup>)
   *   data-i18n-aria="key"        → el.setAttribute('aria-label', t(key))
   */
  function localizeDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const msg = t(el.getAttribute('data-i18n'));
      if (msg) el.textContent = msg;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
      el.label = t(el.getAttribute('data-i18n-label'));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  /**
   * Translate the optgroup labels ("Old Testament" / "New Testament") and
   * all <option value="OSIS"> book names in every <select> on the page.
   * Called once after load() resolves.
   */
  function localizeBookSelects() {
    // Optgroup labels
    document.querySelectorAll('optgroup[data-i18n-label]').forEach(g => {
      g.label = t(g.getAttribute('data-i18n-label'));
    });
    // Book option text (keyed as book_Gen, book_Exod, …)
    document.querySelectorAll('select option[value]').forEach(opt => {
      if (!opt.value) return;
      const key = `book_${opt.value}`;
      const msg = t(key);
      if (msg && msg !== key) opt.textContent = msg;
    });
  }

  return { load, t, localizeDOM, localizeBookSelects };
})();
