migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('employees')

    collection.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    collection.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    collection.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    collection.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)"
    collection.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || (company_id = @request.auth.company_id && @request.auth.role != 'editor'))"

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('employees')

    collection.listRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    collection.viewRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    collection.createRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    collection.updateRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    collection.deleteRule =
      "@request.auth.id != '' && company_id = @request.auth.company_id && @request.auth.role != 'editor'"

    app.save(collection)
  },
)
