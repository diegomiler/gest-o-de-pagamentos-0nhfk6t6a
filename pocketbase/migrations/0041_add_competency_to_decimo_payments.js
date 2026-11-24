// Alinha a coleção decimo_payments (13º salário) já provisionada:
// adiciona competency_month (competência própria por parcela) e o índice de
// busca por competência que a versão inicial não tinha. Índices que já existem
// (com o mesmo nome) são mantidos como estão.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('decimo_payments')

    if (!collection.fields.getByName('competency_month')) {
      collection.fields.add(
        new TextField({
          name: 'competency_month',
          max: 7,
          required: true,
        }),
      )
    }

    const existingIdx = new Set(
      (collection.indexes || []).map((i) => {
        const m = String(i).match(/INDEX\s+(\w+)/i)
        return m ? m[1] : String(i)
      }),
    )
    const wanted = [
      'CREATE INDEX idx_decimo_payments_lookup2 ON decimo_payments (company_id, competency_month)',
      'CREATE INDEX idx_decimo_payments_employee ON decimo_payments (employee_id, installment)',
      'CREATE UNIQUE INDEX idx_decimo_payments_unique ON decimo_payments (employee_id, installment, competency_month)',
    ]
    const missing = wanted.filter((idx) => {
      const m = idx.match(/INDEX\s+(\w+)/i)
      return !m || !existingIdx.has(m[1])
    })

    if (missing.length > 0) {
      collection.indexes = [...(collection.indexes || []), ...missing]
    }

    app.save(collection)
  },
  (app) => {
    // rollback: apenas remove os índices adicionados, mantém a coleção
    try {
      const collection = app.findCollectionByNameOrId('decimo_payments')
      const indexes = (collection.indexes || []).filter((i) => !i.includes('competency_month'))
      collection.indexes = indexes
      app.save(collection)
    } catch (_) {}
  },
)
