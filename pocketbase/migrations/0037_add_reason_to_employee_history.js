migrate(
  (app) => {
    const empCol = app.findCollectionByNameOrId('employees')
    if (!empCol.fields.getByName('change_reason')) {
      empCol.fields.add(new TextField({ name: 'change_reason' }))
    }
    app.save(empCol)

    const histCol = app.findCollectionByNameOrId('employee_history')
    if (!histCol.fields.getByName('reason')) {
      histCol.fields.add(new TextField({ name: 'reason' }))
    }
    app.save(histCol)
  },
  (app) => {
    const empCol = app.findCollectionByNameOrId('employees')
    empCol.fields.removeByName('change_reason')
    app.save(empCol)

    const histCol = app.findCollectionByNameOrId('employee_history')
    histCol.fields.removeByName('reason')
    app.save(histCol)
  },
)
