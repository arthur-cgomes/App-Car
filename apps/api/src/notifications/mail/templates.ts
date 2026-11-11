export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

const NAVY = '#001e50';
const NAVY_LIGHT = '#5d8fde';
const TINT_BG = '#edf4ff';
const INK = '#1d1f20';
const MUTED = '#5d5d60';
const PAGE = '#f2f2f3';
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

interface Layout {
  preheader: string;
  title: string;
  greeting?: string;
  intro: string;
  highlight: string;
  footnote: string;
  webUrl: string;
}

function layout({ preheader, title, greeting, intro, highlight, footnote, webUrl }: Layout) {
  const host = escapeHtml(new URL(webUrl).host);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
<tr><td style="background:${NAVY};border-radius:20px 20px 0 0;padding:28px 32px;" align="left">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#ffffff;border-radius:6px;overflow:hidden;" valign="top">
<div style="height:5px;background:${NAVY_LIGHT};line-height:5px;font-size:0;">&nbsp;</div>
<div style="padding:2px 10px 4px;font-family:'Arial Narrow','Barlow Condensed',Arial,sans-serif;font-weight:700;font-size:16px;letter-spacing:2px;color:${NAVY};">CAR</div>
</td>
<td style="padding-left:12px;font-family:${FONT};font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;" valign="middle">VW Polo</td>
</tr></table>
</td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 20px 20px;padding:32px;font-family:${FONT};color:${INK};">
<h1 style="margin:0 0 12px;font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.3px;color:${INK};">${escapeHtml(title)}</h1>
${greeting ? `<p style="margin:0 0 8px;font-size:16px;line-height:24px;color:${INK};">${greeting}</p>` : ''}
<p style="margin:0 0 24px;font-size:16px;line-height:24px;color:${INK};">${intro}</p>
${highlight}
<p style="margin:24px 0 0;font-size:14px;line-height:21px;color:${MUTED};">${footnote}</p>
</td></tr>
<tr><td style="padding:20px 32px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};" align="center">
VW Polo · o resumo do seu carro na palma da mão<br>
<a href="${escapeHtml(webUrl)}" style="color:${MUTED};text-decoration:underline;">${host}</a> · Este e-mail é automático, não responda.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

interface CodeEmail {
  subject: string;
  title: string;
  intro: string;
  code: string;
  footnote: string;
  webUrl: string;
}

export function codeEmail({ subject, title, intro, code, footnote, webUrl }: CodeEmail): MailContent {
  const highlight = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" style="background:${TINT_BG};border-radius:14px;padding:20px 12px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:10px;color:${NAVY};">${escapeHtml(code)}</td>
</tr></table>`;
  return {
    subject,
    text: `${title}\n\n${intro}\n\n${code}\n\n${footnote}\n\nVW Polo · ${webUrl}`,
    html: layout({ preheader: `${code} · ${title}`, title, intro: escapeHtml(intro), highlight, footnote: escapeHtml(footnote), webUrl }),
  };
}

interface LinkEmail {
  subject: string;
  title: string;
  name: string;
  intro: string;
  buttonLabel: string;
  url: string;
  footnote: string;
  webUrl: string;
}

export function linkEmail({ subject, title, name, intro, buttonLabel, url, footnote, webUrl }: LinkEmail): MailContent {
  const highlight = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:${NAVY};border-radius:12px;">
<a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(buttonLabel)}</a>
</td></tr></table>
<p style="margin:16px 0 0;font-size:13px;line-height:19px;color:${MUTED};word-break:break-all;">Se o botão não funcionar, copie este endereço no navegador:<br><a href="${escapeHtml(url)}" style="color:${NAVY};">${escapeHtml(url)}</a></p>`;
  return {
    subject,
    text: `Olá, ${name}.\n\n${intro}\n\n${url}\n\n${footnote}\n\nVW Polo · ${webUrl}`,
    html: layout({
      preheader: intro,
      title,
      greeting: `Olá, ${escapeHtml(name)}.`,
      intro: escapeHtml(intro),
      highlight,
      footnote: escapeHtml(footnote),
      webUrl,
    }),
  };
}
