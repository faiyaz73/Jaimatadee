// Homepage "More Services" widget: shows the first available operator
// service (crane hire etc.) as a feature block, same section as Tour/
// Luggage. MRL-only for now (data-tenant-only="mrl" on the block itself),
// but entirely data-driven - whatever the API returns is what renders,
// no service is hard-coded.
document.addEventListener('DOMContentLoaded', function () {
  var block = document.getElementById('homeOtherService');
  if (!block || !window.apiV1 || !window.apiV1.getServices) return;

  var imageEl = document.getElementById('homeOtherServiceImage');
  var titleEl = document.getElementById('homeOtherServiceTitle');
  var descEl = document.getElementById('homeOtherServiceDesc');
  var ctaEl = document.getElementById('homeOtherServiceCta');

  function isHindi() {
    return window.i18n && window.i18n.getLang && window.i18n.getLang() === 'hi';
  }

  window.apiV1.getServices()
    .then(function (data) {
      var services = (data && data.services) || [];
      if (!services.length) return;

      var service = services[0];
      var title = (isHindi() && service.title_hindi) ? service.title_hindi : service.title;
      var desc = (isHindi() && service.description_hindi) ? service.description_hindi : service.description;

      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = desc || service.tagline || '';
      if (ctaEl) ctaEl.href = 'service-detail02ee.html?slug=' + encodeURIComponent(service.slug);

      if (imageEl) {
        if (service.image_url) {
          imageEl.src = service.image_url;
          imageEl.alt = title;
        } else {
          imageEl.remove();
        }
      }

      block.classList.add('is-visible');
    })
    .catch(function () { /* leave block hidden on error */ });
});
