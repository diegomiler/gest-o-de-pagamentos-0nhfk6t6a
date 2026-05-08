migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.fields.removeByName('overtime_rules')
    col.fields.add(new TextField({ name: 'zip_code' }))
    col.fields.add(new TextField({ name: 'street' }))
    col.fields.add(new TextField({ name: 'number' }))
    col.fields.add(new TextField({ name: 'complement' }))
    col.fields.add(new TextField({ name: 'neighborhood' }))
    col.fields.add(new TextField({ name: 'city' }))
    col.fields.add(new TextField({ name: 'state' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.fields.removeByName('zip_code')
    col.fields.removeByName('street')
    col.fields.removeByName('number')
    col.fields.removeByName('complement')
    col.fields.removeByName('neighborhood')
    col.fields.removeByName('city')
    col.fields.removeByName('state')
    col.fields.add(new TextField({ name: 'overtime_rules' }))
    app.save(col)
  },
)
