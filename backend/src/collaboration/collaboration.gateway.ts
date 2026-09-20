import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import type { Namespace, Socket } from 'socket.io';
import type { AuthUser } from '../auth/auth-user';
import { AuthService } from '../auth/auth.service';
import { DiagramsService } from '../uml/diagrams.service';
import { CollaborationService, type LockElementType } from './collaboration.service';

type CollaborationSocket = Socket & { data: { user: AuthUser; projects?: Set<string> } };

@WebSocketGateway({ namespace: '/collaboration' })
export class CollaborationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Namespace;
  private readonly logger = new Logger(CollaborationGateway.name);
  constructor(private readonly auth: AuthService, private readonly diagrams: DiagramsService, private readonly collaboration: CollaborationService) {}

  afterInit(server: Namespace) {
    this.collaboration.attachServer(server as unknown as import('socket.io').Server);
    server.use(async (socket, next) => {
      const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
      try { socket.data.user = await this.auth.authenticate(token); socket.data.projects = new Set<string>(); next(); }
      catch { next(new Error('Sesión inválida o expirada')); }
    });
  }

  handleConnection(client: CollaborationSocket) { this.logger.log(`Cliente autenticado conectado: ${client.id}`); }
  handleDisconnect(client: CollaborationSocket) { this.collaboration.disconnect(client.id); this.logger.log(`Cliente desconectado: ${client.id}`); }

  @SubscribeMessage('project:join')
  async join(@ConnectedSocket() client: CollaborationSocket, @MessageBody() body: { projectId?: unknown }) {
    return this.safe(async () => {
      const projectId = this.projectId(body?.projectId); const diagram = await this.diagrams.getOrCreateByProject(projectId, client.data.user.id);
      await client.join(this.collaboration.room(projectId)); client.data.projects?.add(projectId); const presence = this.collaboration.join(projectId, client.id, client.data.user); this.collaboration.emitPresence(projectId);
      return { projectId, diagram, presence, locks: this.collaboration.getLocks(projectId) };
    });
  }

  @SubscribeMessage('project:leave')
  async leave(@ConnectedSocket() client: CollaborationSocket, @MessageBody() body: { projectId?: unknown }) {
    return this.safe(async () => { const projectId = this.projectId(body?.projectId); await client.leave(this.collaboration.room(projectId)); client.data.projects?.delete(projectId); this.collaboration.leave(projectId, client.id); return { projectId }; });
  }

  @SubscribeMessage('uml:lock:acquire')
  async acquire(@ConnectedSocket() client: CollaborationSocket, @MessageBody() body: { projectId?: unknown; elementType?: unknown; elementId?: unknown }) {
    return this.safe(async () => {
      const projectId = this.projectId(body?.projectId); await this.diagrams.validateProjectAccess(projectId, client.data.user.id); const elementType = this.elementType(body?.elementType); const elementId = this.elementId(body?.elementId); await this.verifyElement(projectId, elementType, elementId, client.data.user.id);
      return this.collaboration.acquire(projectId, elementType, elementId, client.id, client.data.user);
    });
  }

  @SubscribeMessage('uml:lock:renew')
  async renew(@ConnectedSocket() client: CollaborationSocket, @MessageBody() body: { projectId?: unknown; elementType?: unknown; elementId?: unknown }) { return this.acquire(client, body); }

  @SubscribeMessage('uml:lock:release')
  async release(@ConnectedSocket() client: CollaborationSocket, @MessageBody() body: { projectId?: unknown; elementType?: unknown; elementId?: unknown }) {
    return this.safe(async () => { const projectId = this.projectId(body?.projectId); const released = this.collaboration.release(projectId, this.elementType(body?.elementType), this.elementId(body?.elementId), client.id); return { projectId, released }; });
  }

  private async verifyElement(projectId: string, type: LockElementType, elementId: string, userId: string) {
    const diagram = await this.diagrams.getByProject(projectId, userId); const exists = type === 'UML_CLASS' ? diagram.classes.some(item => item.id === elementId) : diagram.relations.some(item => item.id === elementId);
    if (!exists) throw Object.assign(new Error('Elemento UML inexistente'), { status: 404 });
  }
  private projectId(value: unknown) { if (typeof value !== 'string' || !isUUID(value, '4')) throw Object.assign(new Error('ID de proyecto inválido'), { status: 400 }); return value; }
  private elementId(value: unknown) { if (typeof value !== 'string' || !isUUID(value, '4')) throw Object.assign(new Error('ID de elemento inválido'), { status: 400 }); return value; }
  private elementType(value: unknown): LockElementType { if (value !== 'UML_CLASS' && value !== 'UML_RELATION') throw Object.assign(new Error('Tipo de elemento inválido'), { status: 400 }); return value; }
  private async safe<T>(operation: () => Promise<T>) { try { return { ok: true, data: await operation() }; } catch (error) { const value = error as { getStatus?: () => number; status?: number; message?: string }; return { ok: false, status: value.getStatus?.() ?? value.status ?? 400, message: value.message ?? 'No se pudo completar la operación realtime' }; } }
}
