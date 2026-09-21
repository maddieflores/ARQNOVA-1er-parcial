import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { UmlRelationType, UmlVisibility } from '@prisma/client';
import JSZip from 'jszip';
import { DiagramsService } from '../uml/diagrams.service';
import type { GeneratedBackend, GeneratedFile, JavaClassModel, JavaField } from './code-generator.types';
import { controllerTemplate, dtoTemplate, entityTemplate, exceptionHandlerTemplate, repositoryTemplate, serviceTemplate } from './templates/java.templates';
import { applicationTemplate, pomTemplate, propertiesTemplate } from './templates/project.templates';
import { GeneratedBackendValidator } from './generated-backend-validator.service';

const ROOT = 'generated-backend/';
const JAVA_ROOT = `${ROOT}src/main/java/com/arqnova/generated/`;

@Injectable()
export class CodeGeneratorService {
  constructor(private readonly diagrams: DiagramsService, private readonly validator: GeneratedBackendValidator) {}

  async generate(projectId: string, userId: string): Promise<GeneratedBackend> {
    const diagram = await this.diagrams.getByProject(projectId, userId);
    if (!diagram.classes.length) throw new BadRequestException('El diagrama no contiene clases para generar');
    const names = new Map(diagram.classes.map(item => [item.id, this.className(item.name)]));
    if (new Set(names.values()).size !== names.size) throw new ConflictException('Existen nombres de clase incompatibles para Java');
    const models = diagram.classes.map(umlClass => this.toJavaModel(umlClass, diagram.relations, names));
    const artifactId = this.artifactId(diagram.name);
    const files: GeneratedFile[] = [
      { path: `${ROOT}pom.xml`, content: pomTemplate(artifactId) },
      { path: `${JAVA_ROOT}GeneratedBackendApplication.java`, content: applicationTemplate },
      { path: `${JAVA_ROOT}error/GlobalExceptionHandler.java`, content: exceptionHandlerTemplate },
      { path: `${ROOT}src/main/resources/application.properties`, content: propertiesTemplate },
      { path: `${ROOT}README.md`, content: `# ${diagram.name}\n\nBackend Spring Boot generado y compilado por ARQNOVA. Requiere Java 21, Maven 3.9+ y PostgreSQL.\n\n## Configuración\n\nDefine \`DB_URL\`, \`DB_USER\` y \`DB_PASSWORD\`. Los valores predeterminados apuntan a \`jdbc:postgresql://localhost:5432/generated_backend\`.\n\n## Verificación y ejecución\n\n\`\`\`bash\nmvn test\nmvn spring-boot:run\n\`\`\`\n\nLa API REST se publica bajo \`/api/<entidad>\`. Las entidades incluyen validaciones básicas y los errores de recurso inexistente o datos inválidos tienen respuestas HTTP controladas.\n` },
    ];
    for (const model of models) files.push(
      { path: `${JAVA_ROOT}model/${model.name}.java`, content: entityTemplate(model) },
      { path: `${JAVA_ROOT}repository/${model.name}Repository.java`, content: repositoryTemplate(model.name, model.idType) },
      { path: `${JAVA_ROOT}service/${model.name}Service.java`, content: serviceTemplate(model.name, model.idType) },
      { path: `${JAVA_ROOT}controller/${model.name}Controller.java`, content: controllerTemplate(model.name, model.idType) },
      { path: `${JAVA_ROOT}dto/${model.name}Dto.java`, content: dtoTemplate(model) },
    );
    return { projectName: artifactId, files, classCount: models.length };
  }

