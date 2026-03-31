// ==UserScript==
// @name         stronghold-avatar
// @author       M.H.
// @version      0.3.0
// @description  从聊天图片或QQ头像生成卫戍行动风格头像
// @timestamp    1774953000
// @license      MIT
// ==/UserScript==

if (!seal.ext.find('stronghold-avatar')) {
  const ext = seal.ext.new('stronghold-avatar', 'M.H.', '0.3.0');
  seal.ext.register(ext);

  const API_BASE = 'http://127.0.0.1:8787';

  function extractImageInfo(message) {
    const results = [];
    const regex = /\[CQ:image,([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(message)) !== null) {
      const rawParams = match[1];
      const params = {};

      rawParams.split(',').forEach(part => {
        const idx = part.indexOf('=');
        if (idx > 0) {
          const key = part.slice(0, idx).trim();
          const val = part.slice(idx + 1).trim();
          params[key] = val;
        }
      });

      results.push({
        file: params.file || '',
        url: params.url || '',
        path: params.path || ''
      });
    }

    return results;
  }

  function getBestImageUrl(info) {
    if (!info) return '';
    if (info.url && /^https?:\/\//i.test(info.url)) return info.url;
    if (info.path && /^https?:\/\//i.test(info.path)) return info.path;
    if (info.file && /^https?:\/\//i.test(info.file)) return info.file;
    return '';
  }

  function extractQqNumber(ctx, msg) {
    const candidates = [
      ctx?.player?.userId,
      ctx?.player?.id,
      msg?.sender?.user_id,
      msg?.sender?.userId,
      msg?.userId,
    ];

    for (const value of candidates) {
      if (!value) continue;
      const match = String(value).match(/(\d{5,})/);
      if (match) {
        return match[1];
      }
    }

    return '';
  }

  function getQqAvatarUrl(ctx, msg) {
    const qq = extractQqNumber(ctx, msg);
    if (!qq) return '';
    return `https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=640`;
  }

  async function callAvatarApi(imageUrl) {
    const resp = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl })
    });

    const payload = await resp.json().catch(() => null);

    if (!resp.ok) {
      const detail = payload?.error ? `: ${payload.error}` : '';
      throw new Error(`HTTP ${resp.status}${detail}`);
    }

    return payload;
  }

  const cmd = seal.ext.newCmdItemInfo();
  cmd.name = '卫戍头像';
  cmd.help = `.卫戍头像
把命令和图片放在同一条消息里发送。
如果不带图，会尝试直接使用发送者的QQ头像。`;

  cmd.solve = async (ctx, msg, cmdArgs) => {
    try {
      const raw = msg.message || '';
      const images = extractImageInfo(raw);
      let imageUrl = images.length ? getBestImageUrl(images[0]) : '';

      if (!imageUrl) {
        imageUrl = getQqAvatarUrl(ctx, msg);
      }

      if (!imageUrl) {
        seal.replyToSender(ctx, msg, '喵，没有检测到可用图片，也获取不到你的QQ头像URL耶？');
        return seal.ext.newCmdExecuteResult(true);
      }

      seal.replyToSender(
        ctx,
        msg,
        images.length
          ? '收到图片喵，正在全力生成卫戍行动头像……'
          : '没有附图喵，正在使用你的QQ头像生成卫戍行动头像……'
      );

      const result = await callAvatarApi(imageUrl);
      if (!result?.ok || !result?.sealCode) {
        seal.replyToSender(ctx, msg, `生成失败：${result?.error || '未知错误'}`);
        return seal.ext.newCmdExecuteResult(true);
      }

      seal.replyToSender(ctx, msg, result.sealCode);
      return seal.ext.newCmdExecuteResult(true);
    } catch (e) {
      seal.replyToSender(ctx, msg, `生成失败：${e.message || e}`);
      return seal.ext.newCmdExecuteResult(true);
    }
  };

  ext.cmdMap['卫戍头像'] = cmd;
}
