migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('payroll_entries')

    const categoryField = col.fields.getByName('category')
    if (categoryField) {
      if (!categoryField.values.includes('overtime')) {
        categoryField.values.push('overtime')
      }
    }

    if (!col.fields.getByName('quantity')) {
      col.fields.add(new NumberField({ name: 'quantity' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('payroll_entries')

    const categoryField = col.fields.getByName('category')
    if (categoryField) {
      categoryField.values = categoryField.values.filter((v) => v !== 'overtime')
    }

    if (col.fields.getByName('quantity')) {
      col.fields.removeByName('quantity')
    }

    app.save(col)
  },
)
