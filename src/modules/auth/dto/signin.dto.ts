import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SigninDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'your-password' })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  access_token!: string;

  @ApiProperty({ example: 604800 })
  expires_in!: number;

  @ApiProperty({ example: '2026-06-02T12:00:00.000Z' })
  expires_at!: string;
}

export class SignoutResponseDto {
  @ApiProperty()
  revoked!: boolean;
}
