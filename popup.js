async function sendMessageToActiveTab(message, obj) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return await chrome.tabs.sendMessage(tab.id, {message: message, obj: obj});
}

var statsButton = document.getElementById('statsButton');
var statsPopup = document.getElementById('statsPopup');
var statsDataContainer = document.getElementById('statsDataContainer');

document.addEventListener('DOMContentLoaded', function() {
  const loadButton = document.getElementById('load');
  const saveButton = document.getElementById('save');
  const parseButton = document.getElementById('parse');
  const languageSelect = document.getElementById('language');
  const knownButton = document.getElementById('mark_known');
  statsButton = document.getElementById('statsButton');
  statsPopup = document.getElementById('statsPopup');
  statsDataContainer = document.getElementById('statsDataContainer');

  loadButton.addEventListener('click', function() {
    // Load notes logic here
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const notes = JSON.parse(e.target.result);
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              chrome.tabs.sendMessage(tabs[0].id, {message: "load_notes", notes: notes}, function(responce){
                console.log(responce);
              });
            });

          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        }
        reader.readAsText(file);
      }
    });

    input.click();
  });

  saveButton.addEventListener('click', function() {
    // Save notes logic here

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {message: "save_notes"}, function(response){
        // Get the notes from the background script
        const notes = response.notes;

        if (notes) {
          const json = JSON.stringify(notes);
          const blob = new Blob([json], {type: "application/json"});
          const url = URL.createObjectURL(blob);
          const filename = "language_notes.json";

          chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
          });
        } else {
          console.error('No notes to save.');
        }
      });
    });
  });

  parseButton.addEventListener('click', function() {
    const selectedLanguage = languageSelect.value;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {message: "parse_notes", language: selectedLanguage});
    });
  });

  knownButton.addEventListener('click', function() {
    const selectedLanguage = languageSelect.value;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {message: "mark_known", language: selectedLanguage});
    });
  });
  
  // Close popup if user clicks outside the content area
  statsPopup.addEventListener('click', (event) => {
    // Check if the click was directly on the overlay, not the content inside
    if (event.target === statsPopup) {
      closeStatsPopup();
    }
  });

  statsButton.addEventListener('click', function() {
    const selectedLanguage = languageSelect.value;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {message: "get_stats", language: selectedLanguage}, function(response){
        const stats = response['stats'];
        openStatsPopup(stats);
      });
    });
  });
});


// --- Labels for memory levels ---
const memoryLevelLabels = {
  0: "Unknown",   // Words you don't know
  1: "Learning",  // Seen recently, but still learning
  2: "Familiar",  // Recognise, but might forget details
  3: "Known",     // Comfortable recall
  4: "Mastered"   // Know very well, unlikely to forget
};

/**
 * Generates HTML for a single statistics section (Overall or Page)
 * @param {string} title - The title for the section (e.g., "Overall Progress")
 * @param {object} data - The stats data object for this section (e.g., statsData.full)
 * @returns {string} - The generated HTML string
 */
function createStatsSectionHTML(title, data) {
  let listHTML = '<ul class="stats-list">';
  let totalWords = 0;

  // Ensure levels 0-4 are always considered, even if count is 0
  for (let level = 0; level <= 4; level++) {
    const count = data[level] || 0; // Use 0 if level is missing in data
    const label = memoryLevelLabels[level] || `Level ${level}`; // Fallback label
    listHTML += `<li><strong>${label}:</strong> ${count} words</li>`;
    totalWords += count;
  }

  listHTML += '</ul>';

  const totalHTML = `<div class="stats-total">Total Words Tracked: ${totalWords}</div>`;

  return `
    <div class="stats-section">
      <h3>${title}</h3>
      ${listHTML}
      ${totalHTML}
    </div>
  `;
}

/**
 * Updates the popup content with the fetched stats data
 * @param {object} data - The full stats data object ({ full: {...}, page: {...} })
 */
function displayStatsData(data) {
  if (!data || !data.full || !data.page) {
    statsDataContainer.innerHTML = '<p>Error: Could not load statistics data.</p>';
    return;
  }

  let finalHTML = '';
  finalHTML += createStatsSectionHTML("Overall Progress (All Words)", data.full);
  finalHTML += createStatsSectionHTML("Current Page Progress", data.page);

  statsDataContainer.innerHTML = finalHTML;
}

/**
 * Opens the stats popup
 */
function openStatsPopup(data) {
  // --- Placeholder for your data fetching logic ---
  // You would call your function here to get the data
  // For this example, we'll use dummy data after a short delay
  statsDataContainer.innerHTML = 'Loading stats...'; // Show loading message
  statsPopup.style.display = 'flex'; // Show the popup overlay

  displayStatsData(data);
  // --- End of placeholder ---

  // Example of how you would integrate your fetch:
  /*
  fetch('/your/stats/endpoint')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      displayStatsData(data);
    })
    .catch(error => {
      console.error('Error fetching stats:', error);
      statsDataContainer.innerHTML = '<p>Error: Could not load statistics data.</p>';
    });
  */
}


/**
 * Closes the stats popup
 */
function closeStatsPopup() {
  statsPopup.style.display = 'none';
}


// Close popup if user presses the Escape key
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && statsPopup.style.display !== 'none') {
        closeStatsPopup();
    }
});