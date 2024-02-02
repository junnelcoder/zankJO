function submitForm(jobOrderNo) {
    var jobOrderID = document.getElementById(`JobOrderID_${jobOrderNo}`).value;
    jobOrderIDsArray.push(jobOrderID);
    localStorage.setItem('jobOrderID', jobOrderID);
    window.location.href = "joborderview.html";
}
function retrieveLocal(){
    var storedData = localStorage.getItem('jobOrderID');
    // Check if data exists
    if (storedData !== null) {
    // Use the retrieved data
    console.log('Retrieved data:', storedData);
    } else {
    console.log('No data found in localStorage');
    }
}