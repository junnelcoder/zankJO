// Function to include HTML content using AJAX
function includeHTML(url, containerId) {
    var container = document.getElementById(containerId);

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            container.innerHTML = xhr.responseText;
        }
    };

    xhr.open("GET", url, true);
    xhr.send();
}

// Include sidebar.html in the specified container
includeHTML('navigations/sidebar.html', 'sidebar-container');

// Function to include HTML content using AJAX
function includeHTML(url, containerId) {
    var container = document.getElementById(containerId);

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            container.innerHTML = xhr.responseText;
        }
    };

    xhr.open("GET", url, true);
    xhr.send();
}

// Include sidebar.html in the specified container
includeHTML('navigations/header.html', 'header-container');


  // Check if the user is authenticated
  function checkAuthentication() {
    // Check if the user is authenticated
    const isAuthenticated = localStorage.getItem('auth') === 'true';

    // Define the base path for protected routes
    const basePath = '/pages/content';

    // Get the current path without the base path
    const currentPath = window.location.pathname.substring(basePath.length);

    // Redirect to login if not authenticated and trying to access a protected route
    if (!isAuthenticated && currentPath.startsWith('/')) {
      window.location.href = '/pages/login.html';
    }
  }

  // Check authentication on initial page load
  checkAuthentication();

  // Add an event listener for the pageshow event
  window.addEventListener('pageshow', function (event) {
    // Check authentication when the page is shown
    checkAuthentication();
  });
function windowBack(){ 
  localStorage.clear();
  window.location.href="/";
}
function logout() {
  // Retrieve user ID from localStorage
  const userId = localStorage.getItem('userId');

  // Make an AJAX request to logout endpoint
  $.ajax({
      type: 'GET',
      url: '/logout',
      data: { userId: userId },
      success: function(response) {
          // Clear localStorage and redirect the user to the login page
          localStorage.clear();
          window.location.href = '/';
      },
      error: function(xhr, status, error) {
          console.error('Error during logout:', error);
          // Handle error response if needed
      }
  });
}

function closeDropdown() {
  $('.dropdown-menu.settings').dropdown('hide');
}

function rotateArrow() {
  var arrowDown = document.getElementById("arrowDown");
  var arrowUp = document.getElementById("arrowUp");

  arrowDown.style.display = arrowDown.style.display === "none" ? "block" : "none";
  arrowUp.style.display = arrowUp.style.display === "none" ? "block" : "none";
  
}