import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SoundtrackPosition } from '@/types';
import { Music2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SoundtrackCardProps {
  embed: string;
  position?: SoundtrackPosition;
  onPositionChange?: (position: SoundtrackPosition) => void;
}

export default function SoundtrackCard({ embed, position = 'dashboard', onPositionChange }: SoundtrackCardProps) {
  const { t } = useTranslation('soundtrack');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (position === 'hidden' || !embed) {
    return position === 'dashboard' ? (
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="w-5 h-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-500" dangerouslySetInnerHTML={{ __html: t('empty.message') }} />
        </CardContent>
      </Card>
    ) : null;
  }

  if (position === 'floating') {
    return (
      <div
        className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isMinimized ? 'w-16 h-16' : 'w-80 h-48'}`}
      >
        <Card className="h-full rounded-2xl border-none shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur flex flex-col">
          {!isMinimized && (
            <CardHeader className="pb-1 pt-2 px-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Music2 className="w-4 h-4" />
                  {t('title')}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(true)}
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    title={t('actions.minimize')}
                  >
                    ➖
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPositionChange && onPositionChange('dashboard')}
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    title={t('actions.maximizeToDashboard')}
                  >
                    ⬜
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPositionChange && onPositionChange('hidden')}
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    title={t('actions.close')}
                  >
                    ✖️
                  </Button>
                </div>
              </div>
            </CardHeader>
          )}
          <CardContent className={`${isMinimized ? 'p-2' : 'p-2 pt-0'} flex-1 relative min-h-0`}>
            {isMinimized && (
              <Button
                variant="ghost"
                onClick={() => setIsMinimized(false)}
                className="w-full h-full p-0 flex items-center justify-center absolute inset-0 z-10"
              >
                <Music2 className="w-6 h-6" />
              </Button>
            )}
            <div className={`rounded-xl overflow-hidden h-full ${isMinimized ? 'opacity-0 pointer-events-none' : ''}`}>
              <iframe
                src={embed}
                className="w-full h-full"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title={t('accessibility.iframe')}
              />
            </div>
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
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPositionChange?.('floating')}
            className="h-8 w-8 p-0 hover:bg-white/20"
            title={t('actions.minimizeToFloating')}
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
              title={t('accessibility.iframe')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
