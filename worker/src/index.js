// Cloudflare Worker - AI Summarizer API Proxy
// 免费额度：10万次请求/天

const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

export default {
  async fetch(request, env, ctx) {
    // CORS处理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    try {
      const { text, mode = 'brief' } = await request.json();
      
      if (!text || text.trim().length === 0) {
        return jsonResponse({ error: 'Text is required' }, 400);
      }
      
      // 使用通义千问（免费额度充足）
      const prompt = getPrompt(mode, text);
      const summary = await callQwenAPI(env.QWEN_API_KEY, prompt);
      
      return jsonResponse({ summary, mode });
      
    } catch (error) {
      console.error('Error:', error);
      return jsonResponse({ error: error.message }, 500);
    }
  }
};

// 调用通义千问API
async function callQwenAPI(apiKey, prompt) {
  const response = await fetch(DASHSCOPE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'qwen-turbo',  // 免费模型
      input: {
        messages: [
          { role: 'system', content: '你是一个专业的内容摘要助手，擅长提取关键信息并以清晰的方式呈现。' },
          { role: 'user', content: prompt }
        ]
      },
      parameters: {
        max_tokens: 800,
        temperature: 0.7
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.output?.text || data.output?.choices?.[0]?.message?.content || '摘要生成失败';
}

// 根据模式生成Prompt
function getPrompt(mode, text) {
  const truncated = text.substring(0, 4000); // 限制输入长度
  
  const prompts = {
    brief: `请用2-3句话简要概括以下内容的核心观点：\n\n${truncated}`,
    detailed: `请对以下内容进行详细摘要，包括核心观点、关键论据和结论：\n\n${truncated}`,
    bullet: `请将以下内容整理为5-7个要点：\n\n${truncated}`
  };
  
  return prompts[mode] || prompts.brief;
}

// JSON响应辅助函数
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
