migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('employees')
    if (!col.fields.getByName('photo')) {
      col.fields.add(
        new FileField({
          name: 'photo',
          required: false,
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/svg+xml',
            'image/bmp',
          ],
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('employees')
    if (col.fields.getByName('photo')) {
      col.fields.removeByName('photo')
      app.save(col)
    }
  },
)
