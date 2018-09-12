import { Binding } from 'graphql-binding'
import { GraphQLSchema } from 'graphql';
import * as DataLoader from 'dataloader'

type BatchLoaderOperation = (parameterArray: any[]) => Promise<any[]>
type BatchingQuery = (binding: any, query: string, loaderParameters: any) => any

const createBinding = (newSchema: GraphQLSchema) => {
    return new Binding ({ schema: newSchema })
}

export const createBatchLoader = (schema: GraphQLSchema, query: string, batchingQuery: BatchingQuery) => {
    const binding = createBinding(schema)

    const batchLoaderOperation: BatchLoaderOperation = async parameterArray => {
        const answers = await batchingQuery(binding, query, parameterArray)
        return sortByKey(answers, 'address', parameterArray.map(parent => parent.address))
    }

    return new DataLoader<any, any[]>(batchLoaderOperation);

}

const sortByKey = (array: any[], keyName: string, keyArray: string[]) => {
    var arraySortMap: { [key: string]: any[] } = {}
    array.forEach(element => {
        if(arraySortMap[element[keyName]] == null) {
            arraySortMap[element[keyName]] = []
        }
        arraySortMap[element[keyName]].push(element)
    })
    return keyArray.map(key => arraySortMap[key])
}