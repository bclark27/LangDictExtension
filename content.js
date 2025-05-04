// Start Pack ./cnDictBackup.js
// End Pack ./cnDictBackup.js

/////////////
//  TYPES  //
/////////////

const LangId = Object.freeze({
  None:       "None",
  zh_CN:      "zh_CN",
  zh_HK:      "zh_HK",
  kr:         "kr",
});


const TOOLTIP_POPUP_ID = "lang-parser-tooltip-popup"
const TOOLTIP_ROOT_ID = "lang-parser-tooltip-root"
const MEMORY_STATUS = "memory-status"
const LANG_PARSER_TOKEN_ID = 'lang-parser-token';
const LANG_PARSER_TOKEN_LANGUAGE = 'lang-parser-token-lang';
const cnRe = /[\u4E00-\u9FCC\u3400-\u4DB5\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d]/gm
const krRe = /[\uac00-\ud7af]|[\u1100-\u11ff]|[\u3130-\u318f]|[\ua960-\ua97f]|[\ud7b0-\ud7ff]/gm
const createdLangManagers = {};

/*
    LangToken is ment to hold very minimal information about the target lang words
    it should hold just enough information to display knowelage underline, and ehough data to go fetch dictionary and definition info
*/
class LangToken
{
  token;
  langId;

  constructor (token, langId)
  {
    this.token = token;
    this.langId = langId;
  }

  tokenToHTMLElement()
  {
    if (!this.langId == LangId.None)
    {
      return document.createTextNode(this.token);
    }

    let span = document.createElement("span");
    span.appendChild(document.createTextNode(this.token));
    span.setAttribute('id', LANG_PARSER_TOKEN_ID);
    span.setAttribute(LANG_PARSER_TOKEN_LANGUAGE, this.langId);

    span.addEventListener('click', (evt) => {
      onLangHtmlClicked(span, evt);
    });

    return span;
  }

  static htmlElementToToken(htmlElement)
  {
    if (!LangToken.htmlIsLang(htmlElement))
      return null;

    const t = htmlElement.textContent;
    const i = htmlElement.getAttribute(LANG_PARSER_TOKEN_LANGUAGE);
    
    return new LangToken(t, i);
  }

  static htmlIsLang(htmlElement)
  {
    return htmlElement &&
      htmlElement.nodeType===document.ELEMENT_NODE &&
      htmlElement.tagName.toLowerCase() == 'span' &&
      htmlElement.getAttribute(LANG_PARSER_TOKEN_LANGUAGE) &&
      htmlElement.getAttribute('id') == LANG_PARSER_TOKEN_ID;
  }

  toString()
  {
    return this.token;
  }
}

class DataBase
{

  dbObj;

  constructor ()
  {
    this.__clearDb();
  }

  __clearDb()
  {
    this.dbObj = {
      "userStats": { },
      "tokens": { }
    };
  }

  assertLangExists(langId)
  {
    let tokens = this.dbObj['tokens'];

    if (!tokens)
    {
      this.dbObj['tokens'] = {};
      tokens = this.dbObj['tokens'];
    }

    if (!tokens[langId])
    {
      tokens[langId] = {};
    }
  }

  readTokenInfo(token, langId)
  {
    this.assertLangExists(langId);
    const tokens = this.dbObj["tokens"];
    const thisLangIdTokens = tokens[langId];
    
    const thisInfo = thisLangIdTokens[token];
    if (!thisInfo)
    {
      return null;
    }

    return thisInfo;
  }

  writeTokenInfo(token, langId, info)
  {
    this.assertLangExists(langId);
    const tokens = this.dbObj['tokens'];
    const thisLangIdTokens = tokens[langId];
    thisLangIdTokens[token] = info;
  }

  loadDb(newDb)
  {
    this.dbObj = newDb;
    updateAllTokenHTML(null, null, null);
  }

  readAllLangData(langId)
  {
    this.assertLangExists(langId);
    const tokens = this.dbObj["tokens"];
    const thisLangIdTokens = tokens[langId];
    return thisLangIdTokens;
  }
}
const db = new DataBase();

class LangManager
{
    constructor (langId)
    {
        this.langId = langId;
    }

