import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAdminGetUpiAccounts, useAdminAddUpi, useAdminUpdateUpi, useAdminDeleteUpi, getAdminGetUpiAccountsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Wallet } from "lucide-react";

const emptyForm = { upiId: "", qrCodeUrl: "", isActive: true };

export default function UpiAccounts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useAdminGetUpiAccounts({ query: { queryKey: getAdminGetUpiAccountsQueryKey() } });
  const addUpi = useAdminAddUpi();
  const updateUpi = useAdminUpdateUpi();
  const deleteUpi = useAdminDeleteUpi();

  const handleQrFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) { toast({ title: "Image too large (max 1.5 MB)", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, qrCodeUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const handleEdit = (u: any) => {
    setEditId(u.id);
    setForm({ upiId: u.upiId, qrCodeUrl: u.qrCodeUrl || "", isActive: u.isActive });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.upiId) { toast({ title: "UPI ID required", variant: "destructive" }); return; }
    const payload = { upiId: form.upiId, qrCodeUrl: form.qrCodeUrl || undefined, isActive: form.isActive };
    if (editId) {
      updateUpi.mutate({ id: editId, data: payload }, {
        onSuccess: () => { toast({ title: "UPI updated" }); qc.invalidateQueries({ queryKey: getAdminGetUpiAccountsQueryKey() }); setOpen(false); setEditId(null); setForm(emptyForm); },
      });
    } else {
      addUpi.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "UPI added" }); qc.invalidateQueries({ queryKey: getAdminGetUpiAccountsQueryKey() }); setOpen(false); setForm(emptyForm); },
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteUpi.mutate({ id }, {
      onSuccess: () => { toast({ title: "UPI deleted" }); qc.invalidateQueries({ queryKey: getAdminGetUpiAccountsQueryKey() }); },
    });
  };

  const handleToggle = (id: string, upiId: string, isActive: boolean) => {
    updateUpi.mutate({ id, data: { upiId, isActive: !isActive } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getAdminGetUpiAccountsQueryKey() }),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Wallet className="h-6 w-6 text-[#48723e]" /> UPI Accounts</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#1a4718] to-[#48723e] text-white" onClick={() => { setEditId(null); setForm(emptyForm); }} data-testid="button-add-upi">
                <Plus className="h-4 w-4 mr-2" /> Add UPI
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <DialogHeader><DialogTitle>{editId ? "Edit UPI" : "Add UPI"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-[#a0a0a0]">UPI ID</Label>
                  <Input value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} placeholder="name@upi" className="bg-[#111111] border-[#2a2a2a] text-white mt-1" data-testid="input-upi-id" />
                </div>
                <div>
                  <Label className="text-[#a0a0a0]">QR Code image (shown to players)</Label>
                  <Input type="file" accept="image/*" onChange={handleQrFile} className="bg-[#111111] border-[#2a2a2a] text-white mt-1" data-testid="input-upi-qr" />
                  {form.qrCodeUrl && (
                    <div className="mt-2 flex items-center gap-3">
                      <img src={form.qrCodeUrl} alt="QR preview" className="h-28 w-28 rounded bg-white object-contain" />
                      <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, qrCodeUrl: "" }))}>Remove</Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[#a0a0a0]">Active</Label>
                  <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} data-testid="switch-upi-active" />
                </div>
                <Button className="w-full bg-gradient-to-r from-[#1a4718] to-[#48723e]" onClick={handleSubmit} disabled={addUpi.isPending || updateUpi.isPending} data-testid="button-save-upi">
                  {editId ? "Update" : "Add"} UPI
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-[#a0a0a0]">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.upiAccounts || []).map((u: any) => (
              <Card key={u.id} className={`bg-[#1a1a1a] border-[#2a2a2a] transition-colors ${u.isActive ? "border-[#48723e]/30" : "opacity-60"}`} data-testid={`card-upi-${u.id}`}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-white font-mono font-medium">{u.upiId}</div>
                      <div className="text-xs text-[#a0a0a0] mt-1">Added {new Date(u.createdAt).toLocaleDateString("en-IN")}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={u.isActive} onCheckedChange={() => handleToggle(u.id, u.upiId, u.isActive)} data-testid={`switch-upi-${u.id}`} />
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded inline-block mb-4 ${u.isActive ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-gray-500/10 text-gray-400"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="flex-1 text-[#48723e] hover:bg-[#48723e]/10" onClick={() => handleEdit(u)} data-testid={`button-edit-upi-${u.id}`}>
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 text-red-400 hover:bg-red-400/10" onClick={() => handleDelete(u.id)} data-testid={`button-delete-upi-${u.id}`}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(data?.upiAccounts?.length ?? 0) === 0 && (
              <div className="col-span-3 text-center py-12 text-[#a0a0a0]">No UPI accounts added yet</div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
