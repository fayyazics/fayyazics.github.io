(function () {
  var wrap = document.querySelector('.about-trading-card-wrap');
  var card = document.querySelector('.about-trading-card');
  if (!wrap || !card) return;

  var maxTilt = 14;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  function setTilt(clientX, clientY) {
    var rect = wrap.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var centerX = rect.width / 2;
    var centerY = rect.height / 2;
    var rotateY = ((x - centerX) / centerX) * maxTilt;
    var rotateX = ((centerY - y) / centerY) * maxTilt;
    var shineX = (x / rect.width) * 100;
    var shineY = (y / rect.height) * 100;

    card.style.setProperty('--card-tilt-x', rotateX + 'deg');
    card.style.setProperty('--card-tilt-y', rotateY + 'deg');
    card.style.setProperty('--shine-x', shineX + '%');
    card.style.setProperty('--shine-y', shineY + '%');
  }

  function resetTilt() {
    wrap.classList.remove('is-tilting');
    card.style.setProperty('--card-tilt-x', '0deg');
    card.style.setProperty('--card-tilt-y', '0deg');
    card.style.setProperty('--shine-x', '50%');
    card.style.setProperty('--shine-y', '50%');
  }

  wrap.addEventListener('mousemove', function (e) {
    wrap.classList.add('is-tilting');
    setTilt(e.clientX, e.clientY);
  });

  wrap.addEventListener('mouseleave', resetTilt);
})();
