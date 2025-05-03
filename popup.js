async function sendMessageToActiveTab(message, obj) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return await chrome.tabs.sendMessage(tab.id, {message: message, obj: obj});
}


document.addEventListener('DOMContentLoaded', function() {
  const loadButton = document.getElementById('load');
  const saveButton = document.getElementById('save');
  const parseButton = document.getElementById('parse');
  const languageSelect = document.getElementById('language');

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
    console.log("ASDASD: " + selectedLanguage );
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {message: "parse_notes", language: selectedLanguage});
    });
  });
});
