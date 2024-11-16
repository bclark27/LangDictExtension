
/////////////
//  TYPES  //
/////////////

const LangId = Object.freeze({
    kr:         "kr",
    zh_CN:      "zh_CN",
    zh_HK:      "zh_HK",
});

const LogType = Object.freeze({
    err:        "err",
    warn:       "warn",
    msg:        "msg",
});

class Logger
{
    constructor ()
    {

    }

    log(caller, message, logType)
    {
        console.log(caller + " [ " + logType + " ]: " + message);
    }
}

/*
    LangToken is ment to hold very minimal information about the target lang words
    it should hold just enough information to display knowelage underline, and ehough data to go fetch dictionary and definition info
*/
class LangToken
{
    token;
    tokenIsTargetLang;
    langId;
    memoryStatus = 0;

    constructor (token, langId)
    {
        this.token = token;
        this.langId = langId;
    }

    tokenToHTMLElement(doc)
    {
        if (!this.tokenIsTargetLang)
        {
            return doc.createTextNode(this.token);
        }

        let span = doc.createElement("span");
        span.appendChild(doc.createTextNode(this.token));
        span.setAttribute(LANG_PARSER_TOKEN_ID, JSON.stringify(this));
        span.setAttribute('id', LANG_PARSER_TOKEN_ID);
        span.setAttribute('lang-parser-memory-status', this.memoryStatus);
        return span;
    }

    static htmlElementToToken(htmlElement)
    {
        if (!LangToken.htmlElementIsLangParserTokenElement(htmlElement))
            return null;

        const json = JSON.parse(htmlElement.getAttribute(LANG_PARSER_TOKEN_ID));
        
        const token = new LangToken(json.token, json.langId);
        token.tokenIsTargetLang = json.tokenIsTargetLang;
        token.memoryStatus = json.memoryStatus;

        return token;
    }

    static htmlElementIsLangParserTokenElement(htmlElement)
    {
        return htmlElement &&
            htmlElement.nodeType===document.ELEMENT_NODE &&
            htmlElement.tagName.toLowerCase() == 'span' &&
            htmlElement.getAttribute(LANG_PARSER_TOKEN_ID) &&
            htmlElement.getAttribute('id') == LANG_PARSER_TOKEN_ID;
    }

    toString()
    {
        return this.token;
    }
}

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
    
    getTokenInfo(tokenText, langId)
    {
        throw new Error("Not Implomented");
    }

    setTokenInfo(tokenText, langId, json)
    {
        throw new Error("Not Implomented");
    }
}

class LangManager_kr extends LangManager
{
    hangulRe = /[\uac00-\ud7af]|[\u1100-\u11ff]|[\u3130-\u318f]|[\ua960-\ua97f]|[\ud7b0-\ud7ff]/gm

    constructor ()
    {
        super(LangId.kr);
    }

    tokenizeText(text)
    {
        let [textChunks, chunksAreMatchs] = chunkTextByRegex(text, this.hangulRe);
        
        let tokens = [];
        for (let i = 0; i < textChunks.length; i++)
        {
            const langId = chunksAreMatchs[i] ? LangId.kr : null;
            let token = new LangToken(textChunks[i], langId);
            token.tokenIsTargetLang = langId != null;
            tokens.push(token);
        }

        return tokens;
    }

    textContainsTargetLang(text)
    {
        return text != null && this.hangulRe.test(text);
    }
    
    getTokenInfo(tokenText, langId)
    {
        return {
            tokenText: tokenText,
            langId: langId,
            memoryStatus: 0,
        };
    }

    setTokenInfo(tokenText, langId, tokenInfo)
    {
        throw new Error("Not Implomented");
    }
}



//////////////
//  CONSTS  //
//////////////

const TOOLTIP_POPUP_ID = "lang-parser-tooltip-popup"
const TOOLTIP_ROOT_ID = "lang-parser-tooltip-root"
const LANG_PARSER_TOKEN_ID = 'lang-parser-token';

const logger = new Logger();

/////////////////
//  LISTENERS  //
/////////////////

const selectedLanguageId = "selected-language";
browser.storage.onChanged.addListener((changes, area) => 
{
    if (area === 'local' && selectedLanguageId in changes)
    {
        let langStr = changes[selectedLanguageId].newValue;
        let langId = getLangIdFromString(langStr);
        if (langId == null)
            return;
        mainParse(langId, document);
    }
});

browser.runtime.onMessage.addListener(onMessageHandler);
function onMessageHandler(request, sender, sendResponse)
{
    logger.log("onMessageHandler", request, LogType.msg);
}

document.body.addEventListener("click", onBodyClicked);

/////////////
//  FUNCS  //
/////////////

function buildTooltipHTML(tokenInfo)
{
    logger.log('buildTooltipHTML', 'building tooltip html with token info: ', LogType.msg);
    console.log(tokenInfo);
    return document.createTextNode(tokenInfo.tokenText);
}

function readFieldsFromTooltip()
{
    const tooltipPopup = getTooltipPopup();
}

function onBodyClicked(evt)
{
    const clickedElement = evt.explicitOriginalTarget;
    if (LangToken.htmlElementIsLangParserTokenElement(clickedElement))
    {
        onLangParserTokenClicked(clickedElement, evt);
        return;
    }

    const id = clickedElement.getAttribute('id');
    if (!id || id != TOOLTIP_POPUP_ID)
    {
        hideTooltip();
    }
}

