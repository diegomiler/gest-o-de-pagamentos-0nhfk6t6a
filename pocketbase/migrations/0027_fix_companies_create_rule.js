migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('companies')
    collection.createRule = "@request.auth.id != ''"
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('companies')
    collection.createRule = null
    app.save(collection)
  },
)
