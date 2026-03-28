import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Radio, Trash2, Users, Clock } from 'lucide-react';
import { GameSession } from '@/types/host';

interface GameSessionListProps {
  sessions: GameSession[];
  onDelete: (id: string) => void;
}

export function GameSessionList({ sessions, onDelete }: GameSessionListProps) {
  if (sessions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <Radio className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No sessions yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Start a game from a question pack to create a session.
        </p>
      </motion.div>
    );
  }

  const statusColors: Record<string, string> = {
    waiting: 'bg-gold/20 text-gold',
    active: 'bg-success/20 text-success',
    finished: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-3">
      {sessions.map((session, i) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground truncate">{session.packName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusColors[session.status]}`}>
                    {session.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {session.teamCount} teams
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Round {session.currentRound}/6
                  </span>
                  <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive shrink-0"
                onClick={() => onDelete(session.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
