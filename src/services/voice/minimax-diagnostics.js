// Human-readable, non-secret diagnostics for the iPhone MiniMax preview.
// Provider responses are untrusted, may contain sensitive strings, and
// must NEVER display API keys in a chat bubble, debug page, or console.
const clean=value=>String(value||'').replace(/Bearer\s+[^\s"'<>]+/gi,'Bearer [hidden]').replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gi,'[hidden key]').replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[hidden key]').slice(0,360).trim();
export function explainMinimaxFailure(error,{region='cn'}={}){
 const detail=typeof error==='string'?error:error?.message||error?.name||error?.type||'未收到错误详情';
 const raw=clean(detail);
 const original=raw.toLowerCase();
 const site=region==='intl'?'国际站（minimax.io）':'中国站（minimaxi.com）';
 if(/未配置|未填写|api key.*required|missing.*key|没有.*key/.test(original))
  return '没有可用的 MiniMax API Key。请到 NoApp → AI 设置填写 MiniMax Key，选择账号所属平台并点击保存。';
 if(/timeout|timed.?out|超时/.test(original))
  return 'MiniMax 合成请求超时；本次已停止等待，可点击重新合成。'+raw;
 if(/cross.origin|跨域|cors|failed to fetch|networkerror|网络.*拦截|供应商请求被网络/.test(original))
  return '当前 iPhone 浏览器无法直连 MiniMax（可能是跨域 CORS 或网络限制），不是熙泰不会说话。GitHub Pages 是静态站点；要稳定配音，需要接入服务端代理。';
 if(/\b401\b|\b403\b|\b1004\b|unauthori[sz]ed|permission denied|invalid.*(token|key)|api.?key.*invalid|authentication|鉴权|token.*(invalid|expired)|鉴别/.test(original))
  return 'MiniMax 鉴权失败：请确认 Key 是否有效，并且在 '+site+' 创建；中国站与国际站 Key 不互通。'+(raw?'（'+raw+'）':'');
 if(/voice.{0,35}(invalid|not.?found|not.?exist|unauthori[sz]ed|permission)|(?:音色|声音|voice_id).{0,30}(无效|不存在|无权限|找不到|未授权)/i.test(original))
  return 'MiniMax 无法使用陈熙泰的固定音色：请确认该音色 ID 属于当前 Key 的账号，且未失效。不能擅自替换成陌生音色。'+(raw?'（'+raw+'）':'');
 if(/indexeddb|浏览器未开放语音存储|语音过大|4mb|quotaexceeded|notallowederror|aborterror|本机空间不足/.test(original))
  return 'MiniMax 可能已生成音频，但 Safari 无法保存到本机语音库：'+raw+'。请检查 Safari 非无痕模式及可用存储空间。';
 if(/\b1008\b|insufficient|balance|quota|billing|payment|credits|余额|额度|欠费|扣费/.test(original))
  return 'MiniMax 账户额度或计费权限不足，请检查 '+site+' 的余额、套餐与 API 配额。'+(raw?'（'+raw+'）':'');
 if(/\b429\b|rate.?limit|too many request|频率|过于频繁/.test(original))
  return 'MiniMax 请求过于频繁（429）。不要连续点重试，请稍后再发一条。';
 if(/\b5\d\d\b|server error|internal server|timeout|超时/.test(original))
  return 'MiniMax 服务暂时异常或超时：'+(raw||'请稍后重试');
 if(/mini.?max|供应商 http|无效的 mp3|未返回音频|音频接口/.test(original))
  return 'MiniMax 合成接口返回异常：'+raw+'。请检查账号平台、音色权限和模型。';
 return '语音失败的具体错误：'+raw;
}
export function minimaxUnavailableOnGithubPages(hostname){
 return typeof hostname==='string'&&hostname.toLowerCase().endsWith('.github.io');
}
