import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ApiCommonErrorResponses, ApiSuccessEnvelope } from '../common/api-response.swagger';
import { LocaleQueryDto, PageQueryDto } from '../common/query.dto';
import { ServiceContentDto } from './content.dto';
import { ContentService } from './content.service';

@ApiTags('content')
@ApiSecurity('x-api-key')
@ApiCommonErrorResponses()
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('tours') @ApiSuccessEnvelope({ isArray: true, hasMeta: true, description: 'Paginated tours. Nested destinations include country: LA (Laos), KH (Cambodia), or VN (Vietnam); nested services include category: accommodation, transportation, or tourguide. These keys are independent of locale.' })
  listTours(@Query() query: PageQueryDto) { return this.content.tours(query.locale, query.page, query.limit); }
  @Get('tours/:id') @ApiSuccessEnvelope({ description: 'Tour detail. Nested destinations include country: LA (Laos), KH (Cambodia), or VN (Vietnam); nested services include category: accommodation, transportation, or tourguide. These keys are independent of locale.' })
  getTour(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: LocaleQueryDto) { return this.content.tour(id, query.locale); }

  @Get('destinations') @ApiSuccessEnvelope({ isArray: true, hasMeta: true, description: 'Paginated destinations. Each destination includes its country and linked tours; each linked tour includes its ordered images.' })
  listDestinations(@Query() query: PageQueryDto) { return this.content.destinations(query.locale, query.page, query.limit); }
  @Get('destinations/:id') @ApiSuccessEnvelope({ description: 'Destination detail including its country and linked tours; each linked tour includes its ordered images.' })
  getDestination(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: LocaleQueryDto) { return this.content.destination(id, query.locale); }

  @Get('services') @ApiSuccessEnvelope({ dataType: ServiceContentDto, isArray: true, hasMeta: true, description: 'Paginated services including category.' })
  listServices(@Query() query: PageQueryDto) { return this.content.services(query.locale, query.page, query.limit); }
  @Get('services/:id') @ApiSuccessEnvelope({ dataType: ServiceContentDto, description: 'Service detail including category.' })
  getService(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: LocaleQueryDto) { return this.content.service(id, query.locale); }

  @Get('settings') @ApiSuccessEnvelope({ isArray: true, hasMeta: true, description: 'Public settings' })
  listSettings(@Query() query: LocaleQueryDto) { return this.content.settings(query.locale); }
  @Get('settings/:key') @ApiSuccessEnvelope({ hasMeta: true, description: 'Public setting detail' })
  getSetting(@Param('key') key: string, @Query() query: LocaleQueryDto) { return this.content.setting(key, query.locale); }
}
