const defaults = {
  targetLang: 'zh-CN',
  layout: 'horizontal',
  translatedFirst: true,
  splitRatio: 50,
  scrollSync: false
};

function showSaved() {
  const el = document.getElementById('saved');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
}

function save() {
  const prefs = {
    targetLang: document.getElementById('targetLang').value,
    layout: document.querySelector('input[name="layout"]:checked').value,
    translatedFirst: document.querySelector('input[name="translatedFirst"]:checked').value === 'true',
    splitRatio: parseInt(document.getElementById('splitRatio').value),
    scrollSync: document.getElementById('scrollSync').checked
  };
  chrome.storage.sync.set(prefs, showSaved);
}

async function load() {
  const prefs = await chrome.storage.sync.get(defaults);
  document.getElementById('targetLang').value = prefs.targetLang;
  document.querySelector('input[name="layout"][value="' + prefs.layout + '"]').checked = true;
  document.querySelector('input[name="translatedFirst"][value="' + prefs.translatedFirst + '"]').checked = true;
  document.getElementById('splitRatio').value = prefs.splitRatio;
  document.getElementById('ratioVal').textContent = prefs.splitRatio;
  document.getElementById('scrollSync').checked = prefs.scrollSync;
}

document.getElementById('splitRatio').addEventListener('input', function(e) {
  document.getElementById('ratioVal').textContent = e.target.value;
});

document.querySelectorAll('input, select').forEach(function(el) {
  el.addEventListener('change', save);
});

load();
