import { makeRemoteExecutableSchema, introspectSchema } from 'graphql-tools'
// import { HttpLink } from 'apollo-link-http'
import { BatchHttpLink } from 'apollo-link-batch-http'
// import { HTTPLinkDataloader } from 'http-link-dataloader' // not applicable
import { DedupLink } from 'apollo-link-dedup'
import fetch from 'node-fetch'

export const createRemoteSchema = async (uri: string) => {
    // const link = new HttpLink({uri, fetch})
    // const link = new DedupLink().concat(new HttpLink({uri, fetch}))
    const link = new DedupLink().concat(new BatchHttpLink({uri, fetch}))
    // const link = new  HTTPLinkDataloader({uri})
    return makeRemoteExecutableSchema({
        schema: await introspectSchema(link),
        link,
    });
}
