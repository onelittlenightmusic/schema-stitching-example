import { GraphQLSchema } from 'graphql';
import { loadConfig, StarSchemaTable, StarSchemaLink, getLinkLabel } from './star'
import { createBatchLoader } from './batchLoad'
// import { loadConfig, createConnection } from './star'

// interface ResolverHint {
//     childrenBatchParameter(childrenKeys: string[]): any
// }

export async function generateStarSchema(starYamlFile: string): Promise<GraphQLSchema | null> {
    var starSchemaMap = loadConfig(starYamlFile)
    await starSchemaMap.getAllSchema()

   const createMergeResolver = (link: StarSchemaLink) => {
        return (toTable: StarSchemaTable) => {
            var hint
            if(toTable.definition.type == 'graphql-opencrud') {
                hint = createOpenCRUDHint(link.sameAt)
            }
            // ToDo: create each hint
            const batchingQuery = (child, queryName, array) => {
                var queryParameter = hint.childrenBatchParameter(array)
                var query = child.query[queryName]
                return query(queryParameter)
            }

            const loader = createBatchLoader(toTable.GraphQLSchema, toTable.definition.query, batchingQuery)
            return async (parent: any, args: any, context: any, info: any) => {
                var results = (await loader.load(parent))
                if(link.onlyOne) {
                    return results[0]
                }
                return results
            }
        }
    }
    var resolvers = {}
    starSchemaMap.getRootTable().links.forEach(link => {
        resolvers[getLinkLabel(link)] = createMergeResolver(link)
    })

    return starSchemaMap.createTotalExecutableSchema(resolvers)
}

export const createOpenCRUDHint = (sameAt: {[key:string]: any}) => {
    var keyName = Object.keys(sameAt)[0]
    var childKeyName = sameAt[keyName]
    return {
		childrenBatchParameter: parents => { 
            return { 
                where: { [childKeyName+'_in']: parents.map(parent => parent[keyName]) }
            } 
        }
	}
}

// const getParentKeys = (sameAt: any, parent: any) => {
//     var rtn = {}
//     for(var key in sameAt) {
//         rtn[key] = parent[key]
//     }
//     return rtn
// }