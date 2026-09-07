import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Resident } from './resident.entity';
import { ResidentsController } from './residents.controller';
import { ResidentsService } from './residents.service';
import { UnitsModule } from '../units/units.module';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resident, User]),
    UnitsModule,
    AuthModule,
  ],
  controllers: [ResidentsController],
  providers: [ResidentsService],
  exports: [ResidentsService],
})
export class ResidentsModule {}
