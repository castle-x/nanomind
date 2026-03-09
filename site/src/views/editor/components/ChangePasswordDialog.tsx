import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { changePassword } from "@/shared/lib/api-client";
import { pb } from "@/shared/lib/pb-client";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const passwordSchema = z
  .object({
    password: z.string().min(8, "密码至少需要8位"),
    passwordConfirm: z.string().min(8, "密码至少需要8位"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "两次输入的密码不一致",
    path: ["passwordConfirm"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

interface Props {
  open: boolean;
  onSuccess: () => void;
}

export function ChangePasswordDialog({ open, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    try {
      const user = pb.authStore.record;
      if (!user) {
        toast.error("未登录");
        return;
      }

      await changePassword(data.password, data.passwordConfirm);
      await pb.collection("users").authWithPassword(user.email, data.password);

      toast.success("密码修改成功", {
        description: "你可以通过 Admin 面板 (/_/) 管理更多设置",
      });
      onSuccess();
    } catch (err) {
      console.error("Password change failed:", err);
      toast.error("密码修改失败", {
        description: "请重试",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>首次使用 — 请修改默认密码</DialogTitle>
          <DialogDescription>当前使用的是系统默认密码，为了安全请立即修改。</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="new-password">新密码</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="至少8位"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">确认密码</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="再次输入"
              {...register("passwordConfirm")}
            />
            {errors.passwordConfirm && (
              <p className="text-sm text-destructive">{errors.passwordConfirm.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "修改中..." : "确认修改"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
