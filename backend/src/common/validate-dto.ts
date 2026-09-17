import { BadRequestException } from '@nestjs/common';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';

export function validateDto<T extends object>(type: ClassConstructor<T>, input: T): T {
  const dto = plainToInstance(type, input);
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) {
    throw new BadRequestException(errors.flatMap(error => Object.values(error.constraints ?? {})));
  }
  return dto;
}
