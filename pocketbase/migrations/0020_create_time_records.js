migrate(
  (app) => {
    const employeesId = app.findCollectionByNameOrId('employees').id
    const companiesId = app.findCollectionByNameOrId('companies').id

    const collection = new Collection({
      name: 'time_records',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'employee_id',
          type: 'relation',
          required: true,
          collectionId: employeesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'record_date', type: 'date', required: true },
        { name: 'entry_1', type: 'text' },
        { name: 'exit_1', type: 'text' },
        { name: 'entry_2', type: 'text' },
        { name: 'exit_2', type: 'text' },
        { name: 'entry_3', type: 'text' },
        { name: 'exit_3', type: 'text' },
        { name: 'total_minutes', type: 'number' },
        { name: 'overtime_minutes', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('time_records')
    app.delete(collection)
  },
)
