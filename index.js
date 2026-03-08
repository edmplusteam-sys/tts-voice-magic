const TOKEN_REFRESH_BEFORE_EXPIRY = 3 * 60;
let tokenInfo = {
    endpoint: null,
    token: null,
    expiredAt: null
};

// HTML 页面模板
const HTML_PAGE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AILIAO Discover</title>
  <style>
    :root {
      --bg: #f5f5f7;
      --card: #ffffff;
      --text: #111111;
      --muted: #6e6e73;
      --line: #d2d2d7;
      --radius: 20px;
      --shadow: 0 12px 36px rgba(0, 0, 0, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: radial-gradient(circle at top, #ffffff 0%, var(--bg) 50%, #ededf0 100%);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
    }

    .shell {
      width: min(1100px, 92vw);
      margin: 48px auto;
    }

    .hero {
      border: 1px solid var(--line);
      background: var(--card);
      border-radius: 28px;
      box-shadow: var(--shadow);
      padding: 48px 40px;
      margin-bottom: 24px;
    }

    .hero h1 {
      margin: 0;
      font-size: clamp(32px, 4vw, 48px);
      letter-spacing: -0.02em;
      font-weight: 700;
    }

    .hero p {
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 17px;
      max-width: 720px;
      line-height: 1.7;
    }

    .toolbar {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      flex-wrap: wrap;
    }

    button {
      border: 1px solid #1d1d1f;
      background: #1d1d1f;
      color: #fff;
      border-radius: 999px;
      height: 42px;
      padding: 0 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s ease;
    }

    button:hover { opacity: .86; transform: translateY(-1px); }

    button.secondary {
      background: #fff;
      color: #1d1d1f;
    }

    .status {
      margin-top: 12px;
      color: var(--muted);
      font-size: 14px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .card .index {
      font-size: 12px;
      color: var(--muted);
      letter-spacing: .06em;
      font-weight: 600;
    }

    .card h3 {
      margin: 0;
      font-size: 18px;
      line-height: 1.4;
      letter-spacing: -0.01em;
    }

    .card p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
      flex: 1;
    }

    .card a {
      color: #111;
      text-decoration: none;
      border: 1px solid #111;
      border-radius: 999px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      height: 34px;
      padding: 0 12px;
      font-size: 13px;
      font-weight: 600;
      align-self: flex-start;
    }

    .empty {
      padding: 30px;
      background: #fff;
      border: 1px dashed var(--line);
      border-radius: var(--radius);
      color: var(--muted);
      text-align: center;
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <h1>id.ailiao.eu 数据看板</h1>
      <p>遵循 Apple 风格设计语言：黑白主色、卡片式排版、圆角和清晰层级。点击刷新即可实时抓取 id.ailiao.eu 数据并展示。</p>
      <div class="toolbar">
        <button id="refreshBtn">刷新数据</button>
        <button id="sourceBtn" class="secondary">打开数据源</button>
      </div>
      <div class="status" id="statusText">正在加载数据...</div>
    </section>

    <section id="cardGrid" class="grid"></section>
  </main>

  <script>
    const statusEl = document.getElementById('statusText');
    const gridEl = document.getElementById('cardGrid');

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderCards(items) {
      if (!items.length) {
        gridEl.innerHTML = '<div class="empty">未抓取到可展示的数据，请稍后重试。</div>';
        return;
      }

      gridEl.innerHTML = items.map((item, idx) => {
        const title = escapeHtml(item.title || '未命名条目');
        const desc = escapeHtml(item.description || '暂无描述');
        const url = escapeHtml(item.url || '#');
        return '<article class=\"card\">' +
          '<div class=\"index\">ITEM ' + (idx + 1).toString().padStart(2, '0') + '</div>' +
          '<h3>' + title + '</h3>' +
          '<p>' + desc + '</p>' +
          '<a href=\"' + url + '\" target=\"_blank\" rel=\"noreferrer\">查看详情</a>' +
          '</article>';
      }).join('');
    }

    async function loadData() {
      statusEl.textContent = '正在抓取 id.ailiao.eu...';
      try {
        const res = await fetch('/api/ailiao');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '请求失败');

        renderCards(data.items || []);
        statusEl.textContent = '已更新：' + new Date(data.fetchedAt || Date.now()).toLocaleString() + ' · 共 ' + (data.items?.length || 0) + ' 条';
      } catch (error) {
        gridEl.innerHTML = '<div class="empty">抓取失败：' + escapeHtml(error.message) + '</div>'; 
        statusEl.textContent = '抓取失败';
      }
    }

    document.getElementById('refreshBtn').addEventListener('click', loadData);
    document.getElementById('sourceBtn').addEventListener('click', () => {
      window.open('https://id.ailiao.eu', '_blank', 'noopener,noreferrer');
    });

    loadData();
  </script>
</body>
</html>
`;


export default {
    async fetch(request, env, ctx) {
        return handleRequest(request);
    }
};

async function handleRequest(request) {
    if (request.method === "OPTIONS") {
        return handleOptions(request);
    }




    const requestUrl = new URL(request.url);
    const path = requestUrl.pathname;

    // 返回前端页面
    if (path === "/" || path === "/index.html") {
        return new Response(HTML_PAGE, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                ...makeCORSHeaders()
            }
        });
    }

    if (path === "/api/ailiao") {
        return handleAiliaoScrape();
    }

    if (path === "/v1/audio/transcriptions") {
        try {
            return await handleAudioTranscription(request);
        } catch (error) {
            console.error("Audio transcription error:", error);
            return new Response(JSON.stringify({
                error: {
                    message: error.message,
                    type: "api_error",
                    param: null,
                    code: "transcription_error"
                }
            }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }
    }

    if (path === "/v1/audio/speech") {
        try {
            const contentType = request.headers.get("content-type") || "";
            
            // 处理文件上传
            if (contentType.includes("multipart/form-data")) {
                return await handleFileUpload(request);
            }
            
            // 处理JSON请求（原有功能）
            const requestBody = await request.json();
            const {
                input,
                voice = "zh-CN-XiaoxiaoNeural",
                speed = '1.0',
                volume = '0',
                pitch = '0',
                style = "general"
            } = requestBody;

            let rate = parseInt(String((parseFloat(speed) - 1.0) * 100));
            let numVolume = parseInt(String(parseFloat(volume) * 100));
            let numPitch = parseInt(pitch);
            const response = await getVoice(
                input,
                voice,
                rate >= 0 ? `+${rate}%` : `${rate}%`,
                numPitch >= 0 ? `+${numPitch}Hz` : `${numPitch}Hz`,
                numVolume >= 0 ? `+${numVolume}%` : `${numVolume}%`,
                style,
                "audio-24khz-48kbitrate-mono-mp3"
            );

            return response;

        } catch (error) {
            console.error("Error:", error);
            return new Response(JSON.stringify({
                error: {
                    message: error.message,
                    type: "api_error",
                    param: null,
                    code: "edge_tts_error"
                }
            }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }
    }

    // 默认返回 404
    return new Response("Not Found", { status: 404 });
}

async function handleOptions(request) {
    return new Response(null, {
        status: 204,
        headers: {
            ...makeCORSHeaders(),
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "Authorization"
        }
    });
}

async function handleAiliaoScrape() {
    try {
        const response = await fetch("https://id.ailiao.eu", {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36"
            }
        });

        if (!response.ok) {
            throw new Error(`数据源请求失败: ${response.status}`);
        }

        const html = await response.text();
        const items = extractAiliaoItems(html);

        return new Response(JSON.stringify({
            source: "https://id.ailiao.eu",
            fetchedAt: new Date().toISOString(),
            items
        }), {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                ...makeCORSHeaders()
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message || "抓取失败",
            source: "https://id.ailiao.eu",
            fetchedAt: new Date().toISOString(),
            items: []
        }), {
            status: 502,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                ...makeCORSHeaders()
            }
        });
    }
}

function extractAiliaoItems(html) {
    const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const items = [];
    const seenUrls = new Set();
    let match;

    while ((match = anchorPattern.exec(html)) && items.length < 18) {
        const href = normalizeAiliaoUrl(match[1]);
        if (!href || seenUrls.has(href)) {
            continue;
        }

        const rawText = match[2]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (!rawText || rawText.length < 2) {
            continue;
        }

        seenUrls.add(href);
        items.push({
            title: rawText.slice(0, 48),
            description: `来自 id.ailiao.eu 的抓取结果，原始文本长度 ${rawText.length}。`,
            url: href
        });
    }

    return items;
}

function normalizeAiliaoUrl(href) {
    if (!href || href.startsWith("javascript:") || href.startsWith("#")) {
        return null;
    }

    try {
        return new URL(href, "https://id.ailiao.eu").toString();
    } catch {
        return null;
    }
}

// 添加延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 优化文本分块函数
function optimizedTextSplit(text, maxChunkSize = 1500) {
    const chunks = [];
    const sentences = text.split(/[。！？\n]/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;
        
        // 如果单个句子就超过最大长度，按字符分割
        if (trimmedSentence.length > maxChunkSize) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            // 按字符分割长句子
            for (let i = 0; i < trimmedSentence.length; i += maxChunkSize) {
                chunks.push(trimmedSentence.slice(i, i + maxChunkSize));
            }
        } else if ((currentChunk + trimmedSentence).length > maxChunkSize) {
            // 当前块加上新句子会超过限制，先保存当前块
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = trimmedSentence;
        } else {
            // 添加到当前块
            currentChunk += (currentChunk ? '。' : '') + trimmedSentence;
        }
    }
    
    // 添加最后一个块
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
}

// 批量处理音频块
async function processBatchedAudioChunks(chunks, voiceName, rate, pitch, volume, style, outputFormat, batchSize = 3, delayMs = 1000) {
    const audioChunks = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchPromises = batch.map(async (chunk, index) => {
            try {
                // 为每个请求添加小延迟，避免同时发送
                if (index > 0) {
                    await delay(index * 200);
                }
                return await getAudioChunk(chunk, voiceName, rate, pitch, volume, style, outputFormat);
            } catch (error) {
                console.error(`处理音频块失败 (批次 ${Math.floor(i/batchSize) + 1}, 块 ${index + 1}):`, error);
                throw error;
            }
        });
        
        try {
            const batchResults = await Promise.all(batchPromises);
            audioChunks.push(...batchResults);
            
            // 批次间延迟
            if (i + batchSize < chunks.length) {
                await delay(delayMs);
            }
        } catch (error) {
            console.error(`批次处理失败:`, error);
            throw error;
        }
    }
    
    return audioChunks;
}

async function getVoice(text, voiceName = "zh-CN-XiaoxiaoNeural", rate = '+0%', pitch = '+0Hz', volume = '+0%', style = "general", outputFormat = "audio-24khz-48kbitrate-mono-mp3") {
    try {
        // 文本预处理
        const cleanText = text.trim();
        if (!cleanText) {
            throw new Error("文本内容为空");
        }
        
        // 如果文本很短，直接处理
        if (cleanText.length <= 1500) {
            const audioBlob = await getAudioChunk(cleanText, voiceName, rate, pitch, volume, style, outputFormat);
            return new Response(audioBlob, {
                headers: {
                    "Content-Type": "audio/mpeg",
                    ...makeCORSHeaders()
                }
            });
        }

        // 优化的文本分块
        const chunks = optimizedTextSplit(cleanText, 1500);
        
        // 检查分块数量，防止超过CloudFlare限制
        if (chunks.length > 40) {
            throw new Error(`文本过长，分块数量(${chunks.length})超过限制。请缩短文本或分批处理。`);
        }
        
        console.log(`文本已分为 ${chunks.length} 个块进行处理`);

        // 批量处理音频块，控制并发数量和频率
        const audioChunks = await processBatchedAudioChunks(
            chunks, 
            voiceName, 
            rate, 
            pitch, 
            volume, 
            style, 
            outputFormat,
            3,  // 每批处理3个
            800 // 批次间延迟800ms
        );

        // 将音频片段拼接起来
        const concatenatedAudio = new Blob(audioChunks, { type: 'audio/mpeg' });
        return new Response(concatenatedAudio, {
            headers: {
                "Content-Type": "audio/mpeg",
                ...makeCORSHeaders()
            }
        });

    } catch (error) {
        console.error("语音合成失败:", error);
        return new Response(JSON.stringify({
            error: {
                message: error.message || String(error),
                type: "api_error",
                param: `${voiceName}, ${rate}, ${pitch}, ${volume}, ${style}, ${outputFormat}`,
                code: "edge_tts_error"
            }
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                ...makeCORSHeaders()
            }
        });
    }
}



//获取单个音频数据（增强错误处理和重试机制）
async function getAudioChunk(text, voiceName, rate, pitch, volume, style, outputFormat = 'audio-24khz-48kbitrate-mono-mp3', maxRetries = 3) {
    const retryDelay = 500; // 重试延迟500ms
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const endpoint = await getEndpoint();
            const url = `https://${endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1`;
            
            // 处理文本中的延迟标记
            let m = text.match(/\[(\d+)\]\s*?$/);
            let slien = 0;
            if (m && m.length == 2) {
                slien = parseInt(m[1]);
                text = text.replace(m[0], '');
            }
            
            // 验证文本长度
            if (!text.trim()) {
                throw new Error("文本块为空");
            }
            
            if (text.length > 2000) {
                throw new Error(`文本块过长: ${text.length} 字符，最大支持2000字符`);
            }
            
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": endpoint.t,
                    "Content-Type": "application/ssml+xml",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
                    "X-Microsoft-OutputFormat": outputFormat
                },
                body: getSsml(text, voiceName, rate, pitch, volume, style, slien)
            });

            if (!response.ok) {
                const errorText = await response.text();
                
                // 根据错误类型决定是否重试
                if (response.status === 429) {
                    // 频率限制，需要重试
                    if (attempt < maxRetries) {
                        console.log(`频率限制，第${attempt + 1}次重试，等待${retryDelay * (attempt + 1)}ms`);
                        await delay(retryDelay * (attempt + 1));
                        continue;
                    }
                    throw new Error(`请求频率过高，已重试${maxRetries}次仍失败`);
                } else if (response.status >= 500) {
                    // 服务器错误，可以重试
                    if (attempt < maxRetries) {
                        console.log(`服务器错误，第${attempt + 1}次重试，等待${retryDelay * (attempt + 1)}ms`);
                        await delay(retryDelay * (attempt + 1));
                        continue;
                    }
                    throw new Error(`Edge TTS服务器错误: ${response.status} ${errorText}`);
                } else {
                    // 客户端错误，不重试
                    throw new Error(`Edge TTS API错误: ${response.status} ${errorText}`);
                }
            }

            return await response.blob();
            
        } catch (error) {
            if (attempt === maxRetries) {
                // 最后一次重试失败
                throw new Error(`音频生成失败（已重试${maxRetries}次）: ${error.message}`);
            }
            
            // 如果是网络错误或其他可重试错误
            if (error.message.includes('fetch') || error.message.includes('network')) {
                console.log(`网络错误，第${attempt + 1}次重试，等待${retryDelay * (attempt + 1)}ms`);
                await delay(retryDelay * (attempt + 1));
                continue;
            }
            
            // 其他错误直接抛出
            throw error;
        }
    }
}

