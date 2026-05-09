migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('time_records')
    if (!col.fields.getByName('day_type')) {
      col.fields.add(
        new SelectField({
          name: 'day_type',
          values: ['regular', 'holiday', 'day_off'],
          maxSelect: 1,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('time_records')
    if (col.fields.getByName('day_type')) {
      col.fields.removeByName('day_type')
    }
    app.save(col)
  },
)
