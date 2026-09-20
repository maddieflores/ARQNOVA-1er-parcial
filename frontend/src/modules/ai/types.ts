export type AiVisibility = 'PUBLIC' | 'PRIVATE' | 'PROTECTED' | 'PACKAGE'
export type AiRelationType = 'ASSOCIATION' | 'AGGREGATION' | 'COMPOSITION' | 'INHERITANCE' | 'DEPENDENCY'

export interface AiUmlAttribute { name: string; type: string; visibility: AiVisibility; isPrimaryKey?: boolean }
export interface AiUmlMethod { name: string; returnType: string; visibility: AiVisibility }
export interface AiUmlClass { name: string; attributes: AiUmlAttribute[]; methods: AiUmlMethod[] }
export interface AiUmlRelation { sourceClassName: string; targetClassName: string; type: AiRelationType; sourceMultiplicity?: string; targetMultiplicity?: string; label?: string }
export interface AiUmlProposal { classes: AiUmlClass[]; relations: AiUmlRelation[] }
