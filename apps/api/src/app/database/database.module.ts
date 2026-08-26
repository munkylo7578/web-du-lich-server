import { Global, Module } from '@nestjs/common';
import { db } from '@database';

export const DATABASE = Symbol('DATABASE');
export type Database = typeof db;

@Global()
@Module({ providers: [{ provide: DATABASE, useValue: db }], exports: [DATABASE] })
export class DatabaseModule {}
