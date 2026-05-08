migrate(
  (app) => {
    const collection = new Collection({
      name: 'overtime_rules',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: 'companies',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'limit_hours', type: 'number', required: true, min: 0.01 },
        { name: 'percentage', type: 'number', required: true, min: 0, max: 500 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)

    const companies = app.findRecordsByFilter('companies', '1=1', '', 1, 0)
    if (companies.length > 0) {
      const companyId = companies[0].id
      const rules = [
        { limit_hours: 20, percentage: 50 },
        { limit_hours: 40, percentage: 100 },
        { limit_hours: 999, percentage: 150 },
      ]
      for (const r of rules) {
        const record = new Record(collection)
        record.set('company_id', companyId)
        record.set('limit_hours', r.limit_hours)
        record.set('percentage', r.percentage)
        app.save(record)
      }
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('overtime_rules')
    app.delete(collection)
  },
)
