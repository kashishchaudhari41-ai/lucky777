import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminGetUser, useAdminGetUserBets, useAdminUpdateUserStatus, useAdminUpdateUserBalance, getAdminGetUserQueryKey, getAdminGetUserBetsQueryKey, AdminUpdateUserStatusBodyStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, Wallet, UserX, UserCheck, Plus, Minus } from "lucide-react";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-500/10 text-green-400 border border-green-500/20",
    blocked: "bg-red-500/10 text-red-400 border border-red-500/20",
    won: "bg-green-500/10 text-green-400 border border-green-500/20",
    lost: "bg-red-500/10 text-red-400 border border-red-500/20",
    pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    cancelled: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
  };
  return map[status] || "bg-gray-500/10 text-gray-400";
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [balAmount, setBalAmount] = useState("");
  const [balReason, setBalReason] = useState("");

  const { data: user, isLoading } = useAdminGetUser(id!, { query: { queryKey: getAdminGetUserQueryKey(id!), enabled: !!id } });
  const { data: betsData } = useAdminGetUserBets(id!, { query: { queryKey: getAdminGetUserBetsQueryKey(id!), enabled: !!id } });

  const updateStatus = useAdminUpdateUserStatus();
  const updateBalance = useAdminUpdateUserBalance();

  const handleStatus = (status: string) => {
    updateStatus.mutate({ id: id!, data: { status: status as AdminUpdateUserStatusBodyStatus } }, {
      onSuccess: () => {
        toast({ title: `User ${status}` });
        qc.invalidateQueries({ queryKey: getAdminGetUserQueryKey(id!) });
      },
    });
  };

  const handleBalanceAdjust = (sign: 1 | -1) => {
    const amt = parseFloat(balAmount) * sign;
    if (isNaN(amt) || amt === 0) { toast({ title: "Enter valid amount", variant: "destructive" }); return; }
    updateBalance.mutate({ id: id!, data: { amount: amt, reason: balReason || "Admin adjustment" } }, {
      onSuccess: () => {
        toast({ title: "Balance adjusted" });
        qc.invalidateQueries({ queryKey: getAdminGetUserQueryKey(id!) });
        setBalAmount(""); setBalReason("");
      },
    });
  };

  if (isLoading) return <AdminLayout><div className="text-center py-20 text-[#a0a0a0]">Loading...</div></AdminLayout>;
  if (!user) return <AdminLayout><div className="text-center py-20 text-[#a0a0a0]">User not found</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-[#a0a0a0]" onClick={() => setLocation("/users")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-white">{user.fullName}</h1>
          <span className={`px-2 py-1 rounded-full text-xs ${statusBadge(user.status)}`}>{user.status}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-[#a0a0a0]"><Phone className="h-4 w-4" /> {user.phone}</div>
              <div className="flex items-center gap-2 text-[#bfdb81] font-mono text-xl font-bold"><Wallet className="h-4 w-4" /> ₹{Number(user.balance).toLocaleString("en-IN")}</div>
              <div className="text-xs text-[#a0a0a0]">Ref: {user.referralCode}</div>
              <div className="text-xs text-[#a0a0a0]">Joined: {new Date(user.createdAt).toLocaleDateString("en-IN")}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader><CardTitle className="text-sm text-[#a0a0a0]">Stats</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#a0a0a0]">Total Bets</span><span className="text-white font-medium">{user.totalBets}</span></div>
              <div className="flex justify-between"><span className="text-[#a0a0a0]">Total Deposited</span><span className="text-green-400 font-mono">₹{Number(user.totalDeposits).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-[#a0a0a0]">Total Withdrawn</span><span className="text-red-400 font-mono">₹{Number(user.totalWithdrawals).toLocaleString("en-IN")}</span></div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader><CardTitle className="text-sm text-[#a0a0a0]">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                {user.status === "active" ? (
                  <Button size="sm" className="bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30" onClick={() => handleStatus("blocked")} data-testid="button-block-user">
                    <UserX className="h-3.5 w-3.5 mr-1" /> Block
                  </Button>
                ) : (
                  <Button size="sm" className="bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30" onClick={() => handleStatus("active")} data-testid="button-unblock-user">
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Unblock
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Input placeholder="Amount (₹)" value={balAmount} onChange={e => setBalAmount(e.target.value)} className="bg-[#111111] border-[#2a2a2a] text-white h-8 text-sm" data-testid="input-balance-amount" />
                <Input placeholder="Reason" value={balReason} onChange={e => setBalReason(e.target.value)} className="bg-[#111111] border-[#2a2a2a] text-white h-8 text-sm" data-testid="input-balance-reason" />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600/20 text-green-400 border border-green-500/30" onClick={() => handleBalanceAdjust(1)} data-testid="button-add-balance"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                  <Button size="sm" className="flex-1 bg-red-600/20 text-red-400 border border-red-500/30" onClick={() => handleBalanceAdjust(-1)} data-testid="button-sub-balance"><Minus className="h-3 w-3 mr-1" /> Sub</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bets" className="space-y-4">
          <TabsList className="bg-[#1a1a1a] border border-[#2a2a2a]">
            <TabsTrigger value="bets" className="data-[state=active]:bg-[#48723e] data-[state=active]:text-white">Bets</TabsTrigger>
          </TabsList>
          <TabsContent value="bets">
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardContent className="pt-4 overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      {["Market", "Type", "Numbers", "Amount", "Status", "Win", "Date"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[#a0a0a0] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(betsData?.bets || []).map((b: any) => (
                      <tr key={b.id} className="border-b border-[#2a2a2a]/40 hover:bg-[#111111]" data-testid={`row-bet-${b.id}`}>
                        <td className="py-2 px-3 text-white">{b.marketName}</td>
                        <td className="py-2 px-3 text-[#a0a0a0]">{b.gameType}</td>
                        <td className="py-2 px-3 text-[#a0a0a0] text-xs">{JSON.stringify(b.numbers).slice(0, 30)}</td>
                        <td className="py-2 px-3 text-[#bfdb81] font-mono">₹{b.totalAmount}</td>
                        <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs ${statusBadge(b.status)}`}>{b.status}</span></td>
                        <td className="py-2 px-3 text-green-400 font-mono">{b.winAmount > 0 ? `₹${b.winAmount}` : "-"}</td>
                        <td className="py-2 px-3 text-[#a0a0a0]">{new Date(b.createdAt).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(betsData?.bets?.length ?? 0) === 0 && <div className="text-center py-8 text-[#a0a0a0]">No bets found</div>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
