import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Loader2 } from 'lucide-react'

export function UserForm({
  user,
  companyId,
  onSaved,
  onCancel,
}: {
  user?: any
  companyId: string
  onSaved: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'editor',
      })
    }
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSaving(true)
    try {
      if (user) {
        // Update user
        const payload: any = {
          name: formData.name,
          role: formData.role,
        }
        if (formData.password) {
          payload.password = formData.password
          payload.passwordConfirm = formData.password
        }
        await pb.collection('users').update(user.id, payload)
      } else {
        // Create user
        if (!formData.password) {
          setErrors({ password: 'A senha é obrigatória para novos usuários.' })
          setIsSaving(false)
          return
        }
        const payload = {
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.password,
          name: formData.name,
          role: formData.role,
          company_id: companyId,
          emailVisibility: true,
        }
        await pb.collection('users').create(payload)
      }
      toast({ title: 'Sucesso', description: 'Usuário salvo com sucesso.' })
      onSaved()
    } catch (err: any) {
      setErrors(extractFieldErrors(err))
      toast({
        title: 'Erro',
        description: 'Falha ao salvar o usuário. Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome Completo</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-2">
        <Label>E-mail</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={!!user} // don't change email for existing users
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label>Perfil de Acesso</Label>
        <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador (Acesso total)</SelectItem>
            <SelectItem value="manager">Gerente (Acesso a dados, sem configs)</SelectItem>
            <SelectItem value="editor">Editor (Apenas lançamentos)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{user ? 'Nova Senha (opcional)' : 'Senha'}</Label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required={!user}
          minLength={8}
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        {user && (
          <p className="text-xs text-muted-foreground">
            Preencha apenas se desejar alterar a senha do usuário.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t mt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </div>
    </form>
  )
}
