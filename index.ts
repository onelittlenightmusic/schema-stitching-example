import { GraphQLServer } from 'graphql-yoga'
import { makeRemoteExecutableSchema, mergeSchemas, introspectSchema } from 'graphql-tools'
// import { HttpLink } from 'apollo-link-http'
import { BatchHttpLink } from 'apollo-link-batch-http'
// import { HTTPLinkDataloader } from 'http-link-dataloader' // not applicable
import { DedupLink } from 'apollo-link-dedup'
import { Binding } from 'graphql-binding'
import fetch from 'node-fetch'	
import { config } from 'dotenv'
import * as DataLoader from 'dataloader'
config()
const __API_PORT__ = process.env.API_PORT

async function run() {
	const createRemoteSchema = async (uri: string) => {
		// const link = new HttpLink({uri, fetch})
		// const link = new DedupLink().concat(new HttpLink({uri, fetch}))
		const link = new DedupLink().concat(new BatchHttpLink({uri, fetch}))
		// const link = new  HTTPLinkDataloader({uri})
		return makeRemoteExecutableSchema({
			schema: await introspectSchema(link),
			link,
		});
	}
		
	const userSchema = await createRemoteSchema('http://localhost:4020')
	const locationSchema = await createRemoteSchema('http://localhost:4021')
	const linkSchemaDefs = `
		extend type User {
			# original
			locations: [Location],
			# new api (TYPE CHANGE: from array to single object)
			location: Location,
			location2: Location
		}

		extend type Location {
			# SCHEMA CHANGE: field added 
			location_type: String
		}
	`

	class LocationBinding extends Binding {
		constructor() {
			super({ schema: locationSchema })
		}
	}
	const locationBinding = new LocationBinding()

	type BatchLocation = (addresses: string[]) => Promise<any[]>

	const batchLocations: BatchLocation = async addresses => {
		const locations = await locationBinding.query.locations({ where: {address_in: addresses}})
		const locationMap: { [key: string]: any } = {}
		// return locations.
		locations.forEach(element => {
			locationMap[element.address] = element;
		});
		return addresses.map(address => locationMap[address])
	}

	const batchLoader = new DataLoader<string, any>(batchLocations);

	const schema = mergeSchemas({
		schemas: [userSchema, locationSchema, linkSchemaDefs],
		resolvers: {
			User: {
				// original
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
				// new api
				location: {
					fragment: `fragment UserFragment on User {address}`,
					resolve: async (parent: any, args: any, context: any, info: any) => {
						let locations = await locationBinding.query.locations({where: {address: parent.address}}, info)
						return {
							...locations[0],
							// add new field
							location_type: "LARGE-CITY"
						}
					}
				},
				location2: {
					fragment: `fragment UserFragment on User {address}`,
					resolve: async (parent: any, args: any, context: any, info: any) => {
						let location = await batchLoader.load(<string>parent.address)
						return {
							...location,
							// add new field
							location_type: "LARGE-CITY"
						}
					}
				}
			}
		}
	})

	// const logInput = async (resolve, root, args, context, info) => {
	// 	// console.log(`>>>logInput: ${JSON.stringify(root)},${JSON.stringify(args)}`)
	// 	const result = await resolve(root, args, context, info)
	// 	console.log(`${JSON.stringify(root)},${JSON.stringify(args)} \n >>> ${JSON.stringify(result)}`)
	// 	return result
	// }

	const server = new GraphQLServer({ 
		schema, 
		// middlewares: [logInput
		// 	// {
		// 	// 	Query: {
		// 	// 		users: logInput,
		// 	// 	}
		// 	// }
		// ]
	})
	server.start({port: __API_PORT__}, () =>
		console.log(`Your GraphQL server is running now ...`),
	)
}

run()
