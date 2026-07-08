migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const col = app.findCollectionByNameOrId('employee_history')
    if (!col.fields.getByName('created_by')) {
      col.fields.add(
        new RelationField({
          name: 'created_by',
          collectionId: usersCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('employee_history')
    if (col.fields.getByName('created_by')) {
      col.fields.removeByName('created_by')
      app.save(col)
    }
  },
)
