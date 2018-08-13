# schema-stitching-example
Example of Schema Stitching with GraphQL

# Example

Type `User` is [here](https://github.com/onelittlenightmusic/prisma-binding-typescript-sample/blob/96ebb87e5d281c7ccef3a55c6dd1963e9c220cf6/prisma/datamodel.graphql)

```
type User {
  id: ID! @unique
  name: String!
  address: String!
}
```

Type `Location` is [here](https://github.com/onelittlenightmusic/prisma-binding-typescript-sample/blob/4eff120b6106e992358bd78dac767802ba9d320e/prisma/datamodel.graphql)

```
type Location {
  address: String!
  country: String!
}
```

View [index.ts](./index.ts).

In `mergeSchemas`, 

```
location: {
    fragment: `fragment LocationFragment on Location {address}`,
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