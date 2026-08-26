import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';

import { LocaleQueryDto, PageQueryDto } from '../common/query.dto';
import { ContentService } from './content.service';

@ApiTags('content')
@ApiSecurity('x-api-key')
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('tours') listTours(@Query() query: PageQueryDto) { return this.content.tours(query.locale, query.page, query.limit); }
  @Get('tours/:id') getTour(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: LocaleQueryDto) { return this.content.tour(id, query.locale); }

  @Get('destinations') listDestinations(@Query() query: PageQueryDto) { return this.content.destinations(query.locale, query.page, query.limit); }
  @Get('destinations/:id') getDestination(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: LocaleQueryDto) { return this.content.destination(id, query.locale); }

  @Get('services') listServices(@Query() query: PageQueryDto) { return this.content.services(query.locale, query.page, query.limit); }
  @Get('services/:id') getService(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: LocaleQueryDto) { return this.content.service(id, query.locale); }

  @Get('settings') listSettings(@Query() query: LocaleQueryDto) { return this.content.settings(query.locale); }
  @Get('settings/:key') getSetting(@Param('key') key: string, @Query() query: LocaleQueryDto) { return this.content.setting(key, query.locale); }
}
