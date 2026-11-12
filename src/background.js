const api = typeof browser !== 'undefined' ? browser : chrome;

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
