import type { Client } from "../types";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface GroupMembersModalProps {
  open: boolean;
  onClose: () => void;
  groupName: string;
  members: Client[];
  /** If provided, shows a "Join Group" button below the member list. */
  onJoin?: () => void;
}

export function GroupMembersModal({
  open,
  onClose,
  groupName,
  members,
  onJoin,
}: GroupMembersModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={`${groupName} (${members.length})`}>
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
            <Avatar name={member.name} size="sm" online={member.online} />
            <span className="text-sm text-ink">{member.name}</span>
            {member.isSelf && <span className="text-xs text-ink-soft">(you)</span>}
          </li>
        ))}
      </ul>

      {onJoin && (
        <Button
          className="mt-4 w-full"
          onClick={() => {
            onJoin();
            onClose();
          }}
        >
          Join Group
        </Button>
      )}
    </Modal>
  );
}
