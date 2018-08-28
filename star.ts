import * as fs from 'fs'
import YAML from 'yaml'
import { GraphQLSchema } from 'graphql'

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

export const createConnection = (starSchema: StarSchema) => {
    var rtn = ''
    for(var jo of starSchema.join) {
        rtn += `${jo.label}: ${jo.type},`
        // for(var key in jo.) {
        //     rtn += `${key}: ${starSchema.join[key]}\n`
        // }
    }
    console.log(rtn)
    return rtn
}

export const createResolver = (starSchema: StarSchema, schema: GraphQLSchema, obj: any) => {
    var rtn = obj
    for(var jo of starSchema.join) {
        var fragmentword: string[] = []
        for(var wherekey in jo.where) {
            fragmentword.push(wherekey)
        }
        var resolver = {
            fragment: `fragment UserFragment on ${starSchema.name} {${fragmentword.join(',')}}`,
            resolve: async (parent: any, args: any, context: any, info: any) => {
                var joinkeyword = {}
                for(var wherekey in jo.where) {
                    joinkeyword[wherekey] = parent[jo.where[wherekey]]
                }
                return info.mergeInfo.delegateToSchema({
                    schema: schema,
                    operation: 'query',
                    fieldName: jo.query,
                    args: { where: joinkeyword },
                    context,
                    info
                })
            }
        }
        rtn[jo.label] = resolver
    }
    console.log(rtn)

    return rtn
}

