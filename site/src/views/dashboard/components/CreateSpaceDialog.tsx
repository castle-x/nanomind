import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { createSpace } from "@/shared/lib/api-client";
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
import { useDashboardStore } from "@/views/dashboard/model/dashboard-store";

const RESERVED_SLUGS = new Set(["dashboard", "login", "api", "_"]);

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSpaceDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setCurrentSpaceId = useDashboardStore((s) => s.setCurrentSpaceId);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => createSpace(name.trim(), slug, ""),
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      setCurrentSpaceId(space.id);
      navigate(`/dashboard/${space.id}`);
      handleClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "创建失败");
    },
  });

  function handleClose() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setError("");
    onOpenChange(false);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(toSlug(value));
    }
    setError("");
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(toSlug(value));
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("名称不能为空");
      return;
    }
    if (!slug) {
      setError("标识不能为空");
      return;
    }
    if (RESERVED_SLUGS.has(slug)) {
      setError("该标识为保留字，请选择其他标识");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>创建空间</DialogTitle>
            <DialogDescription>创建一个新的笔记空间来组织你的文档。</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="space-name">名称</Label>
              <Input
                id="space-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="我的空间"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="space-slug">标识</Label>
              <Input
                id="space-slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-space"
              />
              <p className="text-xs text-muted-foreground">
                用于 URL 路径，仅支持小写字母、数字和连字符
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
