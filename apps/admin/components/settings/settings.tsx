'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, Copy, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_SLUGS, IndianMobileSchema } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { Select } from '@repo/ui/select';
import { Skeleton } from '@repo/ui/skeleton';
import { TabPanel, Tabs } from '@repo/ui/tabs';
import { api, ApiError, type Page } from '@/lib/api/client';
import { day, titleCase } from '@/lib/format';
import { EDIT_CATALOGUE, ROLE_LABELS, can } from '@/lib/roles';
import type { AdminTalent, Category, InviteRow, Rep, Role, UserRow } from '@/lib/types';
import { Dialog, fieldCls } from '../dialog';
import { useUrlState } from '../money/use-url-state';
import { Card, ErrorNote, PageHeader } from '../ui';
import { useUser } from '../user-context';

const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS', 'TALENT', 'REP', 'CUSTOMER'];
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

/** design.md /settings: users & roles (super admin), invites (super admin; talent managers for talent and reps), categories. */
export function SettingsView() {
  const user = useUser();
  const { sp, set } = useUrlState();
  const isAdmin = user.roles.includes('SUPER_ADMIN');
  const tabs = [...(isAdmin ? [{ value: 'users', label: 'Users & roles' }] : []), { value: 'invites', label: 'Invites' }, { value: 'categories', label: 'Categories' }];
  const tab = tabs.some((t) => t.value === sp.get('tab')) ? sp.get('tab')! : tabs[0]!.value;
  return (
    <>
      <PageHeader title="Settings" />
      <Tabs value={tab} onValueChange={(v) => set({ tab: v })} items={tabs}>
        <div className="mt-6">
          {isAdmin && (
            <TabPanel value="users">
              <Users />
            </TabPanel>
          )}
          <TabPanel value="invites">
            <Invites />
          </TabPanel>
          <TabPanel value="categories">
            <Categories />
          </TabPanel>
        </div>
      </Tabs>
    </>
  );
}

function RolePills({ roles }: { roles: Role[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span key={r} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">
          {ROLE_LABELS[r]}
        </span>
      ))}
    </span>
  );
}

