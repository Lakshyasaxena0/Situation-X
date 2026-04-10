import { useEffect } from 'react';

export function CosmicBackground() {
  useEffect(() => {
    // Optional canvas starfield could go here, but a CSS-based one is lighter.
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-background">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-[10%] left-[20%] w-2 h-2 bg-primary rounded-full star" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-[30%] left-[80%] w-1.5 h-1.5 bg-secondary rounded-full star" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-[60%] left-[10%] w-1 h-1 bg-white rounded-full star" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[80%] left-[70%] w-2.5 h-2.5 bg-primary/80 rounded-full star" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-[40%] left-[40%] w-1.5 h-1.5 bg-accent rounded-full star" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-[70%] left-[90%] w-1 h-1 bg-white rounded-full star" style={{ animationDelay: '2.5s' }}></div>
        <div className="absolute top-[15%] left-[60%] w-2 h-2 bg-secondary rounded-full star" style={{ animationDelay: '0.8s' }}></div>
        <div className="absolute top-[85%] left-[30%] w-1.5 h-1.5 bg-primary rounded-full star" style={{ animationDelay: '1.2s' }}></div>
      </div>
      
      {/* Nebulas */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]"></div>
      <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[80px]"></div>
      
      {/* Subtle Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      ></div>
    </div>
  );
}
