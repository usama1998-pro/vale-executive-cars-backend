import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

/** Admin test — message goes to WHATSAPP_TO; contactNumber is customer detail in the template. */
export class SendBookingConfirmationDto {
  @ApiProperty({
    example: '923150523620',
    description: 'Customer phone (shown in template body for owner; not the WhatsApp recipient)',
  })
  @IsString()
  @MinLength(8)
  contactNumber!: string;

  @ApiProperty({ example: 'Usama' })
  @IsString()
  @MinLength(1)
  customerName!: string;

  @ApiPropertyOptional({ example: 'Vale Executives Cars' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({ example: 'London to Birmingham' })
  @IsString()
  @MinLength(1)
  serviceLabel!: string;

  @ApiProperty({ example: '5 June 2026' })
  @IsString()
  @MinLength(1)
  pickupDateLabel!: string;

  @ApiProperty({ example: '3:30 PM' })
  @IsString()
  @MinLength(1)
  pickupTimeLabel!: string;
}

export class TestBookingConfirmationFromBookingDto {
  @ApiPropertyOptional({
    description: 'Optional pickup override for template date/time labels only',
  })
  @IsOptional()
  @IsDateString()
  preferredPickupAt?: string;
}
