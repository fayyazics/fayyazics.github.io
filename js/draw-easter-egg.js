(function() {
  'use strict';

  var PRESET_COLORS = ['#8B9A8B', '#1a1a1a', '#0052cc', '#e6352f', '#36b37e', '#ffab00', '#6554c0'];
  var DRAWABLE_SELECTOR = 'a, button, input, [role="button"], [tabindex="0"]';

  function isClickable(el) {
    if (!el) return false;
    var clickable = el.closest(DRAWABLE_SELECTOR);
    var toolbar = el.closest('.draw-toolbar');
    var popover = el.closest('.draw-color-popover');
    return clickable || toolbar || popover;
  }

  function getCoords(e) {
    return { x: e.clientX, y: e.clientY };
  }

  var mobileQuery = window.matchMedia('(max-width: 640px)');

  function isMobile() {
    return mobileQuery.matches;
  }

  function init() {
    var drawModeEnabled = !isMobile();
    var canvas = document.createElement('canvas');
    canvas.className = 'draw-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var drawing = false;
    var lastPoint = null;
    var hasDrawnThisStroke = false;
    var currentColor = PRESET_COLORS[0];
    var eraserMode = false;
    var lineWidth = 2.5;
    var undoStack = [];

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);

    function draw(x, y) {
      if (!ctx) return;
      hasDrawnThisStroke = true;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = eraserMode ? 24 : lineWidth;
      if (eraserMode) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
      }
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPoint = { x: x, y: y };
    }

    function canDraw() {
      return !isMobile() || drawModeEnabled;
    }

    function handleStart(e) {
      if (!canDraw()) return;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      if (isClickable(el)) return;
      e.preventDefault();
      hasDrawnThisStroke = false;
      if (!drawing) {
        try {
          undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        } catch (err) { /* canvas may be empty */ }
      }
      drawing = true;
      lastPoint = getCoords(e);
    }

    function handleMove(e) {
      var el = document.elementFromPoint(e.clientX, e.clientY);
      if (canDraw()) {
        document.body.classList.toggle('draw-mode', !isClickable(el));
      } else {
        document.body.classList.remove('draw-mode');
      }
      if (drawing && lastPoint) {
        var coords = getCoords(e);
        draw(coords.x, coords.y);
      }
    }

    function handleEnd() {
      if (!hasDrawnThisStroke && undoStack.length > 0) {
        undoStack.pop();
      }
      drawing = false;
      lastPoint = null;
    }

    function undo() {
      if (undoStack.length === 0) return;
      var prev = undoStack.pop();
      ctx.putImageData(prev, 0, 0);
    }

    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    });

    document.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('mouseleave', handleEnd);

    // Touch support
    function getTouchCoords(te) {
      var t = te.touches[0] || te.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    document.addEventListener('touchstart', function(e) {
      if (!canDraw()) return;
      var el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
      if (isClickable(el)) return;
      e.preventDefault();
      hasDrawnThisStroke = false;
      if (!drawing) {
        try {
          undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        } catch (err) { /* canvas may be empty */ }
      }
      drawing = true;
      lastPoint = getTouchCoords(e);
    }, { passive: false });
    document.addEventListener('touchmove', function(e) {
      if (!canDraw()) return;
      if (drawing && lastPoint) {
        e.preventDefault();
        var coords = getTouchCoords(e);
        draw(coords.x, coords.y);
      }
    }, { passive: false });
    document.addEventListener('touchend', handleEnd);

    // Toolbar
    var toolbar = document.createElement('div');
    toolbar.className = 'draw-toolbar';
    toolbar.innerHTML = [
      '<button class="draw-toggle-btn" title="Tap to draw on the page" aria-label="Toggle draw mode" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>',
      '<span class="draw-divider draw-toggle-divider"></span>',
      '<div class="draw-colors">',
      PRESET_COLORS.map(function(c, i) {
        return '<button class="draw-color-swatch' + (i === 0 ? ' active' : '') + '" data-color="' + c + '" style="background:' + c + '" title="Color ' + (i + 1) + '"></button>';
      }).join(''),
      '</div>',
      '<div class="draw-color-picker-wrap">',
      '<button class="draw-color-wheel-btn" title="Pick color" aria-label="Pick custom color"></button>',
      '<div class="draw-color-popover" id="draw-color-popover">',
      '<input type="color" value="' + currentColor + '" id="draw-color-input">',
      '</div>',
      '</div>',
      '<span class="draw-divider"></span>',
      '<button class="draw-eraser-btn" title="Eraser — remove drawings" aria-label="Eraser — remove drawings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 21h10"/><path d="M5 11l4-4 8 8-4 4-4-4"/><path d="M19 15l-4-4"/></svg></button>',
      '<button class="draw-clear-btn" title="Clear all drawings — reset canvas" aria-label="Clear all drawings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>'
    ].join('');

    document.body.appendChild(toolbar);

    var toggleBtn = toolbar.querySelector('.draw-toggle-btn');
    var mobileHint = null;

    function dismissHint() {
      if (!mobileHint) return;
      mobileHint.classList.remove('visible');
      try { localStorage.setItem('draw-hint-seen', '1'); } catch (err) { /* private browsing */ }
    }

    function updateDrawModeUI() {
      toggleBtn.classList.toggle('active', drawModeEnabled);
      toggleBtn.setAttribute('aria-pressed', drawModeEnabled ? 'true' : 'false');
      toggleBtn.title = drawModeEnabled
        ? 'Draw mode on — tap to scroll'
        : 'Tap to draw on the page';
      document.body.classList.toggle('draw-enabled', drawModeEnabled);
      if (!canDraw()) {
        document.body.classList.remove('draw-mode');
        handleEnd();
      }
    }

    toggleBtn.addEventListener('click', function() {
      drawModeEnabled = !drawModeEnabled;
      updateDrawModeUI();
      dismissHint();
    });

    if (isMobile()) {
      try {
        if (!localStorage.getItem('draw-hint-seen')) {
          mobileHint = document.createElement('div');
          mobileHint.className = 'draw-mobile-hint';
          mobileHint.textContent = 'Tap the pencil to doodle';
          mobileHint.setAttribute('role', 'status');
          document.body.appendChild(mobileHint);
          requestAnimationFrame(function() {
            mobileHint.classList.add('visible');
          });
        }
      } catch (err) { /* private browsing */ }
    }

    mobileQuery.addEventListener('change', function(e) {
      if (e.matches) {
        drawModeEnabled = false;
      } else {
        drawModeEnabled = true;
      }
      updateDrawModeUI();
    });

    updateDrawModeUI();

    var swatches = toolbar.querySelectorAll('.draw-color-swatch');
    var wheelBtn = toolbar.querySelector('.draw-color-wheel-btn');
    var popover = toolbar.querySelector('.draw-color-popover');
    var colorInput = toolbar.querySelector('#draw-color-input');
    var eraserBtn = toolbar.querySelector('.draw-eraser-btn');
    var clearBtn = toolbar.querySelector('.draw-clear-btn');

    swatches.forEach(function(sw) {
      sw.addEventListener('click', function() {
        eraserMode = false;
        document.body.classList.remove('eraser-mode');
        eraserBtn.classList.remove('active');
        currentColor = sw.dataset.color;
        colorInput.value = currentColor;
        swatches.forEach(function(s) { s.classList.remove('active'); });
        sw.classList.add('active');
        popover.classList.remove('open');
      });
    });

    wheelBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      popover.classList.toggle('open');
    });

    colorInput.addEventListener('input', function() {
      currentColor = colorInput.value;
      eraserMode = false;
      document.body.classList.remove('eraser-mode');
      eraserBtn.classList.remove('active');
      swatches.forEach(function(s) { s.classList.remove('active'); });
    });

    eraserBtn.addEventListener('click', function() {
      eraserMode = !eraserMode;
      document.body.classList.toggle('eraser-mode', eraserMode);
      eraserBtn.classList.toggle('active', eraserMode);
      popover.classList.remove('open');
    });

    clearBtn.addEventListener('click', function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      undoStack = [];
      popover.classList.remove('open');
    });

    document.addEventListener('click', function(e) {
      var wrap = toolbar.querySelector('.draw-color-picker-wrap');
      if (!wrap.contains(e.target)) {
        popover.classList.remove('open');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
