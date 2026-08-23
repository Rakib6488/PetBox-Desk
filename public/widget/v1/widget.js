(function () {
  if (window.__petboxDeskWidgetLoaded) return;
  window.__petboxDeskWidgetLoaded = true;

  var script = document.currentScript;
  var widgetOrigin = script && script.src ? new URL(script.src).origin : window.location.origin;
  var theme = (script && script.dataset.theme) || '#0B78C9';
  var logoUrl = widgetOrigin + '/petbox-live-chat-logo.svg';

  var style = document.createElement('style');
  style.textContent = [
    '.petbox-widget-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483000;border:0;border-radius:999px;background:' + theme + ';color:#fff;padding:12px 16px;font:600 14px Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer}',
    '.petbox-widget-panel{position:fixed;right:20px;bottom:76px;z-index:2147483000;width:320px;overflow:hidden;border:1px solid #dbe3ea;border-radius:12px;background:#fff;box-shadow:0 14px 40px rgba(15,23,42,.22);font-family:Arial,sans-serif}',
    '.petbox-widget-header{display:flex;align-items:center;gap:9px;background:' + theme + ';color:#fff;padding:12px 14px;font-size:14px;font-weight:700}',
    '.petbox-widget-logo{width:26px;height:26px;border-radius:50%;background:#0B3442;padding:4px;box-sizing:border-box}',
    '.petbox-widget-body{padding:18px;color:#475569;font-size:13px;line-height:1.5}',
    '.petbox-widget-close{margin-left:auto;border:0;background:transparent;color:#fff;font-size:18px;cursor:pointer}',
    '@media(max-width:480px){.petbox-widget-panel{right:12px;bottom:70px;width:calc(100vw - 24px)}.petbox-widget-launcher{right:12px;bottom:12px}}'
  ].join('');
  document.head.appendChild(style);

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'petbox-widget-launcher';
  launcher.textContent = 'Chat with us';

  var panel = document.createElement('section');
  panel.className = 'petbox-widget-panel';
  panel.hidden = true;
  panel.innerHTML = '<div class="petbox-widget-header"><img class="petbox-widget-logo" src="' + logoUrl + '" alt="Petbox Desk"><span>Petbox Desk</span><button class="petbox-widget-close" type="button" aria-label="Close">×</button></div><div class="petbox-widget-body">Hello! How can we help you today?</div>';

  launcher.addEventListener('click', function () { panel.hidden = !panel.hidden; });
  panel.querySelector('.petbox-widget-close').addEventListener('click', function () { panel.hidden = true; });
  document.body.appendChild(launcher);
  document.body.appendChild(panel);
})();
