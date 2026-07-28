(function() {
  'use strict';

  var canvas = document.querySelector('.solar-flare');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var frameId = null;
  var width = 0;
  var height = 0;
  var pixelRatio = 1;

  var ribbons = [
    { x: -0.05, reach: 0.45, rise: 1.02, width: 150, speed: 0.44, phase: 0.2, alpha: 0.26, from: [198, 203, 205], to: [70, 78, 82] },
    { x: 0.00, reach: 0.34, rise: 0.68, width: 105, speed: 0.54, phase: 1.7, alpha: 0.24, from: [38, 42, 44], to: [192, 198, 200] },
    { x: 0.04, reach: 0.54, rise: 0.52, width: 130, speed: 0.36, phase: 3.2, alpha: 0.2, from: [139, 146, 148], to: [220, 223, 224] },
    { x: -0.02, reach: 0.27, rise: 1.12, width: 72, speed: 0.62, phase: 4.4, alpha: 0.21, from: [225, 228, 229], to: [20, 22, 23] },
    { x: 0.08, reach: 0.42, rise: 0.76, width: 86, speed: 0.49, phase: 5.6, alpha: 0.19, from: [170, 176, 178], to: [55, 61, 64] },
    { x: -0.08, reach: 0.62, rise: 0.4, width: 175, speed: 0.31, phase: 2.5, alpha: 0.16, from: [28, 31, 33], to: [145, 151, 153] }
  ];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function mixColor(from, to, amount) {
    return [
      Math.round(from[0] + (to[0] - from[0]) * amount),
      Math.round(from[1] + (to[1] - from[1]) * amount),
      Math.round(from[2] + (to[2] - from[2]) * amount)
    ];
  }

  function rgba(color, alpha) {
    return 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + alpha + ')';
  }

  function drawRibbon(ribbon, time) {
    var wave = 0.5 + 0.5 * Math.sin(time * ribbon.speed + ribbon.phase);
    var breath = wave * wave * (3 - 2 * wave);
    var colorShift = 0.5 + 0.5 * Math.sin(time * 0.16 + ribbon.phase * 0.7);
    var color = mixColor(ribbon.from, ribbon.to, colorShift);
    var highlight = mixColor(color, [248, 249, 249], 0.58);
    var startX = width * ribbon.x - ribbon.width * 0.35;
    var reach = width * ribbon.reach * (0.58 + breath * 0.42);
    var rise = height * ribbon.rise * (0.48 + breath * 0.52);
    var sway = Math.sin(time * ribbon.speed * 0.72 + ribbon.phase) * width * 0.035;
    var tipX = startX + reach + sway;
    var tipY = height - rise;
    var ribbonWidth = ribbon.width * (0.84 + breath * 0.22);

    var gradient = ctx.createLinearGradient(startX, height, tipX, tipY);
    gradient.addColorStop(0, rgba(color, ribbon.alpha * 0.92));
    gradient.addColorStop(0.24, rgba(highlight, ribbon.alpha * 1.55));
    gradient.addColorStop(0.34, rgba(highlight, ribbon.alpha * 1.18));
    gradient.addColorStop(0.48, rgba(color, ribbon.alpha));
    gradient.addColorStop(0.72, rgba(color, ribbon.alpha * 0.46));
    gradient.addColorStop(1, rgba(color, 0));

    ctx.beginPath();
    ctx.moveTo(startX - ribbonWidth, height + ribbonWidth);
    ctx.bezierCurveTo(
      startX + reach * 0.08,
      height - rise * 0.14,
      tipX - reach * 0.3,
      tipY + rise * 0.18,
      tipX,
      tipY
    );
    ctx.bezierCurveTo(
      tipX - reach * 0.22,
      tipY + rise * 0.2 + ribbonWidth * 0.28,
      startX + reach * 0.12,
      height - rise * 0.04 + ribbonWidth,
      startX - ribbonWidth,
      height + ribbonWidth
    );
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.filter = 'blur(' + Math.round(7 + ribbonWidth * 0.045) + 'px)';
    ctx.fill();

    var shine = ctx.createLinearGradient(startX, height, tipX, tipY);
    shine.addColorStop(0, 'rgba(255,255,255,0)');
    shine.addColorStop(0.2, rgba(highlight, ribbon.alpha * 1.7));
    shine.addColorStop(0.48, rgba(highlight, ribbon.alpha * 0.72));
    shine.addColorStop(0.82, 'rgba(255,255,255,0)');

    ctx.beginPath();
    ctx.moveTo(startX - ribbonWidth * 0.12, height + ribbonWidth * 0.15);
    ctx.bezierCurveTo(
      startX + reach * 0.08,
      height - rise * 0.14,
      tipX - reach * 0.3,
      tipY + rise * 0.18,
      tipX,
      tipY
    );
    ctx.strokeStyle = shine;
    ctx.lineWidth = Math.max(5, ribbonWidth * 0.075);
    ctx.lineCap = 'round';
    ctx.filter = 'blur(4px)';
    ctx.stroke();
  }

  function draw(timeMs) {
    var time = timeMs * 0.001;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    ribbons.forEach(function(ribbon) {
      drawRibbon(ribbon, time);
    });

    var glow = ctx.createRadialGradient(0, height, 0, 0, height, Math.min(width, height) * 0.55);
    glow.addColorStop(0, 'rgba(70,78,82,0.075)');
    glow.addColorStop(0.38, 'rgba(20,22,23,0.035)');
    glow.addColorStop(1, 'rgba(198,203,205,0)');
    ctx.filter = 'blur(18px)';
    ctx.fillStyle = glow;
    ctx.fillRect(0, height * 0.42, width * 0.62, height * 0.58);
    ctx.filter = 'none';
  }

  function animate(time) {
    draw(time);
    frameId = requestAnimationFrame(animate);
  }

  function updateMotion() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }

    if (reducedMotion.matches) {
      draw(6400);
    } else {
      frameId = requestAnimationFrame(animate);
    }
  }

  window.addEventListener('resize', function() {
    resize();
    if (reducedMotion.matches) draw(6400);
  });

  document.addEventListener('visibilitychange', function() {
    if (document.hidden && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    } else if (!document.hidden && !reducedMotion.matches && frameId === null) {
      frameId = requestAnimationFrame(animate);
    }
  });

  reducedMotion.addEventListener('change', updateMotion);
  resize();
  updateMotion();
})();
