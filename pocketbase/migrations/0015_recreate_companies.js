migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('companies')
      app.delete(col)
    } catch (e) {
      // Collection might not exist
    }

    const newCol = new Collection({
      name: 'companies',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: false },
        { name: 'cnpj', type: 'text', required: false },
        {
          name: 'logo',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
        },
        { name: 'overtime_rules', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })

    app.save(newCol)

    // Restore the relations in other collections to point to the recreated companies collection
    const collectionsToUpdate = [
      { name: 'users', required: false },
      { name: 'employees', required: true },
      { name: 'payroll_entries', required: true },
    ]

    for (const info of collectionsToUpdate) {
      try {
        const colUpdate = app.findCollectionByNameOrId(info.name)
        if (!colUpdate.fields.getByName('company_id')) {
          colUpdate.fields.add(
            new RelationField({
              name: 'company_id',
              collectionId: newCol.id,
              maxSelect: 1,
              required: info.required,
            }),
          )
          app.save(colUpdate)
        }
      } catch (e) {
        // Collection might not exist, ignore
      }
    }
  },
  (app) => {
    // Down migration
  },
)
