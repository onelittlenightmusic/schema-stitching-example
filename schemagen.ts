import { GraphQLSchema } from 'graphql';
import { mergeSchemas } from 'graphql-tools'
import { loadConfig, createConnection, createResolver, getAllSchema } from './star'
import { batchLoader } from './batchLoad'
// import { loadConfig, createConnection } from './star'

export async function generateStarSchema(starYamlFile: string, targetChildName: string): Promise<GraphQLSchema | null> {
    var starSchemaTables = loadConfig(starYamlFile)
    await getAllSchema(starSchemaTables)

    var rootTable = starSchemaTables.find(schema => { return schema.metadata.root })
    if(rootTable == null) {
        return null
    }

    const childTable = starSchemaTables.find(schema => { return schema.name == targetChildName })
    if(childTable == null) {
        return null
    }
    const childSchema: GraphQLSchema = childTable.GraphQLSchema
    
    var linkSchemaDef: (GraphQLSchema | string)[] = starSchemaTables.map(schema => schema.GraphQLSchema)
	linkSchemaDef.push(`
		extend type User {
			# original
			# locations: [Location],
			# new api (TYPE CHANGE: from array to single object)
			location: Location,
			# location2: Location,
            ${createConnection(rootTable)}
		}
	`)

    const batchResolver = (locationBinding, keys) => {
        var query = locationBinding.query[childTable.definition.query]
        return query({ where: {address_in: keys}})
    }
    const batchLocationLoader = batchLoader(childSchema, batchResolver)
    const mergeResolver = (where: any) =>  {
        return async (parent: any, args: any, context: any, info: any) => {
            return (await batchLocationLoader.load(<string>parent.address))[0]
        }
    }

	var mergeSchemaArg = {
		schemas: linkSchemaDef,
		resolvers: {
			User: {
				location: {
					fragment: `fragment UserFragment on User {address}`,
					resolve: async (parent: any, args: any, context: any, info: any) => {
						return (await batchLocationLoader.load(<string>parent.address))[0]
					}
				}
			}
		}
    }

    Object.assign(mergeSchemaArg.resolvers.User, createResolver(rootTable, mergeResolver))
    return mergeSchemas(mergeSchemaArg)


}
