// ==UserScript==
// @name         flowzz+ · Herkunft & Preise
// @namespace    https://github.com/CRZX1337/flowzz-plus
// @version      1.3.0
// @description  Herkunft, Apothekenpreise, Favoriten, Preisalarm und CSV-Export auf flowzz.com
// @author       CRZX1337
// @match        https://flowzz.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://github.com/CRZX1337/flowzz-plus/releases/latest/download/flowzz-plus.user.js
// @downloadURL  https://github.com/CRZX1337/flowzz-plus/releases/latest/download/flowzz-plus.user.js
// @supportURL   https://github.com/CRZX1337/flowzz-plus/issues
// ==/UserScript==

(function () {
  window.__FX_CSS = ":host {\n  all: initial;\n  --fx-green: #19796d;\n  --fx-green-dark: #12615a;\n  --fx-ink: #111512;\n  --fx-muted: #6d7772;\n  --fx-line: #e5eae6;\n  --fx-bg: #f7f8f6;\n  --fx-soft: #f1f4f1;\n  font-family: \"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;\n  -webkit-font-smoothing: antialiased;\n}\n\n* { box-sizing: border-box; }\n\n#fx-host {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483000;\n  pointer-events: none;\n}\n\n#fx-host.fx-visible { pointer-events: auto; }\n\nhtml.fx-lock, html.fx-lock body { overflow: hidden !important; }\n\n/* ---------- Launcher ---------- */\n\n.fx-launcher {\n  position: fixed;\n  right: 22px;\n  bottom: 22px;\n  display: inline-flex;\n  align-items: center;\n  gap: 9px;\n  padding: 9px 15px 9px 9px;\n  border: 0;\n  border-radius: 999px;\n  background: #111512;\n  color: #fff;\n  font: 600 13px/1 \"Inter\", -apple-system, \"Segoe UI\", sans-serif;\n  letter-spacing: 0.01em;\n  box-shadow: 0 10px 26px rgba(17, 21, 18, 0.24), 0 2px 6px rgba(17, 21, 18, 0.16);\n  cursor: pointer;\n  opacity: 0;\n  transform: translateY(14px);\n  pointer-events: none;\n  transition: opacity 0.22s ease, transform 0.22s ease, background 0.16s ease;\n}\n\n.fx-launcher.is-visible { opacity: 1; transform: none; pointer-events: auto; }\n.fx-launcher:hover { background: var(--fx-green); }\n\n.fx-launcher-logo {\n  display: grid;\n  place-items: center;\n  width: 26px;\n  height: 26px;\n  border-radius: 999px;\n  background: var(--fx-green);\n  color: #fff;\n  font: 700 12px/1 \"Geist Mono\", ui-monospace, SFMono-Regular, Menlo, monospace;\n}\n\n.fx-launcher:hover .fx-launcher-logo { background: #fff; color: var(--fx-green); }\n\n/* ---------- Overlay ---------- */\n\n.fx-app { pointer-events: auto; }\n\n.fx-app {\n  position: fixed;\n  inset: 0;\n  display: flex;\n  flex-direction: column;\n  background: var(--fx-bg);\n  color: var(--fx-ink);\n  opacity: 0;\n  visibility: hidden;\n  transform: translateY(8px);\n  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;\n  pointer-events: none;\n}\n\n.fx-app.is-open {\n  opacity: 1;\n  visibility: visible;\n  transform: none;\n  pointer-events: auto;\n}\n\n.fx-app a { color: inherit; text-decoration: none; }\n.fx-app button, .fx-app input, .fx-app select { font-family: inherit; }\n\n/* Kopf */\n\n.fx-top {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 20px;\n  height: 68px;\n  padding: 0 22px;\n  background: #fff;\n  border-bottom: 1px solid var(--fx-line);\n}\n\n.fx-brand { display: flex; align-items: center; gap: 10px; min-width: 168px; }\n\n.fx-logo {\n  display: grid;\n  place-items: center;\n  width: 34px;\n  height: 34px;\n  border-radius: 10px;\n  background: var(--fx-green);\n  color: #fff;\n  font: 700 14px/1 \"Geist Mono\", ui-monospace, monospace;\n}\n\n.fx-brandtext { display: flex; flex-direction: column; gap: 1px; }\n.fx-brandtext b { font-size: 14px; letter-spacing: -0.01em; }\n.fx-brandtext small { font-size: 10.5px; color: var(--fx-muted); letter-spacing: 0.02em; }\n\n.fx-search {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  gap: 9px;\n  height: 42px;\n  padding: 0 12px;\n  background: var(--fx-soft);\n  border: 1px solid transparent;\n  border-radius: 11px;\n  color: var(--fx-muted);\n  transition: border-color 0.15s ease, background 0.15s ease;\n}\n\n.fx-search:focus-within { background: #fff; border-color: var(--fx-green); }\n\n.fx-search input {\n  flex: 1;\n  min-width: 0;\n  border: 0;\n  outline: 0;\n  background: transparent;\n  color: var(--fx-ink);\n  font-size: 14px;\n}\n\n.fx-search input::placeholder { color: #98a29c; }\n.fx-search kbd, .fx-close kbd {\n  font: 500 10.5px/1 \"Geist Mono\", ui-monospace, monospace;\n  color: #8b958f;\n  background: #fff;\n  border: 1px solid var(--fx-line);\n  border-radius: 5px;\n  padding: 3px 5px;\n}\n\n.fx-close {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  height: 36px;\n  padding: 0 9px;\n  border: 1px solid var(--fx-line);\n  border-radius: 9px;\n  background: #fff;\n  color: var(--fx-ink);\n  font-size: 12.5px;\n  cursor: pointer;\n}\n\n.fx-close:hover { background: var(--fx-soft); }\n\n/* Body */\n\n.fx-body {\n  flex: 1;\n  display: grid;\n  grid-template-columns: 272px minmax(0, 1fr);\n  min-height: 0;\n}\n\n.fx-side {\n  overflow-y: auto;\n  padding: 18px 18px 28px;\n  background: #fff;\n  border-right: 1px solid var(--fx-line);\n}\n\n.fx-side-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }\n.fx-countbox { display: flex; align-items: baseline; gap: 6px; }\n.fx-countbox b { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }\n.fx-countbox span { font-size: 12px; color: var(--fx-muted); }\n\n.fx-reset {\n  border: 0;\n  background: none;\n  padding: 0;\n  color: var(--fx-green);\n  font-size: 11.5px;\n  font-weight: 600;\n  cursor: pointer;\n}\n\n.fx-reset:hover { text-decoration: underline; }\n\n.fx-section { border-top: 1px solid #eef1ee; }\n\n.fx-section-head {\n  width: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 14px 0;\n  border: 0;\n  background: none;\n  color: #3f4a44;\n  font-size: 11.5px;\n  font-weight: 650;\n  letter-spacing: 0.07em;\n  text-transform: uppercase;\n  cursor: pointer;\n}\n\n.fx-section-head i {\n  width: 7px;\n  height: 7px;\n  border-right: 1.5px solid #8b958f;\n  border-bottom: 1.5px solid #8b958f;\n  transform: rotate(45deg) translateY(-2px);\n  transition: transform 0.18s ease;\n}\n\n.fx-section.fx-collapsed .fx-section-head i { transform: rotate(-45deg); }\n.fx-section.fx-collapsed .fx-section-body,\n.fx-section.fx-collapsed .fx-mini-search { display: none; }\n\n.fx-section-body { padding-bottom: 14px; }\n\n.fx-mini-search {\n  width: 100%;\n  height: 30px;\n  margin-bottom: 8px;\n  padding: 0 9px;\n  border: 1px solid var(--fx-line);\n  border-radius: 8px;\n  font-size: 12.5px;\n  outline: 0;\n  background: #fff;\n}\n\n.fx-mini-search:focus { border-color: var(--fx-green); }\n\n.fx-checklist { max-height: 264px; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }\n.fx-checklist::-webkit-scrollbar { width: 6px; }\n.fx-checklist::-webkit-scrollbar-thumb { background: #d9dfda; border-radius: 99px; }\n\n.fx-check {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  padding: 5px 4px;\n  border-radius: 6px;\n  cursor: pointer;\n  font-size: 13px;\n}\n\n.fx-check:hover { background: var(--fx-soft); }\n.fx-check.is-zero { opacity: 0.45; }\n.fx-check input { width: 14px; height: 14px; margin: 0; accent-color: var(--fx-green); }\n.fx-flag { font-size: 14px; line-height: 1; }\n.fx-checkname { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.fx-checkcount { font-size: 11px; color: #98a29c; font-variant-numeric: tabular-nums; }\n\n.fx-producer {\n  width: 100%;\n  height: 34px;\n  padding: 0 8px;\n  border: 1px solid var(--fx-line);\n  border-radius: 8px;\n  background: #fff;\n  font-size: 12.5px;\n  color: var(--fx-ink);\n  outline: 0;\n}\n\n.fx-producer:focus { border-color: var(--fx-green); }\n\n.fx-rangevalue { margin-bottom: 8px; font-size: 12px; color: var(--fx-muted); }\n.fx-app input[type=\"range\"] { width: 100%; accent-color: var(--fx-green); }\n\n.fx-numberrow { display: flex; align-items: center; gap: 6px; }\n.fx-numberrow input {\n  width: 70px;\n  height: 32px;\n  padding: 0 8px;\n  border: 1px solid var(--fx-line);\n  border-radius: 8px;\n  font-size: 12.5px;\n  outline: 0;\n}\n.fx-numberrow input:focus { border-color: var(--fx-green); }\n.fx-dash { color: #98a29c; font-size: 12px; }\n\n.fx-seg {\n  display: grid;\n  grid-auto-flow: column;\n  grid-auto-columns: 1fr;\n  gap: 3px;\n  padding: 3px;\n  background: var(--fx-soft);\n  border-radius: 9px;\n}\n\n.fx-segbtn {\n  border: 0;\n  border-radius: 7px;\n  background: transparent;\n  padding: 7px 4px;\n  font-size: 11.5px;\n  font-weight: 550;\n  color: #5c665f;\n  cursor: pointer;\n  white-space: nowrap;\n}\n\n.fx-segbtn.is-active { background: #fff; color: var(--fx-ink); box-shadow: 0 1px 2px rgba(17, 21, 18, 0.1); }\n\n.fx-switch { display: flex; align-items: center; gap: 9px; cursor: pointer; font-size: 13px; }\n.fx-switch input { position: absolute; opacity: 0; pointer-events: none; }\n.fx-knob {\n  position: relative;\n  width: 34px;\n  height: 20px;\n  border-radius: 999px;\n  background: #d8ded9;\n  transition: background 0.16s ease;\n  flex: none;\n}\n.fx-knob::after {\n  content: \"\";\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 14px;\n  height: 14px;\n  border-radius: 50%;\n  background: #fff;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);\n  transition: transform 0.16s ease;\n}\n.fx-switch input:checked + .fx-knob { background: var(--fx-green); }\n.fx-switch input:checked + .fx-knob::after { transform: translateX(14px); }\n\n.fx-datanote { margin-top: 16px; padding-top: 12px; border-top: 1px solid #eef1ee; font-size: 10.5px; color: #a4ada7; line-height: 1.4; }\n\n/* Main */\n\n.fx-main { overflow-y: auto; padding: 18px 24px 70px; }\n\n.fx-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }\n.fx-resulttext { font-size: 12.5px; color: var(--fx-muted); }\n.fx-tools { display: flex; align-items: center; gap: 8px; }\n\n.fx-select { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--fx-muted); }\n.fx-select select {\n  height: 32px;\n  padding: 0 8px;\n  border: 1px solid var(--fx-line);\n  border-radius: 8px;\n  background: #fff;\n  color: var(--fx-ink);\n  font-size: 12.5px;\n  outline: 0;\n}\n\n.fx-iconbtn {\n  width: 32px;\n  height: 32px;\n  border: 1px solid var(--fx-line);\n  border-radius: 8px;\n  background: #fff;\n  color: var(--fx-ink);\n  font-size: 15px;\n  cursor: pointer;\n}\n.fx-iconbtn:hover { background: var(--fx-soft); }\n\n.fx-mobilefilter { display: none; }\n\n.fx-loading { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; font-size: 12px; color: var(--fx-muted); }\n.fx-progress { flex: 1; height: 3px; border-radius: 99px; background: #e6ebe7; overflow: hidden; }\n.fx-progress i { display: block; height: 100%; width: 8%; background: var(--fx-green); border-radius: 99px; transition: width 0.3s ease; }\n\n.fx-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(212px, 1fr));\n  gap: 16px;\n}\n\n.fx-grid.fx-grid-empty { display: none; }\n\n.fx-card {\n  display: flex;\n  flex-direction: column;\n  background: #fff;\n  border: 1px solid var(--fx-line);\n  border-radius: 14px;\n  overflow: hidden;\n  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;\n}\n\n.fx-card:hover {\n  transform: translateY(-2px);\n  border-color: #d5ded8;\n  box-shadow: 0 10px 24px rgba(17, 21, 18, 0.08);\n}\n\n.fx-thumb { position: relative; aspect-ratio: 1 / 1; background: var(--fx-soft); }\n.fx-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }\n\n.fx-orgbadge {\n  position: absolute;\n  top: 8px;\n  left: 8px;\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  max-width: calc(100% - 16px);\n  padding: 4px 8px;\n  background: rgba(255, 255, 255, 0.93);\n  -webkit-backdrop-filter: blur(6px);\n  backdrop-filter: blur(6px);\n  border: 1px solid rgba(17, 21, 18, 0.06);\n  border-radius: 999px;\n  font-size: 10.5px;\n  font-weight: 600;\n  color: #2c342f;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.fx-orgbadge .fx-flag { font-size: 12px; }\n\n.fx-soldout {\n  position: absolute;\n  left: 8px;\n  bottom: 8px;\n  padding: 3px 7px;\n  border-radius: 6px;\n  background: rgba(17, 21, 18, 0.72);\n  color: #fff;\n  font-size: 10px;\n  letter-spacing: 0.01em;\n}\n\n.fx-cardbody { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px 12px; }\n\n.fx-cardprod {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: #8b958f;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.fx-name {\n  font-size: 14px;\n  font-weight: 600;\n  line-height: 1.25;\n  letter-spacing: -0.005em;\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n  min-height: 35px;\n}\n\n.fx-meta { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--fx-muted); }\n.fx-dot { color: #c3cbc6; }\n\n.fx-tag {\n  align-self: flex-start;\n  margin-top: 2px;\n  padding: 2px 7px;\n  border-radius: 999px;\n  background: #edf5f2;\n  color: var(--fx-green-dark);\n  font-size: 10px;\n  font-weight: 600;\n}\n\n.fx-foot { display: flex; align-items: baseline; justify-content: space-between; margin-top: 6px; }\n.fx-price b { font-size: 15px; letter-spacing: -0.01em; }\n.fx-price small { font-size: 10.5px; color: var(--fx-muted); font-weight: 500; }\n.fx-rating { font-size: 11.5px; color: #8a6d1f; }\n\n.fx-empty {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 5px;\n  padding: 90px 20px;\n  color: var(--fx-muted);\n  font-size: 12.5px;\n}\n.fx-empty b { font-size: 16px; color: var(--fx-ink); }\n\n.fx-more { display: flex; justify-content: center; padding: 26px 0 0; }\n\n.fx-btn {\n  height: 38px;\n  padding: 0 18px;\n  border: 1px solid var(--fx-line);\n  border-radius: 10px;\n  background: #fff;\n  color: var(--fx-ink);\n  font-size: 13px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.fx-btn:hover { background: var(--fx-soft); }\n\n/* Detailseite */\n\n.fx-detail-line { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin: 10px 0 4px; }\n\n.fx-detail-badge {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  padding: 6px 12px;\n  border: 1px solid #cfe3dc;\n  border-radius: 999px;\n  background: #edf5f2;\n  color: var(--fx-green-dark);\n  font-size: 12.5px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.fx-detail-badge:hover { background: #e2f0ea; }\n\n.fx-detail-link {\n  border: 0;\n  background: none;\n  padding: 0;\n  color: var(--fx-green);\n  font-size: 12.5px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.fx-detail-link:hover { text-decoration: underline; }\n\n/* ---------- Responsive ---------- */\n\n@media (max-width: 980px) {\n  .fx-top { height: 60px; padding: 0 12px; gap: 10px; }\n  .fx-brand { min-width: 0; }\n  .fx-brandtext { display: none; }\n  .fx-search { height: 38px; }\n  .fx-search kbd { display: none; }\n  .fx-close kbd { display: none; }\n  .fx-body { grid-template-columns: 1fr; }\n  .fx-main { padding: 14px 12px 60px; }\n\n  .fx-side {\n    position: fixed;\n    z-index: 3;\n    top: 60px;\n    bottom: 0;\n    left: 0;\n    width: 286px;\n    transform: translateX(-102%);\n    transition: transform 0.22s ease;\n    box-shadow: 0 10px 40px rgba(17, 21, 18, 0.18);\n  }\n  .fx-side.fx-side-open { transform: none; }\n\n  .fx-mobilefilter {\n    display: inline-flex;\n    align-items: center;\n    height: 32px;\n    padding: 0 11px;\n    border: 1px solid var(--fx-line);\n    border-radius: 8px;\n    background: #fff;\n    font-size: 12.5px;\n    font-weight: 600;\n    cursor: pointer;\n  }\n\n  .fx-select span { display: none; }\n  .fx-grid { grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 10px; }\n  .fx-name { font-size: 12.5px; min-height: 31px; }\n  .fx-foot { flex-direction: column; align-items: flex-start; gap: 2px; }\n  .fx-launcher { right: 14px; bottom: 14px; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .fx-app, .fx-launcher, .fx-card { transition: none; }\n}\n\n\n/* hidden-Attribut darf nicht von display-Regeln überstimmt werden */\n.fx-app [hidden] { display: none !important; }\n\n/* ---------- Kategorien ---------- */\n\n.fx-tabs {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  height: 46px;\n  padding: 0 22px;\n  background: #fff;\n  border-bottom: 1px solid var(--fx-line);\n}\n\n.fx-tab {\n  border: 0;\n  background: none;\n  padding: 6px 12px;\n  border-radius: 8px;\n  font-size: 13px;\n  font-weight: 600;\n  color: var(--fx-muted);\n  cursor: pointer;\n}\n\n.fx-tab:hover { background: var(--fx-soft); }\n.fx-tab.is-active { background: #edf5f2; color: var(--fx-green-dark); }\n\n/* ---------- Karten-Aktionen ---------- */\n\n.fx-actions {\n  position: absolute;\n  top: 8px;\n  right: 8px;\n  display: flex;\n  gap: 4px;\n  opacity: 0.55;\n  transition: opacity 0.15s ease;\n}\n\n.fx-card:hover .fx-actions,\n.fx-actions:focus-within { opacity: 1; }\n\n.fx-actbtn {\n  width: 26px;\n  height: 26px;\n  padding: 0;\n  display: grid;\n  place-items: center;\n  border: 1px solid rgba(17, 21, 18, 0.06);\n  border-radius: 999px;\n  background: rgba(255, 255, 255, 0.93);\n  -webkit-backdrop-filter: blur(6px);\n  backdrop-filter: blur(6px);\n  color: #5c665f;\n  font-size: 12px;\n  line-height: 1;\n  cursor: pointer;\n}\n\n.fx-actbtn.is-on { background: var(--fx-green); border-color: var(--fx-green); color: #fff; }\n\n.fx-offers {\n  align-self: flex-start;\n  margin: 2px 0 0;\n  padding: 0;\n  border: 0;\n  background: none;\n  min-height: 12px;\n  font-size: 10.5px;\n  font-weight: 600;\n  color: var(--fx-green-dark);\n  text-align: left;\n  cursor: pointer;\n  text-decoration: underline;\n  text-decoration-color: rgba(25, 121, 109, 0.25);\n  text-underline-offset: 2px;\n}\n\n.fx-offers:hover { text-decoration-color: var(--fx-green); }\n\n.fx-csvbtn {\n  width: auto;\n  padding: 0 9px;\n  font-size: 10.5px;\n  font-weight: 700;\n  letter-spacing: 0.04em;\n}\n\n/* ---------- Modals ---------- */\n\n.fx-modal {\n  position: fixed;\n  inset: 0;\n  z-index: 5;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 22px;\n  background: rgba(17, 21, 18, 0.42);\n}\n\n.fx-modal[hidden] { display: none !important; }\n\n.fx-modal-card {\n  width: min(520px, 100%);\n  max-height: 82vh;\n  overflow: auto;\n  background: #fff;\n  border-radius: 16px;\n  box-shadow: 0 24px 60px rgba(17, 21, 18, 0.28);\n}\n\n.fx-modal-inner { padding: 18px 20px 20px; }\n\n.fx-modal-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }\n.fx-modal-head b { font-size: 16px; letter-spacing: -0.01em; }\n.fx-modal-head span {\n  flex: 1;\n  min-width: 0;\n  font-size: 12px;\n  color: var(--fx-muted);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.fx-modal-close {\n  width: 26px;\n  height: 26px;\n  border: 0;\n  border-radius: 8px;\n  background: var(--fx-soft);\n  color: #5c665f;\n  font-size: 12px;\n  cursor: pointer;\n}\n\n.fx-modal-note { margin-bottom: 10px; font-size: 11.5px; line-height: 1.5; color: var(--fx-muted); }\n\n.fx-modal-summary {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  padding: 10px 12px;\n  margin-bottom: 12px;\n  background: #edf5f2;\n  border-radius: 10px;\n}\n.fx-modal-summary b { font-size: 18px; color: var(--fx-green-dark); }\n.fx-modal-summary span { font-size: 11.5px; color: #3f4a44; }\n\n.fx-offerlist { display: flex; flex-direction: column; max-height: 40vh; overflow-y: auto; }\n\n.fx-offer {\n  display: flex;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 8px 4px;\n  border-bottom: 1px solid #eef1ee;\n  font-size: 12.5px;\n}\n\n.fx-offer-left { display: flex; flex-direction: column; gap: 1px; min-width: 0; }\n.fx-offer-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.fx-offer-city { font-size: 10.5px; color: var(--fx-muted); }\n.fx-offer-right { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; white-space: nowrap; }\n.fx-offer-state { font-size: 10px; color: #a4ada7; }\n.fx-offer-state.is-avail { color: var(--fx-green); }\n\n.fx-modal-actions { display: flex; gap: 8px; margin-top: 12px; }\n.fx-btn-primary { background: var(--fx-green); border-color: var(--fx-green); color: #fff; }\n.fx-btn-primary:hover { background: var(--fx-green-dark); }\n\n.fx-toast {\n  position: fixed;\n  left: 50%;\n  bottom: 26px;\n  z-index: 6;\n  max-width: 90vw;\n  padding: 10px 14px;\n  border-radius: 10px;\n  background: #111512;\n  color: #fff;\n  font-size: 12.5px;\n  opacity: 0;\n  transform: translate(-50%, 14px);\n  pointer-events: none;\n  transition: opacity 0.2s ease, transform 0.2s ease;\n}\n.fx-toast.is-visible { opacity: 1; transform: translate(-50%, 0); }\n.fx-toast-good { background: var(--fx-green); }\n\n@media (max-width: 980px) {\n  .fx-tabs { padding: 0 12px; height: 44px; }\n  .fx-actions { opacity: 1; }\n  .fx-modal { padding: 12px; }\n  .fx-modal-card { max-height: 88vh; }\n}\n\n/* ---------- Attribut-Filter ---------- */\n\n.fx-attr-host { display: block; }\n\n.fx-attr-section .fx-section-head span { letter-spacing: 0.05em; }\n\n.fx-attr-section .fx-checklist { max-height: 210px; }\n\n.fx-chiplink {\n  border: 0;\n  background: none;\n  padding: 4px 0 0;\n  color: var(--fx-green);\n  font-size: 11px;\n  font-weight: 600;\n  cursor: pointer;\n}\n\n.fx-chiplink:hover { text-decoration: underline; }\n\n.fx-chips {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  margin: 0 0 14px;\n}\n\n.fx-chip {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  padding: 5px 10px;\n  border: 1px solid #cfe3dc;\n  border-radius: 999px;\n  background: #edf5f2;\n  color: var(--fx-green-dark);\n  font-size: 11.5px;\n  font-weight: 600;\n  cursor: pointer;\n}\n\n.fx-chip:hover { background: #e0efe8; border-color: var(--fx-green); }\n\n/* ---------- Vergleich ---------- */\n\n.fx-tray {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 10px 18px;\n  background: #fff;\n  border-top: 1px solid var(--fx-line);\n  box-shadow: 0 -8px 24px rgba(17, 21, 18, 0.06);\n}\n\n.fx-tray[hidden] { display: none !important; }\n\n.fx-tray-label {\n  font-size: 11px;\n  font-weight: 700;\n  color: var(--fx-green-dark);\n  background: #edf5f2;\n  border-radius: 999px;\n  padding: 4px 8px;\n}\n\n.fx-tray-chips { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; min-width: 0; }\n\n.fx-tray-chip {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  max-width: 220px;\n  padding: 5px 8px 5px 11px;\n  border: 1px solid var(--fx-line);\n  border-radius: 999px;\n  background: var(--fx-soft);\n  font-size: 11.5px;\n  white-space: nowrap;\n  overflow: hidden;\n}\n\n.fx-tray-x {\n  border: 0;\n  background: none;\n  padding: 0 2px;\n  color: #8b958f;\n  font-size: 13px;\n  line-height: 1;\n  cursor: pointer;\n}\n\n.fx-tray-x:hover { color: var(--fx-ink); }\n\n.fx-tray-clear { height: 32px; padding: 0 12px; font-size: 12px; }\n\n.fx-modal-wide { width: min(880px, 100%); }\n\n.fx-modal-inner.fx-modal-wide { width: min(880px, 100%); }\n\n.fx-modal-card:has(.fx-modal-wide) { width: min(900px, 100%); }\n\n.fx-compare {\n  width: 100%;\n  border-collapse: collapse;\n  font-size: 12.5px;\n}\n\n.fx-compare {\n  table-layout: fixed;\n}\n\n.fx-compare th,\n.fx-compare td {\n  padding: 9px 10px;\n  text-align: left;\n  vertical-align: top;\n  border-bottom: 1px solid #eef1ee;\n  overflow-wrap: anywhere;\n}\n\n.fx-compare thead th { border-bottom: 2px solid var(--fx-line); padding-bottom: 10px; }\n\n.fx-cmp-key {\n  width: 132px;\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n  color: #8b958f;\n  white-space: nowrap;\n}\n\n.fx-cmp-title { font-weight: 650; font-size: 13px; }\n.fx-cmp-title:hover { color: var(--fx-green); }\n.fx-cmp-sub { margin-top: 2px; font-size: 10.5px; color: var(--fx-muted); }\n\n.fx-cmp-best {\n  background: #edf5f2;\n  color: var(--fx-green-dark);\n  font-weight: 700;\n  box-shadow: inset 0 0 0 1px #d7e9e2;\n}\n\n@media (max-width: 980px) {\n  .fx-tray { padding: 8px 12px; flex-wrap: wrap; }\n  .fx-tray-chips { order: 3; width: 100%; flex-basis: 100%; }\n  .fx-compare { font-size: 11.5px; }\n  .fx-compare th, .fx-compare td { padding: 7px 6px; }\n  .fx-cmp-key { width: 92px; }\n}\n";
})();

