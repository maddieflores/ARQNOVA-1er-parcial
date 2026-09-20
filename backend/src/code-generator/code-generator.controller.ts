import { Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CodeGeneratorService } from './code-generator.service';

@Controller('projects/:projectId/code-generation')
@UseGuards(JwtAuthGuard)
export class CodeGeneratorController {
  constructor(private readonly generator: CodeGeneratorService) {}

  @Post('generate')
  async generate(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest) {
    const generated = await this.generator.generate(projectId, request.user!.id);
    return { projectName: generated.projectName, classCount: generated.classCount, fileCount: generated.files.length, files: generated.files.map(file => file.path) };
  }

  @Get('download')
  async download(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @Res() response: Response) {
    const file = await this.generator.generateZip(projectId, request.user!.id);
    response.setHeader('Content-Type', 'application/zip'); response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`); response.send(file.buffer);
  }
}
