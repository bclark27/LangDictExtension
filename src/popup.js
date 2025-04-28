//////////////
//  CONSTS  //
//////////////

const TOOLTIP_POPUP_ID = "lang-parser-tooltip-popup"
const TOOLTIP_ROOT_ID = "lang-parser-tooltip-root"
const LANG_PARSER_TOKEN_ID = 'lang-parser-token';
const PARSE_CLICKED_ATT = 'parse-clicked';
const LOAD_CLICKED_ATT = 'load-clicked';
const LOADED_DATA_ATT = 'loaded-data';
const EXPORT_CLICKED_ATT = 'export-clicked';
const LOCAL_STORAGE_SELECTED_LANG_ID = "selected-language";



/////////////////
//  LISTENERS  //
/////////////////

const languageSelect = document.getElementById("languageSelect");
languageSelect.addEventListener('change', e => setLanguageSelect(e.target.value));

const parseButton = document.getElementById("parseButton");
parseButton.addEventListener('click', parseButtonClicked);

const loadButton = document.getElementById("loadButton");
loadButton.addEventListener('click', loadButtonClicked);

const inputField = document.getElementById("inputField");
inputField.addEventListener('change', (evt) => {
  console.log('ASDASD');
  const fileList = evt.target.files;      // FileList object :contentReference[oaicite:2]{index=2}
  if (!fileList || fileList.length === 0) return;
  
  var file = fileList[0];

    // setting up the reader
    var reader = new FileReader();
    reader.readAsText(file,'UTF-8');

    // here we tell the reader what to do when it's done reading...
    reader.onload = readerEvent => {
      try {
        const data = JSON.parse(readerEvent.target.result);
        console.log(data);
        sendMessageToActiveTab({[LOAD_CLICKED_ATT]: true, [LOADED_DATA_ATT]: data});
      } catch (error) {
        alert('Error loading vocabulary: ' + error);
      }
    }
});

const exportButton = document.getElementById("exportButton");
exportButton.addEventListener('click', exportButtonClicked);

/////////////
//  FUNCS  //
/////////////

function sendMessageToActiveTab(message)
{
    browser.tabs
        .query({
        currentWindow: true,
        active: true,
        })
        .then((tabs) => {
            for (const tab of tabs) {
                browser.tabs
                  .sendMessage(tab.id, message)
                  .then((response) => {
                    console.log("Message from the content script:");
                    console.log(response.response);
                  })
                  .catch(onError);
              }
        })
        .catch(onError);
}

async function setLanguageSelect(selectedLanguage)
{
    await browser.storage.local.set({[LOCAL_STORAGE_SELECTED_LANG_ID]: selectedLanguage});
}

function parseButtonClicked()
{
    sendMessageToActiveTab({[PARSE_CLICKED_ATT]: true});
}

let input;

function loadButtonClicked()
{
  input = document.createElement('input');
  input.type = 'file';
  console.log("HERE 0");
  input.onchange = e => {
    console.log("HERE 1");
    // getting a hold of the file reference
    var file = e.target.files[0];

    // setting up the reader
    var reader = new FileReader();
    reader.readAsText(file,'UTF-8');

    // here we tell the reader what to do when it's done reading...
    reader.onload = readerEvent => {
      try {
        const data = JSON.parse(readerEvent.target.result);
        console.log(data);
        sendMessageToActiveTab({[LOAD_CLICKED_ATT]: true, [LOADED_DATA_ATT]: data});
      } catch (error) {
        alert('Error loading vocabulary: ' + error);
      }
    }
  }

  try {
    input.click();
  } catch (error) {
    console.error("Error clicking input:", error);
  }
}

function exportButtonClicked()
{
    sendMessageToActiveTab({[EXPORT_CLICKED_ATT]: true});
}

async function init()
{    
    let selectedLanguage = (await browser.storage.local.get({[LOCAL_STORAGE_SELECTED_LANG_ID]: "kr"}))[LOCAL_STORAGE_SELECTED_LANG_ID];
    languageSelect.value = selectedLanguage;
    setLanguageSelect(selectedLanguage);
}

init().catch(e => console.error(e));
