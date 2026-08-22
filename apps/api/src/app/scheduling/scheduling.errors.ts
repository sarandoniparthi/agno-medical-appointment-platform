import { ConflictException } from '@nestjs/common';

export function mapSchedulingDatabaseError(error: unknown): never {
  if (
    typeof error === 'object' && error !== null &&
    ('code' in error && (error.code === '23P01' || error.code === '23505'))
  ) {
    throw new ConflictException('The requested appointment slot is no longer available');
  }
  throw error;
}
