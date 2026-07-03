import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
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

  @ApiProperty({
    example: 'executive',
    enum: VEHICLE_TYPES,
  })
  @IsString()
  @IsIn(VEHICLE_TYPES)
  vehicleType!: (typeof VEHICLE_TYPES)[number];
}

export class RouteFareDto {
  @ApiProperty({ example: 342, description: 'Journey distance in miles' })
  @IsNumber()
  @Min(0)
  distanceMiles!: number;

  @ApiProperty({
    example: 'executive',
    enum: VEHICLE_TYPES,
  })
  @IsString()
  @IsIn(VEHICLE_TYPES)
  vehicleType!: (typeof VEHICLE_TYPES)[number];
}
