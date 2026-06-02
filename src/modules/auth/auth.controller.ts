import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiSuccessMessage } from '../../common/decorators/api-success-message.decorator';
import { API_MESSAGES } from '../../common/messages/api-messages';
import { ApiAccessTokenInSwagger } from '../../core/swagger/api-access-token.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import type { AuthenticatedUser } from './auth.types';
import {
  LoginResponseDto,
  SigninDto,
  SignoutResponseDto,
} from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';

function readClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

function readAuthorization(req: Request): string | undefined {
  const header =
    req.get('Authorization') ??
    req.headers.authorization ??
    req.headers['Authorization'];
  return typeof header === 'string'
    ? header
    : Array.isArray(header)
      ? header[0]
      : undefined;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signin')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiSuccessMessage(API_MESSAGES.auth.signInSuccess)
  signin(@Body() dto: SigninDto, @Req() req: Request) {
    return this.authService.signin(dto, readClientIp(req));
  }

  @Public()
  @Post('signup')
  @ApiOperation({
    summary: 'Register',
    description: 'Creates a user with `is_admin: false`. Use `npm run create-admin` for staff.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('signout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Sign out (revoke token until expiry)' })
  @ApiOkResponse({ type: SignoutResponseDto })
  @ApiSuccessMessage(API_MESSAGES.auth.signOutSuccess)
  signout(@Req() req: Request) {
    return this.authService.signout(readAuthorization(req));
  }

  @Public()
  @Get('verify')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verify access token and return current user' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  verify(@Req() req: Request) {
    return this.authService.verifyBearer(readAuthorization(req));
  }

  @Get('me')
  @ApiAccessTokenInSwagger()
  @ApiOperation({ summary: 'Current authenticated user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.sub);
  }
}
