import { BadGatewayException, BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CollaborationService } from '../collaboration/collaboration.service';
import { validateDto } from '../common/validate-dto';
import { PrismaService } from '../prisma/prisma.service';
import { DiagramsService } from '../uml/diagrams.service';
import { AiUmlProposalService } from './ai-uml-proposal.service';
import { ApplyUmlProposalDto } from './dto/apply-uml-proposal.dto';

const GRID_COLUMNS = 4;
const GRID_X = 300;
const GRID_Y = 240;
const GRID_MARGIN = 80;

@Injectable()
export class AiUmlApplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly diagrams: DiagramsService,
    private readonly proposals: AiUmlProposalService,
    private readonly collaboration: CollaborationService,
  ) {}

  async apply(projectId: string, userId: string, input: ApplyUmlProposalDto) {
    const dto = validateDto(ApplyUmlProposalDto, input);
    try { this.proposals.validateSemantics(dto.proposal); }
    catch (error) {
      if (error instanceof BadGatewayException) throw new BadRequestException('La propuesta UML no es válida');
      throw error;
    }
    const project = await this.diagrams.validateProjectAccess(projectId, userId);

    let counts: { classes: number; attributes: number; methods: number; relations: number };
    try {
      counts = await this.prisma.$transaction(async transaction => {
        const diagram = await transaction.diagram.upsert({
          where: { projectId },
          create: { projectId, name: `Diagrama de ${project.name}` },
          update: {},
          include: { classes: { include: { attributes: true, methods: true } }, relations: true },
        });
        this.assertNoConflicts(diagram, dto.proposal);

        const baseY = diagram.classes.length === 0 ? GRID_MARGIN : Math.max(...diagram.classes.map(item => item.y)) + GRID_Y;
        const classIds = new Map<string, string>();
        let attributeCount = 0;
        let methodCount = 0;
        for (const [index, proposed] of dto.proposal.classes.entries()) {
          const created = await transaction.umlClass.create({
            data: {
              diagramId: diagram.id,
              name: proposed.name.trim(),
              x: GRID_MARGIN + (index % GRID_COLUMNS) * GRID_X,
              y: baseY + Math.floor(index / GRID_COLUMNS) * GRID_Y,
              attributes: { create: proposed.attributes.map((attribute, position) => ({ ...attribute, name: attribute.name.trim(), type: attribute.type.trim(), isPrimaryKey: attribute.isPrimaryKey ?? false, position })) },
              methods: { create: proposed.methods.map((method, position) => ({ ...method, name: method.name.trim(), returnType: method.returnType.trim(), position })) },
            },
            select: { id: true },
          });
          classIds.set(this.key(proposed.name), created.id);
          attributeCount += proposed.attributes.length;
          methodCount += proposed.methods.length;
        }
        for (const relation of dto.proposal.relations) {
          await transaction.umlRelation.create({ data: {
            diagramId: diagram.id,
            sourceClassId: classIds.get(this.key(relation.sourceClassName))!,
            targetClassId: classIds.get(this.key(relation.targetClassName))!,
            type: relation.type,
            sourceMultiplicity: relation.sourceMultiplicity ?? '1',
            targetMultiplicity: relation.targetMultiplicity ?? '1',
            label: relation.label?.trim() || null,
          } });
        }
        return { classes: dto.proposal.classes.length, attributes: attributeCount, methods: methodCount, relations: dto.proposal.relations.length };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw new ConflictException('La propuesta entra en conflicto con el diagrama actual');
      throw error;
    }

    const diagram = await this.diagrams.getByProject(projectId, userId);
    this.collaboration.publish(projectId, 'uml:diagram:updated', diagram, userId);
    return { created: counts, diagram };
  }

  private assertNoConflicts(diagram: { classes: Array<{ name: string }> }, proposal: ApplyUmlProposalDto['proposal']) {
    const existing = new Set(diagram.classes.map(item => this.key(item.name)));
    if (proposal.classes.some(item => existing.has(this.key(item.name)))) throw new ConflictException('La propuesta entra en conflicto con el diagrama actual');
  }

  private key(value: string) { return value.trim().toLocaleLowerCase(); }
}
