(function () {
  var config = null;

  function init() {
    fetch('/api/config/public')
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json.ok) return;
        config = json.data || {};
        var enabled = (config.ADSENSE_ENABLED || '').toLowerCase() === 'true';
        var client = (config.ADSENSE_CLIENT || '').trim();
        if (!enabled || !client) return;
        injectScript(client);
        fillSlots(client);
      })
      .catch(function () { /* ads optional */ });
  }

  function injectScript(client) {
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(client);
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }

  function fillSlots(client) {
    var slots = document.querySelectorAll('[data-ad-slot]');
    for (var i = 0; i < slots.length; i++) {
      var section = slots[i];
      var slotName = section.getAttribute('data-ad-slot');
      var slotId = config['ADSENSE_SLOT_' + slotName.toUpperCase()] || '';
      if (!slotId) continue;

      var ins = section.querySelector('ins.adsbygoogle');
      if (!ins) continue;

      ins.setAttribute('data-ad-client', client);
      ins.setAttribute('data-ad-slot', slotId);
      section.style.display = '';

      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) { /* ignore */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