    tokenizeText(text)
    {
        throw new Error("Not Implomented");
    }

    textContainsTargetLang(text)
    {
        throw new Error("Not Implomented");
    }

    getBasicTokenInfo(langToken)
    {
        throw new Error("Not Implomented");
    }

    createTooltipHTML(langToken)
    {
        throw new Error("Not Implomented");
    }
}

class LangManager_kr extends LangManager
{
    tokenizeText(text)
    {
      console.log("Tokenizing... " + text);
      let [textChunks, chunksAreMatchs] = chunkTextByRegex(text, krRe);
      let tokens = [];
      for (let i = 0; i < textChunks.length; i++)
      {
        // if this token is not kr, pass the whole thing as not target lang
        if (!chunksAreMatchs[i])
        {
          tokens.push(new LangToken(textChunks[i], LangId.None));
        }
        else
        {
          tokens.push(new LangToken(textChunks[i], LangId.kr));
        }

      }
      return tokens;
    }

    textContainsTargetLang(text)
    {
        return text != null && krRe.test(text);
    }

    getBasicTokenInfo(langToken)
    {
      if (langToken.langId != LangId.kr)
      {
        console.log('LangManager_kr.getBasicTokenInfo: tried to get token info for token of different lang id: (' + langToken.token + ", " + langToken.langId + ")");
        return null;
      }

      console.log('LangManager_kr.getBasicTokenInfo:' + 'LangManager ' + LangId.kr + ' getting info for ' + langToken.token);
      let info = db.readTokenInfo(langToken.token, LangId.kr);
      if (info)
        return info;

      console.log('LangManager_kr.getBasicTokenInfo:' +'db has no entry for ' + langToken.token + ', adding new entry');
      info = {
        [MEMORY_STATUS]: 0,
        'notes': '',
      };

      db.writeTokenInfo(langToken.token, LangId.kr, info);
      return info;
    }

    createTooltipHTML(langToken)
    {
      const info = this.getBasicTokenInfo(langToken);
      const link = `https://korean.dict.naver.com/koendict/#/search?query=${langToken.token}&range=word`;
      
      const mainDiv = document.createElement('div');
      const tokenTextArea = document.createElement('p');
      const linkArea = document.createElement('a');
      const notesArea = document.createElement('input');
      const dropdown = document.createElement("select");
      const saveButton = document.createElement('button');

      mainDiv.appendChild(tokenTextArea);
      mainDiv.appendChild(linkArea);
      mainDiv.appendChild(document.createElement('br'));
      mainDiv.appendChild(notesArea);
      mainDiv.appendChild(document.createElement('br'));
      mainDiv.appendChild(dropdown);
      mainDiv.appendChild(document.createElement('br'));
      mainDiv.appendChild(saveButton);
      
      tokenTextArea.innerText = langToken.token;
      linkArea.href = link;
      linkArea.innerText = langToken.token;
      linkArea.target = '_blank';
      notesArea.value = info['notes'];
      
      for (var i = 0; i < 5; i++)
      {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i.toString();
        option.selected = i == info[MEMORY_STATUS];
        dropdown.appendChild(option);
      }

      saveButton.textContent = 'Save';
      saveButton.addEventListener('click', () => {

        info[MEMORY_STATUS] = dropdown.selectedIndex;
        info['notes'] = notesArea.value;
        db.writeTokenInfo(langToken.token, LangId.kr, info);
        updateAllTokenHTML(null, langToken.langId, langToken.token);
      });

      return mainDiv;
    }
}

class LangManager_zh_HK extends LangManager
{
    static __getCantoJyut(cnText)
    {
        let jyut = '';

        for (let cnChar of cnText)
        {
            let p = CANTO_JYUTPING[cnChar];
            if (!p)
                p = '-';

            if (p.includes(','))
            {
                p = p.replace(',', '(') + ')';
            }

            jyut += ' ' + p;
        }

        return jyut.substring(1);
    }

