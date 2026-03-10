// AI Web Summarizer - Content Script

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    const selectedText = window.getSelection().toString().trim();
    sendResponse({ text: selectedText });
  }
  return true;
});

// 添加快捷键监听
document.addEventListener('keydown', (e) => {
  // Alt+S 打开插件
  if (e.altKey && e.key === 's') {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  }
});

// 右键菜单：摘要选中文字
let contextMenuHandler = null;

// 注入浮动摘要按钮（可选功能）
function injectFloatingButton() {
  // 检测用户选中文字时显示浮动按钮
  document.addEventListener('mouseup', (e) => {
    const selectedText = window.getSelection().toString().trim();
    
    // 移除旧的按钮
    const oldBtn = document.getElementById('ai-summarizer-float-btn');
    if (oldBtn) oldBtn.remove();
    
    if (selectedText.length > 20) {
      const btn = document.createElement('div');
      btn.id = 'ai-summarizer-float-btn';
      btn.innerHTML = '✨ AI摘要';
      btn.style.cssText = `
        position: fixed;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        cursor: pointer;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        transition: transform 0.2s;
      `;
      btn.style.left = `${e.pageX}px`;
      btn.style.top = `${e.pageY + 20}px`;
      
      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ 
          action: 'summarizeText', 
          text: selectedText 
        });
        btn.remove();
      });
      
      document.body.appendChild(btn);
      
      // 3秒后自动消失
      setTimeout(() => btn.remove(), 3000);
    }
  });
}

// 初始化
injectFloatingButton();

console.log('📝 AI网页摘要助手已加载');
