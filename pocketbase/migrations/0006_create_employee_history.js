migrate(
  (app) => {
    const employeesCol = app.findCollectionByNameOrId('employees')

    const collection = new Collection({
      name: 'employee_history',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'employee_id',
          type: 'relation',
          required: true,
          collectionId: employeesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'change_type',
          type: 'select',
          required: true,
          values: ['base_salary', 'role', 'additional_amount'],
          maxSelect: 1,
        },
        { name: 'old_value', type: 'text', required: false },
        { name: 'new_value', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('employee_history')
    app.delete(collection)
  },
)
