
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
        this.restrictMessages = true;
    }

    log(caller, message, logType)
    {
        if (this.restrictMessages && logType == LogType.msg)
            return;
        
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

    /*
    should read from db and get all stuff about the token
    MUST INCLUDE:
        memoryStatus
        notes
    
    if the token does not exist, a new entry in the database will be made
    */
    getAllTokenInfo(tokenText)
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
            
            if (token.tokenIsTargetLang)
            {
                const info = this.getAllTokenInfo(token.token);
                token.memoryStatus = info.memoryStatus;
            }

            tokens.push(token);
        }

        return tokens;
    }

    textContainsTargetLang(text)
    {
        return text != null && this.hangulRe.test(text);
    }
    
    getAllTokenInfo(tokenText)
    {
        logger.log('getAllTokenInfo', 'LangManager ' + LangId.kr + ' getting info for ' + tokenText, LogType.msg);
        db.assertLangExists(LangId.kr);
        let info = db.readTokenInfo(tokenText, LangId.kr);
        if (info)
            return info;

        
        logger.log('getAllTokenInfo', 'db has no entry for ' + tokenText + ', adding new entry', LogType.msg);
        info = generateDefaultTokenInfo();
        db.writeTokenInfo(tokenText, LangId.kr, info);
        return info;
    }
}

class DataBase
{

    constructor ()
    {
        this.__clearDb();
        this.input = document.createElement('input');
        this.input.type = 'file';
        this.input.onchange = e => { 
            console.log(e);
            // getting a hold of the file reference
            var file = e.target.files[0]; 
        
            console.log(file);
        
            // setting up the reader
            var reader = new FileReader();
            reader.readAsText(file,'UTF-8');
        
            // here we tell the reader what to do when it's done reading...
            reader.onload = readerEvent => {
                const parsedObj = JSON.parse(readerEvent.target.result); // this is the content!

                console.log(parsedObj);
                if (!parsedObj || !Object.hasOwn(parsedObj, 'userStats') || !Object.hasOwn(parsedObj, 'tokens'))
                {
                    logger.log('DataBase.onload', 'parsed file has incorrect format', LogType.err);
                    return;
                }

                logger.log('DataBase.onload', 'loaded db file!', LogType.msg);
                this.dbObj = parsedObj;
                console.log( this.dbObj );
                updateAllTokenHTML();
            }
        }
    }

    __clearDb()
    {
        logger.log('DataBase.__clearDb', 'clearing db', LogType.msg);
        this.dbObj = {
            "userStats": { },
            "tokens": { }
        };
    }

    assertLangExists(langId)
    {
        const tokens = this.dbObj['tokens'];

        if (!tokens[langId])
        {
            tokens[langId] = {};
        }
    }

    readTokenInfo(token, langId)
    {
        logger.log('DataBase.readTokenInfo', 'reading info for (' + token + ', ' + langId + ')', LogType.msg);

        const tokens = this.dbObj["tokens"];
        if (!tokens)
        {
            logger.log('DataBase.readTokenInfo', 'no tokens in db', LogType.err);
            return null;
        }

        const thisLangIdTokens = tokens[langId];
        if (!thisLangIdTokens)
        {
            logger.log('DataBase.readTokenInfo', 'no tokens for ' + langId + ' in db', LogType.err);
            return null;
        }

        const thisInfo = thisLangIdTokens[token];
        if (!thisInfo)
        {
            logger.log('DataBase.readTokenInfo', 'no info for ' + token + ' in db', LogType.err);
            return null;
        }

        if (!Object.hasOwn(thisInfo, 'memoryStatus') || !Object.hasOwn(thisInfo, 'notes'))
        {
            logger.log('DataBase.readTokenInfo', 'token ' + token + ' does not fit correct format', LogType.err);
            console.log(thisInfo);
            return null;
        }

        return thisInfo;
    }

    writeTokenInfo(token, langId, info)
    {
        logger.log('DataBase.writeTokenInfo', 'writing info for (' + token + ', ' + langId + ')', LogType.msg);

        if (!info)
        {
            logger.log('DataBase.writeTokenInfo', 'no info provided for ' + token, LogType.err);
            return;
        }

        const tokens = this.dbObj["tokens"];
        if (!tokens)
        {
            logger.log('DataBase.writeTokenInfo', 'no tokens in db', LogType.err);
            return;
        }

        this.assertLangExists(langId);
        const thisLangIdTokens = tokens[langId];
        thisLangIdTokens[token] = info;
    }

    loadDb()
    {
        logger.log('DataBase.loadDb', 'starting to load db...', LogType.msg);
        this.input.click();
    }

