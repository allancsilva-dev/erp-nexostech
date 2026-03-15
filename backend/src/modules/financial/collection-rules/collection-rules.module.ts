import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { CollectionRulesRepository } from './collection-rules.repository';
import { CollectionRulesService } from './collection-rules.service';

@Module({
  imports: [DatabaseModule],
  providers: [CollectionRulesRepository, CollectionRulesService],
  exports: [CollectionRulesService],
})
export class CollectionRulesModule {}
