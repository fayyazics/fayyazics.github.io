(function() {
  'use strict';

  var lightbox = document.getElementById('photo-lightbox');
  var tiles = document.querySelectorAll('.photo-tile');
  var closeBtn = lightbox && lightbox.querySelector('.photo-lightbox-close');
  var prevBtn = lightbox && lightbox.querySelector('.photo-lightbox-prev');
  var nextBtn = lightbox && lightbox.querySelector('.photo-lightbox-next');
  var img = lightbox && lightbox.querySelector('.photo-lightbox-content img');
  var titleEl = lightbox && lightbox.querySelector('.photo-lightbox-title');
  var currentIndex = 0;
  var photos = [];

  function init() {
    if (!lightbox || !tiles.length) return;

    photos = Array.from(tiles).map(function(tile) {
      var imgEl = tile.querySelector('img');
      return {
        src: imgEl ? imgEl.src : '',
        title: tile.getAttribute('data-title') || ''
      };
    });

    tiles.forEach(function(tile, i) {
      tile.addEventListener('click', function(e) {
        e.preventDefault();
        openLightbox(i);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', function() { navigate(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { navigate(1); });

    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function(e) {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });
  }

  function openLightbox(index) {
    currentIndex = index;
    showPhoto();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showPhoto() {
    var p = photos[currentIndex];
    if (!p || !img) return;
    img.src = p.src;
    img.alt = p.title;
    if (titleEl) titleEl.textContent = p.title;
  }

  function navigate(delta) {
    currentIndex = (currentIndex + delta + photos.length) % photos.length;
    showPhoto();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
