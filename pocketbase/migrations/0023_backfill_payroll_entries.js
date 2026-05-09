migrate(
  (app) => {
    // Backfill base_net and additional entries for past months so historical
    // records don't depend on the current employee profile.
    const allEntries = app.findRecordsByFilter('payroll_entries', '', '', 100000, 0)

    const groups = {}
    for (const rec of allEntries) {
      const empId = rec.get('employee_id')
      const date = rec.getString('entry_date')
      const key = empId + '_' + date
      if (!groups[key]) {
        groups[key] = { empId, date, hasBase: false, hasAdditional: false }
      }
      const cat = rec.getString('category')
      if (cat === 'base_net') groups[key].hasBase = true
      if (cat === 'additional') groups[key].hasAdditional = true
    }

    app.runInTransaction((txApp) => {
      const entriesCol = txApp.findCollectionByNameOrId('payroll_entries')

      for (const key in groups) {
        const g = groups[key]
        if (g.hasBase && g.hasAdditional) continue

        let emp
        try {
          emp = txApp.findRecordById('employees', g.empId)
        } catch (e) {
          continue // Employee may have been deleted
        }

        const compId = emp.get('company_id')

        if (!g.hasBase) {
          const base = emp.getFloat('base_salary') || 0
          if (base > 0) {
            const rec = new Record(entriesCol)
            rec.set('employee_id', g.empId)
            rec.set('company_id', compId)
            rec.set('category', 'base_net')
            rec.set('amount', base)
            rec.set('entry_date', g.date)
            txApp.save(rec)
          }
        }

        if (!g.hasAdditional) {
          const add = emp.getFloat('additional_amount') || 0
          if (add > 0) {
            const rec = new Record(entriesCol)
            rec.set('employee_id', g.empId)
            rec.set('company_id', compId)
            rec.set('category', 'additional')
            rec.set('amount', add)
            rec.set('entry_date', g.date)
            txApp.save(rec)
          }
        }
      }
    })
  },
  (app) => {
    // no-op
  },
)
