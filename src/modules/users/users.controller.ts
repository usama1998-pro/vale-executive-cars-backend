import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessMessage } from '../../common/decorators/api-success-message.decorator';
import { API_MESSAGES } from '../../common/messages/api-messages';
import { ApiAccessTokenInSwagger } from '../../core/swagger/api-access-token.decorator';
import { StaffAdminGuard } from '../auth/guards/staff-admin.guard';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(StaffAdminGuard)
@ApiAccessTokenInSwagger()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List users (admin)',
    description: 'Paginated list of accounts (no password fields).',
  })
  @ApiSuccessMessage(API_MESSAGES.users.listSuccess)
  findAll(@Query() query: ListUsersQueryDto) {
    return this.users.findAll(query);
  }
}
