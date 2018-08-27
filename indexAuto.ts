import { GraphQLServer } from 'graphql-yoga'
import { star } from './schemagen'
import { config } from 'dotenv'
config()
const __API_PORT__ = process.env.API_PORT

async function run() {
	const schema = await star()
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