// XML文本转义函数
function escapeXmlText(text) {
    return text
        .replace(/&/g, '&amp;')   // 必须首先处理 &
        .replace(/</g, '&lt;')    // 处理 <
        .replace(/>/g, '&gt;')    // 处理 >
        .replace(/"/g, '&quot;')  // 处理 "
        .replace(/'/g, '&apos;'); // 处理 '
}

function getSsml(text, voiceName, rate, pitch, volume, style, slien = 0) {
    // 对文本进行XML转义
    const escapedText = escapeXmlText(text);
    
    let slien_str = '';
    if (slien > 0) {
        slien_str = `<break time="${slien}ms" />`
    }
    return `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" version="1.0" xml:lang="zh-CN"> 
                <voice name="${voiceName}"> 
                    <mstts:express-as style="${style}"  styledegree="2.0" role="default" > 
                        <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">${escapedText}</prosody> 
                    </mstts:express-as> 
                    ${slien_str}
                </voice> 
            </speak>`;

}

async function getEndpoint() {
    const now = Date.now() / 1000;

    if (tokenInfo.token && tokenInfo.expiredAt && now < tokenInfo.expiredAt - TOKEN_REFRESH_BEFORE_EXPIRY) {
        return tokenInfo.endpoint;
    }

    // 获取新token
    const endpointUrl = "https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0";
    const clientId = crypto.randomUUID().replace(/-/g, "");

    try {
        const response = await fetch(endpointUrl, {
            method: "POST",
            headers: {
                "Accept-Language": "zh-Hans",
                "X-ClientVersion": "4.0.530a 5fe1dc6c",
                "X-UserId": "0f04d16a175c411e",
                "X-HomeGeographicRegion": "zh-Hans-CN",
                "X-ClientTraceId": clientId,
                "X-MT-Signature": await sign(endpointUrl),
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": "0",
                "Accept-Encoding": "gzip"
            }
        });

        if (!response.ok) {
            throw new Error(`获取endpoint失败: ${response.status}`);
        }

        const data = await response.json();
        const jwt = data.t.split(".")[1];
        const decodedJwt = JSON.parse(atob(jwt));

        tokenInfo = {
            endpoint: data,
            token: data.t,
            expiredAt: decodedJwt.exp
        };

        return data;

    } catch (error) {
        console.error("获取endpoint失败:", error);
        // 如果有缓存的token，即使过期也尝试使用
        if (tokenInfo.token) {
            console.log("使用过期的缓存token");
            return tokenInfo.endpoint;
        }
        throw error;
    }
}



function makeCORSHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
        "Access-Control-Max-Age": "86400"
    };
}

