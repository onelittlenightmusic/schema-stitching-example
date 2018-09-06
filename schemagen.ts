import { GraphQLSchema } from 'graphql';
import { mergeSchemas } from 'graphql-tools'
import { loadConfig, createResolver } from './star'
import { createBatchLoader } from './batchLoad'
// import { loadConfig, createConnection } from './star'

export async function generateStarSchema(starYamlFile: string, targetChildName: string): Promise<GraphQLSchema | null> {
    var starSchemaMap = loadConfig(starYamlFile)
    await starSchemaMap.getAllSchema()

    var rootTable = starSchemaMap.getRootTable()
    if(rootTable == null) {
        return null
    }

    const childTable = starSchemaMap.find(targetChildName)
    if(childTable == null) {
        return null
    }

    var linkSchemaDef = starSchemaMap.schemas()

    const childSchema: GraphQLSchema = childTable.GraphQLSchema
    const batchLocationResolver = (locationBinding, keys) => {
        var queryName = childTable.definition.query
        var queryParameter = { where: {address_in: keys}}
        var query = locationBinding.query[queryName]
        return query(queryParameter)
    }
    const batchLocationLoader = createBatchLoader(childSchema, batchLocationResolver)
    const mergeResolver = (where: any) =>  {
        return async (parent: any, args: any, context: any, info: any) => {
            return (await batchLocationLoader.load(<string>parent.address))[0]
            // return (await batchLocationLoader.load(<string>parent.address))
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
