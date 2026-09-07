import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ResidentialUnit } from './unit.entity';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResidentialUnit]), AuthModule],
  controllers: [UnitsController],
  providers: [UnitsService],
  exports: [TypeOrmModule],
})
export class UnitsModule {}
