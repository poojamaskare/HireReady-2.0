import React, { Suspense, useMemo, useState, useEffect } from 'react'
import { Box, SimpleGrid, VStack, HStack, Text, Button, chakra } from '@chakra-ui/react'
import { motion, useReducedMotion, useAnimation } from 'framer-motion'
import { Zap, Users, Book, Code, CheckCircle, MessageSquare, Bell } from 'lucide-react'
import { useRef } from 'react'

const Lottie = React.lazy(() => import('lottie-react'))

const MotionBox = chakra(motion.div)

const tiles = [
  { title: 'Faster Hiring', subtitle: 'Shorter application cycles', key: 'faster-hiring', icon: Zap },
  { title: 'Better Matches', subtitle: 'Role-fit recommendations', key: 'better-matches', icon: Users },
  { title: 'Validated Skills', subtitle: 'Certificates & badges', key: 'validated-skills', icon: CheckCircle },
  { title: 'Project Portfolio', subtitle: 'Suggested projects to build', key: 'project-portfolio', icon: Book },
  { title: 'Quizzes', subtitle: 'Auto-generated quizzes to practice', key: 'quizzes', icon: Code },
  { title: 'Mentor Connect', subtitle: 'Pair with industry mentors', key: 'mentor-connect', icon: MessageSquare },
  { title: 'Job Alerts', subtitle: 'Tailored job notifications', key: 'job-alerts', icon: Bell },
]

