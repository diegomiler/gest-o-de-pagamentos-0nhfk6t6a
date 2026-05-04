migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('payroll_entries')
    col.fields.add(
      new SelectField({
        name: 'category',
        required: true,
        maxSelect: 1,
        values: [
          'commission',
          'bonus',
          'pharmacy_discount',
          'advance',
          'additional',
          'other',
          'overtime',
          'base_net',
          'cash_shortage',
          'negative_hours',
          'partner_agreement',
          'store_agreement',
          'other_discount',
          'other_addition',
        ],
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('payroll_entries')
    col.fields.add(
      new SelectField({
        name: 'category',
        required: true,
        maxSelect: 1,
        values: [
          'commission',
          'bonus',
          'pharmacy_discount',
          'advance',
          'additional',
          'other',
          'overtime',
          'base_net',
        ],
      }),
    )
    app.save(col)
  },
)
