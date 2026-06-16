migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('payroll_entries')
    const field = col.fields.getByName('category')
    if (!field.values.includes('market_voucher')) {
      field.values.push('market_voucher')
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('payroll_entries')
    const field = col.fields.getByName('category')
    field.values = field.values.filter((v) => v !== 'market_voucher')
    app.save(col)
  },
)
