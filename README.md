# schema-stitching-example
Example of Schema Stitching with GraphQL

# Example

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