export enum SystemRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  ANFITRION = 'ANFITRION',
  COLABORADOR = 'COLABORADOR',
}

export const INITIAL_ROLES = [
  { name: SystemRole.ADMINISTRADOR, description: 'Administrador del sistema ARQNOVA' },
  { name: SystemRole.ANFITRION, description: 'Anfitrión de ARQNOVA' },
  { name: SystemRole.COLABORADOR, description: 'Colaborador de ARQNOVA' },
] as const;
