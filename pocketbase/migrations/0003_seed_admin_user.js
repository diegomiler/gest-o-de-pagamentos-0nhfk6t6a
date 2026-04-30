migrate(
  (app) => {
    const companiesCol = app.findCollectionByNameOrId('companies')
    const usersCol = app.findCollectionByNameOrId('users')

    let company
    try {
      company = app.findFirstRecordByData('companies', 'name', 'Minha Empresa')
    } catch (_) {
      company = new Record(companiesCol)
      company.set('name', 'Minha Empresa')
      app.save(company)
    }

    try {
      app.findAuthRecordByEmail('users', 'diegomiler@live.com')
      return // already seeded
    } catch (_) {}

    const user = new Record(usersCol)
    user.setEmail('diegomiler@live.com')
    user.setPassword('Skip@Pass')
    user.setVerified(true)
    user.set('name', 'Admin')
    user.set('company_id', company.id)
    app.save(user)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'diegomiler@live.com')
      app.delete(record)
    } catch (_) {}
    try {
      const company = app.findFirstRecordByData('companies', 'name', 'Minha Empresa')
      app.delete(company)
    } catch (_) {}
  },
)
