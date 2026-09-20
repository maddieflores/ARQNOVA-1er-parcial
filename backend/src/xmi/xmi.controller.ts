import { BadRequestException, Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth-user';
import { XmiService } from './xmi.service';

@Controller('projects/:projectId/xmi')
@UseGuards(JwtAuthGuard)
export class XmiController {
  constructor(private readonly xmi: XmiService) {}

  @Get('export')
  async export(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @Res() response: Response) {
    const file = await this.xmi.export(projectId, request.user!.id);
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.content);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  import(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Selecciona un archivo XMI válido');
    return this.xmi.import(projectId, request.user!.id, file);
  }
}