function onLangParserTokenClicked(clickedTokenHTML, evt)
{
    const boundingRect = clickedTokenHTML.getBoundingClientRect();
    const token = LangToken.htmlElementToToken(clickedTokenHTML);
    logger.log('onLangParserTokenClicked', 'token "' + token.token + '" was clicked', LogType.msg);

    const langManager = createLangManager(token.langId);
    const tokenInfo = langManager.getTokenInfo(token.token, token.langId);
    const tooltipContent = buildTooltipHTML(tokenInfo);

    showTooltip(tooltipContent, evt.pageX, evt.pageY + boundingRect.height);
}

function assertChildIsInParent(child, parent)
{
    if (!child || !parent)
        return false;

    let children = parent.childNodes;

    for (let c of children)
    {
        if (c === child)
            return true;
    }

    return false;
}

function createSpanGroupFromTokens(tokens)
{
    let span = document.createElement("span");
    for (let i = 0; i < tokens.length; i++)
    {
        let thisNode = tokens[i].tokenToHTMLElement(document);
        span.appendChild(thisNode);
    }
    return span;
}

function getLangIdFromString(str)
{
    for (let e in LangId)
    {
        if (e == str)
            return e;
    }

    return null;
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

function createLangManager(langId)
{
    switch (langId)
    {
        case LangId.kr:
            return new LangManager_kr();
        default:
            return null;
    }
}

function getAllHTMLNodesWithText(doc)
{
    // get the body
    let body = doc.body;

    // get all the nodes
    const textNodes = [];
    const nodeIsText = node => 
    {
        return node.nodeType===document.TEXT_NODE ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    };
    const treeNodeWalker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, { acceptNode: nodeIsText });
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
        if (LangToken.htmlElementIsLangParserTokenElement(parent))
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

function tryUpdateTokenHTMLNode(tokenHTMLNode, langManager)
{
    const parent = tokenHTMLNode.parentNode;
    if (!assertChildIsInParent(tokenHTMLNode, parent))
        return;

    const token = LangToken.htmlElementToToken(tokenHTMLNode);
    if (!token)
        return;
    
    if (token.langId != langManager.langId)
        return;

    // do some updates here...
    token.memoryStatus = (token.memoryStatus + 1) % 5;
    
    const newTokenHTMLNode = token.tokenToHTMLElement(document);
    parent.replaceChild(newTokenHTMLNode, tokenHTMLNode);
}

function buildTooltipContainer()
{
    // build the root first, then add the popup as a child
    const tooltipRoot = document.createElement("div");
    tooltipRoot.setAttribute("id", TOOLTIP_ROOT_ID);

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

function getTooltipPopup()
{
    ensureTooltipExists();
    return document.getElementById(TOOLTIP_POPUP_ID);
}

function getTooltipRoot()
{
    ensureTooltipExists();
    return document.getElementById(TOOLTIP_ROOT_ID);
}

function showTooltip(htmlContents, x, y)
{
    logger.log('showTooltip', 'showing tooltip at x:' + x + ' y: ' + y, LogType.msg);
    const tooltipPopup = getTooltipPopup();
    tooltipPopup.style = 'position: absolute; left: ' + x + 'px; top: ' + y + 'px;';
    setTooltipContent(htmlContents);

    const tooltipRoot = getTooltipRoot();
    tooltipRoot.style = 'height: 100%; width: 100%; z-index: 10000; position: absolute; top: 0px; left: 0px; display: block'
}

function setTooltipContent(htmlContents)
{
    logger.log('setTooltipContent', 'setting the contents of the tooltip', LogType.msg);
    const tooltipPopup = getTooltipPopup();
    tooltipPopup.innerHTML = '';
    tooltipPopup.appendChild(htmlContents);
}

function hideTooltip()
{
    logger.log("hideTooltip", "hidding tooltip", LogType.msg);
    const tooltipRoot = getTooltipRoot();
    tooltipRoot.style = 'display: none';
}

function mainParse(langId)
{
    logger.log("setLanguage", "setting language to '" + langId + "'", LogType.msg);

    // get the correct langManager
    const langManager = createLangManager(langId);

    if (langManager == null)
    {
        logger.log("setLanguage", "the language '" + langId + "' is not yet supported", LogType.msg);
        return;
    }
    
    // get all the text nodes
    const textNodes = getAllHTMLNodesWithText(document);
    logger.log("setLanguage", "got " + textNodes.length + " text nodes from document", LogType.msg);

    // take out the existing nodes and try to update them
    const [newTextNodes, existingTokenNodes] = sortHTMLTextNodes(textNodes);
    for (const existingTokenNode of existingTokenNodes)
    {
        tryUpdateTokenHTMLNode(existingTokenNode, langManager);
    }


    // filter the nodes through the langManager to get just ones with the target lang in them
    const fitleredTextNodes = [];
    for (const node of newTextNodes)
    {
        if (langManager.textContainsTargetLang(node.nodeValue))
            fitleredTextNodes.push(node);
    }

    logger.log("setLanguage", "got " + fitleredTextNodes.length + " text nodes with taget lang", LogType.msg);

    for (const node of fitleredTextNodes)
    {
        const tokens = langManager.tokenizeText(node.nodeValue);
        const spanGroup = createSpanGroupFromTokens(tokens);
        const parent = node.parentNode;

        if (!assertChildIsInParent(node, parent))
            continue;
        
        parent.replaceChild(spanGroup, node);
    }

    
}
