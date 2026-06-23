import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class CreateBookingDto {
  @ApiPropertyOptional({
    description: 'Optional 4–10 digit code; auto-generated if omitted',
    example: '482917',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,10}$/, { message: 'bookingRef must be numeric only' })
  bookingRef?: string;

  @ApiProperty({ example: 'muhammad usama' })
  @IsString()
  @MinLength(1)
  customerName!: string;

  @ApiProperty({ example: 'm.usamanaseer68@gmail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '1234567980' })
  @IsString()
  @MinLength(5)
  contactNumber!: string;

  @ApiProperty({ example: 'london' })
  @IsString()
  @MinLength(1)
  from!: string;

  @ApiPropertyOptional({ example: '204' })
  @IsOptional()
  @IsString()
  roomNo?: string;

  @ApiPropertyOptional({ example: 2, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  passengers?: number;

  @ApiProperty({ example: 'bermingham' })
  @IsString()
  @MinLength(1)
  to!: string;

  @ApiProperty({ example: 80.4, description: 'Journey distance in miles' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  distanceMiles!: number;

  @ApiProperty({ example: 82.5, description: 'Fare in pounds (to the penny)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedFare!: number;

  @ApiProperty({ example: 'executive' })
  @IsString()
  @MinLength(1)
  vehicleType!: string;

  @ApiProperty({ example: 'car' })
  @IsString()
  @MinLength(1)
  via!: string;

  @ApiProperty({ example: '2026-05-22T01:30:00.000Z' })
  @IsDateString()
  preferredPickupAt!: string;

  @ApiPropertyOptional({ example: 'one-way', enum: ['one-way', 'return'] })
  @IsOptional()
  @IsIn(['one-way', 'return'])
  tripType?: 'one-way' | 'return';

  @ApiPropertyOptional({ example: '2026-05-24T16:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  returnPickupAt?: string;

  @ApiPropertyOptional({ enum: BookingStatus, default: BookingStatus.submitted })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ example: '2026-05-20T21:17:55.922Z' })
  @IsOptional()
  @IsDateString()
  submittedAt?: string;
}
