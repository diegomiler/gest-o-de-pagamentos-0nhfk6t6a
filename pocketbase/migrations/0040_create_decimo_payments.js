migrate(
  (app) => {
    const employees = app.findCollectionByNameOrId('employees')
    const companies = app.findCollectionByNameOrId('companies')
    const users = app.findCollectionByNameOrId('users')

    const collection = new Collection({
      type: 'base',
      name: 'decimo_payments',
      fields: [
        new RelationField({
          name: 'employee_id',
          collectionId: employees.id,
          required: true,
          maxSelect: 1,
        }),
        new RelationField({
          name: 'company_id',
          collectionId: companies.id,
          required: true,
          maxSelect: 1,
        }),
        new SelectField({
          name: 'installment',
          values: ['first', 'second'],
          required: true,
          maxSelect: 1,
        }),
        new NumberField({ name: 'amount', onlyInt: false }),
        new NumberField({ name: 'additional', onlyInt: false }),
        new NumberField({ name: 'other', onlyInt: false }),
        new TextField({ name: 'other_desc', max: 500 }),
        new DateField({ name: 'payment_date', required: true }),
        new RelationField({ name: 'created_by', collectionId: users.id, maxSelect: 1 }),
        new RelationField({ name: 'updated_by', collectionId: users.id, maxSelect: 1 }),
      ],
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || company_id = @request.auth.company_id)",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || (company_id = @request.auth.company_id && @request.auth.role != 'editor'))",
      indexes: [
        'CREATE INDEX idx_decimo_payments_lookup ON decimo_payments (company_id, payment_date)',
        'CREATE INDEX idx_decimo_payments_employee ON decimo_payments (employee_id, installment)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('decimo_payments')
      app.delete(collection)
    } catch (_) {}
  },
)
