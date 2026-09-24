(function () {
  var themes = ['amber', 'phosphor', 'arctic', 'lab', 'graphite'];
  var theme;
  try {
    theme = window.localStorage.getItem('oc.theme');
  } catch {
    theme = null;
  }
  if (themes.indexOf(theme) === -1) {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'lab' : 'amber';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
