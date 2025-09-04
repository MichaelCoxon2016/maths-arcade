"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Equation = {
  a: number;
  b: number;
  operator: '+' | '-' | '×' | '÷';
  answer: number;
  display: string;
};

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);
  const [currentEquation, setCurrentEquation] = useState<Equation | null>(null);
  const [solving, setSolving] = useState(false);
  const [solutionSteps, setSolutionSteps] = useState<string[]>([]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  }, []);

  const generateEquation = (): Equation => {
    const operators: Array<'+' | '-' | '×' | '÷'> = ['+', '-', '×', '÷'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let a: number, b: number, answer: number;
    
    switch (operator) {
      case '+':
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
        answer = a + b;
        break;
      case '-':
        a = Math.floor(Math.random() * 50) + 10;
        b = Math.floor(Math.random() * a) + 1;
        answer = a - b;
        break;
      case '×':
        a = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 12) + 1;
        answer = a * b;
        break;
      case '÷':
        b = Math.floor(Math.random() * 10) + 1;
        answer = Math.floor(Math.random() * 10) + 1;
        a = b * answer;
        break;
      default:
        a = 1;
        b = 1;
        answer = 2;
    }
    
    return {
      a,
      b,
      operator,
      answer,
      display: `${a} ${operator} ${b}`
    };
  };

  useEffect(() => {
    const solveCurrentEquation = async () => {
      if (!currentEquation) return;
      
      setSolving(true);
      setSolutionSteps([`Solving: ${currentEquation.display}`]);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      switch (currentEquation.operator) {
        case '+':
          setSolutionSteps(prev => [...prev, `Adding ${currentEquation.a} + ${currentEquation.b}...`]);
          await new Promise(resolve => setTimeout(resolve, 800));
          setSolutionSteps(prev => [...prev, `= ${currentEquation.answer}`]);
          break;
        case '-':
          setSolutionSteps(prev => [...prev, `Subtracting ${currentEquation.a} - ${currentEquation.b}...`]);
          await new Promise(resolve => setTimeout(resolve, 800));
          setSolutionSteps(prev => [...prev, `= ${currentEquation.answer}`]);
          break;
        case '×':
          setSolutionSteps(prev => [...prev, `Multiplying ${currentEquation.a} × ${currentEquation.b}...`]);
          await new Promise(resolve => setTimeout(resolve, 800));
          setSolutionSteps(prev => [...prev, `= ${currentEquation.answer}`]);
          break;
        case '÷':
          setSolutionSteps(prev => [...prev, `Dividing ${currentEquation.a} ÷ ${currentEquation.b}...`]);
          await new Promise(resolve => setTimeout(resolve, 800));
          setSolutionSteps(prev => [...prev, `= ${currentEquation.answer}`]);
          break;
      }
      
      setSolving(false);
      
      // Generate next equation after delay
      setTimeout(() => {
        const newEq = generateEquation();
        setCurrentEquation(newEq);
        setSolutionSteps([]);
      }, 3000);
    };
    
    if (currentEquation) {
      solveCurrentEquation();
    }
  }, [currentEquation]);

  useEffect(() => {
    const eq = generateEquation();
    setCurrentEquation(eq);
  }, []);

  const playSelectSound = () => {
    if (selectSoundRef.current) {
      selectSoundRef.current.currentTime = 0;
      selectSoundRef.current.play().catch(err => console.log('Select sound failed:', err));
    }
  };

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Equation Solver in Top Left - Hidden on mobile */}
      <div className="hidden md:block absolute top-8 left-8 bg-black/80 border-2 border-[#00ffff] neon-border p-6 rounded-lg max-w-sm z-20">
        <h2 className="text-xl font-bold text-[#00ffff] mb-4 neon-text">AUTO SOLVER</h2>
        {currentEquation && (
          <div className="space-y-2">
            <div className="text-2xl text-[#ffff00] font-mono">
              {currentEquation.display} = ?
            </div>
            <div className="space-y-1">
              {solutionSteps.map((step, index) => (
                <div
                  key={index}
                  className="text-[#00ff00] font-mono text-sm animate-fadeIn"
                >
                  {step}
                </div>
              ))}
            </div>
            {solving && (
              <div className="text-[#ff00ff] text-xs animate-pulse mt-2">
                Calculating...
              </div>
            )}
          </div>
        )}
      </div>


      <audio
        ref={audioRef}
        src="/music/lobby-theme.mp3"
        loop
        autoPlay
      />
      <audio
        ref={selectSoundRef}
        src="/sfx/select.mp3"
      />
      <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-8 md:mb-16 neon-text text-[#ff00ff] relative z-10">
        MATH ARCADE
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl w-full relative z-10 px-4 md:px-0">
        <Link href="/addition-snake">
          <div 
            onMouseEnter={playSelectSound}
            onClick={playSelectSound}
            className="group relative p-6 md:p-8 rounded-lg border-2 border-[#00ffff] neon-border bg-black/50 backdrop-blur cursor-pointer hover:scale-105 transition-transform">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ffff]/20 to-transparent rounded-lg"></div>
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-[#00ffff] mb-4">
                ADDITION SNAKE
              </h2>
              <p className="text-white/80 text-sm md:text-base">
                Classic snake with a mathematical twist! Solve addition problems by eating the correct answers.
              </p>
              <div className="mt-4 md:mt-6 text-[#00ff00] font-mono text-sm md:text-base">
                PRESS TO PLAY →
              </div>
            </div>
          </div>
        </Link>

        <Link href="/subtraction-runner">
          <div 
            onMouseEnter={playSelectSound}
            onClick={playSelectSound}
            className="group relative p-6 md:p-8 rounded-lg border-2 border-[#ff00ff] neon-border bg-black/50 backdrop-blur cursor-pointer hover:scale-105 transition-transform">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff00ff]/20 to-transparent rounded-lg"></div>
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-[#ff00ff] mb-4">
                SUBTRACTION RUNNER
              </h2>
              <p className="text-white/80 text-sm md:text-base">
                Run and switch lanes to reach the correct answers to subtraction problems!
              </p>
              <div className="mt-4 md:mt-6 text-[#ffff00] font-mono text-sm md:text-base">
                PRESS TO PLAY →
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-16 text-center relative z-10">
        <p className="text-[#00ff00] font-mono text-lg animate-pulse">
          SELECT A GAME TO BEGIN
        </p>
      </div>
    </div>
  );
}
