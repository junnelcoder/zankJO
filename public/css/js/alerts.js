function showSwal(type, callback) {
  // Configure SweetAlert based on the type
  let config;

  if (type === 'success-message') {
    config = {
      title: 'Success!',
      text: 'Login successful.',
      icon: 'success',
      confirmButtonColor: '#3f51b5',
      confirmButtonText: 'OK',
    };
  } else if (type === 'warning-message-and-cancel') {
    config = {
      title: 'Are you sure?',
      text: 'Invalid password or username!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3f51b5',
      cancelButtonColor: '#ff4081',
      confirmButtonText: 'Great',
    };
  } else if (type === 'error-message') {
    config = {
      title: 'Error!',
      text: 'Failed to login. Please check your credentials.',
      icon: 'error',
      confirmButtonColor: '#ff4081',
      confirmButtonText: 'OK',
    };
  } else if (type === 'unauthorized-error') {
    // Handle 401 Unauthorized error
    config = {
      title: 'Unauthorized',
      text: 'Invalid username or password.',
      icon: 'error',
      confirmButtonColor: '#ff4081',
      confirmButtonText: 'OK',
    };
  }

  // Show the SweetAlert
  Swal.fire(config).then((result) => {
    if (result.isConfirmed) {
      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  });
}
