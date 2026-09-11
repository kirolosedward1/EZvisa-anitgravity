export interface EmailLayoutProps {
  title: string;
  previewText?: string;
  language?: "en" | "ar";
  content: string;
}

export function generateEmailLayout({ title, previewText, language = "en", content }: EmailLayoutProps): string {
  const isRtl = language === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const align = isRtl ? "right" : "left";
  const fontFamily = isRtl 
    ? "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
    : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `
<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body, p, h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0; }
    body { 
      font-family: ${fontFamily};
      background-color: #f3f4f6;
      color: #020617;
      -webkit-font-smoothing: antialiased;
      line-height: 1.5;
    }
    table { border-collapse: collapse; width: 100%; }
    img { max-width: 100%; height: auto; display: block; }
    a { color: #2563eb; text-decoration: none; }
    .wrapper { width: 100%; background-color: #f3f4f6; padding: 40px 0; }
    .container { 
      max-width: 600px; margin: 0 auto; background-color: #ffffff; 
      border-radius: 12px; overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header { background-color: #0f172a; padding: 32px 40px; text-align: center; }
    .header-logo { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .content-area { padding: 40px; }
    .title { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 24px; text-align: ${align}; }
    .text { font-size: 16px; color: #334155; margin-bottom: 24px; text-align: ${align}; }
    .button-container { text-align: ${align}; margin: 32px 0; }
    .button {
      display: inline-block; background-color: #2563eb; color: #ffffff !important;
      font-size: 16px; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none;
    }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
    .card-row { margin-bottom: 12px; }
    .card-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; display: block; margin-bottom: 4px; text-align: ${align}; }
    .card-value { font-size: 16px; color: #0f172a; font-weight: 500; text-align: ${align}; }
    .notice { padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid; }
    .notice.info { background-color: #eff6ff; border-color: #3b82f6; }
    .notice.success { background-color: #f0fdf4; border-color: #22c55e; }
    .notice.warning { background-color: #fffbeb; border-color: #f59e0b; }
    .notice-title { font-weight: 600; margin-bottom: 4px; color: inherit; }
    .footer { background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer-text { font-size: 13px; color: #64748b; margin-bottom: 8px; }
    @media only screen and (max-width: 600px) {
      .container { border-radius: 0; width: 100% !important; }
      .wrapper { padding: 0; }
      .content-area { padding: 24px; }
      .header, .footer { padding: 24px; }
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}</div>` : ''}
  <div class="wrapper">
    <table role="presentation" class="container">
      <tr>
        <td class="header">
          <div class="header-logo">EZvisa</div>
        </td>
      </tr>
      <tr>
        <td class="content-area">
          <h1 class="title">${title}</h1>
          ${content}
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p class="footer-text">© ${new Date().getFullYear()} EZvisa.net. All rights reserved.</p>
          <p class="footer-text">This is an automated transactional email. Please do not reply directly to this email.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}
