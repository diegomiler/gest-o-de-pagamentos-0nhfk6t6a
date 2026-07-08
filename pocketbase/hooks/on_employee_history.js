onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const original = record.original()

  const historyCol = $app.findCollectionByNameOrId('employee_history')

  const changes = []

  const oldRole = original.getString('role') || ''
  const newRole = record.getString('role') || ''
  if (oldRole !== newRole) {
    changes.push({
      change_type: 'role',
      old_value: oldRole,
      new_value: newRole,
    })
  }

  const oldSalary = original.getFloat('base_salary')
  const newSalary = record.getFloat('base_salary')
  if (oldSalary !== newSalary) {
    changes.push({
      change_type: 'base_salary',
      old_value: oldSalary.toString(),
      new_value: newSalary.toString(),
    })
  }

  const oldAdditional = original.getFloat('additional_amount')
  const newAdditional = record.getFloat('additional_amount')
  if (oldAdditional !== newAdditional) {
    changes.push({
      change_type: 'additional_amount',
      old_value: oldAdditional.toString(),
      new_value: newAdditional.toString(),
    })
  }

  const reason = record.getString('change_reason')

  for (const change of changes) {
    const historyRecord = new Record(historyCol)
    historyRecord.set('employee_id', record.id)
    historyRecord.set('change_type', change.change_type)
    historyRecord.set('old_value', change.old_value)
    historyRecord.set('new_value', change.new_value)

    if (
      reason &&
      (change.change_type === 'base_salary' || change.change_type === 'additional_amount')
    ) {
      historyRecord.set('reason', reason)
    }

    $app.save(historyRecord)
  }

  return e.next()
}, 'employees')
