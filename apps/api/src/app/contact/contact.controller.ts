import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiSecurity, ApiTags } from '@nestjs/swagger';

import {
  ApiCommonErrorResponses,
  ApiSuccessEnvelope,
} from '../common/api-response.swagger';
import { ContactRequestDto, ContactResponseDto } from './contact.dto';
import { ContactService } from './contact.service';

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
}