export default function IntegrationsBlock() {
  const [animationData, setAnimationData] = useState(null)

  useEffect(() => {
    // try local bundled JSON first
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      const local = require('../assets/integrations-animation.json')
      setAnimationData(local)
      return
    } catch (e) {
      // if local not present, fetch a neutral Lottie JSON from LottieFiles CDN
    }

    const defaultUrl = 'https://assets7.lottiefiles.com/packages/lf20_sftkbx0v.json'
    let cancelled = false
    fetch(defaultUrl)
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setAnimationData(json) })
      .catch(() => { /* ignore, fallback will be SVG */ })

    return () => { cancelled = true }
  }, [])

  function AnimatedIconsNetwork() {
    const shouldReduce = useReducedMotion()
    const anim = useAnimation()
    const panelRef = useRef(null)

    // mouse parallax for left panel
    useEffect(() => {
      if (shouldReduce) return
      const el = panelRef.current
      if (!el) return
      const handle = (e) => {
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = (e.clientX - cx) / rect.width
        const dy = (e.clientY - cy) / rect.height
        const rotateX = (-dy) * 6
        const rotateY = (dx) * 8
        anim.start({ rotateX, rotateY, transition: { type: 'spring', stiffness: 120, damping: 18 } })
      }
      window.addEventListener('mousemove', handle)
      return () => window.removeEventListener('mousemove', handle)
    }, [shouldReduce, anim])

    const nodes = [
      { id: 'n1', x: 12, y: 22, icon: Zap },
      { id: 'n2', x: 50, y: 12, icon: Users },
      { id: 'n3', x: 88, y: 26, icon: Book },
      { id: 'n4', x: 20, y: 58, icon: Code },
      { id: 'n5', x: 52, y: 48, icon: CheckCircle },
      { id: 'n6', x: 76, y: 74, icon: MessageSquare },
      { id: 'n7', x: 44, y: 78, icon: Bell },
    ]

    const links = [
      ['n1', 'n2'], ['n2', 'n3'], ['n1', 'n4'], ['n4', 'n5'], ['n5', 'n6'], ['n5', 'n7'], ['n6', 'n3']
    ]

    const easing = [0.6, -0.05, 0.01, 0.99]

    return (
      <motion.div animate={anim} ref={panelRef} style={{ perspective: 900 }}>
        <Box position="relative" w="100%" h="320px" borderRadius="12px" overflow="hidden" style={{ background: 'linear-gradient(135deg, rgba(6,7,24,0.6), rgba(10,6,20,0.4))', border: '1px solid rgba(255,255,255,0.02)', backdropFilter: 'blur(6px)' }}>
          {/* floating particles */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div className="particles-layer">
              {[...Array(18)].map((_, i) => (
                <span key={i} className="p" style={{ '--i': i }} />
              ))}
            </div>
          </div>

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
            {links.map((l, i) => {
              const a = nodes.find(n => n.id === l[0])
              const b = nodes.find(n => n.id === l[1])
              return (
                <motion.line key={i}
                  x1={`${a.x}`} y1={`${a.y}`} x2={`${b.x}`} y2={`${b.y}`}
                  stroke="rgba(124,58,237,0.12)"
                  strokeWidth={0.6}
                  initial={{ strokeDashoffset: 1 }}
                  animate={shouldReduce ? {} : { strokeDashoffset: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 6 + i, ease: easing }}
                />
              )
            })}
          </svg>

          {nodes.map((n, idx) => {
            const IconComp = n.icon
            return (
              <motion.div key={n.id}
                style={{ position: 'absolute', left: `${n.x}%`, top: `${n.y}%`, translate: '-50% -50%' }}
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + idx * 0.08, type: 'spring', stiffness: 90 }}
                whileHover={shouldReduce ? {} : { scale: 1.08, rotate: 6 }}
              >
                <Box w={{ base: 12, md: 14 }} h={{ base: 12, md: 14 }} display="flex" alignItems="center" justifyContent="center" borderRadius="12px" bg="linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))" boxShadow="0 12px 40px rgba(6,7,24,0.6)" border="1px solid rgba(124,58,237,0.08)">
                  <IconComp color="white" size={18} />
                </Box>
              </motion.div>
            )
          })}
        </Box>
      </motion.div>
    )
  }

  const shouldReduce = useReducedMotion()

  const topTiles = tiles.slice(0, 5)
  const bottomTiles = tiles.slice(5)

  const containerVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.99 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { staggerChildren: 0.06, when: 'beforeChildren' } }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } }
  }

  return (
    <Box as="section" py={{ base: 6, md: 12 }} px={{ base: 4, md: 12 }} position="relative" overflowX="hidden">
      {/* subtle radial mesh background */}
      <Box position="absolute" inset={0} zIndex={0} pointerEvents="none">
        {/* smaller centered glow behind the headline to avoid large empty area */}
        <Box position="absolute" left="50%" top="15%" transform="translate(-50%, -15%)" w={{ base: '360px', md: '520px' }} h={{ base: '160px', md: '240px' }} borderRadius="50%" filter="blur(80px)" bgGradient="radial(rgba(88,28,135,0.14), rgba(14,165,233,0.06))" opacity={0.8} />
      </Box>

      <Box maxW="1200px" mx="auto" width="100%">
      <VStack spacing={6} align="stretch" zIndex={1}>
        <VStack spacing={2} textAlign="center">
          <Box display="inline-block" px={3} py={1} borderRadius="full" border="1px solid rgba(255,255,255,0.06)" boxShadow="0 6px 20px rgba(124,58,237,0.06)">
            <Text fontSize="xs" fontWeight="700" letterSpacing="wide" color="purple.300">INTEGRATIONS</Text>
          </Box>
          <Text fontSize={{ base: 'lg', md: '2xl' }} fontWeight="900" color="white">Connect your workflows — hire faster, upskill smarter.</Text>
        </VStack>

        <Box display="flex" flexDirection="column" alignItems="center" gap={4}>
          <Box w="100%" maxW="1000px" mt="1cm">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={containerVariants}>
              {/* Top row: 5 centered cards */}
              <Box display="grid" gridTemplateColumns={{ base: 'repeat(2,1fr)', md: 'repeat(5, 1fr)' }} gap={{ base: 4, md: 6 }} mb={4} justifyContent="center" alignItems="stretch">
                {topTiles.map((t, i) => (
                  <MotionBox key={t.key} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} animate={shouldReduce ? {} : { y: [0, -4, 0] }} transition={shouldReduce ? {} : { repeat: Infinity, duration: 8 + i, ease: 'easeInOut', delay: i * 0.02 }} whileHover={shouldReduce ? {} : { y: -10, scale: 1.02, boxShadow: '0 30px 80px rgba(20,20,30,0.6)', borderColor: 'rgba(99,102,241,0.32)' }} p={5} bg="rgba(255,255,255,0.02)" borderRadius="xl" border="1px solid rgba(255,255,255,0.04)" display="flex" flexDirection="row" alignItems="center" gap={4} style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', minHeight: 120 }}>
                    <MotionBox whileHover={shouldReduce ? {} : { scale: 1.06 }} display="flex" alignItems="center" justifyContent="center" w={14} h={14} borderRadius="md" bg="linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))" style={{ boxShadow: 'inset 0 -6px 18px rgba(0,0,0,0.45)' }}>
                      {t.icon ? <motion.span animate={shouldReduce ? {} : { rotate: [0, 6, -4, 0] }} transition={{ repeat: Infinity, duration: 6 + i, ease: 'easeInOut' }}><t.icon color="white" size={18} /></motion.span> : null}
                    </MotionBox>
                    <Box>
                      <Text fontWeight="700" color="white">{t.title}</Text>
                      <Text fontSize="sm" color="gray.400">{t.subtitle}</Text>
                    </Box>
                  </MotionBox>
                ))}
              </Box>

              {/* Bottom row: 2 centered cards */}
              <Box display="grid" gridTemplateColumns={{ base: 'repeat(2,1fr)', md: 'repeat(2, 1fr)' }} gap={{ base: 4, md: 6 }} justifyContent="center">
                {bottomTiles.map((t) => (
                  <MotionBox key={t.key} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} animate={shouldReduce ? {} : { y: [0, -4, 0] }} transition={shouldReduce ? {} : { repeat: Infinity, duration: 8, ease: 'easeInOut' }} whileHover={shouldReduce ? {} : { y: -10, scale: 1.02, boxShadow: '0 30px 80px rgba(20,20,30,0.6)', borderColor: 'rgba(99,102,241,0.32)' }} p={5} bg="rgba(255,255,255,0.02)" borderRadius="xl" border="1px solid rgba(255,255,255,0.04)" display="flex" alignItems="center" gap={4} style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', minHeight: 120 }}>
                    <MotionBox whileHover={shouldReduce ? {} : { scale: 1.06 }} display="flex" alignItems="center" justifyContent="center" w={14} h={14} borderRadius="md" bg="linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))" style={{ boxShadow: 'inset 0 -6px 18px rgba(0,0,0,0.45)' }}>
                      {t.icon ? <motion.span animate={shouldReduce ? {} : { rotate: [0, 6, -4, 0] }} transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}><t.icon color="white" size={18} /></motion.span> : null}
                    </MotionBox>
                    <Box>
                      <Text fontWeight="700" color="white">{t.title}</Text>
                      <Text fontSize="sm" color="gray.400">{t.subtitle}</Text>
                    </Box>
                  </MotionBox>
                ))}
              </Box>
            </motion.div>
          </Box>
        </Box>
      </VStack>
      </Box>
    </Box>
  )
}
