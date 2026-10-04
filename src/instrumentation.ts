// Next.js Instrumentation - runs on server startup
// Error handlers only - no keepalive to reduce resource usage

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('uncaughtException', (error) => {
      console.error('[EMS] UNCAUGHT EXCEPTION:', error.message);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[EMS] UNHANDLED REJECTION:', reason);
    });

    console.log('[EMS] Instrumentation registered: error handlers');
  }
}
