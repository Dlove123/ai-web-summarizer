// AI Web Summarizer - Background Service Worker

// 安装时初始化
chrome.runtime.onInstalled.addListener(() => {
  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'summarizeSelection',
    title: '📝 AI摘要选中内容',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'summarizePage',
    title: '📄 AI摘要整个页面',
    contexts: ['page']
  });
  
  console.log('✅ AI网页摘要助手已安装');
});

// 右键菜单点击处理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'summarizeSelection') {
    // 存储选中的文本
    chrome.storage.session.set({ pendingText: info.selectionText });
    // 打开popup
    chrome.action.openPopup();
  } else if (info.menuItemId === 'summarizePage') {
    // 提取页面内容
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const article = document.querySelector('article, .article, .post-content');
        return article ? article.innerText : document.body.innerText.substring(0, 8000);
      }
    }, (results) => {
      if (results && results[0]) {
        chrome.storage.session.set({ pendingText: results[0].result });
        chrome.action.openPopup();
      }
    });
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    chrome.action.openPopup();
  } else if (request.action === 'summarizeText') {
    chrome.storage.session.set({ pendingText: request.text });
    chrome.action.openPopup();
  }
  return true;
});

// 快捷键处理（Manifest V3中通过commands处理）
chrome.commands.onCommand.addListener((command) => {
  if (command === '_execute_action') {
    chrome.action.openPopup();
  }
});
