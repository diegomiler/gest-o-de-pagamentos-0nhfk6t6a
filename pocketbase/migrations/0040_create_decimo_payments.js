// Cria a coleção decimo_payments (13º salário), separada de payroll_entries:
// o hook payroll_sync recria a folha mensal a cada salvamento e destruiria um
// 13º gravado como categoria lá. Regras espelham payroll_entries (0032).
//
// NOTA: esta migração é idempotente (create-if-missing). A coleção já foi
// provisionada com estes campos em um run anterior; a migração não faz nada
// quando ela já existe.
migrate(
  (app) => {
    let existing
    try {
      existing = app.findCollectionByNameOrId('decimo_payments')
    } catch (_) {
      existing = null
    }
    if (existing) return // coleção já provisionada — nada a fazer

    const employees = app.findCollectionByNameOrId('employees')
    const companies = app.findCollectionByNameOrId('companies')
    const users = app.findCollectionByNameOrId('users')

    const collection = new Collection({
      type: 'base',
      name: 'decimo_payments',
      fields: [
        {
          name: 'employee_id',
          type: 'relation',
          required: true,
          collectionId: employees.id,
          maxSelect: 1,
        },
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companies.id,
          maxSelect: 1,
        },
        {
          name: 'installment',
          type: 'select',
          required: true,
          values: ['first', 'second'],
          maxSelect: 1,
        },
        { name: 'competency_month', type: 'text', max: 7, required: true },
        { name: 'amount', type: 'number' },
        { name: 'additional', type: 'number' },
        { name: 'other', type: 'number' },
        { name: 'other_desc', type: 'text', max: 500 },
        { name: 'payment_date', type: 'date', required: true },
        { name: 'created_by', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'updated_by', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
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
        'CREATE INDEX idx_decimo_payments_lookup ON decimo_payments (company_id, competency_month)',
        'CREATE INDEX idx_decimo_payments_employee ON decimo_payments (employee_id, installment)',
        'CREATE UNIQUE INDEX idx_decimo_payments_unique ON decimo_payments (employee_id, installment, competency_month)',
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
