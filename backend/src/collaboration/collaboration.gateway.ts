import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
// CORS se configura en el adaptador central al iniciar la aplicación.
@WebSocketGateway({ namespace: '/collaboration' })
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CollaborationGateway.name);
  handleConnection(client: Socket) { this.logger.log(`Cliente conectado: ${client.id}`); }
  handleDisconnect(client: Socket) { this.logger.log(`Cliente desconectado: ${client.id}`); }
}
