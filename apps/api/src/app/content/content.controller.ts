import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';

import {
  ApiCommonErrorResponses,
  ApiSuccessEnvelope,
} from '../common/api-response.swagger';
import {
  CountryCodeParamsDto,
  CountryListQueryDto,
  DestinationListQueryDto,
  LocaleQueryDto,
  PageQueryDto,
  TourListQueryDto,
} from '../common/query.dto';
import {
  CountryContentDto,
  DestinationContentDto,
  ServiceContentDto,
  SettingContentDto,
  TourContentDto,
  TourDetailContentDto,
} from './content.dto';
import { ContentService } from './content.service';

@ApiTags('content')
@ApiSecurity('x-api-key')
@ApiCommonErrorResponses()
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('tours')
  @ApiSuccessEnvelope({
    dataType: TourDetailContentDto,
    isArray: true,
    hasMeta: true,
    description:
      'Paginated tours. Country and service category keys are independent of locale.',
  })
  listTours(@Query() query: TourListQueryDto) {
    return this.content.tours(query.locale, query.page, query.limit, {
      search: query.search,
      departureStartMonth: query.departureStartMonth,
    });
  }
  @Get('tours/:id')
  @ApiSuccessEnvelope({
    dataType: TourContentDto,
    description: 'Tour detail with plans, destinations, services, and images.',
  })
  getTour(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: LocaleQueryDto,
  ) {
    return this.content.tour(id, query.locale);
  }

  @Get('destinations')
  @ApiSuccessEnvelope({
    dataType: DestinationContentDto,
    isArray: true,
    hasMeta: true,
    description:
      'Paginated destinations. Provinces include nullable latitude and longitude derived from GIS geometry.',
  })
  listDestinations(@Query() query: DestinationListQueryDto) {
    return this.content.destinations(query.locale, query.page, query.limit);
  }
  @Get('destinations/:id')
  @ApiSuccessEnvelope({
    dataType: DestinationContentDto,
    description:
      'Destination detail. Provinces include nullable latitude and longitude derived from GIS geometry.',
  })
  getDestination(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: LocaleQueryDto,
  ) {
    return this.content.destination(id, query.locale);
  }

  @Get('countries')
  @ApiSuccessEnvelope({
    dataType: CountryContentDto,
    isArray: true,
    hasMeta: true,
    description: 'Countries ordered by code, with localized content and cover/gallery images. Returns all countries when limit is omitted.',
  })
  listCountries(@Query() query: CountryListQueryDto) {
    return this.content.countries(query.locale, query.page, query.limit);
  }

  @Get('countries/:code')
  @ApiSuccessEnvelope({
    dataType: CountryContentDto,
    description: 'Country detail by code (LA, CB, VN). Includes content and images, without embedded destinations or tours.',
  })
  getCountry(@Param() params: CountryCodeParamsDto, @Query() query: LocaleQueryDto) {
    return this.content.country(params.code, query.locale);
  }

  @Get('services')
  @ApiSuccessEnvelope({
    dataType: ServiceContentDto,
    isArray: true,
    hasMeta: true,
    description: 'Paginated services including category.',
  })
  listServices(@Query() query: PageQueryDto) {
    return this.content.services(query.locale, query.page, query.limit);
  }
  @Get('services/:id')
  @ApiSuccessEnvelope({
    dataType: ServiceContentDto,
    description: 'Service detail including category.',
  })
  getService(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: LocaleQueryDto,
  ) {
    return this.content.service(id, query.locale);
  }

  @Get('settings')
  @ApiSuccessEnvelope({
    dataType: SettingContentDto,
    isArray: true,
    hasMeta: true,
    description: 'Public settings',
  })
  listSettings(@Query() query: LocaleQueryDto) {
    return this.content.settings(query.locale);
  }
  @Get('settings/:key')
  @ApiSuccessEnvelope({
    dataType: SettingContentDto,
    hasMeta: true,
    description: 'Public setting detail',
  })
  getSetting(@Param('key') key: string, @Query() query: LocaleQueryDto) {
    return this.content.setting(key, query.locale);
  }
}