(() => {
'use strict';
/**
 * flowzz+ Attribut-Index laden und Attribute filtern.
 * Wird in content.js eingebunden (Build inlined beide Teile).
 *
 * Index-Format (attrs.json.gz, entpackt):
 * {
 *   version, generated, count,
 *   catalog: { id: {slug, cat, name, origin, producer, thc, cbd, price, avail, genetic, rating} },
 *   labels:  { id: {label, type} },
 *   products:{ id: { e:[ids], t:[ids], m:[ids], s:[ids], tp:[ids] } }
 * }
 */

const FX_ATTR_TYPES = [
  { key: 'e', type: 'effect', title: 'Effekte', source: 'effect' },
  { key: 't', type: 'taste', title: 'Geschmack', source: 'taste' },
  { key: 'm', type: 'medicalUsage', title: 'Medizinische Wirkung', source: 'medicalUsage' },
  { key: 's', type: 'sideEffects', title: 'Nebenwirkungen', source: 'sideEffects' },
  { key: 'tp', type: 'terpene', title: 'Terpene', source: 'terpene' }
];

const ATTR_PREFIX = { e: 'eff', t: 'taste', m: 'med', s: 'side', tp: 'terp' };
const PREFIX_ATTR = { eff: 'e', taste: 't', med: 'm', side: 's', terp: 'tp' };

const gzipB64 = (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (typeof DecompressionStream === 'undefined') {
    return Promise.reject(new Error('DecompressionStream fehlt'));
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
};

/**
 * Lädt den Index aus dem Extension-Bundle (gzip) oder per fetch von der URL.
 * Gibt { catalog, labels, products, version } zurück.
 */
async function fxLoadIndex({ base64, url, timeoutMs = 8000 }) {
  const parse = (text) => {
    const data = JSON.parse(text);
    if (!data || !data.products) throw new Error('Index ohne products');
    return data;
  };
  if (base64) {
    return parse(await gzipB64(base64));
  }
  if (url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = await res.arrayBuffer();
      // gzip magic 1f 8b?
      const head = new Uint8Array(buf.slice(0, 2));
      if (head[0] === 0x1f && head[1] === 0x8b) {
        if (typeof DecompressionStream === 'undefined') throw new Error('kein gunzip');
        const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
        return parse(await new Response(stream).text());
      }
      return parse(new TextDecoder().decode(buf));
    } finally {
      clearTimeout(t);
    }
  }
  throw new Error('kein Index');
}

/** Produkt-Attribute als Set-Schnitt prüfen. */
function fxMatchesAttrs(attrs, selected) {
  for (const key of Object.keys(selected)) {
    const wanted = selected[key];
    if (!wanted || !wanted.size) continue;
    const have = attrs && attrs[key];
    if (!have || !have.length) return false;
    let hit = false;
    for (const id of have) {
      if (wanted.has(id)) { hit = true; break; }
    }
    if (!hit) return false;
  }
  return true;
}

/** Label für eine Attribut-ID im richtigen Namensraum (Terpene getrennt). */
function fxLabelOf(index, key, id) {
  if (!index) return String(id);
  if (key === 'tp') {
    const t = index.terpLabels && index.terpLabels[String(id)];
    if (t) return t;
  }
  const l = index.labels && index.labels[String(id)];
  if (l && typeof l === 'object') return l.label || String(id);
  if (typeof l === 'string') return l;
  return String(id);
}

/** Labels einer Kategorie, sortiert nach Häufigkeit im aktuellen Index. */
function fxLabelList(index, key) {
  const counts = new Map();
  for (const attrs of Object.values(index.products)) {
    for (const id of (attrs[key] || [])) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, n]) => ({ id, n, label: fxLabelOf(index, key, id) }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'de'));
}

