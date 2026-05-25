migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('companies')
    collection.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.company_id)"
    collection.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.company_id)"
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('companies')
    collection.listRule = "@request.auth.id != '' && id = @request.auth.company_id"
    collection.viewRule = "@request.auth.id != '' && id = @request.auth.company_id"
    app.save(collection)
  },
)
