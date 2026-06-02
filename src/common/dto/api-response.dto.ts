import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiSuccessResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({
    example: 'Your booking has been submitted successfully.',
  })
  message!: string;

  @ApiPropertyOptional()
  data?: T;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 'Please check your details and try again.' })
  message!: string;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiPropertyOptional({ example: 'Bad Request' })
  error?: string;
}