function Users() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const q = useQuery({ queryKey: ['users', page], queryFn: () => api.get<Page<UserRow>>('/admin/users', { page, pageSize: 50 }), placeholderData: keepPreviousData });
  if (q.isError) return <ErrorNote error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-80 rounded-2xl" />;
  const pages = Math.max(1, Math.ceil(q.data.total / q.data.pageSize));
  return (
    <>
      <p className="mb-4 text-sm text-fg-muted">Changing someone’s roles signs them out everywhere, so their next sign-in carries the new access.</p>
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-surface text-left text-xs text-fg-muted">
              <tr>
                {['Name', 'Sign-in', 'Roles', 'Authenticator', 'Joined', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {q.data.items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-fg-muted">{u.email ?? u.phone}</td>
                  <td className="px-4 py-3">
                    <RolePills roles={u.roles} />
                  </td>
                  <td className="px-4 py-3">{u.roles.some((r) => r !== 'CUSTOMER' && r !== 'TALENT' && r !== 'REP') ? (u.mfaEnabled ? 'Set up' : <span className="text-warning">Not yet</span>) : <span className="text-fg-subtle">n/a</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{day(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                      Edit roles
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-fg-muted">
          <span className="tnum">
            {q.data.total} accounts · page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">
              Previous
            </button>
            <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      </div>
      {editing && <EditRoles u={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function EditRoles({ u, onClose }: { u: UserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [roles, setRoles] = useState<Role[]>(u.roles);
  const save = useMutation({
    mutationFn: () => api.patch(`/admin/users/${u.id}/roles`, { roles }),
    onSuccess: () => (toast.success('Roles updated; they’ll need to sign in again'), void qc.invalidateQueries({ queryKey: ['users'] }), onClose()),
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} title="Edit roles" description={u.name ?? u.email ?? u.phone ?? ''}>
      <div className="grid gap-2">
        {ALL_ROLES.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={roles.includes(r)} onChange={(e) => setRoles(e.target.checked ? [...roles, r] : roles.filter((x) => x !== r))} className="size-4 accent-[var(--primary)]" />
            {ROLE_LABELS[r]}
          </label>
        ))}
        <p className="mt-1 text-xs text-fg-muted">Staff roles need an email sign-in with an authenticator; talent and reps sign in by phone.</p>
        <Button className="mt-3" disabled={!roles.length || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="animate-spin" aria-label="Saving" /> : 'Save roles'}
        </Button>
      </div>
    </Dialog>
  );
}

const STATUS_TONE: Record<InviteRow['status'], string> = { PENDING: 'bg-info/15 text-info', ACCEPTED: 'bg-success/15 text-success', REVOKED: 'bg-surface-2 text-fg-subtle', EXPIRED: 'bg-surface-2 text-fg-subtle' };

/** AUTH-3: invite-only accounts for staff, talent and reps. Links are shown here until email/SMS delivery exists. */
function Invites() {
  const user = useUser();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const q = useQuery({ queryKey: ['invites', page], queryFn: () => api.get<Page<InviteRow>>('/admin/invites', { page, pageSize: 25 }), placeholderData: keepPreviousData });
  const revoke = useMutation({ mutationFn: (id: string) => api.del(`/admin/invites/${id}`), onSuccess: () => (toast.success('Invite withdrawn'), void qc.invalidateQueries({ queryKey: ['invites'] })), onError: (e) => toast.error(errMsg(e)) });
  const canInvite = can(user, 'TALENT_MANAGER');
  if (q.isError) return <ErrorNote error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-80 rounded-2xl" />;
  const pages = Math.max(1, Math.ceil(q.data.total / q.data.pageSize));
  return (
    <div className="grid gap-4">
      {canInvite && (
        <Button size="sm" className="justify-self-start" onClick={() => setCreating(true)}>
          <Plus aria-hidden /> New invite
        </Button>
      )}
      {!q.data.items.length ? (
        <p className="text-sm text-fg-muted">No invites yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="bg-surface text-left text-xs text-fg-muted">
                <tr>
                  {['Invited', 'Roles', 'Status', 'By', 'Expires', ''].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {q.data.items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{i.name ?? '—'}</span>
                      <span className="block text-xs text-fg-muted">{i.email ?? i.phone}</span>
                    </td>
                    <td className="px-4 py-3">
                      <RolePills roles={i.roles} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[i.status]}`}>{titleCase(i.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{i.invitedBy ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{day(i.expiresAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {i.status === 'PENDING' && canInvite && (
                        <Button size="sm" variant="ghost" disabled={revoke.isPending} onClick={() => revoke.mutate(i.id)}>
                          Withdraw
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-fg-muted">
            <span className="tnum">
              {q.data.total} invites · page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">
                Previous
              </button>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {creating && <NewInvite onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewInvite({ onClose }: { onClose: () => void }) {
  const user = useUser();
  const qc = useQueryClient();
  const isAdmin = user.roles.includes('SUPER_ADMIN');
  const choices: Role[] = isAdmin ? ['SALES', 'TALENT_MANAGER', 'OPS', 'ACCOUNTS', 'SUPER_ADMIN', 'TALENT', 'REP'] : ['TALENT', 'REP'];
  const [roles, setRoles] = useState<Role[]>([isAdmin ? 'SALES' : 'TALENT']);
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [talentId, setTalentId] = useState('');
  const [repId, setRepId] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const staff = roles.some((r) => r !== 'TALENT' && r !== 'REP');
  const talents = useQuery({ queryKey: ['talents', 'all-for-invite'], queryFn: () => api.get<Page<AdminTalent>>('/admin/talents', { pageSize: 100 }), enabled: roles.includes('TALENT') });
  const reps = useQuery({ queryKey: ['reps'], queryFn: () => api.get<Rep[]>('/admin/reps'), enabled: roles.includes('REP') });
  const phone = IndianMobileSchema.safeParse(contact);
  const create = useMutation({
    mutationFn: () =>
      api.post<{ url: string }>('/admin/invites', {
        ...(staff ? { email: contact.trim() } : { phone: phone.success ? phone.data : contact }),
        ...(name.trim() ? { name: name.trim() } : {}),
        roles,
        ...(roles.includes('TALENT') && talentId ? { talentId } : {}),
        ...(roles.includes('REP') && repId ? { repId } : {}),
      }),
    onSuccess: (r) => (setLink(r.url), void qc.invalidateQueries({ queryKey: ['invites'] })),
    onError: (e) => toast.error(errMsg(e)),
  });

  if (link)
    return (
      <Dialog open onOpenChange={(v) => !v && onClose()} title="Invite created" description="Email and SMS delivery come with the messaging provider. Until then, send this link yourself. It works once and expires in 7 days.">
        <code className="block rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs break-all select-all">{link}</code>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(link).then(() => setCopied(true));
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? 'Copied' : 'Copy link'}
        </Button>
      </Dialog>
    );
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} title="New invite" description={isAdmin ? 'Staff sign in with email, a password and an authenticator; talent and reps with their phone.' : 'Talent managers can invite talent and their representatives.'}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-xs text-fg-muted">Roles</legend>
          {choices.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={roles.includes(r)} onChange={(e) => setRoles(e.target.checked ? [...roles, r] : roles.filter((x) => x !== r))} className="size-4 accent-[var(--primary)]" />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </fieldset>
        <input required aria-label={staff ? 'Work email' : 'Mobile number'} type={staff ? 'email' : 'tel'} placeholder={staff ? 'Work email' : 'Mobile number (10 digits)'} value={contact} onChange={(e) => setContact(e.target.value)} className={fieldCls} />
        <input aria-label="Name" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
        {roles.includes('TALENT') && <Select aria-label="Talent profile" value={talentId} onValueChange={setTalentId} placeholder="Link to talent profile" options={(talents.data?.items ?? []).map((t) => ({ value: t.id, label: t.hasLogin ? `${t.stageName} (has a login)` : t.stageName }))} />}
        {roles.includes('REP') && <Select aria-label="Representative" value={repId} onValueChange={setRepId} placeholder="Link to representative" options={(reps.data ?? []).map((r) => ({ value: r.id, label: r.hasLogin ? `${r.name} (has a login)` : r.name }))} />}
        <Button type="submit" disabled={!roles.length || !contact.trim() || create.isPending}>
          {create.isPending ? <Loader2 className="animate-spin" aria-label="Creating" /> : 'Create invite'}
        </Button>
      </form>
    </Dialog>
  );
}

/** T-140: the fixed category set (slugs drive website URLs); names and order are editable. */
function Categories() {
  const user = useUser();
  const qc = useQueryClient();
  const editable = can(user, ...EDIT_CATALOGUE);
  const q = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/admin/categories') });
  const [drafts, setDrafts] = useState<Record<string, { name: string; sortOrder: string }>>({});
  const refresh = () => void qc.invalidateQueries({ queryKey: ['categories'] });
  const save = useMutation({ mutationFn: (c: Category) => api.patch(`/admin/categories/${c.id}`, { name: drafts[c.id]!.name.trim(), sortOrder: Number(drafts[c.id]!.sortOrder) || 0 }), onSuccess: (_d, c) => (refresh(), setDrafts((all) => Object.fromEntries(Object.entries(all).filter(([k]) => k !== c.id))), toast.success('Category saved')), onError: (e) => toast.error(errMsg(e)) });
  const add = useMutation({ mutationFn: (slug: string) => api.post('/admin/categories', { slug, name: titleCase(slug), sortOrder: (q.data?.length ?? 0) * 10 }), onSuccess: () => (refresh(), toast.success('Category added')), onError: (e) => toast.error(errMsg(e)) });
  const remove = useMutation({ mutationFn: (c: Category) => api.del(`/admin/categories/${c.id}`), onSuccess: () => (refresh(), toast.success('Category removed')), onError: (e) => toast.error(errMsg(e)) });
  if (q.isError) return <ErrorNote error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-60 rounded-2xl" />;
  const missing = CATEGORY_SLUGS.filter((s) => !q.data.some((c) => c.slug === s));
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2">
        {q.data.map((c) => {
          const d = drafts[c.id];
          return (
            <li key={c.id} className="grid items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm sm:grid-cols-[1fr_10rem_6rem_auto]">
              {editable ? (
                <input aria-label={`Name for ${c.slug}`} value={d?.name ?? c.name} onChange={(e) => setDrafts({ ...drafts, [c.id]: { name: e.target.value, sortOrder: d?.sortOrder ?? String(c.sortOrder) } })} className={fieldCls} />
              ) : (
                <span className="font-medium">{c.name}</span>
              )}
              <span className="font-mono text-xs text-fg-subtle">
                /{c.slug} · {c.talentCount ?? 0} talent
              </span>
              {editable ? <input aria-label="Order" inputMode="numeric" value={d?.sortOrder ?? String(c.sortOrder)} onChange={(e) => setDrafts({ ...drafts, [c.id]: { name: d?.name ?? c.name, sortOrder: e.target.value.replace(/\D/g, '') } })} className={`${fieldCls} tnum`} /> : <span className="tnum">{c.sortOrder}</span>}
              {editable && (
                <span className="flex justify-end gap-2">
                  {d && (
                    <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(c)}>
                      Save
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={Boolean(c.talentCount) || remove.isPending} title={c.talentCount ? 'Move its talent first' : undefined} onClick={() => remove.mutate(c)}>
                    Remove
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {editable && missing.length > 0 && (
        <Card className="flex flex-wrap items-center gap-2 p-4 text-sm">
          <span className="text-fg-muted">Add:</span>
          {missing.map((s) => (
            <Button key={s} size="sm" variant="outline" disabled={add.isPending} onClick={() => add.mutate(s)}>
              <Plus aria-hidden /> {titleCase(s)}
            </Button>
          ))}
        </Card>
      )}
    </div>
  );
}