    tokenizeText(text)
    {
      console.log("Tokenizing... " + text);
      let [textChunks, chunksAreMatchs] = chunkTextByRegex(text, cnRe);
      let tokens = [];
      for (let i = 0; i < textChunks.length; i++)
      {
        // if this token is not cn, pass the whole thing as not target lang
        if (!chunksAreMatchs[i])
        {
          let notTargetLangToken = new LangToken(textChunks[i], LangId.None);
          tokens.push(notTargetLangToken);
          continue;
        }

        const thisCnStr = textChunks[i];
        const cnWords = parseCnSentanceIntoWords(thisCnStr, CANTO_DICT);

        for (const cnWord of cnWords)
            tokens.push(new LangToken(cnWord, LangId.zh_HK));
      }
      return tokens;
    }

    textContainsTargetLang(text)
    {
        return text != null && cnRe.test(text);
    }

    getBasicTokenInfo(langToken)
    {
      if (langToken.langId != LangId.zh_HK)
      {
        console.log('LangManager_zh_HK.getBasicTokenInfo: tried to get token info for token of different lang id: (' + langToken.token + ", " + langToken.langId + ")");
        return null;
      }

      console.log('LangManager_zh_HK.getBasicTokenInfo:' + 'LangManager ' + LangId.zh_HK + ' getting info for ' + langToken.token);
      let info = db.readTokenInfo(langToken.token, LangId.zh_HK);
      if (info)
        return info;

      console.log('LangManager_zh_HK.getBasicTokenInfo:' +'db has no entry for ' + langToken.token + ', adding new entry');
      info = {
        [MEMORY_STATUS]: 0,
        'notes': '',
        'jy': LangManager_zh_HK.__getCantoJyut(langToken.token)
      };

      db.writeTokenInfo(langToken.token, LangId.zh_HK, info);
      return info;
    }

    createTooltipHTML(langToken)
    {
      const info = this.getBasicTokenInfo(langToken);
      const link = `https://cantonese.org/search.php?q=${langToken.token}`;
      
      const mainDiv = document.createElement('div');
      const tokenTextArea = document.createElement('p');
      const linkArea = document.createElement('a');
      const notesArea = document.createElement('input');
      const dropdown = document.createElement("select");
      const saveButton = document.createElement('button');

      mainDiv.appendChild(tokenTextArea);
      mainDiv.appendChild(linkArea);
      mainDiv.appendChild(document.createElement('br'));
      mainDiv.appendChild(notesArea);
      mainDiv.appendChild(document.createElement('br'));
      mainDiv.appendChild(dropdown);
      mainDiv.appendChild(document.createElement('br'));
      mainDiv.appendChild(saveButton);
      
      tokenTextArea.innerText = langToken.token + " (" + info['jy'] + ")";
      linkArea.href = link;
      linkArea.innerText = langToken.token;
      linkArea.target = '_blank';
      notesArea.value = info['notes'];
      
      for (var i = 0; i < 5; i++)
      {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i.toString();
        option.selected = i == info[MEMORY_STATUS];
        dropdown.appendChild(option);
      }

      saveButton.textContent = 'Save';
      saveButton.addEventListener('click', () => {

        info[MEMORY_STATUS] = dropdown.selectedIndex;
        info['notes'] = notesArea.value;
        db.writeTokenInfo(langToken.token, LangId.zh_HK, info);
        updateAllTokenHTML(null, langToken.langId, langToken.token);
      });

      return mainDiv;
    }
}

class LangManager_zh_CN extends LangManager
{
    static __getMandarinPinyin(cnText)
    {
        let pinyin = '';

        for (let cnChar of cnText)
        {
            let p = CN_PINYIN[cnChar];
            if (!p)
                p = '-';

            if (p.includes(','))
            {
                p = p.replace(',', '(') + ')';
            }

            pinyin += ' ' + p;
        }

        return pinyin.substring(1);
    }

    tokenizeText(text)
    {
      console.log("Tokenizing... " + text);
      let [textChunks, chunksAreMatchs] = chunkTextByRegex(text, cnRe);
      let tokens = [];
      for (let i = 0; i < textChunks.length; i++)
      {
        // if this token is not cn, pass the whole thing as not target lang
        if (!chunksAreMatchs[i])
        {
          let notTargetLangToken = new LangToken(textChunks[i], LangId.None);
          tokens.push(notTargetLangToken);
          continue;
        }

        const thisCnStr = textChunks[i];
        const cnWords = parseCnSentanceIntoWords(thisCnStr, CN_SIMPLE_DICT);

        for (const cnWord of cnWords)
            tokens.push(new LangToken(cnWord, LangId.zh_CN));
      }
      return tokens;
    }

