import React from 'react';
import { Parallax, ParallaxLayer } from '@react-spring/parallax';
import { useTheme } from '../../contexts/ThemeContext';

export function ParallaxStoryContainer({ children }: { children: React.ReactNode }) {
  const { currentTheme } = useTheme();
  return (
    <div className={`story-parallax theme-${currentTheme}`}>
      <Parallax pages={4} className="parallax-root">
        {/* Background gradient layer */}
        <ParallaxLayer offset={0} speed={0.1} className="layer-back" />
        <ParallaxLayer offset={1} speed={0.1} className="layer-back" />
        <ParallaxLayer offset={2} speed={0.1} className="layer-back" />

        {/* Mid decorative layer (shapes/clouds/etc.) */}
        <ParallaxLayer offset={0} speed={0.35} className="layer-mid">
          <div className="mid-shapes" />
        </ParallaxLayer>
        <ParallaxLayer offset={1} speed={0.35} className="layer-mid">
          <div className="mid-shapes" />
        </ParallaxLayer>

        {/* Foreground content layers */}
        <ParallaxLayer offset={0} speed={0.85} className="layer-fore">
          {children}
        </ParallaxLayer>

        <ParallaxLayer offset={1} speed={0.9} className="layer-fore">
          <div className="container py-5">
            <h3 className="mb-2">Build Characters</h3>
            <p className="text-muted">Create protagonists, antagonists, and companions with avatars.</p>
          </div>
        </ParallaxLayer>

        <ParallaxLayer offset={2} speed={0.95} className="layer-fore">
          <div className="container py-5">
            <h3 className="mb-2">Compose Scenes</h3>
            <p className="text-muted">Arrange scenes on a visual timeline with branching choices.</p>
          </div>
        </ParallaxLayer>
      </Parallax>
    </div>
  );
} 