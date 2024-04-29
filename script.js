document.getElementById('tokenForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const token = document.getElementById('token').value;

    fetch('/log-messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: token })
    })
    .then(response => response.text())
    .then(message => {
        alert(message);
    })
    .catch(error => {
        console.error('Error:', error);
    });
});