if (typeof window !== 'undefined') {
  window.fxLoadIndex = fxLoadIndex;
  window.fxMatchesAttrs = fxMatchesAttrs;
  window.fxLabelList = fxLabelList;
  window.fxLabelOf = fxLabelOf;
  window.FX_ATTR_TYPES = FX_ATTR_TYPES;
  window.ATTR_PREFIX = ATTR_PREFIX;
  window.PREFIX_ATTR = PREFIX_ATTR;
}

})();

/* flowzz+ · Attribut-Filter
 * Bindet die Index-Datei (attrs.json.gz) ein und stellt die Filter-Sektionen
 * für Effekte, Geschmack, medizinische Wirkung, Nebenwirkungen und Terpene bereit.
 * Erwartet window.fxLoadIndex / fxLabelList / fxMatchesAttrs aus attrs.js.
 */
(() => {
  if (window.__FX_ATTRS_UI__) return;
  window.__FX_ATTRS_UI__ = true;

  const ATTR_URL = (typeof window !== 'undefined' && window.__FX_ATTR_URL__) || 'https://raw.githubusercontent.com/CRZX1337/flowzz-plus/main/data/attrs.json.gz';
  const ATTR_CACHE_KEY = 'fx_attrs_v1';
  const ATTR_TTL = 24 * 60 * 60 * 1000;
  const CHUNK = 60;

  const index = {
    data: null,
    loading: false,
    error: null
  };

  const openSections = new Set();

  /* ---------- Laden ---------- */

  async function getCached() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((res) => chrome.storage.local.get(ATTR_CACHE_KEY, (r) => res(r ? r[ATTR_CACHE_KEY] : null)));
    }
    try { return JSON.parse(localStorage.getItem(ATTR_CACHE_KEY) || 'null'); } catch (e) { return null; }
  }

  async function setCached(value) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((res) => chrome.storage.local.set({ [ATTR_CACHE_KEY]: value }, res));
    }
    try { localStorage.setItem(ATTR_CACHE_KEY, JSON.stringify(value)); } catch (e) {}
  }

  async function loadIndex({ force } = {}) {
    if (index.data || index.loading) return index.data;
    index.loading = true;

    if (!force) {
      const cached = await getCached();
      if (cached && cached.ts && Date.now() - cached.ts < ATTR_TTL && cached.payload) {
        index.data = cached.payload;
        index.loading = false;
        return index.data;
      }
    }

    try {
      const payload = await window.fxLoadIndex({ url: ATTR_URL });
      index.data = payload;
      await setCached({ ts: Date.now(), payload });
    } catch (e) {
      index.error = e;
    } finally {
      index.loading = false;
    }
    return index.data;
  }

  /* ---------- Section-Bau ---------- */

  function buildSection(type, ctx) {
    const node = document.createElement('section');
    node.className = 'fx-section fx-attr-section';
    node.dataset.attr = type.key;

    const head = document.createElement('button');
    head.className = 'fx-section-head';
    head.type = 'button';
    head.innerHTML = '<span>' + type.title + '</span><i></i>';
    head.addEventListener('click', () => {
      node.classList.toggle('fx-collapsed');
      if (!node.classList.contains('fx-collapsed')) ensureList();
    });

    const body = document.createElement('div');
    body.className = 'fx-section-body';

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'fx-mini-search';
    search.placeholder = type.title + ' suchen …';

    const list = document.createElement('div');
    list.className = 'fx-checklist';

    const more = document.createElement('button');
    more.className = 'fx-chiplink';
    more.type = 'button';
    more.hidden = true;

    body.append(search, list, more);
    node.append(head, body);

    const state = { query: '', shown: CHUNK, items: [] };

    function render() {
      const selected = ctx.getSelected(type.key);
      list.textContent = '';
      const q = state.query.toLowerCase();
      const filtered = state.items.filter((it) => !q || it.label.toLowerCase().includes(q));
      const shown = filtered.slice(0, state.shown);
      const frag = document.createDocumentFragment();
      for (const item of shown) {
        const row = document.createElement('label');
        row.className = 'fx-check';
        if (ctx.countFor(type.key, item.id) === 0 && !selected.has(item.id)) row.classList.add('is-zero');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selected.has(item.id);
        cb.addEventListener('change', () => ctx.toggle(type.key, item.id, cb.checked));
        const name = document.createElement('span');
        name.className = 'fx-checkname';
        name.textContent = item.label;
        const count = document.createElement('span');
        count.className = 'fx-checkcount';
        count.textContent = String(ctx.countFor(type.key, item.id));
        row.append(cb, name, count);
        frag.append(row);
      }
      list.append(frag);
      more.hidden = filtered.length <= state.shown;
      more.textContent = '+' + (filtered.length - state.shown) + ' weitere';
    }

    function ensureList() {
      if (state.items.length || !index.data) return;
      state.items = window.fxLabelList(index.data, type.key);
      render();
    }

    search.addEventListener('input', () => {
      state.query = search.value.trim();
      state.shown = CHUNK;
      ensureList();
      render();
    });

    more.addEventListener('click', () => {
      state.shown += CHUNK * 2;
      render();
    });

    node.classList.add('fx-collapsed');

    return {
      node,
      type,
      refresh: () => {
        if (!index.data) return;
        ensureList();
        if (!node.classList.contains('fx-collapsed')) render();
      },
      show: () => { node.hidden = false; },
      hide: () => { node.hidden = true; },
      reset: () => { state.shown = CHUNK; state.query = ''; search.value = ''; render(); },
      count: () => {
        const sel = ctx.getSelected(type.key);
        if (sel.size) {
          head.querySelector('span').textContent = type.title + ' · ' + sel.size;
        } else {
          head.querySelector('span').textContent = type.title;
        }
      }
    };
  }

  /**
   * Baut alle Attribut-Sektionen und hängt sie in den Sidebar-Container.
   * ctx: {
   *   getSelected(key) -> Set,
   *   toggle(key, id, on) -> void,
   *   countFor(key, id) -> number,
   *   onChange() -> void,
   *   notify(text)
   * }
   */
  function mount(container, ctx) {
    const sections = {};
    const wrap = document.createElement('div');
    wrap.className = 'fx-attr-wrap';
    for (const type of window.FX_ATTR_TYPES) {
      const sec = buildSection(type, ctx);
      sections[type.key] = sec;
      wrap.append(sec.node);
    }
    container.append(wrap);

    loadIndex().then(() => {
      if (!index.data) {
        wrap.querySelectorAll('.fx-attr-section').forEach((n) => { n.hidden = true; });
        ctx.notify('Attribut-Index nicht verfügbar – Filter eingeschränkt.');
        return;
      }
      for (const sec of Object.values(sections)) {
        sec.show();
        sec.refresh();
        sec.count();
      }
    });

    return {
      sections,
      refresh() {
        for (const sec of Object.values(sections)) {
          sec.refresh();
          sec.count();
        }
      },
      reset() {
        for (const sec of Object.values(sections)) sec.reset();
      },
      get index() { return index.data; }
    };
  }

  window.fxAttrs = { mount, loadIndex, get index() { return index.data; } };
})();

