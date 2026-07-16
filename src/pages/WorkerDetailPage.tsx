import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ColumnDef } from "@/components/ui/data-table"
import { ResourceSection } from "@/components/resource-section"
import { ConversationsSection } from "@/components/conversations-section"
import { useLookup, toLookupOptions, getLookupDisplayName } from "@/hooks/use-lookup"
import { ArrowLeft, User, Save } from "lucide-react"
import { toast } from "sonner"

interface WorkerDetail {
  id: string
  user_id?: string
  name: string
  avatar_url?: string
  telephone?: string
  date_of_birth?: string
  gender_id?: number
  nationality_id?: number
  religion_id?: number
  marriage_status_id?: number
  address?: string
  profile_summary?: string
  current_salary?: number
  expected_salary?: number
  current_salary_currency_id?: number
  expected_salary_currency_id?: number
  user_email?: string
  user_username?: string
  deleted_at?: string
  created_at?: string
  updated_at?: string
}

const emptyProfile = {
  name: "",
  telephone: "",
  date_of_birth: "",
  gender_id: "",
  nationality_id: "",
  religion_id: "",
  marriage_status_id: "",
  address: "",
  profile_summary: "",
  current_salary: "",
  expected_salary: "",
}

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [profileForm, setProfileForm] = useState({ ...emptyProfile })

  const { data: worker, isLoading } = useQuery<WorkerDetail>({
    queryKey: ["worker", id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/workers/${id}`)
      return res.data?.data || res.data
    },
    enabled: !!id,
  })

  const { data: genders } = useLookup("genders")
  const { data: nationalities } = useLookup("nationalities")
  const { data: religions } = useLookup("religions")
  const { data: marriageStatuses } = useLookup("marriage_statuses")
  const { data: proficiencyLevels } = useLookup("proficiency_levels")
  const { data: skills } = useLookup("skills")
  const { data: applicationStatuses } = useLookup("application_statuses")

  useEffect(() => {
    if (worker) {
      setProfileForm({
        name: worker.name || "",
        telephone: worker.telephone || "",
        date_of_birth: worker.date_of_birth
          ? new Date(worker.date_of_birth).toISOString().split("T")[0]
          : "",
        gender_id: worker.gender_id?.toString() || "",
        nationality_id: worker.nationality_id?.toString() || "",
        religion_id: worker.religion_id?.toString() || "",
        marriage_status_id: worker.marriage_status_id?.toString() || "",
        address: worker.address || "",
        profile_summary: worker.profile_summary || "",
        current_salary: worker.current_salary?.toString() || "",
        expected_salary: worker.expected_salary?.toString() || "",
      })
    }
  }, [worker])

  const profileMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: profileForm.name,
        telephone: profileForm.telephone || null,
        date_of_birth: profileForm.date_of_birth || null,
        gender_id: profileForm.gender_id ? Number(profileForm.gender_id) : null,
        nationality_id: profileForm.nationality_id ? Number(profileForm.nationality_id) : null,
        religion_id: profileForm.religion_id ? Number(profileForm.religion_id) : null,
        marriage_status_id: profileForm.marriage_status_id ? Number(profileForm.marriage_status_id) : null,
        address: profileForm.address || null,
        profile_summary: profileForm.profile_summary || null,
        current_salary: profileForm.current_salary ? Number(profileForm.current_salary) : null,
        expected_salary: profileForm.expected_salary ? Number(profileForm.expected_salary) : null,
      }
      return apiClient.put(`/admin/workers/${id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker", id] })
      queryClient.invalidateQueries({ queryKey: ["workers"] })
      toast.success("Worker profile updated successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update worker profile.")
    },
  })

  const lookupSelect = (
    label: string,
    field: keyof typeof emptyProfile,
    records: any[] | undefined
  ) => (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select
        value={profileForm[field]}
        onValueChange={(v) => setProfileForm({ ...profileForm, [field]: v })}
      >
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {toLookupOptions(records).map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  const workExpColumns: ColumnDef<any>[] = [
    {
      header: "Position",
      cell: (item) => (
        <div>
          <div className="font-medium">{item.job_title}</div>
          <div className="text-sm text-muted-foreground">{item.company_name}</div>
        </div>
      ),
    },
    {
      header: "Period",
      cell: (item) => (
        <span className="text-sm">
          {item.start_date ? new Date(item.start_date).toLocaleDateString() : "?"} —{" "}
          {item.is_current ? "Present" : item.end_date ? new Date(item.end_date).toLocaleDateString() : "?"}
        </span>
      ),
    },
  ]

  const educationColumns: ColumnDef<any>[] = [
    {
      header: "Institution",
      cell: (item) => (
        <div>
          <div className="font-medium">{item.institution_name}</div>
          <div className="text-sm text-muted-foreground">
            {[item.degree, item.major].filter(Boolean).join(" — ")}
          </div>
        </div>
      ),
    },
    {
      header: "Period",
      cell: (item) => (
        <span className="text-sm">
          {item.start_date ? new Date(item.start_date).toLocaleDateString() : "?"} —{" "}
          {item.is_current ? "Present" : item.end_date ? new Date(item.end_date).toLocaleDateString() : "?"}
        </span>
      ),
    },
  ]

  const certificationColumns: ColumnDef<any>[] = [
    {
      header: "Certification",
      cell: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-sm text-muted-foreground">{item.issuer}</div>
        </div>
      ),
    },
    {
      header: "Validity",
      cell: (item) => (
        <span className="text-sm">
          {item.issue_date ? new Date(item.issue_date).toLocaleDateString() : "?"}
          {item.expiry_date ? ` — ${new Date(item.expiry_date).toLocaleDateString()}` : " (no expiry)"}
        </span>
      ),
    },
  ]

  const portfolioColumns: ColumnDef<any>[] = [
    {
      header: "Title",
      cell: (item) => (
        <div>
          <div className="font-medium">{item.title}</div>
          {item.link && (
            <a href={item.link} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline break-all">
              {item.link}
            </a>
          )}
        </div>
      ),
    },
    {
      header: "Visibility",
      cell: (item) => (
        <Badge variant="outline" className="bg-background">
          {item.is_public ? "Public" : "Private"}
        </Badge>
      ),
    },
  ]

  const resumeColumns: ColumnDef<any>[] = [
    {
      header: "Resume",
      cell: (item) => (
        <div>
          <div className="font-medium">{item.title || "Untitled"}</div>
          {item.resume_url && (
            <a href={item.resume_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline break-all">
              View file
            </a>
          )}
        </div>
      ),
    },
    {
      header: "Default",
      cell: (item) =>
        item.is_default ? (
          <Badge className="bg-success/10 text-success border-transparent">Default</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
  ]

  const languageColumns: ColumnDef<any>[] = [
    {
      header: "Language",
      cell: (item) => <span className="font-medium">{item.language_name}</span>,
    },
    {
      header: "Proficiency",
      cell: (item) => (
        <Badge variant="outline" className="bg-background">
          {item.proficiency_level_name ||
            getLookupDisplayName(proficiencyLevels?.find((p: any) => p.id === item.proficiency_level_id)) ||
            `#${item.proficiency_level_id}`}
        </Badge>
      ),
    },
    {
      header: "Primary",
      cell: (item) =>
        item.is_primary ? (
          <Badge className="bg-success/10 text-success border-transparent">Primary</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
  ]

  const skillColumns: ColumnDef<any>[] = [
    {
      header: "Skill",
      cell: (item) => <span className="font-medium">{item.skill_name || item.name}</span>,
    },
  ]

  const applicationColumns: ColumnDef<any>[] = [
    {
      header: "Job",
      cell: (item) => (
        <div>
          <div className="font-medium">{item.job_title || item.job_post_id}</div>
          <div className="text-sm text-muted-foreground">{item.company_name}</div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (item) => (
        <Badge variant="outline" className="bg-background">
          {item.status_name ||
            getLookupDisplayName(applicationStatuses?.find((s: any) => s.id === item.application_status_id)) ||
            `#${item.application_status_id}`}
        </Badge>
      ),
    },
    {
      header: "Applied",
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
  ]

  const answerColumns: ColumnDef<any>[] = [
    {
      header: "Question",
      cell: (item) => (
        <div>
          <div className="font-medium text-sm">{item.question || item.question_id}</div>
          <div className="text-xs text-muted-foreground">{item.job_title}</div>
        </div>
      ),
    },
    {
      header: "Answer",
      cell: (item) => (
        <span className="text-sm line-clamp-2 max-w-[300px] block">
          {typeof item.answer === "object" ? JSON.stringify(item.answer) : item.answer}
        </span>
      ),
    },
  ]

  const savedJobColumns: ColumnDef<any>[] = [
    {
      header: "Job",
      cell: (item) => (
        <div>
          <div className="font-medium">{item.job_title || item.title || item.job_post_id}</div>
          <div className="text-sm text-muted-foreground">{item.company_name}</div>
        </div>
      ),
    },
    {
      header: "Saved At",
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/workers" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {worker?.name || "Worker Detail"}
              {worker?.deleted_at && (
                <Badge variant="outline" className="border-danger text-danger bg-danger/5">Deleted</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {worker?.user_email || "No linked account"}
              {worker?.user_username && ` · @${worker.user_username}`}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="career">Career History</TabsTrigger>
          <TabsTrigger value="documents">Portfolio & Resumes</TabsTrigger>
          <TabsTrigger value="skills">Skills & Languages</TabsTrigger>
          <TabsTrigger value="jobs">Jobs & Applications</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>

        {/* ---------------- Profile ---------------- */}
        <TabsContent value="profile" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Complete profile data for this worker.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="grid gap-4 max-w-3xl">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="w-name">Full Name</Label>
                    <Input
                      id="w-name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="w-phone">Telephone</Label>
                    <Input
                      id="w-phone"
                      value={profileForm.telephone}
                      onChange={(e) => setProfileForm({ ...profileForm, telephone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="w-dob">Date of Birth</Label>
                    <Input
                      id="w-dob"
                      type="date"
                      value={profileForm.date_of_birth}
                      onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                    />
                  </div>
                  {lookupSelect("Gender", "gender_id", genders)}
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {lookupSelect("Nationality", "nationality_id", nationalities)}
                  {lookupSelect("Religion", "religion_id", religions)}
                  {lookupSelect("Marriage Status", "marriage_status_id", marriageStatuses)}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="w-address">Address</Label>
                  <Input
                    id="w-address"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="w-summary">Profile Summary</Label>
                  <Textarea
                    id="w-summary"
                    rows={4}
                    value={profileForm.profile_summary}
                    onChange={(e) => setProfileForm({ ...profileForm, profile_summary: e.target.value })}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="w-current-salary">Current Salary (IDR)</Label>
                    <Input
                      id="w-current-salary"
                      type="number"
                      min={0}
                      value={profileForm.current_salary}
                      onChange={(e) => setProfileForm({ ...profileForm, current_salary: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="w-expected-salary">Expected Salary (IDR)</Label>
                    <Input
                      id="w-expected-salary"
                      type="number"
                      min={0}
                      value={profileForm.expected_salary}
                      onChange={(e) => setProfileForm({ ...profileForm, expected_salary: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Button
                    onClick={() => profileMutation.mutate()}
                    disabled={profileMutation.isPending || !profileForm.name.trim()}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {profileMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Career History ---------------- */}
        <TabsContent value="career" className="mt-4 space-y-8">
          <ResourceSection
            title="Work Experience"
            description="Employment history of this worker."
            baseUrl={`/admin/workers/${id}/work-experiences`}
            queryKey={["worker-work-experiences", id]}
            columns={workExpColumns}
            getItemLabel={(item) => `${item.job_title} at ${item.company_name}`}
            fields={[
              { name: "company_name", label: "Company Name", type: "text", required: true },
              { name: "job_title", label: "Job Title", type: "text", required: true },
              { name: "start_date", label: "Start Date", type: "date", required: true },
              { name: "end_date", label: "End Date", type: "date" },
              { name: "is_current", label: "Currently working here", type: "checkbox" },
              { name: "description", label: "Description", type: "textarea" },
            ]}
          />
          <ResourceSection
            title="Education"
            description="Educational background of this worker."
            baseUrl={`/admin/workers/${id}/educations`}
            queryKey={["worker-educations", id]}
            columns={educationColumns}
            getItemLabel={(item) => item.institution_name}
            fields={[
              { name: "institution_name", label: "Institution Name", type: "text", required: true },
              { name: "degree", label: "Degree", type: "text", placeholder: "e.g. Bachelor" },
              { name: "major", label: "Major", type: "text", placeholder: "e.g. Computer Science" },
              { name: "start_date", label: "Start Date", type: "date" },
              { name: "end_date", label: "End Date", type: "date" },
              { name: "is_current", label: "Currently studying here", type: "checkbox" },
              { name: "description", label: "Description", type: "textarea" },
            ]}
          />
          <ResourceSection
            title="Certifications"
            description="Professional certifications held by this worker."
            baseUrl={`/admin/workers/${id}/certifications`}
            queryKey={["worker-certifications", id]}
            columns={certificationColumns}
            getItemLabel={(item) => item.name}
            fields={[
              { name: "name", label: "Certification Name", type: "text", required: true },
              { name: "issuer", label: "Issuer", type: "text", required: true },
              { name: "link", label: "Credential Link", type: "text" },
              { name: "credential_id", label: "Credential ID", type: "text" },
              { name: "issue_date", label: "Issue Date", type: "date" },
              { name: "expiry_date", label: "Expiry Date", type: "date" },
              { name: "is_active", label: "Active", type: "checkbox" },
            ]}
          />
        </TabsContent>

        {/* ---------------- Portfolio & Resumes ---------------- */}
        <TabsContent value="documents" className="mt-4 space-y-8">
          <ResourceSection
            title="Portfolios"
            description="Portfolio items showcased by this worker."
            baseUrl={`/admin/workers/${id}/portfolios`}
            queryKey={["worker-portfolios", id]}
            columns={portfolioColumns}
            getItemLabel={(item) => item.title}
            fields={[
              { name: "title", label: "Title", type: "text", required: true },
              { name: "link", label: "Link", type: "text", required: true },
              { name: "description", label: "Description", type: "textarea" },
              { name: "is_public", label: "Publicly visible", type: "checkbox" },
            ]}
          />
          <ResourceSection
            title="Resumes"
            description="Uploaded resume files. File replacement must be done by the worker."
            baseUrl={`/admin/workers/${id}/resumes`}
            queryKey={["worker-resumes", id]}
            columns={resumeColumns}
            getItemLabel={(item) => item.title || "resume"}
            canCreate={false}
            fields={[
              { name: "title", label: "Title", type: "text", required: true },
              { name: "is_default", label: "Default resume", type: "checkbox" },
            ]}
          />
        </TabsContent>

        {/* ---------------- Skills & Languages ---------------- */}
        <TabsContent value="skills" className="mt-4 space-y-8">
          <ResourceSection
            title="Skills"
            description="Skills linked to this worker from the skill master list."
            baseUrl={`/admin/workers/${id}/skills`}
            queryKey={["worker-skills", id]}
            columns={skillColumns}
            getItemLabel={(item) => item.skill_name || item.name || "skill"}
            getItemId={(item) => item.skill_id || item.id}
            canEdit={false}
            fields={[
              {
                name: "skill_id",
                label: "Skill",
                type: "select",
                required: true,
                options: (skills || []).map((s: any) => ({
                  value: String(s.id),
                  label: getLookupDisplayName(s),
                })),
              },
            ]}
            toPayload={(values) => ({ skill_id: values.skill_id })}
          />
          <ResourceSection
            title="Languages"
            description="Languages spoken by this worker."
            baseUrl={`/admin/workers/${id}/languages`}
            queryKey={["worker-languages", id]}
            columns={languageColumns}
            getItemLabel={(item) => item.language_name}
            fields={[
              { name: "language_name", label: "Language Name", type: "text", required: true },
              {
                name: "proficiency_level_id",
                label: "Proficiency Level",
                type: "select",
                required: true,
                options: toLookupOptions(proficiencyLevels),
              },
              { name: "is_primary", label: "Primary language", type: "checkbox" },
            ]}
          />
        </TabsContent>

        {/* ---------------- Jobs & Applications ---------------- */}
        <TabsContent value="jobs" className="mt-4 space-y-8">
          <ResourceSection
            title="Job Applications"
            description="Applications submitted by this worker. Status can be corrected here."
            baseUrl={`/admin/workers/${id}/applications`}
            queryKey={["worker-applications", id]}
            columns={applicationColumns}
            getItemLabel={(item) => item.job_title || "application"}
            canCreate={false}
            fields={[
              {
                name: "application_status_id",
                label: "Application Status",
                type: "select",
                required: true,
                options: toLookupOptions(applicationStatuses),
              },
              { name: "cover_letter", label: "Cover Letter", type: "textarea" },
            ]}
          />
          <ResourceSection
            title="Application Answers"
            description="Answers this worker gave to job post screening questions."
            baseUrl={`/admin/workers/${id}/job-post-answers`}
            queryKey={["worker-answers", id]}
            columns={answerColumns}
            getItemLabel={(item) => item.question || "answer"}
            canCreate={false}
            fields={[{ name: "answer", label: "Answer", type: "textarea", required: true }]}
            fromItem={(item) => ({
              answer: typeof item.answer === "object" ? JSON.stringify(item.answer) : item.answer ?? "",
            })}
          />
          <ResourceSection
            title="Saved Jobs"
            description="Jobs bookmarked by this worker."
            baseUrl={`/admin/workers/${id}/saved-jobs`}
            queryKey={["worker-saved-jobs", id]}
            columns={savedJobColumns}
            getItemLabel={(item) => item.job_title || item.title || "saved job"}
            canCreate={false}
            canEdit={false}
            fields={[]}
          />
        </TabsContent>

        {/* ---------------- Conversations ---------------- */}
        <TabsContent value="conversations" className="mt-4">
          <ConversationsSection
            baseUrl={`/admin/workers/${id}/conversations`}
            queryKey={["worker-conversations", id]}
            perspective="worker"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