async function hmacSha256(key, data) {
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: { name: "SHA-256" } },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
    return new Uint8Array(signature);
}

async function base64ToBytes(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function bytesToBase64(bytes) {
    return btoa(String.fromCharCode.apply(null, bytes));
}

function uuid() {
    return crypto.randomUUID().replace(/-/g, "");
}

async function sign(urlStr) {
    const url = urlStr.split("://")[1];
    const encodedUrl = encodeURIComponent(url);
    const uuidStr = uuid();
    const formattedDate = dateFormat();
    const bytesToSign = `MSTranslatorAndroidApp${encodedUrl}${formattedDate}${uuidStr}`.toLowerCase();
    const decode = await base64ToBytes("oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==");
    const signData = await hmacSha256(decode, bytesToSign);
    const signBase64 = await bytesToBase64(signData);
    return `MSTranslatorAndroidApp::${signBase64}::${formattedDate}::${uuidStr}`;
}

function dateFormat() {
    const formattedDate = (new Date()).toUTCString().replace(/GMT/, "").trim() + " GMT";
    return formattedDate.toLowerCase();
}

// 处理文件上传的函数
async function handleFileUpload(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const voice = formData.get('voice') || 'zh-CN-XiaoxiaoNeural';
        const speed = formData.get('speed') || '1.0';
        const volume = formData.get('volume') || '0';
        const pitch = formData.get('pitch') || '0';
        const style = formData.get('style') || 'general';

        // 验证文件
        if (!file) {
            return new Response(JSON.stringify({
                error: {
                    message: "未找到上传的文件",
                    type: "invalid_request_error",
                    param: "file",
                    code: "missing_file"
                }
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        // 验证文件类型
        if (!file.type.includes('text/') && !file.name.toLowerCase().endsWith('.txt')) {
            return new Response(JSON.stringify({
                error: {
                    message: "不支持的文件类型，请上传txt文件",
                    type: "invalid_request_error",
                    param: "file",
                    code: "invalid_file_type"
                }
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        // 验证文件大小（限制为500KB）
        if (file.size > 500 * 1024) {
            return new Response(JSON.stringify({
                error: {
                    message: "文件大小超过限制（最大500KB）",
                    type: "invalid_request_error",
                    param: "file",
                    code: "file_too_large"
                }
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        // 读取文件内容
        const text = await file.text();
        
        // 验证文本内容
        if (!text.trim()) {
            return new Response(JSON.stringify({
                error: {
                    message: "文件内容为空",
                    type: "invalid_request_error",
                    param: "file",
                    code: "empty_file"
                }
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        // 文本长度限制（10000字符）
        if (text.length > 10000) {
            return new Response(JSON.stringify({
                error: {
                    message: "文本内容过长（最大10000字符）",
                    type: "invalid_request_error",
                    param: "file",
                    code: "text_too_long"
                }
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        // 处理参数格式，与原有逻辑保持一致
        let rate = parseInt(String((parseFloat(speed) - 1.0) * 100));
        let numVolume = parseInt(String(parseFloat(volume) * 100));
        let numPitch = parseInt(pitch);

        // 调用TTS服务
        return await getVoice(
            text,
            voice,
            rate >= 0 ? `+${rate}%` : `${rate}%`,
            numPitch >= 0 ? `+${numPitch}Hz` : `${numPitch}Hz`,
            numVolume >= 0 ? `+${numVolume}%` : `${numVolume}%`,
            style,
            "audio-24khz-48kbitrate-mono-mp3"
        );

    } catch (error) {
        console.error("文件上传处理失败:", error);
        return new Response(JSON.stringify({
            error: {
                message: "文件处理失败",
                type: "api_error",
                param: null,
                code: "file_processing_error"
            }
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                ...makeCORSHeaders()
            }
        });
    }
}

// 处理语音转录的函数
async function handleAudioTranscription(request) {
    try {
        // 验证请求方法
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({
                error: {
                    message: "只支持POST方法",
                    type: "invalid_request_error",
                    param: "method",
                    code: "method_not_allowed"
                }
            }), {
                status: 405,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        const contentType = request.headers.get("content-type") || "";
        
        // 验证Content-Type
        if (!contentType.includes("multipart/form-data")) {
            return new Response(JSON.stringify({
                error: {
                    message: "请求必须使用multipart/form-data格式",
                    type: "invalid_request_error",
                    param: "content-type",
                    code: "invalid_content_type"
                }
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        // 解析FormData
        const formData = await request.formData();
        const audioFile = formData.get('file');
        const customToken = formData.get('token');

        // 验证音频文件
        if (!audioFile) {
            return new Response(JSON.stringify({
                error: {
                    message: "未找到音频文件",
                    type: "invalid_request_error",
                    param: "file",
                    code: "missing_file"
                }
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        // 验证文件大小（限制为10MB）
        if (audioFile.size > 10 * 1024 * 1024) {
            return new Response(JSON.stringify({
                error: {
                    message: "音频文件大小不能超过10MB",
                    type: "invalid_request_error",
                    param: "file",
                    code: "file_too_large"
                }
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        // 验证音频文件格式
        const allowedTypes = [
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/flac', 'audio/aac',
            'audio/ogg', 'audio/webm', 'audio/amr', 'audio/3gpp'
        ];
        
        const isValidType = allowedTypes.some(type => 
            audioFile.type.includes(type) || 
            audioFile.name.toLowerCase().match(/\.(mp3|wav|m4a|flac|aac|ogg|webm|amr|3gp)$/i)
        );

        if (!isValidType) {
            return new Response(JSON.stringify({
                error: {
                    message: "不支持的音频文件格式，请上传mp3、wav、m4a、flac、aac、ogg、webm、amr或3gp格式的文件",
                    type: "invalid_request_error",
                    param: "file",
                    code: "invalid_file_type"
                }
            }), {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        // 使用默认token或用户提供的token
        const token = customToken || 'sk-wtldsvuprmwltxpbspbmawtolbacghzawnjhtlzlnujjkfhh';

        // 构建发送到硅基流动API的FormData
        const apiFormData = new FormData();
        apiFormData.append('file', audioFile);
        apiFormData.append('model', 'FunAudioLLM/SenseVoiceSmall');

        // 发送请求到硅基流动API
        const apiResponse = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: apiFormData
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('硅基流动API错误:', apiResponse.status, errorText);
            
            let errorMessage = '语音转录服务暂时不可用';
            
            if (apiResponse.status === 401) {
                errorMessage = 'API Token无效，请检查您的配置';
            } else if (apiResponse.status === 429) {
                errorMessage = '请求过于频繁，请稍后再试';
            } else if (apiResponse.status === 413) {
                errorMessage = '音频文件太大，请选择较小的文件';
            }

            return new Response(JSON.stringify({
                error: {
                    message: errorMessage,
                    type: "api_error",
                    param: null,
                    code: "transcription_api_error"
                }
            }), {
                status: apiResponse.status,
                headers: {
                    "Content-Type": "application/json",
                    ...makeCORSHeaders()
                }
            });
        }

        // 获取转录结果
        const transcriptionResult = await apiResponse.json();

        // 返回转录结果
        return new Response(JSON.stringify(transcriptionResult), {
            headers: {
                "Content-Type": "application/json",
                ...makeCORSHeaders()
            }
        });

    } catch (error) {
        console.error("语音转录处理失败:", error);
        return new Response(JSON.stringify({
            error: {
                message: "语音转录处理失败",
                type: "api_error",
                param: null,
                code: "transcription_processing_error"
            }
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                ...makeCORSHeaders()
            }
        });
    }
}
