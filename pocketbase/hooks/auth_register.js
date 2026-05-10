routerAdd(
  'POST',
  '/backend/v1/register',
  (e) => {
    const body = e.requestInfo().body
    if (!body.email || !body.password || !body.name || !body.company_name) {
      return e.badRequestError('Todos os campos são obrigatórios.')
    }

    const companiesCol = $app.findCollectionByNameOrId('companies')
    const usersCol = $app.findCollectionByNameOrId('users')

    try {
      $app.runInTransaction((txApp) => {
        const company = new Record(companiesCol)
        company.set('name', body.company_name)
        txApp.save(company)

        const user = new Record(usersCol)
        user.setEmail(body.email)
        user.setPassword(body.password)
        user.setVerified(true)
        user.set('name', body.name)
        user.set('company_id', company.id)
        user.set('role', 'admin')
        txApp.save(user)
      })
    } catch (err) {
      return e.badRequestError(
        'Falha ao registrar: e-mail pode já estar em uso ou dados inválidos.',
      )
    }

    return e.json(200, { success: true })
  },
  $apis.requireGuestOnly(),
)
