import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { BankAccountsRepository } from './bank-accounts.repository';
import { BankAccountsService } from './bank-accounts.service';

@Module({
  imports: [DatabaseModule],
  providers: [BankAccountsRepository, BankAccountsService],
  exports: [BankAccountsService],
})
export class BankAccountsModule {}
