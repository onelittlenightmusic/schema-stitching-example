import { Binding } from 'graphql-binding'
import * as DataLoader from 'dataloader'
import { GraphQLSchema } from 'graphql';
import { createRemoteSchema } from './createRemoteSchema'
import { mergeSchemas } from 'graphql-tools'
import { loadConfig } from './star'

export async function star(): Promise<GraphQLSchema> {
    var starSchema = loadConfig()
    // console.log( yamlconfig.schema[1]['definition']['url'] )

    // var linkSchemas: GraphQLSchema[] = []
    // for(var schema of starSchema) {
    //     linkSchemas.push(await createRemoteSchema(schema.definition.url))
    // }
    var linkSchemas: GraphQLSchema[] = await Promise.all(
        starSchema.map(async schema => {
            return await createRemoteSchema(schema.definition.url) 
        })
    )
    const locationSchema: GraphQLSchema = linkSchemas[1]
    
    var linkSchemaDef: (GraphQLSchema | string)[] = linkSchemas
	linkSchemaDef.push(`
		extend type User {
			# original
			locations: [Location],
			# new api (TYPE CHANGE: from array to single object)
			location: Location,
			location2: Location
		}
	`)
	const createBinding = (newSchema: GraphQLSchema) => {
		return new Binding ({ schema: newSchema })
	}
	const locationBinding = createBinding(locationSchema)

	type BatchLocation = (addresses: string[]) => Promise<any[]>

	const batchLocations: BatchLocation = async addresses => {
		const locations = await locationBinding.query.locations({ where: {address_in: addresses}})
		const locationMap: { [key: string]: any[] } = {}
		// return locations.
		locations.forEach(element => {
            if(locationMap[element.address] == null) {
                locationMap[element.address] = []
            }
			locationMap[element.address].push(element)
		})
		return addresses.map(address => locationMap[address])
	}

	const batchLoader = new DataLoader<string, any[]>(batchLocations);

	return mergeSchemas({
		schemas: linkSchemas,
		resolvers: {
			User: {
				locations: {
					fragment: `fragment UserFragment on User {address}`,
					resolve: async (parent: any, args: any, context: any, info: any) => {
						return info.mergeInfo.delegateToSchema({
							schema: locationSchema,
							operation: 'query',
							fieldName: 'locations',
							args: {where: {address: parent.address}},
							context,
							info
						})
					}
				},
				location: {
					fragment: `fragment UserFragment on User {address}`,
					resolve: async (parent: any, args: any, context: any, info: any) => {
						let locations = await locationBinding.query.locations({where: {address: parent.address}}, info)
						return locations[0]
					}
				},
				location2: {
					fragment: `fragment UserFragment on User {address}`,
					resolve: async (parent: any, args: any, context: any, info: any) => {
						return (await batchLoader.load(<string>parent.address))[0]
					}
				}
			}
		}
	})


}
