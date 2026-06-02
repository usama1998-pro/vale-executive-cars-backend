import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../modules/auth/decorators/public.decorator';
@Public()
@ApiTags('root')
@Controller()
export class RootController {
  @Get()
  @Redirect('/admin', 302)
  @ApiOperation({ summary: 'Redirect to admin portal' })
  @ApiResponse({ status: 302, description: 'Admin sign-in and dashboard' })
  redirectToAdmin(): void {
    return;
  }
}
