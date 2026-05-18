import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface AccessLog extends RecordModel {
  email: string
  user_id: string
  access_time: string
  expand?: {
    user_id?: {
      name: string
      email: string
    }
  }
}

export const getAccessLogs = (
  page: number = 1,
  perPage: number = 20,
  filters: { email?: string; startDate?: Date; endDate?: Date } = {},
) => {
  const filterParts = []

  if (filters.email) {
    filterParts.push(`email ~ "${filters.email}"`)
  }
  if (filters.startDate) {
    const start = new Date(filters.startDate)
    start.setHours(0, 0, 0, 0)
    filterParts.push(`access_time >= "${start.toISOString().replace('T', ' ')}"`)
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate)
    end.setHours(23, 59, 59, 999)
    filterParts.push(`access_time <= "${end.toISOString().replace('T', ' ')}"`)
  }

  return pb.collection('access_logs').getList<AccessLog>(page, perPage, {
    sort: '-access_time',
    filter: filterParts.join(' && '),
    expand: 'user_id',
  })
}
