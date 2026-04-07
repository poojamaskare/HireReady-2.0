import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import Matter from 'matter-js';

const JOB_ROLES = [
  'Software Engineer', 'Data Analyst', 'Product Manager', 'UX Designer',
  'Marketing Executive', 'Financial Analyst', 'HR Specialist', 'Sales Representative',
  'Graphic Designer', 'Content Creator', 'DevOps Engineer', 'Business Analyst',
];

const COLORS = [
  'purple.600', 'purple.500', 'purple.400'
];

export const PhysicsChips = () => {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const [chips, setChips] = useState([]);
  const lastSpawnTimeRef = useRef(0);
  const chipIdRef = useRef(0);

  // Initialize Matter.js Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const { Engine, World, Bodies, Runner } = Matter;
    const engine = Engine.create();
    engineRef.current = engine;

    const updateBoundaries = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      World.clear(engine.world, false);
      const floor = Bodies.rectangle(width / 2, height + 10, width, 50, { isStatic: true });
      const leftWall = Bodies.rectangle(-10, height / 2, 50, height, { isStatic: true });
      const rightWall = Bodies.rectangle(width + 10, height / 2, 50, height, { isStatic: true });
      World.add(engine.world, [floor, leftWall, rightWall]);
    };

    updateBoundaries();
    window.addEventListener('resize', updateBoundaries);

    const runner = Runner.create();
    Runner.run(runner, engine);
    runnerRef.current = runner;

    const syncLoop = () => {
      setChips((currentChips) => {
        if (currentChips.length === 0) return currentChips;
        
        const now = Date.now();
        let changed = false;
        const nextChips = currentChips
          .filter((chip) => {
            if (now - chip.spawnTime > 1500) {
              World.remove(engine.world, chip.body);
              changed = true;
              return false;
            }
            return true;
          })
          .map((chip) => {
            const nextX = chip.body.position.x;
            const nextY = chip.body.position.y;
            const nextAngle = chip.body.angle;
            
            if (nextX !== chip.x || nextY !== chip.y || nextAngle !== chip.angle) {
              changed = true;
              return { ...chip, x: nextX, y: nextY, angle: nextAngle };
            }
            return chip;
          });
        
        return changed ? nextChips : currentChips;
      });
      requestAnimationFrame(syncLoop);
    };
    const animId = requestAnimationFrame(syncLoop);

    return () => {
      window.removeEventListener('resize', updateBoundaries);
      Runner.stop(runner);
      Engine.clear(engine);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    // Disable on small screens
    if (window.innerWidth < 768) return;

    const now = Date.now();
    if (now - lastSpawnTimeRef.current < 90) return;
    lastSpawnTimeRef.current = now;

    if (!engineRef.current) return;

    const { Bodies, World } = Matter;
    const x = e.clientX;
    const y = e.clientY;

    const text = JOB_ROLES[Math.floor(Math.random() * JOB_ROLES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const chipWidth = text.length * 8 + 30;
    const chipHeight = 35;

    const body = Bodies.rectangle(x, y, chipWidth, chipHeight, {
      restitution: 0.6,
      friction: 0.1,
      chamfer: { radius: 20 },
    });

    World.add(engineRef.current.world, body);

    setChips((prev) => [
      ...prev,
      {
        id: chipIdRef.current++,
        text,
        color,
        body,
        width: chipWidth,
        height: chipHeight,
        x,
        y,
        angle: 0,
        spawnTime: Date.now()
      }
    ]);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <Box 
      ref={containerRef} 
      position="absolute" 
      inset={0} 
      pointerEvents="none" 
      zIndex={1}
      overflow="hidden"
    >
      {chips.map((chip) => {
        const age = Date.now() - chip.spawnTime;
        const opacity = Math.max(0, 1 - age / 1500);

        return (
          <Box
            key={chip.id}
            position="absolute"
            left={`${chip.x}px`}
            top={`${chip.y}px`}
            transform={`translate(-50%, -50%) rotate(${chip.angle}rad)`}
            bg={chip.color}
            color="white"
            px={4}
            py={2}
            borderRadius="xl"
            fontWeight="700"
            fontSize={{ base: "xs", md: "sm" }}
            whiteSpace="nowrap"
            boxShadow="0 6px 15px rgba(0,0,0,0.4)"
            border="1px solid rgba(255,255,255,0.3)"
            opacity={opacity}
            style={{ backdropFilter: 'blur(6px)' }}
          >
            {chip.text}
          </Box>
        );
      })}
    </Box>
  );
};

export default PhysicsChips;
