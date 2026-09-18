import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { API_ENV, type ApiEnvironment } from '../config/env';
import { DATABASE, type Database } from '../database/database.module';
import type { ContactRequestDto } from './contact.dto';

const BREVO_SEND_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOT_PROVIDED = 'Not provided';

type BrevoPayload = {
  sender: { email: string; name: string };
  to: Array<{ email: string }>;
  subject: string;
  htmlContent: string;
  textContent: string;
  replyTo?: { email: string; name?: string };
};

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(API_ENV) private readonly env: ApiEnvironment,
  ) {}

  async send(request: ContactRequestDto) {
    const recipient = await this.recipientEmail();
    const payload = this.brevoPayload(recipient, request);

    let response: Response;
    try {
      response = await fetch(BREVO_SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.env.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      this.logger.error(
        'Brevo request failed before a response was received',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException('Email service unavailable');
    }

    if (!response.ok) {
      this.logger.error(`Brevo rejected contact email with status ${response.status}`);
      throw new ServiceUnavailableException('Email service unavailable');
    }

    return { data: { sent: true } };
  }

  private async recipientEmail() {
    const setting = await this.db.query.siteSettings.findFirst({
      columns: { key: true, type: true },
      where: (table, { eq }) =>
        eq(table.key, this.env.contactRecipientSettingKey),
      with: {
        translations: {
          orderBy: (table, { asc }) => [asc(table.locale)],
        },
      },
    });

    if (!setting || setting.type !== 'text') {
      this.logger.error('Contact recipient setting is missing or is not text');
      throw new InternalServerErrorException(
        'Contact recipient is not configured',
      );
    }

    const translations = setting.translations
      .map((translation) => ({
        locale: translation.locale,
        email: translation.value.trim(),
      }))
      .filter((translation) => Boolean(translation.email));
    const recipient =
      translations.find((translation) => translation.locale === 'vi')?.email ??
      translations[0]?.email;

    if (!recipient || !EMAIL_PATTERN.test(recipient)) {
      this.logger.error('Contact recipient setting does not contain a valid email');
      throw new InternalServerErrorException(
        'Contact recipient is not configured',
      );
    }

    return recipient;
  }

  private brevoPayload(
    recipient: string,
    request: ContactRequestDto,
  ): BrevoPayload {
    const fields = [
      ['Name', request.name],
      ['Mobile', request.mobile],
      ['Email', request.email],
      [
        'Tourist arrivals',
        request.touristArrivals === undefined
          ? undefined
          : String(request.touristArrivals),
      ],
      ['Message', request.message],
    ] as const;
    const value = (input: string | undefined) => input ?? NOT_PROVIDED;
    const htmlRows = fields
      .map(
        ([label, input]) =>
          `<tr><th align="left" style="padding:8px;vertical-align:top">${label}</th>` +
          `<td style="padding:8px;white-space:pre-wrap">${this.escapeHtml(value(input))}</td></tr>`,
      )
      .join('');
    const textContent = fields
      .map(([label, input]) => `${label}: ${value(input)}`)
      .join('\n');

    return {
      sender: {
        email: this.env.brevoSenderEmail,
        name: this.env.brevoSenderName,
      },
      to: [{ email: recipient }],
      subject: 'New travel enquiry',
      htmlContent: `<h1>New travel enquiry</h1><table>${htmlRows}</table>`,
      textContent,
      ...(request.email
        ? {
            replyTo: {
              email: request.email,
              ...(request.name ? { name: request.name } : {}),
            },
          }
        : {}),
    };
  }

  private escapeHtml(value: string) {
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
}
