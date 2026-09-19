import type { ContactRequestDto } from './contact.dto';

const NOT_PROVIDED = 'Not provided';

export type ContactEmail = {
  subject: string;
  htmlContent: string;
  textContent: string;
};

type EmailField = readonly [label: string, value: string];

export type ContactEmailVariant = 'contact' | 'journey';

export function renderContactEmail(
  request: ContactRequestDto,
  variant: ContactEmailVariant = 'contact',
): ContactEmail {
  const fields = contactFields(request, variant);
  const rows = fields.map(renderFieldRow).join('');

  return {
    subject: 'New travel enquiry',
    htmlContent: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>New travel enquiry</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f7f5;color:#1d2925;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      A new enquiry was submitted through the travel website.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f4f7f5;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #dce5e1;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;background-color:#145c45;color:#ffffff;">
                <p style="margin:0 0 8px;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#cbe8dd;">Website contact form</p>
                <h1 style="margin:0;font-size:26px;line-height:34px;font-weight:700;color:#ffffff;">New travel enquiry</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 12px;">
                <p style="margin:0;font-size:15px;line-height:24px;color:#52615c;">A visitor submitted the following details.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
                  ${rows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;background-color:#f8faf9;border-top:1px solid #e6ece9;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#73817c;">This notification was generated automatically from the website contact form.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    textContent: [
      'NEW TRAVEL ENQUIRY',
      '',
      'A visitor submitted the following details.',
      '',
      ...fields.map(([label, value]) => `${label}: ${value}`),
      '',
      'This notification was generated automatically from the website contact form.',
    ].join('\n'),
  };
}

function contactFields(request: ContactRequestDto, variant: ContactEmailVariant): EmailField[] {
  return [
    ['Name', present(request.name)],
    [variant === 'journey' ? 'Phone number' : 'Mobile', present(request.mobile)],
    ['Email', present(request.email)],
    [
      variant === 'journey' ? 'Number of ticket' : 'Tourist arrivals',
      present(
        request.touristArrivals === undefined
          ? undefined
          : String(request.touristArrivals),
      ),
    ],
    ['Message', present(request.message)],
  ];
}

function present(value: string | undefined) {
  return value ?? NOT_PROVIDED;
}

function renderFieldRow([label, value]: EmailField) {
  return `<tr>
                    <th scope="row" align="left" valign="top" style="width:150px;padding:14px 16px;border-bottom:1px solid #e6ece9;background-color:#f8faf9;font-size:13px;line-height:20px;font-weight:700;color:#52615c;">${escapeHtml(label)}</th>
                    <td valign="top" style="padding:14px 16px;border-bottom:1px solid #e6ece9;font-size:14px;line-height:22px;color:#1d2925;overflow-wrap:anywhere;">${formatHtmlValue(value)}</td>
                  </tr>`;
}

function formatHtmlValue(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });
}
