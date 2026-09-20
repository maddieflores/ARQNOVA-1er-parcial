import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { validateDto } from '../common/validate-dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUmlMethodDto, UpdateUmlMethodDto } from './dto/uml-method.dto';
import { DiagramsService } from './diagrams.service';

@Injectable()
export class UmlMethodsService {
  constructor(private readonly prisma: PrismaService, private readonly diagrams: DiagramsService) {}

  async list(umlClassId: string, userId: string) {
    await this.verifyClass(umlClassId, userId);
    return this.prisma.umlMethod.findMany({ where: { umlClassId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
  }

  async create(umlClassId: string, userId: string, input: CreateUmlMethodDto) {
    const dto = validateDto(CreateUmlMethodDto, input);
    await this.verifyClass(umlClassId, userId);
    return this.prisma.umlMethod.create({ data: { ...dto, name: dto.name.trim(), returnType: dto.returnType.trim(), umlClassId } });
  }

  async update(id: string, userId: string, input: UpdateUmlMethodDto) {
    const dto = validateDto(UpdateUmlMethodDto, input);
    if (!Object.values(dto).some(value => value !== undefined)) throw new BadRequestException('Indica al menos un campo para actualizar');
    const method = await this.find(id);
    await this.verifyClass(method.umlClassId, userId);
    return this.prisma.umlMethod.update({ where: { id }, data: { ...dto, name: dto.name?.trim(), returnType: dto.returnType?.trim() } });
  }

  async remove(id: string, userId: string) {
    const method = await this.find(id);
    await this.verifyClass(method.umlClassId, userId);
    return this.prisma.umlMethod.delete({ where: { id } });
  }

  private async verifyClass(id: string, userId: string) {
    if (!isUUID(id, '4')) throw new BadRequestException('ID de clase UML inválido');
    const umlClass = await this.prisma.umlClass.findUnique({ where: { id }, select: { diagramId: true } });
    if (!umlClass) throw new NotFoundException('Clase UML inexistente');
    await this.diagrams.verifyAccess(umlClass.diagramId, userId);
  }

  private async find(id: string) {
    if (!isUUID(id, '4')) throw new BadRequestException('ID de método UML inválido');
    const value = await this.prisma.umlMethod.findUnique({ where: { id } });
    if (!value) throw new NotFoundException('Método UML inexistente');
    return value;
  }
}
