// local storage names
const selectedLanguageId = "selected-language";



/////////////////
//  LISTENERS  //
/////////////////

let languageSelect = document.getElementById("languageSelect");
languageSelect.addEventListener('change', e => setLanguageSelect(e.target.value));

let parseButton = document.getElementById("parseButton");
parseButton.addEventListener('click', parseButtonClicked);


/////////////
//  FUNCS  //
/////////////

async function setLanguageSelect(selectedLanguage)
{
    await browser.storage.local.set({[selectedLanguageId]: selectedLanguage});
}

function parseButtonClicked()
{
    
}

async function init()
{    
    let selectedLanguage = (await browser.storage.local.get({[selectedLanguageId]: "kr"}))[selectedLanguageId];
    languageSelect.value = selectedLanguage;
    setLanguageSelect(selectedLanguage);
}

init().catch(e => console.error(e));