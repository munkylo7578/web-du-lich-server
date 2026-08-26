import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';

import { Public } from '../common/public.decorator';
import { DATABASE, type Database } from '../database/database.module';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Public process liveness check' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Public database readiness check' })
  async ready() {
    await this.db.execute(sql`select 1`);
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
