migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('payroll_entries')
    const field = col.fields.getByName('category')

    if (field && !field.values.includes('base_net')) {
      field.values.push('base_net')
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('payroll_entries')
    const field = col.fields.getByName('category')

    if (field && field.values.includes('base_net')) {
      field.values = field.values.filter((v) => v !== 'base_net')
      app.save(col)
    }
  },
)
