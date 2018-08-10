import { GraphQLServer } from 'graphql-yoga'
import { makeRemoteExecutableSchema, mergeSchemas, introspectSchema } from 'graphql-tools'
import { createHttpLink } from 'apollo-link-http'
import { Binding } from 'graphql-binding'
import fetch from 'node-fetch'
import { config } from 'dotenv'
config()
const __API_PORT__ = process.env.API_PORT

async function run() {
	const createRemoteSchema = async (uri: string) => {
		const link = createHttpLink({uri, fetch})
		return makeRemoteExecutableSchema({
			schema: await introspectSchema(link),
			link,
		});
	}
		
	const userSchema = await createRemoteSchema('http://localhost:4020')
	const locationSchema = await createRemoteSchema('http://localhost:4021')
	const linkSchemaDefs = `
		extend type User {
			locations: [Location],
			location: Location
		}
	`

	class LocationBinding extends Binding {
		constructor() {
			super({ schema: locationSchema })
		}
	}
	const locationBinding = new LocationBinding()

	const schema = mergeSchemas({
		schemas: [userSchema, locationSchema, linkSchemaDefs],
		resolvers: () => ({
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
						const locations = await locationBinding.query.locations({where: {address: parent.address}}, info)
						return locations[0]
					}
				}
			}
		})
	})

	const server = new GraphQLServer({ schema	})
	server.start({port: __API_PORT__}, () =>
		console.log(`Your GraphQL server is running now ...`),
	)
}

run()
