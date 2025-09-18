// Bridge content script injected on du-north pages
(function(){
  console.log('[StudyHackz] Bridge script ready');
  window.addEventListener('message', async (event) => {
    if (!event.data || !event.data.__SHX) return;
    const { type, payload, reqId } = event.data.__SHX;
    try {
      const res = await chrome.runtime.sendMessage({ type, ...payload });
      window.postMessage({ __SHX_RES: { reqId, ok: true, data: res } }, '*');
    } catch(e) {
      window.postMessage({ __SHX_RES: { reqId, ok: false, error: String(e.message || e) } }, '*');
    }
  });
})();
