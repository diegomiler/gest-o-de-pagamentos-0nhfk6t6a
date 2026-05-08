migrate(
  (app) => {
    // 1. Remove duplicates for cnpj before adding unique index
    app
      .db()
      .newQuery(`
    UPDATE companies SET cnpj = '' WHERE id NOT IN (
      SELECT MIN(id) FROM companies GROUP BY cnpj
    ) AND cnpj != '' AND cnpj IS NOT NULL
  `)
      .execute()

    const col = app.findCollectionByNameOrId('companies')

    col.removeIndex('idx_companies_tax_id')

    if (col.fields.getByName('tax_id')) {
      col.fields.removeByName('tax_id')
    }

    if (col.fields.getByName('address')) {
      col.fields.removeByName('address')
    }

    col.addIndex('idx_companies_cnpj', true, 'cnpj', "cnpj != ''")

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')

    col.removeIndex('idx_companies_cnpj')

    if (!col.fields.getByName('tax_id')) {
      col.fields.add(new TextField({ name: 'tax_id' }))
    }

    if (!col.fields.getByName('address')) {
      col.fields.add(new TextField({ name: 'address' }))
    }

    col.addIndex('idx_companies_tax_id', true, 'tax_id', "tax_id != ''")

    app.save(col)
  },
)
