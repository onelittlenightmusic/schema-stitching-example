import { GraphQLSchema } from 'graphql';
import { loadConfig } from './star'
import { createBatchLoader } from './batchLoad'
// import { loadConfig, createConnection } from './star'

export async function generateStarSchema(starYamlFile: string, targetChildName: string): Promise<GraphQLSchema | null> {
    var starSchemaMap = loadConfig(starYamlFile)
    await starSchemaMap.getAllSchema()

    const childTable = starSchemaMap.find(targetChildName)
    if(childTable == null) {
        return null
    }

    // var linkSchemaDef = starSchemaMap.schemas()

    const batchLocationResolver = (childBinding, queryName, keys) => {
        var queryParameter = { where: {address_in: keys}}
        var query = childBinding.query[queryName]
        return query(queryParameter)
    }
    const batchLocationLoader = createBatchLoader(childTable.GraphQLSchema, childTable.definition.query, batchLocationResolver)
    const mergeResolver = (where: any) =>  {
        return async (parent: any, args: any, context: any, info: any) => {
            return (await batchLocationLoader.load(<string>parent.address))[0]
            // return (await batchLocationLoader.load(<string>parent.address))
        }
    }
    var resolvers = { location2: mergeResolver }

    return starSchemaMap.createTotalExecutableSchema(resolvers)


}
