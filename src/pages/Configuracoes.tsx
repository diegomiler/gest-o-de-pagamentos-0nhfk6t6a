import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Plus, Edit2, Trash2, UploadCloud, Image as ImageIcon, X } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

export default function Configuracoes() {
  const { toast } = useToast()
  const [companies, setCompanies] = useState<any[]>([])

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<any>(null)

  // Delete Confirm State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<any>(null)

  // Form State
  const [formData, setFormData] = useState({ name: '', tax_id: '' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchCompanies = async () => {
    try {
      const data = await pb.collection('companies').getFullList({ sort: 'name' })
      setCompanies(data)
    } catch {
      // intentionally ignored
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  useRealtime('companies', fetchCompanies)

  const openNew = () => {
    setEditingCompany(null)
    setFormData({ name: '', tax_id: '' })
    setLogoFile(null)
    setLogoPreview(null)
    setErrors({})
    setIsDialogOpen(true)
  }

  const openEdit = (company: any) => {
    setEditingCompany(company)
    setFormData({ name: company.name, tax_id: company.tax_id || '' })
    setLogoFile(null)
    setLogoPreview(company.logo ? pb.files.getURL(company, company.logo) : null)
    setErrors({})
    setIsDialogOpen(true)
  }

  const confirmDelete = (company: any) => {
    setCompanyToDelete(company)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!companyToDelete) return
    try {
      await pb.collection('companies').delete(companyToDelete.id)
      toast({ title: 'Sucesso', description: 'Empresa removida com sucesso.' })
      setIsDeleteDialogOpen(false)
      setCompanyToDelete(null)
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a empresa. Pode haver registros associados.',
        variant: 'destructive',
      })
      setIsDeleteDialogOpen(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5242880) {
        toast({
          title: 'Erro',
          description: 'A imagem deve ter no máximo 5MB.',
          variant: 'destructive',
        })
        return
      }
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!formData.name.trim()) {
      setErrors({ name: 'Nome é obrigatório' })
      return
    }

    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('tax_id', formData.tax_id)

      if (logoFile) {
        data.append('logo', logoFile)
      } else if (logoPreview === null && editingCompany?.logo) {
        data.append('logo', '')
      }

      if (editingCompany) {
        await pb.collection('companies').update(editingCompany.id, data)
        toast({ title: 'Sucesso', description: 'Empresa atualizada.' })
      } else {
        await pb.collection('companies').create(data)
        toast({ title: 'Sucesso', description: 'Empresa criada.' })
      }
      setIsDialogOpen(false)
    } catch (err: any) {
      setErrors(extractFieldErrors(err))
      toast({
        title: 'Erro',
        description: 'Verifique os campos obrigatórios.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie os dados globais e as empresas cadastradas.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Empresas</CardTitle>
            <CardDescription>Lista de todas as empresas cadastradas no sistema.</CardDescription>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Nova Empresa
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Logo</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma empresa cadastrada.
                    </TableCell>
                  </TableRow>
                )}
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      {company.logo ? (
                        <img
                          src={pb.files.getURL(company, company.logo)}
                          alt={company.name}
                          className="w-10 h-10 object-contain rounded bg-muted/50 p-1"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.tax_id || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(company)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => confirmDelete(company)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
              <DialogDescription>Preencha os dados da empresa abaixo.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Razão Social *</Label>
                <Input
                  id="companyName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da Empresa LTDA"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">CNPJ</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="00.000.000/0001-00"
                />
                {errors.tax_id && <p className="text-sm text-destructive">{errors.tax_id}</p>}
              </div>

              <div className="space-y-2">
                <Label>Logo da Empresa</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 relative overflow-hidden group">
                    {logoPreview ? (
                      <>
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="w-full h-full object-contain p-2"
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={handleRemoveLogo}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud className="h-4 w-4" />
                      {logoPreview ? 'Trocar' : 'Upload'}
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG. Máx: 5MB.</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={handleFileChange}
                    />
                    {errors.logo && <p className="text-sm text-destructive">{errors.logo}</p>}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Empresa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a empresa <strong>{companyToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
