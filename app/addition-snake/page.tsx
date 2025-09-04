'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

type Position = { x: number; y: number };
type Food = { position: Position; value: number; isCorrect: boolean };

const GRID_SIZE = 20;
const CELL_SIZE = 25;
const GAME_WIDTH = GRID_SIZE * CELL_SIZE;
const GAME_HEIGHT = GRID_SIZE * CELL_SIZE;
const SNAKE_SPEED = 3; // pixels per frame
const SEGMENT_SIZE = 12;
const SEGMENT_SPACING = 10; // Distance between segments

export default function AdditionSnake() {
  const [snake, setSnake] = useState<Position[]>([{ x: 250, y: 250 }]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [equation, setEquation] = useState({ a: 0, b: 0, answer: 0 });
  const [foods, setFoods] = useState<Food[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [joystickPos, setJoystickPos] = useState<Position>({ x: 0, y: 0 });
  const [idleTime, setIdleTime] = useState(0);
  const targetRef = useRef<Position>({ x: 250, y: 250 });
  const directionRef = useRef<Position>({ x: 1, y: 0 }); // Movement direction
  const lastPositionRef = useRef<Position>({ x: 250, y: 250 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const incorrectSoundRef = useRef<HTMLAudioElement | null>(null);
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);
  const deathSoundRef = useRef<HTMLAudioElement | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const touchIdRef = useRef<number | null>(null);

  const generateEquation = () => {
    // Increase difficulty based on level
    const maxNum = 20 + (difficultyLevel - 1) * 10;
    const a = Math.floor(Math.random() * maxNum) + 1;
    const b = Math.floor(Math.random() * maxNum) + 1;
    const answer = a + b;
    setEquation({ a, b, answer });
    return answer;
  };

  const generateFoods = (correctAnswer: number) => {
    const newFoods: Food[] = [];
    const minDistance = 80; // Minimum distance between foods
    
    // Helper to check if position is too close to existing foods or snake
    const isTooClose = (pos: Position, existingFoods: Food[]) => {
      // Check distance from snake head
      const headDist = Math.sqrt(Math.pow(snake[0].x - pos.x, 2) + Math.pow(snake[0].y - pos.y, 2));
      if (headDist < minDistance) return true;
      
      // Check distance from other foods
      return existingFoods.some(food => {
        const dist = Math.sqrt(Math.pow(food.position.x - pos.x, 2) + Math.pow(food.position.y - pos.y, 2));
        return dist < minDistance;
      });
    };
    
    // Generate correct answer
    let correctPos: Position;
    let attempts = 0;
    do {
      correctPos = {
        x: Math.random() * (GAME_WIDTH - 60) + 30,
        y: Math.random() * (GAME_HEIGHT - 60) + 30
      };
      attempts++;
    } while (isTooClose(correctPos, newFoods) && attempts < 100);
    
    newFoods.push({ position: correctPos, value: correctAnswer, isCorrect: true });
    
    // Generate 3 incorrect answers
    for (let i = 0; i < 3; i++) {
      let pos: Position;
      attempts = 0;
      do {
        pos = {
          x: Math.random() * (GAME_WIDTH - 60) + 30,
          y: Math.random() * (GAME_HEIGHT - 60) + 30
        };
        attempts++;
      } while (isTooClose(pos, newFoods) && attempts < 100);
      
      let wrongAnswer;
      do {
        wrongAnswer = correctAnswer + Math.floor(Math.random() * 10) - 5;
      } while (wrongAnswer === correctAnswer || wrongAnswer <= 0);
      
      newFoods.push({ position: pos, value: wrongAnswer, isCorrect: false });
    }
    
    setFoods(newFoods);
  };

  const initGame = () => {
    const startPos = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
    // Create initial snake with a few segments
    const initialSnake: Position[] = [];
    for (let i = 0; i < 5; i++) {
      initialSnake.push({ x: startPos.x - i * SEGMENT_SPACING, y: startPos.y });
    }
    setSnake(initialSnake);
    targetRef.current = { x: startPos.x + 50, y: startPos.y };
    directionRef.current = { x: 1, y: 0 }; // Start moving right
    lastPositionRef.current = { ...startPos };
    setScore(0);
    setCorrectCount(0);
    setDifficultyLevel(1);
    setGameOver(false);
    setGameStarted(true);
    setJoystickPos({ x: 0, y: 0 });
    setIdleTime(0);
    const answer = generateEquation();
    generateFoods(answer);
    
    // Start music
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  const moveSnake = useCallback(() => {
    if (!gameStarted || gameOver) return;

    setSnake(currentSnake => {
      const newSnake = currentSnake.map(segment => ({ ...segment }));
      const head = newSnake[0];
      
      
      // Move head in the current direction continuously
      head.x += directionRef.current.x * SNAKE_SPEED;
      head.y += directionRef.current.y * SNAKE_SPEED;

      // Wrap around walls (teleport to opposite side)
      if (head.x < 0) head.x += GAME_WIDTH;
      if (head.x > GAME_WIDTH) head.x -= GAME_WIDTH;
      if (head.y < 0) head.y += GAME_HEIGHT;
      if (head.y > GAME_HEIGHT) head.y -= GAME_HEIGHT;

      // Check self collision (skip first few segments near head)
      for (let i = 4; i < newSnake.length; i++) {
        const segment = newSnake[i];
        const dist = Math.sqrt(Math.pow(head.x - segment.x, 2) + Math.pow(head.y - segment.y, 2));
        if (dist < SEGMENT_SIZE) {
          setGameOver(true);
          // Stop music and play death sound
          if (audioRef.current) {
            audioRef.current.pause();
          }
          if (deathSoundRef.current) {
            deathSoundRef.current.currentTime = 0;
            deathSoundRef.current.play().catch(err => console.log('Death sound failed:', err));
          }
          return currentSnake;
        }
      }

      // Check food collision
      const eatenFood = foods.find(food => {
        const dist = Math.sqrt(Math.pow(food.position.x - head.x, 2) + Math.pow(food.position.y - head.y, 2));
        return dist < 25; // Collision radius
      });

      if (eatenFood) {
        if (eatenFood.isCorrect) {
          // Correct answer - snake grows and score increases
          newSnake.unshift(head);
          setScore(prev => prev + 1);
          
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
          // Wrong answer - snake shrinks and score decreases
          setScore(prev => Math.max(0, prev - 1));
          // Play incorrect sound
          if (incorrectSoundRef.current) {
            incorrectSoundRef.current.currentTime = 0;
            incorrectSoundRef.current.play().catch(err => console.log('Incorrect sound failed:', err));
          }
          
          // Remove tail segment (shrink)
          if (newSnake.length > 1) {
            newSnake.unshift(head);
            newSnake.pop();
            newSnake.pop();
          } else {
            // Game over if snake length reaches 0
            setGameOver(true);
            // Stop music and play death sound
            if (audioRef.current) {
              audioRef.current.pause();
            }
            if (deathSoundRef.current) {
              deathSoundRef.current.currentTime = 0;
              deathSoundRef.current.play().catch(err => console.log('Death sound failed:', err));
            }
            return currentSnake;
          }
        }
        
        // Generate new equation and foods
        const answer = generateEquation();
        generateFoods(answer);
      } else {
        // Normal movement - segments follow smoothly
        for (let i = 1; i < newSnake.length; i++) {
          const prevSegment = newSnake[i - 1];
          const currentSegment = newSnake[i];
          
          const dx = prevSegment.x - currentSegment.x;
          const dy = prevSegment.y - currentSegment.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Follow previous segment with smooth interpolation
          if (distance > SEGMENT_SPACING) {
            const moveRatio = (distance - SEGMENT_SPACING) / distance;
            currentSegment.x += dx * moveRatio * 0.8; // Smooth following
            currentSegment.y += dy * moveRatio * 0.8;
          }
        }
      }

      return newSnake;
    });
  }, [foods, gameOver, gameStarted, snake, difficultyLevel]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Check for idle timeout
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    
    const checkIdle = () => {
      const head = snake[0];
      const distanceMoved = Math.sqrt(
        Math.pow(head.x - lastPositionRef.current.x, 2) + 
        Math.pow(head.y - lastPositionRef.current.y, 2)
      );
      
      if (distanceMoved < 0.5) { // Snake is essentially stationary
        setIdleTime(prev => {
          const newIdleTime = prev + 100; // Add 100ms per check
          if (newIdleTime >= 5000) { // 5 seconds
            setGameOver(true);
            // Stop music and play death sound
            if (audioRef.current) {
              audioRef.current.pause();
            }
            if (deathSoundRef.current) {
              deathSoundRef.current.currentTime = 0;
              deathSoundRef.current.play().catch(err => console.log('Death sound failed:', err));
            }
          }
          return newIdleTime;
        });
      } else {
        setIdleTime(0); // Reset idle timer when moving
        lastPositionRef.current = { ...head };
      }
    };
    
    const interval = setInterval(checkIdle, 100); // Check every 100ms
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, snake]);

  // Mouse control for desktop
  useEffect(() => {
    if (isMobile || !gameStarted || gameOver) return;

    const handleMouseMove = (e: MouseEvent) => {
      const gameArea = gameAreaRef.current;
      if (!gameArea) return;
      
      const rect = gameArea.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      targetRef.current = { x: mouseX, y: mouseY };
      
      // Update direction based on mouse position relative to snake head
      const head = snake[0];
      const dx = mouseX - head.x;
      const dy = mouseY - head.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 10) { // Only update direction if mouse is far enough
        directionRef.current = {
          x: dx / distance,
          y: dy / distance
        };
      }
    };

    const gameArea = gameAreaRef.current;
    if (gameArea) {
      gameArea.addEventListener('mousemove', handleMouseMove);
      return () => gameArea.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isMobile, gameStarted, gameOver, snake]);

  // Joystick control for mobile
  useEffect(() => {
    if (!isMobile || !gameStarted || gameOver) return;

    const handleJoystickStart = (e: TouchEvent) => {
      const joystick = joystickRef.current;
      if (!joystick) return;
      
      const rect = joystick.getBoundingClientRect();
      const touch = e.touches[0];
      
      if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
          touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        touchIdRef.current = touch.identifier;
        
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const x = (touch.clientX - centerX) / (rect.width / 2);
        const y = (touch.clientY - centerY) / (rect.height / 2);
        
        const magnitude = Math.sqrt(x * x + y * y);
        if (magnitude > 1) {
          setJoystickPos({ x: x / magnitude, y: y / magnitude });
        } else {
          setJoystickPos({ x, y });
        }
      }
    };

    const handleJoystickMove = (e: TouchEvent) => {
      if (touchIdRef.current === null) return;
      
      const joystick = joystickRef.current;
      if (!joystick) return;
      
      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
      if (!touch) return;
      
      const rect = joystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (touch.clientX - centerX) / (rect.width / 2);
      const y = (touch.clientY - centerY) / (rect.height / 2);
      
      const magnitude = Math.sqrt(x * x + y * y);
      if (magnitude > 1) {
        setJoystickPos({ x: x / magnitude, y: y / magnitude });
      } else {
        setJoystickPos({ x, y });
      }
    };

    const handleJoystickEnd = (e: TouchEvent) => {
      const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
      if (touch) {
        touchIdRef.current = null;
        setJoystickPos({ x: 0, y: 0 });
      }
    };

    window.addEventListener('touchstart', handleJoystickStart, { passive: true });
    window.addEventListener('touchmove', handleJoystickMove, { passive: true });
    window.addEventListener('touchend', handleJoystickEnd, { passive: true });
    window.addEventListener('touchcancel', handleJoystickEnd, { passive: true });
    
    return () => {
      window.removeEventListener('touchstart', handleJoystickStart);
      window.removeEventListener('touchmove', handleJoystickMove);
      window.removeEventListener('touchend', handleJoystickEnd);
      window.removeEventListener('touchcancel', handleJoystickEnd);
    };
  }, [isMobile, gameStarted, gameOver]);

  // Update direction based on joystick position
  useEffect(() => {
    if (!isMobile || !gameStarted || gameOver) return;
    
    if (joystickPos.x !== 0 || joystickPos.y !== 0) {
      // Update movement direction based on joystick
      const magnitude = Math.sqrt(joystickPos.x * joystickPos.x + joystickPos.y * joystickPos.y);
      if (magnitude > 0.1) { // Dead zone
        directionRef.current = {
          x: joystickPos.x / magnitude,
          y: joystickPos.y / magnitude
        };
        
        // Also update target for visual indicator
        const head = snake[0];
        targetRef.current = {
          x: head.x + joystickPos.x * 100,
          y: head.y + joystickPos.y * 100
        };
      }
    }
  }, [joystickPos, snake, isMobile, gameStarted, gameOver]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        if (!gameStarted || gameOver) {
          initGame();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    let animationFrameId: number;
    
    const gameLoop = () => {
      moveSnake();
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    if (gameStarted && !gameOver) {
      animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [moveSnake, gameStarted, gameOver]);

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-8">
      <audio
        ref={audioRef}
        src="/music/addition-snake.mp3"
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
        className="absolute top-8 left-8 px-4 py-2 text-[#00ff00] hover:text-[#00ffff] active:text-[#00ffff] transition-colors"
        style={{ touchAction: 'manipulation' }}>
        ← {isMobile ? 'TOUCH' : 'BACK'} TO ARCADE
      </Link>

      <h1 className="text-4xl md:text-6xl font-bold mb-8 neon-text text-[#00ffff]">
        ADDITION SNAKE
      </h1>

      <div className="flex gap-8 items-center mb-4">
        <div className="text-2xl text-[#ffff00]">SCORE: {score}</div>
        <div className="text-2xl text-[#00ff00]">LENGTH: {snake.length}</div>
        <div className="text-2xl text-[#00ffff]">LEVEL: {difficultyLevel}</div>
        {gameOver && (
          <div className="text-2xl text-[#ff00ff] animate-pulse">GAME OVER!</div>
        )}
        {idleTime > 3000 && !gameOver && (
          <div className="text-2xl text-[#ff0000] animate-pulse">
            KEEP MOVING! {Math.ceil((5000 - idleTime) / 1000)}s
          </div>
        )}
      </div>

      <div 
        ref={gameAreaRef}
        className="relative border-2 border-[#ff00ff] neon-border overflow-hidden"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          touchAction: 'none',
          cursor: gameStarted && !gameOver && !isMobile ? 'none' : 'default'
        }}
      >
        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className={index === 0 ? "bg-[#00ff00]" : "bg-[#00aa00]"}
            style={{
              position: 'absolute',
              left: segment.x - SEGMENT_SIZE / 2,
              top: segment.y - SEGMENT_SIZE / 2,
              width: SEGMENT_SIZE,
              height: SEGMENT_SIZE,
              borderRadius: '50%',
              boxShadow: index === 0 ? '0 0 15px #00ff00' : 'none',
              transform: 'translateZ(0)', // Force GPU acceleration
              willChange: 'transform'
            }}
          />
        ))}

        {/* Food/Answers */}
        {foods.map((food, index) => (
          <div
            key={index}
            className="bg-[#00ffff]"
            style={{
              position: 'absolute',
              left: food.position.x - 20,
              top: food.position.y - 20,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#000',
              borderRadius: '8px',
              boxShadow: '0 0 15px #00ffff'
            }}
          >
            {food.value}
          </div>
        ))}
        
        {/* Mouse cursor indicator for desktop */}
        {!isMobile && gameStarted && !gameOver && (
          <div
            className="pointer-events-none"
            style={{
              position: 'absolute',
              left: targetRef.current.x - 8,
              top: targetRef.current.y - 8,
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 0, 0.2)',
              border: '2px solid #ffff00',
              boxShadow: '0 0 15px #ffff00',
              transform: 'translateZ(0)'
            }}
          />
        )}
      </div>

      <div className="mt-8 text-center">
        <div className="text-3xl text-[#00ffff] mb-4 neon-text">
          {equation.a} + {equation.b} = ?
        </div>
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
          <p className="text-white/80 text-sm md:text-base">
            {isMobile ? 'Use joystick to control' : 'Move mouse to guide snake'} • Eat the correct answer! • Walls teleport you
          </p>
        )}
      </div>
      
      {/* Mobile Joystick */}
      {isMobile && gameStarted && !gameOver && (
        <div 
          ref={joystickRef}
          className="fixed bottom-8 left-8 touch-none"
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 255, 255, 0.1)',
            border: '2px solid #00ffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
          }}
        >
          {/* Joystick handle */}
          <div
            className="pointer-events-none"
            style={{
              position: 'absolute',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#00ffff',
              transform: `translate(${joystickPos.x * 40}px, ${joystickPos.y * 40}px)`,
              boxShadow: '0 0 15px #00ffff',
              transition: touchIdRef.current ? 'none' : 'transform 0.2s'
            }}
          />
          {/* Center dot */}
          <div
            className="pointer-events-none"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.5)'
            }}
          />
        </div>
      )}
    </div>
  );
}