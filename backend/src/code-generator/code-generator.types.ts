export interface GeneratedFile { path: string; content: string }
export interface JavaField { name: string; type: string; visibility: string; annotations: string[]; initializer?: string; umlType?: string }
export interface JavaMethod { name: string; returnType: string; visibility: string }
export interface JavaClassModel { name: string; abstract: boolean; parent?: string; idType: string; fields: JavaField[]; methods: JavaMethod[]; imports: string[] }
export interface GeneratedBackend { projectName: string; files: GeneratedFile[]; classCount: number }
