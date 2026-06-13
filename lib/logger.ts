/**
 * Environment-aware logging utility
 * Only logs in development or when DEBUG=true
 */

const IS_DEV = process.env.NODE_ENV === 'development'
const DEBUG_ENABLED = process.env.DEBUG === 'true'

type LogLevel = 'log' | 'error' | 'warn' | 'info'

interface LogOptions {
  prefix?: string
  forceLog?: boolean
}

function shouldLog(level: LogLevel, forceLog?: boolean): boolean {
  // Always log errors in any environment
  if (level === 'error') return true
  
  // Log if forced
  if (forceLog) return true
  
  // Log in development or when debug is enabled
  return IS_DEV || DEBUG_ENABLED
}

function formatMessage(prefix: string, message: string): string {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] [${prefix}] ${message}`
}

export const logger = {
  log: (message: string, data?: unknown, options?: LogOptions) => {
    if (shouldLog('log', options?.forceLog)) {
      const prefix = options?.prefix || 'APP'
      if (data !== undefined) {
        console.log(formatMessage(prefix, message), data)
      } else {
        console.log(formatMessage(prefix, message))
      }
    }
  },
  
  error: (message: string, error?: unknown, options?: LogOptions) => {
    if (shouldLog('error', options?.forceLog)) {
      const prefix = options?.prefix || 'ERROR'
      if (error !== undefined) {
        console.error(formatMessage(prefix, message), error)
      } else {
        console.error(formatMessage(prefix, message))
      }
    }
  },
  
  warn: (message: string, data?: unknown, options?: LogOptions) => {
    if (shouldLog('warn', options?.forceLog)) {
      const prefix = options?.prefix || 'WARN'
      if (data !== undefined) {
        console.warn(formatMessage(prefix, message), data)
      } else {
        console.warn(formatMessage(prefix, message))
      }
    }
  },
  
  info: (message: string, data?: unknown, options?: LogOptions) => {
    if (shouldLog('info', options?.forceLog)) {
      const prefix = options?.prefix || 'INFO'
      if (data !== undefined) {
        console.info(formatMessage(prefix, message), data)
      } else {
        console.info(formatMessage(prefix, message))
      }
    }
  },
  
  // Debug logs only in development
  debug: (message: string, data?: unknown) => {
    if (IS_DEV || DEBUG_ENABLED) {
      const prefix = 'DEBUG'
      if (data !== undefined) {
        console.log(formatMessage(prefix, message), data)
      } else {
        console.log(formatMessage(prefix, message))
      }
    }
  }
}

// Shorthand for common prefixes
export const apiLog = (message: string, data?: unknown) => 
  logger.log(message, data, { prefix: 'API' })

export const paymentLog = (message: string, data?: unknown) => 
  logger.log(message, data, { prefix: 'PAYMENT' })

export const emailLog = (message: string, data?: unknown) => 
  logger.log(message, data, { prefix: 'EMAIL' })

export const hubspotLog = (message: string, data?: unknown) => 
  logger.log(message, data, { prefix: 'HUBSPOT' })