/* flowzz+ · Herkunft, Preise & Suche
 * Erweitert flowzz.com um eine eigene Produktsuche mit Herkunfts-, Preis-,
 * THC-, Hersteller- und Bestrahlungsfilter – für Blüten, Extrakte und Edibles.
 * Zusatz: Apotheken-Preisvergleich, Favoriten, Preisalarm, CSV-Export.
 * Läuft als Content-Script (Firefox/Chrome) und als Userscript.
 */
(() => {
  if (window.__FX_LOADED__) return;
  window.__FX_LOADED__ = true;

  const PAGE_SIZE = 240;
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const VENDOR_TTL = 24 * 60 * 60 * 1000;
  const PAGE_STEP = 60;
  const VERSION = '1.3.0';

  const CATEGORIES = [
    { id: 'flowers', label: 'Blüten', endpoint: '/api/v1/views/flowers', pricePath: '2', file: 'blueeten' },
    { id: 'extracts', label: 'Extrakte', endpoint: '/api/v1/views/extracts', pricePath: '3', file: 'extrakte' },
    { id: 'edibles', label: 'Edibles', endpoint: '/api/v1/views/edibles', pricePath: '4', file: 'edibles' }
  ];

  const HAS_CHROME = typeof chrome !== 'undefined' && chrome && chrome.runtime && chrome.runtime.id;
  const CSS_URL = HAS_CHROME ? chrome.runtime.getURL('overlay.css') : null;

  /* ---------- Herkunft normalisieren ---------- */

  const ORIGIN_ALIAS = {
    'spain': 'Spanien',
    'süd afrika': 'Südafrika',
    'suedafrika': 'Südafrika',
    'nord mazedonien': 'Nordmazedonien',
    'mazedonien': 'Nordmazedonien',
    'kanalinseln': 'Jersey',
    'england': 'Vereinigtes Königreich',
    'vereinigtes königreich': 'Vereinigtes Königreich',
    'usa': 'USA',
    'deutschland': 'Deutschland'
  };

  const FLAGS = {
    'Kanada': '🇨🇦', 'Portugal': '🇵🇹', 'Tschechien': '🇨🇿', 'Deutschland': '🇩🇪',
    'Nordmazedonien': '🇲🇰', 'Dänemark': '🇩🇰', 'Südafrika': '🇿🇦', 'Kolumbien': '🇨🇴',
    'Spanien': '🇪🇸', 'Australien': '🇦🇺', 'Israel': '🇮🇱', 'Schweiz': '🇨🇭',
    'Thailand': '🇹🇭', 'Griechenland': '🇬🇷', 'Lesotho': '🇱🇸', 'Argentinien': '🇦🇷',
    'Jersey': '🇯🇪', 'Uruguay': '🇺🇾', 'Niederlande': '🇳🇱', 'Vereinigtes Königreich': '🇬🇧',
    'Malta': '🇲🇹', 'USA': '🇺🇸', 'Uganda': '🇺🇬', 'Simbabwe': '🇿🇼',
    'Neuseeland': '🇳🇿', 'Chile': '🇨🇱', 'Unbekannt': '🏳️'
  };

  function normOrigin(raw) {
    const s = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!s) return 'Unbekannt';
    const alias = ORIGIN_ALIAS[s.toLowerCase()];
    if (alias) return alias;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function normGenetic(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s.startsWith('ind')) return 'Indica';
    if (s.startsWith('sat')) return 'Sativa';
    if (s.startsWith('hy') || s.startsWith('hry')) return 'Hybrid';
    return '';
  }

  /* ---------- Storage ---------- */

  const store = {
    async get(key) {
      if (HAS_CHROME && chrome.storage && chrome.storage.local) {
        return new Promise((res) => chrome.storage.local.get(key, (r) => res(r ? r[key] : null)));
      }
      try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
    },
    async set(key, value) {
      if (HAS_CHROME && chrome.storage && chrome.storage.local) {
        return new Promise((res) => chrome.storage.local.set({ [key]: value }, res));
      }
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
  };

  /* ---------- Helpers ---------- */

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const eur = (v) => (v == null ? '—' : v.toFixed(2).replace('.', ',') + ' €');
  const pct = (v) => (v == null ? '—' : String(v).replace('.', ',') + '%');

  const debounce = (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  const flagOf = (origin) => FLAGS[origin] || '🌱';

  const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

  const errMsg = (err) => (err && err.message ? err.message : String(err));

  function toast(text, kind) {
    if (!ui.shadow) return;
    let box = ui.shadow.querySelector('.fx-toast');
    if (!box) {
      box = el('div', 'fx-toast');
      ui.shadow.appendChild(box);
    }
    box.textContent = text;
    box.className = 'fx-toast is-visible' + (kind ? ' fx-toast-' + kind : '');
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => box.classList.remove('is-visible'), 4200);
  }

  /* ---------- State ---------- */

  const state = {
    items: [],
    loadedAt: 0,
    loading: false,
    error: null,
    progress: { n: 0, total: 0 },
    visible: PAGE_STEP,
    opened: false,
    facetsBuilt: false,
    category: 'flowers',
    favorites: new Set(),
    compare: new Set(),
    prices: new Map(),
    pricesLoading: false,
    vendors: null,
    filters: {
      q: '',
      origins: new Set(),
      producers: new Set(),
      genetic: '',
      thcMin: null,
      thcMax: null,
      priceMax: null,
      irr: '',
      onlyAvail: false,
      onlyFavs: false,
      sort: 'popularity',
      attrs: { e: new Set(), t: new Set(), m: new Set(), s: new Set(), tp: new Set() }
    }
  };

  const ui = {};

  /* ---------- Daten ---------- */

  function normalize(p, cat) {
    const img = p.image && p.image.data && p.image.data.attributes;
    const small = img && img.formats && img.formats.small ? img.formats.small.url : (img ? img.url : '');
    return {
      id: p.id,
      cat,
      slug: p.url,
      name: p.name || '',
      strain: p.strain_name || p.name || '',
      producer: p.producer_name || '',
      origin: normOrigin(p.origin),
      thc: typeof p.thc === 'number' ? p.thc : null,
      cbd: typeof p.cbd === 'number' ? p.cbd : null,
      price: typeof p.min_price === 'number' ? p.min_price : null,
      priceMax: typeof p.max_price === 'number' ? p.max_price : null,
      rating: typeof p.ratings_score === 'number' ? p.ratings_score : null,
      ratingCount: p.ratings_count || 0,
      genetic: normGenetic(p.genetic),
      irr: !!p.irradiated,
      avail: p.availibility === 1,
      img: small || '',
      unit: p.unit || '',
      published: p.published_at || p.created_at || ''
    };
  }

  async function fetchCategory(catId, onProgress) {
    const cat = catById(catId);
    let page = 1;
    let total = 0;
    const out = [];
    const seen = new Set();
    for (;;) {
      const url = `${cat.endpoint}?pagination%5BpageSize%5D=${PAGE_SIZE}&pagination%5Bpage%5D=${page}`;
      const res = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const payload = json && json.data;
      const rows = (payload && payload.data) || [];
      total = (payload && payload.meta && payload.meta.pagination && payload.meta.pagination.total) || total;
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        out.push(normalize(row, catId));
      }
      if (onProgress) onProgress(out.length, total);
      const next = payload && payload.meta && payload.meta.pagination && payload.meta.pagination.hasNextPage;
      if (!next || !rows.length) break;
      page += 1;
    }
    out.forEach((p, i) => { p.rank = i; });
    return { items: out, loadedAt: Date.now(), cat: catId };
  }

  async function loadCategory(catId, force) {
    // Kategorie-Wechsel während eines laufenden Ladevorgangs zulassen:
    // die alte Antwort wird verworfen, sobald eine andere Kategorie aktiv ist.
    state.error = null;
    state.prices = new Map();
    state.pricesLoading = false;

    if (!force) {
      const cached = await store.get('fx_cache_v3_' + catId);
      if (cached && cached.items && cached.items.length) {
        state.items = cached.items;
        state.loadedAt = cached.loadedAt;
        state.facetsBuilt = false;
        render();
        if (Date.now() - cached.loadedAt < CACHE_TTL) return;
      }
    }

    state.loading = true;
    state.progress = { n: 0, total: 0 };
    renderLoading();
    try {
      const fresh = await fetchCategory(catId, (n, total) => {
        if (state.category !== catId) return;
        state.progress = { n, total };
        renderLoading();
      });
      if (state.category !== catId) return;
      state.items = fresh.items;
      state.loadedAt = fresh.loadedAt;
      state.facetsBuilt = false;
      await store.set('fx_cache_v3_' + catId, fresh);
      render();
    } catch (err) {
      state.error = err;
      if (!state.items.length && ui.grid) {
        ui.grid.textContent = '';
        ui.empty.hidden = false;
        ui.empty.querySelector('b').textContent = 'Daten konnten nicht geladen werden';
        ui.empty.querySelector('span').textContent = 'Bitte die Seite neu laden. (' + errMsg(err) + ')';
      }
    } finally {
      if (state.category === catId) {
        state.loading = false;
        renderLoading();
      }
    }
  }

  /* ---------- Apotheken-Preise ---------- */

  function parsePriceRow(row) {
    if (Array.isArray(row)) {
      return { pid: Number(row[0]), price: Number(row[1]), avail: Number(row[2]) === 1, vendor: Number(row[3]) };
    }
    if (row && typeof row === 'object') {
      return {
        pid: Number(row.product || row.product_id || row.id),
        price: Number(row.price),
        avail: row.availability === 1 || row.availibility === 1 || row.available === true,
        vendor: Number(row.vendor || row.vendor_id)
      };
    }
    return null;
  }

  async function loadPrices(ids) {
    const cat = catById(state.category);
    const missing = ids.filter((id) => id && !state.prices.has(Number(id)));
    if (!missing.length || state.pricesLoading) return;
    state.pricesLoading = true;
    try {
      const chunk = missing.slice(0, 300).join(',');
      const res = await fetch(`/api/v1/views/vendors/prices/${cat.pricePath}/${chunk}`, {
        credentials: 'same-origin', headers: { accept: 'application/json' }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : [];
      const grouped = new Map();
      for (const raw of rows) {
        const r = parsePriceRow(raw);
        if (!r || !r.pid || !r.price) continue;
        if (!grouped.has(r.pid)) grouped.set(r.pid, []);
        grouped.get(r.pid).push(r);
      }
      for (const [pid, offers] of grouped) {
        offers.sort((a, b) => a.price - b.price);
        state.prices.set(pid, {
          min: offers[0].price,
          count: offers.filter((o) => o.avail).length || offers.length,
          offers
        });
      }
      updatePriceLabels();
    } catch (e) {
      /* Preise sind Beiwerk – Fehler nicht eskalieren */
    } finally {
      state.pricesLoading = false;
    }
  }

  function updatePriceLabels() {
    if (!ui.shadow) return;
    ui.shadow.querySelectorAll('.fx-card[data-id]').forEach((card) => {
      const info = state.prices.get(Number(card.dataset.id));
      const line = card.querySelector('.fx-offers');
      if (!line) return;
      line.textContent = info
        ? info.count + (info.count === 1 ? ' Apotheke' : ' Apotheken') + ' · günstigste ' + eur(info.min)
        : 'Preise vergleichen';
    });
  }

  async function loadVendors() {
    if (state.vendors) return state.vendors;
    const cached = await store.get('fx_vendors_v1');
    if (cached && cached.ts && Date.now() - cached.ts < VENDOR_TTL && cached.map) {
      state.vendors = cached.map;
      return state.vendors;
    }
    let map = null;
    try {
      const nd = document.getElementById('__NEXT_DATA__');
      if (nd) {
        const data = JSON.parse(nd.textContent);
        const pp = data && data.props && data.props.pageProps;
        const vendors = pp && pp.productFilterData && pp.productFilterData.vendors;
        if (Array.isArray(vendors)) map = vendors;
      }
    } catch (e) { /* ignore */ }

    if (!map) {
      try {
        const res = await fetch('/product', { credentials: 'same-origin' });
        const html = await res.text();
        const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (m) {
          const data = JSON.parse(m[1]);
          map = data.props.pageProps.productFilterData.vendors;
        }
      } catch (e) { /* ignore */ }
    }

    if (Array.isArray(map)) {
      const slim = {};
      for (const v of map) slim[v.id] = { name: (v.name || '').trim(), city: v.city || '', plz: v.plz || '' };
      state.vendors = slim;
      await store.set('fx_vendors_v1', { ts: Date.now(), map: slim });
    }
    return state.vendors || {};
  }

  /* ---------- Favoriten & Alarme ---------- */

  function toggleFavorite(p) {
    if (state.favorites.has(p.id)) state.favorites.delete(p.id);
    else state.favorites.add(p.id);
    saveFavorites();
    renderFacets();
    renderGrid();
  }

  async function loadUserData() {
    const favs = await store.get('fx_favs_v1');
    if (Array.isArray(favs)) state.favorites = new Set(favs.map(Number));
  }

  async function saveFavorites() {
    await store.set('fx_favs_v1', [...state.favorites]);
  }

  /* ---------- Filterlogik ---------- */

  function matches(p, f, skip) {
    if (f.q) {
      const hay = (p.name + ' ' + p.strain + ' ' + p.producer + ' ' + p.origin).toLowerCase();
      for (const t of f.q.toLowerCase().split(/\s+/).filter(Boolean)) if (!hay.includes(t)) return false;
    }
    if (f.onlyFavs && !state.favorites.has(p.id)) return false;
    if (skip !== 'origin' && f.origins.size && !f.origins.has(p.origin)) return false;
    if (skip !== 'producer' && f.producers.size && !f.producers.has(p.producer)) return false;
    if (f.genetic && p.genetic !== f.genetic) return false;
    if (f.thcMin != null && (p.thc == null || p.thc < f.thcMin)) return false;
    if (f.thcMax != null && (p.thc == null || p.thc > f.thcMax)) return false;
    if (f.priceMax != null && (p.price == null || p.price > f.priceMax)) return false;
    if (f.irr === 'no' && p.irr) return false;
    if (f.irr === 'yes' && !p.irr) return false;
    if (f.onlyAvail && !p.avail) return false;
    if (window.fxMatchesAttrs && !window.fxMatchesAttrs(state.attrOf(p.id), f.attrs)) return false;
    return true;
  }

  /** Attribute eines Produkts aus dem Index (oder null). */
  function attrOf(id) {
    const idx = window.fxAttrs && window.fxAttrs.index;
    if (!idx) return null;
    return idx.products[String(id)] || null;
  }

  state.attrOf = attrOf;

  /** Trefferzahl für ein Attribut, alle anderen Filter angewendet. */
  function attrCount(key, id) {
    const f = state.filters;
    let n = 0;
    for (const p of state.items) {
      if (!matches(p, f)) continue;
      const a = attrOf(p.id);
      if (a && a[key] && a[key].includes(id)) n++;
    }
    return n;
  }

  function toggleAttr(key, id, on) {
    const set = state.filters.attrs[key];
    if (on) set.add(id); else set.delete(id);
    state.visible = PAGE_STEP;
    render();
    syncURL();
  }

  function selectedAttrs(key) {
    return state.filters.attrs[key];
  }

  function sorted(list) {
    const f = state.filters;
    const copy = list.slice();
    switch (f.sort) {
      case 'price-asc': copy.sort((a, b) => (a.price == null) - (b.price == null) || a.price - b.price); break;
      case 'thc-desc': copy.sort((a, b) => (b.thc == null) - (a.thc == null) || b.thc - a.thc); break;
      case 'rating': copy.sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.ratingCount - a.ratingCount); break;
      case 'new': copy.sort((a, b) => String(b.published).localeCompare(String(a.published))); break;
      default: copy.sort((a, b) => a.rank - b.rank);
    }
    return copy;
  }

  function currentList() {
    return sorted(state.items.filter((p) => matches(p, state.filters)));
  }

  function facetCounts(kind) {
    const counts = new Map();
    const f = state.filters;
    for (const p of state.items) {
      if (!matches(p, f, kind)) continue;
      const key = kind === 'origin' ? p.origin : p.producer;
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }

  /* ---------- Overlay ---------- */

  function ensureHost() {
    if (ui.host) return ui.host;
    const host = document.createElement('div');
    host.id = 'fx-host';
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.zIndex = '2147483600';
    host.style.pointerEvents = 'none';
    (document.body || document.documentElement).appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    if (CSS_URL) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS_URL;
      shadow.appendChild(link);
    } else if (typeof window.__FX_CSS === 'string') {
      const style = document.createElement('style');
      style.textContent = window.__FX_CSS;
      shadow.appendChild(style);
    }
    ui.host = host;
    ui.shadow = shadow;
    return host;
  }

  function buildOverlay() {
    const shadow = ui.shadow;
    const app = el('div', 'fx-app');
    app.setAttribute('role', 'dialog');
    app.setAttribute('aria-label', 'flowzz+ Suche');

    const top = el('header', 'fx-top');
    const brand = el('div', 'fx-brand');
    brand.append(el('span', 'fx-logo', 'f+'));
    const brandText = el('div', 'fx-brandtext');
    brandText.append(el('b', null, 'flowzz+'), el('small', null, 'Herkunft & Preise'));
    brand.append(brandText);

    const searchWrap = el('div', 'fx-search');
    searchWrap.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"/></svg>';
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Sorte, Hersteller, Herkunft …';
    input.setAttribute('aria-label', 'Suche');
    input.spellcheck = false;
    const kbd = el('kbd', null, '/');
    searchWrap.append(input, kbd);

    const close = el('button', 'fx-close');
    close.type = 'button';
    close.innerHTML = '<span>Schließen</span><kbd>Esc</kbd>';
    close.addEventListener('click', closeOverlay);

    top.append(brand, searchWrap, close);

    const tabs = el('nav', 'fx-tabs');
    ui.tabs = new Map();
    for (const cat of CATEGORIES) {
      const b = el('button', 'fx-tab', cat.label);
      b.type = 'button';
      b.dataset.cat = cat.id;
      b.addEventListener('click', () => switchCategory(cat.id));
      tabs.append(b);
      ui.tabs.set(cat.id, b);
    }

    const body = el('div', 'fx-body');
    const side = el('aside', 'fx-side');
    const main = el('main', 'fx-main');

    const sideHead = el('div', 'fx-side-head');
    const countBox = el('div', 'fx-countbox');
    ui.countNum = el('b', null, '–');
    ui.countLabel = el('span', null, 'Blüten');
    countBox.append(ui.countNum, ui.countLabel);
    const resetBtn = el('button', 'fx-reset', 'Zurücksetzen');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', resetFilters);
    sideHead.append(countBox, resetBtn);

    ui.facets = { origins: new Map() };
    ui.originSection = buildOriginSection();
    ui.producerSection = buildProducerSection();
    ui.priceSection = buildPriceSection();
    ui.thcSection = buildThcSection();
    ui.geneticSection = buildGeneticSection();
    ui.irrSection = buildIrrSection();
    ui.availSection = buildAvailSection();
    ui.favSection = buildFavSection();

    ui.attrHost = el('div', 'fx-attr-host');
    ui.dataNote = el('div', 'fx-datanote', '');
    side.append(
      sideHead,
      ui.originSection.node,
      ui.producerSection.node,
      ui.priceSection.node,
      ui.thcSection.node,
      ui.geneticSection.node,
      ui.irrSection.node,
      ui.availSection.node,
      ui.favSection.node,
      ui.attrHost,
      ui.dataNote
    );

    const toolbar = el('div', 'fx-toolbar');
    ui.resultText = el('div', 'fx-resulttext');
    const tools = el('div', 'fx-tools');
    const sortWrap = el('label', 'fx-select');
    sortWrap.append(el('span', null, 'Sortieren'));
    const sort = document.createElement('select');
    [
      ['popularity', 'Empfohlen'],
      ['price-asc', 'Preis aufsteigend'],
      ['thc-desc', 'THC absteigend'],
      ['rating', 'Bewertung'],
      ['new', 'Neueste']
    ].forEach(([v, label]) => { const o = document.createElement('option'); o.value = v; o.textContent = label; sort.appendChild(o); });
    sort.value = state.filters.sort;
    sort.addEventListener('change', () => { state.filters.sort = sort.value; state.visible = PAGE_STEP; render(); syncURL(); });
    ui.sort = sort;
    sortWrap.append(sort);

    const csvBtn = el('button', 'fx-iconbtn fx-csvbtn', 'CSV');
    csvBtn.type = 'button';
    csvBtn.title = 'Aktuelle Auswahl als CSV exportieren';
    csvBtn.addEventListener('click', () => exportCSV(currentList()));

    const refresh = el('button', 'fx-iconbtn', '↻');
    refresh.type = 'button';
    refresh.title = 'Daten aktualisieren';
    refresh.addEventListener('click', () => loadCategory(state.category, true));

    const mobileFilter = el('button', 'fx-mobilefilter', 'Filter');
    mobileFilter.type = 'button';
    mobileFilter.addEventListener('click', () => side.classList.toggle('fx-side-open'));

    tools.append(sortWrap, csvBtn, refresh, mobileFilter);
    toolbar.append(ui.resultText, tools);

    ui.grid = el('div', 'fx-grid');
    ui.empty = el('div', 'fx-empty');
    ui.empty.hidden = true;
    ui.empty.append(el('b', null, 'Nichts gefunden'), el('span', null, 'Filter lockern oder Suche zurücksetzen.'));
    const moreWrap = el('div', 'fx-more');
    ui.moreBtn = el('button', 'fx-btn', 'Mehr laden');
    ui.moreBtn.type = 'button';
    ui.moreBtn.addEventListener('click', () => { state.visible += PAGE_STEP; renderGrid(); });
    moreWrap.append(ui.moreBtn);

    ui.progress = el('div', 'fx-loading');
    ui.progress.hidden = true;
    ui.progress.innerHTML = '<div class="fx-progress"><i></i></div><span>Daten werden geladen …</span>';
    ui.progressBar = ui.progress.querySelector('i');
    ui.progressText = ui.progress.querySelector('span');

    ui.chips = el('div', 'fx-chips');
    ui.chips.hidden = true;
    main.append(toolbar, ui.chips, ui.progress, ui.grid, ui.empty, moreWrap);

    ui.tray = el('div', 'fx-tray');
    ui.tray.hidden = true;
    app.append(ui.tray);
    body.append(side, main);
    app.append(top, tabs, body);
    shadow.appendChild(app);

    ui.app = app;
    ui.input = input;
    ui.side = side;

    if (window.fxAttrs) {
      ui.attrs = window.fxAttrs.mount(ui.attrHost, {
        getSelected: selectedAttrs,
        toggle: toggleAttr,
        countFor: attrCount,
        onChange: render,
        notify: toast
      });
    }

    ui.modal = el('div', 'fx-modal');
    ui.modal.hidden = true;
    ui.modalCard = el('div', 'fx-modal-card');
    ui.modal.append(ui.modalCard);
    ui.modal.addEventListener('click', (e) => { if (e.target === ui.modal) closeModal(); });
    shadow.appendChild(ui.modal);

    input.addEventListener('input', debounce(() => {
      state.filters.q = input.value.trim();
      state.visible = PAGE_STEP;
      render();
      syncURL();
    }, 120));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeOverlay(); }
    });

    return app;
  }

  function section(title) {
    const node = el('section', 'fx-section');
    const head = el('button', 'fx-section-head');
    head.type = 'button';
    head.innerHTML = '<span>' + title + '</span><i></i>';
    const bodyEl = el('div', 'fx-section-body');
    head.addEventListener('click', () => node.classList.toggle('fx-collapsed'));
    node.append(head, bodyEl);
    return { node, body: bodyEl, head };
  }

  function buildOriginSection() {
    const s = section('Herkunft');
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'fx-mini-search';
    search.placeholder = 'Land suchen …';
    ui.originSearch = search;
    const list = el('div', 'fx-checklist');
    s.body.append(search, list);
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      for (const [origin, ref] of ui.facets.origins) {
        ref.row.hidden = !!q && !origin.toLowerCase().includes(q);
      }
    });
    return { node: s.node, list };
  }

  function buildProducerSection() {
    const s = section('Hersteller');
    const sel = document.createElement('select');
    sel.className = 'fx-producer';
    s.body.append(sel);
    sel.addEventListener('change', () => {
      state.filters.producers = new Set(sel.value ? [sel.value] : []);
      state.visible = PAGE_STEP;
      render();
      syncURL();
    });
    return { node: s.node, select: sel };
  }

  function buildPriceSection() {
    const s = section('Preis pro Gramm');
    const value = el('div', 'fx-rangevalue', 'egal');
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '2';
    range.max = '25';
    range.step = '0.5';
    range.value = '25';
    range.addEventListener('input', () => {
      const v = Number(range.value);
      state.filters.priceMax = v >= 25 ? null : v;
      value.textContent = v >= 25 ? 'egal' : 'bis ' + eur(v);
      state.visible = PAGE_STEP;
      render();
      syncURL();
    });
    s.body.append(value, range);
    return { node: s.node, range, value };
  }

  function buildThcSection() {
    const s = section('THC-Gehalt');
    const row = el('div', 'fx-numberrow');
    const min = document.createElement('input');
    min.type = 'number'; min.min = '0'; min.max = '100'; min.step = '1'; min.placeholder = 'von';
    const max = document.createElement('input');
    max.type = 'number'; max.min = '0'; max.max = '100'; max.step = '1'; max.placeholder = 'bis';
    const apply = () => {
      state.filters.thcMin = min.value === '' ? null : Number(min.value);
      state.filters.thcMax = max.value === '' ? null : Number(max.value);
      state.visible = PAGE_STEP;
      render();
      syncURL();
    };
    min.addEventListener('change', apply);
    max.addEventListener('change', apply);
    row.append(min, el('span', 'fx-dash', '–'), max);
    s.body.append(row);
    return { node: s.node, min, max };
  }

  function buildGeneticSection() {
    const s = section('Strain-Typ');
    const seg = el('div', 'fx-seg');
    [['', 'Alle'], ['Indica', 'Indica'], ['Sativa', 'Sativa'], ['Hybrid', 'Hybrid']].forEach(([val, label]) => {
      const b = el('button', 'fx-segbtn', label);
      b.type = 'button';
      b.dataset.value = val;
      b.addEventListener('click', () => {
        state.filters.genetic = val;
        seg.querySelectorAll('.fx-segbtn').forEach((x) => x.classList.toggle('is-active', x.dataset.value === val));
        state.visible = PAGE_STEP;
        render();
        syncURL();
      });
      if (val === '') b.classList.add('is-active');
      seg.append(b);
    });
    s.body.append(seg);
    ui.geneticSeg = seg;
    return { node: s.node };
  }

  function buildIrrSection() {
    const s = section('Bestrahlung');
    const seg = el('div', 'fx-seg');
    [['', 'Egal'], ['no', 'Unbestrahlt'], ['yes', 'Bestrahlt']].forEach(([val, label]) => {
      const b = el('button', 'fx-segbtn', label);
      b.type = 'button';
      b.dataset.value = val;
      b.addEventListener('click', () => {
        state.filters.irr = val;
        seg.querySelectorAll('.fx-segbtn').forEach((x) => x.classList.toggle('is-active', x.dataset.value === val));
        state.visible = PAGE_STEP;
        render();
        syncURL();
      });
      if (val === '') b.classList.add('is-active');
      seg.append(b);
    });
    s.body.append(seg);
    ui.irrSeg = seg;
    return { node: s.node };
  }

  function buildAvailSection() {
    const s = section('Verfügbarkeit');
    const label = el('label', 'fx-switch');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => {
      state.filters.onlyAvail = cb.checked;
      state.visible = PAGE_STEP;
      render();
      syncURL();
    });
    label.append(cb, el('span', 'fx-knob'), el('span', null, 'Nur lieferbar'));
    s.body.append(label);
    return { node: s.node, checkbox: cb };
  }

  function buildFavSection() {
    const s = section('Favoriten');
    const label = el('label', 'fx-switch');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    const text = el('span', 'fx-favtext', 'Nur Favoriten');
    cb.addEventListener('change', () => {
      state.filters.onlyFavs = cb.checked;
      state.visible = PAGE_STEP;
      render();
      syncURL();
    });
    label.append(cb, el('span', 'fx-knob'), text);
    s.body.append(label);
    return { node: s.node, checkbox: cb, text };
  }

  /* ---------- Vergleich ---------- */

  function toggleCompare(p) {
    if (state.compare.has(p.id)) {
      state.compare.delete(p.id);
    } else {
      if (state.compare.size >= 4) { toast('Maximal 4 Produkte vergleichen'); return; }
      state.compare.add(p.id);
    }
    renderCompareTray();
    renderGrid();
    syncURL();
  }

  function compareProducts() {
    return [...state.compare].map((id) => state.items.find((p) => p.id === id)).filter(Boolean);
  }

  function renderCompareTray() {
    if (!ui.tray) return;
    const items = compareProducts();
    ui.tray.hidden = items.length === 0;
    ui.tray.textContent = '';
    if (!items.length) return;

    const label = el('span', 'fx-tray-label', items.length + '/4');
    const chips = el('div', 'fx-tray-chips');
    for (const p of items) {
      const chip = el('span', 'fx-tray-chip');
      chip.append(el('span', null, p.strain || p.name));
      const x = el('button', 'fx-tray-x', '×');
      x.type = 'button';
      x.addEventListener('click', () => toggleCompare(p));
      chip.append(x);
      chips.append(chip);
    }
    const clear = el('button', 'fx-btn fx-tray-clear', 'Leeren');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      state.compare.clear();
      renderCompareTray();
      renderGrid();
      syncURL();
    });
    const go = el('button', 'fx-btn fx-btn-primary', 'Vergleichen');
    go.type = 'button';
    go.disabled = items.length < 2;
    go.addEventListener('click', openCompareDialog);

    ui.tray.append(label, chips, clear, go);
  }

  function openCompareDialog() {
    const items = compareProducts();
    if (items.length < 2) { toast('Mindestens 2 Produkte auswählen'); return; }
    const idx = window.fxAttrs && window.fxAttrs.index;
    const labelOf = (key, id) => (window.fxLabelOf ? window.fxLabelOf(idx, key, id) : String(id));

    const head = el('div', 'fx-modal-head');
    head.append(el('b', null, 'Vergleich'), el('span', null, items.length + ' Produkte'));
    const close = el('button', 'fx-modal-close', '✕');
    close.type = 'button';
    close.addEventListener('click', closeModal);
    head.append(close);

    const body = el('div', 'fx-modal-body');
    const table = el('table', 'fx-compare');
    const thead = el('thead');
    const hr = el('tr');
    hr.append(el('th', 'fx-cmp-key', ''));
    for (const p of items) {
      const th = el('th');
      const link = el('a', 'fx-cmp-title', p.strain || p.name);
      link.href = '/product/' + p.slug;
      th.append(link, el('div', 'fx-cmp-sub', p.producer || ''));
      hr.append(th);
    }
    thead.append(hr);

    const rows = [
      ['Preis / g', (p) => (p.price == null ? '—' : eur(p.price)), 'min'],
      ['THC', (p) => pct(p.thc), 'max'],
      ['CBD', (p) => pct(p.cbd)],
      ['Genetik', (p) => p.genetic || '—'],
      ['Herkunft', (p) => (p.origin === 'Unbekannt' ? '—' : p.origin)],
      ['Bestrahlung', (p) => (p.irr ? 'bestrahlt' : 'unbestrahlt')],
      ['Verfügbar', (p) => (p.avail ? 'ja' : 'nein')],
      ['Bewertung', (p) => (p.rating ? '★ ' + p.rating.toFixed(1) : '—'), 'max'],
      ['Effekte', (p) => {
        const a = idx && idx.products[String(p.id)];
        return a && a.e ? a.e.slice(0, 4).map((id) => labelOf('e', id)).join(', ') : '—';
      }],
      ['Terpene', (p) => {
        const a = idx && idx.products[String(p.id)];
        return a && a.tp ? a.tp.slice(0, 4).map((id) => labelOf('tp', id)).join(', ') : '—';
      }]
    ];

    const tbody = el('tbody');
    for (const [label, fn, best] of rows) {
      const tr = el('tr');
      tr.append(el('td', 'fx-cmp-key', label));
      const values = items.map(fn);
      let bestIdx = -1;
      if (best) {
        const nums = items.map((p) => (best === 'min' ? (p.price == null ? Infinity : p.price) : (p.thc == null ? -1 : p.thc)));
        const target = best === 'min' ? Math.min(...nums) : Math.max(...nums);
        if (isFinite(target) && target !== (best === 'min' ? Infinity : -1)) bestIdx = nums.indexOf(target);
      }
      values.forEach((v, i) => {
        const td = el('td', i === bestIdx ? 'fx-cmp-best' : '', v);
        tr.append(td);
      });
      tbody.append(tr);
    }
    table.append(thead, tbody);
    body.append(table);

    const wrap = el('div', 'fx-modal-inner fx-modal-wide');
    wrap.append(head, body);
    openModal(wrap);
  }

  /* ---------- Rendering ---------- */

  function render() {
    if (!state.opened) return;
    try {
      renderTabs();
      renderFacets();
      renderGrid();
    } catch (e) {
      if (ui.dataNote) ui.dataNote.textContent = 'FEHLER: ' + (e && e.message ? e.message : e);
    }
  }

  function renderTabs() {
    for (const [id, btn] of ui.tabs) btn.classList.toggle('is-active', id === state.category);
    ui.countLabel.textContent = catById(state.category).label;
  }

  function buildFacetLists() {
    const f = state.filters;
    const originCounts = facetCounts('origin');
    const origins = [...new Set(state.items.map((p) => p.origin))];
    origins.sort((a, b) => {
      if (a === 'Unbekannt') return 1;
      if (b === 'Unbekannt') return -1;
      return (originCounts.get(b) || 0) - (originCounts.get(a) || 0);
    });

    const list = ui.originSection.list;
    list.textContent = '';
    const nodes = new Map();
    for (const origin of origins) {
      const row = el('label', 'fx-check');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = f.origins.has(origin);
      cb.addEventListener('change', () => {
        if (cb.checked) f.origins.add(origin); else f.origins.delete(origin);
        state.visible = PAGE_STEP;
        render();
        syncURL();
      });
      const count = el('span', 'fx-checkcount', String(originCounts.get(origin) || 0));
      row.append(cb, el('span', 'fx-flag', flagOf(origin)), el('span', 'fx-checkname', origin), count);
      list.append(row);
      nodes.set(origin, { row, count, cb });
    }
    ui.facets.origins = nodes;

    const pCounts = facetCounts('producer');
    const producers = [...new Set(state.items.map((p) => p.producer).filter(Boolean))]
      .sort((a, b) => (pCounts.get(b) || 0) - (pCounts.get(a) || 0));
    const sel = ui.producerSection.select;
    sel.textContent = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = 'Alle Hersteller';
    sel.append(optAll);
    for (const prod of producers) {
      const o = document.createElement('option');
      o.value = prod;
      o.textContent = prod + '  (' + (pCounts.get(prod) || 0) + ')';
      sel.append(o);
    }
    sel.value = f.producers.size ? [...f.producers][0] : '';

    state.facetsBuilt = true;
  }

  function renderFacets() {
    const f = state.filters;
    if (!state.facetsBuilt && state.items.length) buildFacetLists();
    if (ui.attrs) ui.attrs.refresh();

    const originCounts = facetCounts('origin');
    const originQuery = (ui.originSearch && ui.originSearch.value.trim().toLowerCase()) || '';
    for (const [origin, ref] of ui.facets.origins) {
      ref.count.textContent = String(originCounts.get(origin) || 0);
      ref.cb.checked = f.origins.has(origin);
      ref.row.hidden = !!originQuery && !origin.toLowerCase().includes(originQuery);
      ref.row.classList.toggle('is-zero', (originCounts.get(origin) || 0) === 0 && !f.origins.has(origin));
    }

    const pCounts = facetCounts('producer');
    if (ui.producerSection) {
      const sel = ui.producerSection.select;
      const current = f.producers.size ? [...f.producers][0] : '';
      for (const o of sel.options) {
        if (!o.value) continue;
        o.textContent = o.value + '  (' + (pCounts.get(o.value) || 0) + ')';
      }
      sel.value = current;
    }

    const listNow = currentList();
    const cat = catById(state.category);
    ui.countNum.textContent = String(listNow.length);
    ui.countLabel.textContent = cat.label;
    ui.resultText.textContent = listNow.length
      ? listNow.length + ' von ' + state.items.length + ' ' + cat.label
      : 'Keine Treffer';
    if (ui.favSection) ui.favSection.text.textContent = 'Nur Favoriten (' + state.favorites.size + ')';
    if (ui.dataNote) {
      ui.dataNote.textContent = (state.loadedAt
        ? 'Quelle: flowzz.com · Stand ' + new Date(state.loadedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' · '
        : '') + 'v' + VERSION;
    }
  }

  function card(p) {
    const a = document.createElement('a');
    a.className = 'fx-card';
    a.href = '/product/' + p.slug;
    a.dataset.id = p.id;

    const thumb = el('div', 'fx-thumb');
    if (p.img) {
      const img = document.createElement('img');
      img.src = p.img;
      img.alt = p.strain;
      img.loading = 'lazy';
      thumb.append(img);
    }
    const org = el('span', 'fx-orgbadge');
    org.append(el('span', 'fx-flag', flagOf(p.origin)), el('span', null, p.origin));
    thumb.append(org);
    if (!p.avail) thumb.append(el('span', 'fx-soldout', 'nicht lieferbar'));

    const actions = el('div', 'fx-actions');
    const fav = el('button', 'fx-actbtn' + (state.favorites.has(p.id) ? ' is-on' : ''), '★');
    fav.type = 'button';
    fav.title = state.favorites.has(p.id) ? 'Favorit entfernen' : 'Zu Favoriten';
    fav.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(p); });
    const cmp = el('button', 'fx-actbtn' + (state.compare.has(p.id) ? ' is-on' : ''), '⇄');
    cmp.type = 'button';
    cmp.title = state.compare.has(p.id) ? 'Aus Vergleich entfernen' : 'Zum Vergleich';
    cmp.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(p); });
    actions.append(fav, cmp);
    thumb.append(actions);

    const body = el('div', 'fx-cardbody');
    body.append(el('div', 'fx-cardprod', p.producer || '—'));
    body.append(el('div', 'fx-name', p.strain || p.name));
    const meta = el('div', 'fx-meta');
    meta.append(el('span', null, 'THC ' + pct(p.thc)), el('span', 'fx-dot', '·'), el('span', null, 'CBD ' + pct(p.cbd)));
    body.append(meta);
    if (p.genetic) body.append(el('span', 'fx-tag', p.genetic));

    const info = state.prices.get(p.id);
    const offers = el('button', 'fx-offers', info
      ? info.count + (info.count === 1 ? ' Apotheke' : ' Apotheken') + ' · günstigste ' + eur(info.min)
      : 'Preise vergleichen');
    offers.type = 'button';
    offers.title = 'Apotheken-Preise vergleichen';
    offers.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPriceDialog(p);
    });
    body.append(offers);

    const foot = el('div', 'fx-foot');
    const price = el('div', 'fx-price');
    price.append(el('b', null, eur(p.price)), el('small', null, ' / g'));
    const rating = el('div', 'fx-rating', p.rating ? '★ ' + p.rating.toFixed(1) : '—');
    if (p.ratingCount) rating.title = p.ratingCount + ' Bewertungen';
    foot.append(price, rating);
    body.append(foot);

    a.append(thumb, body);
    return a;
  }

  function renderAttrChips() {
    if (!ui.chips) return;
    const idx = window.fxAttrs && window.fxAttrs.index;
    ui.chips.textContent = '';
    if (!idx) return;
    let any = false;
    for (const key of Object.keys(state.filters.attrs)) {
      for (const id of state.filters.attrs[key]) {
        any = true;
        const label = window.fxLabelOf ? window.fxLabelOf(idx, key, id) : String(id);
        const chip = el('button', 'fx-chip', label + '  ×');
        chip.type = 'button';
        chip.addEventListener('click', () => toggleAttr(key, id, false));
        ui.chips.append(chip);
      }
    }
    ui.chips.hidden = !any;
  }

  function renderGrid() {
    renderAttrChips();
    const list = currentList();
    const grid = ui.grid;
    grid.textContent = '';
    const slice = list.slice(0, state.visible);
    const frag = document.createDocumentFragment();
    for (const p of slice) frag.append(card(p));
    grid.append(frag);
    ui.empty.hidden = list.length > 0;
    ui.moreBtn.parentElement.hidden = list.length <= slice.length;
    ui.grid.classList.toggle('fx-grid-empty', !list.length);
    updatePriceLabels();
  }

  function renderLoading() {
    if (!ui.progress) return;
    ui.progress.hidden = !state.loading;
    if (state.loading) {
      const { n, total } = state.progress;
      const p = total ? Math.min(100, Math.round((n / total) * 100)) : 8;
      ui.progressBar.style.width = p + '%';
      ui.progressText.textContent = total
        ? 'Daten werden geladen … ' + n + ' / ' + total
        : 'Daten werden geladen …';
    }
  }

  /* ---------- CSV ---------- */

  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportCSV(list) {
    if (!list.length) { toast('Keine Treffer zum Exportieren'); return; }
    const cat = catById(state.category);
    const head = ['Name', 'Sorte', 'Hersteller', 'Herkunft', 'THC %', 'CBD %', 'Genetik', 'Preis €/g', 'Preis max €/g', 'Bewertung', 'Bestrahlung', 'Lieferbar', 'Link'];
    const rows = list.map((p) => {
      return [
        p.name, p.strain, p.producer, p.origin, p.thc, p.cbd, p.genetic,
        p.price, p.priceMax, p.rating, p.irr ? 'ja' : 'nein',
        p.avail ? 'ja' : 'nein', 'https://flowzz.com/product/' + p.slug
      ].map(csvCell).join(';');
    });
    const csv = '\ufeff' + [head.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    a.href = url;
    a.download = 'flowzz-plus-' + cat.file + '-' + stamp + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(list.length + ' Zeilen exportiert', 'good');
  }

  /* ---------- Modals ---------- */

  function openModal(content) {
    ui.modalCard.textContent = '';
    ui.modalCard.append(content);
    ui.modal.hidden = false;
    ui.modal.classList.add('is-open');
  }

  function closeModal() {
    if (!ui.modal) return;
    ui.modal.hidden = true;
    ui.modal.classList.remove('is-open');
  }

  async function openPriceDialog(p) {
    const head = el('div', 'fx-modal-head');
    head.append(el('b', null, 'Apotheken-Preise'), el('span', null, p.strain || p.name));
    const close = el('button', 'fx-modal-close', '✕');
    close.type = 'button';
    close.addEventListener('click', closeModal);
    head.append(close);

    const bodyEl = el('div', 'fx-modal-body');
    bodyEl.append(el('div', 'fx-modal-note', 'Preise werden geladen …'));
    const wrap = el('div', 'fx-modal-inner');
    wrap.append(head, bodyEl);
    openModal(wrap);

    await loadPrices([p.id]);
    updatePriceLabels();
    const info = state.prices.get(p.id);
    bodyEl.textContent = '';
    if (!info) {
      bodyEl.append(el('div', 'fx-modal-note', 'Für dieses Produkt liegen aktuell keine Apothekenpreise vor.'));
      return;
    }
    const vendors = await loadVendors();
    const summary = el('div', 'fx-modal-summary');
    summary.append(el('b', null, eur(info.min) + ' / g'), el('span', null, info.count + ' Apotheken · günstigster Preis'));
    bodyEl.append(summary);

    const list = el('div', 'fx-offerlist');
    for (const o of info.offers.slice(0, 12)) {
      const v = vendors[o.vendor] || {};
      const row = el('div', 'fx-offer');
      const left = el('div', 'fx-offer-left');
      left.append(el('span', 'fx-offer-name', v.name || 'Apotheke #' + o.vendor));
      if (v.plz || v.city) left.append(el('span', 'fx-offer-city', [v.plz, v.city].filter(Boolean).join(' ')));
      const right = el('div', 'fx-offer-right');
      right.append(el('b', null, eur(o.price)));
      right.append(el('span', 'fx-offer-state' + (o.avail ? ' is-avail' : ''), o.avail ? 'lieferbar' : 'nicht lieferbar'));
      row.append(left, right);
      list.append(row);
    }
    bodyEl.append(list);
    bodyEl.append(el('div', 'fx-modal-note', 'Preise pro Gramm, Stand der Website. Alle Apotheken auf der Produktseite.'));
  }

  /* ---------- Kategorie / Filter ---------- */

  function switchCategory(catId) {
    if (catId === state.category) return;
    state.category = catId;
    state.filters = {
      q: state.filters.q, origins: new Set(), producers: new Set(), genetic: '',
      thcMin: null, thcMax: null, priceMax: null, irr: '', onlyAvail: false,
      onlyFavs: state.filters.onlyFavs, sort: state.filters.sort,
      attrs: { e: new Set(), t: new Set(), m: new Set(), s: new Set(), tp: new Set() }
    };
    state.visible = PAGE_STEP;
    state.items = [];
    state.facetsBuilt = false;
    state.loadedAt = 0;
    if (ui.input) ui.input.value = state.filters.q;
    resetControls();
    render();
    syncURL();
    loadCategory(catId, false);
  }

  function resetControls() {
    if (ui.priceSection) {
      ui.priceSection.range.value = '25';
      ui.priceSection.value.textContent = 'egal';
    }
    if (ui.thcSection) { ui.thcSection.min.value = ''; ui.thcSection.max.value = ''; }
    if (ui.sort) ui.sort.value = state.filters.sort;
    if (ui.availSection) ui.availSection.checkbox.checked = false;
    if (ui.geneticSeg) ui.geneticSeg.querySelectorAll('.fx-segbtn').forEach((b) => b.classList.toggle('is-active', b.dataset.value === ''));
    if (ui.irrSeg) ui.irrSeg.querySelectorAll('.fx-segbtn').forEach((b) => b.classList.toggle('is-active', b.dataset.value === ''));
  }

  function resetFilters() {
    state.filters = {
      q: '', origins: new Set(), producers: new Set(), genetic: '',
      thcMin: null, thcMax: null, priceMax: null, irr: '', onlyAvail: false,
      onlyFavs: false, sort: 'popularity'
    };
    state.visible = PAGE_STEP;
    if (ui.input) ui.input.value = '';
    if (ui.favSection) ui.favSection.checkbox.checked = false;
    state.filters.attrs = { e: new Set(), t: new Set(), m: new Set(), s: new Set(), tp: new Set() };
    if (ui.attrs) ui.attrs.reset();
    resetControls();
    render();
    syncURL();
  }

  /* ---------- URL ---------- */

  const URL_KEYS = ['fx', 'cat', 'q', 'origin', 'producer', 'genetic', 'thc', 'price', 'irr', 'avail', 'fav', 'sort',
    'eff', 'taste', 'med', 'side', 'terp', 'cmp'];

  function syncURL() {
    if (!state.opened) return;
    const f = state.filters;
    const params = new URLSearchParams();
    params.set('fx', '1');
    if (state.category !== 'flowers') params.set('cat', state.category);
    if (f.q) params.set('q', f.q);
    if (f.origins.size) params.set('origin', [...f.origins].join(','));
    if (f.producers.size) params.set('producer', [...f.producers].join(','));
    if (f.genetic) params.set('genetic', f.genetic);
    if (f.thcMin != null || f.thcMax != null) params.set('thc', (f.thcMin == null ? '' : f.thcMin) + '-' + (f.thcMax == null ? '' : f.thcMax));
    if (f.priceMax != null) params.set('price', String(f.priceMax));
    if (f.irr) params.set('irr', f.irr);
    if (f.onlyAvail) params.set('avail', '1');
    if (f.onlyFavs) params.set('fav', '1');
    if (f.sort !== 'popularity') params.set('sort', f.sort);
    if (state.compare.size) params.set('cmp', [...state.compare].join(','));
    for (const key of Object.keys(window.ATTR_PREFIX || {})) {
      const set = f.attrs[key];
      if (set && set.size) params.set(window.ATTR_PREFIX[key], [...set].join(','));
    }
    history.replaceState(history.state, '', location.pathname + '?' + params.toString());
  }

  function applyURL() {
    const params = new URLSearchParams(location.search);
    const f = state.filters;
    if (params.get('cat')) state.category = params.get('cat');
    f.q = params.get('q') || '';
    if (params.get('origin')) f.origins = new Set(params.get('origin').split(',').map(normOrigin));
    if (params.get('producer')) f.producers = new Set(params.get('producer').split(','));
    if (params.get('genetic')) f.genetic = params.get('genetic');
    const thc = params.get('thc');
    if (thc && thc.includes('-')) {
      const [a, b] = thc.split('-');
      f.thcMin = a === '' ? null : Number(a);
      f.thcMax = b === '' ? null : Number(b);
    }
    if (params.get('price')) f.priceMax = Number(params.get('price'));
    if (params.get('irr')) f.irr = params.get('irr');
    f.onlyAvail = params.get('avail') === '1';
    f.onlyFavs = params.get('fav') === '1';
    if (params.get('sort')) f.sort = params.get('sort');
    if (params.get('cmp')) state.compare = new Set(params.get('cmp').split(',').map(Number).filter(Boolean));
    for (const [key, prefix] of Object.entries(window.PREFIX_ATTR || {})) {
      const raw = params.get(prefix);
      if (raw) f.attrs[key] = new Set(raw.split(',').map(Number).filter((n) => !isNaN(n)));
    }
  }

  function clearURL() {
    const params = new URLSearchParams(location.search);
    URL_KEYS.forEach((k) => params.delete(k));
    const qs = params.toString();
    history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : ''));
  }

  /* ---------- Öffnen / Schließen ---------- */

  function lowerCookieBanner() {
    if (ui.cookieZ != null) return;
    const dlg = document.getElementById('CybotCookiebotDialog');
    if (!dlg) return;
    ui.cookieZ = dlg.style.zIndex || '';
    dlg.style.zIndex = '1';
  }

  function restoreCookieBanner() {
    if (ui.cookieZ == null) return;
    const dlg = document.getElementById('CybotCookiebotDialog');
    if (dlg) dlg.style.zIndex = ui.cookieZ;
    ui.cookieZ = null;
  }

  function openOverlay(pending) {
    ensureHost();
    lowerCookieBanner();
    if (!ui.app) buildOverlay();
    if (!state.opened) {
      state.opened = true;
      applyURL();
      if (ui.input) ui.input.value = state.filters.q;
      if (ui.sort) ui.sort.value = state.filters.sort;
      if (ui.priceSection) {
        const v = state.filters.priceMax == null ? 25 : state.filters.priceMax;
        ui.priceSection.range.value = String(v);
        ui.priceSection.value.textContent = state.filters.priceMax == null ? 'egal' : 'bis ' + eur(v);
      }
      if (ui.thcSection) {
        ui.thcSection.min.value = state.filters.thcMin == null ? '' : String(state.filters.thcMin);
        ui.thcSection.max.value = state.filters.thcMax == null ? '' : String(state.filters.thcMax);
      }
      if (ui.availSection) ui.availSection.checkbox.checked = state.filters.onlyAvail;
      if (ui.favSection) ui.favSection.checkbox.checked = state.filters.onlyFavs;
      if (pending) Object.assign(state.filters, pending);
      if (ui.geneticSeg) ui.geneticSeg.querySelectorAll('.fx-segbtn').forEach((b) => b.classList.toggle('is-active', b.dataset.value === state.filters.genetic));
      if (ui.irrSeg) ui.irrSeg.querySelectorAll('.fx-segbtn').forEach((b) => b.classList.toggle('is-active', b.dataset.value === state.filters.irr));
      ui.app.classList.add('is-open');
      document.documentElement.style.overflow = 'hidden';
      ui.host.classList.add('fx-visible');
      render();
      renderCompareTray();
      loadUserData().then(() => {
        render();
        if (!state.items.length) loadCategory(state.category, false);
      });
      setTimeout(() => ui.input && ui.input.focus(), 60);
    } else {
      ui.app.classList.add('is-open');
      document.documentElement.style.overflow = 'hidden';
      ui.host.classList.add('fx-visible');
    }
    hideLauncher();
  }

  function closeOverlay() {
    state.opened = false;
    closeModal();
    if (ui.app) ui.app.classList.remove('is-open');
    if (ui.host) ui.host.classList.remove('fx-visible');
    document.documentElement.style.overflow = '';
    restoreCookieBanner();
    clearURL();
    showLauncher();
  }

  /* ---------- Launcher ---------- */

  function buildLauncher() {
    const btn = el('button', 'fx-launcher');
    btn.type = 'button';
    btn.innerHTML = '<span class="fx-launcher-logo">f+</span><span class="fx-launcher-label">Herkunft filtern</span>';
    btn.addEventListener('click', openOverlay);
    ensureHost();
    ui.shadow.appendChild(btn);
    ui.launcher = btn;
  }

  function showLauncher() {
    if (!ui.launcher) buildLauncher();
    const isList = location.pathname === '/product' || location.pathname === '/product/';
    ui.launcher.querySelector('.fx-launcher-label').textContent = isList ? 'Herkunft filtern' : 'flowzz+ Suche';
    ui.launcher.classList.add('is-visible');
  }

  function hideLauncher() {
    if (ui.launcher) ui.launcher.classList.remove('is-visible');
  }

  /* ---------- Produktdetail ---------- */

  function detailInfo() {
    const nd = document.getElementById('__NEXT_DATA__');
    if (!nd) return null;
    try {
      const data = JSON.parse(nd.textContent);
      let found = null;
      const walk = (node, depth) => {
        if (!node || typeof node !== 'object' || depth > 12 || found) return;
        if (node.origin && node.url && (node.name || node.strain_name)) { found = node; return; }
        for (const key of Object.keys(node)) {
          const v = node[key];
          if (v && typeof v === 'object') walk(v, depth + 1);
          if (found) return;
        }
      };
      walk(data, 0);
      if (!found) return null;
      return { origin: normOrigin(found.origin), name: found.name, slug: found.url };
    } catch (e) { return null; }
  }

  function injectDetailBadge() {
    if (!/^\/product\/[^/]+/.test(location.pathname)) return;
    if (document.querySelector('.fx-detail-line')) return;
    const info = detailInfo();
    if (!info) return;
    const h1 = document.querySelector('h1');
    if (!h1 || !h1.parentElement) return;

    const line = el('div', 'fx-detail-line');
    const badge = el('button', 'fx-detail-badge');
    badge.type = 'button';
    badge.append(el('span', 'fx-flag', flagOf(info.origin)), el('span', null, 'Herkunft: ' + info.origin));
    badge.title = 'Alle aus ' + info.origin + ' anzeigen';
    badge.addEventListener('click', () => {
      state.visible = PAGE_STEP;
      openOverlay({ origins: new Set([info.origin]) });
      syncURL();
    });
    line.append(badge);
    h1.parentElement.insertBefore(line, h1.nextSibling);
  }

  /* ---------- Boot ---------- */

  function boot() {
    ensureHost();
    showLauncher();

    const params = new URLSearchParams(location.search);
    if (params.get('cat')) state.category = params.get('cat');

    loadUserData();
    loadCategory(state.category, false);
    injectDetailBadge();

    if (params.get('fx') === '1') {
      setTimeout(openOverlay, 250);
    }

    let lastPath = location.pathname + location.search;
    setInterval(() => {
      const now = location.pathname + location.search;
      if (now === lastPath) return;
      lastPath = now;
      if (!state.opened) { showLauncher(); injectDetailBadge(); }
    }, 1200);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (ui.modal && !ui.modal.hidden) { closeModal(); return; }
        if (state.opened) { e.preventDefault(); closeOverlay(); }
      }
      if (e.key === '/' && !state.opened) {
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        openOverlay();
      }
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openOverlay();
      }
    });

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((m) => {
        if (m && m.type === 'FX_OPEN') openOverlay();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
