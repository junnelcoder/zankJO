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

