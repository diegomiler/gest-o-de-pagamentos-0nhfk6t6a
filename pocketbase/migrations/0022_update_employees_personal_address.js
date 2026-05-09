migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('employees')

    col.fields.add(new TextField({ name: 'cpf' }))
    col.fields.add(new TextField({ name: 'phone' }))
    col.fields.add(new TextField({ name: 'email' }))
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
    const col = app.findCollectionByNameOrId('employees')

    col.fields.removeByName('cpf')
    col.fields.removeByName('phone')
    col.fields.removeByName('email')
    col.fields.removeByName('zip_code')
    col.fields.removeByName('street')
    col.fields.removeByName('number')
    col.fields.removeByName('complement')
    col.fields.removeByName('neighborhood')
    col.fields.removeByName('city')
    col.fields.removeByName('state')

    app.save(col)
  },
)
