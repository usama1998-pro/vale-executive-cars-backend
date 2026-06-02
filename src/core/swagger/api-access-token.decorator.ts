import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

export function ApiAccessTokenInSwagger() {
  return applyDecorators(ApiBearerAuth('access-token'));
}
