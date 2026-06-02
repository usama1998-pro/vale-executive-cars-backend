import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipApiWrap } from '../../common/decorators/skip-api-wrap.decorator';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

@Public()
@SkipThrottle()
@SkipApiWrap()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('db')
  @ApiOperation({ summary: 'MySQL connectivity check' })
  @ApiResponse({
    status: 200,
    description: 'Database is reachable',
    schema: {
      example: { status: 'ok', database: { status: 'up' } },
    },
  })
  @ApiServiceUnavailableResponse({ description: 'Database is not reachable' })
  async checkDatabase(): Promise<{
    status: string;
    database: { status: string };
  }> {
    try {
      await this.prisma.ping();
      return { status: 'ok', database: { status: 'up' } };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Database check failed';
      throw new ServiceUnavailableException({
        status: 'error',
        database: { status: 'down', message },
      });
    }
  }
}
