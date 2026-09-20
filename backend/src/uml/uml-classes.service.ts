import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { validateDto } from '../common/validate-dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUmlClassDto, MoveUmlClassDto, UpdateUmlClassDto } from './dto/uml-class.dto';
import { DiagramsService } from './diagrams.service';

@Injectable()
export class UmlClassesService {
  constructor(private readonly prisma: PrismaService, private readonly diagrams: DiagramsService) {}

  async create(diagramId: string, userId: string, input: CreateUmlClassDto) {
    const dto = validateDto(CreateUmlClassDto, input);
    await this.diagrams.verifyAccess(diagramId, userId);
    return this.prisma.umlClass.create({ data: { ...dto, name: dto.name.trim(), diagramId } });
  }

  async get(classId: string, userId: string) {
    const umlClass = await this.find(classId);
    await this.diagrams.verifyAccess(umlClass.diagramId, userId);
    return umlClass;
  }

  async update(classId: string, userId: string, input: UpdateUmlClassDto) {
    const dto = validateDto(UpdateUmlClassDto, input);
    this.requireChanges(dto);
    await this.get(classId, userId);
    return this.prisma.umlClass.update({ where: { id: classId }, data: { ...dto, name: dto.name?.trim() } });
  }

  async move(classId: string, userId: string, input: MoveUmlClassDto) {
    const dto = validateDto(MoveUmlClassDto, input);
    await this.get(classId, userId);
    return this.prisma.umlClass.update({ where: { id: classId }, data: dto });
  }

  async remove(classId: string, userId: string) {
    await this.get(classId, userId);
    return this.prisma.$transaction(async tx => {
      await tx.umlRelation.deleteMany({ where: { OR: [{ sourceClassId: classId }, { targetClassId: classId }] } });
      return tx.umlClass.delete({ where: { id: classId } });
    });
  }

  private async find(classId: string) {
    if (!isUUID(classId, '4')) throw new BadRequestException('ID de clase UML inválido');
    const umlClass = await this.prisma.umlClass.findUnique({ where: { id: classId } });
    if (!umlClass) throw new NotFoundException('Clase UML inexistente');
    return umlClass;
  }

  private requireChanges(value: object) {
    if (!Object.values(value).some(item => item !== undefined)) throw new BadRequestException('Indica al menos un campo para actualizar');
  }
}
