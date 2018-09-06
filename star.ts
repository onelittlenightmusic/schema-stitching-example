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
    links: any[]
    GraphQLSchema: GraphQLSchema
}

export interface StarSchemaMap {
    tables: StarSchemaTable[]
    getAllSchema(): void
    getRootTable(): StarSchemaTable | undefined
    find(targetName: string): StarSchemaTable | undefined
    schemas(): (GraphQLSchema | string)[]
}

class StarSchemaMapImpl implements StarSchemaMap {
    tables: StarSchemaTable[]
    async getAllSchema() {
        await getAllSchemaPrivate(this.tables)
    }
    getRootTable() {
        return this.tables.find(schema => { return schema.metadata.root })
    }
    find(targetName: string) {
        return this.tables.find(schema => { return schema.name == targetName })
    }
    schemas() {
        var rtn: (GraphQLSchema | string)[] = this.tables.map(schema => schema.GraphQLSchema)
        var root = this.getRootTable()
        if(root == null) {
            return rtn
        }
        // todo: not only root 
        rtn.push(`
            extend type ${root.name} {
                # original
                # locations: [Location],
                # new api (TYPE CHANGE: from array to single object)
                location: Location,
                # location2: Location,
                ${createLinks(root)}
            }
        `)
        return rtn
    }
    constructor(tables: StarSchemaTable[]) {
        this.tables = tables
    }
}

export const loadConfig = (filename: string) => {
    var yamlData = fs.readFileSync(filename,'utf8');
    var obj = YAML.parse(yamlData);
    var starSchema: StarSchemaMap = new StarSchemaMapImpl(<StarSchemaTable[]> obj.schema)
    return starSchema
}

const createSchema = async (schema: StarSchemaTable) => {
    return await createRemoteSchema(schema.definition.url) 
}

const getAllSchemaPrivate = async (starSchemas: StarSchemaTable[]) => {
    await Promise.all(
        starSchemas.map(async schema => { schema.GraphQLSchema = await createSchema(schema) })
    )
}

const toType = (type: string, onlyOne: string | boolean) => {
    if(onlyOne == 'true' || onlyOne == true) {
        return type
    }
    return `[${type}]`
}



export const createLinks = (starSchema: StarSchemaTable ) => {
    // todo: use schema
    var rtn = starSchema.links.map(jo => { return `${jo.as}: ${toType(jo.to, jo.onlyOne)}` }).join('\n')
    console.log(rtn)
    return rtn
}

export const createResolver = (starSchema: StarSchemaTable, mergeResolver: any) => {
    var rtn = {}
    var name = starSchema.name
    for(var jo of starSchema.links) {
        var fragment = `fragment ${name}Fragment on ${name} {${Object.keys(jo.sameAt).join(',')}}`
        // var fieldName = query
        var resolve = async (parent: any, args: any, context: any, info: any) => {
            return await (mergeResolver(jo.sameAt)(parent, args, context, info))
            
        }
        var resolver = {
            fragment,
            resolve
        }
        rtn[jo.as] = resolver
    }
    console.log(rtn)

    return rtn
}

