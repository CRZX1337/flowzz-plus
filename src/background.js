const api = typeof browser !== 'undefined' ? browser : chrome;

const PRICE_PATH = { flowers: '2', extracts: '3', edibles: '4' };
const ALARM = 'fx_price_check';

api.action.onClicked.addListener(async (tab) => {
  if (tab && tab.id != null && tab.url && tab.url.startsWith('https://flowzz.com/')) {
    try {
      await api.tabs.sendMessage(tab.id, { type: 'FX_OPEN' });
      return;
    } catch (e) {
      // Content-Script noch nicht bereit – Fallback unten
    }
  }
  api.tabs.create({ url: 'https://flowzz.com/product?fx=1' });
});

async function getAlerts() {
  const data = await api.storage.local.get('fx_alerts');
  const alerts = data && data.fx_alerts;
  return alerts && typeof alerts === 'object' ? alerts : {};
}

async function loadPrices(cat, ids) {
  const path = PRICE_PATH[cat] || PRICE_PATH.flowers;
  const res = await fetch(`https://flowzz.com/api/v1/views/vendors/prices/${path}/${ids.join(',')}`, {
    credentials: 'include',
    headers: { accept: 'application/json' }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const rows = Array.isArray(json.data) ? json.data : [];
  const mins = new Map();
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const pid = Number(row[0]);
    const price = Number(row[1]);
    const avail = Number(row[2]) === 1;
    if (!pid || !price || !avail) continue;
    if (!mins.has(pid) || price < mins.get(pid)) mins.set(pid, price);
  }
  return mins;
}

async function checkAlerts() {
  const alerts = await getAlerts();
  const entries = Object.values(alerts).filter((a) => a && a.id && a.target != null);
  if (!entries.length) return;

  const groups = {};
  for (const a of entries) {
    const cat = PRICE_PATH[a.cat] ? a.cat : 'flowers';
    (groups[cat] = groups[cat] || []).push(a);
  }

  let changed = false;
  for (const [cat, list] of Object.entries(groups)) {
    try {
      const mins = await loadPrices(cat, list.map((a) => a.id));
      for (const a of list) {
        const price = mins.get(Number(a.id));
        if (price == null) continue;
        a.lastPrice = price;
        a.updatedAt = Date.now();
        changed = true;
        const due = !a.notifiedAt || Date.now() - a.notifiedAt > 24 * 60 * 60 * 1000;
        if (price <= a.target && due) {
          a.notifiedAt = Date.now();
          try {
            api.notifications.create('fx-alert-' + a.id, {
              type: 'basic',
              iconUrl: api.runtime.getURL('icons/icon128.png'),
              title: 'flowzz+ Preisalarm',
              message: `${a.name}: jetzt ${price.toFixed(2).replace('.', ',')} € / g (Ziel ${Number(a.target).toFixed(2).replace('.', ',')} €)`,
              priority: 1
            });
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) {
      // Netzwerkfehler: beim nächsten Lauf erneut versuchen
    }
  }

  if (changed) await api.storage.local.set({ fx_alerts: alerts });
}

function schedule() {
  try {
    api.alarms.create(ALARM, { periodInMinutes: 180, delayInMinutes: 1 });
  } catch (e) { /* ignore */ }
}

if (api.runtime && api.runtime.onInstalled) api.runtime.onInstalled.addListener(schedule);
if (api.runtime && api.runtime.onStartup) api.runtime.onStartup.addListener(() => { schedule(); checkAlerts(); });
if (api.alarms && api.alarms.onAlarm) {
  api.alarms.onAlarm.addListener((alarm) => { if (alarm && alarm.name === ALARM) checkAlerts(); });
}
if (api.notifications && api.notifications.onClicked) {
  api.notifications.onClicked.addListener((id) => {
    if (!id || !id.startsWith('fx-alert-')) return;
    api.tabs.create({ url: 'https://flowzz.com/product?fx=1&fav=1' });
    api.notifications.clear(id);
  });
}
schedule();
