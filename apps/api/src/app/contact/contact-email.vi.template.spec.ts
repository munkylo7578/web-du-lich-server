import { renderVietnameseContactEmail } from './contact-email.vi.template';

describe('renderVietnameseContactEmail', () => {
  it('renders a complete Vietnamese email and plain-text alternative', () => {
    const email = renderVietnameseContactEmail({
      name: 'Nguyễn Văn An',
      mobile: '+84 912 345 678',
      email: 'visitor@example.com',
      touristArrivals: 4,
      message: 'Vui lòng gửi lịch trình và báo giá.',
    });

    expect(email.subject).toBe('Yêu cầu tư vấn du lịch mới');
    expect(email.htmlContent).toContain('<!doctype html>');
    expect(email.htmlContent).toContain('<html lang="vi">');
    expect(email.htmlContent).toContain('role="presentation"');
    expect(email.htmlContent).toContain(`<title>${email.subject}</title>`);
    expect(email.htmlContent).toContain('Biểu mẫu liên hệ trên website');
    expect(email.htmlContent).toContain('Một yêu cầu tư vấn mới đã được gửi qua website du lịch.');
    for (const field of [
      'Họ và tên: Nguyễn Văn An',
      'Số điện thoại: +84 912 345 678',
      'Email: visitor@example.com',
      'Số lượng khách: 4',
      'Nội dung: Vui lòng gửi lịch trình và báo giá.',
    ]) {
      expect(email.textContent).toContain(field);
      const [label, value] = field.split(': ');
      expect(email.htmlContent).toContain(label);
      expect(email.htmlContent).toContain(value);
    }
    for (const text of [
      'Khách truy cập đã gửi các thông tin sau.',
      'Thông báo này được tạo tự động từ biểu mẫu liên hệ trên website.',
    ]) {
      expect(email.htmlContent).toContain(text);
      expect(email.textContent).toContain(text);
    }
  });

  it.each(['\n', '\r\n'])('escapes HTML and preserves %j line breaks', (newline) => {
    const email = renderVietnameseContactEmail({
      name: "<Khách & 'bạn'>",
      message: `Dòng đầu${newline}<script>alert("x")</script>`,
    });

    expect(email.htmlContent).toContain('&lt;Khách &amp; &#39;bạn&#39;&gt;');
    expect(email.htmlContent).toContain(
      'Dòng đầu<br>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
    expect(email.htmlContent).not.toContain('<script>');
    expect(email.textContent).toContain(`Nội dung: Dòng đầu${newline}<script>alert("x")</script>`);
  });

  it('uses Vietnamese fallback text for all omitted fields', () => {
    const email = renderVietnameseContactEmail({});

    expect(email.htmlContent.match(/Chưa cung cấp/g)).toHaveLength(5);
    for (const label of ['Họ và tên', 'Số điện thoại', 'Email', 'Số lượng khách', 'Nội dung']) {
      expect(email.textContent).toContain(`${label}: Chưa cung cấp`);
    }
    expect(email.htmlContent).not.toContain('Not provided');
    expect(email.textContent).not.toContain('Not provided');
  });

  it('preserves zero tourist arrivals instead of treating it as missing', () => {
    const email = renderVietnameseContactEmail({ touristArrivals: 0 });

    expect(email.textContent).toContain('Số lượng khách: 0');
    expect(email.htmlContent).toContain('>0</td>');
    expect(email.htmlContent.match(/Chưa cung cấp/g)).toHaveLength(4);
  });
});