    exportToString()
    {
        /*
        DB Format

        {
            "userStats":
            {
                some user stats
            },
            "tokens":
            {
                "kr":
                {
                    "한글":
                    {
                        "memoryStatus": 3,
                        "notes": "asdasd"
                    },
                    "안녕":
                    {
                        some notes about the token + memory status
                    }
                }
            }
        }

        */
        logger.log('DataBase.exportToString', 'exporting current bd state to string', LogType.msg);
        return JSON.stringify(this.dbObj);
        
    }
}

class TooltipState
{
    langId;
    tokenText;

    x;
    y;
    visible;
    currentContent;

    __buildTooltipHTML(token, langSpecificConfig)
    {
        return document.createTextNode(token.token);
    }

    pushLangTokenToTooltip(token, x, y)
    {
        logger.log('TooltipState.pushLangTokenToPopup', 'pushing token to tooltip', LogType.msg);
        const langManager = getLangManager(token.langId);
        const langSpecificContentConfig = langManager.getAllTokenInfo(token.token, token.langId);
        const tooltipContent = this.__buildTooltipHTML(token, langSpecificContentConfig);
        if (!tooltipContent)
        {
            logger.log('TooltipState.pushLangTokenToPopup', 'lang manager returned null content', LogType.err);
            return;
        }
        logger.log('TooltipState.pushLangTokenToPopup', 'showing tooltip at x:' + x + ' y: ' + y, LogType.msg);
        const tooltipPopup = getTooltipPopup();
        tooltipPopup.style = 'position: absolute; left: ' + x + 'px; top: ' + y + 'px;';
        logger.log('TooltipState.pushLangTokenToPopup', 'setting the contents of the tooltip', LogType.msg);
        tooltipPopup.innerHTML = '';
        tooltipPopup.appendChild(tooltipContent);
        const tooltipRoot = getTooltipRoot();
        tooltipRoot.style = 'height: 100%; width: 100%; z-index: 10000; position: absolute; top: 0px; left: 0px; display: block'
        
        this.langId = token.langId;
        this.tokenText = token.token;
        this.x = x;
        this.y = y;
        this.visible = true;
        this.currentContent = tooltipContent;
    }

    extractInfoFromTooltip()
    {
        logger.log("TooltipState.extractInfoFromTooltip", "extracting info from tooltip", LogType.msg);
        if (!this.langId || !this.tokenText)
        {
            logger.log("TooltipState.extractInfoFromTooltip", 'tooltip has not token or langId', LogType.err);
            return;
        }

        const langManager = getLangManager(this.langId);
        if (!langManager)
        {
            logger.log("TooltipState.extractInfoFromTooltip", "langId " + this.langId + ' is not supported', LogType.err);
            return;
        }

        const info = langManager.getAllTokenInfo(this.tokenText);
        info.memoryStatus = (info.memoryStatus + 1) % 5;
        db.writeTokenInfo(this.tokenText, this.langId, info);
        updateSpecificTokenHTML(this.tokenText, this.langId);
    }

    hide()
    {
        logger.log("TooltipState.hide", "hidding tooltip", LogType.msg);
        const tooltipRoot = getTooltipRoot();
        tooltipRoot.style = 'display: none';
        const wasAlreadyInvis = this.visible == false;
        this.visible = false;

        if (!wasAlreadyInvis)
        {
            logger.log("TooltipState.hide", "saving to db changes in tooltip", LogType.msg);
            this.extractInfoFromTooltip();
        }
    }
}

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

const logger = new Logger();
const db = new DataBase();
const createdLangManagers = {};
const tooltipState = new TooltipState();

/////////////////
//  LISTENERS  //
/////////////////

browser.storage.onChanged.addListener((changes, area) => 
{
    if (area === 'local' && LOCAL_STORAGE_SELECTED_LANG_ID in changes)
    {
        /*
        let langStr = changes[LOCAL_STORAGE_SELECTED_LANG_ID].newValue;
        let langId = getLangIdFromString(langStr);
        if (langId == null)
        return;
        mainParse(langId, document);
        */
    }
});

browser.runtime.onMessage.addListener(onMessageHandler);
function onMessageHandler(request, sender, sendResponse)
{
    logger.log("onMessageHandler", request, LogType.msg);

    if (!request)
        return;

    if (request[PARSE_CLICKED_ATT] == true)
    {
        onParseButtonClicked();
        return;
    }

    if (request[LOAD_CLICKED_ATT] == true)
    {
        onLoadButtonClicked();
        return;
    }

    if (request[EXPORT_CLICKED_ATT] == true)
    {
        onExportButtonClicked();
        return;
    }
}

document.body.addEventListener("click", onBodyClicked);

/////////////
//  FUNCS  //
/////////////

function generateDefaultTokenInfo()
{
    return {
        "memoryStatus": 0,
        "notes": ""
    }
}

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
        tooltipState.hide();
    }
}

