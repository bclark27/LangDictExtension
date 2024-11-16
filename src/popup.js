//////////////
//  CONSTS  //
//////////////

const TOOLTIP_POPUP_ID = "lang-parser-tooltip-popup"
const TOOLTIP_ROOT_ID = "lang-parser-tooltip-root"
const LANG_PARSER_TOKEN_ID = 'lang-parser-token';
const PARSE_CLICKED_ATT = 'parse-clicked';
const LOAD_CLICKED_ATT = 'load-clicked';
const EXPORT_CLICKED_ATT = 'export-clicked';
const LOCAL_STORAGE_SELECTED_LANG_ID = "selected-language";



/////////////////
//  LISTENERS  //
/////////////////

let languageSelect = document.getElementById("languageSelect");
languageSelect.addEventListener('change', e => setLanguageSelect(e.target.value));

let parseButton = document.getElementById("parseButton");
parseButton.addEventListener('click', parseButtonClicked);

let loadButton = document.getElementById("loadButton");
loadButton.addEventListener('click', loadButtonClicked);

let exportButton = document.getElementById("exportButton");
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

function loadButtonClicked()
{
    sendMessageToActiveTab({[LOAD_CLICKED_ATT]: true});
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