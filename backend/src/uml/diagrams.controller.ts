import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDiagramDto } from './dto/diagram.dto';
import { DiagramsService } from './diagrams.service';

@Controller('projects/:projectId/diagram')
@UseGuards(JwtAuthGuard)
export class DiagramsController {
  constructor(private readonly diagrams: DiagramsService) {}

  @Get()
  get(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest) {
    return this.diagrams.getByProject(projectId, request.user!.id);
  }

  @Post()
  create(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @Body() dto: CreateDiagramDto) {
    return this.diagrams.create(projectId, request.user!.id, dto);
  }
}
