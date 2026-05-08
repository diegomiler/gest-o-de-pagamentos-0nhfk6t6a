import { useState, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { ClientResponseError } from 'pocketbase'

export function usePayrollData(selectedMonth: string) {
  const { user, signOut } = useAuth()
  const [employees, setEmployees] = useState<any[]>([])
  const [payrollEntries, setPayrollEntries] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [userCompany, setUserCompany] = useState<any | null>(null)
  const [updateTrigger, setUpdateTrigger] = useState(0)
  const invalidCompanyIdRef = useRef<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [emps, comps] = await Promise.all([
          pb.collection('employees').getFullList(),
          pb.collection('companies').getFullList(),
        ])
        setEmployees(emps)
        setCompanies(comps)

        if (user?.company_id && user.id) {
          if (user.company_id === invalidCompanyIdRef.current) {
            setUserCompany(null)
          } else {
            const comp = comps.find((c) => c.id === user.company_id)
            if (comp) {
              setUserCompany(comp)
            } else {
              try {
                const c = await pb.collection('companies').getOne(user.company_id)
                setUserCompany(c)
              } catch (err: any) {
                setUserCompany(null)
                if (err instanceof ClientResponseError && err.status === 404) {
                  invalidCompanyIdRef.current = user.company_id
                  try {
                    await pb.collection('users').update(user.id, { company_id: null })
                  } catch (updateErr: any) {
                    if (updateErr instanceof ClientResponseError && updateErr.status === 404) {
                      signOut()
                    }
                  }
                }
              }
            }
          }
        } else {
          setUserCompany(null)
        }
      } catch {
        /* intentionally ignored */
      }
    }
    load()
  }, [user, updateTrigger, signOut])

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const startDate = `${selectedMonth}-01 00:00:00`
        const endDate = `${selectedMonth}-31 23:59:59`
        const entries = await pb.collection('payroll_entries').getFullList({
          filter: `entry_date >= '${startDate}' && entry_date <= '${endDate}'`,
        })
        setPayrollEntries(entries)
      } catch {
        /* intentionally ignored */
      }
    }
    if (selectedMonth) loadEntries()
  }, [selectedMonth, updateTrigger])

  useRealtime('employees', () => setUpdateTrigger((p) => p + 1))
  useRealtime('payroll_entries', () => setUpdateTrigger((p) => p + 1))
  useRealtime('companies', () => setUpdateTrigger((p) => p + 1))

  return { employees, payrollEntries, companies, userCompany }
}
