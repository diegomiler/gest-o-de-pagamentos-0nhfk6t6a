migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('companies')
    } catch (e) {
      col = new Collection({
        name: 'companies',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
    }

    const nameField = col.fields.getByName('name')
    if (nameField) {
      nameField.required = false
    }

    if (!col.fields.getByName('cnpj')) {
      col.fields.add(new TextField({ name: 'cnpj', required: false }))
    }

    if (!col.fields.getByName('logo')) {
      col.fields.add(
        new FileField({
          name: 'logo',
          required: false,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
        }),
      )
    }

    if (!col.fields.getByName('overtime_rules')) {
      col.fields.add(new TextField({ name: 'overtime_rules', required: false }))
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('companies')
      col.fields.removeByName('cnpj')
      col.fields.removeByName('logo')
      col.fields.removeByName('overtime_rules')
      app.save(col)
    } catch (e) {
      // collection might not exist
    }
  },
)
