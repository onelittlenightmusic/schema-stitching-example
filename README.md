# schema-stitching-example
Example of Schema Stitching with GraphQL

# Simple example

Type `User` is [here](https://github.com/onelittlenightmusic/prisma-binding-typescript-sample/blob/96ebb87e5d281c7ccef3a55c6dd1963e9c220cf6/prisma/datamodel.graphql)

```GraphQL
type User {
  id: ID! @unique
  name: String!
  address: String!
}
```

Type `Location` is [here](https://github.com/onelittlenightmusic/prisma-binding-typescript-sample/blob/4eff120b6106e992358bd78dac767802ba9d320e/prisma/datamodel.graphql)

```GraphQL
type Location {
  address: String!
  country: String!
}
```

View [indexSimple.ts](./indexSimple.ts).

In `mergeSchemas`, 

```ts
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
        }
    })
})
```

## Advanced example

You can customize API schema with `graphql-binding`.

View [index.ts](./index.ts).

```ts
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
}
```

## Result

![](2018-08-13-10-47-17.png)