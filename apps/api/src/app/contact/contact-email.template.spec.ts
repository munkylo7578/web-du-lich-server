import { renderContactEmail } from './contact-email.template';

describe('renderContactEmail', () => {
  it('renders a complete email document and plain-text alternative', () => {
    const email = renderContactEmail({
      name: 'Nguyễn Văn An',
      mobile: '+84 912 345 678',
      email: 'visitor@example.com',
      touristArrivals: 4,
      message: 'Please send me the itinerary.',
    });

    expect(email.subject).toBe('New travel enquiry');
    expect(email.htmlContent).toContain('<!doctype html>');
    expect(email.htmlContent).toContain('<html lang="en">');
    expect(email.htmlContent).toContain('role="presentation"');
    expect(email.htmlContent).toContain('Nguyễn Văn An');
    expect(email.htmlContent).toContain('visitor@example.com');
    expect(email.textContent).toContain('Name: Nguyễn Văn An');
    expect(email.textContent).toContain('Tourist arrivals: 4');
  });

  it('escapes untrusted HTML while preserving multiline messages', () => {
    const email = renderContactEmail({
      name: '<Visitor & Friend>',
      message: 'First line\n<script>alert("x")</script>',
    });

    expect(email.htmlContent).toContain('&lt;Visitor &amp; Friend&gt;');
    expect(email.htmlContent).toContain(
      'First line<br>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
    expect(email.htmlContent).not.toContain('<script>');
    expect(email.textContent).toContain(
      'Message: First line\n<script>alert("x")</script>',
    );
  });

  it('uses a consistent fallback for omitted fields', () => {
    const email = renderContactEmail({});

    expect(email.htmlContent.match(/Not provided/g)).toHaveLength(5);
    expect(email.textContent).toContain('Name: Not provided');
    expect(email.textContent).toContain('Mobile: Not provided');
    expect(email.textContent).toContain('Email: Not provided');
    expect(email.textContent).toContain('Tourist arrivals: Not provided');
    expect(email.textContent).toContain('Message: Not provided');
  });
});
