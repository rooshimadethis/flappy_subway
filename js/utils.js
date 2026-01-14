// Error Logger Helper
export function logError(error) {
    console.error(error);
    let errDiv = document.getElementById('error-display');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.id = 'error-display';
        document.body.appendChild(errDiv);
    }
    errDiv.style.display = 'block';
    errDiv.textContent = 'Error: ' + error.message;
}
