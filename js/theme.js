(function () {
  'use strict';

  var storageKey = 'fayyaz-theme';
  var root = document.documentElement;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var button;
  var isAnimating = false;

  function storedTheme() {
    try {
      var value = window.localStorage.getItem(storageKey);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function preferredTheme() {
    return storedTheme() || 'light';
  }

  function iconMarkup(theme) {
    if (theme === 'dark') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 15.2A8.5 8.5 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2Z"></path></svg>';
  }

  function updateButton(theme) {
    if (!button) return;
    var nextTheme = theme === 'dark' ? 'light' : 'dark';
    button.innerHTML = iconMarkup(theme);
    button.setAttribute('aria-label', 'Switch to ' + nextTheme + ' mode');
    button.setAttribute('title', 'Switch to ' + nextTheme + ' mode');
    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    updateButton(theme);
    if (persist) {
      try {
        window.localStorage.setItem(storageKey, theme);
      } catch (error) {
        /* The theme still works when storage is unavailable. */
      }
    }
  }

  function switchTheme() {
    if (isAnimating) return;

    var current = root.getAttribute('data-theme') || preferredTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    var shouldReduce = reducedMotion && reducedMotion.matches;

    if (shouldReduce || !Element.prototype.animate) {
      applyTheme(next, true);
      return;
    }

    isAnimating = true;
    var rect = button.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var farthestX = Math.max(x, window.innerWidth - x);
    var farthestY = Math.max(y, window.innerHeight - y);
    var scale = Math.hypot(farthestX, farthestY) / 12 + 1;
    var circle = document.createElement('div');

    circle.className = 'theme-transition-circle';
    circle.style.left = x + 'px';
    circle.style.top = y + 'px';
    document.body.appendChild(circle);

    if (current === 'dark') {
      circle.style.background = '#101114';
      circle.style.transform = 'scale(' + scale + ')';

      var collapse = circle.animate(
        [
          { transform: 'scale(' + scale + ')', opacity: 1 },
          { transform: 'scale(0)', opacity: 1 }
        ],
        {
          duration: 560,
          easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
          fill: 'forwards'
        }
      );

      /* The full-size dark circle conceals the light theme until it shrinks. */
      applyTheme(next, true);

      collapse.finished.then(function () {
        circle.remove();
        isAnimating = false;
      }).catch(function () {
        circle.remove();
        isAnimating = false;
      });
      return;
    }

    circle.style.background = '#101114';
    var expand = circle.animate(
      [
        { transform: 'scale(0)', opacity: 1 },
        { transform: 'scale(' + scale + ')', opacity: 1 }
      ],
      {
        duration: 560,
        easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
        fill: 'forwards'
      }
    );

    expand.finished.then(function () {
      applyTheme(next, true);
      requestAnimationFrame(function () {
        circle.remove();
        isAnimating = false;
      });
    }).catch(function () {
      applyTheme(next, true);
      circle.remove();
      isAnimating = false;
    });
  }

  /* Apply before the body is parsed to prevent a light-mode flash. */
  applyTheme(preferredTheme(), false);

  function mount() {
    if (document.querySelector('.theme-toggle')) return;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.addEventListener('click', switchTheme);
    document.body.appendChild(button);
    updateButton(root.getAttribute('data-theme') || preferredTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.addEventListener('storage', function (event) {
    if (event.key === storageKey && (event.newValue === 'light' || event.newValue === 'dark')) {
      applyTheme(event.newValue, false);
    }
  });
})();
