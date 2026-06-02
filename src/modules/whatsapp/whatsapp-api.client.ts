import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { getWhatsappConfig } from './whatsapp.config';
import { MetaTokenService } from './meta-token.service';
import { formatMetaGraphApiError } from './utils/graph-api-error.util';
import type {
  WhatsappSendMessageResponse,
  WhatsappSendTemplateRequest,
} from './types/whatsapp-api.types';

@Injectable()
export class WhatsappApiClient {
  private readonly logger = new Logger(WhatsappApiClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly metaToken: MetaTokenService,
  ) {}

  isConfigured(): boolean {
    const config = getWhatsappConfig();
    return Boolean(config?.enabled);
  }

  async sendTemplate(
    payload: WhatsappSendTemplateRequest,
  ): Promise<WhatsappSendMessageResponse> {
    const config = getWhatsappConfig();
    if (!config?.enabled) {
      throw new Error('WhatsApp is not configured or is disabled');
    }

    this.logger.log(
      `WhatsApp send to=${payload.to} template=${payload.template.name}`,
    );

    try {
      const accessToken = await this.metaToken.getAccessToken(
        config.accessToken,
      );
      const { data } = await firstValueFrom(
        this.http.post<WhatsappSendMessageResponse>(
          config.graphApiUrl,
          payload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return data;
    } catch (error) {
      const detail = formatMetaGraphApiError(error);
      const bodyParams =
        payload.template.components?.find((c) => c.type === 'body')
          ?.parameters.length ?? 0;
      this.logger.error(
        `WhatsApp Graph API request failed: ${detail} (template=${payload.template.name}, lang=${payload.template.language.code}, bodyParams=${bodyParams})`,
      );
      throw new Error(detail);
    }
  }
}
