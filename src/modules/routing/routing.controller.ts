import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessMessage } from '../../common/decorators/api-success-message.decorator';
import { API_MESSAGES } from '../../common/messages/api-messages';
import { Public } from '../auth/decorators/public.decorator';
import { PlacesSearchDto } from './dto/places-search.dto';
import { RouteFareDto, RouteQuoteDto } from './dto/route-quote.dto';
import { RoutingService } from './routing.service';

@ApiTags('routing')
@Controller('routing')
export class RoutingController {
  constructor(private readonly routing: RoutingService) {}

  @Public()
  @Post('quote')
  @ApiOperation({
    summary: 'Get driving distance and fare quote',
    description:
      'Geocodes pickup/drop-off (and optional via) with Google Geocoding, queries Google Directions for driving distance, and returns fares for all vehicle types. With via, total distance is Pickup→Via plus Via→Drop-off; fare is calculated once on that combined distance.',
  })
  @ApiResponse({
    status: 400,
    description: 'Address could not be geocoded or route not found',
  })
  @ApiSuccessMessage(API_MESSAGES.routing.quoteSuccess)
  quote(@Body() dto: RouteQuoteDto) {
    return this.routing.getQuote(dto);
  }

  @Public()
  @Post('fare')
  @ApiOperation({
    summary: 'Calculate fare from distance',
    description:
      'Returns estimated fare for the given distance and vehicle type using the same pricing rules as the mobile app.',
  })
  @ApiSuccessMessage(API_MESSAGES.routing.fareSuccess)
  fare(@Body() dto: RouteFareDto) {
    return this.routing.getFare(dto);
  }

  @Public()
  @Post('places')
  @ApiOperation({
    summary: 'Search places for address autocomplete',
    description:
      'Returns address suggestions from Google Places Autocomplete, restricted to configured countries.',
  })
  @ApiSuccessMessage(API_MESSAGES.routing.placesSuccess)
  places(@Body() dto: PlacesSearchDto) {
    return this.routing.searchPlaces(dto.input);
  }
}