    textContainsTargetLang(text)
    {
        return text != null && cnRe.test(text);
    }
    getBasicTokenInfo(langToken)
    {
      if (langToken.langId != LangId.zh_CN)
      {
        console.log('LangManager_zh_CN.getBasicTokenInfo: tried to get token info for token of different lang id: (' + langToken.token + ", " + langToken.langId + ")");
        return null;
      }

      console.log('LangManager_zh_CN.getBasicTokenInfo:' + 'LangManager ' + LangId.zh_CN + ' getting info for ' + langToken.token);
      let info = db.readTokenInfo(langToken.token, LangId.zh_CN);
      if (info)
        return info;

      console.log('LangManager_zh_CN.getBasicTokenInfo:' +'db has no entry for ' + langToken.token + ', adding new entry');
      info = {
        [MEMORY_STATUS]: 0,
        'notes': '',
        'py': LangManager_zh_CN.__getMandarinPinyin(langToken.token)
      };

      db.writeTokenInfo(langToken.token, LangId.zh_CN, info);
      return info;
    }

    static async __getCharDefFromWeb(tokenText)
    {
        let x = encodeURI(`https://chinese.yabla.com/chinese-english-pinyin-dictionary.php?define=${tokenText}`);
        let dictDoc = await fetchHTML(x);
        if (!dictDoc)
            return null;

        const eles = dictDoc.getElementsByClassName("meaning");
        if (!eles || eles.length == 0)
            return null;
        return eles[0].innerText;
    }

    createTooltipHTML(langToken)
    {
      const info = this.getBasicTokenInfo(langToken);
      const link = `https://chinese.yabla.com/chinese-english-pinyin-dictionary.php?define=${langToken.token}`;
      
      const mainDiv = document.createElement('div');
      const tokenTextArea = document.createElement('p');
      const linkArea = document.createElement('a');
      const notesArea = document.createElement('input');
      const dropdown = document.createElement("select");
      const saveButton = document.createElement('button');

      mainDiv.appendChild(tokenTextArea);
      mainDiv.appendChild(linkArea);
      mainDiv.appendChild(document.createElement('br'));
      mainDiv.appendChild(notesArea);
      mainDiv.appendChild(document.createElement('br'));
      mainDiv.appendChild(dropdown);
      mainDiv.appendChild(document.createElement('br'));
      mainDiv.appendChild(saveButton);
      
      tokenTextArea.innerText = langToken.token + " (" + info['py'] + ")";
      linkArea.href = link;
      linkArea.innerText = langToken.token;
      linkArea.target = '_blank';
      notesArea.value = info['notes'];
      
      for (var i = 0; i < 5; i++)
      {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i.toString();
        option.selected = i == info[MEMORY_STATUS];
        dropdown.appendChild(option);
      }

      saveButton.textContent = 'Save';
      saveButton.addEventListener('click', () => {

        info[MEMORY_STATUS] = dropdown.selectedIndex;
        info['notes'] = notesArea.value;
        db.writeTokenInfo(langToken.token, LangId.zh_CN, info);
        updateAllTokenHTML(null, langToken.langId, langToken.token);
      });

      return mainDiv;
    }
}

async function fetchHTML(url)
{
    return await fetch(url)
    .then(response => {
        // When the page is loaded convert it to text
        return response.text();
    })
    .then(html => {
        // Initialize the DOM parser
        const parser = new DOMParser();

        // Parse the text
        return parser.parseFromString(html, "text/html");
    })
    .catch(error => {
        console.error('Failed to fetch page: ', error);
    })
}

function onLangHtmlClicked(html, evt)
{
  const langToken = LangToken.htmlElementToToken(html);
  console.log("Clicked!!!");
  if (!langToken)
    return;

  if (langToken.langId == LangId.None)
    return;

  showTooltip(langToken, evt.pageX, evt.pageY);
}

