// AI Web Summarizer - Popup Script (纯前端方案)
// 直接调用AI API，无需后端

let currentMode = 'brief';
let currentSummary = '';

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 获取选中的文本
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
    if (response && response.text) {
      document.getElementById('inputText').value = response.text;
    }
  });
  
  // 模式切换
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
    });
  });
  
  // 提取页面
  document.getElementById('extractBtn').addEventListener('click', extractPageContent);
  
  // 生成摘要
  document.getElementById('summarizeBtn').addEventListener('click', generateSummary);
  
  // 导出功能
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', () => exportContent(btn.dataset.export));
  });
  
  // 设置
  document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});

// 提取页面内容
async function extractPageContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // 提取主要内容
      const article = document.querySelector('article, .article, .post-content, .entry-content');
      if (article) return article.innerText;
      
      // 备选：提取所有段落
      const paragraphs = document.querySelectorAll('p');
      return Array.from(paragraphs).slice(0, 20).map(p => p.innerText).join('\n\n');
    }
  }, (results) => {
    if (results && results[0] && results[0].result) {
      document.getElementById('inputText').value = results[0].result.substring(0, 5000);
    }
  });
}

// 生成摘要
async function generateSummary() {
  const text = document.getElementById('inputText').value.trim();
  
  if (!text) {
    showOutput('请先输入或提取要摘要的内容', true);
    return;
  }
  
  showLoading(true);
  
  try {
    // 获取存储的API配置
    const config = await chrome.storage.sync.get(['apiProvider', 'apiKey', 'model']);
    
    if (!config.apiKey) {
      showOutput('请先设置API密钥（点击下方设置链接）', true);
      showLoading(false);
      return;
    }
    
    const prompt = getPromptByMode(currentMode, text);
    
    let summary = '';
    
    if (config.apiProvider === 'deepseek') {
      summary = await callDeepSeekAPI(config.apiKey, config.model || 'deepseek-chat', prompt);
    } else if (config.apiProvider === 'qwen') {
      summary = await callQwenAPI(config.apiKey, config.model || 'qwen-turbo', prompt);
    } else {
      throw new Error('请先选择API提供商并配置密钥');
    }
    
    currentSummary = summary;
    showOutput(summary);
    document.getElementById('exportBtns').style.display = 'flex';
    
    // 保存到历史
    saveToHistory(text.substring(0, 200), summary);
    
  } catch (error) {
    showOutput(`生成失败: ${error.message}`, true);
  } finally {
    showLoading(false);
  }
}

// 根据模式获取Prompt
function getPromptByMode(mode, text) {
  const prompts = {
    brief: `请用2-3句话简要概括以下内容的核心观点：\n\n${text}`,
    detailed: `请对以下内容进行详细摘要，包括：\n1. 核心观点\n2. 关键论据\n3. 结论或启示\n\n内容：\n${text}`,
    bullet: `请将以下内容整理为要点形式（5-7个要点）：\n\n${text}`
  };
  return prompts[mode] || prompts.brief;
}

// 调用DeepSeek API
async function callDeepSeekAPI(apiKey, model, prompt) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800
    })
  });
  
  if (!response.ok) {
    throw new Error(`API错误: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// 调用通义千问API
async function callQwenAPI(apiKey, model, prompt) {
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      input: { messages: [{ role: 'user', content: prompt }] },
      parameters: { max_tokens: 800 }
    })
  });
  
  if (!response.ok) {
    throw new Error(`API错误: ${response.status}`);
  }
  
  const data = await response.json();
  return data.output.text;
}

// 纯前端方案：直接调用AI API
// Worker方案已移除，零成本实现

// 导出内容
async function exportContent(type) {
  if (!currentSummary) return;
  
  switch (type) {
    case 'copy':
      await navigator.clipboard.writeText(currentSummary);
      showToast('已复制到剪贴板');
      break;
    case 'notion':
      // 打开Notion授权页面
      chrome.tabs.create({ url: `https://api.notion.com/v1/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(chrome.runtime.getURL('oauth.html'))}&response_type=code` });
      break;
    case 'feishu':
      showToast('飞书导出功能开发中');
      break;
  }
}

// 保存到历史
async function saveToHistory(original, summary) {
  const history = await chrome.storage.local.get('history');
  const items = history.history || [];
  
  items.unshift({
    id: Date.now(),
    original: original.substring(0, 200),
    summary: summary.substring(0, 500),
    timestamp: new Date().toISOString()
  });
  
  // 只保留最近50条
  await chrome.storage.local.set({ history: items.slice(0, 50) });
}

// UI辅助函数
function showOutput(text, isError = false) {
  const output = document.getElementById('output');
  output.textContent = text;
  output.classList.remove('empty');
  output.style.color = isError ? '#e74c3c' : '#333';
}

function showLoading(show) {
  document.getElementById('loading').classList.toggle('active', show);
}

function showToast(message) {
  // 简单的toast实现
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 12px;
    z-index: 10000;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}
