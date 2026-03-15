import { Injectable } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async get(branchId: string) {
    return this.settingsRepository.get(branchId);
  }

  async update(branchId: string, dto: UpdateSettingsDto) {
    return this.settingsRepository.update(branchId, dto);
  }
}
