import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { formatMetaGraphApiError } from './utils/graph-api-error.util';
import {
  getMetaTokenRefreshConfig,
  isMetaTokenRefreshEnabled,
  metaTokenRefreshBufferSeconds,
} from './meta-token.config';

type MetaTokenExchangeResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type ExchangeResult =
  | { ok: true; data: MetaTokenExchangeResponse }
  | { ok: false; envToken: string };

@Injectable()
export class MetaTokenService {
  private readonly logger = new Logger(MetaTokenService.name);
  private cached: { token: string; expiresAtMs: number } | null = null;

  constructor(private readonly http: HttpService) {}

  /**
   * Token used for WhatsApp Graph API calls.
   * When META_APP_ID + META_APP_SECRET are set, exchanges WHATSAPP_TOKEN for a
   * long-lived token first (cached in memory until near expiry).
   */
  async getAccessToken(envToken: string): Promise<string> {
    if (!envToken.trim()) {
      throw new Error('WHATSAPP_TOKEN is not set');
    }

    if (!isMetaTokenRefreshEnabled()) {
      return envToken.trim();
    }

    const bufferMs = metaTokenRefreshBufferSeconds() * 1000;
    if (this.cached && Date.now() < this.cached.expiresAtMs - bufferMs) {
      return this.cached.token;
    }

    const exchange = await this.exchangeLongLivedToken(envToken.trim());
    if (!exchange.ok) {
      return exchange.envToken;
    }

    const { access_token, expires_in } = exchange.data;
    if (!expires_in || expires_in <= 0) {
      this.logger.warn(
        'Meta token exchange returned no expires_in (typical for permanent/system tokens); using WHATSAPP_TOKEN from env',
      );
      return envToken.trim();
    }

    this.cached = {
      token: access_token,
      expiresAtMs: Date.now() + expires_in * 1000,
    };
    this.logger.log(
      `Meta access token refreshed (expires in ~${Math.round(expires_in / 86_400)} days)`,
    );
    return this.cached.token;
  }

  private async exchangeLongLivedToken(
    currentToken: string,
  ): Promise<ExchangeResult> {
    const config = getMetaTokenRefreshConfig();
    if (!config) {
      throw new Error('Meta token refresh is not configured');
    }

    const url = `https://graph.facebook.com/${config.graphApiVersion}/oauth/access_token`;

    try {
      const { data } = await firstValueFrom(
        this.http.get<MetaTokenExchangeResponse>(url, {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: config.appId,
            client_secret: config.appSecret,
            fb_exchange_token: currentToken,
          },
        }),
      );

      if (!data?.access_token) {
        throw new Error('Meta token exchange returned no access_token');
      }

      return { ok: true, data };
    } catch (error) {
      const detail = formatMetaGraphApiError(error);
      this.logger.warn(
        `Meta token exchange failed, using WHATSAPP_TOKEN from env: ${detail}`,
      );
      return { ok: false, envToken: currentToken };
    }
  }
}
