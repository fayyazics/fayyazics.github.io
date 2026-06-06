(function() {
  'use strict';

  var lightbox = document.getElementById('musings-lightbox');
  if (!lightbox) return;

  var backdrop = lightbox.querySelector('.musings-lightbox-backdrop');
  var closeBtn = lightbox.querySelector('.musings-lightbox-close');
  var prevBtn = lightbox.querySelector('.musings-lightbox-prev');
  var nextBtn = lightbox.querySelector('.musings-lightbox-next');
  var img = document.getElementById('musings-lightbox-img');
  var caption = document.getElementById('musings-lightbox-caption');
  var closeDuration = 400;

  var photos = [];
  var currentIndex = 0;

  function getCaption(thumb) {
    var label = thumb.getAttribute('aria-label') || '';
    if (label.indexOf('View ') === 0) return label.slice(5);
    return label;
  }

  function bindGroups() {
    document.querySelectorAll('[data-lightbox-group]').forEach(function(group) {
      var thumbs = Array.prototype.slice.call(group.querySelectorAll('.musings-thumb'));
      thumbs.forEach(function(thumb, index) {
        thumb.addEventListener('click', function() {
          photos = thumbs.map(function(item) {
            var imgEl = item.querySelector('img');
            return {
              src: imgEl ? imgEl.src : '',
              caption: getCaption(item)
            };
          });
          openLightbox(index);
        });
      });
    });
  }

  function updateNav() {
    var showNav = photos.length > 1;
    prevBtn.classList.toggle('is-hidden', !showNav);
    nextBtn.classList.toggle('is-hidden', !showNav);
  }

  function showPhoto() {
    var photo = photos[currentIndex];
    if (!photo || !img) return;
    img.src = photo.src;
    img.alt = photo.caption;
    caption.textContent = photo.caption;
    updateNav();
  }

  function openLightbox(index) {
    currentIndex = index;
    showPhoto();
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('musings-lightbox-open');

    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        lightbox.classList.add('is-open');
      });
    });
  }

  function closeLightbox() {
    if (!lightbox.classList.contains('is-open')) return;

    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');

    setTimeout(function() {
      document.body.classList.remove('musings-lightbox-open');
      img.src = '';
      img.alt = '';
      caption.textContent = '';
    }, closeDuration);
  }

  function navigate(delta) {
    if (photos.length < 2) return;
    currentIndex = (currentIndex + delta + photos.length) % photos.length;
    showPhoto();
  }

  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', function() { navigate(-1); });
  nextBtn.addEventListener('click', function() { navigate(1); });

  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox || e.target === backdrop) closeLightbox();
  });

  document.addEventListener('keydown', function(e) {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });

  bindGroups();
})();
