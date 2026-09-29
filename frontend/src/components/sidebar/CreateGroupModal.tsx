import { useState } from "react";
import { useChatStore } from "../../state/useChatStore";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ open, onClose }: CreateGroupModalProps) {
  const { createGroup } = useChatStore();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = createGroup(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a group">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Group name"
          className="rounded-2xl border border-brown-100 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brown-500 focus:ring-2 focus:ring-brown-300/50"
        />
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
        <p className="text-xs text-ink-soft">
          You'll be the only member until others choose to join.
        </p>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </Modal>
  );
}
