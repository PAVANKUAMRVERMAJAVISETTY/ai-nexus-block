import { PageContainer, PageHeader } from '@/components/common';
import { Users, ShieldAlert, ShieldCheck, Mail, Calendar, CheckCircle2 } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@/types/database';

export const revalidate = 0;

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();

  // Fetch profiles server-side
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const userList: Profile[] = (profiles as Profile[]) || [];
  const totalCount = userList.length;

  return (
    <PageContainer>
      <PageHeader
        title="User Administration"
        description="View registered user accounts, manage roles, and review platform access."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/40 bg-card">
          <CardHeader className="py-4">
            <CardDescription className="text-xs">Total Registered Users</CardDescription>
            <CardTitle className="text-3xl font-extrabold text-primary">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  User Accounts ({totalCount})
                </CardTitle>
                <CardDescription className="text-xs">
                  List of all registered profiles stored in public.profiles
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {userList.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No registered users found.
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Display Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {userList.map((userItem) => {
                    const isSuper = userItem.role === 'super_admin';
                    const createdDate = userItem.created_at
                      ? new Date(userItem.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'N/A';

                    return (
                      <tr key={userItem.id} className="hover:bg-accent/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          {userItem.display_name || 'N/A'}
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {userItem.email}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {isSuper ? (
                            <Badge variant="default" className="bg-amber-500/20 text-amber-500 border-amber-500/40 gap-1">
                              <ShieldAlert className="h-3 w-3" />
                              super_admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                              user
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {createdDate}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
