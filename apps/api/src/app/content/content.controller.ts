import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ApiCommonErrorResponses, ApiSuccessEnvelope } from '../common/api-response.swagger';
import { LocaleQueryDto, PageQueryDto } from '../common/query.dto';
import { ContentService } from './content.service';

@ApiTags('content')
@ApiSecurity('x-api-key')
@ApiCommonErrorResponses()
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('tours') @ApiSuccessEnvelope({ isArray: true, hasMeta: true, description: 'Paginated tours' })
  listTours(@Query() query: PageQueryDto) { return this.content.tours(query.locale, query.page, query.limit); }
  @Get('tours/:id') @ApiSuccessEnvelope({ description: 'Tour detail' })
  getTour(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: LocaleQueryDto) { return this.content.tour(id, query.locale); }

  @Get('destinations') @ApiSuccessEnvelope({ isArray: true, hasMeta: true, description: 'Paginated destinations' })
  listDestinations(@Query() query: PageQueryDto) { return this.content.destinations(query.locale, query.page, query.limit); }
  @Get('destinations/:id') @ApiSuccessEnvelope({ description: 'Destination detail' })
  getDestination(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: LocaleQueryDto) { return this.content.destination(id, query.locale); }

  @Get('services') @ApiSuccessEnvelope({ isArray: true, hasMeta: true, description: 'Paginated services' })
  listServices(@Query() query: PageQueryDto) { return this.content.services(query.locale, query.page, query.limit); }
  @Get('services/:id') @ApiSuccessEnvelope({ description: 'Service detail' })
  getService(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: LocaleQueryDto) { return this.content.service(id, query.locale); }

  @Get('settings') @ApiSuccessEnvelope({ isArray: true, hasMeta: true, description: 'Public settings' })
  listSettings(@Query() query: LocaleQueryDto) { return this.content.settings(query.locale); }
  @Get('settings/:key') @ApiSuccessEnvelope({ hasMeta: true, description: 'Public setting detail' })
  getSetting(@Param('key') key: string, @Query() query: LocaleQueryDto) { return this.content.setting(key, query.locale); }
}
