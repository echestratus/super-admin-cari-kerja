import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Globe, Lock, Mail, ShieldCheck, Palette, Save } from "lucide-react"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
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
                  <Label htmlFor="appName">Application Name</Label>
                  <Input id="appName" defaultValue="Cari Kerja" />
                </div>
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="tagline">Platform Tagline</Label>
                  <Input id="tagline" defaultValue="Portal Lowongan Kerja Terpercaya" />
                </div>
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <select 
                    id="timezone" 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                    <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                    <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                  </select>
                </div>
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="lang">Default Language</Label>
                  <select 
                    id="lang" 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English (US)</option>
                  </select>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 px-6 py-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : (
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
                <div className="space-y-2 flex-1 max-w-sm">
                  <Label>Favicon</Label>
                  <div className="h-32 w-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
                    <span className="text-sm">Upload 32x32</span>
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

        <TabsContent value="security" className="m-0">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>
                Manage password policies and two-factor authentication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 max-w-md">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Require Strong Passwords</Label>
                    <p className="text-sm text-muted-foreground">Minimum 8 characters, uppercase, and symbols.</p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="toggle" id="toggle1" checked readOnly className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-primary translate-x-4"/>
                    <label htmlFor="toggle1" className="toggle-label block overflow-hidden h-6 rounded-full bg-primary cursor-pointer"></label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">Automatically log out inactive users.</p>
                  </div>
                  <select className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>24 hours</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Placeholder for other tabs to keep file size reasonable */}
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
