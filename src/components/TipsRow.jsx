import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coffee, Music2, Target } from 'lucide-react';

export default function TipsRow() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {[
        {
          icon: <Target className="w-5 h-5" />,
          title: 'Micro-goals',
          tip: 'Break big tasks into 25–45 min sprints. Reward tiny wins.',
        },
        {
          icon: <Coffee className="w-5 h-5" />,
          title: 'Break hygiene',
          tip: '5–10 min off-screen breaks every hour. Hydrate + stretch.',
        },
        {
          icon: <Music2 className="w-5 h-5" />,
          title: 'Soundtrack',
          tip: 'Lo-fi beats or brown noise can boost focus.',
        },
      ].map((t, i) => (
        <Card key={i} className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t.icon}
              {t.title}
            </CardTitle>
            <CardDescription>{t.tip}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
