import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiSecurity, ApiTags } from '@nestjs/swagger';

import {
  ApiCommonErrorResponses,
  ApiSuccessEnvelope,
} from '../common/api-response.swagger';
import { ContactRequestDto, ContactResponseDto } from './contact.dto';
import { ContactService } from './contact.service';
import { JourneyContactRequestDto } from './journey-contact.dto';

@ApiTags('contact')
@ApiSecurity('x-api-key')
@ApiCommonErrorResponses()
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ContactRequestDto })
  @ApiSuccessEnvelope({
    dataType: ContactResponseDto,
    description: 'The contact enquiry was accepted and sent by email.',
  })
  submit(@Body() request: ContactRequestDto) {
    return this.contact.send(request);
  }

  @Post('journey')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: JourneyContactRequestDto })
  @ApiSuccessEnvelope({
    dataType: ContactResponseDto,
    description: 'The journey enquiry was accepted and sent by email.',
  })
  submitJourney(@Body() request: JourneyContactRequestDto) {
    return this.contact.sendJourney(request);
  }
}
