import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Globe, Lock, Mail, ShieldCheck, Palette, Save } from "lucide-react"

interface SystemSettings {
  platform_name: string
  support_email: string
  maintenance_mode: boolean
  max_upload_size_mb: number
  allow_employer_registration: boolean
  // frontend only state
  timezone?: string
  lang?: string
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<SystemSettings>({
    platform_name: "",
    support_email: "",
    maintenance_mode: false,
    max_upload_size_mb: 5,
    allow_employer_registration: true,
    timezone: "Asia/Jakarta",
    lang: "id"
  })

  const { data: settings, isLoading: isFetching } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/settings")
      return res.data?.data
    }
  })

  // Sync query data to local state
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        platform_name: settings.platform_name || prev.platform_name,
        support_email: settings.support_email || prev.support_email,
        maintenance_mode: settings.maintenance_mode ?? prev.maintenance_mode,
        max_upload_size_mb: settings.max_upload_size_mb || prev.max_upload_size_mb,
        allow_employer_registration: settings.allow_employer_registration ?? prev.allow_employer_registration
      }))
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: async (newSettings: Partial<SystemSettings>) => {
      const payload = {
        platform_name: newSettings.platform_name,
        support_email: newSettings.support_email,
        maintenance_mode: newSettings.maintenance_mode,
        max_upload_size_mb: newSettings.max_upload_size_mb,
        allow_employer_registration: newSettings.allow_employer_registration
      }
      await apiClient.put("/admin/settings", payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] })
      alert("Settings saved successfully!")
    },
    onError: () => {
      alert("Failed to save settings.")
    }
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : 
              type === "number" ? parseInt(value) : value
    }))
  }

  if (isFetching) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-muted rounded"></div>
        <div className="h-[400px] bg-muted rounded-xl"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground">Manage your platform preferences, branding, and security configurations.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto flex-nowrap mb-6">
          <TabsTrigger value="general" className="gap-2 py-2.5">
            <Globe className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 py-2.5">
            <Palette className="h-4 w-4" /> Branding
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2 py-2.5">
            <Building2 className="h-4 w-4" /> Company Info
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 py-2.5">
            <Lock className="h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2 py-2.5">
            <Mail className="h-4 w-4" /> Email SMTP
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 py-2.5">
            <ShieldCheck className="h-4 w-4" /> Roles & Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="m-0">
          <form onSubmit={handleSave}>
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Basic configuration for your job portal platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="platform_name">Platform Name</Label>
                  <Input 
                    id="platform_name" 
                    name="platform_name"
                    value={formData.platform_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input 
                    id="support_email" 
                    type="email"
                    name="support_email"
                    value={formData.support_email}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-4 max-w-md border-t pt-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="space-y-0.5">
                      <Label className="text-base">Allow Employer Registration</Label>
                      <p className="text-sm text-muted-foreground">Employers can register independently.</p>
                    </div>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                      <input 
                        type="checkbox" 
                        name="allow_employer_registration" 
                        id="allow_employer_registration" 
                        checked={formData.allow_employer_registration}
                        onChange={handleChange}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-primary checked:right-0 checked:border-primary duration-200"
                        style={{ right: formData.allow_employer_registration ? '0' : '1rem' }}
                      />
                      <label htmlFor="allow_employer_registration" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.allow_employer_registration ? 'bg-primary' : 'bg-muted'}`}></label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg border-danger/50 bg-danger/5">
                    <div className="space-y-0.5">
                      <Label className="text-base text-danger">Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Take the platform offline for updates.</p>
                    </div>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                      <input 
                        type="checkbox" 
                        name="maintenance_mode" 
                        id="maintenance_mode" 
                        checked={formData.maintenance_mode}
                        onChange={handleChange}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-danger duration-200"
                        style={{ right: formData.maintenance_mode ? '0' : '1rem' }}
                      />
                      <label htmlFor="maintenance_mode" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.maintenance_mode ? 'bg-danger' : 'bg-muted'}`}></label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-md border-t pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <select 
                      id="timezone" 
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                      <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                      <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lang">Default Language</Label>
                    <select 
                      id="lang" 
                      name="lang"
                      value={formData.lang}
                      onChange={handleChange}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English (US)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 px-6 py-4">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="branding" className="m-0">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>
                Customize how your platform looks to users and employers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-end gap-6">
                <div className="space-y-2 flex-1 max-w-sm">
                  <Label>Primary Logo</Label>
                  <div className="h-32 w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
                    <Palette className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-sm">Click to upload logo</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 max-w-md pt-4">
                <Label htmlFor="primaryColor">Primary Brand Color (Hex)</Label>
                <div className="flex gap-3">
                  <Input id="primaryColor" defaultValue="#1E3A8A" className="flex-1" />
                  <div className="w-10 h-10 rounded-md border" style={{ backgroundColor: "#1E3A8A" }}></div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4">
              <Button>
                <Save className="h-4 w-4 mr-2" /> Save Brand Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security & other tabs */}
        <TabsContent value="security" className="m-0">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 max-w-md">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Require Strong Passwords</Label>
                    <p className="text-sm text-muted-foreground">Minimum 8 characters, uppercase, and symbols.</p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="toggle" id="toggle1" checked readOnly className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-primary" style={{ right: 0 }}/>
                    <label htmlFor="toggle1" className="toggle-label block overflow-hidden h-6 rounded-full bg-primary cursor-pointer"></label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="company" className="m-0">
          <Card className="border-none shadow-sm"><CardContent className="p-6">Company settings coming soon...</CardContent></Card>
        </TabsContent>
        <TabsContent value="email" className="m-0">
          <Card className="border-none shadow-sm"><CardContent className="p-6">SMTP settings coming soon...</CardContent></Card>
        </TabsContent>
        <TabsContent value="roles" className="m-0">
          <Card className="border-none shadow-sm"><CardContent className="p-6">Roles management coming soon...</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
