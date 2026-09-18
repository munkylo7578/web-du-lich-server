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
import { renderContactEmail } from './contact-email.template';

const BREVO_SEND_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      const details = await this.brevoErrorDetails(response, request);
      this.logger.error(
        `Brevo rejected contact email with status ${response.status}: ${details}`,
      );
      throw new ServiceUnavailableException('Email service unavailable');
    }

    return { data: { sent: true } };
  }

  private async brevoErrorDetails(response: Response, request: ContactRequestDto) {
    try {
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object') return 'No structured error details';

      const error = body as Record<string, unknown>;
      const redact = (value: unknown) => {
        if (typeof value !== 'string') return 'unknown';
        let safe = value;
        const sensitiveValues = [
          this.env.brevoApiKey,
          this.env.brevoSenderName,
          request.email,
          request.name,
          request.mobile,
          request.message,
        ].filter((item): item is string => Boolean(item));
        for (const sensitive of sensitiveValues.sort((a, b) => b.length - a.length)) {
          safe = safe.split(sensitive).join('[redacted]');
        }
        return safe
          .replace(/[^\s<>"'@]+@[^\s<>"'@]+/g, '[redacted-email]')
          .replace(/[\r\n\t]/g, ' ')
          .slice(0, 1000);
      };

      return JSON.stringify({ code: redact(error.code), message: redact(error.message) });
    } catch {
      // An unreadable provider response must not mask the public service error.
      return 'Error response unavailable or not JSON';
    }
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
    const email = renderContactEmail(request);

    return {
      sender: {
        email: this.env.brevoSenderEmail,
        name: this.env.brevoSenderName,
      },
      to: [{ email: recipient }],
      ...email,
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

}
