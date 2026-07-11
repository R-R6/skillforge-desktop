import { CircleHelp } from "lucide-react";

interface AppearanceTipProps {
  text: string;
  position?: "top" | "bottom";
}

export function AppearanceTip({ text, position = "top" }: AppearanceTipProps) {
  return (
    <span
      className="appearance-tip-trigger"
      data-tip={text}
      data-tip-position={position}
      tabIndex={0}
      role="img"
      aria-label={text}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <CircleHelp size={13} />
    </span>
  );
}
