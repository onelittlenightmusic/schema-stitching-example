import * as fs from 'fs'
import YAML from 'yaml'
import { GraphQLSchema } from 'graphql'
import { createRemoteSchema } from './createRemoteSchema'

interface StarSchemaMetadata {
    root: boolean
}

interface StarSchemaDefinition {
    type: string
    url: string
    query: string
}

export interface StarSchemaTable {
    name: string
    metadata: StarSchemaMetadata
    definition: StarSchemaDefinition
    join: any[]
    GraphQLSchema: GraphQLSchema
}

export const loadConfig = (filename: string) => {
    var yamlData = fs.readFileSync(filename,'utf8');
    var obj = YAML.parse(yamlData);
    var starSchema = <StarSchemaTable[]> obj.schema
    return starSchema
}

const createSchema = async (schema: StarSchemaTable) => {
    return await createRemoteSchema(schema.definition.url) 
}

export const getAllSchema = async (starSchemas: StarSchemaTable[]) => {
    await Promise.all(
        starSchemas.map(async schema => { schema.GraphQLSchema = await createSchema(schema) })
    )
}

export const createConnection = (starSchema: StarSchemaTable ) => {
    var rtn = starSchema.join.map(jo => { return `${jo.label}: ${jo.type},` }).join('\n')
    console.log(rtn)
    return rtn
}

export const createResolver = (starSchema: StarSchemaTable, mergeResolver: any) => {
    var rtn = {}
    for(var jo of starSchema.join) {
        var fragment = `fragment UserFragment on ${starSchema.name} {${Object.keys(jo.where).join(',')}}`
        // var fieldName = query
        var resolve = async (parent: any, args: any, context: any, info: any) => {
            return await (mergeResolver(jo.where)(parent, args, context, info))
            
        }
        var resolver = {
            fragment,
            resolve
        }
        rtn[jo.label] = resolver
    }
    console.log(rtn)

    return rtn
}

