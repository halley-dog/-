(function () {
  "use strict";

  var STORAGE_KEY = "xhsPriceBuilderDraftV5";
  var HISTORY_LIMIT = 30;
  var state = null;
  var selectedId = null;
  var draggedId = null;
  var dropMode = "before";
  var touchDrag = null;
  var componentTouchDrag = null;
  var suppressComponentClick = false;
  var history = [];
  var redoHistory = [];
  var editSnapshotTaken = false;
  var toastTimer = null;

  var canvas = document.getElementById("receiptCanvas");
  var blockList = document.getElementById("blockList");
  var sheet = document.getElementById("editorSheet");
  var sheetBackdrop = document.getElementById("sheetBackdrop");
  var sheetBody = document.getElementById("sheetBody");
  var sheetTitle = document.getElementById("sheetTitle");
  var sheetEyebrow = document.getElementById("sheetEyebrow");
  var imagePicker = document.getElementById("imagePicker");
  var toast = document.getElementById("toast");
  var previewPage = document.getElementById("previewPage");
  var previewList = document.getElementById("previewList");
  var previewNote = document.getElementById("previewNote");
  var exportButton = document.getElementById("exportButton");
  var exportMode = "long";
  var previewImages = [];
  var pendingFontKind = null;
  var pendingTemplateFactory = null;
  var toolDownloadUrl = null;

  function makeId() {
    return "b" + Date.now().toString(36) + Math.floor(Math.random() * 10000).toString(36);
  }

  function textBlock(text, level, align, top, bottom) {
    return { id: makeId(), type: "text", text: text, level: level, align: align, marginTop: top, marginBottom: bottom };
  }

  function dividerBlock(top, bottom) {
    return { id: makeId(), type: "divider", marginTop: top, marginBottom: bottom, thickness: 1, style: "dashed" };
  }

  function pageBreakBlock() {
    return { id: makeId(), type: "pageBreak", marginTop: 0, marginBottom: 0 };
  }

  function flowchartBlock() {
    return { id: makeId(), type: "flowchart", nodes: [{ percent: "80%", title: "一步到位", description: "确认基础方案" }, { percent: "90%", title: "调整", description: "集中修改细节" }, { percent: "100%", title: "最终成稿", description: "交付最终文件" }], marginTop: 18, marginBottom: 18 };
  }

  function pageLinkBlock() {
    return { id: makeId(), type: "pageLink", label: "查看例文", targetPageId: "first", inlineParentId: "", marginTop: 6, marginBottom: 6 };
  }

  function imageBlock() {
    return { id: makeId(), type: "image", src: "", alt: "价目表图片", imageGroup: "", groupColumns: 2, groupGap: 10, parentId: "", parentState: "selected", indentChild: true, marginTop: 12, marginBottom: 12, radius: 2 };
  }

  function priceSectionBlock(title, note, parentId, parentState) {
    return { id: makeId(), type: "priceSection", title: title, note: note || "", parentId: parentId || "", parentState: parentState || "selected", marginTop: 12, marginBottom: note ? 9 : 14 };
  }

  function priceChoiceBlock(label, price, selected, exclusiveGroup, parentId, parentState) {
    return { id: makeId(), type: "priceChoice", label: label, price: price, priceMode: "fixed", priceParentId: "", priceMultiplier: 1, currency: "¥", selected: Boolean(selected), exclusiveGroup: exclusiveGroup || "", parentId: parentId || "", parentState: parentState || "selected", separatorStyle: "dashed", separatorThickness: 2, marginTop: 0, marginBottom: 0 };
  }

  function priceTotalBlock(label) {
    return { id: makeId(), type: "priceTotal", label: label || "合计", currency: "¥", marginTop: 30, marginBottom: 12 };
  }

  function templateIllustrator() {
    var avatar = priceChoiceBlock("头像", 200, false, "illustration-type");
    var bust = priceChoiceBlock("胸像", 350, false, "illustration-type");
    var half = priceChoiceBlock("半身", 500, false, "illustration-type");
    var full = priceChoiceBlock("全身", 800, false, "illustration-type");
    var illustration = priceChoiceBlock("插图", 1000, false, "illustration-type");
    var blocks = [textBlock("画稿委托价目表", "h1", "center", 2, 7), textBlock("ILLUSTRATION COMMISSION", "body", "center", 0, 19), dividerBlock(0, 18), priceSectionBlock("稿件类型", "")];
    appendChoiceImage(blocks, avatar); appendChoiceImage(blocks, bust); appendChoiceImage(blocks, half); appendChoiceImage(blocks, full); appendChoiceImage(blocks, illustration);
    blocks.push(priceSectionBlock("加选", ""), priceChoiceBlock("双人", 400, false), priceChoiceBlock("商用", 500, false), priceTotalBlock("合计"), dividerBlock(0, 16), textBlock("**排期确认后付定金**\n复杂背景与加急需求请提前沟通", "body", "center", 0, 4));
    return {
      template: "illustrator",
      _dirty: false,
      _spacingDataV2: true,
      _spacingDataV3: true,
      paper: "#fffaf4",
      ink: "#322a27",
      accent: "#df6c5c",
      edgeStyle: "square",
      texture: "none",
      zhFont: "PriceNotoSerifZh",
      latinFont: "PriceSourceSerifLatin",
      padding: 28,
      blocks: blocks
    };
  }

  function appendChoiceImage(blocks, parent) {
    var image = imageBlock(); image.parentId = parent.id;
    blocks.push(parent, image);
  }

  function templateWriter() {
    var snackShort = priceChoiceBlock("短打", 80, false, "article-type");
    var styleReview = priceChoiceBlock("文风鉴", 120, false, "article-type");
    var dramaShort = priceChoiceBlock("短篇", 300, false, "article-type");
    var dramaLong = priceChoiceBlock("长篇", 800, false, "article-type");
    var blocks = [textBlock("文字委托", "h1", "left", 2, 3), textBlock("WRITING / 2026", "body", "left", 0, 18), dividerBlock(0, 16), priceSectionBlock("零食类", "字数短，可以自由发挥"), snackShort];
    appendOrientationChildren(blocks, snackShort, "orientation-short");
    blocks.push(styleReview); appendOrientationChildren(blocks, styleReview, "orientation-style");
    blocks.push(priceSectionBlock("正剧", "需要详细背景和人物设定"), dramaShort); appendOrientationChildren(blocks, dramaShort, "orientation-drama-short");
    blocks.push(dramaLong); appendOrientationChildren(blocks, dramaLong, "orientation-drama-long");
    blocks.push(priceSectionBlock("可加选", "可多选"), priceChoiceBlock("排版", 50, false), priceChoiceBlock("禁止发布", 100, false), priceChoiceBlock("商用", 300, false), priceTotalBlock("合计"), dividerBlock(0, 12), textBlock("**不接急单** · 档期以确认为准", "body", "right", 0, 2));
    return {
      template: "writer",
      _dirty: false,
      _spacingDataV2: true,
      _spacingDataV3: true,
      paper: "#f8f4ea",
      ink: "#25231f",
      accent: "#8b5a35",
      edgeStyle: "square",
      texture: "none",
      zhFont: "PriceNotoSerifZh",
      latinFont: "PriceSourceSerifLatin",
      padding: 24,
      blocks: blocks
    };
  }

  function appendOrientationChildren(blocks, parent, groupName) {
    blocks.push(priceChoiceBlock("BL", 0, true, groupName, parent.id, "selected"));
    blocks.push(priceChoiceBlock("GL", 0, false, groupName, parent.id, "selected"));
    blocks.push(priceChoiceBlock("BG", 0, false, groupName, parent.id, "selected"));
    blocks.push(priceChoiceBlock("GB", 0, false, groupName, parent.id, "selected"));
  }

  function templateDesign() {
    var badge = priceChoiceBlock("吧唧", 80, false, "product-type");
    var ticket = priceChoiceBlock("镭射票", 120, false, "product-type");
    var postcard = priceChoiceBlock("明信片", 100, false, "product-type");
    var card = priceChoiceBlock("小卡", 90, false, "product-type");
    var designBlocks = [textBlock("制品设计价目表", "h1", "center", 2, 8), textBlock("FAN MERCH DESIGN", "body", "center", 0, 18), priceSectionBlock("制品类型", "")];
    appendCraftChildren(designBlocks, badge, "craft-badge"); appendCraftChildren(designBlocks, ticket, "craft-ticket"); appendCraftChildren(designBlocks, postcard, "craft-postcard"); appendCraftChildren(designBlocks, card, "craft-card");
    designBlocks.push(priceTotalBlock("合计"), dividerBlock(0, 14), textBlock("**报价含一次整体调整**\n特殊尺寸与复杂工艺请单独沟通", "body", "center", 0, 2));
    return {
      template: "design",
      _dirty: false,
      _spacingDataV2: true,
      _spacingDataV3: true,
      paper: "#f5f7f4",
      ink: "#1d2722",
      accent: "#267a56",
      edgeStyle: "square",
      texture: "none",
      zhFont: "PriceNotoSerifZh",
      latinFont: "PriceSourceSerifLatin",
      padding: 30,
      blocks: designBlocks
    };
  }

  function appendCraftChildren(blocks, parent, groupName) {
    blocks.push(parent);
    blocks.push(priceChoiceBlock("无", 0, true, groupName, parent.id, "selected"));
    blocks.push(priceChoiceBlock("双面", 40, false, groupName, parent.id, "selected"));
    blocks.push(priceChoiceBlock("烫色", 20, false, groupName, parent.id, "selected"));
    var firstImage = imageBlock(); firstImage.parentId = parent.id; blocks.push(firstImage);
    blocks.push(priceChoiceBlock("逆向镭射", 30, false, groupName, parent.id, "selected"));
    var secondImage = imageBlock(); secondImage.parentId = parent.id; blocks.push(secondImage);
  }

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function loadState() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (error) { saved = null; }
    if (saved) {
      try { return JSON.parse(saved); } catch (error2) { return templateIllustrator(); }
    }
    return templateIllustrator();
  }

  function normalizeState(data) {
    if (typeof data._dirty !== "boolean") data._dirty = true;
    if (!data.zhFont || data.zhFont === "PriceBuiltinZh") data.zhFont = "PriceNotoSerifZh";
    if (!data.latinFont || data.latinFont === "PriceBuiltinLatin") data.latinFont = "PriceSourceSerifLatin";
    if (!data.edgeStyle || data.edgeStyle === "sawtooth") data.edgeStyle = "square";
    if (!data.texture) data.texture = "none";
    if (["none", "cubes", "flowers", "food", "xv", "clean-gray-paper", "foggy-birds", "gray-floral", "lined-paper", "rocky-wall"].indexOf(data.texture) < 0) data.texture = "none";
    var normalizeIndex;
    for (normalizeIndex = 0; normalizeIndex < data.blocks.length; normalizeIndex += 1) if (data.blocks[normalizeIndex].type === "priceChoice") {
      if (!data.blocks[normalizeIndex].priceMode) data.blocks[normalizeIndex].priceMode = "fixed";
      if (typeof data.blocks[normalizeIndex].priceMultiplier !== "number") data.blocks[normalizeIndex].priceMultiplier = 1;
      if (!data.blocks[normalizeIndex].priceParentId) data.blocks[normalizeIndex].priceParentId = "";
      if (!data.blocks[normalizeIndex].separatorStyle) data.blocks[normalizeIndex].separatorStyle = "dashed";
      if (typeof data.blocks[normalizeIndex].separatorThickness !== "number") data.blocks[normalizeIndex].separatorThickness = 2;
    }
    for (normalizeIndex = 0; normalizeIndex < data.blocks.length; normalizeIndex += 1) if (data.blocks[normalizeIndex].type === "image") {
      if (!data.blocks[normalizeIndex].imageGroup) data.blocks[normalizeIndex].imageGroup = "";
      if (!data.blocks[normalizeIndex].groupColumns) data.blocks[normalizeIndex].groupColumns = 2;
      if (typeof data.blocks[normalizeIndex].groupGap !== "number") data.blocks[normalizeIndex].groupGap = 10;
      if (!data.blocks[normalizeIndex].parentId) data.blocks[normalizeIndex].parentId = "";
      if (!data.blocks[normalizeIndex].parentState) data.blocks[normalizeIndex].parentState = "selected";
    }
    for (normalizeIndex = 0; normalizeIndex < data.blocks.length; normalizeIndex += 1) if (data.blocks[normalizeIndex].parentId && typeof data.blocks[normalizeIndex].indentChild !== "boolean") data.blocks[normalizeIndex].indentChild = true;
    if (!data._spacingDataV2) { for (normalizeIndex = 0; normalizeIndex < data.blocks.length; normalizeIndex += 1) if (data.blocks[normalizeIndex].type === "priceTotal") data.blocks[normalizeIndex].marginTop = (Number(data.blocks[normalizeIndex].marginTop) || 0) + 16; data._spacingDataV2 = true; }
    if (!data._spacingDataV3) { for (normalizeIndex = 0; normalizeIndex < data.blocks.length; normalizeIndex += 1) if (data.blocks[normalizeIndex].type === "priceSection") data.blocks[normalizeIndex].marginBottom = (Number(data.blocks[normalizeIndex].marginBottom) || 0) + (data.blocks[normalizeIndex].note ? 5 : 10); data._spacingDataV3 = true; }
    for (normalizeIndex = 0; normalizeIndex < data.blocks.length; normalizeIndex += 1) if (data.blocks[normalizeIndex].type === "pageLink") {
      if (!data.blocks[normalizeIndex].targetPageId) data.blocks[normalizeIndex].targetPageId = "first";
      if (!data.blocks[normalizeIndex].inlineParentId) data.blocks[normalizeIndex].inlineParentId = "";
    }
    return data;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { showToast("草稿暂时无法保存"); }
  }

  function updateUndoButton() {
    document.getElementById("undoButton").disabled = history.length === 0;
    document.getElementById("redoButton").disabled = redoHistory.length === 0;
  }

  function pushHistory() {
    history.push(JSON.stringify(state));
    if (history.length > HISTORY_LIMIT) history.shift();
    redoHistory = [];
    state._dirty = true;
    updateUndoButton();
  }

  function recordEditOnce() {
    if (editSnapshotTaken) return;
    pushHistory();
    editSnapshotTaken = true;
  }

  function undo() {
    if (!history.length) return;
    try {
      redoHistory.push(JSON.stringify(state));
      if (redoHistory.length > HISTORY_LIMIT) redoHistory.shift();
      state = JSON.parse(history.pop());
      selectedId = null;
      saveState();
      render();
      closeSheet();
      updateUndoButton();
      showToast("已撤销上一步");
    } catch (error) {
      history = [];
      updateUndoButton();
    }
  }

  function redo() {
    if (!redoHistory.length) return;
    try {
      history.push(JSON.stringify(state));
      if (history.length > HISTORY_LIMIT) history.shift();
      state = JSON.parse(redoHistory.pop());
      selectedId = null;
      saveState(); render(); closeSheet(); updateUndoButton();
      showToast("已恢复撤销的操作");
    } catch (error) {
      redoHistory = [];
      updateUndoButton();
    }
  }

  function getBlock(id) {
    var i;
    for (i = 0; i < state.blocks.length; i += 1) {
      if (state.blocks[i].id === id) return state.blocks[i];
    }
    return null;
  }

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof text === "string") element.textContent = text;
    return element;
  }

  function applyTheme() {
    canvas.style.setProperty("--receipt-paper", state.paper);
    canvas.style.setProperty("--receipt-ink", state.ink);
    canvas.style.setProperty("--receipt-accent", state.accent);
    canvas.style.setProperty("--receipt-font", '"' + (state.latinFont || "PriceSourceSerifLatin") + '", "' + (state.zhFont || "PriceNotoSerifZh") + '", serif');
    canvas.classList.remove("edge-sawtooth", "edge-rounded", "edge-square");
    canvas.classList.add("edge-" + (state.edgeStyle || "square"));
    canvas.setAttribute("data-texture", state.texture || "none");
    blockList.style.paddingLeft = state.padding + "px";
    blockList.style.paddingRight = state.padding + "px";
  }

  function render() {
    var pagesFragment = document.createDocumentFragment();
    var i;
    applyTheme();
    blockList.textContent = "";
    var pageNumber = 1;
    var page = createReceiptPage("", pageNumber);
    for (i = 0; i < state.blocks.length; i += 1) {
      if (state.blocks[i].type === "pageBreak") { pagesFragment.appendChild(page.page); pageNumber += 1; page = createReceiptPage(state.blocks[i].id, pageNumber); continue; }
      if (state.blocks[i].type === "pageLink" && state.blocks[i].inlineParentId) continue;
      if (!isBlockVisible(state.blocks[i])) continue;
      if (state.blocks[i].type === "image" && state.blocks[i].imageGroup) {
        var groupName = state.blocks[i].imageGroup;
        var row = createElement("div", "image-block-row columns-" + (state.blocks[i].groupColumns || 2));
        var groupGap = state.blocks[i].groupGap || 0;
        row.style.marginLeft = -(groupGap / 2) + "px"; row.style.marginRight = -(groupGap / 2) + "px";
        while (i < state.blocks.length && state.blocks[i].type === "image" && state.blocks[i].imageGroup === groupName) {
          if (isBlockVisible(state.blocks[i])) { var groupedBlock = renderBlock(state.blocks[i]); groupedBlock.style.marginLeft = groupGap / 2 + "px"; groupedBlock.style.marginRight = groupGap / 2 + "px"; groupedBlock.style.width = "calc(" + (100 / (state.blocks[i].groupColumns || 2)) + "% - " + groupGap + "px)"; row.appendChild(groupedBlock); }
          i += 1;
        }
        i -= 1; page.content.appendChild(row);
      } else page.content.appendChild(renderBlock(state.blocks[i]));
    }
    pagesFragment.appendChild(page.page);
    blockList.appendChild(pagesFragment);
  }

  function createReceiptPage(pageBreakId, pageNumber) {
    var page = createElement("div", "receipt edge-" + (state.edgeStyle || "square"));
    page.setAttribute("data-texture", state.texture || "none");
    page.setAttribute("data-page-target", pageBreakId || "first");
    if (pageBreakId) { page.setAttribute("data-page-break-id", pageBreakId); page.classList.add("removable-page"); }
    var top = createElement("div", "receipt-edge receipt-edge-top");
    var content = createElement("div", "receipt-content");
    content.appendChild(createElement("span", "page-number", "第 " + pageNumber + " 页"));
    var bottom = createElement("div", "receipt-edge receipt-edge-bottom");
    page.appendChild(top); page.appendChild(content); page.appendChild(bottom);
    return { page: page, content: content };
  }

  function renderBlock(block) {
    var wrapper = createElement("div", "receipt-block");
    var content;
    var grip = createElement("button", "block-grip", "↕");
    wrapper.setAttribute("data-id", block.id);
    wrapper.setAttribute("draggable", "true");
    wrapper.style.marginTop = block.marginTop + "px";
    wrapper.style.marginBottom = block.marginBottom + "px";
    if (block.parentId && block.indentChild !== false) wrapper.classList.add("child-block");
    if (block.id === selectedId) wrapper.classList.add("selected");
    grip.type = "button";
    grip.setAttribute("aria-label", "拖动排序");
    wrapper.appendChild(grip);

    if (block.type === "text") {
      content = createElement("p", "block-text text-" + block.level + " align-" + block.align);
      appendMarkdownText(content, block.text);
    } else if (block.type === "image") {
      content = createElement("div", "block-image-frame");
      content.style.borderRadius = block.radius + "px";
      if (block.src) {
        var img = createElement("img");
        img.src = block.src;
        img.alt = block.alt || "价目表图片";
        content.appendChild(img);
      } else {
        content.appendChild(createElement("div", "image-placeholder", "点击添加图片"));
      }
    } else if (block.type === "priceSection") {
      content = createElement("div", "price-section-block");
      content.appendChild(createElement("h3", "price-group-title", block.title));
      if (block.note) content.appendChild(createElement("p", "price-section-label", block.note));
    } else if (block.type === "priceChoice") {
      content = renderPriceChoice(block);
    } else if (block.type === "priceTotal") {
      content = createElement("div", "price-total");
      content.appendChild(createElement("span", "price-total-label", block.label));
      content.appendChild(createElement("span", "price-total-value", block.currency + " " + formatPrice(calculateTotal())));
    } else if (block.type === "flowchart") {
      content = renderFlowchart(block);
    } else if (block.type === "pageLink") {
      content = renderPageLink(block, false);
    } else {
      content = createElement("hr", "block-divider");
      content.style.borderTopWidth = block.thickness + "px";
      content.style.borderTopStyle = block.style;
    }
    wrapper.appendChild(content);
    return wrapper;
  }

  function renderFlowchart(block) {
    var chart = createElement("div", "flowchart"); var line = createElement("div", "flowchart-line"); var inset = block.nodes.length ? 50 / block.nodes.length : 50; line.style.left = inset + "%"; line.style.right = inset + "%"; chart.appendChild(line);
    var nodes = createElement("div", "flowchart-nodes"); var i;
    for (i = 0; i < block.nodes.length; i += 1) { var node = createElement("div", "flowchart-node"); node.appendChild(createElement("strong", "flowchart-percent", block.nodes[i].percent)); node.appendChild(createElement("span", "flowchart-dot")); node.appendChild(createElement("span", "flowchart-title", block.nodes[i].title)); node.appendChild(createElement("small", "flowchart-description", block.nodes[i].description)); nodes.appendChild(node); }
    chart.appendChild(nodes); return chart;
  }

  function renderPageLink(block, inline) {
    var link = createElement("button", inline ? "page-link page-link-inline" : "page-link", block.label || "查看页面");
    link.type = "button"; link.setAttribute("data-link-id", block.id);
    link.addEventListener("click", function (event) {
      event.stopPropagation();
      selectedId = block.id; render(); openSheet("block");
    });
    return link;
  }

  function getPriceChoice(id) {
    var block = getBlock(id);
    return block && block.type === "priceChoice" ? block : null;
  }

  function isBlockVisible(block, trail) {
    if (!block.parentId) return true;
    var parent = getPriceChoice(block.parentId);
    if (!parent) return true;
    trail = trail || {};
    if (trail[block.id]) return true;
    trail[block.id] = true;
    if (!isBlockVisible(parent, trail)) return false;
    if (block.parentState === "group-selected") {
      var group = parent.exclusiveGroup;
      var i;
      for (i = 0; i < state.blocks.length; i += 1) if (state.blocks[i].type === "priceChoice" && state.blocks[i].exclusiveGroup === group && state.blocks[i].selected && isBlockVisible(state.blocks[i], trail)) return true;
      return false;
    }
    if (block.parentState === "group-other-selected") {
      var parentGroup = parent.exclusiveGroup;
      var groupIndex;
      for (groupIndex = 0; groupIndex < state.blocks.length; groupIndex += 1) if (state.blocks[groupIndex].type === "priceChoice" && state.blocks[groupIndex].exclusiveGroup === parentGroup && state.blocks[groupIndex].id !== parent.id && state.blocks[groupIndex].selected && isBlockVisible(state.blocks[groupIndex], trail)) return true;
      return false;
    }
    return block.parentState === "unselected" ? !parent.selected : parent.selected;
  }

  function calculateTotal() {
    var total = 0;
    var i;
    for (i = 0; i < state.blocks.length; i += 1) if (state.blocks[i].type === "priceChoice" && state.blocks[i].selected && isBlockVisible(state.blocks[i])) total += getEffectivePrice(state.blocks[i]);
    return total;
  }

  function getEffectivePrice(block, trail) {
    if (!block || block.type !== "priceChoice") return 0;
    if (block.priceMode !== "multiplier" || !block.priceParentId) return Number(block.price) || 0;
    trail = trail || {};
    if (trail[block.id]) return 0;
    trail[block.id] = true;
    return getEffectivePrice(getPriceChoice(block.priceParentId), trail) * (Number(block.priceMultiplier) || 0);
  }

  function renderPriceChoice(block) {
    var row = createElement("div", "price-choice");
    row.style.borderBottomStyle = block.separatorStyle === "none" ? "none" : (block.separatorStyle || "dashed");
    row.style.borderBottomWidth = (block.separatorThickness || 2) + "px";
    row.appendChild(createElement("span", "price-choice-label", block.label));
    var linkIndex;
    for (linkIndex = 0; linkIndex < state.blocks.length; linkIndex += 1) if (state.blocks[linkIndex].type === "pageLink" && state.blocks[linkIndex].inlineParentId === block.id) row.appendChild(renderPageLink(state.blocks[linkIndex], true));
    row.appendChild(createElement("span", "price-choice-amount", block.currency + " " + formatPrice(getEffectivePrice(block))));
    var selector = createElement("button", "price-choice-icon", block.selected ? "\ue806" : "\uf096");
    selector.type = "button";
    selector.setAttribute("aria-label", block.selected ? "取消选择 " + block.label : "选择 " + block.label);
    selector.addEventListener("click", function (event) {
      event.stopPropagation();
      pushHistory();
      if (block.exclusiveGroup) {
        var i;
        if (block.selected) block.selected = false;
        else for (i = 0; i < state.blocks.length; i += 1) if (state.blocks[i].type === "priceChoice" && state.blocks[i].exclusiveGroup === block.exclusiveGroup) state.blocks[i].selected = state.blocks[i].id === block.id;
      } else block.selected = !block.selected;
      saveState(); render();
    });
    row.appendChild(selector);
    return row;
  }

  function formatPrice(value) {
    var number = Number(value) || 0;
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function appendMarkdownText(element, text) {
    var pattern = /\*\*([^*]+)\*\*/g;
    var lastIndex = 0;
    var match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) element.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      element.appendChild(createElement("strong", "", match[1]));
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < text.length) element.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  function openSheet(kind) {
    editSnapshotTaken = false;
    sheetBody.textContent = "";
    if (kind === "templates") buildTemplatesPanel();
    else if (kind === "add") buildAddPanel();
    else if (kind === "structure") buildStructurePanel();
    else if (kind === "design") buildDesignPanel();
    else buildBlockPanel(getBlock(selectedId));
    sheet.classList.add("open");
    sheetBackdrop.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
  }

  function closeSheet() {
    sheet.classList.remove("open");
    sheetBackdrop.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
  }

  function setSheetHeading(kicker, title) {
    sheetEyebrow.textContent = kicker;
    sheetTitle.textContent = title;
  }

  function buildTemplatesPanel() {
    setSheetHeading("START", "选择行业模板");
    var list = createElement("div", "card-list");
    addTemplateCard(list, "illustrator", "画手", "稿件委托 · 商用授权", templateIllustrator);
    addTemplateCard(list, "writer", "文手", "原创写作 · 文案润色", templateWriter);
    addTemplateCard(list, "design", "制品设计", "吧唧 · 镭射票 · 明信片", templateDesign);
    sheetBody.appendChild(list);
    sheetBody.appendChild(createElement("p", "card-note", "应用模板会替换当前画布，之后仍可修改每个模块。"));
  }

  function addTemplateCard(list, key, title, note, factory) {
    var button = createElement("button", "choice-card" + (state.template === key ? " active" : ""));
    button.type = "button";
    button.appendChild(createElement("span", "card-kicker", key.toUpperCase()));
    button.appendChild(createElement("span", "card-title", title));
    button.appendChild(createElement("span", "card-note", note));
    button.addEventListener("click", function () {
      if (state._dirty) { openTemplateConfirm(factory); return; }
      applyTemplate(factory);
    });
    list.appendChild(button);
  }

  function applyTemplate(factory) {
    pushHistory(); state = cloneData(factory()); selectedId = null;
    saveState(); render(); closeSheet(); showToast("模板已应用");
  }

  function openTemplateConfirm(factory) {
    pendingTemplateFactory = factory;
    var modal = document.getElementById("templateConfirmModal");
    modal.classList.add("open"); modal.setAttribute("aria-hidden", "false");
    document.getElementById("templateConfirmCancel").focus();
  }

  function closeTemplateConfirm() {
    pendingTemplateFactory = null;
    var modal = document.getElementById("templateConfirmModal");
    modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true");
  }

  function buildAddPanel() {
    setSheetHeading("BLOCKS", "拖到价目表中");
    var list = createElement("div", "card-list");
    addComponentCard(list, "text", "T", "文本框", "标题、正文与价格", function () { return textBlock("点击这里修改文字", "body", "left", 8, 8); });
    addComponentCard(list, "image", "▧", "图片框", "上传本地图片", imageBlock);
    addComponentCard(list, "imageGroup", "▦", "图片组", "默认一行两张，可继续复制或修改列数", function () { var group = "images-" + makeId(); var first = imageBlock(); var second = imageBlock(); first.imageGroup = group; second.imageGroup = group; return [first, second]; });
    addComponentCard(list, "divider", "—", "分割线", "分隔内容区块", function () { return dividerBlock(12, 12); });
    addComponentCard(list, "priceSection", "§", "价格区标题", "一个可独立排序的区域标题", function () { return priceSectionBlock("服务选择", "请选择"); });
    addComponentCard(list, "priceChoice", "□", "价格选项", "文字、数字价格与选框", function () { return priceChoiceBlock("服务项目", 100, false); });
    addComponentCard(list, "priceTotal", "Σ", "价格合计", "汇总当前可见且选中的选项", function () { return priceTotalBlock("合计"); });
    addComponentCard(list, "flowchart", "→", "流程图", "横向节点、进度、标题与描述", flowchartBlock);
    addComponentCard(list, "pageLink", "↗", "页内链接", "跳到价目表中的其他页面；拖进价格选项可插入行内", pageLinkBlock);
    sheetBody.appendChild(list);
    sheetBody.appendChild(createElement("p", "card-note", "电脑端可直接拖入画布；手机端长按模块后拖到价目表。点击仍可快速添加到底部。"));
  }

  function addComponentCard(list, componentType, symbol, title, note, factory) {
    var button = createElement("button", "add-card");
    button.type = "button";
    button.setAttribute("draggable", "true");
    button.setAttribute("data-component", componentType);
    button.appendChild(createElement("span", "add-symbol", symbol));
    button.appendChild(createElement("span", "card-title", title));
    button.appendChild(createElement("span", "card-note", note));
    button.addEventListener("click", function () {
      if (suppressComponentClick) { suppressComponentClick = false; return; }
      insertComponent(factory, state.blocks.length, title);
    });
    button.addEventListener("dragstart", function (event) {
      closeSheet();
      componentTouchDrag = { factory: factory, title: title, desktop: true };
      button.classList.add("component-dragging");
      blockList.classList.add("component-drop-active");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", componentType);
      }
    });
    button.addEventListener("dragend", function () {
      componentTouchDrag = null;
      button.classList.remove("component-dragging");
      blockList.classList.remove("component-drop-active");
      clearDropMarks();
    });
    button.addEventListener("touchstart", function (event) {
      suppressComponentClick = false;
      var touch = event.touches[0];
      componentTouchDrag = {
        factory: factory,
        title: title,
        startX: touch.clientX,
        startY: touch.clientY,
        ghost: null,
        moved: false
      };
    }, { passive: true });
    list.appendChild(button);
  }

  function insertComponent(factory, index, title, parentId) {
    var created = factory();
    var blocks = Array.isArray(created) ? created : [created];
    pushHistory();
    if (parentId) {
      var parentIndex;
      for (parentIndex = 0; parentIndex < blocks.length; parentIndex += 1) {
        if (blocks[parentIndex].type === "pageLink" && getPriceChoice(parentId)) blocks[parentIndex].inlineParentId = parentId;
        else { blocks[parentIndex].parentId = parentId; blocks[parentIndex].parentState = "selected"; }
      }
    }
    Array.prototype.splice.apply(state.blocks, [index, 0].concat(blocks));
    selectedId = blocks[0].id;
    saveState();
    render();
    closeSheet();
    showToast(title + "已添加");
    setTimeout(function () {
      var target = blockList.querySelector('[data-id="' + blocks[0].id + '"]');
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  function buildStructurePanel() {
    setSheetHeading("STRUCTURE", "价目表结构");
    var tree = createElement("div", "structure-tree");
    var pageRow = createElement("button", "tree-row");
    pageRow.type = "button";
    pageRow.appendChild(createElement("span", "tree-icon", "▣"));
    var pageCopy = createElement("span", "tree-copy");
    pageCopy.appendChild(createElement("span", "tree-title", "背景与画布"));
    pageCopy.appendChild(createElement("span", "tree-note", "纸张、文字、强调色与边距"));
    pageRow.appendChild(pageCopy);
    pageRow.appendChild(createElement("span", "tree-arrow", "›"));
    pageRow.addEventListener("click", function () { openSheet("design"); });
    tree.appendChild(pageRow);

    var i;
    for (i = 0; i < state.blocks.length; i += 1) addTreeBlock(tree, state.blocks[i], i);
    sheetBody.appendChild(tree);
  }

  function addTreeBlock(tree, block, index) {
    var labels = { text: "文本", image: "图片", divider: "分割线", priceSection: "价格区标题", priceChoice: "价格选项", priceTotal: "价格合计", pageBreak: "新页面", flowchart: "流程图", pageLink: "页内链接" };
    var icons = { text: "T", image: "▧", divider: "—", priceSection: "§", priceChoice: "□", priceTotal: "Σ", pageBreak: "+", flowchart: "→", pageLink: "↗" };
    var row = createElement("button", "tree-row tree-indent" + (block.parentId && block.indentChild !== false ? " tree-child" : "") + (selectedId === block.id ? " selected" : ""));
    row.type = "button";
    row.appendChild(createElement("span", "tree-icon", icons[block.type]));
    var copy = createElement("span", "tree-copy");
    copy.appendChild(createElement("span", "tree-title", labels[block.type] + " · " + (index + 1)));
    var note;
    if (block.type === "text") note = block.text.replace(/\*\*/g, "");
    else if (block.type === "image") note = block.src ? "已添加图片" : "空图片框";
    else if (block.type === "divider") note = block.style + " 分割线";
    else if (block.type === "priceSection") note = block.title + (block.parentId ? " · 条件显示" : "");
    else if (block.type === "priceChoice") note = block.label + " · " + block.currency + formatPrice(getEffectivePrice(block)) + (block.priceMode === "multiplier" ? " · 「" + parentLabel(block.priceParentId) + "」×" + block.priceMultiplier : "") + (block.exclusiveGroup ? " · 互斥组 " + block.exclusiveGroup : " · 可多选") + (block.parentId ? " · 由「" + parentLabel(block.parentId) + "」控制" : "");
    else if (block.type === "priceTotal") note = block.label + " · 当前 " + block.currency + formatPrice(calculateTotal());
    else if (block.type === "flowchart") note = block.nodes.length + " 个流程节点";
    else if (block.type === "pageLink") note = (block.label || "查看页面") + " · 指向第 " + pageNumberForTarget(block.targetPageId) + " 页" + (block.inlineParentId ? " · 位于价格选项内" : "");
    else note = "从这里开始新的一页";
    copy.appendChild(createElement("span", "tree-note", note));
    row.appendChild(copy);
    row.appendChild(createElement("span", "tree-arrow", "›"));
    row.addEventListener("click", function () {
      selectedId = block.id;
      render();
      openSheet("block");
      setTimeout(function () { var target = blockList.querySelector('[data-id="' + block.id + '"]'); if (!target && block.type === "pageBreak") target = blockList.querySelector('[data-page-break-id="' + block.id + '"]'); if (target) target.scrollIntoView({ behavior: "smooth", block: "center" }); }, 80);
    });
    tree.appendChild(row);
  }

  function parentLabel(id) {
    var parent = getPriceChoice(id);
    return parent ? parent.label : "未找到的父项";
  }

  function buildDesignPanel() {
    setSheetHeading("CANVAS", "背景与画布");
    var colors = createElement("div", "color-row");
    colors.appendChild(makeColorField("纸张", "paper", state.paper));
    colors.appendChild(makeColorField("文字", "ink", state.ink));
    colors.appendChild(makeColorField("强调", "accent", state.accent));
    sheetBody.appendChild(colors);
    sheetBody.appendChild(makePxInputField("左右边距", state.padding, 12, 80, function (value) {
      state.padding = value;
      applyTheme();
      saveState();
    }));
    sheetBody.appendChild(makeSegmentField("背景边缘", state.edgeStyle || "square", [["rounded", "圆角"], ["square", "直角"]], function (value) { state.edgeStyle = value; saveState(); render(); sheetBody.textContent = ""; buildDesignPanel(); }));
    sheetBody.appendChild(makeSelectField("背景纹理", state.texture || "none", [["none", "无纹理"], ["clean-gray-paper", "清灰纸"], ["lined-paper", "横线纸"], ["gray-floral", "灰花"], ["foggy-birds", "雾鸟"], ["rocky-wall", "岩壁"], ["cubes", "方块"], ["flowers", "花朵"], ["food", "食物"], ["xv", "交叉纹"]], function (value) { state.texture = value; saveState(); render(); }));
    sheetBody.appendChild(makeSelectField("中文字体", state.zhFont, fontOptions("zh"), function (value) { state.zhFont = value; applyTheme(); saveState(); render(); }));
    sheetBody.appendChild(makeSelectField("英文字体", state.latinFont, fontOptions("latin"), function (value) { state.latinFont = value; applyTheme(); saveState(); render(); }));
    var importZh = createElement("button", "secondary-button", "导入中文字体");
    importZh.type = "button";
    importZh.addEventListener("click", function () { pendingFontKind = "zh"; document.getElementById("fontPicker").click(); });
    sheetBody.appendChild(importZh);
    var importLatin = createElement("button", "secondary-button", "导入英文字体");
    importLatin.type = "button";
    importLatin.addEventListener("click", function () { pendingFontKind = "latin"; document.getElementById("fontPicker").click(); });
    sheetBody.appendChild(importLatin);
    sheetBody.appendChild(createElement("p", "font-help", "导入字体只保存在当前设备，不会增加发布包体积。小红书客户端是否允许选择字体文件需真机验证。"));
  }

  function fontOptions(kind) {
    var options = kind === "zh" ? [["PriceNotoSerifZh", "思源宋体"], ["PriceQiuYeZh", "秋叶圆体"], ["PingFang SC", "系统中文字体"]] : [["PriceSourceSerifLatin", "Source Serif 4"], ["PriceSourceSansLatin", "Source Sans 3"], ["PriceRobotoLatin", "Roboto SemiCondensed"], ["Arial", "系统英文字体"]];
    var userName = kind === "zh" ? "PriceUserZh" : "PriceUserLatin";
    if ((kind === "zh" ? state.zhFont : state.latinFont) === userName) options.push([userName, "用户导入字体"]);
    return options;
  }

  function makeColorField(label, key, value) {
    var field = createElement("label", "color-field field");
    var input = createElement("input", "color-input");
    field.appendChild(createElement("span", "field-label", label));
    input.type = "color";
    input.value = value;
    input.addEventListener("input", function () {
      recordEditOnce();
      state[key] = input.value;
      applyTheme();
      saveState();
    });
    field.appendChild(input);
    return field;
  }

  function buildBlockPanel(block) {
    if (!block) return;
    if (block.type === "text") buildTextPanel(block);
    else if (block.type === "image") buildImagePanel(block);
    else if (block.type === "priceSection") buildPriceSectionPanel(block);
    else if (block.type === "priceChoice") buildPriceChoicePanel(block);
    else if (block.type === "priceTotal") buildPriceTotalPanel(block);
    else if (block.type === "pageBreak") setSheetHeading("PAGE", "独立页面起点");
    else if (block.type === "flowchart") buildFlowchartPanel(block);
    else if (block.type === "pageLink") buildPageLinkPanel(block);
    else buildDividerPanel(block);
    if (block.type !== "pageBreak" && block.type !== "pageLink") { var clipboardActions = createElement("div", "block-actions"); var duplicateButton = createElement("button", "secondary-button", "复制并粘贴到此控件后面"); duplicateButton.type = "button"; duplicateButton.addEventListener("click", function () { duplicateBlockAfter(block); }); clipboardActions.appendChild(duplicateButton); sheetBody.appendChild(clipboardActions); }
    var remove = createElement("button", "danger-button", block.type === "pageBreak" ? "删除这一页（内容并入上一页）" : "删除这个模块");
    remove.type = "button";
    remove.addEventListener("click", function () {
      removeSelectedBlock();
      closeSheet();
    });
    sheetBody.appendChild(remove);
  }

  function duplicateBlockAfter(block) {
    var pasted = cloneData(block);
    pasted.id = makeId();
    if (pasted.type === "priceChoice" && pasted.exclusiveGroup) pasted.selected = false;
    pushHistory();
    state.blocks.splice(getBlockIndex(block.id) + 1, 0, pasted);
    selectedId = pasted.id;
    saveState(); render(); buildBlockPanelRefresh();
    showToast("控件副本已粘贴");
  }

  function buildTextPanel(block) {
    setSheetHeading("TEXT", "编辑文本");
    var textField = createElement("label", "field");
    var textarea = createElement("textarea", "text-control");
    textField.appendChild(createElement("span", "field-label", "文字内容 · 用 **文字** 显示粗体"));
    textarea.value = block.text;
    textarea.addEventListener("input", function () { recordEditOnce(); block.text = textarea.value; saveState(); render(); });
    textField.appendChild(textarea);
    sheetBody.appendChild(textField);
    sheetBody.appendChild(makeSelectField("文字层级", block.level, [
      ["h1", "H1 大标题"], ["h2", "H2 小标题"], ["body", "正文"]
    ], function (value) { block.level = value; saveState(); render(); }));
    sheetBody.appendChild(makeSegmentField("对齐", block.align, [
      ["left", "靠左"], ["center", "居中"], ["right", "靠右"]
    ], function (value) { block.align = value; saveState(); render(); buildBlockPanelRefresh(); }));
    addSpacingFields(block);
  }

  function buildImagePanel(block) {
    setSheetHeading("IMAGE", "编辑图片");
    var choose = createElement("button", "secondary-button", block.src ? "更换图片" : "选择图片");
    choose.type = "button";
    choose.addEventListener("click", function () { imagePicker.click(); });
    sheetBody.appendChild(choose);
    sheetBody.appendChild(makeTextInputField("图片组名（同名且相邻会排成一行）", block.imageGroup || "", function (value) { block.imageGroup = value.trim(); saveState(); render(); }));
    if (block.imageGroup) {
      sheetBody.appendChild(makeSelectField("每行图片数", String(block.groupColumns || 2), [["2", "2 张"], ["3", "3 张"], ["4", "4 张"]], function (value) { updateImageGroup(block, Number(value), block.groupGap || 0); saveState(); render(); buildBlockPanelRefresh(); }));
      sheetBody.appendChild(makePxInputField("图片间距", block.groupGap || 0, 0, 64, function (value) { updateImageGroup(block, block.groupColumns || 2, value); saveState(); render(); }));
      var addGroupImage = createElement("button", "secondary-button", "＋ 向本组增加图片");
      addGroupImage.type = "button"; addGroupImage.addEventListener("click", function () { addImageToGroup(block); }); sheetBody.appendChild(addGroupImage);
    } else sheetBody.appendChild(makeRangeField("圆角", block.radius, 0, 32, function (value) { block.radius = value; saveState(); render(); }));
    appendVisibilityEditor(block);
    addSpacingFields(block);
  }

  function updateImageGroup(block, columns, gap) {
    var members = []; var i;
    for (i = 0; i < state.blocks.length; i += 1) if (state.blocks[i].type === "image" && state.blocks[i].imageGroup === block.imageGroup) { state.blocks[i].groupColumns = columns; state.blocks[i].groupGap = gap; members.push(state.blocks[i]); }
    while (members.length < columns) { var added = imageBlock(); added.imageGroup = block.imageGroup; added.groupColumns = columns; added.groupGap = gap; var lastIndex = getBlockIndex(members.length ? members[members.length - 1].id : block.id); state.blocks.splice(lastIndex + 1, 0, added); members.push(added); }
  }

  function addImageToGroup(block) {
    recordEditOnce(); var members = []; var i;
    for (i = 0; i < state.blocks.length; i += 1) if (state.blocks[i].type === "image" && state.blocks[i].imageGroup === block.imageGroup) members.push(state.blocks[i]);
    var added = imageBlock(); added.imageGroup = block.imageGroup; added.groupColumns = block.groupColumns || 2; added.groupGap = block.groupGap || 0;
    state.blocks.splice(getBlockIndex(members[members.length - 1].id) + 1, 0, added); selectedId = added.id; saveState(); render(); buildBlockPanelRefresh(); showToast("已增加图片，可点击选择图片");
  }

  function buildDividerPanel(block) {
    setSheetHeading("DIVIDER", "编辑分割线");
    sheetBody.appendChild(makeSelectField("线条样式", block.style, [
      ["solid", "实线"], ["dashed", "虚线"], ["dotted", "点线"]
    ], function (value) { block.style = value; saveState(); render(); }));
    sheetBody.appendChild(makeRangeField("粗细", block.thickness, 1, 5, function (value) { block.thickness = value; saveState(); render(); }));
    addSpacingFields(block);
  }

  function buildPriceSectionPanel(block) {
    setSheetHeading("PRICE SECTION", "编辑价格区标题");
    sheetBody.appendChild(makeTextInputField("标题", block.title, function (value) { block.title = value; saveState(); render(); }));
    sheetBody.appendChild(makeTextInputField("辅助说明", block.note, function (value) { block.note = value; saveState(); render(); }));
    appendVisibilityEditor(block);
    addSpacingFields(block);
  }

  function buildPriceChoicePanel(block) {
    setSheetHeading("PRICE OPTION", "编辑价格选项");
    sheetBody.appendChild(makeTextInputField("选项文字", block.label, function (value) { block.label = value; saveState(); render(); }));
    sheetBody.appendChild(makeSegmentField("价格计算", block.priceMode || "fixed", [["fixed", "固定价格"], ["multiplier", "父项价格 × 倍数"]], function (value) { block.priceMode = value; saveState(); render(); buildBlockPanelRefresh(); }));
    if (block.priceMode === "multiplier") {
      var priceParents = [["", "请选择价格父项"]];
      var priceParentIndex;
      for (priceParentIndex = 0; priceParentIndex < state.blocks.length; priceParentIndex += 1) if (state.blocks[priceParentIndex].type === "priceChoice" && state.blocks[priceParentIndex].id !== block.id) priceParents.push([state.blocks[priceParentIndex].id, state.blocks[priceParentIndex].label]);
      sheetBody.appendChild(makeSelectField("绑定价格父项", block.priceParentId || "", priceParents, function (value) { block.priceParentId = value; saveState(); render(); }));
      sheetBody.appendChild(makeNumberInputField("价格倍数", block.priceMultiplier, .1, function (value) { block.priceMultiplier = value; saveState(); render(); }));
      sheetBody.appendChild(createElement("p", "font-help", "当前价格：" + block.currency + formatPrice(getEffectivePrice(block))));
    } else sheetBody.appendChild(makeNumberInputField("固定价格", block.price, 1, function (value) { block.price = value; saveState(); render(); }));
    sheetBody.appendChild(makeSegmentField("价格符号", block.currency === "+" ? "+" : "¥", [["¥", "¥ 金额"], ["+", "+ 加价"]], function (value) { block.currency = value; saveState(); render(); buildBlockPanelRefresh(); }));
    sheetBody.appendChild(makeSegmentField("选项分割线", block.separatorStyle || "dashed", [["none", "无"], ["solid", "实线"], ["dashed", "虚线"], ["dotted", "点线"]], function (value) { block.separatorStyle = value; saveState(); render(); buildBlockPanelRefresh(); }));
    if (block.separatorStyle !== "none") sheetBody.appendChild(makePxInputField("分割线粗细", block.separatorThickness || 2, 1, 6, function (value) { block.separatorThickness = value; saveState(); render(); }));
    sheetBody.appendChild(makeTextInputField("互斥组名（同名只能选一个，留空可多选）", block.exclusiveGroup || "", function (value) { block.exclusiveGroup = value.trim(); saveState(); render(); }));
    sheetBody.appendChild(makeSegmentField("默认状态", block.selected ? "yes" : "no", [["yes", "选中"], ["no", "未选中"]], function (value) {
      if (value === "yes" && block.exclusiveGroup) clearExclusiveGroup(block);
      block.selected = value === "yes"; saveState(); render(); buildBlockPanelRefresh();
    }));
    appendVisibilityEditor(block);
    addSpacingFields(block);
  }

  function clearExclusiveGroup(block) {
    var i;
    for (i = 0; i < state.blocks.length; i += 1) if (state.blocks[i].type === "priceChoice" && state.blocks[i].exclusiveGroup === block.exclusiveGroup) state.blocks[i].selected = false;
  }

  function makeNumberInputField(label, value, step, onInput) {
    var field = createElement("label", "field");
    var input = createElement("input", "select-control");
    field.appendChild(createElement("span", "field-label", label));
    input.type = "number"; input.min = "0"; input.step = String(step); input.value = value;
    input.addEventListener("input", function () { recordEditOnce(); onInput(Number(input.value) || 0); });
    field.appendChild(input); return field;
  }

  function buildPriceTotalPanel(block) {
    setSheetHeading("TOTAL", "编辑价格合计");
    sheetBody.appendChild(makeTextInputField("合计文字", block.label, function (value) { block.label = value; saveState(); render(); }));
    addSpacingFields(block);
  }

  function buildFlowchartPanel(block) {
    setSheetHeading("FLOW", "编辑流程图"); var i;
    for (i = 0; i < block.nodes.length; i += 1) (function (node, index) { var card = createElement("div", "option-editor"); card.appendChild(makeTextInputField("节点进度", node.percent, function (value) { node.percent = value; saveState(); render(); })); card.appendChild(makeTextInputField("节点标题", node.title, function (value) { node.title = value; saveState(); render(); })); card.appendChild(makeTextInputField("节点描述", node.description, function (value) { node.description = value; saveState(); render(); })); var remove = createElement("button", "option-remove flow-node-remove", "×"); remove.type = "button"; remove.disabled = block.nodes.length <= 2; remove.addEventListener("click", function () { recordEditOnce(); block.nodes.splice(index, 1); saveState(); render(); buildBlockPanelRefresh(); }); card.appendChild(remove); sheetBody.appendChild(card); }(block.nodes[i], i));
    var add = createElement("button", "secondary-button", "＋ 增加流程节点"); add.type = "button"; add.addEventListener("click", function () { recordEditOnce(); block.nodes.push({ percent: "", title: "新节点", description: "补充节点描述" }); saveState(); render(); buildBlockPanelRefresh(); }); sheetBody.appendChild(add); addSpacingFields(block);
  }

  function pageOptions() {
    var options = [["first", "第 1 页"]]; var page = 1; var i;
    for (i = 0; i < state.blocks.length; i += 1) if (state.blocks[i].type === "pageBreak") { page += 1; options.push([state.blocks[i].id, "第 " + page + " 页"]); }
    return options;
  }

  function pageNumberForTarget(targetId) {
    var options = pageOptions(); var i;
    for (i = 0; i < options.length; i += 1) if (options[i][0] === targetId) return i + 1;
    return "?";
  }

  function buildPageLinkPanel(block) {
    setSheetHeading("LINK", "页内链接");
    sheetBody.appendChild(makeTextInputField("链接文字", block.label || "", function (value) { block.label = value; saveState(); render(); }));
    sheetBody.appendChild(makeSelectField("跳转到", block.targetPageId || "first", pageOptions(), function (value) { block.targetPageId = value; saveState(); render(); }));
  }

  function appendVisibilityEditor(block) {
    var options = [["", "始终显示"]];
    var i;
    for (i = 0; i < state.blocks.length; i += 1) if (state.blocks[i].type === "priceChoice" && state.blocks[i].id !== block.id) options.push([state.blocks[i].id, state.blocks[i].label + (state.blocks[i].exclusiveGroup ? "（" + state.blocks[i].exclusiveGroup + "）" : "")]);
    sheetBody.appendChild(makeSelectField("关联父选项", block.parentId || "", options, function (value) { block.parentId = value; saveState(); render(); buildBlockPanelRefresh(); }));
    if (block.parentId) sheetBody.appendChild(makeSelectField("显示条件", block.parentState || "selected", [["selected", "父选项被选中"], ["unselected", "父选项未选中"], ["group-selected", "父选项所在互斥组已有选择"], ["group-other-selected", "同组中除该父项外有选择"]], function (value) { block.parentState = value; saveState(); render(); }));
    if (block.parentId) sheetBody.appendChild(makeSegmentField("子控件缩进", block.indentChild === false ? "no" : "yes", [["yes", "缩进"], ["no", "不缩进"]], function (value) { block.indentChild = value === "yes"; saveState(); render(); buildBlockPanelRefresh(); }));
    sheetBody.appendChild(createElement("p", "font-help", "显示条件只建立逻辑层级，不限制模块位置；子模块仍可单独拖拽排序。"));
  }

  function buildPriceGroupPanel(block) {
    setSheetHeading("PRICE", "编辑价格选项组");
    sheetBody.appendChild(makeTextInputField("分组标题", block.title, function (value) { block.title = value; saveState(); render(); }));
    sheetBody.appendChild(createElement("span", "field-label field", "类型（互斥单选）"));
    sheetBody.appendChild(buildOptionEditor(block, block.baseOptions, "radio", "base"));
    var addBase = createElement("button", "inline-add", "＋ 添加单选类型");
    addBase.type = "button";
    addBase.addEventListener("click", function () {
      recordEditOnce();
      block.baseOptions.push(priceOption("新类型", 0, block.baseOptions.length === 0));
      saveState(); render(); buildBlockPanelRefresh();
    });
    sheetBody.appendChild(addBase);
    sheetBody.appendChild(makeTextInputField("子选项标题", block.subTitle || "子选项", function (value) { block.subTitle = value; saveState(); render(); }));
    sheetBody.appendChild(buildOptionEditor(block, block.subOptions, "radio", "sub"));
    var addSub = createElement("button", "inline-add", "＋ 添加子选项");
    addSub.type = "button";
    addSub.addEventListener("click", function () {
      recordEditOnce();
      block.subOptions.push(priceOption("新子项", 0, block.subOptions.length === 0));
      saveState(); render(); buildBlockPanelRefresh();
    });
    sheetBody.appendChild(addSub);
    sheetBody.appendChild(createElement("span", "field-label field", "额外加购（可多选）"));
    sheetBody.appendChild(buildOptionEditor(block, block.extras, "checkbox", "extras"));
    var addExtra = createElement("button", "inline-add", "＋ 添加复选项目");
    addExtra.type = "button";
    addExtra.addEventListener("click", function () {
      recordEditOnce();
      block.extras.push(priceOption("新加购", 0, false));
      saveState(); render(); buildBlockPanelRefresh();
    });
    sheetBody.appendChild(addExtra);
    addSpacingFields(block);
  }

  function buildOptionEditor(block, options, kind, groupKey) {
    var editor = createElement("div", "option-editor");
    var i;
    if (!options.length) editor.appendChild(createElement("p", "card-note", "暂无项目"));
    for (i = 0; i < options.length; i += 1) {
      (function (option) {
        var row = createElement("div", "option-editor-row");
        var selector = createElement("input");
        var nameInput = createElement("input", "option-name-input");
        var priceInput = createElement("input", "option-price-input");
        var remove = createElement("button", "option-remove", "×");
        selector.type = kind;
        selector.name = "editor-" + block.id + "-" + groupKey;
        selector.checked = Boolean(option.selected);
        selector.setAttribute("aria-label", kind === "radio" ? "设为默认类型" : "默认勾选");
        selector.addEventListener("change", function () {
          recordEditOnce();
          if (kind === "radio") {
            var j;
            for (j = 0; j < options.length; j += 1) options[j].selected = options[j].id === option.id;
          } else option.selected = selector.checked;
          saveState(); render(); buildBlockPanelRefresh();
        });
        nameInput.type = "text";
        nameInput.value = option.label;
        nameInput.setAttribute("aria-label", "项目名称");
        nameInput.addEventListener("input", function () { recordEditOnce(); option.label = nameInput.value; saveState(); render(); });
        priceInput.type = "number";
        priceInput.min = "0";
        priceInput.step = "1";
        priceInput.value = option.price;
        priceInput.setAttribute("aria-label", "价格");
        priceInput.addEventListener("input", function () { recordEditOnce(); option.price = Number(priceInput.value) || 0; saveState(); render(); });
        remove.type = "button";
        remove.setAttribute("aria-label", "删除项目");
        if (kind === "radio" && options.length <= 1) remove.disabled = true;
        remove.addEventListener("click", function () {
          recordEditOnce();
          var index = options.indexOf(option);
          if (index >= 0) options.splice(index, 1);
          if (kind === "radio" && options.length && !options.some(function (item) { return item.selected; })) options[0].selected = true;
          saveState(); render(); buildBlockPanelRefresh();
        });
        row.appendChild(selector);
        row.appendChild(nameInput);
        row.appendChild(priceInput);
        row.appendChild(remove);
        editor.appendChild(row);
        if (groupKey === "base") {
          var categoryRow = createElement("div", "option-editor-row");
          var categoryInput = createElement("input", "option-name-input");
          categoryInput.type = "text";
          categoryInput.placeholder = "分类名称（可留空）";
          categoryInput.value = option.category || "";
          categoryInput.addEventListener("input", function () { recordEditOnce(); option.category = categoryInput.value; saveState(); render(); });
          categoryRow.appendChild(categoryInput);
          editor.appendChild(categoryRow);
        }
      }(options[i]));
    }
    return editor;
  }

  function makeTextInputField(label, value, onInput) {
    var field = createElement("label", "field");
    var input = createElement("input", "select-control");
    field.appendChild(createElement("span", "field-label", label));
    input.type = "text";
    input.value = value;
    input.addEventListener("input", function () { recordEditOnce(); onInput(input.value); });
    field.appendChild(input);
    return field;
  }

  function addSpacingFields(block) {
    var group = createElement("div", "editor-group spacing-editor");
    group.appendChild(createElement("h3", "editor-group-title", "模块间距"));
    group.appendChild(makePxInputField("上边距", block.marginTop, 0, 96, function (value) { block.marginTop = value; saveState(); render(); }));
    group.appendChild(makePxInputField("下边距", block.marginBottom, 0, 96, function (value) { block.marginBottom = value; saveState(); render(); }));
    sheetBody.appendChild(group);
  }

  function makeSelectField(label, value, options, onChange) {
    var field = createElement("label", "field");
    var select = createElement("select", "select-control");
    var i;
    field.appendChild(createElement("span", "field-label", label));
    for (i = 0; i < options.length; i += 1) {
      var option = createElement("option", "", options[i][1]);
      option.value = options[i][0];
      if (options[i][0] === value) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener("change", function () { recordEditOnce(); onChange(select.value); });
    field.appendChild(select);
    return field;
  }

  function makeSegmentField(label, value, options, onChange) {
    var field = createElement("div", "field");
    var group = createElement("div", "segmented");
    var i;
    field.appendChild(createElement("span", "field-label", label));
    for (i = 0; i < options.length; i += 1) {
      (function (option) {
        var button = createElement("button", "segment" + (option[0] === value ? " active" : ""), option[1]);
        button.type = "button";
        button.addEventListener("click", function () { recordEditOnce(); onChange(option[0]); });
        group.appendChild(button);
      }(options[i]));
    }
    field.appendChild(group);
    return field;
  }

  function makeRangeField(label, value, min, max, onInput) {
    var field = createElement("label", "field");
    var row = createElement("div", "range-row");
    var input = createElement("input");
    var output = createElement("span", "range-value", value + " px");
    field.appendChild(createElement("span", "field-label", label));
    input.type = "range";
    input.min = min;
    input.max = max;
    input.value = value;
    input.addEventListener("input", function () {
      recordEditOnce();
      var numberValue = parseInt(input.value, 10);
      output.textContent = numberValue + " px";
      onInput(numberValue);
    });
    row.appendChild(input);
    row.appendChild(output);
    field.appendChild(row);
    return field;
  }

  function makePxInputField(label, value, min, max, onInput) {
    var field = createElement("label", "field"); var row = createElement("div", "unit-input-row"); var input = createElement("input", "select-control");
    field.appendChild(createElement("span", "field-label", label)); input.type = "number"; input.min = String(min); input.max = String(max); input.step = "1"; input.value = String(value || 0);
    input.addEventListener("input", function () { recordEditOnce(); var number = Math.max(min, Math.min(max, Number(input.value) || 0)); onInput(number); }); row.appendChild(input); row.appendChild(createElement("span", "unit-suffix", "px")); field.appendChild(row); return field;
  }

  function buildBlockPanelRefresh() {
    sheetBody.textContent = "";
    buildBlockPanel(getBlock(selectedId));
  }

  function removeSelectedBlock() {
    pushHistory();
    var next = [];
    var i;
    for (i = 0; i < state.blocks.length; i += 1) if (state.blocks[i].id !== selectedId) { if (state.blocks[i].inlineParentId === selectedId) state.blocks[i].inlineParentId = ""; next.push(state.blocks[i]); }
    state.blocks = next;
    selectedId = null;
    saveState();
    render();
    showToast("模块已删除");
  }

  function reorder(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    var sourceIndex = -1;
    var targetIndex = -1;
    var i;
    for (i = 0; i < state.blocks.length; i += 1) {
      if (state.blocks[i].id === sourceId) sourceIndex = i;
      if (state.blocks[i].id === targetId) targetIndex = i;
    }
    if (sourceIndex < 0 || targetIndex < 0) return;
    pushHistory();
    var moved = state.blocks.splice(sourceIndex, 1)[0];
    if (moved.type === "pageLink") moved.inlineParentId = "";
    if (sourceIndex < targetIndex) targetIndex -= 1;
    var targetBlock = state.blocks[targetIndex];
    if (moved.parentId && (!targetBlock || (targetBlock.id !== moved.parentId && targetBlock.parentId !== moved.parentId))) {
      moved.parentId = "";
      moved.parentState = "selected";
    }
    state.blocks.splice(targetIndex, 0, moved);
    saveState();
    render();
  }

  function nestBlock(sourceId, parentId) {
    var source = getBlock(sourceId);
    var parent = getPriceChoice(parentId);
    if (!source || !parent || source.id === parent.id) return;
    var ancestor = parent;
    while (ancestor && ancestor.parentId) {
      if (ancestor.parentId === source.id) return;
      ancestor = getPriceChoice(ancestor.parentId);
    }
    pushHistory();
    if (source.type === "pageLink") {
      source.inlineParentId = parent.id; source.parentId = "";
    } else {
    source.parentId = parent.id;
    source.parentState = "selected";
    }
    var sourceIndex = getBlockIndex(source.id);
    var parentIndex = getBlockIndex(parent.id);
    state.blocks.splice(sourceIndex, 1);
    if (sourceIndex < parentIndex) parentIndex -= 1;
    state.blocks.splice(parentIndex + 1, 0, source);
    saveState(); render();
    showToast(source.type === "pageLink" ? "链接已插入价格选项" : "已设为「" + parent.label + "」的子模块");
  }

  function markDropTarget(target, clientY) {
    clearDropMarks();
    dropMode = "before";
    if (!target) return;
    var targetBlock = getBlock(target.getAttribute("data-id"));
    var rect = target.getBoundingClientRect();
    var middle = clientY > rect.top + rect.height * .25 && clientY < rect.bottom - rect.height * .25;
    if (middle && targetBlock && targetBlock.type === "priceChoice") { dropMode = "inside"; target.classList.add("drop-inside"); }
    else target.classList.add("drop-before");
  }

  function clearDropMarks() {
    var marked = blockList.querySelectorAll(".drop-before, .drop-inside");
    var i;
    for (i = 0; i < marked.length; i += 1) { marked[i].classList.remove("drop-before"); marked[i].classList.remove("drop-inside"); }
  }

  function canvasFont(size, bold) {
    return (bold ? "900 " : "500 ") + size + 'px "' + (state.latinFont || "PriceSourceSerifLatin") + '", "' + (state.zhFont || "PriceNotoSerifZh") + '", Arial, serif';
  }

  function markdownGlyphs(text) {
    var glyphs = [];
    var bold = false;
    var i = 0;
    while (i < text.length) {
      if (text.slice(i, i + 2) === "**") {
        bold = !bold;
        i += 2;
      } else {
        glyphs.push({ char: text.charAt(i), bold: bold });
        i += 1;
      }
    }
    return glyphs;
  }

  function layoutCanvasText(context, block, maxWidth, scale) {
    var fontSize = (block.level === "h1" ? 30 : (block.level === "h2" ? 18 : 13)) * scale;
    var lineHeight = (block.level === "h1" ? 31.5 : (block.level === "h2" ? 21.6 : 21.45)) * scale;
    var glyphs = markdownGlyphs(block.text);
    var lines = [];
    var current = [];
    var width = 0;
    var i;
    for (i = 0; i < glyphs.length; i += 1) {
      var glyph = glyphs[i];
      if (glyph.char === "\n") {
        lines.push({ glyphs: current, width: width });
        current = [];
        width = 0;
        continue;
      }
      context.font = canvasFont(fontSize, glyph.bold || block.level !== "body");
      var glyphWidth = context.measureText(glyph.char).width;
      if (current.length && width + glyphWidth > maxWidth) {
        lines.push({ glyphs: current, width: width });
        current = [];
        width = 0;
      }
      current.push({ char: glyph.char, bold: glyph.bold, width: glyphWidth });
      width += glyphWidth;
    }
    lines.push({ glyphs: current, width: width });
    return { lines: lines, fontSize: fontSize, lineHeight: lineHeight, height: Math.max(lineHeight, lines.length * lineHeight) };
  }

  function loadCanvasImage(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { resolve(null); };
      image.src = src;
    });
  }

  async function prepareCanvasLayouts(context, width, scale, sourceBlocks) {
    var layouts = [];
    var maxWidth = width - state.padding * scale * 2;
    sourceBlocks = sourceBlocks || state.blocks;
    var i;
    for (i = 0; i < sourceBlocks.length; i += 1) {
      var block = sourceBlocks[i];
      if (!isBlockVisible(block)) continue;
      if (block.type === "pageLink" && block.inlineParentId) continue;
      if (block.type === "text") {
        layouts.push({ block: block, text: layoutCanvasText(context, block, maxWidth, scale), height: 0 });
      } else if (block.type === "image") {
        if (block.imageGroup) {
          var groupItems = []; var columns = block.groupColumns || 2; var exportGroupGap = (block.groupGap || 0) * scale; var columnWidth = (maxWidth - (columns - 1) * exportGroupGap) / columns; var groupHeight = 0;
          while (i < sourceBlocks.length && sourceBlocks[i].type === "image" && sourceBlocks[i].imageGroup === block.imageGroup) {
            if (isBlockVisible(sourceBlocks[i])) { var groupImage = await loadCanvasImage(sourceBlocks[i].src); var groupImageHeight = groupImage ? Math.min(columnWidth * groupImage.naturalHeight / groupImage.naturalWidth, 800) : 240; groupItems.push({ block: sourceBlocks[i], image: groupImage, height: groupImageHeight }); groupHeight = Math.max(groupHeight, groupImageHeight); }
            i += 1;
          }
          i -= 1; var groupRows = Math.ceil(groupItems.length / columns); groupHeight = groupRows * groupHeight + Math.max(0, groupRows - 1) * exportGroupGap; layouts.push({ block: block, imageGroup: groupItems, columns: columns, gap: exportGroupGap, height: groupHeight, rowHeight: groupRows ? (groupHeight - Math.max(0, groupRows - 1) * exportGroupGap) / groupRows : 0 });
        } else {
          var image = await loadCanvasImage(block.src);
          var imageHeight = image ? Math.min(maxWidth * image.naturalHeight / image.naturalWidth, 1200) : 160 * scale;
          layouts.push({ block: block, image: image, height: imageHeight });
        }
      } else if (block.type === "priceSection") {
        layouts.push({ block: block, height: (block.note ? 58 : 38) * scale });
      } else if (block.type === "priceChoice") {
        layouts.push({ block: block, height: 38 * scale });
      } else if (block.type === "priceTotal") {
        layouts.push({ block: block, height: 66 * scale });
      } else if (block.type === "flowchart") {
        layouts.push({ block: block, height: 98 * scale });
      } else if (block.type === "pageLink") {
        layouts.push({ block: block, height: 32 * scale });
      } else {
        layouts.push({ block: block, height: Math.max(3, block.thickness * scale) });
      }
    }
    return layouts;
  }

  function drawTextLayout(context, layout, x, y, maxWidth) {
    var text = layout.text;
    var lineIndex;
    context.textBaseline = "top";
    context.fillStyle = state.ink;
    for (lineIndex = 0; lineIndex < text.lines.length; lineIndex += 1) {
      var line = text.lines[lineIndex];
      var cursorX = x;
      if (layout.block.align === "center") cursorX = x + (maxWidth - line.width) / 2;
      else if (layout.block.align === "right") cursorX = x + maxWidth - line.width;
      var glyphIndex;
      for (glyphIndex = 0; glyphIndex < line.glyphs.length; glyphIndex += 1) {
        var glyph = line.glyphs[glyphIndex];
        context.font = canvasFont(text.fontSize, glyph.bold || layout.block.level !== "body");
        context.fillText(glyph.char, cursorX, y + lineIndex * text.lineHeight);
        cursorX += glyph.width;
      }
    }
  }

  function drawDivider(context, block, x, y, width, scale) {
    context.save();
    context.strokeStyle = state.ink;
    context.globalAlpha = .6;
    context.lineWidth = Math.max(2, block.thickness * scale);
    if (block.style === "dashed") context.setLineDash([18, 13]);
    else if (block.style === "dotted") context.setLineDash([3, 10]);
    else context.setLineDash([]);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + width, y);
    context.stroke();
    context.restore();
  }

  function fitCanvasText(context, text, maxWidth) {
    if (context.measureText(text).width <= maxWidth) return text;
    var value = text;
    while (value.length > 1 && context.measureText(value + "…").width > maxWidth) value = value.slice(0, -1);
    return value + "…";
  }

  function drawPriceSectionBlockCanvas(context, block, x, y, width) {
    context.fillStyle = state.ink; context.textBaseline = "top";
    var scale = 900 / 520; context.font = canvasFont(14 * scale, true);
    context.fillText(fitCanvasText(context, block.title, width), x, y);
    if (block.note) { context.globalAlpha = .58; context.font = canvasFont(10 * scale, true); context.fillText(fitCanvasText(context, block.note, width), x, y + 25 * scale); context.globalAlpha = 1; }
  }

  function drawPriceChoiceBlockCanvas(context, block, x, y, width) {
    var scale = 900 / 520; context.fillStyle = state.ink; context.textBaseline = "top"; context.font = canvasFont(12 * scale, false);
    var amount = block.currency + " " + formatPrice(getEffectivePrice(block));
    var amountWidth = context.measureText(amount).width;
    var inlineLink = null; var linkIndex;
    for (linkIndex = 0; linkIndex < state.blocks.length; linkIndex += 1) if (state.blocks[linkIndex].type === "pageLink" && state.blocks[linkIndex].inlineParentId === block.id) { inlineLink = state.blocks[linkIndex]; break; }
    var linkWidth = inlineLink ? Math.min(130, context.measureText(inlineLink.label || "查看页面").width + 12) : 0;
    context.fillText(fitCanvasText(context, block.label, width - amountWidth - 58 - linkWidth), x, y + 9 * scale);
    if (inlineLink) { var linkX = x + width - amountWidth - 39 * scale - linkWidth; context.save(); context.fillStyle = state.accent; context.font = canvasFont(12 * scale, true); var linkText = fitCanvasText(context, inlineLink.label || "查看页面", linkWidth); context.fillText(linkText, linkX, y + 9 * scale); context.strokeStyle = state.accent; context.lineWidth = 1.2 * scale; context.beginPath(); context.moveTo(linkX, y + 24 * scale); context.lineTo(linkX + context.measureText(linkText).width, y + 24 * scale); context.stroke(); context.restore(); }
    context.fillText(amount, x + width - amountWidth - 32 * scale, y + 9 * scale);
    context.fillStyle = state.accent; context.font = (18 * scale) + "px Fontello";
    context.fillText(block.selected ? "\ue806" : "\uf096", x + width - 22 * scale, y + 7 * scale);
    if (block.separatorStyle !== "none") { context.strokeStyle = state.ink; context.globalAlpha = .14; context.lineWidth = Math.max(scale, (block.separatorThickness || 2) * scale); if (block.separatorStyle === "dashed") context.setLineDash([6 * scale, 4 * scale]); else if (block.separatorStyle === "dotted") context.setLineDash([1 * scale, 4 * scale]); else context.setLineDash([]); context.beginPath(); context.moveTo(x, y + 37 * scale); context.lineTo(x + width, y + 37 * scale); context.stroke(); context.setLineDash([]); context.globalAlpha = 1; }
  }

  function drawPriceTotalBlockCanvas(context, block, x, y, width) {
    context.strokeStyle = state.ink; context.lineWidth = 4;
    context.beginPath(); context.moveTo(x, y); context.lineTo(x + width, y); context.stroke();
    var scale = 900 / 520; context.fillStyle = state.ink; context.textBaseline = "top"; context.font = canvasFont(11 * scale, true);
    context.fillText(block.label, x, y + 24 * scale);
    context.font = canvasFont(22 * scale, true);
    var total = block.currency + " " + formatPrice(calculateTotal());
    context.fillText(total, x + width - context.measureText(total).width, y + 17 * scale);
  }

  function drawFlowchartCanvas(context, block, x, y, width) {
    var count = block.nodes.length; if (!count) return; var i;
    context.strokeStyle = state.accent; context.globalAlpha = .55; context.lineWidth = 3; context.beginPath(); context.moveTo(x + width / count / 2, y + 65); context.lineTo(x + width - width / count / 2, y + 65); context.stroke(); context.globalAlpha = 1;
    for (i = 0; i < count; i += 1) { var center = x + width * (i + .5) / count; context.fillStyle = state.accent; context.font = canvasFont(27, true); context.textAlign = "center"; context.fillText(block.nodes[i].percent, center, y); context.beginPath(); context.arc(center, y + 65, 8, 0, Math.PI * 2); context.fill(); context.fillStyle = state.ink; context.font = canvasFont(22, true); context.fillText(fitCanvasText(context, block.nodes[i].title, width / count - 12), center, y + 86); context.globalAlpha = .55; context.font = canvasFont(17, false); context.fillText(fitCanvasText(context, block.nodes[i].description, width / count - 12), center, y + 120); context.globalAlpha = 1; }
    context.textAlign = "left";
  }

  function drawPageLinkCanvas(context, block, x, y, width) {
    var scale = 900 / 520, text = block.label || "查看页面"; context.save(); context.fillStyle = state.accent; context.strokeStyle = state.accent; context.font = canvasFont(12 * scale, true); context.textBaseline = "top"; var shown = fitCanvasText(context, text, width); context.fillText(shown, x, y + 5 * scale); context.lineWidth = scale; context.beginPath(); context.moveTo(x, y + 21 * scale); context.lineTo(x + context.measureText(shown).width, y + 21 * scale); context.stroke(); context.restore();
  }

  function drawPriceGroupCanvas(context, block, x, y, width) {
    context.fillStyle = state.ink;
    context.textBaseline = "top";
    context.font = canvasFont(34, true);
    context.fillText(fitCanvasText(context, block.title, width), x, y);
    y += 58;
    y = drawPriceSectionCanvas(context, block, block.baseOptions, x, y, width, "选择一种类型");
    if (block.subOptions && block.subOptions.length) y = drawPriceSectionCanvas(context, block, block.subOptions, x, y, width, block.subTitle || "子选项");
    if (block.extras.length) y = drawPriceSectionCanvas(context, block, block.extras, x, y, width, "额外加购（可多选）");
    y += 18;
    context.strokeStyle = state.ink;
    context.lineWidth = 4;
    context.beginPath(); context.moveTo(x, y); context.lineTo(x + width, y); context.stroke();
    y += 22;
    context.font = canvasFont(25, true);
    context.fillText("合计", x, y + 8);
    context.font = canvasFont(44, true);
    var total = block.currency + " " + formatPrice(calculatePriceGroup(block));
    context.fillText(total, x + width - context.measureText(total).width, y);
  }

  function priceGroupCanvasHeight(block) {
    var groups = [block.baseOptions];
    if (block.subOptions && block.subOptions.length) groups.push(block.subOptions);
    if (block.extras.length) groups.push(block.extras);
    var height = 170;
    var i;
    var j;
    for (i = 0; i < groups.length; i += 1) {
      height += 50 + groups[i].length * 58;
      var last = null;
      for (j = 0; j < groups[i].length; j += 1) if (groups[i][j].category && groups[i][j].category !== last) { height += 28; last = groups[i][j].category; }
    }
    return height;
  }

  function drawPriceSectionCanvas(context, block, options, x, y, width, label) {
    context.globalAlpha = .58;
    context.font = canvasFont(20, true);
    context.fillText(label, x, y);
    context.globalAlpha = 1;
    y += 32;
    var i;
    var lastCategory = null;
    for (i = 0; i < options.length; i += 1) {
      var option = options[i];
      if (option.category && option.category !== lastCategory) {
        context.font = canvasFont(24, true);
        context.fillText(option.category, x, y + 2);
        y += 28;
        lastCategory = option.category;
      }
      context.font = canvasFont(25, false);
      var amount = block.currency + " " + formatPrice(option.price);
      var amountWidth = context.measureText(amount).width;
      context.fillText(fitCanvasText(context, option.label, width - amountWidth - 82), x, y + 9);
      context.fillText(amount, x + width - amountWidth - 48, y + 9);
      context.fillStyle = state.accent;
      context.font = "32px Fontello";
      context.fillText(option.selected ? "\ue806" : "\uf096", x + width - 30, y + 7);
      context.fillStyle = state.ink;
      context.strokeStyle = state.ink; context.globalAlpha = .14; context.lineWidth = 2;
      context.beginPath(); context.moveTo(x, y + 56); context.lineTo(x + width, y + 56); context.stroke(); context.globalAlpha = 1;
      y += 58;
    }
    return y + 18;
  }

  async function renderLongCanvas(sourceBlocks) {
    var width = 900;
    var scale = width / 520;
    var measureCanvas = document.createElement("canvas");
    var measureContext = measureCanvas.getContext("2d");
    var layouts = await prepareCanvasLayouts(measureContext, width, scale, sourceBlocks);
    var verticalPadding = 30 * scale;
    var bottomPadding = 34 * scale;
    var totalHeight = verticalPadding + bottomPadding;
    var i;
    for (i = 0; i < layouts.length; i += 1) {
      var layout = layouts[i];
      totalHeight += layout.block.marginTop * scale + layout.block.marginBottom * scale;
      totalHeight += layout.block.type === "text" ? layout.text.height : layout.height;
    }
    totalHeight = Math.max(verticalPadding + bottomPadding + 24, Math.ceil(totalHeight));
    if (totalHeight > 16000) throw new Error("内容过长，请减少模块后再导出");
    var output = document.createElement("canvas");
    output.width = width;
    output.height = totalHeight;
    var context = output.getContext("2d");
    context.save();
    beginReceiptShape(context, width, totalHeight, state.edgeStyle || "square");
    context.clip(); context.fillStyle = state.paper; context.fillRect(0, 0, width, totalHeight);
    if (state.texture && state.texture !== "none") {
      var textureImage = await loadCanvasImage("./assets/backgrounds/" + state.texture + ".png");
      if (textureImage) drawTexturePattern(context, textureImage, width, totalHeight);
    }
    var x = state.padding * scale;
    var maxWidth = width - x * 2;
    var y = verticalPadding;
    var safeCuts = [];
    for (i = 0; i < layouts.length; i += 1) {
      var item = layouts[i];
      y += item.block.marginTop * scale;
      if (item.block.type === "text") {
        drawTextLayout(context, item, x, y, maxWidth);
        y += item.text.height;
      } else if (item.block.type === "image") {
        if (item.imageGroup) {
          var groupGap = item.gap || 0; var groupColumnWidth = (maxWidth - (item.columns - 1) * groupGap) / item.columns; var groupItemIndex;
          for (groupItemIndex = 0; groupItemIndex < item.imageGroup.length; groupItemIndex += 1) { var groupItem = item.imageGroup[groupItemIndex]; var groupX = x + (groupItemIndex % item.columns) * (groupColumnWidth + groupGap); var groupY = y + Math.floor(groupItemIndex / item.columns) * (item.rowHeight + groupGap); if (groupItem.image) context.drawImage(groupItem.image, groupX, groupY, groupColumnWidth, groupItem.height); else { context.fillStyle = "rgba(0,0,0,.05)"; context.fillRect(groupX, groupY, groupColumnWidth, item.rowHeight); } }
        } else if (item.image) {
          context.drawImage(item.image, x, y, maxWidth, item.height);
        } else {
          context.fillStyle = "rgba(0,0,0,.05)";
          context.fillRect(x, y, maxWidth, item.height);
          context.fillStyle = "rgba(0,0,0,.38)";
          context.font = canvasFont(24, false);
          context.textAlign = "center";
          context.fillText("图片位置", width / 2, y + item.height / 2 - 12);
          context.textAlign = "left";
        }
        y += item.height;
      } else if (item.block.type === "priceSection") {
        drawPriceSectionBlockCanvas(context, item.block, x, y, maxWidth);
        y += item.height;
      } else if (item.block.type === "priceChoice") {
        drawPriceChoiceBlockCanvas(context, item.block, x, y, maxWidth);
        y += item.height;
      } else if (item.block.type === "priceTotal") {
        drawPriceTotalBlockCanvas(context, item.block, x, y, maxWidth);
        y += item.height;
      } else if (item.block.type === "flowchart") {
        drawFlowchartCanvas(context, item.block, x, y, maxWidth);
        y += item.height;
      } else if (item.block.type === "pageLink") {
        drawPageLinkCanvas(context, item.block, x, y, maxWidth);
        y += item.height;
      } else {
        drawDivider(context, item.block, x, y + item.height / 2, maxWidth, scale);
        y += item.height;
      }
      y += item.block.marginBottom * scale;
      safeCuts.push(Math.ceil(y));
    }
    context.restore();
    output._safeCuts = safeCuts;
    return output;
  }

  function beginReceiptShape(context, width, height, style) {
    var radius = 34;
    var tooth = 18;
    var x;
    context.beginPath();
    if (style === "rounded") {
      context.moveTo(radius, 0); context.lineTo(width - radius, 0); context.arcTo(width, 0, width, radius, radius);
      context.lineTo(width, height - radius); context.arcTo(width, height, width - radius, height, radius);
      context.lineTo(radius, height); context.arcTo(0, height, 0, height - radius, radius);
      context.lineTo(0, radius); context.arcTo(0, 0, radius, 0, radius); context.closePath(); return;
    }
    if (style === "sawtooth") {
      context.moveTo(0, tooth);
      for (x = 0; x < width; x += tooth * 2) { context.lineTo(Math.min(x + tooth, width), 0); context.lineTo(Math.min(x + tooth * 2, width), tooth); }
      context.lineTo(width, height - tooth);
      for (x = width; x > 0; x -= tooth * 2) { context.lineTo(Math.max(x - tooth, 0), height); context.lineTo(Math.max(x - tooth * 2, 0), height - tooth); }
      context.closePath(); return;
    }
    context.rect(0, 0, width, height);
  }

  function drawTexturePattern(context, image, width, height) {
    context.save(); context.globalAlpha = 1; context.fillStyle = context.createPattern(image, "repeat"); context.fillRect(0, 0, width, height); context.restore();
  }

  function splitCanvasThreeFour(source) {
    var pageWidth = 900;
    var pageHeight = 1200;
    var pages = [];
    var offset = 0;
    var topMargin = 92;
    var bottomMargin = 92;
    var usableHeight = pageHeight - topMargin - bottomMargin;
    while (offset < source.height) {
      var page = document.createElement("canvas");
      page.width = pageWidth;
      page.height = pageHeight;
      var context = page.getContext("2d");
      context.save(); beginReceiptShape(context, pageWidth, pageHeight, state.edgeStyle || "square"); context.clip();
      context.fillStyle = state.paper; context.fillRect(0, 0, pageWidth, pageHeight);
      var limit = Math.min(source.height, offset + usableHeight);
      var cut = limit;
      var cutIndex;
      if (source._safeCuts) for (cutIndex = 0; cutIndex < source._safeCuts.length; cutIndex += 1) if (source._safeCuts[cutIndex] > offset + 40 && source._safeCuts[cutIndex] <= limit) cut = source._safeCuts[cutIndex];
      if (cut <= offset) cut = limit;
      var sliceHeight = cut - offset;
      context.drawImage(source, 0, offset, pageWidth, sliceHeight, 0, topMargin, pageWidth, sliceHeight);
      context.restore();
      pages.push(page);
      offset = cut;
    }
    return pages;
  }

  function renderInteractiveToolPreview() {
    previewList.textContent = "";
    var shell = createElement("div", "tool-preview-shell");
    var preview = blockList.cloneNode(true);
    preview.removeAttribute("id");
    preview.classList.add("receipt-pages");
    var grips = preview.querySelectorAll(".block-grip, .page-number"); var i;
    for (i = 0; i < grips.length; i += 1) if (grips[i].parentNode) grips[i].parentNode.removeChild(grips[i]);
    var selected = preview.querySelectorAll(".selected"); for (i = 0; i < selected.length; i += 1) selected[i].classList.remove("selected");
    preview.addEventListener("click", function (event) {
      var choiceButton = event.target.closest(".price-choice-icon");
      if (choiceButton) {
        var wrapper = choiceButton.closest(".receipt-block"), block = wrapper ? getPriceChoice(wrapper.getAttribute("data-id")) : null;
        if (!block) return; event.preventDefault();
        if (block.exclusiveGroup) { var j; if (block.selected) block.selected = false; else for (j = 0; j < state.blocks.length; j += 1) if (state.blocks[j].type === "priceChoice" && state.blocks[j].exclusiveGroup === block.exclusiveGroup) state.blocks[j].selected = state.blocks[j].id === block.id; }
        else block.selected = !block.selected;
        saveState(); render(); renderInteractiveToolPreview(); return;
      }
      var link = event.target.closest("[data-link-id]");
      if (link) { var linkBlock = getBlock(link.getAttribute("data-link-id")); var target = linkBlock ? preview.querySelector('[data-page-target="' + (linkBlock.targetPageId || "first") + '"]') : null; if (target) target.scrollIntoView({ behavior: "smooth", block: "start" }); event.preventDefault(); }
    });
    shell.appendChild(preview); previewList.appendChild(shell);
    previewList.appendChild(createElement("p", "tool-preview-note", "这是上传后用户看到的交互效果，可直接勾选并查看合计。"));
  }

  async function refreshPreview() {
    previewList.textContent = "";
    if (exportMode === "tool") {
      previewImages = []; exportButton.disabled = false; exportButton.textContent = "导出小红书动态价目表 ZIP";
      renderInteractiveToolPreview(); return;
    }
    previewList.appendChild(createElement("div", "preview-loading", "正在生成高清预览…"));
    exportButton.disabled = true;
    previewImages = [];
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      var manualPages = splitManualPages();
      var canvases = [];
      var manualIndex;
      for (manualIndex = 0; manualIndex < manualPages.length; manualIndex += 1) {
        var longCanvas = await renderLongCanvas(manualPages[manualIndex]);
        if (exportMode === "split") canvases = canvases.concat(splitCanvasThreeFour(longCanvas));
        else canvases.push(longCanvas);
      }
      previewList.textContent = "";
      var i;
      for (i = 0; i < canvases.length; i += 1) {
        var data = canvases[i].toDataURL("image/png");
        previewImages.push(data);
        var card = createElement("div", "preview-card");
        if (canvases.length > 1) card.appendChild(createElement("p", "preview-page-label", "第 " + (i + 1) + " / " + canvases.length + " 张" + (exportMode === "split" ? " · 3:4" : " · 独立页面")));
        var image = createElement("img");
        image.src = data;
        image.alt = canvases.length > 1 ? "价目表预览第 " + (i + 1) + " 张" : "价目表长图预览";
        card.appendChild(image);
        previewList.appendChild(card);
      }
      exportButton.disabled = false;
      exportButton.textContent = exportMode === "split" ? "保存全部 3:4 图片" : "保存长图到相册";
    } catch (error) {
      previewList.textContent = "";
      previewList.appendChild(createElement("div", "preview-loading", error.message || "预览生成失败"));
    }
  }

  function splitManualPages() {
    var pages = [[]];
    var i;
    for (i = 0; i < state.blocks.length; i += 1) {
      if (state.blocks[i].type === "pageBreak") pages.push([]);
      else pages[pages.length - 1].push(state.blocks[i]);
    }
    return pages;
  }

  function openPreview() {
    closeSheet();
    previewPage.classList.add("open");
    previewPage.setAttribute("aria-hidden", "false");
    refreshPreview();
  }

  function closePreview() {
    previewPage.classList.remove("open");
    previewPage.setAttribute("aria-hidden", "true");
    previewImages = [];
    previewList.textContent = "";
    if (toolDownloadUrl) { URL.revokeObjectURL(toolDownloadUrl); toolDownloadUrl = null; }
  }

  function invokeMiniTool(apiName, options) {
    return new Promise(function (resolve, reject) {
      var api = window.xhs && window.xhs.miniTool && window.xhs.miniTool[apiName];
      if (typeof api !== "function") { reject(new Error("当前不在小红书小工具中")); return; }
      var settled = false;
      var input = {};
      var key;
      for (key in options) if (Object.prototype.hasOwnProperty.call(options, key)) input[key] = options[key];
      input.success = function (result) { if (!settled) { settled = true; resolve(result || {}); } };
      input.fail = function (error) { if (!settled) { settled = true; reject(error || new Error("保存失败")); } };
      try {
        var result = api(input);
        if (result && typeof result.then === "function") {
          result.then(function (value) { if (!settled) { settled = true; resolve(value || {}); } }, function (error) { if (!settled) { settled = true; reject(error); } });
        }
      } catch (error) { reject(error); }
    });
  }

  async function exportPreviewImages() {
    if (!previewImages.length) return;
    if (!(window.xhs && window.xhs.miniTool)) {
      showToast("浏览器预览中，请长按或右键预览图保存");
      return;
    }
    exportButton.disabled = true;
    var originalText = exportButton.textContent;
    try {
      var i;
      for (i = 0; i < previewImages.length; i += 1) {
        exportButton.textContent = "正在保存 " + (i + 1) + " / " + previewImages.length;
        var temp = await invokeMiniTool("writeTempFile", { data: previewImages[i] });
        if (!temp.filePath) throw new Error("未获得临时文件路径");
        await invokeMiniTool("saveImageToPhotosAlbum", { filePath: temp.filePath });
      }
      showToast(previewImages.length > 1 ? "全部图片已保存" : "长图已保存到相册");
    } catch (error) {
      showToast(error && error.errMsg ? error.errMsg : (error.message || "保存失败"));
    }
    exportButton.textContent = originalText;
    exportButton.disabled = false;
  }

  function runtimeCss() {
    return '@font-face{font-family:ExportZh;src:url("./assets/zh.woff2") format("woff2")}@font-face{font-family:ExportLatin;src:url("./assets/latin.woff2") format("woff2")}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#ebe8e0;color:var(--ink);font-family:ExportLatin,ExportZh,serif;-webkit-tap-highlight-color:transparent}body{padding:24px 14px 44px}.pages{width:100%;max-width:430px;margin:0 auto}.receipt{position:relative;width:100%;margin:0 auto 28px;background:transparent;overflow:hidden}.receipt.sawtooth{-webkit-clip-path:polygon(0 12px,2.5% 0,5% 12px,7.5% 0,10% 12px,12.5% 0,15% 12px,17.5% 0,20% 12px,22.5% 0,25% 12px,27.5% 0,30% 12px,32.5% 0,35% 12px,37.5% 0,40% 12px,42.5% 0,45% 12px,47.5% 0,50% 12px,52.5% 0,55% 12px,57.5% 0,60% 12px,62.5% 0,65% 12px,67.5% 0,70% 12px,72.5% 0,75% 12px,77.5% 0,80% 12px,82.5% 0,85% 12px,87.5% 0,90% 12px,92.5% 0,95% 12px,97.5% 0,100% 12px,100% calc(100% - 12px),97.5% 100%,95% calc(100% - 12px),92.5% 100%,90% calc(100% - 12px),87.5% 100%,85% calc(100% - 12px),82.5% 100%,80% calc(100% - 12px),77.5% 100%,75% calc(100% - 12px),72.5% 100%,70% calc(100% - 12px),67.5% 100%,65% calc(100% - 12px),62.5% 100%,60% calc(100% - 12px),57.5% 100%,55% calc(100% - 12px),52.5% 100%,50% calc(100% - 12px),47.5% 100%,45% calc(100% - 12px),42.5% 100%,40% calc(100% - 12px),37.5% 100%,35% calc(100% - 12px),32.5% 100%,30% calc(100% - 12px),27.5% 100%,25% calc(100% - 12px),22.5% 100%,20% calc(100% - 12px),17.5% 100%,15% calc(100% - 12px),12.5% 100%,10% calc(100% - 12px),7.5% 100%,5% calc(100% - 12px),2.5% 100%,0 calc(100% - 12px));clip-path:polygon(0 12px,2.5% 0,5% 12px,7.5% 0,10% 12px,12.5% 0,15% 12px,17.5% 0,20% 12px,22.5% 0,25% 12px,27.5% 0,30% 12px,32.5% 0,35% 12px,37.5% 0,40% 12px,42.5% 0,45% 12px,47.5% 0,50% 12px,52.5% 0,55% 12px,57.5% 0,60% 12px,62.5% 0,65% 12px,67.5% 0,70% 12px,72.5% 0,75% 12px,77.5% 0,80% 12px,82.5% 0,85% 12px,87.5% 0,90% 12px,92.5% 0,95% 12px,97.5% 0,100% 12px,100% calc(100% - 12px),97.5% 100%,95% calc(100% - 12px),92.5% 100%,90% calc(100% - 12px),87.5% 100%,85% calc(100% - 12px),82.5% 100%,80% calc(100% - 12px),77.5% 100%,75% calc(100% - 12px),72.5% 100%,70% calc(100% - 12px),67.5% 100%,65% calc(100% - 12px),62.5% 100%,60% calc(100% - 12px),57.5% 100%,55% calc(100% - 12px),52.5% 100%,50% calc(100% - 12px),47.5% 100%,45% calc(100% - 12px),42.5% 100%,40% calc(100% - 12px),37.5% 100%,35% calc(100% - 12px),32.5% 100%,30% calc(100% - 12px),27.5% 100%,25% calc(100% - 12px),22.5% 100%,20% calc(100% - 12px),17.5% 100%,15% calc(100% - 12px),12.5% 100%,10% calc(100% - 12px),7.5% 100%,5% calc(100% - 12px),2.5% 100%,0 calc(100% - 12px))}.receipt.rounded{border-radius:22px}.content{position:relative;padding:42px var(--padding) 46px;background:var(--paper)}.content.texture:before{content:"";position:absolute;top:0;right:0;bottom:0;left:0;background:var(--ink);opacity:.18;-webkit-mask-image:url("./assets/texture.png");mask-image:url("./assets/texture.png");-webkit-mask-repeat:repeat;mask-repeat:repeat;pointer-events:none}.block{position:relative;z-index:1}.child{width:calc(100% - 18px);margin-left:18px}.text{margin:0;white-space:pre-wrap}.h1{font-size:30px;line-height:1.08;font-weight:900}.h2{font-size:18px;font-weight:900}.body{font-size:13px;line-height:1.65}.left{text-align:left}.center{text-align:center}.right{text-align:right}.image{display:block;width:100%;height:auto}.placeholder{min-height:120px;background:rgba(0,0,0,.05)}.image-row{display:flex;flex-wrap:wrap}.section h3{margin:0 0 8px;font-size:14px}.section p{margin:0;color:inherit;font-size:10px;opacity:.58}.choice{display:flex;min-height:42px;align-items:center;border-bottom:1px dashed rgba(0,0,0,.15)}.choice-label{flex:1;min-width:0}.choice-price{min-width:68px;text-align:right}.check{width:34px;height:34px;border:0;background:transparent;color:var(--accent);font-size:21px}.link{flex:0 1 auto;margin:0 8px;padding:3px 8px;border:1px solid currentColor;border-radius:999px;background:transparent;color:var(--accent);font:inherit;font-weight:800}.total{display:flex;align-items:baseline;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:2px solid currentColor;font-weight:900}.total strong{font-size:24px}.divider{width:100%;border:0;border-top:1px dashed currentColor}.flow{position:relative;display:flex}.flow-line{position:absolute;top:40px;height:2px;background:var(--accent);opacity:.55}.node{position:relative;flex:1;text-align:center}.node b,.node span,.node small{display:block}.node b{color:var(--accent);font-size:17px}.dot{width:10px;height:10px;margin:8px auto;border-radius:50%;background:var(--accent)}.node small{opacity:.55}.standalone-link{display:inline-block}.empty{min-height:64px}';
  }

  function runtimeScript(exportState) {
    return '(function(){"use strict";var DATA='+JSON.stringify(exportState).replace(/</g, "\\u003c")+';var root=document.getElementById("pages");function el(t,c,s){var e=document.createElement(t);if(c)e.className=c;if(typeof s==="string")e.textContent=s;return e}function get(id){for(var i=0;i<DATA.blocks.length;i++)if(DATA.blocks[i].id===id)return DATA.blocks[i];return null}function price(b,trail){if(!b||b.type!=="priceChoice")return 0;if(b.priceMode!=="multiplier"||!b.priceParentId)return Number(b.price)||0;trail=trail||{};if(trail[b.id])return 0;trail[b.id]=1;return price(get(b.priceParentId),trail)*(Number(b.priceMultiplier)||0)}function visible(b,trail){if(!b.parentId)return true;var p=get(b.parentId);if(!p)return true;trail=trail||{};if(trail[b.id])return true;trail[b.id]=1;if(!visible(p,trail))return false;if(b.parentState==="unselected")return !p.selected;if(b.parentState==="group-selected"||b.parentState==="group-other-selected"){for(var i=0;i<DATA.blocks.length;i++){var q=DATA.blocks[i];if(q.type==="priceChoice"&&q.exclusiveGroup===p.exclusiveGroup&&q.selected&&visible(q,trail)&&(b.parentState!=="group-other-selected"||q.id!==p.id))return true}return false}return !!p.selected}function total(){var n=0;for(var i=0;i<DATA.blocks.length;i++){var b=DATA.blocks[i];if(b.type==="priceChoice"&&b.selected&&visible(b))n+=price(b)}return n}function money(n){return (Number(n)||0).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g,",")}function md(node,text){var p=/\\*\\*([^*]+)\\*\\*/g,last=0,m;while((m=p.exec(text))!==null){if(m.index>last)node.appendChild(document.createTextNode(text.slice(last,m.index)));node.appendChild(el("strong","",m[1]));last=p.lastIndex}if(last<text.length)node.appendChild(document.createTextNode(text.slice(last)))}function pageLink(b,inline){var a=el("button",inline?"link":"link standalone-link",b.label||"查看页面");a.type="button";a.addEventListener("click",function(e){e.stopPropagation();var target=document.querySelector("[data-page-target=\\\""+(b.targetPageId||"first")+"\\\"]");if(target)target.scrollIntoView({behavior:"smooth",block:"start"})});return a}function choice(b){var row=el("div","choice"),label=el("span","choice-label",b.label);row.appendChild(label);for(var i=0;i<DATA.blocks.length;i++){var l=DATA.blocks[i];if(l.type==="pageLink"&&l.inlineParentId===b.id)row.appendChild(pageLink(l,true))}row.appendChild(el("span","choice-price",(b.currency||"¥")+" "+money(price(b))));var check=el("button","check",b.selected?"☑":"☐");check.type="button";check.addEventListener("click",function(){if(b.exclusiveGroup){if(b.selected)b.selected=false;else for(var j=0;j<DATA.blocks.length;j++){var q=DATA.blocks[j];if(q.type==="priceChoice"&&q.exclusiveGroup===b.exclusiveGroup)q.selected=q.id===b.id}}else b.selected=!b.selected;render()});row.appendChild(check);return row}function blockNode(b){var wrap=el("div","block"+(b.parentId&&b.indentChild!==false?" child":""));wrap.style.marginTop=(b.marginTop||0)+"px";wrap.style.marginBottom=(b.marginBottom||0)+"px";var c;if(b.type==="text"){c=el("p","text "+b.level+" "+b.align);md(c,b.text||"")}else if(b.type==="image"){c=b.src?el("img","image"):el("div","placeholder");if(b.src)c.src=b.src}else if(b.type==="priceSection"){c=el("div","section");c.appendChild(el("h3","",b.title));if(b.note)c.appendChild(el("p","",b.note))}else if(b.type==="priceChoice")c=choice(b);else if(b.type==="priceTotal"){c=el("div","total");c.appendChild(el("span","",b.label||"合计"));c.appendChild(el("strong","",(b.currency||"¥")+" "+money(total())))}else if(b.type==="divider"){c=el("hr","divider");c.style.borderTopStyle=b.style||"solid";c.style.borderTopWidth=(b.thickness||1)+"px"}else if(b.type==="flowchart"){c=el("div","flow");var line=el("div","flow-line"),inset=b.nodes.length?50/b.nodes.length:50;line.style.left=inset+"%";line.style.right=inset+"%";c.appendChild(line);for(var k=0;k<b.nodes.length;k++){var n=el("div","node");n.appendChild(el("b","",b.nodes[k].percent));n.appendChild(el("i","dot"));n.appendChild(el("span","",b.nodes[k].title));n.appendChild(el("small","",b.nodes[k].description));c.appendChild(n)}}else if(b.type==="pageLink")c=pageLink(b,false);if(c)wrap.appendChild(c);return wrap}function render(){root.textContent="";var page=null,content=null;function newPage(id){page=el("section","receipt "+(DATA.edgeStyle||"sawtooth"));page.setAttribute("data-page-target",id||"first");content=el("div","content"+(DATA.texture&&DATA.texture!=="none"?" texture":""));content.style.setProperty("--paper",DATA.paper);content.style.setProperty("--ink",DATA.ink);content.style.setProperty("--accent",DATA.accent);content.style.setProperty("--padding",(DATA.padding||24)+"px");content.style.color=DATA.ink;page.appendChild(content);root.appendChild(page)}newPage("");for(var i=0;i<DATA.blocks.length;i++){var b=DATA.blocks[i];if(b.type==="pageBreak"){newPage(b.id);continue}if(!visible(b)||b.type==="pageLink"&&b.inlineParentId)continue;if(b.type==="image"&&b.imageGroup){var row=el("div","image-row"),name=b.imageGroup,cols=b.groupColumns||2,gap=b.groupGap||0;while(i<DATA.blocks.length&&DATA.blocks[i].type==="image"&&DATA.blocks[i].imageGroup===name){var ib=DATA.blocks[i];if(visible(ib)){var item=blockNode(ib);item.style.width="calc("+(100/cols)+"% - "+gap+"px)";item.style.marginLeft=gap/2+"px";item.style.marginRight=gap/2+"px";row.appendChild(item)}i++}i--;content.appendChild(row)}else content.appendChild(blockNode(b))}if(!content.childNodes.length)content.classList.add("empty")}render()}());';
  }

  function runtimeScriptForExport(exportState) {
    var script = runtimeScript(exportState);
    var original = 'function choice(b){var row=el("div","choice"),label=el("span","choice-label",b.label);row.appendChild(label);';
    var enhanced = 'function choice(b){var row=el("div","choice"),label=el("span","choice-label",b.label);row.style.borderBottomStyle=b.separatorStyle==="none"?"none":(b.separatorStyle||"dashed");row.style.borderBottomWidth=(b.separatorThickness||2)+"px";row.appendChild(label);';
    return script.replace(original, enhanced);
  }

  function exportHtml() {
    return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,viewport-fit=cover"><title>动态价目表</title><link rel="stylesheet" href="./style.css"></head><body><main class="pages" id="pages"></main><script src="./app.js"></script></body></html>';
  }

  function utf8Bytes(text) { return new TextEncoder().encode(text); }
  function dataUriBytes(uri) { var comma=uri.indexOf(","), meta=uri.slice(0,comma), data=uri.slice(comma+1), binary=meta.indexOf(";base64")>=0?atob(data):decodeURIComponent(data), out=new Uint8Array(binary.length),i;for(i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out; }
  function readLocalBytes(path) { return new Promise(function(resolve,reject){var request=new XMLHttpRequest();request.open("GET",path,true);request.responseType="arraybuffer";request.onload=function(){if(request.status===0||request.status<400)resolve(new Uint8Array(request.response));else reject(new Error("资源读取失败"))};request.onerror=function(){reject(new Error("资源读取失败"))};request.send()}); }
  function crc32(bytes){var crc=-1,i,j;for(i=0;i<bytes.length;i++){crc^=bytes[i];for(j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return(crc^-1)>>>0}
  function put16(view,offset,value){view.setUint16(offset,value,true)} function put32(view,offset,value){view.setUint32(offset,value,true)}
  function makeZip(files){var parts=[],central=[],offset=0,i;for(i=0;i<files.length;i++){var name=utf8Bytes(files[i].name),data=files[i].data,crc=crc32(data),local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);put32(lv,0,0x04034b50);put16(lv,4,20);put16(lv,6,0x0800);put16(lv,8,0);put32(lv,14,crc);put32(lv,18,data.length);put32(lv,22,data.length);put16(lv,26,name.length);local.set(name,30);parts.push(local,data);var center=new Uint8Array(46+name.length),cv=new DataView(center.buffer);put32(cv,0,0x02014b50);put16(cv,4,20);put16(cv,6,20);put16(cv,8,0x0800);put32(cv,16,crc);put32(cv,20,data.length);put32(cv,24,data.length);put16(cv,28,name.length);put32(cv,42,offset);center.set(name,46);central.push(center);offset+=local.length+data.length}var centralSize=0;for(i=0;i<central.length;i++){parts.push(central[i]);centralSize+=central[i].length}var end=new Uint8Array(22),ev=new DataView(end.buffer);put32(ev,0,0x06054b50);put16(ev,8,files.length);put16(ev,10,files.length);put32(ev,12,centralSize);put32(ev,16,offset);parts.push(end);return new Blob(parts,{type:"application/zip"})}

  async function exportDynamicMiniTool() {
    var button=exportButton,original=button.textContent;button.disabled=true;button.textContent="正在生成小工具…";
    try {
      var exported=cloneData(state),files=[],imageIndex=0,i;exported.edgeStyle=exported.edgeStyle==="rounded"?"rounded":"square";
      for(i=0;i<exported.blocks.length;i++)if(exported.blocks[i].type==="image"&&exported.blocks[i].src&&exported.blocks[i].src.indexOf("data:")===0){var match=/^data:image\/([a-zA-Z0-9+.-]+)/.exec(exported.blocks[i].src),ext=match&&match[1].toLowerCase()==="jpeg"?"jpg":(match?match[1].toLowerCase():"png");var imagePath="assets/image-"+(++imageIndex)+"."+ext,imageBytes=dataUriBytes(exported.blocks[i].src);if(imageBytes.length>1024*1024)throw new Error("有图片超过 1MB，请压缩后再导出小工具");files.push({name:imagePath,data:imageBytes});exported.blocks[i].src="./"+imagePath}
      var fontMap={PriceNotoSerifZh:"./assets/fonts/noto-serif-sc-regular.woff2",PriceQiuYeZh:"./assets/fonts/qiuye-yuanti.woff2",PriceSourceSerifLatin:"./assets/fonts/source-serif-4.woff2",PriceSourceSansLatin:"./assets/fonts/source-sans-3.woff2",PriceRobotoLatin:"./assets/fonts/roboto-semicondensed-bold.woff2"};
      var zhBytes=null,latinBytes=null;if(state.zhFont==="PriceUserZh"){var storedZh=await loadStoredFont("zh");if(storedZh)zhBytes=new Uint8Array(storedZh.buffer)}else if(fontMap[state.zhFont])zhBytes=await readLocalBytes(fontMap[state.zhFont]);if(state.latinFont==="PriceUserLatin"){var storedLatin=await loadStoredFont("latin");if(storedLatin)latinBytes=new Uint8Array(storedLatin.buffer)}else if(fontMap[state.latinFont])latinBytes=await readLocalBytes(fontMap[state.latinFont]);if(!zhBytes)zhBytes=await readLocalBytes(fontMap.PriceNotoSerifZh);if(!latinBytes)latinBytes=await readLocalBytes(fontMap.PriceSourceSerifLatin);files.push({name:"assets/zh.woff2",data:zhBytes});files.push({name:"assets/latin.woff2",data:latinBytes});
      files.push({name:"assets/texture.png",data:await readLocalBytes("./assets/backgrounds/"+(state.texture&&state.texture!=="none"?state.texture:"xv")+".png")});
      var exportedCss=runtimeCss(),oldSawStart=exportedCss.indexOf('.receipt.sawtooth'),oldSawEnd=exportedCss.indexOf('.receipt.rounded',oldSawStart);if(oldSawStart>=0&&oldSawEnd>oldSawStart)exportedCss=exportedCss.slice(0,oldSawStart)+exportedCss.slice(oldSawEnd);var oldTextureStart=exportedCss.indexOf('.content.texture:before'),oldTextureEnd=exportedCss.indexOf('.block{',oldTextureStart);if(oldTextureStart>=0&&oldTextureEnd>oldTextureStart)exportedCss=exportedCss.slice(0,oldTextureStart)+exportedCss.slice(oldTextureEnd);exportedCss+='body{padding-left:0;padding-right:0}.pages{width:90%;max-width:520px}.link{padding:0;border:0;border-radius:0;color:var(--accent);font-size:12px;text-decoration:underline;text-underline-offset:3px}.content.texture{background-image:url("./assets/texture.png");background-repeat:repeat;background-position:0 0}.total{margin-top:0}.section h3{margin-bottom:0}.section p{margin-top:12px}';
      files.push({name:"index.html",data:utf8Bytes(exportHtml())},{name:"style.css",data:utf8Bytes(exportedCss)},{name:"app.js",data:utf8Bytes(runtimeScriptForExport(exported))});
      var zipBlob=makeZip(files);if(zipBlob.size>10*1024*1024)throw new Error("小工具超过 10MB，请减少图片或更换较小字体");if(toolDownloadUrl)URL.revokeObjectURL(toolDownloadUrl);toolDownloadUrl=URL.createObjectURL(zipBlob);var anchor=createElement("a","tool-download-link","ZIP 已生成，点击下载");anchor.href=toolDownloadUrl;anchor.download="xhs-dynamic-price-list.zip";previewList.appendChild(anchor);anchor.click();showToast("ZIP 已生成；若未自动下载，请点击下载按钮");
    } catch(error) { var message=error.message||"小工具导出失败";showToast(message);previewList.appendChild(createElement("p","tool-export-error",message)); }
    button.disabled=false;button.textContent=original;
  }

  function openFontDatabase() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("当前环境不支持字体存储")); return; }
      var request = indexedDB.open("xhsPriceBuilderFonts", 1);
      request.onupgradeneeded = function () {
        var database = request.result;
        if (!database.objectStoreNames.contains("fonts")) database.createObjectStore("fonts");
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("字体存储打开失败")); };
    });
  }

  async function storeCustomFont(kind, buffer, fileName) {
    var database = await openFontDatabase();
    return new Promise(function (resolve, reject) {
      var transaction = database.transaction("fonts", "readwrite");
      transaction.objectStore("fonts").put({ buffer: buffer, fileName: fileName }, kind);
      transaction.oncomplete = function () { database.close(); resolve(); };
      transaction.onerror = function () { database.close(); reject(transaction.error || new Error("字体保存失败")); };
    });
  }

  async function loadStoredFont(kind) {
    try {
      var database = await openFontDatabase();
      return await new Promise(function (resolve) {
        var transaction = database.transaction("fonts", "readonly");
        var request = transaction.objectStore("fonts").get(kind);
        request.onsuccess = function () { var result = request.result || null; database.close(); resolve(result); };
        request.onerror = function () { database.close(); resolve(null); };
      });
    } catch (error) { return null; }
  }

  async function installCustomFont(kind, buffer) {
    if (!window.FontFace || !document.fonts) throw new Error("当前 WebView 不支持导入字体");
    var family = kind === "zh" ? "PriceUserZh" : "PriceUserLatin";
    var face = new FontFace(family, buffer);
    await face.load();
    document.fonts.add(face);
    return family;
  }

  async function restoreCustomFonts() {
    var kinds = ["zh", "latin"];
    var i;
    for (i = 0; i < kinds.length; i += 1) {
      var stored = await loadStoredFont(kinds[i]);
      if (stored && stored.buffer) {
        try { await installCustomFont(kinds[i], stored.buffer); } catch (error) { /* keep system fallback */ }
      }
    }
    applyTheme();
    render();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 1600);
  }

  blockList.addEventListener("click", function (event) {
    var target = event.target.closest(".receipt-block");
    if (!target) {
      var pageTarget = event.target.closest(".receipt[data-page-break-id]");
      if (!pageTarget) return;
      selectedId = pageTarget.getAttribute("data-page-break-id"); render(); openSheet("block"); return;
    }
    selectedId = target.getAttribute("data-id");
    render();
    if (!event.target.classList.contains("block-grip")) openSheet("block");
  });

  blockList.addEventListener("dragstart", function (event) {
    var target = event.target.closest(".receipt-block");
    if (!target) return;
    draggedId = target.getAttribute("data-id");
    closeSheet();
    target.classList.add("dragging");
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  });

  blockList.addEventListener("dragover", function (event) {
    var target = event.target.closest(".receipt-block");
    if (componentTouchDrag && componentTouchDrag.desktop) {
      event.preventDefault();
      markDropTarget(target, event.clientY);
      return;
    }
    if (!target || target.getAttribute("data-id") === draggedId) return;
    event.preventDefault();
    markDropTarget(target, event.clientY);
  });

  blockList.addEventListener("drop", function (event) {
    var target = event.target.closest(".receipt-block");
    event.preventDefault();
    if (componentTouchDrag && componentTouchDrag.desktop) {
      var desktopParentId = target && dropMode === "inside" ? target.getAttribute("data-id") : "";
      var desktopIndex = target ? getBlockIndex(target.getAttribute("data-id")) + (desktopParentId ? 1 : 0) : state.blocks.length;
      insertComponent(componentTouchDrag.factory, desktopIndex, componentTouchDrag.title, desktopParentId);
      componentTouchDrag = null;
      blockList.classList.remove("component-drop-active");
      clearDropMarks();
      return;
    }
    if (target && dropMode === "inside") nestBlock(draggedId, target.getAttribute("data-id"));
    else if (target) reorder(draggedId, target.getAttribute("data-id"));
    draggedId = null;
    clearDropMarks();
  });

  blockList.addEventListener("dragend", function () {
    draggedId = null;
    clearDropMarks();
    render();
  });

  function getBlockIndex(id) {
    var i;
    for (i = 0; i < state.blocks.length; i += 1) if (state.blocks[i].id === id) return i;
    return state.blocks.length;
  }

  document.addEventListener("touchmove", function (event) {
    if (!componentTouchDrag || componentTouchDrag.desktop) return;
    var touch = event.touches[0];
    var distance = Math.abs(touch.clientX - componentTouchDrag.startX) + Math.abs(touch.clientY - componentTouchDrag.startY);
    if (!componentTouchDrag.moved && distance < 12) return;
    if (!componentTouchDrag.moved) {
      componentTouchDrag.moved = true;
      componentTouchDrag.ghost = createElement("div", "drag-ghost", componentTouchDrag.title + " · 拖到价目表");
      document.body.appendChild(componentTouchDrag.ghost);
      closeSheet();
      blockList.classList.add("component-drop-active");
    }
    componentTouchDrag.ghost.style.left = touch.clientX + "px";
    componentTouchDrag.ghost.style.top = touch.clientY + "px";
    var hit = document.elementFromPoint(touch.clientX, touch.clientY);
    var target = hit ? hit.closest(".receipt-block") : null;
    markDropTarget(target, touch.clientY);
    event.preventDefault();
  }, { passive: false });

  document.addEventListener("touchend", function (event) {
    if (!componentTouchDrag || componentTouchDrag.desktop) return;
    if (!componentTouchDrag.moved) {
      componentTouchDrag = null;
      return;
    }
    var touch = event.changedTouches[0];
    if (componentTouchDrag.ghost && componentTouchDrag.ghost.parentNode) componentTouchDrag.ghost.parentNode.removeChild(componentTouchDrag.ghost);
    var hit = document.elementFromPoint(touch.clientX, touch.clientY);
    var target = hit ? hit.closest(".receipt-block") : null;
    var insideCanvas = hit && (hit === blockList || blockList.contains(hit));
    var factory = componentTouchDrag.factory;
    var title = componentTouchDrag.title;
    componentTouchDrag = null;
    suppressComponentClick = true;
    blockList.classList.remove("component-drop-active");
    clearDropMarks();
    if (target || insideCanvas) insertComponent(factory, target ? getBlockIndex(target.getAttribute("data-id")) + (dropMode === "inside" ? 1 : 0) : state.blocks.length, title, target && dropMode === "inside" ? target.getAttribute("data-id") : "");
    else showToast("请拖到价目表区域");
    event.preventDefault();
  }, { passive: false });

  blockList.addEventListener("touchstart", function (event) {
    var grip = event.target.closest(".block-grip");
    if (!grip) return;
    var block = grip.closest(".receipt-block");
    closeSheet();
    var touch = event.touches[0];
    touchDrag = { id: block.getAttribute("data-id"), x: touch.clientX, y: touch.clientY };
    block.classList.add("dragging");
    event.preventDefault();
  }, { passive: false });

  blockList.addEventListener("touchmove", function (event) {
    if (!touchDrag) return;
    var touch = event.touches[0];
    var hit = document.elementFromPoint(touch.clientX, touch.clientY);
    var target = hit ? hit.closest(".receipt-block") : null;
    if (target && target.getAttribute("data-id") !== touchDrag.id) markDropTarget(target, touch.clientY);
    else clearDropMarks();
    event.preventDefault();
  }, { passive: false });

  blockList.addEventListener("touchend", function (event) {
    if (!touchDrag) return;
    var touch = event.changedTouches[0];
    var hit = document.elementFromPoint(touch.clientX, touch.clientY);
    var target = hit ? hit.closest(".receipt-block") : null;
    if (target && dropMode === "inside") nestBlock(touchDrag.id, target.getAttribute("data-id"));
    else if (target) reorder(touchDrag.id, target.getAttribute("data-id"));
    touchDrag = null;
    clearDropMarks();
    render();
  });

  imagePicker.addEventListener("change", function () {
    var block = getBlock(selectedId);
    var file = imagePicker.files && imagePicker.files[0];
    if (!block || block.type !== "image" || !file) return;
    if (file.size > 1024 * 1024) {
      showToast("建议选择 1MB 以内的图片");
    }
    var reader = new FileReader();
    reader.onload = function () {
      recordEditOnce();
      block.src = reader.result;
      saveState();
      render();
      closeSheet();
      showToast("图片已添加");
    };
    reader.readAsDataURL(file);
    imagePicker.value = "";
  });

  document.getElementById("fontPicker").addEventListener("change", function () {
    var picker = this;
    var file = picker.files && picker.files[0];
    var kind = pendingFontKind;
    pendingFontKind = null;
    if (!file || !kind) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast("字体超过 8MB，请选择更小的字体文件");
      picker.value = "";
      return;
    }
    var reader = new FileReader();
    reader.onload = async function () {
      try {
        var family = await installCustomFont(kind, reader.result);
        await storeCustomFont(kind, reader.result, file.name);
        pushHistory();
        if (kind === "zh") state.zhFont = family;
        else state.latinFont = family;
        saveState();
        applyTheme();
        render();
        openSheet("design");
        showToast("字体已导入并应用");
      } catch (error) { showToast(error.message || "字体导入失败"); }
      picker.value = "";
    };
    reader.onerror = function () { showToast("字体读取失败"); picker.value = ""; };
    reader.readAsArrayBuffer(file);
  });

  document.getElementById("sheetClose").addEventListener("click", closeSheet);
  sheetBackdrop.addEventListener("click", closeSheet);
  document.getElementById("previewButton").addEventListener("click", openPreview);
  document.getElementById("previewBack").addEventListener("click", closePreview);
  exportButton.addEventListener("click", function () { if (exportMode === "tool") exportDynamicMiniTool(); else exportPreviewImages(); });
  var exportModeButtons = document.querySelectorAll("[data-export-mode]");
  var exportModeIndex;
  for (exportModeIndex = 0; exportModeIndex < exportModeButtons.length; exportModeIndex += 1) {
    exportModeButtons[exportModeIndex].addEventListener("click", function () {
      var i;
      exportMode = this.getAttribute("data-export-mode");
      for (i = 0; i < exportModeButtons.length; i += 1) exportModeButtons[i].classList.remove("active");
      this.classList.add("active");
      previewNote.textContent = exportMode === "split" ? "按 900 × 1200 像素连续切分为 3:4 图片" : (exportMode === "tool" ? "导出只含动态价目表的可上传 ZIP" : "生成一张完整的高清长图");
      refreshPreview();
    });
  }
  document.getElementById("undoButton").addEventListener("click", undo);
  document.getElementById("redoButton").addEventListener("click", redo);
  document.getElementById("addPageButton").addEventListener("click", function () { pushHistory(); var block = pageBreakBlock(); state.blocks.push(block); selectedId = block.id; saveState(); render(); openSheet("structure"); showToast("已增加单独一页"); });
  document.getElementById("templateConfirmCancel").addEventListener("click", closeTemplateConfirm);
  document.getElementById("templateConfirmAccept").addEventListener("click", function () {
    var factory = pendingTemplateFactory;
    closeTemplateConfirm();
    if (factory) applyTemplate(factory);
  });

  var toolTabs = document.querySelectorAll(".tool-tab");
  var tabIndex;
  for (tabIndex = 0; tabIndex < toolTabs.length; tabIndex += 1) {
    toolTabs[tabIndex].addEventListener("click", function () { openSheet(this.getAttribute("data-panel")); });
  }

  function updateAppHeight() {
    var height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty("--app-height", height + "px");
  }
  window.addEventListener("resize", updateAppHeight);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", updateAppHeight);

  state = normalizeState(loadState());
  updateAppHeight();
  render();
  updateUndoButton();
  restoreCustomFonts();
}());
