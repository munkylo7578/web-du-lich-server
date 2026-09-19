import { renderContactEmail } from './contact-email.template';
import { renderVietnameseContactEmail } from './contact-email.vi.template';

describe.each([
  ['en', renderContactEmail, 'Phone number', 'Number of ticket', 'Not provided', 'Tourist arrivals'],
  ['vi', renderVietnameseContactEmail, 'Số điện thoại', 'Số lượng vé', 'Chưa cung cấp', 'Số lượng khách'],
] as const)('Journey email (%s)', (locale, render, phoneLabel, ticketLabel, fallback, legacyLabel) => {
  it('renders the form labels in HTML and plain text, safely escaping values', () => {
    const email = render({
      name: '<Visitor & Friend>', email: 'visitor@example.com', mobile: '+84912345678',
      touristArrivals: 4, message: 'First line\n<script>alert("x")</script>',
    }, 'journey');
    expect(email.htmlContent).toContain(`<html lang="${locale}">`);
    expect(email.htmlContent).toContain(phoneLabel);
    expect(email.htmlContent).toContain(ticketLabel);
    expect(email.htmlContent).toContain('&lt;Visitor &amp; Friend&gt;');
    expect(email.htmlContent).toContain('First line<br>&lt;script&gt;');
    expect(email.htmlContent).not.toContain('<script>');
    expect(email.textContent).toContain(`${phoneLabel}: +84912345678`);
    expect(email.textContent).toContain(`${ticketLabel}: 4`);
    expect(email.textContent).toContain('Email: visitor@example.com');
    expect(email.textContent).not.toContain(legacyLabel);
  });

  it('uses five missing-value fallbacks for an empty submission', () => {
    const email = render({}, 'journey');
    expect(email.htmlContent.split(fallback)).toHaveLength(6);
    expect(email.textContent).toContain(`${ticketLabel}: ${fallback}`);
    expect(email.textContent).toContain(`${phoneLabel}: ${fallback}`);
  });

  it('preserves a supplied zero ticket count', () => {
    expect(render({ touristArrivals: 0 }, 'journey').textContent).toContain(`${ticketLabel}: 0`);
  });

  it('retains the original labels for the default contact variant', () => {
    const email = render({ touristArrivals: 4 });
    expect(email.textContent).toContain(`${legacyLabel}: 4`);
    expect(email.textContent).not.toContain(ticketLabel);
  });
});
