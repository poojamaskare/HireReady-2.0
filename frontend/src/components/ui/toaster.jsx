'use client'

import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from '@chakra-ui/react'

export const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
})

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: '4' }}>
        {(toast) => (
          <Toast.Root 
            width={{ md: 'sm' }}
            bg={
              toast.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 
              toast.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 
              'rgba(31, 41, 55, 0.8)'
            }
            backdropFilter="blur(12px) saturate(180%)"
            border="1px solid"
            borderColor={
              toast.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 
              toast.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 
              'rgba(255, 255, 255, 0.125)'
            }
            borderRadius="xl"
            boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.37)"
            color="white"
            pb="3"
            pt="3"
            px="4"
          >
            {toast.type === 'loading' ? (
              <Spinner size='sm' color='blue.solid' />
            ) : (
              <Toast.Indicator 
                color={
                  toast.type === 'success' ? 'green.400' : 
                  toast.type === 'error' ? 'red.400' : 
                  'white'
                }
              />
            )}
            <Stack gap='1' flex='1' maxWidth='100%'>
              {toast.title && <Toast.Title fontWeight="bold">{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description color="gray.300" fontSize="sm">{toast.description}</Toast.Description>
              )}
            </Stack>
            {toast.action && (
              <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
            )}
            {toast.closable && <Toast.CloseTrigger color="white" _hover={{ bg: 'whiteAlpha.200' }} />}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  )
}
