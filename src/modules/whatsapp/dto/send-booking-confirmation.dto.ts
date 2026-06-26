import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

/** Admin test — message goes to WHATSAPP_TO; contactNumber is customer detail in the template. */
export class SendBookingConfirmationDto {
  @ApiProperty({ example: 'Usama' })
  @IsString()
  @MinLength(1)
  customerName!: string;

  @ApiProperty({
    example: '923150523620',
    description: 'Customer phone (shown in template body for owner; not the WhatsApp recipient)',
  })
  @IsString()
  @MinLength(8)
  contactNumber!: string;

  @ApiProperty({ example: 'customer@example.com' })
  @IsString()
  @MinLength(3)
  email!: string;

  @ApiProperty({ example: 'Heathrow Airport Terminal 5' })
  @IsString()
  @MinLength(1)
  departureLocation!: string;

  @ApiPropertyOptional({ example: 'None' })
  @IsOptional()
  @IsString()
  stopoverLocation?: string;

  @ApiPropertyOptional({ example: '214' })
  @IsOptional()
  @IsString()
  roomNo?: string;

  @ApiPropertyOptional({ example: '2' })
  @IsOptional()
  @IsString()
  passengers?: string;

  @ApiProperty({ example: 'Central London' })
  @IsString()
  @MinLength(1)
  destinationLocation!: string;

  @ApiProperty({ example: '5 June 2026 at 3:30 pm' })
  @IsString()
  @MinLength(1)
  pickupDateLabel!: string;

  @ApiPropertyOptional({ example: '6 June 2026 at 4:00 pm' })
  @IsOptional()
  @IsString()
  returnDateLabel?: string;

  @ApiProperty({ example: 'EXECUTIVE' })
  @IsString()
  @MinLength(1)
  selectedService!: string;

  @ApiProperty({ example: '£75' })
  @IsString()
  @MinLength(1)
  totalFare!: string;
}

export class TestBookingConfirmationFromBookingDto {
  @ApiPropertyOptional({
    description: 'Optional pickup override for template travel date label only',
  })
  @IsOptional()
  @IsDateString()
  preferredPickupAt?: string;
}
