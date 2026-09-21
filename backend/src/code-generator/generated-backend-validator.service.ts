import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import type { GeneratedBackend } from './code-generator.types';

@Injectable()
export class GeneratedBackendValidator {
  async validate(generated: GeneratedBackend): Promise<void> {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'arqnova-generated-'));
    try {
      for (const file of generated.files) {
        const relativePath = normalize(file.path.replace(/^generated-backend[\\/]/, ''));
        const destination = resolve(temporaryRoot, relativePath);
        if (!destination.startsWith(`${resolve(temporaryRoot)}${sep}`)) throw new UnprocessableEntityException('El proyecto generado contiene una ruta inválida');
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, file.content, 'utf8');
      }
      await this.runMaven(temporaryRoot);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  private runMaven(cwd: string): Promise<void> {
    const command = process.env.MAVEN_COMMAND || (process.platform === 'win32' ? 'mvn.cmd' : 'mvn');
    const repository = process.env.MAVEN_REPOSITORY || join(tmpdir(), 'arqnova-maven-repository');
    return new Promise((resolvePromise, reject) => {
      const child = spawn(command, ['-q', `-Dmaven.repo.local=${repository}`, '-DskipTests', 'package'], { cwd, windowsHide: true, shell: process.platform === 'win32' });
      let output = '';
      const collect = (chunk: Buffer) => { output = `${output}${chunk.toString('utf8')}`.slice(-12_000); };
      child.stdout.on('data', collect); child.stderr.on('data', collect);
      const timeout = setTimeout(() => { child.kill(); reject(new UnprocessableEntityException('La compilación Maven del backend generado excedió 180 segundos')); }, 180_000);
      child.once('error', () => { clearTimeout(timeout); reject(new ServiceUnavailableException('Maven no está disponible para validar el backend generado')); });
      child.once('exit', code => {
        clearTimeout(timeout);
        if (code === 0) resolvePromise();
        else if (/no se reconoce|not recognized|not found/i.test(output)) reject(new ServiceUnavailableException('Maven no está disponible para validar el backend generado'));
        else reject(new UnprocessableEntityException(`El backend generado no superó la compilación Maven: ${output.trim() || `código ${code}`}`));
      });
    });
  }
}