function buildTooltipContainer()
{
    // build the root first, then add the popup as a child
    const tooltipRoot = document.createElement("div");
    tooltipRoot.setAttribute("id", TOOLTIP_ROOT_ID);
    
    tooltipRoot.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        hindTooltip();
      }
    });

    const tooltipPopup = document.createElement("div");
    tooltipPopup.setAttribute("id", TOOLTIP_POPUP_ID);

    tooltipRoot.appendChild(tooltipPopup);

    return [tooltipRoot, tooltipPopup];
}

function ensureTooltipExists()
{
  let tooltipPopup = document.getElementById(TOOLTIP_POPUP_ID);
  if (tooltipPopup)
    return tooltipPopup;

  let tooltipRoot;
  [tooltipRoot, tooltipPopup] = buildTooltipContainer();
  tooltipRoot.style = 'height: 100%; width: 100%';
  document.body.appendChild(tooltipRoot);
}


function getTooltipContainer()
{
    ensureTooltipExists();
    return document.getElementById(TOOLTIP_POPUP_ID);
}
function getTooltipRoot()
{
    ensureTooltipExists();
    return document.getElementById(TOOLTIP_ROOT_ID);
}

/**
 * Returns true if `obj` is any kind of DOM Node.
 */
function isDomNode(obj) {
  // In most browsers, all node types inherit from Node
  return (
    typeof Node === 'object'
      ? obj instanceof Node
      : obj &&
        typeof obj === 'object' &&
        typeof obj.nodeType === 'number' &&
        typeof obj.nodeName === 'string'
  );
}

function showTooltip(langToken, x, y)
{
  console.log('Showing tooltip at x=' + x + ' y=' + y);
  const langManager = getLangManager(langToken.langId);
  if (!langManager)
    return;

  hindTooltip();

  const tooltipContent = langManager.createTooltipHTML(langToken);
  const popupContainer = getTooltipContainer();
  const popupRoot = getTooltipRoot();

    console.log("clicking!");
    console.log(popupContainer);
    console.log(popupRoot);
    console.log(tooltipContent);

  if (isDomNode(tooltipContent))
  {
    popupContainer.appendChild(tooltipContent);
  }
  else
  {
    popupContainer.innerHtml = tooltipContent;
  }

  popupContainer.style = 'position: absolute; left: ' + x + 'px; top: ' + y + 'px; background: black;';
  popupRoot.style = 'height: 100%; width: 100%; z-index: 10000; position: absolute; top: 0px; left: 0px; display: block'
}

function hindTooltip()
{
  const popupContainer = getTooltipContainer();
  const popupRoot = getTooltipRoot();
  popupRoot.style = 'display: none';
  popupContainer.replaceChildren();
}

function existsBinarySearch(arr, x)
{
    if (!arr || arr.length == 0)
        return false;

    let start = 0, end = arr.length - 1;

    // Iterate while start not meets end
    while (start <= end) {

        // Find the mid index
        let mid = Math.floor((start + end) / 2);

        // If element is present at 
        // mid, return True
        if (arr[mid] == x) return true;

        // Else look in left or 
        // right half accordingly
        else if (arr[mid] < x)
            start = mid + 1;
        else
            end = mid - 1;
    }

    return false;
}

function parseCnSentanceIntoWords(cnText, cnDict)
{
    // start from the right, and search for the longest matches
    const cnMatches = [];
    let remainingText = cnText;
    const dictLen = cnDict.max;
    for (let i = 0; i < cnText.length;)
    {
        let thisMatch = "";
        for (let matchLen = dictLen; matchLen >= 1; matchLen--)
        {
            if (remainingText.length < matchLen)
                continue;

            const thisDict = cnDict[matchLen];
            const thisRemaining = remainingText.substring(0,matchLen);
            if (existsBinarySearch(thisDict, thisRemaining))
            {
                thisMatch = thisRemaining;
                break;
            }
        }

        if (thisMatch == "")
        {
            thisMatch = remainingText[0];
        }

        cnMatches.push(thisMatch);
        remainingText = remainingText.substring(thisMatch.length);
        i += thisMatch.length;
    }

    return cnMatches;
}

