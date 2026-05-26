migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    col.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.updateRule =
      "@request.auth.id != '' && id = @request.auth.company_id && @request.auth.role = 'admin'"
    col.deleteRule =
      "@request.auth.id != '' && id = @request.auth.company_id && @request.auth.role = 'admin'"
    app.save(col)
  },
)