function onLangParserTokenClicked(clickedTokenHTML, evt)
{
    const boundingRect = clickedTokenHTML.getBoundingClientRect();
    const token = LangToken.htmlElementToToken(clickedTokenHTML);
    logger.log('onLangParserTokenClicked', 'token "' + token.token + '" was clicked', LogType.msg);

    tooltipState.pushLangTokenToTooltip(token, evt.pageX, evt.pageY + boundingRect.height);
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

function getLangManager(langId)
{
    let manager = createdLangManagers[langId];

    if (manager)
        return manager;

    switch (langId)
    {
        case LangId.kr:
            manager = new LangManager_kr();
            break;
        default:
            return null;
    }

    createdLangManagers[langId] = manager;
    return manager;
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

function tryUpdateTokenHTMLNode(tokenHTMLNode)
{
    const parent = tokenHTMLNode.parentNode;
    if (!assertChildIsInParent(tokenHTMLNode, parent))
        return;

    const token = LangToken.htmlElementToToken(tokenHTMLNode);
    if (!token)
        return;


    const langManager = getLangManager(token.langId);
    if (!langManager)
    {
        logger.log('tryUpdateTokenHTMLNode', 'lang ' + token.langId + ' is not supported', LogType.err);
        return;
    }

    const info = langManager.getAllTokenInfo(token.token);
    token.memoryStatus = info.memoryStatus;
    
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

async function getCurrentLangOption()
{
    return (await browser.storage.local.get({[LOCAL_STORAGE_SELECTED_LANG_ID]: "kr"}))[LOCAL_STORAGE_SELECTED_LANG_ID];
}

async function onParseButtonClicked()
{
    const langId = await getCurrentLangOption();
    logger.log('onParseButtonClicked', "parse clicked", LogType.msg);
    mainParse(langId);
}

function onLoadButtonClicked()
{
    db.loadDb();
}

function onExportButtonClicked()
{
    navigator.clipboard.writeText(db.exportToString());
}

function updateSpecificTokenHTML(tokenText, langId)
{
    logger.log('updateSpecificTokenHTML', 'updateing all nodes of type (' + tokenText + ', ' + langId + ')', LogType.msg);
    const langManager = getLangManager(langId);
    if (!langManager)
    {
        logger.log('updateSpecificTokenHTML', 'lang ' + langId + ' is not supported', LogType.err);
        return;
    }

    const textNodes = getAllHTMLNodesWithText(document);
    const [newTextNodes, existingTokenNodes] = sortHTMLTextNodes(textNodes);
    const needUpdateNodes = [];
    for (const existingTokenNode of existingTokenNodes)
    {
        const token = LangToken.htmlElementToToken(existingTokenNode);
        if (!token)
            continue;

        if (token.langId == langId && token.token == tokenText)
        {
            needUpdateNodes.push(existingTokenNode);
        }
    }

    logger.log('updateSpecificTokenHTML', 'found ' + needUpdateNodes.length + ' html nodes to update for type (' + tokenText + ', ' + langId + ')', LogType.msg);
    for (const needUpdateNode of needUpdateNodes)
    {
        tryUpdateTokenHTMLNode(needUpdateNode);
    }
}

function updateAllTokenHTML()
{
    logger.log('updateAllTokenHTML', 'updateing full page, all tokens', LogType.msg);
    const textNodes = getAllHTMLNodesWithText(document);
    const [newTextNodes, existingTokenNodes] = sortHTMLTextNodes(textNodes);
    for (const existingTokenNode of existingTokenNodes)
    {
        tryUpdateTokenHTMLNode(existingTokenNode);
    }
}

async function mainParse(langId)
{
    logger.log("mainParse", "setting language to '" + langId + "'", LogType.msg);

    // get the correct langManager
    const langManager = getLangManager(langId);

    if (langManager == null)
    {
        logger.log("mainParse", "the language '" + langId + "' is not yet supported", LogType.msg);
        return;
    }
    
    // get all the text nodes
    const textNodes = getAllHTMLNodesWithText(document);
    logger.log("mainParse", "got " + textNodes.length + " text nodes from document", LogType.msg);

    // take out the existing nodes and try to update them
    const [newTextNodes, existingTokenNodes] = sortHTMLTextNodes(textNodes);
    for (const existingTokenNode of existingTokenNodes)
    {
        tryUpdateTokenHTMLNode(existingTokenNode);
    }


    // filter the nodes through the langManager to get just ones with the target lang in them
    const fitleredTextNodes = [];
    for (const node of newTextNodes)
    {
        if (langManager.textContainsTargetLang(node.nodeValue))
            fitleredTextNodes.push(node);
    }

    logger.log("mainParse", "got " + fitleredTextNodes.length + " text nodes with taget lang", LogType.msg);

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
