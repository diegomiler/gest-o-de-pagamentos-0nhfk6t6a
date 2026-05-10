migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'manager', 'editor'],
          maxSelect: 1,
          required: true,
        }),
      )
    }

    app.save(users)

    app.db().newQuery(`UPDATE users SET role = 'admin' WHERE role = '' OR role IS NULL`).execute()
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('role')
    app.save(users)
  },
)