function chunkTextByRegex(text, re)
{
    if (text == null || re == null)
        return [];

    if (text == "")
        return [""];

    let thisChunkMatch = null;
    let chunks = [];
    let chunksAreMatchs = [];
    let firstChunkIsMatch = false;

    for (let i = 0; i < text.length; i++)
    {
        let c = text.charAt(i);
        let thisCharMatch = c.match(re) ? true : false;
        
        if (i == 0)
        {
            firstChunkIsMatch = thisCharMatch;
        }

        if (thisChunkMatch == null)
            thisChunkMatch = !thisCharMatch;

        let thisCharIsInThisChunk = thisCharMatch == thisChunkMatch;

        if (thisCharIsInThisChunk)
        {
            chunks[chunks.length - 1] = chunks[chunks.length - 1] + c;
        }
        else
        {
            thisChunkMatch = thisCharMatch;
            chunks.push(c);
        }
    }

    for (let i = 0; i < chunks.length; i++)
    {
        chunksAreMatchs.push(firstChunkIsMatch);
        firstChunkIsMatch = !firstChunkIsMatch;
    }

    return [chunks, chunksAreMatchs];
}

function getLangManager(langId)
{
    let manager = createdLangManagers[langId];

    if (manager)
        return manager;

    switch (langId)
    {
        case LangId.zh_CN:
            manager = new LangManager_zh_CN();
            break;
        case LangId.zh_HK:
            manager = new LangManager_zh_HK();
            break;
        case LangId.kr:
            manager = new LangManager_kr();
            break;
        default:
            return null;
    }

    createdLangManagers[langId] = manager;
    return manager;
}

function getTextNodes(rootElement)
{
  if (!rootElement)
    rootElement = document.body;

    const textNodes = [];
    const nodeIsText = node => 
    {
        return node.nodeType===document.TEXT_NODE ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    };
    const treeNodeWalker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, { acceptNode: nodeIsText });
    for (;treeNodeWalker.nextNode();)
    {
        textNodes.push(treeNodeWalker.currentNode);
    }
    return textNodes;
}

function sortHTMLTextNodes(textNodes)
{
    const newTextNodes = [];
    const existingTokenNodes = [];

    for (let textNode of textNodes)
    {
        let parent = textNode.parentNode;
        if (LangToken.htmlIsLang(parent))
        {
            existingTokenNodes.push(parent);
        }
        else
        {
            newTextNodes.push(textNode);
        }
    }

    return [newTextNodes, existingTokenNodes];
}

function getAllExistingLangHtml(root)
{
  const textNodes = getTextNodes(root);
  const [newTextNodes, existingTokenNodes] = sortHTMLTextNodes(textNodes);
  return existingTokenNodes;
}

function tryUpdateLangHtml(langHtml)
{
  const thisToken = LangToken.htmlElementToToken(langHtml);
  if (!thisToken)
    return;
  
  const tokenInfo = db.readTokenInfo(thisToken.token, thisToken.langId);
  if (!tokenInfo)
    return;

  langHtml.setAttribute('lang-parser-memory-status', tokenInfo[MEMORY_STATUS]);
}

function updateAllTokenHTML(root, langId, tokenText)
{
  console.log("updateAllTokenHTML");
  const allLangHtml = getAllExistingLangHtml(root);
  for (const thisTokenHtml of allLangHtml) {
    const thisToken = LangToken.htmlElementToToken(thisTokenHtml);
    if (!thisToken)
      continue;
    if (langId && thisToken.langId != langId)
      continue;
    if (tokenText && thisToken.token != tokenText)
      continue;
    
    tryUpdateLangHtml(thisTokenHtml);
  }
}
// Listen for messages from the popup
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

        console.log("Content got a message: " + request.message);

        if (request.message === "load_notes") {
            // Handle loading notes
            db.loadDb(request.notes);
            console.log("Notes loaded:", db.dbObj);
        } else if (request.message === "save_notes") {
            // Handle saving notes
            console.log("Saving notes in background script");
            sendResponse({notes: db.dbObj});
            return true; // Required for sending asynchronous responses
        } else if (request.message === "parse_notes") {
            // Handle parsing notes
            const language = request.language;
            console.log(language);
            mainParse(null, language);
        } else if (request.message === "mark_known") {
            // Handle parsing notes
            const language = request.language;
            markAllKnown(null, language);
        } else if (request.message === "get_stats") {
            // Handle parsing notes
            const language = request.language;
            const stats = getStats(null, language);
            console.log(stats);
            sendResponse({stats: stats});
        }
    }
);

