import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail = exception instanceof HttpException ? exception.getResponse() : { message: 'Error interno del servidor' };
    if (!(exception instanceof HttpException)) this.logger.error(exception);
    response.status(status).json({ statusCode: status, ...(typeof detail === 'string' ? { message: detail } : detail), timestamp: new Date().toISOString() });
  }
}
