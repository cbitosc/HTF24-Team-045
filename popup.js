document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['trustScore', 'scoreBreakdown', 'alertThreshold'], (result) => {
        document.getElementById('score').innerText = `Trust Score: ${result.trustScore || 'N/A'}/100`;
        document.getElementById('ssl-score').innerText = `${result.scoreBreakdown?.ssl || 0}/30`;
        document.getElementById('reputation-score').innerText = `${result.scoreBreakdown?.reputation || 0}/40`;
        document.getElementById('age-score').innerText = `${result.scoreBreakdown?.age || 0}/30`;
        document.getElementById('threshold').value = result.alertThreshold || 50;
    });

    document.getElementById('saveThreshold').addEventListener('click', () => {
        const threshold = parseInt(document.getElementById('threshold').value, 10);
        chrome.storage.local.set({ alertThreshold: threshold }, () => {
            alert('Alert threshold saved!');
        });
    });
});