  async generateZip(projectId: string, userId: string) {
    const generated = await this.generateValidated(projectId, userId); const zip = new JSZip();
    for (const file of generated.files) zip.file(file.path, file.content);
    return { filename: 'generated-backend.zip', buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }) };
  }

  async generateValidated(projectId: string, userId: string) {
    const generated = await this.generate(projectId, userId);
    await this.validator.validate(generated);
    return generated;
  }

  private toJavaModel(umlClass: any, relations: any[], names: Map<string, string>): JavaClassModel {
    const name = names.get(umlClass.id)!; const classNames = new Set(names.values()); const imports = new Set<string>();
    const inheritance = relations.find(relation => relation.type === 'INHERITANCE' && relation.sourceClassId === umlClass.id);
    const fields: JavaField[] = []; const used = new Set<string>();
    let primary = umlClass.attributes.find((attribute: any) => attribute.isPrimaryKey) ?? umlClass.attributes.find((attribute: any) => this.fieldName(attribute.name) === 'id');
    if (!inheritance && !primary) { fields.push({ name: 'id', type: 'Long', visibility: 'private', annotations: ['@Id', '@GeneratedValue(strategy = GenerationType.IDENTITY)'] }); used.add('id'); }
    for (const attribute of umlClass.attributes) { const field = this.fieldName(attribute.name); if (used.has(field)) throw new ConflictException(`La clase ${name} contiene campos incompatibles para Java`); used.add(field); const mapped = this.javaType(attribute.type, classNames); for (const value of mapped.imports) imports.add(value); const annotations = attribute === primary && !inheritance ? ['@Id'] : []; annotations.push(mapped.type === 'String' ? '@NotBlank' : '@NotNull'); imports.add(mapped.type === 'String' ? 'jakarta.validation.constraints.NotBlank' : 'jakarta.validation.constraints.NotNull'); fields.push({ name: field, type: mapped.type, visibility: this.visibility(attribute.visibility), annotations, umlType: mapped.original }); }
    for (const relation of relations.filter(relation => relation.sourceClassId === umlClass.id && relation.type !== 'INHERITANCE')) { const target = names.get(relation.targetClassId); if (!target) continue; const fieldBase = this.fieldName(relation.label || target); const many = this.isMany(relation.targetMultiplicity); const field = many ? `${fieldBase}List` : fieldBase; if (used.has(field)) throw new ConflictException(`La clase ${name} contiene relaciones incompatibles para Java`); used.add(field); const annotations: string[] = []; let type = target; let initializer: string | undefined;
      if (relation.type === 'DEPENDENCY') annotations.push('@Transient'); else if (many) { annotations.push(relation.type === 'COMPOSITION' ? '@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)' : '@OneToMany'); type = `List<${target}>`; initializer = 'new ArrayList<>()'; imports.add('java.util.List'); imports.add('java.util.ArrayList'); } else annotations.push(relation.type === 'COMPOSITION' ? '@ManyToOne(cascade = CascadeType.ALL)' : '@ManyToOne');
      fields.push({ name: field, type, visibility: 'private', annotations, initializer });
    }
    const methods = umlClass.methods.map((method: any) => { const mapped = this.javaType(method.returnType, classNames); for (const value of mapped.imports) imports.add(value); return { name: this.fieldName(method.name), returnType: mapped.type, visibility: this.visibility(method.visibility) || 'public' }; });
    this.assertUnique(methods.map((method: any) => method.name), `La clase ${name} contiene métodos incompatibles para Java`);
    const idField = fields.find(field => field.annotations.includes('@Id')); const idType = inheritance ? 'Long' : idField?.type ?? 'Long';
    return { name, abstract: umlClass.isAbstract, parent: inheritance ? names.get(inheritance.targetClassId) : undefined, idType, fields, methods, imports: [...imports] };
  }

  private javaType(value: string, classNames: Set<string>) { const normalized = value.trim().toLowerCase(); const types: Record<string, [string, string?]> = { string: ['String'], long: ['Long'], integer: ['Integer'], int: ['Integer'], double: ['Double'], float: ['Float'], decimal: ['BigDecimal', 'java.math.BigDecimal'], bigdecimal: ['BigDecimal', 'java.math.BigDecimal'], boolean: ['Boolean'], bool: ['Boolean'], date: ['LocalDate', 'java.time.LocalDate'], datetime: ['LocalDateTime', 'java.time.LocalDateTime'], uuid: ['UUID', 'java.util.UUID'], void: ['void'] }; const known = types[normalized]; if (known) return { type: known[0], imports: known[1] ? [known[1]] : [], original: undefined }; const candidate = this.className(value); if (classNames.has(candidate)) return { type: candidate, imports: [], original: undefined }; return { type: 'String', imports: [], original: value }; }
  private visibility(value: UmlVisibility) { return value === 'PUBLIC' ? 'public' : value === 'PROTECTED' ? 'protected' : value === 'PACKAGE' ? '' : 'private'; }
  private isMany(value: string) { return value === '*' || value.endsWith('..*') || (/^\d+\.\.\d+$/.test(value) && Number(value.split('..')[1]) > 1); }
  private className(value: string) { const words = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean); const result = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(''); if (!result) throw new BadRequestException('Existe una clase sin nombre Java válido'); return /^\d/.test(result) ? `Class${result}` : result; }
  private fieldName(value: string) { const name = this.className(value); const result = name.charAt(0).toLowerCase() + name.slice(1); return ['class', 'public', 'private', 'protected', 'void', 'null', 'new', 'return', 'extends'].includes(result) ? `${result}Value` : result; }
  private artifactId(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'generated-backend'; }
  private assertUnique(values: string[], message: string) { if (new Set(values).size !== values.length) throw new ConflictException(message); }
}
