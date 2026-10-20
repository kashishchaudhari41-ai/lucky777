import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminGetSettings, useAdminUpdateSettings, getAdminGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useAdminGetSettings({ query: { queryKey: getAdminGetSettingsQueryKey() } });
  const update = useAdminUpdateSettings();

  const [form, setForm] = useState({
    appName: "Lucky777", whatsappNumber: "+91 9999999999", telegramLink: "https://t.me/lucky777",
    minDeposit: 100, minWithdrawal: 100, referralCommission: 5, maintenanceMode: false, bettingLockMinutes: 30
  });

  useEffect(() => {
    if (data) {
      setForm({
        appName: data.appName || "Lucky777",
        whatsappNumber: data.whatsappNumber || "+91 9999999999",
        telegramLink: data.telegramLink || "https://t.me/lucky777",
        minDeposit: data.minDeposit || 100,
        minWithdrawal: data.minWithdrawal || 100,
        referralCommission: data.referralCommission || 5,
        maintenanceMode: data.maintenanceMode || false,
        bettingLockMinutes: data.bettingLockMinutes || 30,
      });
    }
  }, [data]);

  const handleSave = () => {
    update.mutate({ data: form }, {
      onSuccess: () => { toast({ title: "Settings saved" }); qc.invalidateQueries({ queryKey: getAdminGetSettingsQueryKey() }); },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  };

  if (isLoading) return <AdminLayout><div className="text-center py-20 text-[#a0a0a0]">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><SettingsIcon className="h-6 w-6 text-[#48723e]" /> App Settings</h1>
          <Button className="bg-gradient-to-r from-[#1a4718] to-[#48723e]" onClick={handleSave} disabled={update.isPending} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" /> Save Settings
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader><CardTitle className="text-white text-base">General</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                ["appName", "App Name", "text"],
                ["whatsappNumber", "WhatsApp Number", "text"],
                ["telegramLink", "Telegram Link", "text"],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <Label className="text-[#a0a0a0] text-sm">{label}</Label>
                  <Input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="bg-[#111111] border-[#2a2a2a] text-white mt-1" data-testid={`input-setting-${key}`} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader><CardTitle className="text-white text-base">Financial</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                ["minDeposit", "Min Deposit (₹)"],
                ["minWithdrawal", "Min Withdrawal (₹)"],
                ["referralCommission", "Referral Commission (%)"],
                ["bettingLockMinutes", "Betting Lock Before Close (mins)"],
              ].map(([key, label]) => (
                <div key={key}>
                  <Label className="text-[#a0a0a0] text-sm">{label}</Label>
                  <Input type="number" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} className="bg-[#111111] border-[#2a2a2a] text-white mt-1" data-testid={`input-setting-${key}`} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader><CardTitle className="text-white text-base">System</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Maintenance Mode</div>
                  <div className="text-xs text-[#a0a0a0] mt-1">Disable user access to the app</div>
                </div>
                <Switch checked={form.maintenanceMode} onCheckedChange={v => setForm(f => ({ ...f, maintenanceMode: v }))} data-testid="switch-maintenance" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
