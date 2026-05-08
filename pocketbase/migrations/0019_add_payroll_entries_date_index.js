migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('payroll_entries')
    col.addIndex('idx_payroll_entries_date', false, 'entry_date', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('payroll_entries')
    col.removeIndex('idx_payroll_entries_date')
    app.save(col)
  },
)
