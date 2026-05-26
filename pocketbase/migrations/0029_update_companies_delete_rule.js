migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('companies')
    collection.deleteRule =
      "@request.auth.id != '' && id = @request.auth.company_id && @request.auth.role = 'admin'"
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('companies')
    collection.deleteRule = null
    app.save(collection)
  },
)