function createSpanGroupFromTokens(tokens)
{
    let span = document.createElement("span");
    for (let i = 0; i < tokens.length; i++)
    {
      let thisNode = tokens[i].tokenToHTMLElement();
      span.appendChild(thisNode);
    }
    return span;
}

function mainParse(root, langId) {
  if (!root)
    root = document.body;

  // get the correct langManager
  const langManager = getLangManager(langId);

  if (langManager == null)
  {
      console.log("unsupported language " + langId);
      return;
  }

  // get all the text nodes
  const textNodes = getTextNodes(root);
  console.log("got all these nodes from the root: " + textNodes.length);

  // take out the existing nodes and try to update them
  const [newTextNodes, existingLangNodes] = sortHTMLTextNodes(textNodes);
  for (const existingLangNode of existingLangNodes)
  {
    tryUpdateLangHtml(existingLangNode);
  }

  // filter the nodes through the langManager to get just ones with the target lang in them
  const fitleredTextNodes = [];
  for (const node of newTextNodes)
  {
    if (langManager.textContainsTargetLang(node.nodeValue))
      fitleredTextNodes.push(node);
  }

  console.log("mainParse: got " + fitleredTextNodes.length + " text nodes with taget lang");

  for (const node of fitleredTextNodes)
  {
    const tokens = langManager.tokenizeText(node.nodeValue);
    for (const token of tokens)
        if (token.langId == langId)
            langManager.getBasicTokenInfo(token);
    const spanGroup = createSpanGroupFromTokens(tokens);
    const parent = node.parentNode;
    parent.replaceChild(spanGroup, node);

    updateAllTokenHTML(spanGroup);
  }
}

function markAllKnown(root, langId)
{
    if (!root)
        root = document.body;
    
    // get the correct langManager
    const langManager = getLangManager(langId);

    if (langManager == null)
    {
        console.log("unsupported language " + langId);
        return;
    }

    const existingLangNodes = getAllExistingLangHtml(root);
    for (const existingLangNode of existingLangNodes)
    {
        const thisToken = LangToken.htmlElementToToken(existingLangNode);
        if (!thisToken)
            continue;
        
        if (thisToken.langId != langId)
            continue;

        const tokenInfo = db.readTokenInfo(thisToken.token, langId);
        if (!tokenInfo)
            continue;

        if (tokenInfo[MEMORY_STATUS] != 0)
            continue;

        tokenInfo[MEMORY_STATUS] = 4;
        db.writeTokenInfo(thisToken.token, langId, tokenInfo);
    }

    updateAllTokenHTML(root, langId, null);
}

function getStats(root, langId)
{
    if (!root)
        root = document.body;
    
    // get the correct langManager
    const langManager = getLangManager(langId);

    if (langManager == null)
    {
        console.log("unsupported language " + langId);
        return {};
    }

    const fullLangStats = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0
    };

    const allTokens = db.readAllLangData(langId);
    for (const tokenText in allTokens)
    {
        const data = allTokens[tokenText];
        const mem = data[MEMORY_STATUS];
        if (!mem)
            continue;

        fullLangStats[mem] += 1;
    }

    const pageStats = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0
    };

    // take out the existing nodes and try to update them
    const existingLangNodes = getAllExistingLangHtml(root);
    const seenTokens = {};
    for (const existingLangNode of existingLangNodes)
    {
        const thisToken = LangToken.htmlElementToToken(existingLangNode);
        if (!thisToken)
            continue;
        
        console.log(thisToken);
        if (thisToken.langId != langId)
            continue;

        if (thisToken.token in seenTokens)
            continue;
        seenTokens[thisToken.token] = 0;

        const data = db.readTokenInfo(thisToken.token, langId);
        if (!data)
            continue;

        const mem = data[MEMORY_STATUS];
        if (!mem)
            continue;

        pageStats[mem] += 1;
    }

    return {
        full: fullLangStats,
        page: pageStats
    }
}