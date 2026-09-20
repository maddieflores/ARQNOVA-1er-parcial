import type { JavaClassModel, JavaField } from '../code-generator.types';

const indent = (value: string, spaces = 4) => value.split('\n').map(line => `${' '.repeat(spaces)}${line}`).join('\n');
const capital = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function entityTemplate(model: JavaClassModel) {
  const imports = [...new Set(['jakarta.persistence.*', 'lombok.Getter', 'lombok.NoArgsConstructor', 'lombok.Setter', ...model.imports])].sort().map(value => `import ${value};`).join('\n');
  const fields = model.fields.map(fieldTemplate).join('\n\n');
  const methods = model.methods.map(method => `${method.visibility} ${method.returnType} ${method.name}() {\n        throw new UnsupportedOperationException("Implementar operación UML: ${method.name}");\n    }`).join('\n\n');
  return `package com.arqnova.generated.model;

${imports}

@Entity
@Getter
@Setter
@NoArgsConstructor
public ${model.abstract ? 'abstract ' : ''}class ${model.name}${model.parent ? ` extends ${model.parent}` : ''} {
${indent(fields)}${methods ? `\n\n${indent(methods)}` : ''}
}
`;
}

function fieldTemplate(field: JavaField) { return `${field.annotations.join('\n')}\n${field.umlType ? `// UML type: ${field.umlType}\n` : ''}${field.visibility}${field.visibility ? ' ' : ''}${field.type} ${field.name}${field.initializer ? ` = ${field.initializer}` : ''};`; }

export const repositoryTemplate = (name: string, idType: string) => `package com.arqnova.generated.repository;

import com.arqnova.generated.model.${name};
import org.springframework.data.jpa.repository.JpaRepository;

public interface ${name}Repository extends JpaRepository<${name}, ${idType}> {}
`;

export const serviceTemplate = (name: string, idType: string) => `package com.arqnova.generated.service;

import com.arqnova.generated.model.${name};
import com.arqnova.generated.repository.${name}Repository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ${name}Service {
    private final ${name}Repository repository;
    public ${name}Service(${name}Repository repository) { this.repository = repository; }
    public List<${name}> findAll() { return repository.findAll(); }
    public ${name} findById(${idType} id) { return repository.findById(id).orElseThrow(); }
    public ${name} save(${name} value) { return repository.save(value); }
    public void delete(${idType} id) { repository.deleteById(id); }
}
`;

export const controllerTemplate = (name: string, idType: string) => `package com.arqnova.generated.controller;

import com.arqnova.generated.model.${name};
import com.arqnova.generated.service.${name}Service;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/${name.toLowerCase()}")
public class ${name}Controller {
    private final ${name}Service service;
    public ${name}Controller(${name}Service service) { this.service = service; }
    @GetMapping public List<${name}> findAll() { return service.findAll(); }
    @GetMapping("/{id}") public ${name} findById(@PathVariable ${idType} id) { return service.findById(id); }
    @PostMapping public ${name} create(@RequestBody ${name} value) { return service.save(value); }
    @PutMapping("/{id}") public ${name} update(@PathVariable ${idType} id, @RequestBody ${name} value) { return service.save(value); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable ${idType} id) { service.delete(id); return ResponseEntity.noContent().build(); }
}
`;

export const dtoTemplate = (model: JavaClassModel) => `package com.arqnova.generated.dto;

import lombok.Data;
${model.imports.map(value => `import ${value};`).join('\n')}

@Data
public class ${model.name}Dto {
${indent(model.fields.filter(field => !field.annotations.some(annotation => annotation.startsWith('@One') || annotation.startsWith('@Many') || annotation === '@Transient')).map(field => `private ${field.type} ${field.name};`).join('\n'))}
}
`;
