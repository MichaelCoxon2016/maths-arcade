'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

type Lane = 0 | 1;
type Obstacle = {
  lane: Lane;
  position: number;
  value: number;
  isCorrect: boolean;
};

const TRACK_LENGTH = 600;
const PLAYER_POSITION = 50;
const INITIAL_OBSTACLE_SPEED = 2.5; // Fixed speed (slower)
const LANE_WIDTH = 150;

export default function SubtractionRunner() {
  const [playerLane, setPlayerLane] = useState<Lane>(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [equation, setEquation] = useState({ a: 0, b: 0, answer: 0 });
  const [isJumping, setIsJumping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const obstacleSpeed = INITIAL_OBSTACLE_SPEED;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const incorrectSoundRef = useRef<HTMLAudioElement | null>(null);
  const teleportSoundRef = useRef<HTMLAudioElement | null>(null);
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);
  const deathSoundRef = useRef<HTMLAudioElement | null>(null);

  const generateEquation = () => {
    // Increase difficulty based on level
    const maxA = 20 + (difficultyLevel - 1) * 15;
    const maxB = 10 + (difficultyLevel - 1) * 5;
    const a = Math.floor(Math.random() * maxA) + 10;
    const b = Math.floor(Math.random() * Math.min(maxB, a - 1)) + 1;
    const answer = a - b;
    setEquation({ a, b, answer });
    return answer;
  };

  const createObstacles = (correctAnswer: number) => {
    const lanes: Lane[] = [0, 1];
    const shuffled = lanes.sort(() => Math.random() - 0.5);
    
    const newObstacles: Obstacle[] = [];
    
    // Correct answer in random lane
    newObstacles.push({
      lane: shuffled[0],
      position: TRACK_LENGTH,
      value: correctAnswer,
      isCorrect: true
    });
    
    // Wrong answer in other lane
    let wrongAnswer;
    do {
      wrongAnswer = correctAnswer + Math.floor(Math.random() * 10) - 5;
    } while (wrongAnswer === correctAnswer);
    
    newObstacles.push({
      lane: shuffled[1],
      position: TRACK_LENGTH,
      value: wrongAnswer,
      isCorrect: false
    });
    
    return newObstacles;
  };

  const initGame = () => {
    setPlayerLane(0);
    setObstacles([]);
    setScore(0);
    setCorrectCount(0);
    setDifficultyLevel(1);
    setGameOver(false);
    setGameStarted(true);
    const answer = generateEquation();
    setObstacles(createObstacles(answer));
    
    // Start music
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  const switchLane = useCallback(() => {
    if (!gameStarted || gameOver || isJumping) return;
    
    setIsJumping(true);
    setPlayerLane(current => (current === 0 ? 1 : 0) as Lane);
    
    // Play teleport sound
    if (teleportSoundRef.current) {
      teleportSoundRef.current.currentTime = 0;
      teleportSoundRef.current.play().catch(err => console.log('Teleport sound failed:', err));
    }
    
    setTimeout(() => {
      setIsJumping(false);
    }, 300);
  }, [gameStarted, gameOver, isJumping]);

  const updateGame = useCallback(() => {
    if (!gameStarted || gameOver) return;

    setObstacles(currentObstacles => {
      const newObstacles = currentObstacles.map(obstacle => ({
        ...obstacle,
        position: obstacle.position - obstacleSpeed
      }));

      // Check collision
      newObstacles.forEach(obstacle => {
        if (
          obstacle.position <= PLAYER_POSITION + 30 &&
          obstacle.position >= PLAYER_POSITION - 30 &&
          obstacle.lane === playerLane
        ) {
          if (obstacle.isCorrect) {
            setScore(prev => prev + 10);
            
            // Update correct count and difficulty
            setCorrectCount(prev => {
              const newCount = prev + 1;
              // Increase difficulty every 5 correct answers
              if (newCount % 5 === 0) {
                setDifficultyLevel(level => level + 1);
              }
              return newCount;
            });
            
            // Play correct sound
            if (correctSoundRef.current) {
              correctSoundRef.current.currentTime = 0;
              correctSoundRef.current.play().catch(err => console.log('Correct sound failed:', err));
            }
          } else {
            setGameOver(true);
            // Play incorrect sound and death sound
            if (incorrectSoundRef.current) {
              incorrectSoundRef.current.currentTime = 0;
              incorrectSoundRef.current.play().catch(err => console.log('Incorrect sound failed:', err));
            }
            // Stop music and play death sound
            if (audioRef.current) {
              audioRef.current.pause();
            }
            if (deathSoundRef.current) {
              setTimeout(() => {
                deathSoundRef.current.currentTime = 0;
                deathSoundRef.current.play().catch(err => console.log('Death sound failed:', err));
              }, 300);
            }
          }
        }
      });

      // Remove obstacles that have passed and generate new ones
      const filtered = newObstacles.filter(o => o.position > -50);
      
      if (filtered.length === 0 && !gameOver) {
        const answer = generateEquation();
        return createObstacles(answer);
      }

      return filtered;
    });
  }, [gameStarted, gameOver, playerLane, obstacleSpeed, difficultyLevel]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        if (!gameStarted || gameOver) {
          initGame();
        } else {
          switchLane();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver, switchLane]);

  useEffect(() => {
    const interval = setInterval(updateGame, 1000 / 60);
    return () => clearInterval(interval);
  }, [updateGame]);

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-8">
      <audio
        ref={audioRef}
        src="/music/subtraction runner.mp3"
        loop
      />
      <audio
        ref={correctSoundRef}
        src="/sfx/correcto.mp3"
      />
      <audio
        ref={incorrectSoundRef}
        src="/sfx/incorrect.mp3"
      />
      <audio
        ref={teleportSoundRef}
        src="/sfx/teleport.mp3"
      />
      <audio
        ref={selectSoundRef}
        src="/sfx/select.mp3"
      />
      <audio
        ref={deathSoundRef}
        src="/sfx/die.ogg"
      />
      <Link 
        href="/" 
        onMouseEnter={() => {
          if (selectSoundRef.current) {
            selectSoundRef.current.currentTime = 0;
            selectSoundRef.current.play().catch(err => console.log('Select sound failed:', err));
          }
        }}
        onClick={() => {
          if (selectSoundRef.current) {
            selectSoundRef.current.currentTime = 0;
            selectSoundRef.current.play().catch(err => console.log('Select sound failed:', err));
          }
        }}
        className="absolute top-8 left-8 text-[#00ff00] hover:text-[#00ffff] transition-colors"
        style={{ touchAction: 'manipulation' }}>
        ← {isMobile ? 'TOUCH' : 'BACK'} TO ARCADE
      </Link>

      <h1 className="text-4xl md:text-6xl font-bold mb-4 neon-text text-[#ff00ff]">
        SUBTRACTION RUNNER
      </h1>

      <div className="flex gap-8 items-center mb-4">
        <div className="text-2xl text-[#ffff00]">SCORE: {score}</div>
        <div className="text-2xl text-[#00ffff]">LEVEL: {difficultyLevel}</div>
        {gameOver && (
          <div className="text-2xl text-[#ff00ff] animate-pulse">GAME OVER!</div>
        )}
      </div>

      <div className="mb-4 text-center">
        <div className="text-3xl text-[#00ffff] neon-text">
          {equation.a} - {equation.b} = ?
        </div>
      </div>

      <div 
        className="relative border-2 border-[#00ffff] neon-border overflow-hidden"
        onClick={() => {
          if (gameStarted && !gameOver) {
            switchLane();
          }
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          if (gameStarted && !gameOver) {
            switchLane();
          }
        }}
        style={{
          width: isMobile ? '90%' : LANE_WIDTH * 2 + 50,
          maxWidth: LANE_WIDTH * 2 + 50,
          height: TRACK_LENGTH,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          cursor: gameStarted && !gameOver ? 'pointer' : 'default',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none'
        }}
      >
        {/* Lane divider */}
        <div 
          className="absolute bg-white/20"
          style={{
            left: LANE_WIDTH + 20,
            width: 10,
            height: '100%'
          }}
        />

        {/* Player */}
        <div
          className={`absolute bg-[#00ff00] transition-all duration-300 ${isJumping ? 'scale-125' : ''}`}
          style={{
            left: playerLane === 0 ? LANE_WIDTH / 2 - 20 : LANE_WIDTH * 1.5,
            top: PLAYER_POSITION,
            width: 40,
            height: 40,
            borderRadius: '50%',
            boxShadow: '0 0 20px #00ff00',
            transform: isJumping ? 'translateY(-10px)' : 'translateY(0)'
          }}
        />

        {/* Obstacles */}
        {obstacles.map((obstacle, index) => (
          <div
            key={index}
            className="absolute flex items-center justify-center font-bold text-black bg-[#00ffff]"
            style={{
              left: obstacle.lane === 0 ? LANE_WIDTH / 2 - 40 : LANE_WIDTH * 1.5 - 20,
              top: obstacle.position,
              width: 80,
              height: 80,
              borderRadius: '10px',
              boxShadow: '0 0 20px #00ffff',
              fontSize: '36px'
            }}
          >
            {obstacle.value}
          </div>
        ))}

        {/* Track lines */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white/10"
            style={{
              left: 0,
              right: 0,
              top: i * 60,
              height: 2
            }}
          />
        ))}
      </div>

      <div className="mt-8 text-center">
        {!gameStarted ? (
          <>
            <button
              onClick={initGame}
              className="px-6 py-3 bg-[#00ff00] text-black font-bold rounded-lg active:bg-[#00ffff] transition-colors"
              style={{ touchAction: 'manipulation' }}
            >
              {isMobile ? 'TOUCH TO START' : 'PRESS SPACE TO START'}
            </button>
          </>
        ) : gameOver ? (
          <>
            <button
              onClick={initGame}
              className="px-6 py-3 bg-[#00ff00] text-black font-bold rounded-lg active:bg-[#00ffff] transition-colors animate-pulse"
              style={{ touchAction: 'manipulation' }}
            >
              {isMobile ? 'TOUCH TO RESTART' : 'PRESS SPACE TO RESTART'}
            </button>
          </>
        ) : (
          <>
            <p className="text-white/80 text-sm md:text-base">
              {isMobile ? 'Touch track to switch lanes' : 'Press SPACE to switch lanes'} • Run to the correct answer!
            </p>
          </>
        )}
      </div>
    </div>
  );
}