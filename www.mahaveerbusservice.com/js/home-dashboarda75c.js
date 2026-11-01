document.addEventListener('DOMContentLoaded', function () {
  var dashSection = document.getElementById('loggedInDashboard');
  var dashBody = document.getElementById('loggedInDashboardBody');
  if (!dashSection) return;

  dashSection.hidden = true;
  if (dashBody) dashBody.hidden = true;
  document.documentElement.classList.remove('hd-logged-in', 'hd-checking');
});
