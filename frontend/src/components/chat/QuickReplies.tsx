import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
}

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-2"
    >
      <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
      <div className="flex flex-wrap gap-2">
        {replies.map((reply, index) => (
          <motion.div
            key={reply}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              variant="glass"
              size="sm"
              onClick={() => onSelect(reply)}
              className="text-xs rounded-full"
            >
              {reply}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
