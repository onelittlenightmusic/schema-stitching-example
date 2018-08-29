import { Binding } from 'graphql-binding'
import { GraphQLSchema } from 'graphql';
import * as DataLoader from 'dataloader'

const createBinding = (newSchema: GraphQLSchema) => {
    return new Binding ({ schema: newSchema })
}

type BatchQuery = (keys: string[]) => Promise<any[]>

export const batchLoader = (schema: GraphQLSchema, handler: (binding: any, keys: any)=>any) => {
    const binding = createBinding(schema)

    const batchQuery: BatchQuery = async keys => {
        const answers = await handler(binding, keys)
        const answerMap: { [key: string]: any[] } = {}
        // create map for sorting answers by keys.
        answers.forEach(element => {
            if(answerMap[element.address] == null) {
                answerMap[element.address] = []
            }
            answerMap[element.address].push(element)
        })
        return keys.map(key => answerMap[key])
    }

    return new DataLoader<string, any[]>(batchQuery);

}