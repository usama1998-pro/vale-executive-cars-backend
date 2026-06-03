import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { VEHICLE_TYPES } from '../../../common/pricing/pricing';

export class RouteQuoteDto {
  @ApiProperty({ example: 'London' })
  @IsString()
  @MinLength(1)
  from!: string;

  @ApiProperty({ example: 'Manchester' })
  @IsString()
  @MinLength(1)
  to!: string;

  @ApiPropertyOptional({
    example: 'Birmingham',
    description: 'Optional waypoint between pickup and drop-off',
  })
  @IsOptional()
  @IsString()
  via?: string;

  @ApiProperty({
    example: 'executive',
    enum: VEHICLE_TYPES,
  })
  @IsString()
  @IsIn(VEHICLE_TYPES)
  vehicleType!: (typeof VEHICLE_TYPES)[number];
}

export class RouteFareDto {
  @ApiProperty({ example: 550, description: 'Journey distance in kilometres' })
  @IsNumber()
  @Min(0)
  distanceKm!: number;

  @ApiProperty({
    example: 'executive',
    enum: VEHICLE_TYPES,
  })
  @IsString()
  @IsIn(VEHICLE_TYPES)
  vehicleType!: (typeof VEHICLE_TYPES)[number];
}
