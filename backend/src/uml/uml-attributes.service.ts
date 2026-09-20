import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { validateDto } from '../common/validate-dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUmlAttributeDto, UpdateUmlAttributeDto } from './dto/uml-attribute.dto';
import { DiagramsService } from './diagrams.service';

@Injectable()
export class UmlAttributesService {
  constructor(private readonly prisma: PrismaService, private readonly diagrams: DiagramsService) {}

  async list(umlClassId: string, userId: string) {
    await this.verifyClass(umlClassId, userId);
    return this.prisma.umlAttribute.findMany({ where: { umlClassId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
  }

  async create(umlClassId: string, userId: string, input: CreateUmlAttributeDto) {
    const dto = validateDto(CreateUmlAttributeDto, input);
    await this.verifyClass(umlClassId, userId);
    return this.prisma.umlAttribute.create({ data: { ...dto, name: dto.name.trim(), type: dto.type.trim(), umlClassId } });
  }

  async update(id: string, userId: string, input: UpdateUmlAttributeDto) {
    const dto = validateDto(UpdateUmlAttributeDto, input);
    if (!Object.values(dto).some(value => value !== undefined)) throw new BadRequestException('Indica al menos un campo para actualizar');
    const attribute = await this.find(id);
    await this.verifyClass(attribute.umlClassId, userId);
    return this.prisma.umlAttribute.update({ where: { id }, data: { ...dto, name: dto.name?.trim(), type: dto.type?.trim() } });
  }

  async remove(id: string, userId: string) {
    const attribute = await this.find(id);
    await this.verifyClass(attribute.umlClassId, userId);
    return this.prisma.umlAttribute.delete({ where: { id } });
  }

  private async verifyClass(id: string, userId: string) {
    if (!isUUID(id, '4')) throw new BadRequestException('ID de clase UML inválido');
    const umlClass = await this.prisma.umlClass.findUnique({ where: { id }, select: { diagramId: true } });
    if (!umlClass) throw new NotFoundException('Clase UML inexistente');
    await this.diagrams.verifyAccess(umlClass.diagramId, userId);
  }

  private async find(id: string) {
    if (!isUUID(id, '4')) throw new BadRequestException('ID de atributo UML inválido');
    const value = await this.prisma.umlAttribute.findUnique({ where: { id } });
    if (!value) throw new NotFoundException('Atributo UML inexistente');
    return value;
  }
}
