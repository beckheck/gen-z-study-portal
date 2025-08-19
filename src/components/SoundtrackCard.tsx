import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SoundtrackPosition } from '@/types';
import { Music2 } from 'lucide-react';
import { useState } from 'react';

interface SoundtrackCardProps {
  embed: string;
  position?: SoundtrackPosition;
  onPositionChange?: (position: SoundtrackPosition) => void;
}

export default function SoundtrackCard({ embed, position = 'dashboard', onPositionChange }: SoundtrackCardProps) {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (position === 'hidden' || !embed) {
    return position === 'dashboard' ? (
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="w-5 h-5" />
            Soundtrack
          </CardTitle>
          <CardDescription>Focus with your own vibe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-500">
            Add an embed URL in <strong>Settings → Soundtrack</strong> (e.g., Spotify/YouTube embed link) and it will
            show up here.
          </div>
        </CardContent>
      </Card>
    ) : null;
  }

  if (position === 'floating') {
    return (
      <div
        className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isMinimized ? 'w-16 h-16' : 'w-80 h-48'}`}
      >
        <Card className="h-full rounded-2xl border-none shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur">
          {!isMinimized && (
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Music2 className="w-4 h-4" />
                  Soundtrack
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(true)}
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    title="Minimize"
                  >
                    ➖
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPositionChange && onPositionChange('dashboard')}
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    title="Maximize to Dashboard"
                  >
                    ⬜
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPositionChange && onPositionChange('hidden')}
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    title="Close"
                  >
                    ✖️
                  </Button>
                </div>
              </div>
            </CardHeader>
          )}
          <CardContent className={`${isMinimized ? 'p-2' : 'p-3 pt-0'} h-full`}>
            {isMinimized ? (
              <Button
                variant="ghost"
                onClick={() => setIsMinimized(false)}
                className="w-full h-full p-0 flex items-center justify-center"
              >
                <Music2 className="w-6 h-6" />
              </Button>
            ) : (
              <div className="rounded-xl overflow-hidden h-full">
                <iframe
                  src={embed}
                  className="w-full h-full"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Study soundtrack"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard position
  return (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music2 className="w-5 h-5" />
              Soundtrack
            </CardTitle>
            <CardDescription>Focus with your own vibe</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPositionChange && onPositionChange('floating')}
            className="h-8 w-8 p-0 hover:bg-white/20"
            title="Minimize to floating player (plays across all tabs)"
          >
            ⬇️
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl overflow-hidden">
          <div className="aspect-video">
            <iframe
              src={embed}
              className="w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Study soundtrack"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
