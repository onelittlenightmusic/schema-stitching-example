import * as fs from 'fs'
import YAML from 'yaml'

interface StarSchemaMetadata {
    root: string
}

interface StarSchemaDefinition {
    type: string
    url: string
    query: string
}

export interface StarSchema {
    name: string
    metadata: StarSchemaMetadata
    definition: StarSchemaDefinition
    join: any[]
}

export const loadConfig = () => {
    var yamlData = fs.readFileSync('./flayql.yaml','utf8');
    var obj = YAML.parse(yamlData);
    var starSchema = <StarSchema[]> obj.schema
    return starSchema
}

